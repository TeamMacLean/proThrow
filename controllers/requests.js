const Request = require("../models/request");
const Util = require("../lib/util");
const config = require("../config.json");
const Email = require("../lib/email");
const SampleDescription = require("../models/sampleDescription");
const SampleImage = require("../models/sampleImage");
const Construct = require("../models/construct");
const { FIELD_MAX_LENGTHS } = require("../lib/formOptions");
const {
  firstScalar,
  toStringArray,
  toObjectArray,
  validateRequestFields,
  validateJanCode,
  validateConstructArrays,
  validateSampleArrays,
} = require("../lib/validation");

/** Maximum number of notes accepted on a single request. */
const MAX_NOTES = 100;

/**
 * Interpret a multipart form value as a boolean.
 *
 * Checkboxes and hidden flags arrive as the strings "true"/"1"/"on", or are
 * absent entirely when unchecked.
 *
 * @param {*} value
 * @returns {boolean}
 */
function isTruthyFlag(value) {
  const scalar = firstScalar(value).toLowerCase();
  return scalar === "true" || scalar === "1" || scalar === "on";
}

/**
 * Converts notes from form data into a clean array of strings.
 *
 * Notes arrive as indexed fields (notes[0], notes[1]) which multer's
 * append-field turns into an array, but a crafted payload can nest objects
 * under those keys instead, so entries that are not strings are discarded
 * rather than being allowed to reach `.trim()`.
 *
 * @param {Array|Object} notes - Notes as array or object from form data
 * @returns {Array<string>} Clean array of non-empty note strings
 */
function normalizeNotes(notes) {
  const notesArray = Array.isArray(notes) ? notes : Object.values(notes || {});
  return notesArray
    .filter((note) => typeof note === "string" && note.trim())
    .map((note) => note.slice(0, FIELD_MAX_LENGTHS.note))
    .slice(0, MAX_NOTES);
}

/**
 * Processes sample description data for a given request.
 *
 * @param {object} sampleData - Arrays of sampleNumbers, sampleLabels, sampleDescriptions.
 * @param {string} requestId - The ID of the request these samples belong to.
 * @param {Array} existingSamples - Existing SampleDescription entities for the request.
 * @param {boolean} allowDeletions - Whether samples absent from the payload may be deleted.
 * @returns {Promise<string[]>} Messages describing any rows that could not be written.
 */
async function processSampleDescription(
  sampleData,
  requestId,
  existingSamples = [],
  allowDeletions = false
) {
  const { sampleNumbers, sampleLabels, sampleDescriptions } = sampleData;
  const errors = [];
  const idsToDelete = new Set(existingSamples.map((s) => s.id));

  // Rows are reused by position, not by matching on the sample number. Matching
  // on the number meant two samples sharing one number both resolved to the
  // same stored row: the first was overwritten by the second, and the row that
  // never got matched was then deleted as an orphan. Position also lets an
  // admin correct a sample number in place instead of the row being deleted and
  // recreated under a new id.
  const reusable = [...existingSamples].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0)
  );

  for (let i = 0; i < sampleNumbers.length; i++) {
    const identifier = sampleNumbers[i];
    if (!identifier) continue;

    const entityData = {
      requestID: requestId,
      position: i,
      sampleNumber: identifier,
      sampleLabel: sampleLabels[i] !== undefined ? sampleLabels[i] : "",
      sampleDescription:
        sampleDescriptions[i] !== undefined ? sampleDescriptions[i] : "",
    };

    const existingSample = reusable.shift();

    try {
      if (existingSample) {
        idsToDelete.delete(existingSample.id);
        Object.assign(existingSample, entityData);
        await existingSample.save();
      } else {
        await new SampleDescription(entityData).save();
      }
    } catch (err) {
      console.error(
        `Error saving SampleDescription "${identifier}" for request ${requestId}:`,
        err
      );
      errors.push(`Sample "${identifier}" could not be saved.`);
    }
  }

  // Only remove rows the submitter actually had the opportunity to delete. When
  // the payload carries no samples section at all, leaving the existing rows
  // alone is the safe interpretation.
  if (!allowDeletions) {
    if (idsToDelete.size) {
      console.warn(
        `Skipping deletion of ${idsToDelete.size} sample(s) for request ${requestId}: payload did not include the samples section.`
      );
    }
    return errors;
  }

  for (const id of idsToDelete) {
    try {
      const entity = await SampleDescription.get(id);
      if (entity) await entity.delete();
    } catch (err) {
      console.error(
        `Error deleting SampleDescription (${id}) for request ${requestId}:`,
        err
      );
      errors.push("An old sample row could not be removed.");
    }
  }

  return errors;
}

