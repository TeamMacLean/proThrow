/**
 * Unit tests for lib/validation.js.
 *
 * These import the real module rather than restating its logic, so a change in
 * the controller's validation actually shows up here.
 */

const {
  firstScalar,
  toStringArray,
  toObjectArray,
  validateRequestFields,
  validateJanCode,
  validateConstructArrays,
  validateSampleArrays,
  MAX_SAMPLE_ROWS,
  MAX_CONSTRUCT_ROWS,
} = require("../../lib/validation");
const { FORM_OPTIONS } = require("../../lib/formOptions");

/** A payload that passes every check, as a starting point for the failure cases. */
const validBody = (overrides = {}) => ({
  species: "Homo sapiens",
  secondSpecies: "",
  projectDescription: "desc",
  hopedAnalysis: "hopes",
  bufferComposition: "buffer",
  tissueAgeNum: "10",
  tissue: "leaves",
  tissueAgeType: "day(s)",
  growthConditions: "soil grown",
  analysisType: "Discovery",
  secondaryAnalysisType: "None",
  typeOfPTM: "None",
  quantitativeAnalysisRequired: "None",
  typeOfLabeling: "None",
  labelUsed: "None",
  samplePrep: "IP",
  digestion: "in gel",
  enzyme: "Trypsin",
  ...overrides,
});

describe("firstScalar", () => {
  it("returns a plain string unchanged", () => {
    expect(firstScalar("hello")).toBe("hello");
  });

  // multer's append-field turns a duplicated field name into an array; taking
  // the first entry is what stops an array reaching the database.
  it("collapses a duplicated field to its first value", () => {
    expect(firstScalar(["first", "second"])).toBe("first");
  });

  it("returns an empty string for null and undefined", () => {
    expect(firstScalar(null)).toBe("");
    expect(firstScalar(undefined)).toBe("");
  });

  it("coerces non-strings", () => {
    expect(firstScalar(42)).toBe("42");
  });
});

describe("toStringArray", () => {
  it("passes an array through", () => {
    expect(toStringArray(["a", "b"])).toEqual(["a", "b"]);
  });

  it("wraps a single scalar", () => {
    expect(toStringArray("only")).toEqual(["only"]);
  });

  it("converts the indexed-object form", () => {
    expect(toStringArray({ 0: "a", 1: "b" })).toEqual(["a", "b"]);
  });

  it("returns an empty array for absent values", () => {
    expect(toStringArray(undefined)).toEqual([]);
    expect(toStringArray(null)).toEqual([]);
  });
});

describe("toObjectArray", () => {
  it("keeps object entries", () => {
    expect(toObjectArray([{ id: "1" }])).toEqual([{ id: "1" }]);
  });

  it("converts the indexed-object form", () => {
    expect(toObjectArray({ 0: { id: "1" }, 1: { id: "2" } })).toEqual([
      { id: "1" },
      { id: "2" },
    ]);
  });

  it("discards entries that are not objects", () => {
    expect(toObjectArray(["nope", 5, null, { id: "1" }])).toEqual([{ id: "1" }]);
  });

  it("returns an empty array when the field is missing", () => {
    expect(toObjectArray(undefined)).toEqual([]);
  });
});

