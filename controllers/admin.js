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

module.exports = admin;