/**
 * Processes construct data for a given request.
 *
 * @param {string[]} accessions - Construct identifiers (accession numbers).
 * @param {string[]} sequenceInfos - Sequence information strings.
 * @param {string[]} dbEntries - Database entry strings.
 * @param {string} requestId - The ID of the request these constructs belong to.
 * @param {Array} existingConstructs - Existing Construct entities for the request.
 * @param {boolean} allowDeletions - Whether constructs absent from the payload may be deleted.
 * @returns {Promise<string[]>} Messages describing any rows that could not be written.
 */
async function processConstruct(
  accessions = [],
  sequenceInfos = [],
  dbEntries = [],
  requestId,
  existingConstructs = [],
  allowDeletions = false
) {
  const errors = [];
  const idsToDelete = new Set(existingConstructs.map((c) => c.id));

  // Reused by position for the same reason as samples: two constructs can
  // legitimately share an accession (the same parent gene with different tags,
  // which is exactly what the form's own help text describes), and matching on
  // the accession made the second silently overwrite the first and then delete
  // the leftover row.
  const reusable = [...existingConstructs].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0)
  );

  for (let i = 0; i < accessions.length; i++) {
    const identifier = accessions[i];
    if (!identifier) continue;

    // sequenceInfo and dbEntry are required by the model, so a missing value
    // would throw on save. Defaulting to an empty string keeps the construct.
    const entityData = {
      requestID: requestId,
      position: i,
      accession: identifier,
      sequenceInfo: sequenceInfos[i] !== undefined ? sequenceInfos[i] : "",
      dbEntry: dbEntries[i] !== undefined ? dbEntries[i] : "",
    };

    const existingConstruct = reusable.shift();

    try {
      if (existingConstruct) {
        idsToDelete.delete(existingConstruct.id);
        Object.assign(existingConstruct, entityData);
        await existingConstruct.save();
      } else {
        await new Construct(entityData).save();
      }
    } catch (err) {
      console.error(
        `Error saving Construct "${identifier}" for request ${requestId}:`,
        err
      );
      errors.push(`Construct "${identifier}" could not be saved.`);
    }
  }

  if (!allowDeletions) {
    if (idsToDelete.size) {
      console.warn(
        `Skipping deletion of ${idsToDelete.size} construct(s) for request ${requestId}: payload did not include the constructs section.`
      );
    }
    return errors;
  }

  for (const id of idsToDelete) {
    try {
      const entity = await Construct.get(id);
      if (entity) await entity.delete();
    } catch (err) {
      console.error(
        `Error deleting Construct (${id}) for request ${requestId}:`,
        err
      );
      errors.push("An old construct row could not be removed.");
    }
  }

  return errors;
}

/**
 * Processes pre-existing images for updates and deletions.
 *
 * @param {Array} preExistingImages - Existing image objects carrying edit flags.
 * @param {string} requestId - The request ID, used for logging.
 * @param {Array} ownedImages - Images actually belonging to this request.
 * @returns {Promise<string[]>} Messages describing any rows that could not be written.
 */
async function processExistingImages(
  preExistingImages,
  requestId,
  ownedImages = []
) {
  const errors = [];
  if (!Array.isArray(preExistingImages) || !preExistingImages.length) {
    return errors;
  }

  // The image IDs come from the browser, so they are only acted on when they
  // belong to the request being edited. Otherwise one request's payload could
  // delete another request's images.
  const ownedIds = new Set(ownedImages.map((image) => image.id));

  for (const existingImage of preExistingImages) {
    const id = firstScalar(existingImage.id);
    if (!id) continue;

    if (!ownedIds.has(id)) {
      console.warn(
        `Ignoring image ${id} in payload for request ${requestId}: not one of its images.`
      );
      continue;
    }

    const deleteRequest = isTruthyFlag(existingImage.deleteRequest);
    const editedDescription = isTruthyFlag(existingImage.editedDescription);

    try {
      if (deleteRequest) {
        const imageToDelete = await SampleImage.get(id);
        if (imageToDelete) {
          // Files first: if the row went away and the unlink then failed, the
          // orphaned file would be unreachable and impossible to find later.
          await imageToDelete.removeFiles();
          await imageToDelete.delete();
        }
      } else if (editedDescription) {
        const imageToUpdate = await SampleImage.get(id);
        if (imageToUpdate) {
          imageToUpdate.description = firstScalar(
            existingImage.description
          ).slice(0, FIELD_MAX_LENGTHS.imageDescription);
          await imageToUpdate.save();
        }
      }
    } catch (err) {
      console.error(
        `Error updating SampleImage (${id}) for request ${requestId}:`,
        err
      );
      errors.push("An existing image could not be updated.");
    }
  }

  return errors;
}

