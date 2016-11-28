const Request = require('../models/request');
const renderError = require('../lib/renderError');
const admin = {};

admin.index = (req, res) => {

    Request
        .run()
        .then(requests => {
            var completedRequests = [];
            var incompleteRequests = [];
            var samplesFinished = [];

            requests.sort(function (a, b) {
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            requests.map(m => {
                if (m.status == 'complete') {
                    completedRequests.push(m);
                } else if (m.status = 'samples finished') {
                    samplesFinished.push(m);
                } else {
                    incompleteRequests.push(m);
                }
            });


            return res.render('admin/index', {
                completedRequests,
                samplesFinished,
                incompleteRequests,
            });
        }).catch(err => {
        return renderError(err, res);
    });
};

module.exports = admin;
