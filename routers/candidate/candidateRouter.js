/* Controller for Teacher Candidate pages.
Teacher candidates come here to manage their CE hours.
10.31.2017 tps
11.30.2017 tps Precalculate CE hours activity duration in minutes.
11.30.2017 tps Display hours totals on each page.
*/

const express       = require('express');
const router        = express.Router();
// const mongoose      = require('mongoose');

// const routerHelper    = require('../../scripts/routerHelper');
const CeHours         = require('../../libs/ce_hours_model');
const ceHoursHelper   = require('../../libs/ce_hours_helper');
const dbConsts        = require('../../libs/db_consts');
const ApprovalRequest = require('../../libs/approval_request_model');
const approvalUtils   = require('../../libs/approval_utils');
const update_helper   = require('../../libs/update_helper');
const parsingHelper   = require('../../libs/parsingHelper');



// ******************** Constants ********************//
// const TEST_EMAIL = 'SecretSquirrel@SecretSquirrel.net';
// const TEST_EMAIL = 'SecretSquirrel@SecretSquirrel.net';

// ******************** Page Handlers ********************//

function renderSubmitHoursPage(req, res) {
  // Renders page with form to create a new CE Hours record.

  // Create a dummy CE Hours record with default values for user to edit.
  // Teacher candidate's email comes from session.
  // Use a dummy teacher candidate if one hasn't been set yet.
  if (!req.session.email) {
    req.session.email = 'SecretSquirrel@SecretSquirrel.net';
    req.session.fullName = 'SecretSquirrel';
  }
  var email = req.session.email;

  let d = new Date();
  let today = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  let newEntry = new CeHours({
    timestamp: new Date(),
    candidateType: '',
    candidateEmail: email,
    activityDate: today,
    activityDescription: '',
    activityDurationAsString: '',
    otherParticipants: '',
    approvalState: dbConsts.NEEDY
  });
  let params = {
    data: newEntry,
    redirectUrl: req.app.locals.APP_URL + 'candidate/viewHours'  // Where to go after the edit.
    // redirectUrl: routerHelper.APP_URL + 'candidate/viewHours'  // Where to go after the edit.
  };

  // return res.render('candidate/submitHours', params);
  return renderWithTotals(res, 'candidate/submitHours', params, email);
}


function renderReviewApprovedHoursPage(req, res) {
  var filter = {
    candidateEmail: req.session.email,
    approvalState: dbConsts.APPROVED
  };
  CeHours.find(filter).sort('activityDate').exec( (err, result) => {
    if (err) return res.render('admin/err', { err: err });

    // Display total approved hours
    var totalMinutes = 0;
    for (activity of result) {
      totalMinutes += activity.activityDurationInMinutes;
    }
    var params = {
      data: result,
      totalHours: totalMinutes / 60.0
    };
    // return res.render('candidate/reviewApproved', params);
    return renderWithTotals(res, 'candidate/reviewApproved', params, req.session.email);

  });
  // return listRequestsFilteredByState(req, res, dbConsts.APPROVED, 'candidate/reviewApproved');
}


function renderReviewDeniedHoursPage(req, res) {
  return listRequestsFilteredByState(req, res, dbConsts.DENIED, 'candidate/reviewDenied');
}


function renderReviewRevisedHoursPage(req, res) {
  return listRequestsFilteredByState(req, res, dbConsts.REVISED, 'candidate/reviewRevised');
}


function renderReviewPendingApprovalsPage(req, res) {
  // Display pending approval, if any. 
  // There should be none or one pending approvals, though if data does not have
  // rollover approval requests, there could be more. We only want to show the
  // most recent one.

  var filter = {
    candidateEmail: req.session.email,
    approvalState: dbConsts.PENDING
  };

  ApprovalRequest.findOne(filter).sort('-timestamp').exec( (err, data) => {
  // ApprovalRequest.findOne( filter, (err, data) => {
    if (err) return res.render('admin/err', { 'err': err } );
    if (data) {
      return renderWithTotals(res, 'candidate/requestDetail', { 'data': data }, req.session.email);
    } else {
      return renderWithTotals(res, 'candidate/noPending', {}, req.session.email);
    }
  });
  // return listRequestsFilteredByState(req, res, dbConsts.PENDING, 'candidate/reviewPending');
}

