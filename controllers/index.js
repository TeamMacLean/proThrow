const Request = require('../models/request');
const UUID = require('../lib/uuid');
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const renderError = require('../lib/renderError');
const LOG = require('../lib/log');

const index = {};

const transporter = nodemailer.createTransport(smtpTransport({
    host: 'mail.nbi.ac.uk',
    port: 25
}));


function sendEmail(text) {
    transporter.sendMail({
        from: 'prothrow@tsl.ac.uk',
        to: 'martin.page@tsl.ac.uk',
        subject: 'New request (prothrow)',
        text: `${text}\n\n`
    }, (error, info) => {
        if (error) {
            return renderError(err, res);
        } else {
            LOG.success('Message sent:', info.response);
        }
    });
}

index.index = (req, res, next) => res.render('index');

index.new = (req, res, next) => res.render('new');

index.newPost = (req, res) => {

    UUID.generate(6, uuid => {

        const request = new Request({
            uuid,
            species: req.body.species,
            secondSpecies: req.body.secondSpecies,
            // searchDatabase: req.body.searchDatabase,
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


        //TODO create sample Files and sample descriptions

        request.save().then(doc => {
            sendEmail(`new job, ${uuid}`);
            res.render('newPost', {uuid: doc.uuid});
        }).error(err => renderError(err, res));
    });
};


module.exports = index;