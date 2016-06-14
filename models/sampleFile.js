const thinky = require('../lib/thinky.js');
const type = thinky.type;

let SampleFile = thinky.createModel("SampleFile", {
    id: type.string(),
    requestID: type.string(),
    path: type.string()
});

module.exports = SampleFile;

const Request = require('./request');
SampleFile.belongsTo(Request, "request", "requestID", "id");
