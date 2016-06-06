var thinky = require('../lib/thinky.js');
var type = thinky.type;

var Request = thinky.createModel("Request", {
  id: type.string(),
  uuid: type.string(),
  complete: type.boolean().default(false),
  species: type.string().required(),
  searchDatabase: type.string().required(),
  tissue: type.string().required(),
  tissueAgeNum: type.string().required(),
  tissueAgeType: type.string().required(),
  growthConditions: type.string().required(),
  samplePrep: type.string().required(),
  analysisType: type.string().required(),
  quantitativeAnalysisRequired: type.string().required(),
  typeOfLabeling: type.string().required(),
  labelUsed: type.string().required(),
  digestion: type.string().required(),
  typeOfPTM: type.string().required(),
  typeOfDigestion: type.string().required(),
  sequenceInfo: type.string().required(),
  preferredOrder: type.string().required(),
  sampleNumber: type.string().required(),
  sampleDescription: type.string().required(),
  supportingImages: type.string().required(),
  supportingImageDescription: type.string().required(),
  notes: type.array().default([]).schema(type.string())
  //notes: [type.string()]
});



module.exports = Request;