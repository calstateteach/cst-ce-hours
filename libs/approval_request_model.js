/* Module containing approval requests Mongoose model.
10.17.2017 tps
11.17.2017 tps Add field timestamp when candidate revised denied request.
12.12.2017 tps Add fields for recording email sent info.
*/

var mongoose = require('mongoose');
const dbConsts = require('./db_consts');

// mongoose.Promise = global.Promise;
//   // To get rid of DeprecationWarning warning.


/******************** DB Schema ********************/

// Create schema for approval requests
var ApprovalRequestSchema = mongoose.Schema( {
  timestamp: Date,
  requestHash: String,
  candidateFullName: String,
  candidateEmail: String,
  mentorFullName: String,
  mentorEmail: String,
  mentorSecret: String, // Hard to guess key that authorizes updates
  activityList: [], // CeHours objects being approved.
  totalHours: Number,
  requestEmailBody: String,
  requestEmailId: String,
  requestEmailTimestamp: Date,
  requestEmailReply: String,
  mentorClickTimestamp: Date,
  mentorSubmitTimeStamp: Date,
  candidateReviseTimestamp: Date,
  approvalState: { type: String, enum: dbConsts.APPROVAL_STATES },
  mentorComment: String,
  denialEmailBody: String,
  denialEmailId: String,
  denialEmailTimestamp: String,

  // 12.12.2017 tps New fields for recording email events
  requestEmailSubj: String,   // Subject line of email
  requestEmailError: String,  // Error message returned by SMTP transporter as a JSON string
  requestEmailResponse: String, // Info returned by SMTP transporter as a JSON string
  // requestEmailError: mongoose.Schema.Types.Mixed,  // Error message returned by SMTP transporter
  // requestEmailResponse: mongoose.Schema.Types.Mixed, // Info returned by SMTP transporter
   
  // 02.01.2018 tps Add field for HTML email body text
  requestEmailHtml: String      // Email body as HTML
});

// Compile the schema into a model
var ApprovalRequest = mongoose.model('ApprovalRequest', ApprovalRequestSchema);


/******************** Exports ********************/
module.exports = ApprovalRequest;
