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
            projectDescription: req.body.projectDescription,
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


        //TODO create sample Files and sample descriptions

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