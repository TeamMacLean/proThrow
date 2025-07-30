const Request = require("../models/request");
const Util = require("../lib/util");
const config = require("../config");
const Email = require("../lib/email");
const SampleDescription = require("../models/sampleDescription");
const SampleImage = require("../models/sampleImage");
const Construct = require("../models/construct");

const renderError = require("../lib/renderError");

var requests = {};

requests.new = (req, res, next) => res.render("requests/new");

requests.newPost = async (req, res) => {
  try {
    const { username } = req.user;
    const {
      species = "",
      secondSpecies = "",
      tissue = "",
      tissueAgeNum = "",
      tissueAgeType = "",
      growthConditions = "",
      analysisType = "",
      secondaryAnalysisType = "",
      typeOfPTM = "",
      quantitativeAnalysisRequired = "",
      typeOfLabeling = "",
      labelUsed = "",
      samplePrep = "",
      digestion = "",
      enzyme = "",
      projectDescription = "",
      hopedAnalysis = "",
      bufferComposition = "",
      accessions = [],
      sequenceInfos = [],
      dbEntries = [],
      sampleNumbers = [],
      sampleLabels = [],
      sampleDescriptions = [],
      imageDescriptions = [],
      imageNames = [],
      preExistingSupportingImages = [],
      requestID: reqRequestId,
      janCode: reqJanCode,
    } = req.body;

    const requestID =
      Array.isArray(reqRequestId) && reqRequestId.length > 0
        ? reqRequestId[0]
        : reqRequestId;
    const janCode =
      Array.isArray(reqJanCode) && reqJanCode.length > 0
        ? reqJanCode[0]
        : reqJanCode;

    const editingForm = !!requestID;
    let currentRequest;
    let responseJanCode = janCode; // Use provided janCode if editing

    // --- Get or Create Request ---
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
        return renderError(new Error("Request not found for editing"), res);
      }
    } else {
      responseJanCode = await Util.generateJanCode(
        req.user.firstName,
        req.user.lastName,
        req.user.username
      );
      currentRequest = new Request({
        createdBy: username,
        janCode: responseJanCode,
        species,
        secondSpecies,
        tissue,
        tissueAgeNum,
        tissueAgeType,
        growthConditions,
        analysisType,
        secondaryAnalysisType,
        typeOfPTM,
        quantitativeAnalysisRequired,
        typeOfLabeling,
        labelUsed,
        samplePrep,
        digestion,
        enzyme,
        projectDescription,
        hopedAnalysis,
        bufferComposition,
      });
      await currentRequest.save();
    }

    // --- Update Core Request Details ---
    Object.assign(currentRequest, {
      janCode: responseJanCode, // Ensure janCode is always set
      species,
      secondSpecies,
      tissue,
      tissueAgeNum,
      tissueAgeType,
      growthConditions,
      analysisType,
      secondaryAnalysisType,
      typeOfPTM,
      quantitativeAnalysisRequired,
      typeOfLabeling,
      labelUsed,
      samplePrep,
      digestion,
      enzyme,
      projectDescription,
      hopedAnalysis,
      bufferComposition,
    });
    await currentRequest.save();

    // --- Process Constructs ---
    await processEntities(
      Construct,
      currentRequest.id,
      accessions,
      sequenceInfos,
      dbEntries,
      { sequenceInfo: "sequenceInfo", dbEntry: "dbEntry" }, // mapping for extra fields
      currentRequest.constructs // existing entities
    );

    // --- Process Samples ---
    await processEntities(
      SampleDescription,
      currentRequest.id,
      sampleNumbers,
      sampleLabels,
      sampleDescriptions,
      { sampleLabel: "sampleLabel", sampleDescription: "sampleDescription" }, // mapping for extra fields
      currentRequest.samples // existing entities
    );

    // --- Process Images ---
    await processImages(
      currentRequest,
      req.files,
      imageNames,
      imageDescriptions,
      preExistingSupportingImages
    );

    // --- Send Notifications ---
    if (!editingForm) {
      try {
        Email.newRequest(currentRequest);
      } catch (emailError) {
        console.error("Failed to send new request email:", emailError);
      }
    } else {
      try {
        Email.updatedRequest({ ...currentRequest, createdBy: username });
      } catch (emailError) {
        console.error("Failed to send updated request email:", emailError);
      }
    }

    res.status(200).json({
      requestID: currentRequest.id,
      janCode: currentRequest.janCode,
      editingForm,
    });
  } catch (err) {
    console.error("Error in newPost handler:", err);
    return renderError(err, res);
  }
};