/**
 * Group uploaded files into image/preview pairs using their field names.
 *
 * The form appends each image as `image[N]` and its generated thumbnail as
 * `preview[N]`. Pairing on those indices rather than on position in req.files
 * means a reordered or partial upload can never attach a description to the
 * wrong image.
 *
 * @param {Array} files - req.files as populated by multer
 * @returns {Map<number, {image?: object, preview?: object}>}
 */
function pairUploadedFiles(files) {
  const pairs = new Map();
  if (!Array.isArray(files)) return pairs;

  for (const file of files) {
    const match = /^(image|preview)\[(\d+)\]$/.exec(file.fieldname || "");
    if (!match) continue;

    const [, kind, rawIndex] = match;
    const index = parseInt(rawIndex, 10);
    if (!pairs.has(index)) pairs.set(index, {});
    pairs.get(index)[kind] = file;
  }

  return pairs;
}

/**
 * Creates new SampleImage records from uploaded files.
 *
 * @param {Array} files - Uploaded file objects from multer
 * @param {string[]} imageNames - Names for each image, indexed by field number
 * @param {string[]} imageDescriptions - Descriptions for each image
 * @param {string} requestId - The request ID to associate images with
 * @returns {Promise<string[]>} Messages describing any rows that could not be written.
 */
async function createNewImages(files, imageNames, imageDescriptions, requestId) {
  const errors = [];
  const pairs = pairUploadedFiles(files);
  if (!pairs.size) return errors;

  for (const [index, pair] of [...pairs.entries()].sort((a, b) => a[0] - b[0])) {
    const imageFile = pair.image;
    if (!imageFile?.path) {
      console.warn(
        `Skipping upload ${index} for request ${requestId}: no stored image file.`
      );
      continue;
    }

    const name =
      (imageNames[index] || imageFile.originalname || "").slice(
        0,
        FIELD_MAX_LENGTHS.imageName
      ) || "image";

    const entityData = {
      path: imageFile.path,
      name,
      uid: imageFile.filename || Util.generateUniqueId(),
      // Recording the preview's own filename removes the old assumption that it
      // could be derived from the image's.
      previewUid: pair.preview?.filename || "",
      description: (imageDescriptions[index] || "").slice(
        0,
        FIELD_MAX_LENGTHS.imageDescription
      ),
      requestID: requestId,
    };

    try {
      await new SampleImage(entityData).save();
    } catch (err) {
      console.error(
        `Error creating SampleImage for request ${requestId}:`,
        err
      );
      errors.push(`Image "${name}" could not be saved.`);
    }
  }

  return errors;
}

/**
 * Handles both updates to existing images and creation of new ones.
 *
 * @param {string} requestId - The request being edited
 * @param {Array} files - Uploaded file objects
 * @param {string[]} imageNames - Names for new images
 * @param {string[]} imageDescriptions - Descriptions for new images
 * @param {Array} preExistingSupportingImages - Existing images with edit flags
 * @param {Array} ownedImages - Images actually belonging to this request
 * @returns {Promise<string[]>} Messages describing any rows that could not be written.
 */
async function processImages(
  requestId,
  files,
  imageNames,
  imageDescriptions,
  preExistingSupportingImages,
  ownedImages = []
) {
  const existingErrors = await processExistingImages(
    preExistingSupportingImages,
    requestId,
    ownedImages
  );
  const createErrors = await createNewImages(
    files,
    imageNames,
    imageDescriptions,
    requestId
  );

  return [...existingErrors, ...createErrors];
}

// --- Controller Logic ---
const requests = {};

requests.new = (req, res, _next) => res.render("requests/new");

