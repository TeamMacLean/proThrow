const thinky = require("../lib/thinky.js");
const type = thinky.type;
const config = require("../config.json");

const SampleImage = thinky.createModel("SampleImage", {
  id: type.string(),
  uid: type.string().required(), // the full file name including extension
  requestID: type.string(),
  name: type.string().required(),
  path: type.string().required(), // the full absolute path including full file name and extension
  description: type.string(),
});

SampleImage.define("getURL", function () {
  return config.supportingImageRootURL + this.uid;
});

SampleImage.define("getPreviewURL", function () {
  return config.supportingImagePreviewRootURL + this.uid;
});

// Create index for faster lookups by requestID
SampleImage.ensureIndex("requestID");

module.exports = SampleImage;

const Request = require("./request");
SampleImage.belongsTo(Request, "request", "requestID", "id");
