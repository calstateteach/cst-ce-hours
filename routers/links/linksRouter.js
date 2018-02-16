/* Controller for CE hours approval pages.
Users follow links to come here to approve/deny approval requests.
10.13.2017 tps
*/

const express = require('express');
const router = express.Router();

const ApprovalRequest = require('../../libs/approval_request_model');
const updater         = require('../../libs/update_helper');
const consts          = require('../../libs/db_consts');
// const routerHelper    = require('../../scripts/routerHelper');


// ******************** Constants ********************//

// const APP_URL = process.env.APP_URL;
  // URL location of Web app. Use to build URL links when app is
  // running under a reverse proxy server.
  // e.g. "https://SecretSquirrel.net/cehours/"


// ******************** Page Handlers ********************//

function renderApprovalForm(req, res) {
  renderApprovalLink(req, res, (mentorSecret, data) => {
    
    var params = {
      'data': data,
      // 'APP_URL': APP_URL  // Pass in paths the template needs to create links
    }; 
     return res.render('links/approveForm', params);
  });
}


function doApproval(req, res) {
  renderApprovalLink(req, res, (mentorSecret, data) => {

    updater.approve(mentorSecret, (err) => {
      if (err) return res.render('admin/err', { 'err': err } );
      // return res.redirect('links/confirm/' + mentorSecret);
      return res.redirect(req.app.locals.APP_URL + 'links/confirm/' + mentorSecret);
    });
  });
}


function renderDenialForm(req, res) {
  renderApprovalLink(req, res, (mentorSecret, data) => {

    var params = {
      'data': data,
      'err': req.query.validation  // Display message about missing data, if any
    }; 
    return res.render('links/denyForm', params);
  });
}


function doDenial(req, res) {
  var mentorSecret = req.params.requestHash;

  // User must include a reason for the denial
  if (!req.body.comment.trim()) {
      return res.redirect(req.app.locals.APP_URL + 'links/denyForm/' + mentorSecret + '?validation=missingComent');
    // return res.redirect(APP_URL + 'links/denyForm/' + mentorSecret + '?validation=missingComent');
  } else {
    updater.deny(mentorSecret, req.body.comment, (err) => {
      if (err) return res.render('admin/err', { 'err': err } );
      return res.redirect(req.app.locals.APP_URL + 'links/confirm/' + mentorSecret);
      // return res.redirect(APP_URL + 'links/confirm/' + mentorSecret);
    });
  }
}


function renderConfirmationPage(req, res) {
  // Requires knowing mentor secret to view
  ApprovalRequest.findOne( { mentorSecret: req.params['requestHash'] }, (err, data) => {
    if (err) return res.render('admin/err', { 'err': err } );
    if (data) {
      return res.render('links/confirm', { 'data': data } );
    } else {
      // Mongoose couldn't find this approval request
      return res.render('admin/invalidHash');
    }
  });
}


function renderRequestDetailPage(req, res) {
  // Uses publically accessible request hash to view
  ApprovalRequest.findOne( { requestHash: req.params['requestHash'] }, (err, data) => {
    if (err) return res.render('admin/err', { 'err': err } );
    if (data) {
      return res.render('links/requestDetail', { 'data': data } );
    } else {
      // Mongoose couldn't find this approval request
      return res.render('admin/invalidHash');
    }
  });
}



// ******************** Helper Functions ********************//


function renderApprovalLink(req, res, callback) {
  /* Pattern for rendering approval/deny pages.
  Callback function handles update steps.
  Callback signature: (mentorSecret, (approval Request record>)
  */
  
  // Make sure client requested a valid approval request
  var mentorSecret = req.params['requestHash'];
  ApprovalRequest.findOne( { mentorSecret: req.params['requestHash'] }, (err, data) => {
    if (err) return res.render('admin/err', { 'err': err } );

    if (data) {
      // Don't allow user to update an approval request more than once
      if (data.approvalState === consts.PENDING) {
        callback(mentorSecret, data);
      } else {
        // User already approved this request
        return res.redirect(req.app.locals.APP_URL + 'links/confirm/' + mentorSecret);
        // return res.redirect(APP_URL + 'links/confirm/' + mentorSecret);
      }
    } else {
      // Mongoose couldn't find this approval request
      return res.render('admin/invalidHash');
    }
  });
}


// ******************** Routing Configuration ********************//

router.get( '/approveform/:requestHash',   renderApprovalForm);
router.get( '/approve/:requestHash',       doApproval);
router.get( '/denyform/:requestHash',      renderDenialForm);
router.post('/deny/:requestHash',          doDenial);
router.get( '/confirm/:requestHash',       renderConfirmationPage);
router.get( '/requestDetail/:requestHash', renderRequestDetailPage);

exports.router = router;