function renderReviewHoursPage(req, res) {
  var filter = {
    candidateEmail: req.session.email,
    approvalState: dbConsts.NEEDY
  };
  CeHours.find( filter ).sort('activityDate').exec( (err, result) => {
    if (err) return res.render('admin/err', { err: err });

    // Display total hours needing approval
    var totalMinutes = 0;
    for(activity of result) {
      totalMinutes += activity.activityDurationInMinutes;
    }

    var params = {
      data: result,
      totalHours: totalMinutes / 60.0
    };
    // return res.render('candidate/reviewHours', params);
    return renderWithTotals(res, 'candidate/reviewHours', params, req.session.email);

  });
  // return res.render('candidate/reviewHours');
}

function postNewHours(req, res) {
  // Save a new CE Hours record.

  /* The particpants may come across as:
  - undefined, if user did not check any boxes.
  - string, if user checked only 1 box
  - array of strings, if user checked multiple boxes.
  Store list as  comma-separated string of values.
  */

  // TODO: Validate date field with this weird test, since it's possible
  // to create an invalid date without errors.
  var activityDate = parseDateField(req.body.datepickr);
  if (isNaN(activityDate)) {
    // Redraw with error message
  }

  var participantsList = '';
  if (req.body.participants) {
    participantsList = Array.isArray(req.body.participants) ? req.body.participants.join(', ') : req.body.participants;
  }

  ceHoursHelper.newCeHours(
    req.body.candidateType,
    req.body.email,
    // new Date(parseInt(req.body.year), parseInt(req.body.month) - 1, parseInt(req.body.date)),
    parseDateField(req.body.datepickr),
    req.body.activity,
    req.body.hours,
    participantsList,
    function(err) {
      if (err) return res.render('admin/err', { err: err });
        return res.redirect(req.body.redirectUrl);
        // return res.redirect('candidate/viewHours');

    });
}

function editHours(req, res) {
  // Render form for user to edit an existing CE Hours record.
  CeHours.findOne( { _id: req.body.record_id }, (err, result) => {
    if (err) return res.render('admin/err', { err: err });
    // console.log('req.body.redirectUrl:', req.body.redirectUrl);

    // We might fail to find the specified record
    if (result == null) {
      let err = new Error(`Cannot find CE hours record ${req.body.record_id}`);
       return res.render('admin/err', { err: err });
    }

    var params = {
      data: result,
      redirectUrl: req.body.redirectUrl  // Where to go after the edit.
    };

    // return res.render('candidate/editHours', params );
    return renderWithTotals(res, 'candidate/editHours', params, req.session.email);

  });
}

function submitEdit(req, res) {
 // console.log('submitedit', parseDateField(req.body.datepickr));
  // Handles updating an existing CE Hours record and then redirecting 
  // browser to a summary page.
  // Client determines where to go after the edit.
    // console.log('req.body.redirectUrl:', req.body.redirectUrl);

  var activityDate = parseDateField(req.body.datepickr);
  // console.log('parsed date', req.body.hoursId, activityDate);
  
  /* The particpants may come across as:
  - undefined, if user did not check any boxes.
  - string, if user checked only 1 box
  - array of strings, if user checked multiple boxes.
  Store list as  comma-separated string of values.
  */
  var participantsList = '';
  if (req.body.participants) {
    participantsList = Array.isArray(req.body.participants) ? req.body.participants.join(', ') : req.body.participants;
  }

  /* If the approval state is DROPPED, we got here because the user edited a denied record
  that was then deleted. In this case, restore it's status to DENIED. */
  var newState =  (req.body.approvalState === dbConsts.DROPPED) ? dbConsts.DENIED : req.body.approvalState;

  // Update the DB & redirect user back to summary page.
  CeHours.update({ _id: req.body.hoursId },
    { 
      candidateType: req.body.candidateType,
      activityDate: activityDate,
      // activityDate: new Date(parseInt(req.body.year), parseInt(req.body.month) - 1, parseInt(req.body.date)),
      activityDescription: req.body.activity,
      activityDurationAsString: req.body.hours,
      activityDurationInMinutes: parsingHelper.parseMinutes(req.body.hours),
      otherParticipants: participantsList,
      approvalState: newState
    },
    (err, raw) => {
      // console.log(raw);
      if (err) return res.render('admin/err', { 'err': err } );
      return res.redirect(req.body.redirectUrl);
      // return res.redirect('candidate/viewHours');
    });
}

