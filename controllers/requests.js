const Request = require("../models/request");
const Util = require("../lib/util");
const config = require("../config");
const Email = require("../lib/email");
const SampleDescription = require("../models/sampleDescription");
const SampleImage = require("../models/sampleImage");
const Construct = require("../models/construct");
const renderError = require("../lib/renderError");

/**
 * Processes sample description data for a given request.
 * @param {object} sampleData - Object containing arrays of sampleNumbers, sampleLabels, sampleDescriptions.
 * @param {string} requestId - The ID of the request these samples belong to.
 * @param {Array} existingSamples - Array of existing SampleDescription entities associated with the request.
 */
async function processSampleDescription(
  sampleData,
  requestId,
  existingSamples = []
) {
  const { sampleNumbers, sampleLabels, sampleDescriptions } = sampleData;
  const creationPromises = [];
  const updatePromises = [];
  const existingSampleIds = new Set(existingSamples.map((s) => s.id));
  const idsToDelete = new Set(existingSampleIds);

  console.log(
    `Processing ${sampleNumbers.length} sample descriptions for request: ${requestId}`
  );
  console.log("Sample Data to Process:", {
    sampleNumbers: sampleNumbers,
    sampleLabels: sampleLabels,
    sampleDescriptions: sampleDescriptions,
  });

  for (let i = 0; i < sampleNumbers.length; i++) {
    const identifier = sampleNumbers[i];
    if (!identifier) {
      console.log(
        `Skipping empty sample number at index ${i} for request ${requestId}.`
      );
      continue;
    }

    const entityData = {
      requestId: requestId,
      position: i, // Position based on array index
      sampleNumber: identifier,
      sampleLabel: sampleLabels[i] !== undefined ? sampleLabels[i] : null,
      sampleDescription:
        sampleDescriptions[i] !== undefined ? sampleDescriptions[i] : null,
    };

    console.log(
      `[SampleDescription] Processing entity data at index ${i}:`,
      entityData
    );

    // Find existing sample by its number and/or position, or use provided existingSamples data
    const existingSample = existingSamples.find(
      (s) => s.sampleNumber === identifier && s.requestId === requestId
    );

    if (existingSample) {
      idsToDelete.delete(existingSample.id); // Mark as handled, not to be deleted
      // Update existing sample
      try {
        const sampleToUpdate = await SampleDescription.get(
          existingSample.id
        ).run();
        if (sampleToUpdate) {
          Object.assign(sampleToUpdate, entityData);
          updatePromises.push(
            sampleToUpdate
              .save()
              .then((saved) => {
                console.log(
                  `Updated SampleDescription (${saved.id}) successfully for request ${requestId}.`
                );
                return saved;
              })
              .catch((err) => {
                console.error(
                  `Error updating SampleDescription (${existingSample.id}) for request ${requestId}:`,
                  err
                );
                return Promise.resolve(); // Continue processing
              })
          );
        } else {
          // Fallback to create if get fails but was thought to exist
          console.warn(
            `Existing SampleDescription (${existingSample.id}) not found for update, attempting creation for request ${requestId}.`
          );
          creationPromises.push(
            new SampleDescription(entityData)
              .save()
              .then((saved) => {
                console.log(
                  `Created new SampleDescription (${saved.id}) as fallback for request ${requestId}.`
                );
                return saved;
              })
              .catch((err) => {
                console.error(
                  `Error creating fallback SampleDescription for request ${requestId}:`,
                  err
                );
                return Promise.resolve();
              })
          );
        }
      } catch (err) {
        console.error(
          `Exception fetching existing SampleDescription (${existingSample.id}) for request ${requestId}:`,
          err
        );
        // Fallback to create if fetch fails
        creationPromises.push(
          new SampleDescription(entityData)
            .save()
            .then((saved) => {
              console.log(
                `Created new SampleDescription (${saved.id}) due to fetch error for request ${requestId}.`
              );
              return saved;
            })
            .catch((err) => {
              console.error(
                `Error creating fallback SampleDescription after fetch error for request ${requestId}:`,
                err
              );
              return Promise.resolve();
            })
        );
      }
    } else if (identifier) {
      // Create new sample description
      creationPromises.push(
        new SampleDescription(entityData)
          .save()
          .then((saved) => {
            console.log(
              `Created new SampleDescription (${saved.id}) successfully for request ${requestId}.`
            );
            return saved;
          })
          .catch((err) => {
            console.error(
              `Error creating new SampleDescription for request ${requestId}:`,
              err
            );
            return Promise.resolve(); // Continue processing
          })
      );
    }
  }

  // Delete samples that were not in the new data
  const deletePromises = Array.from(idsToDelete).map((id) =>
    SampleDescription.get(id)
      .run()
      .then((entity) => {
        if (entity) {
          return entity
            .delete()
            .then(() => {
              console.log(
                `Deleted old SampleDescription (${id}) for request ${requestId}.`
              );
            })
            .catch((err) => {
              console.error(
                `Error deleting old SampleDescription (${id}) for request ${requestId}:`,
                err
              );
              return Promise.resolve();
            });
        } else {
          console.warn(
            `Old SampleDescription (${id}) not found for deletion for request ${requestId}.`
          );
          return Promise.resolve();
        }
      })
      .catch((err) => {
        console.error(
          `Exception fetching old SampleDescription (${id}) for deletion for request ${requestId}:`,
          err
        );
        return Promise.resolve();
      })
  );

  await Promise.all([
    ...creationPromises,
    ...updatePromises,
    ...deletePromises,
  ]);
  console.log(
    `Finished processing SampleDescriptions for request: ${requestId}`
  );
}

