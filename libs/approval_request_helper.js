/* Utility functions for Mongoose ApprovalRequests model.
10.18.2017 tps Created.
*/
const dbConsts = require('./db_consts');
const ApprovalRequest = require('./approval_request_model');
const uuidv4 = require('uuid/v4');
const base64url = require('base64url');

/****************** Async DB Access Functions ******************/

function saveApprovalRequests(rows, callback) {
  // rows -- Array of objects to save to Approval Requests DB.

  let ceEntries = [];  // Accumulator for new CeHours objects

  let i = 0;
  const iMax = rows.length;
  for ( ; i < iMax; ++i) {
    let row = rows[i];

    let ceEntry = new ApprovalRequest({
      timestamp: Date.now(),
      requestHash: base64url(uuidv4()),
      candidateFullName: row.candidateFullName,
      candidateEmail: row.candidateEmail,
      mentorFullName: row.mentorFullName,
      mentorEmail: row.mentorEmail,
      mentorSecret: base64url(uuidv4()),
      activityList: row.activityList,
      totalHours: row.totalHours,
      requestEmailBody: row.requestEmailBody,
      requestEmailId: null,
      requestEmailTimestamp: null,
      requestEmailReply: null,
      mentorClickTimestamp: null,
      mentorSubmitTimeStamp: null,
      candidateReviseTimestamp: null,
      approvalState: dbConsts.PENDING,
      mentorComment: null,
      denialEmailBody: null,
      denialEmailId: null,
      denialEmailTimestamp: null,
    });

    ceEntries.push(ceEntry);
  }

  // Batch insert
  ApprovalRequest.insertMany(ceEntries, callback);
}


// function markRollovers(rows, callback) {
//   // See if any of the previously inserted approval requests contain
//   // unapproved hours that have rolled over to the new approval requests.
//   // Callback signature: (<err>, <result returned by Mongoose update> )

//   var mentorEmails = rows.map( (x) => { return x.mentorEmail; } );
//   var newIds = rows.map( (x) => { return x._id; } );
//   // console.log('emails', mentorEmails);
//   // console.log('roll over ids', newIds);

//   var filter = {
//     mentorEmail: { $in: mentorEmails },
//     approvalState: dbConsts.PENDING,
//     _id: { $not: { $in: newIds }}
//   };

//   var updateDoc = {
//     approvalState: dbConsts.ROLLED
//   };

//   ApprovalRequest.update(filter, updateDoc, { multi: true }, (err, result) => {
//     // console.log('update result:', result);
//     console.log('Approval requests rolled over:', result.nModified);
//     return callback(err, result);  
//   });
// }


/****************** Module Exports ******************/

exports.saveApprovalRequests = saveApprovalRequests;
// exports.markRollovers = markRollovers;

