/* Module that retrieves data to and from application cache.
11.16.2017 tps 
01.13.2018 tps Retrieve mentor list URL from environment variable rather than hard coded.
*/
const csvAccess = require('./csv_access');




function getMentorList(req, callback) {
  // Get list of mentor and teacher candidate emails
  // Callback signature: (err, <arrays of rows from external csv file>)

  // See if we've cached the list in application state already.
  if (req.app.locals.mentorList) {
    // console.log("retrieve from cache");
    return process.nextTick(callback, null, req.app.locals.mentorList);
  } else {
      // csvAccess.readCsvFromUrl(mentorListUrl, (err, data) => {
      csvAccess.readCsvFromUrl(process.env.MENTOR_LIST_URL, (err, data) => {
        if (err) callback(err);

        var emailList = csvAccess.labelRowData(data); // Make fields easier to access

        // Cache the email list so we don't have to do this again
        // console.log("store to cache");
        req.app.locals.mentorList = emailList;

        return callback(null, emailList);
      });
  }
}



// ******************** Module Exports ********************//
exports.getMentorList = getMentorList;