/**
 * Processes construct data for a given request.
 * @param {Array} accessions - Array of construct identifiers (e.g., accession numbers).
 * @param {Array} sequenceInfos - Array of sequence information strings.
 * @param {Array} dbEntries - Array of database entry strings.
 * @param {string} requestId - The ID of the request these constructs belong to.
 * @param {Array} existingConstructs - Array of existing Construct entities associated with the request.
 */
async function processConstruct(
  accessions = [],
  sequenceInfos = [],
  dbEntries = [],
  requestId,
  existingConstructs = []
) {
  const creationPromises = [];
  const updatePromises = [];
  const existingConstructIds = new Set(existingConstructs.map((c) => c.id));
  const idsToDelete = new Set(existingConstructIds);

  console.log(
    `Processing ${accessions.length} constructs for request: ${requestId}`
  );

  for (let i = 0; i < accessions.length; i++) {
    const identifier = accessions[i];
    if (!identifier) {
      console.log(
        `Skipping empty accession at index ${i} for request ${requestId}.`
      );
      continue;
    }

    const entityData = {
      requestId: requestId,
      position: i, // Position based on array index
      accession: identifier,
      sequenceInfo: sequenceInfos[i] !== undefined ? sequenceInfos[i] : null,
      dbEntry: dbEntries[i] !== undefined ? dbEntries[i] : null,
    };

    console.log(
      `[Construct] Processing entity data at index ${i}:`,
      entityData
    );

    // Find existing construct by accession
    const existingConstruct = existingConstructs.find(
      (c) => c.accession === identifier && c.requestId === requestId
    );

    if (existingConstruct) {
      idsToDelete.delete(existingConstruct.id); // Mark as handled
      // Update existing construct
      try {
        const constructToUpdate = await Construct.get(
          existingConstruct.id
        ).run();
        if (constructToUpdate) {
          Object.assign(constructToUpdate, entityData);
          updatePromises.push(
            constructToUpdate
              .save()
              .then((saved) => {
                console.log(
                  `Updated Construct (${saved.id}) successfully for request ${requestId}.`
                );
                return saved;
              })
              .catch((err) => {
                console.error(
                  `Error updating Construct (${existingConstruct.id}) for request ${requestId}:`,
                  err
                );
                return Promise.resolve();
              })
          );
        } else {
          // Fallback to create if get fails
          console.warn(
            `Existing Construct (${existingConstruct.id}) not found for update, attempting creation for request ${requestId}.`
          );
          creationPromises.push(
            new Construct(entityData)
              .save()
              .then((saved) => {
                console.log(
                  `Created new Construct (${saved.id}) as fallback for request ${requestId}.`
                );
                return saved;
              })
              .catch((err) => {
                console.error(
                  `Error creating fallback Construct for request ${requestId}:`,
                  err
                );
                return Promise.resolve();
              })
          );
        }
      } catch (err) {
        console.error(
          `Exception fetching existing Construct (${existingConstruct.id}) for request ${requestId}:`,
          err
        );
        // Fallback to create if fetch fails
        creationPromises.push(
          new Construct(entityData)
            .save()
            .then((saved) => {
              console.log(
                `Created new Construct (${saved.id}) due to fetch error for request ${requestId}.`
              );
              return saved;
            })
            .catch((err) => {
              console.error(
                `Error creating fallback Construct after fetch error for request ${requestId}:`,
                err
              );
              return Promise.resolve();
            })
        );
      }
    } else if (identifier) {
      // Create new construct
      creationPromises.push(
        new Construct(entityData)
          .save()
          .then((saved) => {
            console.log(
              `Created new Construct (${saved.id}) successfully for request ${requestId}.`
            );
            return saved;
          })
          .catch((err) => {
            console.error(
              `Error creating new Construct for request ${requestId}:`,
              err
            );
            return Promise.resolve(); // Continue processing
          })
      );
    }
  }

  // Delete constructs that were not in the new data
  const deletePromises = Array.from(idsToDelete).map((id) =>
    Construct.get(id)
      .run()
      .then((entity) => {
        if (entity) {
          return entity
            .delete()
            .then(() => {
              console.log(
                `Deleted old Construct (${id}) for request ${requestId}.`
              );
            })
            .catch((err) => {
              console.error(
                `Error deleting old Construct (${id}) for request ${requestId}:`,
                err
              );
              return Promise.resolve();
            });
        } else {
          console.warn(
            `Old Construct (${id}) not found for deletion for request ${requestId}.`
          );
          return Promise.resolve();
        }
      })
      .catch((err) => {
        console.error(
          `Exception fetching old Construct (${id}) for deletion for request ${requestId}:`,
          err
        );
        return Promise.resolve();
      })
  );

  await Promise.all([
    ...creationPromises,
    ...updatePromises,
    ...deletePromises,
  ]);
  console.log(`Finished processing Constructs for request: ${requestId}`);
}