requests.newPost = async (req, res) => {
  try {
    const { username } = req.user;
    const body = req.body || {};

    const requestID = firstScalar(body.requestID);
    const janCodeInput = firstScalar(body.janCode).trim();
    const editingForm = !!requestID;

    let currentRequest = null;

    // --- Load the request being edited, and check authorisation up front ---
    if (editingForm) {
      currentRequest = await Request.get(requestID)
        .getJoin({
          supportingImages: true,
          samples: true,
          constructs: true,
          linkedRequests: true,
        })
        .run();

      if (!currentRequest) {
        return res.status(404).json({ error: "Request not found for editing." });
      }

      // Only the creator or an admin may submit edits for this form.
      if (currentRequest.createdBy !== username && !Util.isAdmin(username)) {
        console.error(
          `Unauthorized POST edit attempt for request ${requestID} by ${username}`
        );
        return res
          .status(403)
          .json({ error: "You are not authorized to edit this request." });
      }

      // Optimistic concurrency: if the form was loaded before someone else
      // saved, refuse rather than silently overwriting their work. Only
      // enforced when the client actually sent the timestamp it loaded.
      const submittedUpdatedAt = firstScalar(body.updatedAt);
      const submittedTime = Date.parse(submittedUpdatedAt);
      if (submittedUpdatedAt && currentRequest.updatedAt && !isNaN(submittedTime)) {
        const storedTime = new Date(currentRequest.updatedAt).getTime();
        if (submittedTime !== storedTime) {
          return res.status(409).json({
            error:
              "This request was changed by someone else while you were editing. Reload the page to see the current version before saving again.",
          });
        }
      }
    }

    // --- Validate everything before it reaches the ORM ---
    const { errors: fieldErrors, values } = validateRequestFields(body, {
      isEdit: editingForm,
      existing: currentRequest,
    });
    const errors = [...fieldErrors];

    if (editingForm) {
      const janCodeError = validateJanCode(janCodeInput);
      if (janCodeError) errors.push(janCodeError);
    }

    const accessions = toStringArray(body.accessions);
    const sequenceInfos = toStringArray(body.sequenceInfos);
    const dbEntries = toStringArray(body.dbEntries);
    errors.push(
      ...validateConstructArrays(accessions, sequenceInfos, dbEntries)
    );

    const sampleNumbers = toStringArray(body.sampleNumbers);
    const sampleLabels = toStringArray(body.sampleLabels);
    const sampleDescriptions = toStringArray(body.sampleDescriptions);
    errors.push(
      ...validateSampleArrays(sampleNumbers, sampleLabels, sampleDescriptions)
    );

    if (errors.length) {
      return res.status(400).json({ error: errors[0], errors });
    }

    // --- Guard the JAN code against collisions on edit ---
    let responseJanCode = janCodeInput;
    if (editingForm && janCodeInput !== currentRequest.janCode) {
      const clash = await Request.filter({ janCode: janCodeInput }).run();
      if (clash.some((existing) => existing.id !== currentRequest.id)) {
        return res.status(400).json({
          error: `The label "${janCodeInput}" is already in use by another request.`,
        });
      }
    }

    const coreFields = {
      species: values.species,
      secondSpecies: values.secondSpecies,
      speciesTaxId: values.speciesTaxId,
      secondSpeciesTaxId: values.secondSpeciesTaxId,
      tissue: values.tissue,
      tissueAgeNum: values.tissueAgeNum,
      tissueAgeType: values.tissueAgeType,
      growthConditions: values.growthConditions,
      analysisType: values.analysisType,
      secondaryAnalysisType: values.secondaryAnalysisType,
      typeOfPTM: values.typeOfPTM,
      quantitativeAnalysisRequired: values.quantitativeAnalysisRequired,
      typeOfLabeling: values.typeOfLabeling,
      labelUsed: values.labelUsed,
      samplePrep: values.samplePrep,
      digestion: values.digestion,
      enzyme: values.enzyme,
      projectDescription: values.projectDescription,
      hopedAnalysis: values.hopedAnalysis,
      bufferComposition: values.bufferComposition,
      notes: normalizeNotes(body.notes),
    };

    // Captured before saving: the joined relations are read off the in-memory
    // document, and relying on them surviving a save() would make child updates
    // depend on ORM internals.
    const existingImages = currentRequest?.supportingImages || [];
    const existingSamples = currentRequest?.samples || [];
    const existingConstructs = currentRequest?.constructs || [];

    // --- Create or update the request itself (a single write either way) ---
    if (editingForm) {
      Object.assign(currentRequest, coreFields, { janCode: responseJanCode });
      await currentRequest.save();
      console.log(`Updated request: ${currentRequest.id}`);
    } else {
      responseJanCode = await Util.generateJanCode(
        req.user.firstName,
        req.user.lastName,
        req.user.username
      );
      currentRequest = new Request({
        createdBy: username,
        // Stored up front when we already know it, so the lazy LDAP lookup in
        // getCreatedByName rarely has to run at all.
        createdByName: req.user.name || "",
        janCode: responseJanCode,
        ...coreFields,
      });
      await currentRequest.save();
      console.log(
        `Created new request: ${currentRequest.id} with JAN code ${currentRequest.janCode}`
      );
    }

    // Deletions of child rows only happen when the payload explicitly says it
    // carried that section. An absent section means "no information", not
    // "delete everything" - the distinction that previously wiped every sample
    // row on each edit.
    const samplesSubmitted = isTruthyFlag(body.samplesSubmitted);
    const constructsSubmitted = isTruthyFlag(body.constructsSubmitted);

    const warnings = [];

    warnings.push(
      ...(await processConstruct(
        accessions,
        sequenceInfos,
        dbEntries,
        currentRequest.id,
        existingConstructs,
        constructsSubmitted
      ))
    );

    warnings.push(
      ...(await processSampleDescription(
        { sampleNumbers, sampleLabels, sampleDescriptions },
        currentRequest.id,
        existingSamples,
        samplesSubmitted
      ))
    );

    warnings.push(
      ...(await processImages(
        currentRequest.id,
        req.files,
        toStringArray(body.imageNames),
        toStringArray(body.imageDescriptions),
        toObjectArray(body.preExistingSupportingImages),
        existingImages
      ))
    );

    // --- Send Notifications ---
    if (!editingForm) {
      try {
        Email.newRequest(currentRequest);
      } catch (emailError) {
        console.error("Failed to send new request email:", emailError);
      }
    } else {
      // The silent-update checkbox is only rendered for admins, but the flag
      // arrives from the browser so the permission has to be checked here too.
      const silentUpdate =
        isTruthyFlag(body.silentUpdate) && Util.isAdmin(username);
      if (!silentUpdate) {
        try {
          // Passed as the document rather than a spread copy: spreading drops
          // the thinky prototype, and the email template calls methods on it.
          Email.updatedRequest(currentRequest);
        } catch (emailError) {
          console.error("Failed to send updated request email:", emailError);
        }
      } else {
        console.log(
          `Silent update enabled: skipped email notification for request ${currentRequest.id}`
        );
      }
    }

    return res.status(200).json({
      requestID: currentRequest.id,
      janCode: currentRequest.janCode,
      editingForm,
      // Child rows are written after the request itself, so a partial failure
      // has to be reported rather than hidden behind a success toast.
      warnings,
    });
  } catch (err) {
    console.error("Error in newPost handler:", err);
    if (!res.headersSent) {
      return res
        .status(500)
        .json({ error: err.message || "Internal server error" });
    }
  }
};

