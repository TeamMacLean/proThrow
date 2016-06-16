const thinky = require('../lib/thinky.js');
const type = thinky.type;

const Request = thinky.createModel("Request", {
    id: type.string(),
    uuid: type.string(),
    complete: type.boolean().default(false),
    notes: type.array().default([]).schema(type.string()),
    // notes: [type.string()]

    //Biological Materia
    species: type.string().required(),
    searchDatabase: type.string().required(),
    tissue: type.string().required(),
    tissueAgeNum: type.string().required(),
    tissueAgeType: type.string().required(),
    growthConditions: type.string().required(),

    //Project Summary
    projectDescription: type.string().required(),
    bufferComposition: type.string().required(),
    //TODO images // supportingImages: type.string().required(),
    //TODO image description // supportingImageDescription: type.string().required(),


    // Primary Analysis
    analysisType: type.string().required(),
    secondaryAnalysisType: type.string().required(),
    typeOfPTM: type.string().required(),
    quantitativeAnalysisRequired: type.string().required(),
    typeOfLabeling: type.string().required(),
    labelUsed: type.string().required(),

    // Sample Preparation
    samplePrep: type.string().required(),
    digestion: type.string().required(),
    enzyme: type.string().required(),


    // New Construct for Database
    accession: type.string().required(),
    sequenceInfo: type.string().required(),
    dbEntry: type.string().required(),

    // Sample Description
    // typeOfDigestion: type.string().required(),
    // preferredOrder: type.string().required(),
    // sampleNumber: type.string().required(),
    // sampleDescription: type.string().required(),


});

module.exports = Request;


const SampleDescription = require('./sampleDescription');
Request.hasMany(SampleDescription, "samplesDescriptions", "id", "requestID");