function renderRequestDetail(req, res) {
  // Uses publically accessible request hash to look up request to view
  ApprovalRequest.findOne( { requestHash: req.params['uuid'] }, (err, data) => {
    if (err) return res.render('admin/err', { 'err': err } );
    if (data) {
      // return res.render('candidate/requestDetail', { 'data': data } );
      return renderWithTotals(res, 'candidate/requestDetail', { 'data': data }, req.session.email);

    } else {
      // Mongoose couldn't find this approval request
      return res.render('admin/invalidHash');
    }
  });
}


function renderReviewRevisedDetail(req, res) {
  // Uses publically accessible request hash to look up request to view
  ApprovalRequest.findOne( { requestHash: req.params['uuid'] }, (err, data) => {
    if (err) return res.render('admin/err', { 'err': err } );
    if (data) {
      // return res.render('candidate/requestDetail', { 'data': data } );
      return renderWithTotals(res, 'candidate/requestDetail', { 'data': data }, req.session.email);

    } else {
      // Mongoose couldn't find this approval request
      return res.render('admin/invalidHash');
    }
  });
}


function renderReviewDeniedDetail(req, res) {
  approvalUtils.findRequestDiffs(req.params['uuid'], (err, approvalRequest, ceHours, diffs) => {
    if (err) return res.render('admin/err', {'err': err});
    if (!approvalRequest) return res.render('admin/invalidHash'); 

    var params = {
      request: approvalRequest,
      hours: ceHours,
      diffs: diffs
    };
    // return res.render('candidate/deniedDetail', params);
    return renderWithTotals(res, 'candidate/deniedDetail', params, req.session.email);

  });
  // ApprovalRequest.findOne( { requestHash: req.params['uuid'] }, (err, data) => {
  //   if (err) return res.render('admin/err', { 'err': err } );
  //   if (data) {
  //     return res.render('candidate/deniedDetail', { 'data': data } );
  //   } else {
  //     // Mongoose couldn't find this approval request
  //     return res.render('admin/invalidHash');
  //   }
  // });
}

function resubmitHours(req, res) {
  return res.redirect(req.app.locals.APP_URL + 'candidate/viewDenied');
}

function dropHours(req, res) {
  return updateHoursState(req, res, dbConsts.DROPPED);
  // var filter =  { _id: req.body.record_id };
  // var updateDoc = { approvalState: dbConsts.DROPPED };
  // CeHours.findOneAndUpdate(filter, updateDoc, (err, data) => {
  //   if (err) return res.render('admin/err', { 'err': err } );
  //   return res.redirect(req.body.redirectUrl);
  // });

}

function restoreHours(req, res) {
  return updateHoursState(req, res, dbConsts.DENIED);
  // var filter =  { _id: req.body.record_id };
  // var updateDoc = { approvalState: dbConsts.DENIED };
  // CeHours.findOneAndUpdate(filter, updateDoc, (err, data) => {
  //   if (err) return res.render('admin/err', { 'err': err } );
  //   return res.redirect(req.body.redirectUrl);
  // });
}

function updateHoursState(req, res, newState) {
  var filter =  { _id: req.body.record_id };
  var updateDoc = { approvalState: newState };
  CeHours.findOneAndUpdate(filter, updateDoc, (err, data) => {
    if (err) return res.render('admin/err', { 'err': err } );
    return res.redirect(req.body.redirectUrl);
  });
}

