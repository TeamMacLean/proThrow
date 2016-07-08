const thinky = require('../lib/thinky.js');
const type = thinky.type;

const unassignedTAG = 'unassigned';

const Request = thinky.createModel('Request', {
    id: type.string(),
    uuid: type.string(),
    createdBy: type.string().required().default(unassignedTAG),
    yanCode: type.string().required().default(unassignedTAG),
    assignedTo: type.string().default(unassignedTAG),
    complete: type.boolean().default(false),
    notes: type.array().default([]).schema(type.string()),
    // notes: [type.string()]

    //Biological Materia
    species: type.string().required(),
    secondSpecies: type.string().required(),
    // searchDatabase: type.string().required(),
    tissue: type.string().required(),
    tissueAgeNum: type.string().required(),
    tissueAgeType: type.string().required(),
    growthConditions: type.string().required(),

    //Project Summary
    projectDescription: type.string().required(),
    hopedAnalysis: type.string().required(),
    bufferComposition: type.string().required(),


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

    // Sample Description
    // typeOfDigestion: type.string().required(),
    // preferredOrder: type.string().required(),
    // sampleNumber: type.string().required(),
    // sampleDescription: type.string().required(),


});

module.exports = Request;

Request.define('getStatus', function () {
    return this.complete ? 'Complete' : 'In Progress';
});

const SampleDescription = require('./sampleDescription');
const SampleImage = require('./sampleImage');
const Construct = require('./construct');
Request.hasMany(SampleDescription, 'samples', 'id', 'requestID');
Request.hasMany(SampleImage, 'supportingImages', 'id', 'requestID');
Request.hasMany(Construct, 'constructs', 'id', 'requestID');
