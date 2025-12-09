const thinky = require("../lib/thinky.js");
const type = thinky.type;

const Construct = thinky.createModel("Construct", {
  id: type.string(),
  requestID: type.string(),
  accession: type.string().required(),
  sequenceInfo: type.string().required(),
  dbEntry: type.string().required(),
});

// Create index for faster lookups by requestID
Construct.ensureIndex("requestID");

module.exports = Construct;

const Request = require("./request");
Construct.belongsTo(Request, "request", "requestID", "id");
