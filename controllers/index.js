var Request = require('../models/request');
var UUID = require('../lib/uuid');
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
const renderError = require('../lib/renderError');
const LOG = require('../lib/log');

var index = {};

var transporter = nodemailer.createTransport(smtpTransport({
    host: 'mail.nbi.ac.uk',
    port: 25
}));

index.index = function (req, res, next) {
    return res.render('index');
};

index.new = function (req, res, next) {
    return res.render('new');
};

index.newPost = function (req, res, next) {

    UUID.generate(6, function (uuid) {

        var request = new Request({
            uuid: uuid,
            species: req.body.species,
            searchDatabase: req.body.searchDatabase,
            tissue: req.body.tissue,
            tissueAgeNum: req.body.tissueAgeNum,
            tissueAgeType: req.body.tissueAgeType,
            growthConditions: req.body.growthConditions,
            samplePrep: req.body.samplePrep,
            analysisType: req.body.analysisType,
            quantitativeAnalysisRequired: req.body.quantitativeAnalysisRequired,
            typeOfLabeling: req.body.typeOfLabeling,
            labelUsed: req.body.labelUsed,
            digestion: req.body.digestion,
            typeOfPTM: req.body.typeOfPTM,
            typeOfDigestion: req.body.typeOfDigestion,
            sequenceInfo: req.body.sequenceInfo,
            preferredOrder: req.body.preferredOrder,
            sampleNumber: req.body.sampleNumber,
            sampleDescription: req.body.sampleDescription,
            supportingImages: req.body.supportingImages,
            supportingImageDescription: req.body.supportingImageDescription
        });

        request.save().then(function (doc) {
            sendEmail('new job, ' + uuid);
            res.render('newPost', {uuid: doc.uuid});
        }).error(function (err) {
            return renderError(err, res);
        });
    });
};

function sendEmail(text) {
    transporter.sendMail({
        from: 'prothrow@tsl.ac.uk',
        to: 'martin.page@tsl.ac.uk',
        subject: 'New request (prothrow)',
        text: text + '\n\n'
    }, function (error, info) {
        if (error) {
            return renderError(err, res);
        } else {
            LOG.success('Message sent:', info.response);
        }
    });
}

module.exports = index;