requests.show = (req, res, _next) => {
  const requestID = req.params.id;

  Request.get(requestID)
    .getJoin({
      supportingImages: true,
      samples: true,
      constructs: true,
      linkedRequests: true,
    })
    .run()
    .then((request) => {
      if (!request) {
        console.error(`Request not found for show: ${requestID}`);
        req.flash("error", "Request not found.");
        return res.redirect("/");
      }

      request.supportingImages = request.supportingImages || [];
      request.constructs = request.constructs || [];
      request.linkedRequests = request.linkedRequests || [];
      request.samples = (request.samples || []).sort(
        (a, b) => a.position - b.position
      );

      return res.render("requests/show", {
        request,
        admins: config.admins,
      });
    })
    .catch((err) => {
      console.error(`Error showing request ${requestID}:`, err);
      req.flash("error", "Error loading request details.");
      return res.redirect("/");
    });
};

requests.edit = (req, res) => {
  const requestID = req.params.id;
  Request.get(requestID)
    .getJoin({ supportingImages: true, samples: true, constructs: true })
    .run()
    .then((request) => {
      if (!request) {
        console.error(`Request not found for editing: ${requestID}`);
        req.flash("error", "Request not found for editing.");
        return res.redirect("/");
      }

      // Generate preview URLs for existing images
      request.supportingImages = (request.supportingImages || []).map((ri) => {
        ri.url = ri.getPreviewURL ? ri.getPreviewURL() : "#";
        return ri;
      });

      request.samples = (request.samples || []).sort(
        (a, b) => a.position - b.position
      );
      request.constructs = request.constructs || [];

      // Permission check: ensure user is creator or admin
      if (
        request.createdBy !== req.user.username &&
        !Util.isAdmin(req.user.username)
      ) {
        console.error(
          `Unauthorized edit attempt for request ${requestID} by ${req.user.username}`
        );
        req.flash("error", "You are not authorized to edit this request.");
        return res.redirect("/");
      }

      // Check if request is already assigned and editable (unless user is admin)
      if (
        request.assignedTo &&
        request.assignedTo !== "unassigned" &&
        !Util.isAdmin(req.user.username)
      ) {
        console.warn(
          `Attempt to edit assigned request ${requestID} by ${req.user.username}`
        );
        req.flash(
          "error",
          "This request has already been assigned for action and cannot be edited."
        );
        return res.redirect("/");
      }

      return res.render("requests/new", { request });
    })
    .catch((err) => {
      console.error(`Error editing request ${requestID}:`, err);
      req.flash("error", "Error loading request for editing.");
      return res.redirect("/");
    });
};

