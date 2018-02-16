/* Controller for Mentor pages.
Mentors come here to manage their approval requests.
10.31.2017 tps
*/

const express       = require('express');
const router        = express.Router();

// const routerHelper    = require('../../scripts/routerHelper');
// const ApprovalRequest = require('../../libs/approval_request_model');
// const updater         = require('../../libs/update_helper');
// const consts          = require('../../libs/db_consts');


// ******************** Constants ********************//



// ******************** Page Handlers ********************//

function renderHomePage(req, res) {
  return res.render('mentor/index');
  // return routerHelper.render(req, res, 'mentor/index');
}


// ******************** Helper Functions ********************//


// ******************** Routing Configuration ********************//

router.get('/',   renderHomePage);

exports.router = router;