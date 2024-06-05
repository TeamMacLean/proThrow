const Request = require("../models/request");
const Util = require("../lib/util");
const config = require("../config");
const Email = require("../lib/email");
const SampleDescription = require("../models/sampleDescription");
const SampleImage = require("../models/sampleImage");
const Construct = require("../models/construct");

const renderError = require("../lib/renderError");

var requests = {};

function fillFieldsFromForm(req, request) {
  request.species = req.body.species;
  request.secondSpecies = req.body.secondSpecies;
  request.tissue = req.body.tissue;
  request.tissueAgeNum = req.body.tissueAgeNum;
  request.tissueAgeType = req.body.tissueAgeType;
  request.growthConditions = req.body.growthConditions;
  request.analysisType = req.body.analysisType;
  request.secondaryAnalysisType = req.body.secondaryAnalysisType;
  request.typeOfPTM = req.body.typeOfPTM;
  request.quantitativeAnalysisRequired = req.body.quantitativeAnalysisRequired;
  request.typeOfLabeling = req.body.typeOfLabeling;
  request.labelUsed = req.body.labelUsed;
  request.samplePrep = req.body.samplePrep;
  request.digestion = req.body.digestion;
  request.enzyme = req.body.enzyme;
  request.projectDescription = req.body.projectDescription;
  request.hopedAnalysis = req.body.hopedAnalysis;
  request.bufferComposition = req.body.bufferComposition;

  return request;
}

requests.new = (req, res, next) => res.render("requests/new");

requests.newPost = async (req, res) => {
  try {
    const username = req.user.username;

    // probably not needed to transform but extra safe
    const reqBody = Object.assign({}, req.body);

    //console.log("BACKEND RESULT", reqBody);

    res.send(reqBody);
    return;

    /////// BELOW NOT NEEDED YET //////////

    let request;

    if (req.body.requestID) {
      request = await Request.findById(req.body.requestID);
      await request.removeChildren();
      request.janCode = req.body.janCode;
      request = fillFieldsFromForm(req, request);
      await request.save();
      await processIt(request, false);
    } else {
      const janCode = await Util.generateJanCode(
        req.user.firstName,
        req.user.lastName,
        req.user.username
      );
      request = new Request({
        createdBy: username,
        janCode: janCode,
      });
      request = fillFieldsFromForm(req, request);
      await request.save();
      await processIt(request, true);
    }

    async function processIt(savedRequest, isNew) {
      const {
        "image[]": bodyImages,
        "imageDescription[]": bodyImageDescriptions,
        "imageName[]": bodyImageName,
        "imagePath[]": bodyImagePath,
        "sampleNumber[]": bodySampleNumbers,
        "sampleDescription[]": bodySampleDescriptions,
        "sampleLabel[]": bodySampleLabels,
        "accession[]": bodyConstructAccession,
        "sequenceInfo[]": bodyConstructSequenceInfo,
        "dbEntry[]": bodyConstructDBEntry,
      } = req.body;

      // Ensure all fields are arrays
      const images = Array.isArray(bodyImages) ? bodyImages : [bodyImages];
      const imageDescriptions = Array.isArray(bodyImageDescriptions)
        ? bodyImageDescriptions
        : [bodyImageDescriptions];
      const imageNames = Array.isArray(bodyImageName)
        ? bodyImageName
        : [bodyImageName];
      const imagePaths = Array.isArray(bodyImagePath)
        ? bodyImagePath
        : [bodyImagePath];
      const sampleNumbers = Array.isArray(bodySampleNumbers)
        ? bodySampleNumbers
        : [bodySampleNumbers];
      const sampleDescriptions = Array.isArray(bodySampleDescriptions)
        ? bodySampleDescriptions
        : [bodySampleDescriptions];
      const sampleLabels = Array.isArray(bodySampleLabels)
        ? bodySampleLabels
        : [bodySampleLabels];
      const constructAccessions = Array.isArray(bodyConstructAccession)
        ? bodyConstructAccession
        : [bodyConstructAccession];
      const constructSequenceInfos = Array.isArray(bodyConstructSequenceInfo)
        ? bodyConstructSequenceInfo
        : [bodyConstructSequenceInfo];
      const constructDbEntries = Array.isArray(bodyConstructDBEntry)
        ? bodyConstructDBEntry
        : [bodyConstructDBEntry];

      // Process constructs
      if (constructAccessions.length > 0) {
        await Promise.all(
          constructAccessions.map((accession, i) => {
            const c = new Construct({
              requestID: savedRequest.id,
              accession,
              sequenceInfo: constructSequenceInfos[i],
              dbEntry: constructDbEntries[i],
            });
            return c.save();
          })
        ).catch(console.error);
      }

      // Process images
      if (images.length > 0) {
        await Promise.all(
          images.map((img, i) => {
            const image = new SampleImage({
              path: imagePaths[i],
              name: imageNames[i],
              uid: img,
              description: imageDescriptions[i],
              requestID: savedRequest.id,
            });
            return image.save();
          })
        ).catch(console.error);
      }

      // Process samples
      if (sampleNumbers.length > 0) {
        await Promise.all(
          sampleNumbers.map((num, i) => {
            const sample = new SampleDescription({
              requestID: savedRequest.id,
              position: i,
              sampleNumber: num,
              sampleLabel: sampleLabels[i],
              sampleDescription: sampleDescriptions[i],
            });
            return sample.save();
          })
        ).catch(console.error);
      }

      // Send email notification
      if (isNew) {
        Email.newRequest(savedRequest);
      } else {
        Email.updatedRequest(savedRequest);
      }

      return res.render("requests/newPost", { uuid: savedRequest.janCode });
    }
  } catch (err) {
    console.error(err); // Log the error for debugging
    return renderError(err, res);
  }
};

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
