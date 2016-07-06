'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _request = require('../models/request');

var _request2 = _interopRequireDefault(_request);

var _uuid = require('../lib/uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _nodemailer = require('nodemailer');

var _nodemailer2 = _interopRequireDefault(_nodemailer);

var _nodemailerSmtpTransport = require('nodemailer-smtp-transport');

var _nodemailerSmtpTransport2 = _interopRequireDefault(_nodemailerSmtpTransport);

var _renderError = require('../lib/renderError');

var _renderError2 = _interopRequireDefault(_renderError);

var _log = require('../lib/log');

var _log2 = _interopRequireDefault(_log);

var _util = require('../lib/util');

var _util2 = _interopRequireDefault(_util);

var _sampleDescription = require('../models/sampleDescription');

var _sampleDescription2 = _interopRequireDefault(_sampleDescription);

var _sampleImage = require('../models/sampleImage');

var _sampleImage2 = _interopRequireDefault(_sampleImage);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// import moment from 'moment';


var index = {};

var transporter = _nodemailer2.default.createTransport((0, _nodemailerSmtpTransport2.default)({
    host: 'mail.nbi.ac.uk',
    port: 25
}));

function sendEmail(text) {
    transporter.sendMail({
        from: 'prothrow@tsl.ac.uk',
        to: 'martin.page@tsl.ac.uk',
        subject: 'New request (prothrow)',
        text: text + '\n\n'
    }, function (error, info) {
        if (error) {
            return (0, _renderError2.default)(err, res);
        } else {
            _log2.default.success('Message sent:', info.response);
        }
    });
}

index.index = function (req, res, next) {
    res.render('index');
};

index.new = function (req, res, next) {
    return res.render('new');
};

index.newPost = function (req, res) {

    var username = req.signedInUser.username;

    _uuid2.default.generate(6, function (uuid) {

        var request = new _request2.default({
            uuid: uuid,
            createdBy: username,
            yanCode: _util2.default.generateYanCode(req.user.firstName, req.user.lastName),
            species: req.body.species,
            secondSpecies: req.body.secondSpecies,
            tissue: req.body.tissue,
            tissueAgeNum: req.body.tissueAgeNum,
            tissueAgeType: req.body.tissueAgeType,
            growthConditions: req.body.growthConditions,
            projectDescription: req.body.projectDescription,
            hopedAnalysis: req.body.hopedAnalysis,
            bufferComposition: req.body.bufferComposition,
            analysisType: req.body.analysisType,
            secondaryAnalysisType: req.body.secondaryAnalysisType,
            typeOfPTM: req.body.typeOfPTM,
            quantitativeAnalysisRequired: req.body.quantitativeAnalysisRequired,
            typeOfLabeling: req.body.typeOfLabeling,
            labelUsed: req.body.labelUsed,
            samplePrep: req.body.samplePrep,
            digestion: req.body.digestion,
            enzyme: req.body.enzyme,
            accession: req.body.accession,
            sequenceInfo: req.body.sequenceInfo,
            dbEntry: req.body.dbEntry
        });

        request.save().then(function (doc) {

            req.body['image[]'].map(function (img, i) {
                _sampleImage2.default.filter({ uid: img }).then(function (images) {
                    images[0].description = req.body['imageDescription[]'][i];
                    images[0].requestID = request.id;
                    images[0].save().then(function (saved) {});
                }).error(function (err) {
                    console.error(err);
                });
            });

            req.body['sampleDescription[]'].map(function (sd, i) {

                var number = req.body['sampleNumber[]'][i];

                var newSD = new _sampleDescription2.default({
                    requestID: request.id,
                    position: i,
                    sampleNumber: number,
                    sampleDescription: sd
                });

                newSD.save().then(function (saved) {});
            });

            sendEmail('new job, ' + uuid);
            res.render('newPost', { uuid: doc.uuid });
        }).error(function (err) {
            return (0, _renderError2.default)(err, res);
        });
    });
};

exports.default = index;