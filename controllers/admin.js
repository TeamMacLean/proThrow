var Request = require('../models/request');

var admin = {};

admin.index = function (req, res, next) {

  Request.filter({complete: false})
    .run()
    .then(function (incompleteRequests) {
      Request.filter({complete: true})
        .run()
        .then(function (completedRequests) {
          return res.render('admin/index', {
            completedRequests: completedRequests,
            incompleteRequests: incompleteRequests
          });
        });
    });
};

admin.show = function (req, res, next) {

  var requestUUID = req.params.uuid;
  Request.filter({uuid: requestUUID})
    .run()
    .then(function (requests) {
      if (requests.length) {
        res.render('admin/show', {request: requests[0]});
      } else {
        res.render('error', {error: 'could not find ' + requestUUID});
      }
    });
};

admin.toggle = function (req, res, next) {
  var requestUUID = req.params.uuid;
  Request.filter({uuid: requestUUID})
    .run()
    .then(function (requests) {
      if (requests.length) {
        var req = requests[0];
        req.complete = !req.complete;
        req.save();
        res.send('done');
      } else {
        res.send('bad');
      }

    });
}

module.exports = admin;