// Helper to process associated entities (Constructs, Samples, etc.)
async function processEntities(
  Model,
  requestId,
  identifiers,
  values1,
  values2,
  fieldMapping = {},
  existingEntities = []
) {
  const updates = [];
  const creations = [];
  const existingIds = new Set(existingEntities.map((e) => e.id));
  const idsToRemove = new Set(existingIds);

  for (let i = 0; i < identifiers.length; i++) {
    const identifier = identifiers[i];
    if (!identifier) continue; // Skip if identifier is empty

    const entityData = {
      requestId: requestId,
      // Assuming the first argument is the primary identifier for the entity
      // E.g., for Construct it's 'accession', for SampleDescription it's 'sampleNumber'
      [Object.keys(Model.definition.columns())[1]]: identifier, // This needs refinement based on actual DB column names
      ...(fieldMapping.value1 ? { [fieldMapping.value1]: values1[i] } : {}),
      ...(fieldMapping.value2 ? { [fieldMapping.value2]: values2[i] } : {}),
    };

    // Map field names from form data to model properties
    for (const formField in fieldMapping) {
      const modelField = fieldMapping[formField];
      if (
        values1[i] !== undefined &&
        modelField === Object.keys(Model.definition.columns())[1]
      ) {
        entityData[modelField] = identifiers[i];
      } else if (values1[i] !== undefined && formField === "value1") {
        entityData[modelField] = values1[i];
      } else if (values2[i] !== undefined && formField === "value2") {
        entityData[modelField] = values2[i];
      }
    }

    // Simplified logic to correctly assign fields based on model
    if (Model.name === "Construct") {
      entityData.accession = identifiers[i];
      entityData.sequenceInfo = values1[i];
      entityData.dbEntry = values2[i];
    } else if (Model.name === "SampleDescription") {
      entityData.sampleNumber = identifiers[i]; // Assuming sampleNumbers is the primary identifier
      entityData.sampleLabel = values1[i];
      entityData.sampleDescription = values2[i];
    }

    // Crude way to set index/position. Better to pass these in if needed.
    if (Model.name === "SampleDescription" || Model.name === "Construct") {
      entityData.position = i; // Or pass index explicitly
    }

    if (existingEntities[i] && existingEntities[i].id) {
      // Update existing entity
      const entityToUpdate = await Model.get(existingEntities[i].id).run();
      if (entityToUpdate) {
        Object.assign(entityToUpdate, entityData);
        updates.push(entityToUpdate.save());
        idsToRemove.delete(existingEntities[i].id);
      }
    } else if (identifier) {
      // Create new entity if identifier is present
      creations.push(new Model(entityData).save());
    }
  }

  // Delete entities that are no longer present in the submitted data
  if (idsToRemove.size > 0) {
    const deletionPromises = Array.from(idsToRemove).map((id) =>
      Model.get(id)
        .run()
        .then((entity) => entity.delete())
    );
    updates.push(...deletionPromises);
  }

  await Promise.all([...updates, ...creations]);
}

// Helper to process image uploads
async function processImages(
  currentRequest,
  files,
  imageNames,
  imageDescriptions,
  preExistingSupportingImages
) {
  const imagePromises = [];

  // Handle new image uploads
  if (files && files.length > 0 && imageNames.length > 0) {
    const uploadCount = Math.min(
      imageNames.length,
      Math.floor(files.length / 2)
    );
    for (let i = 0; i < uploadCount; i++) {
      const imageFile = files[i * 2];
      const previewBlob = files[i * 2 + 1]; // Assuming preview is the second file for each image

      if (imageFile) {
        imagePromises.push(
          new SampleImage({
            path: imageFile.path,
            name: imageFile.originalname || imageNames[i],
            uid: imageFile.filename,
            description: imageDescriptions[i],
            requestID: currentRequest.id,
            // preview: previewBlob.path // Adjust if preview is stored differently
          }).save()
        );
      }
    }
  }

  // Future feature: Handle edits to pre-existing images
  // if (preExistingSupportingImages && preExistingSupportingImages.length > 0) {
  //   // Logic to update descriptions or mark for deletion
  //   // e.g., iterate through preExistingSupportingImages, find corresponding SampleImage, update if needed
  // }

  // TODO: Implement logic to delete pre-existing images if they are no longer present in `preExistingSupportingImages`
  // This would involve comparing existing `currentRequest.supportingImages` with the incoming `preExistingSupportingImages` data.

  await Promise.all(imagePromises);
}

requests.show = (req, res, next) => {
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
      request.supportingImages = request.supportingImages || [];
      request.samples = request.samples || [];

      request.samples = request.samples.sort(function (a, b) {
        return a.position - b.position;
      });

      return res.render("requests/show", {
        request: request,
        admins: config.admins,
      });
    })
    .catch((err) => {
      return renderError(err, res);
    });
};

requests.edit = (req, res) => {
  const requestID = req.params.id;
  Request.get(requestID)
    .getJoin({ supportingImages: true, samples: true, constructs: true })
    .then((request) => {
      request.supportingImages.map((ri) => {
        ri.url = ri.getPreviewURL();
      });

      request.samples = request.samples.sort(function (a, b) {
        return a.position - b.position;
      });

      if (
        request.createdBy != req.user.username &&
        !Util.isAdmin(req.user.username)
      ) {
        return renderError(
          "This is not your request, you cannot edit it.",
          res
        );
      }

      if (
        !request.assignedTo ||
        request.assignedTo === "unassigned" ||
        Util.isAdmin(req.user.username)
      ) {
        return res.render("requests/new", { request });
      } else {
        return renderError(
          "You are not allowed to edit this as it has already been assigned for action.",
          res
        );
      }
    });
};

requests.clone = (req, res) => {
  const requestID = req.params.id;
  Request.get(requestID)
    .getJoin({ supportingImages: true, samples: true, constructs: true })
    .then((request) => {
      request.supportingImages.map((ri) => {
        ri.url = ri.getPreviewURL();
      });

      request.samples = request.samples.sort(function (a, b) {
        return a.position - b.position;
      });

      request.isClone = true;
      return res.render("requests/new", { request, isClone: true });
    })
    .catch((err) => {
      return renderError(err, res);
    });
};

requests.delete = (req, res) => {
  const requestID = req.params.id;
  Request.get(requestID)
    // .getJoin({supportingImages: true, samples: true, constructs: true})
    .then((request) => {
      request
        .deleteAll({ supportingImages: true, samples: true, constructs: true })
        .then(function (result) {
          // michel, marc, sophia and ben are deleted from the database
          return res.redirect("/admin/index");
        })
        .catch((err) => {
          return renderError(err, res);
        });
    })
    .catch((err) => {
      return renderError(err, res);
    });
};

module.exports = requests;
