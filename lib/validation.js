/**
 * Payload validation for the request submission form.
 *
 * The form is a multipart POST built by hand in the browser, so nothing about
 * the shape of req.body can be trusted: fields may be absent, duplicated into
 * arrays by multer's append-field parsing, or crafted entirely by a client that
 * never loaded the form. Everything below runs before any value reaches thinky.
 *
 * Enum policy (agreed with the proteomics team): strict on create, lenient on
 * edit. A new request must use current dropdown values; an edit additionally
 * accepts whatever is already stored, so admins can still open and correct
 * legacy records whose values predate the current option lists.
 */

const { FORM_OPTIONS, FIELD_MAX_LENGTHS } = require("./formOptions");

// Generated codes are initials + YYMMDD + an optional disambiguating letter.
// Deliberately permissive so historic codes still validate, but it rejects
// empty values, whitespace and anything that could carry markup.
const JAN_CODE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

// Each row costs a database round trip on save, so an unbounded list is a way
// to tie up the server with a single request. The form's own sample number
// input tops out at 150.
const MAX_SAMPLE_ROWS = 200;
const MAX_CONSTRUCT_ROWS = 100;

/**
 * Normalise the line endings a browser produces when serialising a textarea.
 *
 * Browsers convert newlines to CRLF in multipart bodies, so text the client
 * accepted at exactly its maxLength arrives longer than the limit and would be
 * rejected with a message the user cannot act on.
 *
 * @param {string} value
 * @returns {string}
 */
function normaliseNewlines(value) {
  return typeof value === "string" ? value.replace(/\r\n/g, "\n") : value;
}

/**
 * Multer's append-field turns a duplicated field name into an array. Any field
 * we expect to be a single scalar has to be collapsed before use, or a client
 * that sends `species` twice gets an array into the database.
 *
 * @param {*} value
 * @returns {string} the first value, coerced to a string
 */
function firstScalar(value) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === undefined || candidate === null) return "";
  return typeof candidate === "string" ? candidate : String(candidate);
}

/**
 * Coerce anything append-field might produce for a repeated field into a real
 * array of strings. Handles arrays, the `{0: 'a', 1: 'b'}` object form, a bare
 * scalar (single occurrence), and absent values.
 *
 * @param {*} value
 * @returns {string[]}
 */
function toStringArray(value) {
  if (value === undefined || value === null) return [];
  let list;
  if (Array.isArray(value)) {
    list = value;
  } else if (typeof value === "object") {
    list = Object.values(value);
  } else {
    list = [value];
  }
  return list.map((entry) =>
    typeof entry === "string" ? entry : entry === undefined || entry === null ? "" : String(entry)
  );
}

/**
 * Coerce a repeated nested field (preExistingSupportingImages[0][id]) into an
 * array of plain objects, discarding anything that isn't object-shaped.
 *
 * @param {*} value
 * @returns {object[]}
 */
function toObjectArray(value) {
  if (value === undefined || value === null) return [];
  const list = Array.isArray(value)
    ? value
    : typeof value === "object"
      ? Object.values(value)
      : [];
  return list.filter(
    (entry) => entry && typeof entry === "object" && !Array.isArray(entry)
  );
}

/**
 * @param {string} value
 * @param {number} max
 * @returns {boolean}
 */
function withinLength(value, max) {
  return typeof value === "string" && value.length <= max;
}

/**
 * Validate and normalise the core scalar fields of a request.
 *
 * @param {object} body - req.body
 * @param {object} [options]
 * @param {boolean} [options.isEdit] - whether this is an edit of an existing request
 * @param {object} [options.existing] - the currently stored request, for lenient enum checks
 * @returns {{errors: string[], values: object}}
 */
