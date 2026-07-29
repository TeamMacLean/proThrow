const thinky = require("../lib/thinky.js");
const type = thinky.type;
const r = thinky.r;
const moment = require("moment");
const ldap = require("../lib/ldap");
const { REQUEST_STATUSES } = require("../lib/formOptions");

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
  USEDUP: "samples used up",
  DISCARDED: "discarded",
};

/** Every status the admin dropdown offers, and the only ones accepted. */
Request.allStatuses = REQUEST_STATUSES;

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

/** Usernames with a directory lookup already running, to avoid a stampede. */
const lookupsInFlight = new Set();

Request.define("getCreatedByName", function () {
  const self = this;

  function getItForNextTime() {
    // Guarded per process: this is called once per row of the admin dashboard,
    // and each call opened its own LDAP connection and bound with the service
    // credentials. One page load therefore issued N concurrent binds and N
    // database writes.
    if (lookupsInFlight.has(self.createdBy)) return;
    lookupsInFlight.add(self.createdBy);

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

        // The directory has no record of this username - someone who has left.
        // Caching the username itself stops the lookup being reissued on every
        // future admin page load, for ever.
        self.createdByName = self.createdBy;
        return r
          .table("Request")
          .get(self.id)
          .update({ createdByName: self.createdBy })
          .run();
      })
      .catch((err) => {
        return console.error(err);
      })
      .finally(() => lookupsInFlight.delete(self.createdBy));
  }

  if (self.createdByName) {
    return self.createdByName;
  } else {
    getItForNextTime();
    return self.createdBy;
  }
});

/**
 * Append a note atomically.
 *
 * `save()` writes the whole document, so two people adding a note at the same
 * time both read the same array, push one entry and write it back - and the
 * second write silently discards the first note. This pushes the append down
 * into the database instead, where it is a single atomic update.
 *
 * @param {string} id
 * @param {string} note
 * @returns {Promise<string[]>} the full note list after the append
 */
Request.appendNote = async function (id, note) {
  const result = await r
    .table("Request")
    .get(id)
    .update(
      (row) => ({
        notes: row("notes").default([]).append(note),
        updatedAt: new Date(),
      }),
      { returnChanges: true }
    )
    .run();

  if (result.errors) {
    throw new Error(result.first_error || "Could not append the note.");
  }
  if (result.skipped) {
    throw new Error("That request no longer exists.");
  }

  const changed = result.changes && result.changes[0];
  return (changed && changed.new_val && changed.new_val.notes) || [];
};

Request.define("removeChildren", async function () {
  const requestID = this.id;

  // The image rows are read before the bulk delete so their files can be
  // unlinked; a filter().delete() runs in the database and cannot clean up
  // anything on disk.
  // getAll uses the requestID index; filter() does not, so this was three full
  // table scans on every delete even though all three indexes exist.
  const images = await (
    await SampleImage.getAll(requestID, { index: "requestID" })
  ).run();
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
