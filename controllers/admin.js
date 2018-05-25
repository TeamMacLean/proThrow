const Request = require('../models/request');
const renderError = require('../lib/renderError');
const admin = {};

admin.index = (req, res) => {

    Request
        .run()
        .then(requests => {
            const completedRequests = [];
            const incompleteRequests = [];

            requests.sort(function (a, b) {
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            requests.map(m => {
                if (m.status === 'complete') {
                    completedRequests.push(m);
                } else {
                    incompleteRequests.push(m);
                }
            });

            return res.render('admin/index', {
                // requests,
                completedRequests,
                incompleteRequests
            });
        }).catch(err => {
        return renderError(err, res);
    });
};

module.exports = admin;