function validateRequestFields(body, { isEdit = false, existing = null } = {}) {
  const errors = [];
  const values = {};

  // --- Enum-backed selects ---
  for (const [field, allowed] of Object.entries(FORM_OPTIONS)) {
    const value = firstScalar(body[field]).trim();
    values[field] = value;

    if (allowed.includes(value)) continue;

    // On edit, a value that matches what is already stored is grandfathered in
    // so legacy records stay editable.
    if (isEdit && existing && value === existing[field]) continue;

    errors.push(
      `"${field}" must be one of: ${allowed.join(", ")}${
        isEdit ? " (or unchanged from the stored value)" : ""
      }.`
    );
  }

  // --- Free text ---
  const freeText = [
    "species",
    "secondSpecies",
    "speciesTaxId",
    "secondSpeciesTaxId",
    "projectDescription",
    "hopedAnalysis",
    "bufferComposition",
  ];
  for (const field of freeText) {
    const value = normaliseNewlines(firstScalar(body[field]).trim());
    if (!withinLength(value, FIELD_MAX_LENGTHS[field])) {
      errors.push(
        `"${field}" must be ${FIELD_MAX_LENGTHS[field]} characters or fewer.`
      );
      continue;
    }
    values[field] = value;
  }

  // Species is the one free-text field that is genuinely mandatory; the second
  // species is optional by design, since most submissions have a single species.
  if (!values.species) {
    errors.push('"species" is required.');
  }

  // --- Tissue age ---
  // Grandfathered on edit like the selects above: the old form had no step
  // constraint, so values such as "1.5" exist in the database, and refusing
  // them would leave those records permanently uneditable.
  const tissueAgeNum = firstScalar(body.tissueAgeNum).trim();
  const tissueAgeUnchanged =
    isEdit && existing && tissueAgeNum === String(existing.tissueAgeNum ?? "");
  if (!/^\d{1,10}$/.test(tissueAgeNum) && !tissueAgeUnchanged) {
    errors.push('"tissueAgeNum" must be a whole number of 10 digits or fewer.');
  }
  values.tissueAgeNum = tissueAgeNum;

  return { errors, values };
}

/**
 * Validate a JAN code supplied by an admin editing a request.
 *
 * @param {string} janCode
 * @returns {string|null} an error message, or null when valid
 */
function validateJanCode(janCode) {
  if (!janCode) return "A label (JAN code) is required.";
  if (!JAN_CODE_PATTERN.test(janCode)) {
    return "The label (JAN code) may only contain letters, numbers, hyphens and underscores.";
  }
  return null;
}

/**
 * Validate the parallel construct arrays.
 *
 * The three arrays are position-matched, so a length mismatch means the browser
 * sent something we cannot safely pair up and we must not guess.
 *
 * @param {string[]} accessions
 * @param {string[]} sequenceInfos
 * @param {string[]} dbEntries
 * @returns {string[]} error messages
 */
function validateConstructArrays(accessions, sequenceInfos, dbEntries) {
  const errors = [];
  if (
    accessions.length !== sequenceInfos.length ||
    accessions.length !== dbEntries.length
  ) {
    errors.push(
      "Construct fields are mismatched; please reload the form and try again."
    );
    return errors;
  }
  if (accessions.length > MAX_CONSTRUCT_ROWS) {
    errors.push(`A request may have at most ${MAX_CONSTRUCT_ROWS} constructs.`);
    return errors;
  }
  accessions.forEach((accession, i) => {
    if (!withinLength(accession, FIELD_MAX_LENGTHS.accession)) {
      errors.push(`Construct ${i + 1}: accession is too long.`);
    }
    if (!withinLength(sequenceInfos[i], FIELD_MAX_LENGTHS.sequenceInfo)) {
      errors.push(`Construct ${i + 1}: amino acid sequence is too long.`);
    }
    if (!withinLength(dbEntries[i], FIELD_MAX_LENGTHS.dbEntry)) {
      errors.push(`Construct ${i + 1}: database entry is too long.`);
    }
  });
  return errors;
}

/**
 * Validate the parallel sample arrays.
 *
 * @param {string[]} sampleNumbers
 * @param {string[]} sampleLabels
 * @param {string[]} sampleDescriptions
 * @returns {string[]} error messages
 */
function validateSampleArrays(sampleNumbers, sampleLabels, sampleDescriptions) {
  const errors = [];
  if (
    sampleNumbers.length !== sampleLabels.length ||
    sampleNumbers.length !== sampleDescriptions.length
  ) {
    errors.push(
      "Sample fields are mismatched; please reload the form and try again."
    );
    return errors;
  }
  if (sampleNumbers.length > MAX_SAMPLE_ROWS) {
    errors.push(`A request may have at most ${MAX_SAMPLE_ROWS} samples.`);
    return errors;
  }
  sampleNumbers.forEach((number, i) => {
    if (!withinLength(number, FIELD_MAX_LENGTHS.sampleNumber)) {
      errors.push(`Sample ${i + 1}: sample number is too long.`);
    }
    if (!withinLength(sampleLabels[i], FIELD_MAX_LENGTHS.sampleLabel)) {
      errors.push(`Sample ${i + 1}: sample label is too long.`);
    }
    if (
      !withinLength(sampleDescriptions[i], FIELD_MAX_LENGTHS.sampleDescription)
    ) {
      errors.push(`Sample ${i + 1}: sample description is too long.`);
    }
  });
  return errors;
}

module.exports = {
  firstScalar,
  toStringArray,
  toObjectArray,
  normaliseNewlines,
  MAX_SAMPLE_ROWS,
  MAX_CONSTRUCT_ROWS,
  validateRequestFields,
  validateJanCode,
  validateConstructArrays,
  validateSampleArrays,
  JAN_CODE_PATTERN,
};
