const Request = require('../models/request');
const UUID = require('../lib/uuid');
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const renderError = require('../lib/renderError');
const LOG = require('../lib/log');
const Util = require('../lib/util');
// const moment = require('moment';
const SampleDescription = require('../models/sampleDescription');
const SampleImage = require('../models/sampleImage');

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

index.index = (req, res, next) => {
    res.render('index');
};

index.new = (req, res, next) => res.render('new');

index.newPost = (req, res) => {

    const username = req.user.username;

    UUID.generate(6, uuid => {

        const request = new Request({
            uuid,
            createdBy: username,
            yanCode: Util.generateYanCode(req.user.firstName, req.user.lastName),
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


        request.save().then(savedRequest => {

            console.log(req.body);

            var bodyImages = req.body['image[]'];
            var bodyImageDescriptions = req.body['imageDescription[]'];
            var bodySampleNumbers = req.body['sampleNumber[]'];
            var bodySampleDescriptions = req.body['sampleDescription[]'];


            if (bodyImages) {
                if (Array.isArray(bodyImages)) {
                    bodyImages.map(function (img, i) {
                        SampleImage.filter({uid: img}).then(function (images) {
                            images[0].description = bodyImageDescriptions[i];
                            images[0].requestID = savedRequest.id;
                            images[0].save().then(function (saved) {
                            });
                        }).error(function (err) {
                            console.error(err);
                        });
                    });
                } else {
                    SampleImage.filter({uid: bodyImages}).then(function (images) {
                        images[0].description = bodyImageDescriptions;
                        images[0].requestID = savedRequest.id;
                        images[0].save().then(function (saved) {
                        });
                    });
                }
            }


            if (bodySampleNumbers) {
                if (Array.isArray(bodySampleNumbers)) {
                    bodySampleNumbers.map(function (num, i) {
                        var nsd = new SampleDescription({
                            requestID: savedRequest.id,
                            position: i,
                            sampleNumber: num,
                            sampleDescription: bodySampleDescriptions[i]
                        });
                        nsd.save().then(function () {
                        }).error(function (err) {
                            console.error(err);
                        })

                    });
                } else {
                    var nsd = new SampleDescription({
                        requestID: savedRequest.id,
                        position: i,
                        sampleNumber: bodySampleNumbers,
                        sampleDescription: bodySampleDescriptions
                    });
                    nsd.save().then(function () {

                    }).error(function (err) {
                        console.error(err);
                    })
                }
            }
            sendEmail(`new job, ${uuid}`);
            res.render('newPost', {uuid: savedRequest.yanCode});
        });
    });
};

module.exports = index;
