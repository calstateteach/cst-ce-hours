/* Module that peforms mail merge for pending approval requests.
01.27.2018 tps Created.
*/

const fs = require('fs');
const Mustache = require('mustache');


function merge(approvalRequests, callback) {
  /*
  approvalRequests - Array of approval request objects.
  callback signature: (err, array of filled-in approval request objects)
  */

  // Template files to read in
  const fileList = [
    'email_templates/mentor_verify_ce_subj.mustache',
    'email_templates/mentor_verify_ce_text.mustache'
  ];
  step_readMergeTemplates(approvalRequests, fileList, (err, templates) => {
    if (err) return callback(err);

    // for (var i = 0; i < fileList.length; ++i) {
    //   console.log(i, fileList[i], templates[i]);
    // }

    return callback(null, approvalRequests);
  });
}


function step_readMergeTemplates(approvalRequests, fileList, done) {
  var fileContents = [];  // Populate with contents of template files
  var doneCount = 0;      // Track iterations

  // Invoke callback when all iterations done.
  function report() {
    if (++doneCount >= fileList.length) {

    mergeTextTemplate(approvalRequests, fileContents[0], fileContents[1]);
    return done(null, fileContents);
    }
  }

  for (var i = 0; i < fileList.length; ++i) {
    step_readFile(fileList, fileContents, i, report);
  }
}


function step_readFile(fileList, fileContents, index, done) {
  fs.readFile(fileList[index], 'utf8', function(err, data) {  
    if (err) return done(err);
    fileContents[index] = data;
    done();
  });
}


// ******************** Helper Functions ********************//

function padRight(s, width) {
  const padChar = ' ';
  if (typeof s === 'undefined') return padChar.repeat(width);
  if (s.length >= width) return s;
  return s + padChar.repeat(width - s.length);
}

function mergeTextTemplate(results, mustacheTextTemplate, mustacheSubjTemplate) {
  // Generate email bodies & save to approval requests collection in results.

  // Before rendering, format activity dates for display & extract activity date range.
  const iMax = results.length;
  for (let i = 0; i < iMax; ++i) {
    const jMax = results[i].activityList.length;
    for (let j = 0; j < jMax; ++j) {
      var activity = results[i].activityList[j];
      activity.activityDateDisplay = activity.activityDate.toDateString();
      activity.activityDurationDisplay = padRight(activity.activityDurationAsString, 20);
      activity.activityDescDisplay = padRight(activity.activityDescription, 27);
    }
    results[i].startDate = results[i].activityList[0].activityDate.toLocaleDateString();
    results[i].endDate = results[i].activityList[jMax - 1].activityDate.toLocaleDateString();
  }

  for (let i = 0; i < iMax; ++i) {
    var mergedText = Mustache.render(mustacheTextTemplate, results[i]);
    var mergedSubj = Mustache.render(mustacheSubjTemplate, results[i]);
    // console.log(output);
    results[i].requestEmailBody = mergedText;  // Keep record of the email body created
    results[i].requestEmailSubj = mergedSubj;  // Keep record of the email subj created
  }
  return results;
}


// ******************** Module Exports ********************//
exports.merge = merge;