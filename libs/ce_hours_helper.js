/* Utility functions for CE hours data.
10.18.2017 tps Created.
11.03.2017 tps Add addCeHours() function to add a single record from the Web app.
11.07.2017 tps Change activityDurationInMinutes into a virtual getter.
11.30.2017 tps Revert activityDurationInMinutes to precalculated field.
02.06.2018 tps Filter hours to include in approval request by current term.
*/

const CeHours = require('./ce_hours_model');
const parsingHelper = require('./parsingHelper');
const dbConsts = require('./db_consts');


/****************** Async DB Access Functions ******************/

function saveCeHours(rows, candidateType, callback) {
  // rows -- Array of spreadsheet rows

  let ceEntries = [];  // Accumulator for new CeHours objects

  let i = 0;
  const iMax = rows.length;
  for ( ; i < iMax; ++i) {
    let row = rows[i];

    let ceEntry = new CeHours({
      timestamp: parsingHelper.parseTimestamp(row.timestamp),
      candidateType: candidateType,
      // candidateFullName:  'Not available',
      candidateEmail: row.emailaddress,
      // mentorFullName: 'Not available',
      // mentorEmail: 'Not available',
      activityDate: parsingHelper.parseDate(row.date),
      activityDescription: row.activity,
      activityDurationAsString: row.hours,
      activityDurationInMinutes: parsingHelper.parseMinutes(row.hours),
      otherParticipants: row.otherparticipants,
      approvalState: dbConsts.NEEDY,
      approvalRequestId: null
    });

    ceEntries.push(ceEntry);
  }

  // Batch insert
  CeHours.insertMany(ceEntries, callback);
}


function newCeHours(
  candidateType,
  candidateEmail,
  activityDate,
  activityDescription,
  activityDurationAsString,
  otherParticipants,
  callback) {

  /* Add one entry to the CeHours collection
  Callback signature: (err, product, no_of_records_added)
  */
  let newEntry = new CeHours({
    timestamp: new Date(),
    candidateType: candidateType,
    candidateEmail: candidateEmail,
    activityDate: activityDate,
    activityDescription: activityDescription,
    activityDurationAsString: activityDurationAsString,
    activityDurationInMinutes: parsingHelper.parseMinutes(activityDurationAsString),
    otherParticipants: otherParticipants,
    approvalState: dbConsts.NEEDY,
    approvalRequestId: null
  });
  newEntry.save(callback);

}


function getLastTimestamp(candidateType, callback) {
  // Query for the most recent timestamp of CE hours documents for the given candidate type.
  // Callback signature: (error, <Datetime object>)
  // 11.20.2017 tps This was only useful when all CE Hours data was coming from Google spreadsheet imports.

  CeHours.findOne( { candidateType: candidateType } ).sort('-timestamp').exec( (err, result) => {
    if (err) return callback(err);

    // If the collection is empty, return a dummy minimum date.
    let timestamp = (result === null) ? new Date(-10000, 0, 1) : result.timestamp;
    return callback(null, timestamp);
  });
}


function getHoursNeedingApproval(callback) {
  // Don't include CE hours before January 2018, the current term.
  // We need to data-drive this somehow.
  var filter = {
    approvalState: { $in: [dbConsts.NEEDY, dbConsts.PENDING] },
    activityDate: { $gte: new Date(2018, 0, 1) }
  };

  CeHours.
    // find({ $or: [ {'approvalState': dbConsts.NEEDY }, {'approvalState': dbConsts.PENDING } ]}).
    find(filter).
    sort({ 'candidateEmail': 1, 'activityDate': 1 }).
    exec(callback);
}


/****************** Module Exports ******************/
exports.getLastTimestamp = getLastTimestamp;
exports.saveCeHours = saveCeHours;
exports.getHoursNeedingApproval = getHoursNeedingApproval;
exports.newCeHours = newCeHours;
