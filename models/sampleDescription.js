const thinky = require("../lib/thinky.js");
const type = thinky.type;

const SampleDescription = thinky.createModel("SampleDescription", {
  id: type.string(),
  requestID: type.string(),
  position: type.number(),
  sampleNumber: type.string().default("N/A"),
  sampleLabel: type.string().default("N/A"),
  sampleDescription: type.string().default("N/A"),
});

// Create index for faster lookups by requestID
SampleDescription.ensureIndex("requestID");

module.exports = SampleDescription;

const Request = require("./request");
SampleDescription.belongsTo(Request, "request", "requestID", "id");
