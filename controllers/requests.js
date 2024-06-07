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

    // Initialise the request, default to empty
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
      imageDescriptions = [],
      imageNames = [],
      accessions = [],
      sequenceInfos = [],
      dbEntries = [],
      sampleNumbers = [],
      sampleLabels = [],
      sampleDescriptions = [],
    } = req.body;

    // bug to fix: receiving array of 2 identical strings with target value
    const requestID =
      req.body.requestID && req.body.requestID.length > 0
        ? req.body.requestID[0]
        : null;
    // another identical bug to fix: receiving array of 2 identical strings with target value
    const janCode =
      req.body.janCode && req.body.janCode.length > 0
        ? req.body.janCode[0]
        : null;

    let request;

    const editingForm = !!requestID;

    let newJanCode = "";

    if (editingForm) {
      request = await Request.get(requestID);
      await request.removeChildren();
      Object.assign(request, {
        janCode,
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
      await request.save();
    } else {
      newJanCode = await Util.generateJanCode(
        req.user.firstName,
        req.user.lastName,
        req.user.username
      );
      request = new Request({
        createdBy: username,
        janCode: newJanCode,
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
      await request.save();
    }

    // Process constructs
    if (accessions.length) {
      await Promise.all(
        accessions.map((accession, i) =>
          new Construct({
            requestID: request.id,
            accession,
            sequenceInfo: sequenceInfos[i],
            dbEntry: dbEntries[i],
          }).save()
        )
      );
    }

    // Process samples
    if (sampleNumbers.length > 0) {
      await Promise.all(
        sampleNumbers.map((num, i) =>
          new SampleDescription({
            requestID: request.id,
            position: i,
            sampleNumber: num,
            sampleLabel: sampleLabels[i],
            sampleDescription: sampleDescriptions[i],
          }).save()
        )
      );
    }

    // Process images
    if (req.files.length && imageNames.length) {
      await Promise.all(
        imageNames.map((imageName, imageNameIndex) => {
          const imageFile = req.files[imageNameIndex * 2];
          return new SampleImage({
            path: imageFile.path,
            name: imageFile.originalname || imageName,
            uid: imageFile.filename,
            description: imageDescriptions[imageNameIndex],
            requestID: request.id,
          }).save();
        })
      );
    }

    const oldOrNewRequestID = requestID || request.id;
    const oldOrNewJanCode =
      janCode || request.janCode || newJanCode || "probably";

    // Send email notification
    if (!requestID) {
      console.log("send email for new request", oldOrNewRequestID);
      Email.newRequest(request);
    } else {
      console.log("send email for updated request", oldOrNewRequestID);
      Email.updatedRequest(request);
    }

    res.status(200).json({
      requestID: oldOrNewRequestID,
      janCode: oldOrNewJanCode,
      editingForm,
    });
    //.json({ redirectUrl: `/user/${username}` });
  } catch (err) {
    console.error(err);
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
