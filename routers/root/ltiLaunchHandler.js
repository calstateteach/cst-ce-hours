/* Route handler for LTI launch request.
11.29.2017 tps Created.
*/

var isValidRequest = require('./oAuthLibs/oauthHelper').validateLtiRequest;

function launchLti(req, res) {
  // Landing page for an LTI launch request.

  // Get rid of any existing session data for this client.
  req.session.regenerate( (err) => {
    if (err) {
      return res.render('admin/err', { 'err': err } );
    }

    // // Not sure what we'll need, so just grab everything in the
    // // signed POST request.
    // Object.assign(req.session, req.body);

    // Flag the method used to authorize the session user.
    req.session.userAuthMethod = 'lti';

    // Save some stuff to a session for the client if we can validate the request.
    if (isValidRequest('POST', process.env.CST_LTI_LAUNCH_URL, req.body)) {

      // Save just the information about the user we need to run the pages
      var session = req.session;
      session.email = req.body.custom_canvas_user_login_id;
      session.fullName = req.body.custom_person_name_full;

      // Dump authorized user in the submit hours form.
      return res.redirect(req.app.locals.APP_URL + 'candidate/submitHours');

    } else {
      res.redirect('badRequest');
    }
  });
}


//************************* Module Exports *************************
module.exports = launchLti;
