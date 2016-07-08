const thinky = require('../lib/thinky.js');
const type = thinky.type;
const config = require('../config.js');
const Construct = thinky.createModel('Construct', {
    id: type.string(),
    requestID: type.string(),
    accession: type.string().required(),
    sequenceInfo: type.string().required(),
    dbEntry: type.string().required()
    // uid: type.string().required(),
    // requestID: type.string(),
    // name: type.string().required(),
    // path: type.string().required(),
    // description: type.string()
});


// SampleImage.define('getURL', function () {
//     return config.supportingImageRootURL + this.uid;
// });
// SampleImage.define('getPreviewURL', function () {
//     return config.supportingImagePreviewRootURL + this.uid;
// });
module.exports = Construct;

const Request = require('./request');
Construct.belongsTo(Request, 'request', 'requestID', 'id');
