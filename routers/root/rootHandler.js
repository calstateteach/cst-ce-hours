/* Handler functions for root route.
12.04.2017 tps Created.
*/

function badRequest(req, res) {
  // Display page for unauthorized user
  var params = {
    requestHeaders: req.headers
  };
  res.render('root/badRequest', params);
}


//******************** Exports ********************//
exports.badRequest = badRequest;
