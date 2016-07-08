const Request = require('../models/request');
const UUID = require('../lib/uuid');
const Util = require('../lib/util');
const config = require('../config');
const SampleDescription = require('../models/sampleDescription');
const SampleImage = require('../models/sampleImage');
const Construct = require('../models/construct');
const nodeMailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const renderError = require('../lib/renderError');

var requests = {};

const transporter = nodeMailer.createTransport(smtpTransport({
    host: config.mailServer,
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
            console.log('Message sent:', info.response);
        }
    });
}

requests.new = (req, res, next) => res.render('new');

requests.newPost = (req, res) => {

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
            enzyme: req.body.enzyme
        });


        request.save().then(savedRequest => {

            console.log('body', req.body);

            //Image
            var bodyImages = req.body['image[]'];
            var bodyImageDescriptions = req.body['imageDescription[]'];

            //Sample
            var bodySampleNumbers = req.body['sampleNumber[]'];
            var bodySampleDescriptions = req.body['sampleDescription[]'];

            //Construct
            var bodyConstructAccession = req.body['accession[]'];
            var bodyConstructSequenceInfo = req.body['sequenceInfo[]'];
            var bodyConstructDBEntry = req.body['dbEntry[]'];

            if (bodyConstructAccession) {
                if (Array.isArray(bodyConstructAccession)) {
                    bodyConstructAccession.map(function (accession, i) {
                        // console.log('accession', accession);
                        var c = new Construct({
                            requestID: savedRequest.id,
                            accession: accession,
                            sequenceInfo: bodyConstructSequenceInfo[i],
                            dbEntry: bodyConstructDBEntry[i]
                        });
                        c.save().then(function () {
                        }).error(function (err) {
                            console.error(err);
                        })
                    });
                } else {
                    var c = new Construct({
                        requestID: savedRequest.id,
                        accession: bodyConstructAccession,
                        sequenceInfo: bodyConstructSequenceInfo,
                        dbEntry: bodyConstructDBEntry
                    });
                    c.save().then(function () {
                    }).error(function (err) {
                        console.error(err);
                    })
                }
            }


            if (bodyImages) {
                if (Array.isArray(bodyImages)) {
                    bodyImages.map(function (img, i) {
                        SampleImage.filter({uid: img}).then(function (images) {
                            if (images) {
                                images[0].description = bodyImageDescriptions[i];
                                images[0].requestID = savedRequest.id;
                                images[0].save().then(function (saved) {
                                });
                            }

                        }).error(function (err) {
                            console.error(err);
                        });
                    });
                } else {
                    SampleImage.filter({uid: bodyImages}).then(function (images) {
                        if (images) {
                            images[0].description = bodyImageDescriptions;
                            images[0].requestID = savedRequest.id;
                            images[0].save().then(function (saved) {
                            });
                        }
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
                        position: 0,
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
            return res.render('newPost', {uuid: savedRequest.yanCode});
        });
    });
};

requests.show = (req, res) => {

    const requestUUID = req.params.uuid;
    Request.filter({uuid: requestUUID})
        .getJoin({supportingImages: true, samples: true, constructs:true})
        .run()
        .then(requests => {
            console.log(requests);
            if (requests.length) {

                const request = requests[0];
                request.supportingImages = request.supportingImages || [];
                request.samples = request.samples || [];

                return res.render('admin/show', {request: request});
            } else {
                return res.render('error', {error: `could not find ${requestUUID}`});
            }
        });
};

requests.edit = function (req, res) {
    const uuid = req.params.uuid;
    Request.filter({uuid: uuid})
        .getJoin({supportingImages: true, samples: true, constructs:true})
        .then(function (requests) {

            requests.map(function (rr) {
                rr.supportingImages.map(function (ri) {
                    ri.url = ri.getPreviewURL();
                });
            });

            const r = requests[0];
            console.log(r.supportingImages.length);
            console.log(r.samples.length);
            return res.render('new', {request: r});
        })
};

module.exports = requests;