/* Module with functions for updating CE Hours data.
10.20.2017 tps
10.25.2017 tps Include link back to approval record in CE Hours records on update.
11.17.2017 tps Add function to update DB when techer candidate resubmits denied hours.
*/
const ApprovalRequest = require('./approval_request_model');
const CeHours         = require('./ce_hours_model');
const dbConst         = require('./db_consts');


/******************** Async steps to update approval status ********************/


function approve(mentorSecret, callback) {
  updateStatus(mentorSecret, dbConst.APPROVED, '', callback);
}


function deny(mentorSecret, mentorComment, callback) {
  updateStatus(mentorSecret, dbConst.DENIED, mentorComment, callback);
}


function updateStatus(mentorSecret, newState, mentorComment, callback) {
  // Start process of updating approval state of approval request and associated CE hours
  // Callback signature: (err)
  
  // Update the parent request record
  var filter = { mentorSecret: mentorSecret };
  var updateDoc =  {
    approvalState: newState,
    mentorComment: mentorComment,
    mentorSubmitTimeStamp: Date.now()
  };
  
  ApprovalRequest.findOneAndUpdate(filter, updateDoc, (err, data) => {
    if (err) return callback(err);

    // Consider an invalid mentorSecret to be an error
    if (!data) return callback(new Error('update_helper::updateStatus() received Invalid request ID'));

    return updateStatus_1(data, newState, callback);
  });
}


function updateStatus_1(data, newState, callback) {
  // Change pending state of associated CE Hours records.
  // Callback signature: (err, <object returned to updateMany callback>)

  // List of CE Hours records to approve
  var updateList = [];
  const iMax = data.activityList.length;
  // console.log('child records to update', iMax);
  for (let i = 0; i < iMax; ++i) {
    // updateList.push(mongoose.Types.ObjectId(data.activityList[i]._id));
    updateList.push(data.activityList[i]._id);
  }
  
  var filter = { _id: { $in: updateList } };
  var updateDoc = { approvalState: newState, approvalRequestId: data._id };
  CeHours.updateMany(filter, updateDoc, (err, results) => {
    if (err) return callback(err);
    // console.log('update many', results);
    return callback(null, results);
  });
}


function updateDeniedApproval(requestHash, callback) {
  // Start process of updating a denied approval request which has been revised by the teacher candidate.
  // Update approval request, then reset approval state of associated CE Hours records.
  // Callback signature: (err)
  
  // Update the parent request record
  var filter = { requestHash: requestHash };
  var updateDoc =  {
    approvalState: dbConst.REVISED,
    candidateReviseTimestamp: Date.now()
  };
  
  ApprovalRequest.findOneAndUpdate(filter, updateDoc, (err, data) => {
    if (err) return callback(err);

    // Consider an invalid mentorSecret to be an error
    if (!data) return callback(new Error('update_helper::updateDeniedApproval() received Invalid request ID'));

    // To prepare for the next steps, build a list of the IDs of CE Hours
    // that we need to update or remove
    var updateList = [];
    const iMax = data.activityList.length;
    for (let i = 0; i < iMax; ++i) {
      updateList.push(data.activityList[i]._id);
    }

    return updateDeniedApproval_1(updateList, callback);
  });
}

function updateDeniedApproval_1(updateList, callback) {
  /* Change approval state of CE Hours that teacher candidate has edited.
  - Denied hours are reset to needing approval.
  
  Callback signature: (err, <object returned to updateMany callback>)
  */

  var filter = {
    _id: { $in: updateList },
    approvalState: dbConst.DENIED
  };
  var updateDoc = {
    approvalState: dbConst.NEEDY,
    approvalRequestId: null  // Disconnect hours from their denied approval request
  };
  CeHours.updateMany(filter, updateDoc, (err, results) => {
    if (err) return callback(err);
    return updateDeniedApproval_2(updateList, callback);
  });
}

function updateDeniedApproval_2(updateList, callback) {
  /* Change approval state of CE Hours that teacher candidate has edited.
  - Dropped hours are deleted.
  
  Callback signature: (err, <object returned to updateMany callback>)
  */

  var filter = {
    _id: { $in: updateList },
    approvalState: dbConst.DROPPED
  };
  CeHours.remove(filter, (err) => {
    if (err) return callback(err);
    return callback();
  });
}

// function updateApprovalAndHoursStatus(requestHash, newApprovalState, newCeHoursState, callback) {
//   // Start process of updating approval state of approval request and associated CE hours
//   // Callback signature: (err, <object returned to updateMany callback>)
  
//   // Update the parent request record
//   var filter = { requestHash: requestHash };
//   var updateDoc =  {
//     approvalState: newApprovalState,
//   };
  
//   ApprovalRequest.findOneAndUpdate(filter, updateDoc, (err, data) => {
//     if (err) return callback(err);

//     // Consider an invalid mentorSecret to be an error
//     if (!data) return callback(new Error('update_helper::updateApprovalAndHoursStatus() received Invalid request ID'));

//     return updateStatus_1(data, newCeHoursState, callback);
//   });
// }


// function updateApprovalAndHoursStatus_1(data, newState, callback) {
//   // Change status of associated CE Hours records.
//   // Callback signature: (err, <object returned to updateMany callback>)

//   // List of CE Hours records to approve
//   var updateList = [];
//   const iMax = data.activityList.length;
//   for (let i = 0; i < iMax; ++i) {
//     updateList.push(data.activityList[i]._id);
//   }
  
//   var filter = { _id: { $in: updateList } };
//   var updateDoc = { approvalState: newState, approvalRequestId: data._id };
//   CeHours.updateMany(filter, updateDoc, (err, results) => {
//     if (err) return callback(err);
//     // console.log('update many', results);
//     return callback(null, results);
//   });
// }


/******************** Module Exports ********************/
exports.approve = approve;
exports.deny = deny;
exports.updateDeniedApproval = updateDeniedApproval;