const thinky = require('../lib/thinky.js');
const type = thinky.type;

const SampleDescription = thinky.createModel('SampleDescription', {
    id: type.string(),
    requestID: type.string(),
    position: type.number().required(),
    sampleNumber: type.string().required(),
    sampleDescription: type.string().required()
});

module.exports = SampleDescription;

const Request = require('./request');
SampleDescription.belongsTo(Request, 'request', 'requestID', 'id');

