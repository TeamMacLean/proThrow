'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _request = require('../models/request');

var _request2 = _interopRequireDefault(_request);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var admin = {};

admin.index = function (req, res, next) {

    _request2.default.run().then(function (requests) {
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
    }).error(function (err) {
        next(err);
    });
};

admin.show = function (req, res, next) {

    var requestUUID = req.params.uuid;
    _request2.default.filter({ uuid: requestUUID }).getJoin({ samplesImages: true, samplesDescriptions: true }).run().then(function (requests) {
        if (requests.length) {
            res.render('admin/show', { request: requests[0] });
        } else {
            res.render('error', { error: 'could not find ' + requestUUID });
        }
    });
};

admin.toggle = function (req, res, next) {
    var requestUUID = req.params.uuid;
    _request2.default.filter({ uuid: requestUUID }).run().then(function (requests) {
        if (requests.length) {
            var _req = requests[0];
            _req.complete = !_req.complete;
            _req.save();
            res.send('done');
        } else {
            res.send('bad');
        }
    });
};

admin.addNote = function (req, res, next) {

    var text = req.body.text;

    var requestUUID = req.params.uuid;
    _request2.default.filter({ uuid: requestUUID }).run().then(function (requests) {
        if (requests.length) {
            var _req2 = requests[0];

            //if(!req.notes){
            //  req.notes = [];
            //}

            _req2.notes.push(text);

            _req2.save();
            res.send('done');
        } else {
            res.send('bad');
        }
    });
};

exports.default = admin;