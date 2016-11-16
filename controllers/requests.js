const Request = require('../models/request');
const Util = require('../lib/util');
const config = require('../config');
const Email = require('../lib/email');
const SampleDescription = require('../models/sampleDescription');
const SampleImage = require('../models/sampleImage');
const Construct = require('../models/construct');

const renderError = require('../lib/renderError');

var requests = {};

function fillFieldsFromForm(req, request) {

    request.species = req.body.species;
    request.secondSpecies = req.body.secondSpecies;
    request.tissue = req.body.tissue;
    request.tissueAgeNum = req.body.tissueAgeNum;
    request.tissueAgeType = req.body.tissueAgeType;
    request.growthConditions = req.body.growthConditions;
    request.projectDescription = req.body.projectDescription;
    request.hopedAnalysis = req.body.hopedAnalysis;
    request.bufferComposition = req.body.bufferComposition;
    request.analysisType = req.body.analysisType;
    request.secondaryAnalysisType = req.body.secondaryAnalysisType;
    request.typeOfPTM = req.body.typeOfPTM;
    request.quantitativeAnalysisRequired = req.body.quantitativeAnalysisRequired;
    request.typeOfLabeling = req.body.typeOfLabeling;
    request.labelUsed = req.body.labelUsed;
    request.samplePrep = req.body.samplePrep;
    request.digestion = req.body.digestion;
    request.enzyme = req.body.enzyme;

    return request;
}

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
                        request = fillFieldsFromForm(req, request);//TODO tidy this up
                        request.save()
                            .then((savedRequest)=> {
                                processIt(savedRequest, false);
                            }).catch((err)=>renderError(err, res));
                    }).catch((err)=>renderError(err, res));

            }).catch((err)=>renderError(err, res));
    } else {
        Util.generateJanCode(req.user.firstName, req.user.lastName, req.user.username)
            .then((janCode) => {
                var request = new Request({
                    createdBy: username,
                    janCode: janCode
                });
                request = fillFieldsFromForm(req, request); //TODO tidy this up

                request.save().then(savedRequest => {
                    processIt(savedRequest, true);
                });
            })
            .catch((err)=> {
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
        var bodySampleLabels = req.body['sampleLabel[]'];

        //Construct
        var bodyConstructAccession = req.body['accession[]'];
        var bodyConstructSequenceInfo = req.body['sequenceInfo[]'];
        var bodyConstructDBEntry = req.body['dbEntry[]'];

        if (bodyConstructAccession) {
            if (Array.isArray(bodyConstructAccession)) {
                bodyConstructAccession.map((accession, i)=> {
                    // console.log('accession', accession);
                    var c = new Construct({
                        requestID: savedRequest.id,
                        accession: accession,
                        sequenceInfo: bodyConstructSequenceInfo[i],
                        dbEntry: bodyConstructDBEntry[i]
                    });
                    c.save().then(()=> {
                    }).catch((err) => {
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
                c.save().then(()=> {
                }).catch((err) => {
                    console.error(err);
                })
            }
        }


        if (bodyImages) {
            if (Array.isArray(bodyImages)) {
                bodyImages.map((img, i)=> {
                    SampleImage.filter({uid: img}).then((images) => {
                        if (images) {
                            images[0].description = bodyImageDescriptions[i];
                            images[0].requestID = savedRequest.id;
                            images[0].save().then((saved) => {
                            });
                        }

                    }).catch((err)=> {
                        console.error(err);
                    });
                });
            } else {
                SampleImage.filter({uid: bodyImages}).then((images)=> {
                    if (images) {
                        images[0].description = bodyImageDescriptions;
                        images[0].requestID = savedRequest.id;
                        images[0].save().then((saved) => {
                        });
                    }
                });
            }
        }


        if (bodySampleNumbers) {
            if (Array.isArray(bodySampleNumbers)) {
                bodySampleNumbers.map((num, i) => {
                    var nsd = new SampleDescription({
                        requestID: savedRequest.id,
                        position: i,
                        sampleNumber: num,
                        sampleLabels: bodySampleLabels[i],
                        sampleDescription: bodySampleDescriptions[i]
                    });
                    nsd.save().then(() => {
                    }).catch((err) => {
                        console.error(err);
                    })

                });
            } else {
                var nsd = new SampleDescription({
                    requestID: savedRequest.id,
                    position: 0,
                    sampleNumber: bodySampleNumbers,
                    sampleLabels: bodySampleLabels,
                    sampleDescription: bodySampleDescriptions
                });
                nsd.save().then(() => {

                }).catch((err) => {
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

requests.edit = (req, res)=> {
    const requestID = req.params.id;
    Request.get(requestID)
        .getJoin({supportingImages: true, samples: true, constructs: true})
        .then((request)=> {

            request.supportingImages.map((ri) => {
                ri.url = ri.getPreviewURL();
            });

            if (request.createdBy != req.user.username && !Util.isAdmin(req.user.username)) {
                return renderError("This is not your request, you cannot edit it.", res);
            }

            if (!request.assignedTo || Util.isAdmin(req.user.username)) {
                return res.render('requests/new', {request});
            } else {
                return renderError("You are not allowed to edit this as it has already been assigned for action.", res);
            }
        })
};

requests.clone = (req, res) => {
    const requestID = req.params.id;
    Request.get(requestID)
        .getJoin({supportingImages: true, samples: true, constructs: true})
        .then((request) => {

            request.supportingImages.map((ri)=> {
                ri.url = ri.getPreviewURL();
            });

            request.isClone = true;
            return res.render('requests/new', {request, isClone: true});
        }).catch((err)=> {
        return renderError(err, res);
    });
};

module.exports = requests;