requests.clone = (req, res) => {
  const requestID = req.params.id;
  Request.get(requestID)
    .getJoin({ supportingImages: true, samples: true, constructs: true })
    .run()
    .then((request) => {
      if (!request) {
        console.error(`Request not found for cloning: ${requestID}`);
        req.flash("error", "Request not found for cloning.");
        return res.redirect("/");
      }

      const clonedRequestData = { ...request };
      clonedRequestData.id = undefined;
      clonedRequestData.janCode = undefined;
      clonedRequestData.createdAt = undefined;
      clonedRequestData.updatedAt = undefined;
      clonedRequestData.createdBy = req.user.username;
      clonedRequestData.isClone = true;

      clonedRequestData.supportingImages = (request.supportingImages || []).map(
        (img) => ({
          ...img,
          id: undefined,
          requestID: undefined,
          url: img.getPreviewURL ? img.getPreviewURL() : "#",
        })
      );
      clonedRequestData.samples = (request.samples || [])
        .sort((a, b) => a.position - b.position)
        .map((sample) => ({
          ...sample,
          id: undefined,
          requestID: undefined,
        }));
      clonedRequestData.constructs = (request.constructs || []).map(
        (construct) => ({
          ...construct,
          id: undefined,
          requestID: undefined,
        })
      );

      return res.render("requests/new", {
        request: clonedRequestData,
        isClone: true,
      });
    })
    .catch((err) => {
      console.error(`Error cloning request ${requestID}:`, err);
      req.flash("error", "Error loading request for cloning.");
      return res.redirect("/");
    });
};

requests.delete = (req, res) => {
  const requestID = req.params.id;
  Request.get(requestID)
    .then((request) => {
      if (!request) {
        console.error(`Request not found for deletion: ${requestID}`);
        req.flash("error", "Request not found for deletion.");
        return res.redirect("/");
      }

      if (
        request.createdBy !== req.user.username &&
        !Util.isAdmin(req.user.username)
      ) {
        console.error(
          `Unauthorized delete attempt for request ${requestID} by ${req.user.username}`
        );
        req.flash("error", "You are not authorized to delete this request.");
        return res.redirect("/");
      }

      request
        .removeChildren()
        .then(() => request.delete())
        .then(() => {
          req.flash("success", "Request successfully deleted.");
          res.redirect(`/admin?t=${new Date().getTime()}`);
        })
        .catch((err) => {
          console.error(
            `Error deleting request ${requestID} and its children:`,
            err
          );
          req.flash("error", "Error deleting request.");
          return res.redirect("/");
        });
    })
    .catch((err) => {
      console.error(`Error retrieving request ${requestID} for deletion:`, err);
      req.flash("error", "Error finding request for deletion.");
      return res.redirect("/");
    });
};

module.exports = requests;

// Exported for unit testing. These used to be re-implemented inside the test
// file, which meant the tests passed regardless of what the controller did.
module.exports._internal = {
  normalizeNotes,
  isTruthyFlag,
  pairUploadedFiles,
  processSampleDescription,
  processConstruct,
  processExistingImages,
  createNewImages,
  MAX_NOTES,
};