// --- Image Processing Helper (Minor adjustment for logging clarity) ---
async function processImages(
  currentRequest,
  files,
  imageNames,
  imageDescriptions,
  preExistingSupportingImages
) {
  const imagePromises = [];
  const existingImageIds = new Set(
    preExistingSupportingImages.map((img) => img.id)
  );
  const idsToDelete = new Set(existingImageIds);

  if (files && files.length > 0 && imageNames && imageNames.length > 0) {
    const numImagesToProcess = Math.min(
      imageNames.length,
      Math.floor(files.length / 2) // Assuming pairs of file/blob
    );

    for (let i = 0; i < numImagesToProcess; i++) {
      const imageFile = files[i * 2]; // The actual image file
      const previewBlob = files[i * 2 + 1]; // The preview blob, if sent separately

      if (imageFile && imageFile.path && imageNames[i]) {
        const entityData = {
          path: imageFile.path,
          name: imageNames[i],
          uid: imageFile.filename || Util.generateUniqueId(),
          description: imageDescriptions[i] || "",
          requestID: currentRequest.id,
        };

        console.log(
          `[SampleImage] Processing image data at index ${i}:`,
          entityData
        );

        // Check if this image (by name or path/uid) already exists for update
        const existingImage = preExistingSupportingImages.find(
          (img) => img.name === imageNames[i] || img.uid === entityData.uid
        );

        if (existingImage) {
          idsToDelete.delete(existingImage.id); // Mark as handled
          try {
            const imageToUpdate = await SampleImage.get(existingImage.id).run();
            if (imageToUpdate) {
              Object.assign(imageToUpdate, entityData);
              imagePromises.push(
                imageToUpdate
                  .save()
                  .then((saved) => {
                    console.log(
                      `Updated SampleImage (${saved.id}) successfully for request ${currentRequest.id}.`
                    );
                    return saved;
                  })
                  .catch((err) => {
                    console.error(
                      `Error updating SampleImage (${existingImage.id}) for request ${currentRequest.id}:`,
                      err
                    );
                    return Promise.resolve();
                  })
              );
            } else {
              console.warn(
                `Existing SampleImage (${existingImage.id}) not found for update, attempting creation for request ${currentRequest.id}.`
              );
              imagePromises.push(
                new SampleImage(entityData)
                  .save()
                  .then((saved) => {
                    console.log(
                      `Created new SampleImage (${saved.id}) as fallback for request ${currentRequest.id}.`
                    );
                    return saved;
                  })
                  .catch((err) => {
                    console.error(
                      `Error creating fallback SampleImage for request ${currentRequest.id}:`,
                      err
                    );
                    return Promise.resolve();
                  })
              );
            }
          } catch (err) {
            console.error(
              `Exception fetching existing SampleImage (${existingImage.id}) for request ${currentRequest.id}:`,
              err
            );
            imagePromises.push(
              new SampleImage(entityData)
                .save()
                .then((saved) => {
                  console.log(
                    `Created new SampleImage (${saved.id}) due to fetch error for request ${currentRequest.id}.`
                  );
                  return saved;
                })
                .catch((err) => {
                  console.error(
                    `Error creating fallback SampleImage after fetch error for request ${currentRequest.id}:`,
                    err
                  );
                  return Promise.resolve();
                })
            );
          }
        } else {
          // Create new image
          imagePromises.push(
            new SampleImage(entityData)
              .save()
              .then((saved) => {
                console.log(
                  `Created new SampleImage (${saved.id}) successfully for request ${currentRequest.id}.`
                );
                return saved;
              })
              .catch((err) => {
                console.error(
                  `Error creating new SampleImage for request ${currentRequest.id}:`,
                  err
                );
                return Promise.resolve();
              })
          );
        }
      } else {
        console.warn(
          `Skipping image processing at index ${i}: Missing file, path, or name for request ${currentRequest.id}.`
        );
      }
    }
  } else if (files && files.length > 0) {
    console.warn(
      `Image files uploaded for request ${currentRequest.id}, but no names/descriptions provided.`
    );
  }

  // Delete old images that were not re-submitted
  const deleteImagePromises = Array.from(idsToDelete).map((id) =>
    SampleImage.get(id)
      .run()
      .then((entity) => {
        if (entity) {
          return entity
            .delete()
            .then(() => {
              console.log(
                `Deleted old SampleImage (${id}) for request ${currentRequest.id}.`
              );
            })
            .catch((err) => {
              console.error(
                `Error deleting old SampleImage (${id}) for request ${currentRequest.id}:`,
                err
              );
              return Promise.resolve();
            });
        } else {
          console.warn(
            `Old SampleImage (${id}) not found for deletion for request ${currentRequest.id}.`
          );
          return Promise.resolve();
        }
      })
      .catch((err) => {
        console.error(
          `Exception fetching old SampleImage (${id}) for deletion for request ${currentRequest.id}:`,
          err
        );
        return Promise.resolve();
      })
  );

  await Promise.all([...imagePromises, ...deleteImagePromises]);
  console.log(
    `Finished processing SampleImages for request: ${currentRequest.id}`
  );
}

