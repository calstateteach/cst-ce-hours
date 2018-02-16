/* Handler for mail merge pages.
01.25.2018 tps Created.
*/

const ApprovalRequest   = require('../../libs/approval_request_model');
const consts            = require('../../libs/db_consts');
const mergeHelper       = require('../../libs/mail_merge_helper');


// ******************** Request Handler Functions ********************//

function renderMailMergeApprovalRequests(req, res) {
  
  // We're interested in pending approval requests with no emails sent yet.
  const filter = {
    approvalState: consts.PENDING,
    requestEmailTimestamp: null
  };
  ApprovalRequest.find( filter, (err, data) => {
    if (err) return res.render('admin/err', { 'err': err } );
    var params = {
      'data': data,
    };
    return res.render('admin/mailMergeApprovalRequests', params);
  });
}

function postMailMergeApprovalRequests(req, res) {
  // We're interested in pending approval requests with no emails sent yet.
  const filter = {
    approvalState: consts.PENDING,
    requestEmailTimestamp: null
  };
  ApprovalRequest.find( filter, (err, data) => {
    if (err) return res.render('admin/err', { 'err': err } );
    return step_merge(req, res, data);
  });
}


// ******************** Helper Functions ********************//


function step_merge(req, res, data) {
  mergeHelper.merge(data, (err, mergedApprovalRequests) => {
    if (err) return res.render('admin/err', { 'err': err } );

    // todo: save the results
    return step_render(req, res, mergedApprovalRequests);
  });
}


function step_render(req, res, data) {
  var params = {
    'data': data,
  };
  return res.render('admin/mailMergeApprovalRequests', params);
}


// ******************** Module Exports ********************//
exports.renderMailMergeApprovalRequests = renderMailMergeApprovalRequests;
exports.postMailMergeApprovalRequests = postMailMergeApprovalRequests;
