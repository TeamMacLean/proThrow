const thinky = require('../lib/thinky.js');
const type = thinky.type;
const config = require('../config.js');
const SampleImage = thinky.createModel('SampleImage', {
    id: type.string(),
    uid: type.string().required(),
    requestID: type.string(),
    name: type.string().required(),
    path: type.string().required(),
    description: type.string()
});


SampleImage.define('getURL', function () {
    return config.supportingImageRootURL + this.uid;
});
SampleImage.define('getPreviewURL', function () {
    return config.supportingImagePreviewRootURL + this.uid;
});
module.exports = SampleImage;

const Request = require('./request');
SampleImage.belongsTo(Request, 'request', 'requestID', 'id');
