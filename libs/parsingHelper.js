/* Helper functions for parsing data from Google spreadsheets.
10.05.2017 tps 
11.03.2017 tps Add handing for time like "30 Minutes" to parseMinutes().
11.07.2017 tps Remove parseMinutes().
*/

function parseTimestamp(s) {
/* Convert timestamp string to Date object. Timestamp strings may look like:  
  8/25/2017 15:40:54 
  9/14/2017 7:59:32
  */

  var timestampParts = s.split(' ');
  var dateParts = timestampParts[0].split('/');
  var timeParts = timestampParts[1].split(':');
  var year = parseInt(dateParts[2]);
  var month = parseInt(dateParts[0] - 1); // Month is zero-based!
  var date = parseInt(dateParts[1]);
  var hours = parseInt(timeParts[0]);
  var minutes = parseInt(timeParts[1]);
  var seconds = parseInt(timeParts[2]);

  return new Date(year, month, date, hours, minutes, seconds);
}


function parseDate(s) {
/* Convert timestamp string to Date object. Timestamp strings may look like:  
  8/30/2017 
  9/5/2017
  */

  var dateParts = s.split('/');
  var year = parseInt(dateParts[2]);
  var month = parseInt(dateParts[0] - 1); // Month is zero-based!
  var date = parseInt(dateParts[1]);

  return new Date(year, month, date);
}


function parseMinutes(s) {
  /* Convert hours logged to minutes. Hours logged may look like:
    '30 minutes'
    '4 Hours 30 Minutes' 
    '6 Hours
    '1 Hour'
    '1 Hour 30 Minutes'
  */

  var hours = 0;
  var minutes = 0;
  var timeParts = s.split(' ');
  if (timeParts[1] === 'Minutes') {
    minutes = parseInt(timeParts[0]);
  } else {
    hours = parseInt(timeParts[0]);
    minutes = (timeParts.length > 2) ? parseInt(timeParts[2]) : 0; 
  }
  return (hours * 60) + minutes;
}


function parseUserId(s) {
/* Return the mailbox name of an email address, which is used to identify Canvas users.
   For example, the user ID associated with email "SecretSquirrel@SecretSquirrel.net" is "SecretSquirrel".
*/
  return s.split('@')[0];
}


/******************** Module Exports ********************/

exports.parseDate = parseDate;
exports.parseTimestamp = parseTimestamp;
exports.parseMinutes = parseMinutes;
exports.parseUserId = parseUserId;