describe("validateRequestFields", () => {
  it("accepts a complete, valid payload", () => {
    const { errors, values } = validateRequestFields(validBody());
    expect(errors).toEqual([]);
    expect(values.species).toBe("Homo sapiens");
    expect(values.digestion).toBe("in gel");
  });

  it("rejects a select value that is not on the list", () => {
    const { errors } = validateRequestFields(
      validBody({ enzyme: "something invented" })
    );
    expect(errors.join(" ")).toContain('"enzyme"');
  });

  it("requires species but not secondSpecies", () => {
    expect(validateRequestFields(validBody({ species: "" })).errors).toContain(
      '"species" is required.'
    );
    expect(
      validateRequestFields(validBody({ secondSpecies: "" })).errors
    ).toEqual([]);
  });

  // Legacy records may hold values that predate the current dropdowns; if the
  // server refused them the admin team could never open those records to fix
  // anything else.
  it("accepts an off-list value on edit when it matches what is stored", () => {
    const existing = { digestion: "a historic technique" };
    const { errors } = validateRequestFields(
      validBody({ digestion: "a historic technique" }),
      { isEdit: true, existing }
    );
    expect(errors).toEqual([]);
  });

  it("still rejects a new off-list value on edit", () => {
    const existing = { digestion: "a historic technique" };
    const { errors } = validateRequestFields(
      validBody({ digestion: "a different invention" }),
      { isEdit: true, existing }
    );
    expect(errors.join(" ")).toContain('"digestion"');
  });

  it("rejects an over-long free text field", () => {
    const { errors } = validateRequestFields(
      validBody({ projectDescription: "x".repeat(10001) })
    );
    expect(errors.join(" ")).toContain('"projectDescription"');
  });

  it("rejects a non-numeric tissue age", () => {
    expect(
      validateRequestFields(validBody({ tissueAgeNum: "ten" })).errors.join(" ")
    ).toContain("tissueAgeNum");
    expect(
      validateRequestFields(validBody({ tissueAgeNum: "-4" })).errors.join(" ")
    ).toContain("tissueAgeNum");
  });

  // The old form had no step constraint, so fractional ages exist in the
  // database; refusing them would make those records uneditable.
  it("grandfathers a fractional tissue age on edit when it is unchanged", () => {
    const existing = { tissueAgeNum: "1.5" };
    expect(
      validateRequestFields(validBody({ tissueAgeNum: "1.5" }), {
        isEdit: true,
        existing,
      }).errors
    ).toEqual([]);
  });

  it("still rejects a new fractional tissue age on edit", () => {
    const existing = { tissueAgeNum: "1.5" };
    expect(
      validateRequestFields(validBody({ tissueAgeNum: "2.5" }), {
        isEdit: true,
        existing,
      }).errors.join(" ")
    ).toContain("tissueAgeNum");
  });

  // Browsers serialise textarea newlines as CRLF, so text accepted at exactly
  // the client-side maxLength arrives longer than the server limit.
  it("does not reject text that only exceeds the limit because of CRLF", () => {
    const lines = Array.from({ length: 500 }, () => "x".repeat(19)).join("\r\n");
    expect(lines.length).toBeGreaterThan(10000);
    const { errors, values } = validateRequestFields(
      validBody({ projectDescription: lines })
    );
    expect(errors).toEqual([]);
    expect(values.projectDescription).not.toContain("\r");
  });

  it("collapses a duplicated select field before validating", () => {
    const { errors, values } = validateRequestFields(
      validBody({ enzyme: ["Trypsin", "LysC"] })
    );
    expect(errors).toEqual([]);
    expect(values.enzyme).toBe("Trypsin");
  });

  it("checks every field the form offers", () => {
    const body = validBody();
    for (const field of Object.keys(FORM_OPTIONS)) {
      const { errors } = validateRequestFields({ ...body, [field]: "bogus" });
      expect(errors.join(" ")).toContain(`"${field}"`);
    }
  });
});

describe("validateJanCode", () => {
  it("accepts a generated code", () => {
    expect(validateJanCode("gd250728A")).toBeNull();
  });

  it("rejects an empty code", () => {
    expect(validateJanCode("")).toMatch(/required/);
  });

  it("rejects markup and whitespace", () => {
    expect(validateJanCode("<b>x</b>")).toMatch(/only contain/);
    expect(validateJanCode("has space")).toMatch(/only contain/);
  });
});

describe("validateConstructArrays", () => {
  it("accepts matched arrays", () => {
    expect(validateConstructArrays(["A"], ["SEQ"], ["DB"])).toEqual([]);
  });

  // Position-matched arrays of different lengths mean the server cannot know
  // which sequence belongs to which accession.
  it("rejects mismatched lengths", () => {
    expect(validateConstructArrays(["A", "B"], ["SEQ"], ["DB"])).toHaveLength(1);
  });

  it("rejects an over-long sequence", () => {
    const errors = validateConstructArrays(["A"], ["x".repeat(20001)], ["DB"]);
    expect(errors.join(" ")).toContain("amino acid sequence");
  });

  // Each row costs a database round trip, so an unbounded list is a way to tie
  // up the server with one request.
  it("caps the number of constructs", () => {
    const many = (v) => Array.from({ length: MAX_CONSTRUCT_ROWS + 1 }, () => v);
    const errors = validateConstructArrays(many("A"), many("S"), many("D"));
    expect(errors.join(" ")).toContain("at most");
  });
});

describe("validateSampleArrays", () => {
  it("accepts matched arrays", () => {
    expect(validateSampleArrays(["1"], ["label"], ["desc"])).toEqual([]);
  });

  it("rejects mismatched lengths", () => {
    expect(validateSampleArrays(["1", "2"], ["label"], ["desc"])).toHaveLength(
      1
    );
  });

  it("rejects an over-long sample description", () => {
    const errors = validateSampleArrays(["1"], ["l"], ["x".repeat(2001)]);
    expect(errors.join(" ")).toContain("sample description");
  });

  it("caps the number of samples", () => {
    const many = (v) => Array.from({ length: MAX_SAMPLE_ROWS + 1 }, () => v);
    const errors = validateSampleArrays(many("1"), many("l"), many("d"));
    expect(errors.join(" ")).toContain("at most");
  });
});
