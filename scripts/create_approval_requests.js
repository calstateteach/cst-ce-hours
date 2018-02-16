/* Module that creates approval request records in MongoDB.
10.11.2017 tps
10.19.2017 tps Keep copy of CE Hours objects inside approval request record so we
               can reconstruct the logged hours as they were when request was created.
10.20.2017 tps Save timestamp of when the logged hours was retrieved, so that
               we know how recent the request data is.
11.17.2017 tps Adapt for use within Web app.
11.21.2017 tps Add function to mark rolled over request approvals.
02.09.2018 tps Rollover based on teacher candidate's email rather than mentor's.
*/

// require('dotenv').config(); // Use environment variables for configurable items.
// const spreadsheet = require('./spreadsheet_access');
// const db                      = require('./libs/db_access');
const csvAccess               = require('./csv_access');
const ceHoursHelper           = require('../libs/ce_hours_helper');
const approvalRequestHelper   = require('../libs/approval_request_helper');
const dbConsts                = require('../libs/db_consts');
const ApprovalRequest         = require('../libs/approval_request_model');
const CeHours                 = require('../libs/ce_hours_model');

// const parsing                 = require('./libs/parsingHelper');



/****************** Script Steps ******************/

// function openDbEventHandler() {
//   console.log("openEventHandler")
//   step1(finale);  // Start working once the db connnection is established
// }


function step1(mentorListUrl, callback) {
  // Start of process. Callback signature: ( <err> )
  // Get logged activites that are pending for approvals.
  ceHoursHelper.getHoursNeedingApproval((err, data) => {
    // Results come back ordered by candidate email & activity date.
    if (err) return callback(err);

    // displayPendingCeHours(data);
    console.log("CE hours needing approval", data.length);
    return step2(mentorListUrl, data, callback);
  });
}

function step2(mentorListUrl, needyHours, callback) {
  // Get list for matching candidates with mentors.
  csvAccess.readCsvFromUrl(mentorListUrl, (err, data) => {
    if (err) return callback(err);

    var emailList = csvAccess.labelRowData(data); // Make fields easier to access
    console.log('Read in mentor email addreses', emailList.length)
    return step3(needyHours, emailList, callback);
  });
}


function step3(needyHours, emailList, callback) {
  // Create an approval request for each candidate.
  // Each request groups together all pending activities for the candidate.
  // The data should already be sorted by candidate.
  let newApprovalRequests = [];

  let i = 0;
  const iMax = needyHours.length;
  while(i < iMax) {
    // Start collecting data for a request
    let row = needyHours[i];
    let approvalRequest = {
      candidateEmail: row.candidateEmail,
      activityList: [],
      // activityListText: '',
      totalMinutes: 0,
    };

    // Accumulate candidate's logged hours
    while((i < iMax) && (row.candidateEmail === approvalRequest.candidateEmail)) {
      approvalRequest.activityList.push(row);
      // approvalRequest.activityListText += `${padRight(row.activityDate.toLocaleDateString(), 12)} ${padRight(row.activityDurationAsString, 22)} ${row.activityDescription}\r\n`;
      // approvalRequest.activityListText += buildActivityLogString(row);
      approvalRequest.totalMinutes += row.activityDurationInMinutes;

      row = needyHours[++i];  // Collect data from the next activity record
    }

    // We're done iterating through all the activity records for one candidate
    approvalRequest.totalHours = approvalRequest.totalMinutes / 60.0;
    approvalRequest.requestEmailBody = approvalRequest.activityListText;

    // Try to resolve names and emails from the email list.
    // Possible errors:
    // -candidate email not found
    // -mentor email not found

    var contact = emailList.find((e) => {
      return (e.email === approvalRequest.candidateEmail);
    });
    if (contact) {
      approvalRequest.candidateFullName = contact.first_name + ' ' + contact.last_name;
      approvalRequest.mentorFullName = contact.mentor_first_name + ' ' + contact.mentor_last_name;
      approvalRequest.mentorEmail = contact.mentor_email;
    } else {
      console.log("Missing contact record for", approvalRequest.candidateEmail);
    }

    newApprovalRequests.push(approvalRequest);
  }

  approvalRequestHelper.saveApprovalRequests(newApprovalRequests, (err, data) => {
    // console.log("create approval requests error", err);
    // console.log("create approval requests results", data);
    if (err) return callback(err);

    // console.log("Saved new approval requests", data.length);
    // for (let i = 0; i < data.length; ++i) {
    //   console.log(data[i]._id);
    //   console.log(data[i].activityList);
    // }

    return step4(data, callback);
  });
}

