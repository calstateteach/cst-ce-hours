/* Controller for admin pages
10.13.2017 tps
11/13.2017 tps Add page to impersonate a teacher candidate user.
01.13.2018 tps Add handler for reloading CAM data.
02.08.2018 tps Requests page lists requests filtered by status.
*/

const express = require('express');
const router = express.Router();

const ApprovalRequest   = require('../../libs/approval_request_model');
const consts            = require('../../libs/db_consts');
const appCache          = require('../../scripts/appCache');
const mailMergeHandler  = require('./mailMergeHandler');


// ******************** Route Handlers ********************//

function renderHomePage(req, res) {
  return res.render('admin/index');
}


function renderLoginPage(req, res) {
  return res.render('admin/login');
}


function renderCeHoursPage(req, res) {
  res.send('Admin CE hours page goes here');
}


function renderRequestsPage(req, res) {
  // Render list of approval requests, filtered by status.
  // Status filter is specified by query parameter "status"

  // Set up the approval request status filter
  var status = consts.PENDING;   // Default filter
  if (req.query.status && consts.REQUEST_STATES.includes(req.query.status)) {
    status = req.query.status;
  }
  filter = { approvalState: status };

  ApprovalRequest.find( filter, (err, data) => {
    if (err) return res.render('admin/err', { 'err': err } );

    var params = {
      statusList: consts.REQUEST_STATES,
      status: status,
      data: data
    };

    return res.render('admin/requestsByStatus', params);
  });
  // return renderGroupedApprovalRequest(req, res, 'admin/requests');
}


function renderLinkTestsPage(req, res) {
  return renderGroupedApprovalRequest(req, res, 'admin/linkTests');
}


function renderRequestDetailView(req, res) {
  ApprovalRequest.findOne( { requestHash: req.params['requestHash'] }, (err, data) => {
    if (err) return res.render('admin/err', { 'err': err } );
    if (data) {
      return res.render('admin/requestDetailView', { 'data': data});
    } else {
      // Mongoose couldn't find this approval request
      return res.render('admin/invalidHash');
    }
  });
}


function renderImpersonatePage(req, res) {
  // Get list of mentor and teacher candidate emails
  appCache.getMentorList(req, (err, data) => {
    if (err) return res.render('admin/err', {'err': err} );
      return res.render('admin/impersonateCandidate', { data: data });
  });
}

function postImpersonatePage(req, res) {
  // Store data about selected teacher candidate to the session
  var session = req.session;
  session.email = req.body.email;
  session.fullName = req.body.first_name + ' ' + req.body.last_name;
  // session.firstName = req.body.first_name;
  // session.lastName = req.body.last_name;
  return res.redirect(req.app.locals.APP_URL + 'candidate/submitHours');
}

function validateLogin(req, res) {

  // Get rid of any existing session data for this client.
  req.session.regenerate( (err) => {
    if (err) {
      return res.render('admin/err', { 'err': err } );
    }

    // console.log('validate login');
    var user = req.body.username;
    var secret = req.body.usersecret;

    if ( (user === 'devuser')
      && (secret === 'devuser')) {
        // Flag the method used to authorize the session user.
        req.session.userAuthMethod = 'admin_login';

        res.redirect(req.app.locals.APP_URL + 'admin');
      } else {
        var params = {
           err: "Invalid login",
           defaultName: user
        };
        res.render('admin/login', params);
      }
    });
}

function viewSession(req, res) {
  // Display session cache
  res.render('admin/viewSession');
}

function clearSession(req, res) {
  // Clear the session cache 
  req.session.destroy( () => {
    res.render('admin/login');
  });
}


function renderApprovalRequestsPage(req, res) {
  // Display page for creating approval requests on the Web.
  res.render('admin/createApprovalRequests');
}


function createApprovalRequests(req, res) {
  // Run script to create approval requests for needy CE Hours records
  var approvalRequestsCreator = require('../../scripts/create_approval_requests');
  approvalRequestsCreator.run(process.env.MENTOR_LIST_URL, (err, result) => {
    if (err) return res.render('admin/err', {'err': err} );
    res.render('admin/createApprovalRequests', { data: result });
  });
}


function postReloadCam(req, res) {
  // Reload the CAM data spreadsheet into the app cache
  req.app.locals.mentorList = null;   // Force a requery of the data on next request
  res.redirect(req.app.locals.APP_URL + 'admin/impersonate');
}


// ******************** Helper Functions ********************//


function renderGroupedApprovalRequest(req, res, view) {
    // Display the approval requests, grouped by approval status,
    // using a given view template.
  ApprovalRequest.find( {}, (err, data) => {
    if (err) return res.render('admin/err', { 'err': err } );

    // Create approval state filters
    function byApprovalState(approvalState) {
      return function(row) {
        return row.approvalState === approvalState; 
      }
    }

    // Display requests grouped by approval state
    var params = {
      'data': data,
      'pendingRequests':  data.filter(byApprovalState(consts.PENDING)),
      'approvedRequests': data.filter(byApprovalState(consts.APPROVED)),
      'deniedRequests':   data.filter(byApprovalState(consts.DENIED)),
      'revisedRequests':  data.filter(byApprovalState(consts.REVISED)),
      'rolledRequests':   data.filter(byApprovalState(consts.ROLLED))
    };

    return res.render(view, params);
  });
}



// ******************** Routing Configuration ********************//

router.use(require('./adminAuthMiddleware'));
router.get('/',           renderHomePage);
router.get('/login',      renderLoginPage);
router.post('/login',      validateLogin);
router.get('/cehours',    renderCeHoursPage);
router.get('/requests',   renderRequestsPage);
router.get('/linktests',  renderLinkTestsPage);
router.get('/requestDetailView/:requestHash',  renderRequestDetailView);
router.get('/impersonate',renderImpersonatePage);
router.post('/impersonate', postImpersonatePage);
router.get('/clearSession', clearSession);
router.get('/viewSession',  viewSession);
router.get('/createApprovalRequests',  renderApprovalRequestsPage);
router.post('/createApprovalRequests', createApprovalRequests);
router.post('/reloadCam',   postReloadCam);

router.get('/mailMergeApprovalRequests', mailMergeHandler.renderMailMergeApprovalRequests);
router.post('/mailMergeApprovalRequests', mailMergeHandler.postMailMergeApprovalRequests);
exports.router = router;