function deleteHours(req, res) {
  CeHours.remove( { _id: req.body.record_id }, (err) => {
    if (err) return res.render('admin/err', { 'err': err } );
    // console.log('remove', req.body.record_id);
    return res.redirect(req.body.redirectUrl);
  });
}

function resubmitHours(req, res) {
  /* User wants to send denied CE hours back into pool of entered hours */
  update_helper.updateDeniedApproval(
    req. body.requestHash,
    (err, results) => {
      if (err) return res.render('admin/err', { 'err': err } );
      return res.redirect(req.app.locals.APP_URL + 'candidate/viewHours');
    });
}

function renderDebugHoursPage(req, res) {
  /* Display all the candidate's CE Hours records */
  CeHours.find({ candidateEmail: req.session.email }).sort('-activityDate').exec( (err, result) => {
    if (err) return res.render('admin/err', { err: err });
    // return res.render('candidate/debugHours', { data: result });
    return renderWithTotals(res, 'candidate/debugHours', { data: result }, req.session.email);

  });
}


// ******************** Helper Functions ********************//

function listRequestsFilteredByState(req, res, approvalState, targetView) {
  var filter = {
    approvalState: approvalState,
    candidateEmail: req.session.email
  };
  ApprovalRequest.find(filter, (err, data) => {
    if (err) return res.render('admin/err', { 'err': err } );

    var params = {
      'data': data,
    };
    // return res.render(targetView, params);
    return renderWithTotals(res, targetView, params, req.session.email);

  });
}


function parseDateField(s) {
  /* Parse date field text to Date object.
  String expected to look like: "11/13/2017"
  */
  var split = s.split('/');
  return new Date(parseInt(split[2]), parseInt(split[0]) - 1, parseInt(split[1]));
}


function renderWithTotals(res, view, params, email) {
  /* Retrieve hours totals for user by approval state, for display in web page.
  email: Email ID of user we want totals for.
  Callback signature: ( err, <totals object>)
  <totals object> is an associative array holding total for each approval state,
  plus an 'All' entry with entire sum.
  */

  // Intialize totals accumulator
  var totals = { };
  for (state of dbConsts.HOURS_STATES) {
    totals[state] = 0;
  }
  totals['All'] = 0;

  // Query for totals
  require('../../libs/ce_hours_aggregator').run([email], (err, results) => {
    if (err) return res.render('admin/err', { err: err });

    for (row of results) {
      totals[row._id.approvalState] = row.totalHours;
      totals['All'] += row.totalHours;
    }

    // Render with totals added to param bag.
    params['totals'] = totals;
    return res.render(view, params);
  });
}


// ******************** Routing Configuration ********************//

router.use(require('./candidateRouteMiddleware'));

router.get('/',             renderSubmitHoursPage);
router.get('/submitHours',  renderSubmitHoursPage);
router.get('/viewApproved', renderReviewApprovedHoursPage);
router.get('/viewApproved/:uuid', renderRequestDetail);
router.get('/viewDenied',   renderReviewDeniedHoursPage);
router.get('/viewDenied/:uuid',   renderReviewDeniedDetail);
router.get('/viewPending',  renderReviewPendingApprovalsPage);
router.get('/viewPending/:uuid',  renderRequestDetail);
router.get('/viewRevised',   renderReviewRevisedHoursPage);
router.get('/viewRevised/:uuid',   renderReviewRevisedDetail);
router.get('/viewHours',    renderReviewHoursPage);
router.get('/debugHours',   renderDebugHoursPage);

router.post('/submitHours', postNewHours);
router.post('/editHours', editHours);
router.post('/submitEdit', submitEdit);
router.post('/viewDenied/:uuid', resubmitHours);
router.post('/deleteHours', deleteHours);
router.post('/dropHours', dropHours);
router.post('/restoreHours', restoreHours);
router.post('/resubmitHours', resubmitHours);

exports.router = router;