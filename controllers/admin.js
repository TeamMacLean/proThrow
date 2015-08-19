var Request = require('../models/request');

var admin = {};

admin.index = function (req, res, next) {

  Request
    .run()
    .then(function (requests) {
      var completedRequests = [];
      var incompleteRequests = [];
      requests.map(function (m) {
        if (m.complete) {
          completedRequests.push(m);
        } else {
          incompleteRequests.push(m);
        }
      });

      return res.render('admin/index', {
        completedRequests: completedRequests,
        incompleteRequests: incompleteRequests
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
};

admin.addNote = function (req, res, next) {

  var text = req.body.text;

  var requestUUID = req.params.uuid;
  Request.filter({uuid: requestUUID})
    .run()
    .then(function (requests) {
      if (requests.length) {
        var req = requests[0];


        //if(!req.notes){
        //  req.notes = [];
        //}

        req.notes.push(text);

        req.save();
        res.send('done');
      } else {
        res.send('bad');
      }

    });


};

module.exports = admin;