// --- Controller Logic ---
const requests = {};

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
      accessions = [], // For Constructs
      sequenceInfos = [], // For Constructs
      dbEntries = [], // For Constructs
      sampleNumbers = [], // For SampleDescriptions
      sampleLabels = [], // For SampleDescriptions
      sampleDescriptions = [], // For SampleDescriptions
      imageDescriptions = [], // For SampleImages
      imageNames = [], // For SampleImages
      preExistingSupportingImages = [], // Existing images for editing/updating
      requestID: reqRequestId, // If editing
      janCode: reqJanCode, // If editing
    } = req.body;

    const requestID = Array.isArray(reqRequestId)
      ? reqRequestId[0]
      : reqRequestId;
    const janCode = Array.isArray(reqJanCode) ? reqJanCode[0] : reqJanCode;

    const editingForm = !!requestID;
    let currentRequest;
    let responseJanCode = janCode; // Use provided janCode if editing

    // --- Get or Create Request ---
    if (editingForm) {
      currentRequest = await Request.get(requestID)
        .getJoin({
          supportingImages: true, // Fetch related data for updates/deletions
          samples: true,
          constructs: true,
          linkedRequests: true, // Keep if still needed, otherwise remove
        })
        .run();
      if (!currentRequest) {
        console.error(`Edit attempt failed: Request ${requestID} not found.`);
        return renderError(new Error("Request not found for editing"), res);
      }
      console.log(`Editing existing request: ${currentRequest.id}`);
    } else {
      // Generate new JAN code for new requests
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
      console.log(
        `Created new request: ${currentRequest.id} with JAN code ${currentRequest.janCode}`
      );
    }

    // --- Update Core Request Details ---
    // Ensure all relevant fields are updated, even if not changed
    Object.assign(currentRequest, {
      janCode: responseJanCode, // Update even if editing
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
    console.log(`Updated core details for request: ${currentRequest.id}`);

    // --- Process Constructs ---
    const constructData = { accessions, sequenceInfos, dbEntries };
    await processConstruct(
      constructData.accessions,
      constructData.sequenceInfos,
      constructData.dbEntries,
      currentRequest.id,
      currentRequest.constructs // Pass existing constructs for update/delete logic
    );

    // --- Process Samples ---
    const sampleData = { sampleNumbers, sampleLabels, sampleDescriptions };
    await processSampleDescription(
      sampleData,
      currentRequest.id,
      currentRequest.samples // Pass existing samples
    );

    // --- Process Images ---
    // Note: 'files' here refers to req.files from Multer or similar
    await processImages(
      currentRequest,
      req.files, // Assuming req.files is populated by middleware
      imageNames,
      imageDescriptions,
      preExistingSupportingImages // Pass existing images
    );

    // --- Send Notifications ---
    if (!editingForm) {
      try {
        // Use the newly created currentRequest object
        Email.newRequest(currentRequest);
      } catch (emailError) {
        console.error("Failed to send new request email:", emailError);
      }
    } else {
      try {
        // For updates, ensure createdBy is available in the email context
        // currentRequest.createdBy is already loaded from the DB
        Email.updatedRequest({ ...currentRequest, createdBy: username });
      } catch (emailError) {
        console.error("Failed to send updated request email:", emailError);
      }
    }

    // Success response
    res.status(200).json({
      requestID: currentRequest.id,
      janCode: currentRequest.janCode,
      editingForm,
    });
  } catch (err) {
    console.error("Error in newPost handler:", err);
    if (!res.headersSent) {
      return renderError(err, res);
    }
  }
};

