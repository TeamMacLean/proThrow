const thinky = require('../lib/thinky.js');
const type = thinky.type;
const r = thinky.r;
const moment = require('moment');
const ldap = require('../lib/ldap');

//

// z

const Request = thinky.createModel('Request', {
    id: type.string(),
    uuid: type.string(),
    createdBy: type.string().required(),
    createdByName: type.string(),
    janCode: type.string().required(),
    assignedTo: type.string(),
    assignedToName: type.string(),
    // complete: type.boolean().default(false),
    status: type.string().default('incomplete'),
    createdAt: type.date().default(r.now()),
    updatedAt: type.date(),
    notes: type.array().default([]).schema(type.string()),

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

Request.statuses = {
    COMPLETE: 'complete', INCOMPLETE: 'incomplete', USEDUP: 'used up', DISCARDED: 'discarded'
};


Request.pre('save', function (next) {
    this.updatedAt = new Date();

    next();

    // //todo udate ldap stuff
    // updateAssignedToFromLdap()
    //     .then(() => {
    //         next();
    //     })
    //     .catch(err => {
    //         console.error(err);
    //         next();
    //     })


});


module.exports = Request;

Request.define('getStatus', function () {
    return this.complete ? 'Complete' : 'In Progress';
});

Request.define('humanDate', function () {
    return moment(this.createdAt).format("YYYY/MM/DD");
});
Request.define('modifiedHumanDate', function () {
    return moment(this.updatedAt).format("YYYY/MM/DD");
});

Request.define('getAssignedToName', function () {
    const self = this;

    if (self.assignedToName) {
        return self.assignedToName;
    } else {
        return self.assignedTo;
    }
});

Request.define('getCreatedByName', function () {
    const self = this;

    function getItForNextTime() {
        ldap.getNameFromUsername(self.createdBy)
            .then((users) => {
                if (users.length >= 1) {
                    const user = users[0];
                    self.createdByName = user.name;
                    self.save();
                }
            })
            .catch(err => {
                return console.error(err);
            });
    }

    if (self.createdByName) {
        return self.createdByName;
    } else {
        getItForNextTime();
        return self.createdBy;
    }
});

Request.define('removeChildren', function () {

    const requestID = this.id;

    return Promise.all([
        Construct.filter({requestID: requestID}).delete().execute(),
        SampleDescription.filter({requestID: requestID}).delete().execute(),
        SampleImage.filter({requestID: requestID}).delete().execute()
    ]);
    //

    // function deleteConstructs() {
    //     return new Promise(function (good, bad) {
    //         Construct.filter({requestID: requestID})
    //             .then(function (constructs) {
    //                 return Promise.all(constructs.map(function (construct) {
    //                     construct.delete();
    //                 }))
    //             })
    //             .then(good)
    //             .catch(bad)
    //     })
    //
    // }
    //
    // function deleteSampleDescriptions() {
    //     return new Promise(function (good, bad) {
    //         SampleDescription.filter({requestID: requestID})
    //             .then(function (sampleDescriptions) {
    //                 return Promise.all(sampleDescriptions.map(function (sampleDescription) {
    //                     sampleDescription.delete();
    //                 }))
    //             })
    //             .then(good)
    //             .catch(bad)
    //     })
    // }
    //
    // return Promise.all([deleteConstructs(), deleteSampleDescriptions()]);

    //
    //
    //     SampleDescription.filter({requestID: requestID})
    //         .then(function (sampleDescriptions) {
    //             return Promise.all(sampleDescriptions.map(function (sampleDescription) {
    //                 sampleDescription.delete();
    //             }))
    //         })
    // });

    // SampleImage.filter({requestID: requestID})
    //     .then(sis=> {
    //         return Promise.all(sis.map(function (si) {
    //             si.delete();
    //         }))
    //     });

});

const SampleDescription = require('./sampleDescription');
const SampleImage = require('./sampleImage');
const Construct = require('./construct');
Request.hasMany(SampleDescription, 'samples', 'id', 'requestID');
Request.hasMany(SampleImage, 'supportingImages', 'id', 'requestID');
Request.hasMany(Construct, 'constructs', 'id', 'requestID');
