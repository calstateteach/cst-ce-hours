/* Middleware for admin router that makes sure user has logged in.
11.18.2017 tps Created.
12.04.2017 tps The first time the admin tries to login the first the app is brought up,
               the admin has to login twice. This is a sync issue with the session store,
               which doesn't record the authorization the first time through in time for the 
               next time the authorization is checked. Might have fixed this by explicitly
               regenerating the session when use submits credentials in adminRouter::validateLogin()?
*/

function checkAuthorization(req, res, next) {
  // console.log('check authorization', req.session.userAuthMethod);
  // console.log('req path', req.path);
  
  // Continue on if user is trying to sign in
  if (req.path === '/login') return next();

  // Continue on if user is already authorized
  if (req.session.userAuthMethod === 'admin_login') return next();

  // Try to make unauthorized user sign in
  return res.redirect(res.app.locals.APP_URL + 'admin/login');
}

module.exports = checkAuthorization;
