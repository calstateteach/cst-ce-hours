/* Starting stub Web app that approves logged hours online.
10.12.2017 tps 
*/

require('dotenv').config(); // Use environment variables for configurable items.
const express = require('express');
const app = express();
const bodyParser = require('body-parser')
const session = require('express-session');
const db = require('./libs/db_access');
const MongoStore = require('connect-mongo')(session);

//******************** Constants********************//
const LISTEN_PORT = process.env.LISTEN_PORT;


//******************** Configure Web app ********************//
app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'));


//******************** Configure Web app session management ********************//
var sessionOptions = {
  name: 'SecretSquirrel.net.cehours.sid',
  secret: process.env.SESSION_COOKIE_SECRET,
  saveUninitialized: false,
  resave: false,
  cookie: {
    httpOnly: true,
    secure: 'auto'
  },
  store: new MongoStore({
   url: process.env.SESSION_DB,
   ttl: 24 * 60 * 60  // Sessions expire in 24 hours
 })
};
app.use(session(sessionOptions));


//******************** Configure Session Access for View Templates ********************//
app.use(function(req,res,next){
    res.locals.session = req.session;
    next();
});


//******************** Configure App Global variables ********************//

app.locals.APP_URL = process.env.APP_URL;
  // URL location of Web app. Use to build URL links when app is
  // running under a reverse proxy server.
  // e.g. "https://SecretSquirrel.net/cehours/"


//******************** Configure Routes ********************//
app.use('/',          require('./routers/root/rootRouter').router);
app.use('/admin',     require('./routers/admin/adminRouter').router);
app.use('/links',     require('./routers/links/linksRouter').router);
app.use('/candidate', require('./routers/candidate/candidateRouter').router);
// app.use('/mentor',    require('./routers/mentor/mentorRouter').router);


//******************** Start the Web app after making DB connetion ********************//

function startWebApp() {
  app.listen(LISTEN_PORT, function() {
    console.log('listening on ', LISTEN_PORT);
  });
}

db.connect(startWebApp);
 
