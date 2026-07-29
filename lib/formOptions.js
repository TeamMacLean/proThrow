/**
 * Single source of truth for the submission form's dropdown options.
 *
 * Consumed by both the React form (public/js/components/MyForm.js) and the
 * Express controller (controllers/requests.js). Keeping one copy is what makes
 * server-side whitelist validation possible without the two drifting apart.
 *
 * CommonJS so that Node and webpack/babel can both load it.
 */

const FORM_OPTIONS = {
  tissue: [
    "seedlings",
    "leaves",
    "Ecoli culture (recombinant protein)",
    "rosette",
    "roots",
    "cell culture",
    "callus",
    "flower",
  ],
  tissueAgeType: ["hour(s)", "day(s)", "week(s)"],
  growthConditions: [
    "plate",
    "culture",
    "liquid",
    "6well",
    "soil grown",
    "hydrophonics",
  ],
  analysisType: ["Discovery", "SRM", "PRM", "DIA", "Acurate Mass"],
  secondaryAnalysisType: [
    "None",
    "Discovery",
    "SRM",
    "PRM",
    "DIA",
    "Acurate Mass",
  ],
  typeOfPTM: [
    "None",
    "Biotinylation",
    "Phosphorylation",
    "Acetylation",
    "Ubiquitination",
    "Glycosylation",
    "Poly ADP Ribosylation",
  ],
  quantitativeAnalysisRequired: ["None", "Semi", "Relative", "Absolute"],
  typeOfLabeling: ["None", "Label-free", "Post-extraction", "Metabolic"],
  labelUsed: ["None", "TMT0", "TMT6", "TMT10", "iTRAQ", "15N"],
  samplePrep: [
    "crude extract",
    "microsomal",
    "plasma membrane",
    "IP",
    "HPLC purified",
    "FPLC purified",
  ],
  digestion: ["in gel", "on bead", "in solution"],
  enzyme: ["Trypsin", "AspN", "Trypsin AspN", "LysC", "Trypsin LysC"],
};

/**
 * The lifecycle states a request can be in, in the order they are offered.
 *
 * Single source of truth for the admin status dropdown, the Request model's
 * `statuses` constants and the socket handler that applies a change. The view
 * used to hard-code its own copy, and two entries disagreed with the values
 * they were compared against - "analysis in progress " had a trailing space and
 * "Data analysed" a capital D - so those options never showed as selected.
 */
const REQUEST_STATUSES = [
  "incomplete",
  "samples received",
  "samples digested",
  "samples queued",
  "analysis in progress",
  "data analysed",
  "samples used up",
  "discarded",
  "complete",
];

/**
 * Maximum accepted length for each free-text field.
 *
 * Multer's fieldSize limit is 5MB, which is far more than any of these fields
 * legitimately needs; without per-field caps a single request can store
 * megabytes of text that then has to render in the admin table and in emails.
 */
const FIELD_MAX_LENGTHS = {
  species: 200,
  secondSpecies: 200,
  speciesTaxId: 32,
  secondSpeciesTaxId: 32,
  tissueAgeNum: 10,
  projectDescription: 10000,
  hopedAnalysis: 10000,
  bufferComposition: 2000,
  janCode: 64,
  note: 5000,
  accession: 500,
  sequenceInfo: 20000,
  dbEntry: 500,
  sampleNumber: 32,
  sampleLabel: 500,
  sampleDescription: 2000,
  imageDescription: 100,
  imageName: 255,
};

module.exports = { FORM_OPTIONS, FIELD_MAX_LENGTHS, REQUEST_STATUSES };
