const thinky = require("../lib/thinky.js");
const type = thinky.type;
const r = thinky.r;
const moment = require("moment");
const ldap = require("../lib/ldap");

const Request = thinky.createModel("Request", {
  id: type.string(),
  uuid: type.string(),
  linkID: type.string().default(null),
  createdBy: type.string().required(),
  createdByName: type.string(),
  janCode: type.string().required(),
  assignedTo: type.string(),
  assignedToName: type.string(),
  status: type.string().default("incomplete"),
  createdAt: type.date().default(r.now()),
  updatedAt: type.date(),
  notes: type.array().default([]).schema(type.string()),

  // Biological Material
  species: type.string().required(),
  // Optional by design: most submissions involve a single species, so this is
  // stored as an empty string rather than being required.
  secondSpecies: type.string().default(""),
  // NCBI taxonomy IDs backing the species names, when the lookup resolved one.
  speciesTaxId: type.string().default(""),
  secondSpeciesTaxId: type.string().default(""),
  tissue: type.string().required(),
  tissueAgeNum: type.string().required(),
  tissueAgeType: type.string().required(),
  growthConditions: type.string().required(),

  // Project Summary
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
});

// Index for faster lookups by createdBy (used in user's requests page)
Request.ensureIndex("createdBy");
// Index for sorting by creation date
Request.ensureIndex("createdAt");

Request.statuses = {
  COMPLETE: "complete",
  INCOMPLETE: "incomplete",
  USEDUP: "used up",
  DISCARDED: "discarded",
};

Request.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = Request;

Request.define("getStatus", function () {
  return this.complete ? "Complete" : "In Progress";
});

Request.define("humanDate", function () {
  return moment(this.createdAt).format("YYYY/MM/DD");
});

Request.define("modifiedHumanDate", function () {
  return moment(this.updatedAt).format("YYYY/MM/DD");
});

Request.define("getAssignedToName", function () {
  if (this.assignedToName) {
    return this.assignedToName;
  } else {
    return this.assignedTo;
  }
});

Request.define("getCreatedByName", function () {
  const self = this;

  function getItForNextTime() {
    ldap
      .getNameFromUsername(self.createdBy)
      .then((users) => {
        if (users.length >= 1) {
          const user = users[0];
          self.createdByName = user.name;
          // Written with a raw update rather than save(): save() runs the
          // pre-save hook, which bumps updatedAt. Caching a display name is not
          // a content change, and treating it as one made the request look
          // freshly modified in the admin table and - worse - tripped the edit
          // form's concurrency check, 409-ing users who had changed nothing.
          return r
            .table("Request")
            .get(self.id)
            .update({ createdByName: user.name })
            .run();
        }
      })
      .catch((err) => {
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

Request.define("removeChildren", async function () {
  const requestID = this.id;

  // The image rows are read before the bulk delete so their files can be
  // unlinked; a filter().delete() runs in the database and cannot clean up
  // anything on disk.
  const images = await SampleImage.filter({ requestID: requestID }).run();
  await SampleImage.removeFilesFor(images);

  return Promise.all([
    Construct.filter({ requestID: requestID }).delete().execute(),
    SampleDescription.filter({ requestID: requestID }).delete().execute(),
    SampleImage.filter({ requestID: requestID }).delete().execute(),
  ]);
});

const SampleDescription = require("./sampleDescription");
const SampleImage = require("./sampleImage");
const Construct = require("./construct");

Request.hasMany(SampleDescription, "samples", "id", "requestID");
Request.hasMany(SampleImage, "supportingImages", "id", "requestID");
Request.hasMany(Construct, "constructs", "id", "requestID");

// Index for linked requests lookup
Request.ensureIndex("linkID");
Request.hasAndBelongsToMany(Request, "linkedRequests", "linkID", "linkID");
