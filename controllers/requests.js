const Request = require('../models/request');
const Util = require('../lib/util');
const config = require('../config');
const Email = require('../lib/email');
const SampleDescription = require('../models/sampleDescription');
const SampleImage = require('../models/sampleImage');
const Construct = require('../models/construct');

const renderError = require('../lib/renderError');

var requests = {};


requests.new = (req, res, next) => res.render('requests/new');

requests.newPost = (req, res) => {

    const username = req.user.username;
    if (req.body.requestID) {
        var requestID = req.body.requestID;
        var newJanCode = req.body.janCode;

        Request.get(requestID)
            .then((request)=> {
                request.removeChildren()
                    .then(()=> {
                        request.janCode = newJanCode;
                        request.save()
                            .then((savedRequest)=> {
                                processIt(savedRequest, false);
                            }).catch((err)=>renderError(err, res));
                    }).catch((err)=>renderError(err, res));

            }).catch((err)=>renderError(err, res));
    } else {
        Util.generateJanCode(req.user.firstName, req.user.lastName, req.user.username)
            .then(function (janCode) {
                const request = new Request({
                    createdBy: username,
                    janCode: janCode,
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
                    processIt(savedRequest, true);
                });
            })
            .catch(function (err) {
                return renderError(err, res);
            });


    }


    function processIt(savedRequest, isNew) {

        // console.log('body', req.body);

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
                    }).catch(function (err) {
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
                }).catch(function (err) {
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

                    }).catch(function (err) {
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
                    }).catch(function (err) {
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

                }).catch(function (err) {
                    console.error(err);
                })
            }
        }
        if (isNew) {
            Email.newRequest(savedRequest);
        } else {
            Email.updatedRequest(savedRequest)
        }


        return res.render('requests/newPost', {uuid: savedRequest.janCode});
    }
};

requests.show = (req, res) => {

    const requestID = req.params.id;
    Request.get(requestID)
        .getJoin({supportingImages: true, samples: true, constructs: true})
        .run()
        .then(request => {
            // console.log(requests);
            request.supportingImages = request.supportingImages || [];
            request.samples = request.samples || [];

            return res.render('requests/show', {request: request, admins: config.admins});
        }).catch((err)=> {
        return renderError(err, res);
    });
};

requests.edit = function (req, res) {
    const requestID = req.params.id;
    Request.get(requestID)
        .getJoin({supportingImages: true, samples: true, constructs: true})
        .then(function (request) {

            request.supportingImages.map(function (ri) {
                ri.url = ri.getPreviewURL();
            });

            if (request.createdBy != req.user.username && !Util.isAdmin(req.user.username)) {
                return renderError("This is not your request, you cannot edit it.", res);
            }

            if (!request.assignedTo || Util.isAdmin(req.user.username)) {
                var jsonRequest = JSON.stringify(request);
                return res.render('requests/new', {request:jsonRequest});
            } else {
                return renderError("You are not allowed to edit this as it has already been assigned for action.", res);
            }
        })
};

requests.clone = function (req, res) {
    const requestID = req.params.id;
    Request.get(requestID)
        .getJoin({supportingImages: true, samples: true, constructs: true})
        .then(function (request) {

            request.supportingImages.map(function (ri) {
                ri.url = ri.getPreviewURL();
            });

            request.isClone = true;

            var jsonRequest = JSON.stringify(request);

            return res.render('requests/new', {request:jsonRequest, isClone: true});
        }).catch((err)=> {
        return renderError(err, res);
    });
};

module.exports = requests;