function step4(newApprovalRequests, callback) {
  // Update the CE hours that are now in the new approval requests
  // so that the user doesn't try to edit them once they are in a request.
  // Their approval state goes from needy to pending.

  // Accumulate list of CE Hours records that are included in new approval requests
  var newlyPendingHours = [];
  for (approvalRequest of newApprovalRequests) {
    for (activity of approvalRequest.activityList) {
      newlyPendingHours.push(activity._id);
    }
  }
  
  // console.log('list of ce hours', newlyPendingHours);

  var filter = { _id: { $in: newlyPendingHours} };
  var newState = { approvalState: dbConsts.PENDING };
  CeHours.updateMany(filter, newState, (err, results) => {
    if (err) return callback(err);
    console.log('CE Hours records updated to pending:', results.nModified);
    return step5(newApprovalRequests, callback); 
  });
}


function step5(insertedDocs, callback) {
  // See if any of the previously inserted approval requests contain
  // unapproved hours that have rolled over to the new approval requests.
  markRollovers(insertedDocs, (err, data) => {
    return callback(null, insertedDocs);
  });
}

// function finale(err) {
//   console.log("We're done");
//   // console.log(err, "Approval requests created", data.length);
//   // db.shutdown();
// }


/****************** Helper Functions ******************/

function markRollovers(rows, callback) {
  // See if any of the previously inserted approval requests contain
  // unapproved hours that have rolled over to the new approval requests.
  // Callback signature: (<err>, <result returned by Mongoose update> )
   
  // Filter for pending approval requests for candidates, excluding
  // the ones we just generated.
  var candidateEmails = rows.map( (x) => { return x.candidateEmail; } );
  var newIds = rows.map( (x) => { return x._id; } );

  var filter = {
    candidateEmail: { $in: candidateEmails },
    approvalState: dbConsts.PENDING,
    _id: { $not: { $in: newIds }}
  };

  var updateDoc = {
    approvalState: dbConsts.ROLLED
  };

  ApprovalRequest.update(filter, updateDoc, { multi: true }, (err, result) => {
    // console.log('update result:', result);
    console.log('Approval requests rolled over:', result.nModified);
    return callback(err, result);  
  });
}


// function displayEmails(data) {
//   // Display email fields from data collection.
//   const iMax = data.length;
//   for( let i = 0; i < iMax; ++i) {
//     let row = data[i];
//     console.log(row.email, row.mentor_email);
//   }
// }


// function displayPendingCeHours(data, callback) {

//   //Display what came back from DB
//   let i = 0;
//   const iMax = data.length;
//   for ( ; i < iMax; ++i) {
//     let row = data[i];
//     console.log(i,
//       row.timestamp,
//       row.candidateEmail,
//       row.activityDate,
//       row.activityDescription, 
//       row.activityDurationAsString,
//       row.activityDurationInMinutes,
//       row.approvalState);
//   }
// }

// function displayApprovalRequests(data) {
//   const iMax = data.length;
//   for (let i = 0; i < iMax; ++i) {
//     let row = data[i];
//     console.log('-'.repeat(40))
//     console.log('Candidate:', row.candidateFullName, row.candidateEmail);
//     console.log('Mentor:', row.mentorFullName, row.mentorEmail);
//     // console.log(row.requestHash);
//     console.log(padRight('Date', 12), padRight('Duration', 22), padRight('Activity', 30), 'Participants');
//     console.log('-'.repeat(12), '-'.repeat(22), '-'.repeat(30),  '-'.repeat(30));

//     const jMax = row.activityList.length;
//     for (let j = 0; j < jMax; ++j) {
//       let activity = row.activityList[j];
//       console.log(
//         padRight(activity.activityDate.toLocaleDateString(), 12),
//         padRight(activity.activityDurationAsString, 22),
//         padRight(activity.activityDescription, 30),
//         activity.otherParticipants
//         );
//     }

//     // console.log(row.requestEmailBody);
//     console.log(row.totalHours.toFixed(1), 'hours');
//     console.log('activities requiring approval:', row.activityList.length);
//     console.log('-'.repeat(40))

//   }
// }


// function buildActivityLogString(row) {
//   let sDate = padRight(row.activityDate.toLocaleDateString(), 12);
//   let sDuration = padRight(row.activityDurationAsString, 22);
//   let dDescription = padRight(row.activityDescription, 30);
//   let sParticipants = row.otherParticipants;
//   return `${sDate} ${sDuration} ${dDescription} ${sParticipants}\r\n`;
// }


// function padRight(s, width, padChar = ' ') {
//   // NodeJS strings seem to be missing a pad function.
//   let sLength = s.length;
//   if (sLength >= width) return s;
//   return s + padChar[0].repeat(width - sLength);
// }


/****************** Module Exports ******************/

exports.run = step1;
