/* Router middleware that makes sure user has logged in 
either through LTI or as an admin.
12.04.2017 tps Created.
*/

function checkUser(req, res, next) {
  var userAuthMethod = req.session.userAuthMethod;
  if (userAuthMethod && ['admin_login', 'lti'].includes(userAuthMethod)) {
    next();
  } else {
    return res.redirect(req.app.locals.APP_URL + 'badRequest');
  }
}

module.exports = checkUser;
