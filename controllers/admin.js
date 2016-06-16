const Request = require('../models/request');
const admin = {};

admin.index = (req, res, next) => {

  Request
    .run()
    .then(requests => {
      const completedRequests = [];
      const incompleteRequests = [];
      requests.map(m => {
        if (m.complete) {
          completedRequests.push(m);
        } else {
          incompleteRequests.push(m);
        }
      });

      return res.render('admin/index', {
        completedRequests,
        incompleteRequests
      });
    });
};

admin.show = (req, res, next) => {

  const requestUUID = req.params.uuid;
  Request.filter({uuid: requestUUID})
    .run()
    .then(requests => {
      if (requests.length) {
        res.render('admin/show', {request: requests[0]});
      } else {
        res.render('error', {error: `could not find ${requestUUID}`});
      }
    });
};

admin.toggle = (req, res, next) => {
  const requestUUID = req.params.uuid;
  Request.filter({uuid: requestUUID})
    .run()
    .then(requests => {
      if (requests.length) {
        const req = requests[0];
        req.complete = !req.complete;
        req.save();
        res.send('done');
      } else {
        res.send('bad');
      }

    });
};

admin.addNote = (req, res, next) => {

  const text = req.body.text;

  const requestUUID = req.params.uuid;
  Request.filter({uuid: requestUUID})
    .run()
    .then(requests => {
      if (requests.length) {
        const req = requests[0];


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