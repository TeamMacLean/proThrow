const Request = require('../models/request');
const renderError = require('../lib/renderError');
const admin = {};

admin.index = (req, res) => {

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
        }).catch(err => {
            return renderError(err, res);
    });
};

//TODO delete this when sure is not needed

// admin.toggle = (req, res) => {
//     const requestUUID = req.params.uuid;
//     Request.filter({uuid: requestUUID})
//         .run()
//         .then(requests => {
//             if (requests.length) {
//                 const req = requests[0];
//                 req.complete = !req.complete;
//                 req.save();
//                 res.send('done');
//             } else {
//                 res.send('bad');
//             }
//
//         });
// };
//
// admin.addNote = (req, res) => {
//
//     const text = req.body.text;
//
//     const requestUUID = req.params.uuid;
//     Request.filter({uuid: requestUUID})
//         .run()
//         .then(requests => {
//             if (requests.length) {
//                 const req = requests[0];
//
//
//                 //if(!req.notes){
//                 //  req.notes = [];
//                 //}
//
//                 req.notes.push(text);
//
//                 req.save();
//                 res.send('done');
//             } else {
//                 res.send('bad');
//             }
//
//         });
//
//
// };
module.exports = admin;
