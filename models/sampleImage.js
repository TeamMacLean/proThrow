const thinky = require('../lib/thinky.js');
const type = thinky.type;

const SampleImage = thinky.createModel('SampleImage', {
    id: type.string(),
    uid: type.string().required(),
    // requestID: type.string().required(),
    name: type.string().required(),
    path: type.string().required()
});

module.exports = SampleImage;

// const Request = require('./request');
// SampleFile.belongsTo(Request, 'request', 'requestID', 'id');