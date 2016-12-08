const Request = require('../models/request');
const renderError = require('../lib/renderError');
const admin = {};

admin.index = (req, res) => {

    Request
        .run()
        .then(requests => {
            var completedRequests = [];
            var incompleteRequests = [];
            var usedUp = [];
            var discarded = [];

            requests.sort(function (a, b) {
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            requests.map(m => {
                if (m.status == 'complete') {
                    completedRequests.push(m);
                } else if (m.status == 'used up') {
                    usedUp.push(m);
                } else if (m.status == 'discarded') {
                    discarded.push(m);
                } else {
                    incompleteRequests.push(m);
                }
            });

            return res.render('admin/index', {
                completedRequests,
                usedUp,
                discarded,
                incompleteRequests,
            });
        }).catch(err => {
        return renderError(err, res);
    });
};

module.exports = admin;
