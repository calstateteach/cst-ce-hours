/* Express Router for root pages.
11.29.2017 tps Created.
*/

const express = require('express');
const router = express.Router();
const rootHandler = require('./rootHandler');

// router.get('/devlogin', rootHandlers.getDevLogin);
// router.post('/devlogin', rootHandlers.validateLogin);
router.get('/badRequest', rootHandler.badRequest);
router.post('/lti', require('./ltiLaunchHandler'));

exports.router = router;