requests.show = (req, res, next) => {
  const requestID = req.params.id;
  let requestData; // Declare requestData here to be accessible in the next .then

  Request.get(requestID)
    .getJoin({
      supportingImages: true,
      sampleDescriptions: true, // We'll fetch samples separately for debugging
      constructs: true,
      linkedRequests: true,
    })
    .run()
    .then((request) => {
      if (!request) {
        console.error(`Request not found for show: ${requestID}`);
        return renderError(new Error("Request not found."), res);
      }
      requestData = request; // Assign the fetched request

      // Ensure related arrays exist
      requestData.supportingImages = requestData.supportingImages || [];
      requestData.constructs = requestData.constructs || [];
      requestData.linkedRequests = requestData.linkedRequests || [];

      return SampleDescription.filter({ requestId: requestID }).run();
    })
    .then((samples) => {
      // const foundSamples = samples.filter((s) => {
      //   return s.requestId === requestID;
      // });

      // Convert to array of objects and sort
      const sortedSamples = samples
        .map((sample) => ({ ...sample }))
        .sort((a, b) => a.position - b.position);

      requestData.samples = sortedSamples;

      return res.render("requests/show", {
        request: requestData,
        admins: config.admins,
      });
    })
    .catch((err) => {
      console.error(`Error showing request ${requestID}:`, err);
      return renderError(err, res);
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
        return renderError(new Error("Request not found for editing."), res);
      }

      // Generate preview URLs for existing images
      request.supportingImages = (request.supportingImages || []).map((ri) => {
        ri.url = ri.getPreviewURL ? ri.getPreviewURL() : "#"; // Safely access getPreviewURL
        return ri;
      });

      // Sort samples by position
      request.samples = (request.samples || []).sort(
        (a, b) => a.position - b.position
      );
      request.constructs = request.constructs || []; // Ensure constructs array exists

      // Permission check: ensure user is creator or admin
      if (
        request.createdBy !== req.user.username &&
        !Util.isAdmin(req.user.username)
      ) {
        console.error(
          `Unauthorized edit attempt for request ${requestID} by ${req.user.username}`
        );
        return renderError(
          "You are not authorized to edit this request.",
          res,
          403
        );
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
        return renderError(
          "This request has already been assigned for action and cannot be edited.",
          res
        );
      }

      // Render the form with request data
      return res.render("requests/new", { request });
    })
    .catch((err) => {
      console.error(`Error editing request ${requestID}:`, err);
      return renderError(err, res);
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
        return renderError(new Error("Request not found for cloning."), res);
      }

      // Prepare data for cloning
      const clonedRequestData = { ...request };
      clonedRequestData.id = undefined; // Clear the ID for a new record
      clonedRequestData.janCode = undefined; // A new janCode will be generated on save
      clonedRequestData.createdAt = undefined;
      clonedRequestData.updatedAt = undefined;
      clonedRequestData.createdBy = req.user.username; // Set creator to current user
      clonedRequestData.isClone = true; // Flag for the view to indicate it's a clone

      // Process nested models for cloning, clearing their IDs and requestID
      clonedRequestData.supportingImages = (request.supportingImages || []).map(
        (img) => ({
          ...img,
          id: undefined,
          requestID: undefined, // Will be set when saving the new request
          url: img.getPreviewURL ? img.getPreviewURL() : "#", // Keep preview URL logic
        })
      );
      clonedRequestData.samples = (request.samples || []).map((sample) => ({
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
      return renderError(err, res);
    });
};

requests.delete = (req, res) => {
  const requestID = req.params.id;
  Request.get(requestID)
    .run() // First, get the request to ensure it exists
    .then((request) => {
      if (!request) {
        console.error(`Request not found for deletion: ${requestID}`);
        return renderError(new Error("Request not found for deletion."), res);
      }

      // Authorization check: only admin or creator can delete
      if (
        request.createdBy !== req.user.username &&
        !Util.isAdmin(req.user.username)
      ) {
        console.error(
          `Unauthorized delete attempt for request ${requestID} by ${req.user.username}`
        );
        return renderError(
          "You are not authorized to delete this request.",
          res,
          403
        );
      }

      // Use the existing `removeChildren` method for cleanup
      request
        .removeChildren() // This method should handle deleting associated SampleDescriptions, Samples, Images etc.
        .then(() => request.delete()) // Then delete the main request
        .then(() => {
          // Redirect to admin page, forcing a cache refresh
          res.redirect(`/admin?t=${new Date().getTime()}`);
        })
        .catch((err) => {
          console.error(
            `Error deleting request ${requestID} and its children:`,
            err
          );
          return renderError(err, res);
        });
    })
    .catch((err) => {
      console.error(`Error retrieving request ${requestID} for deletion:`, err);
      return renderError(err, res);
    });
};

module.exports = requests;
