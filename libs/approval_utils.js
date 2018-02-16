/* Utility functions for Mongoose ApprovalRequests model.
11.09.2017 tps Created.
*/
const ApprovalRequest = require('./approval_request_model');
const CeHours         = require('./ce_hours_model');

/****************** Async DB Access Functions ******************/

function findRequestDiffs(requestHash, callback) {
  /* Retrieve approval request object, its original CE hours objects & difference flags.
  callback signature: (err, <approval request object>, <array of CE hours objects>, <array of diff flags>)
  */

  // Query for the approval request object itself
  ApprovalRequest.findOne( { requestHash: requestHash }, (err, data) => {
    if (err) return callback(err);
    if (!data) return callback(null, null, null, null); // Return null object for invalid request hash
    return findRequestDiffs1(data, callback);
  });
}

function findRequestDiffs1(approvalRequest, callback) {
  // Next step in retrieving original hours records.

  // Build list of CE Hours records
  var ceHoursIds = [];
  const iLimit = approvalRequest.activityList.length;
  for (let i = 0; i < iLimit; ++i) {
    ceHoursIds.push(approvalRequest.activityList[i]._id);
  }
  
  var filter = { _id: { $in: ceHoursIds } };
  CeHours.find(filter, (err, data) => {
    if (err) return callback(err);
    return findRequestDiffs2(approvalRequest, data, callback);
  });
}

function findRequestDiffs2(approvalRequest, ceHours, callback) {
  /* Next step is creating parallel arrays of ceHours data, so that we can
  access the Hours records in the approval record, the associated, possibly edited,
  hours record, & flag indicating if they are different, all with the same array index.
  */
  var latestHours = []; // Holds copies of latest state of CE hours records underlying approval request.
  var diff = [];  // Holds true/false values indicating if underlying CE hours record has been edited.

  const iLimit = approvalRequest.activityList.length;
  for (var i =0; i < iLimit; ++i) { // Index order is important here
    let objInRequest = approvalRequest.activityList[i];
    let objInDb = ceHours.find( (e) => {
      return e.equals(objInRequest._id);
    });

    // We should always be able to find the underlying record,
    // but defensively...
    if (!objInDb) {
      latestHours.push(null);
      diff.push(true);
      continue;
    }
    
    // Test if the data values of the 2 objects are the same.
    let isMatch = (objInRequest.candidateType === objInDb.candidateType)
      && !(objInRequest.activityDate - objInDb.activityDate)
      && (objInRequest.activityDescription === objInDb.activityDescription)
      && (objInRequest.activityDurationAsString === objInDb.activityDurationAsString)
      && (objInRequest.otherParticipants === objInDb.otherParticipants);
  
    // Populate parallel arrays, where index position corresponds to the same record.
    latestHours.push(objInDb);
    diff.push(!isMatch);
  }

  // Return are results to the callback
  return callback(null, approvalRequest, latestHours, diff);
}

/****************** Module Exports ******************/
exports.findRequestDiffs = findRequestDiffs;

