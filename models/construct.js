const thinky = require("../lib/thinky.js");
const type = thinky.type;

const Construct = thinky.createModel("Construct", {
  id: type.string(),
  requestID: type.string(),
  // Declared explicitly because the controller reuses construct rows by
  // position on edit; rows written before this existed default to 0 and sort
  // ahead of the rest, which is the same order they were created in.
  position: type.number().default(0),
  accession: type.string().required(),
  sequenceInfo: type.string().required(),
  dbEntry: type.string().required(),
});

// Create index for faster lookups by requestID
Construct.ensureIndex("requestID");

module.exports = Construct;

const Request = require("./request");
Construct.belongsTo(Request, "request", "requestID", "id");
