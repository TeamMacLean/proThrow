/**
 * Unit tests for the request controller's helper functions.
 *
 * These import the real implementations from controllers/requests.js. The
 * previous version of this file re-declared copies of each function inside the
 * test, which meant the suite stayed green no matter what the controller did.
 */

const thinky = require("../../lib/thinky");
const {
  normalizeNotes,
  isTruthyFlag,
  pairUploadedFiles,
  MAX_NOTES,
} = require("../../controllers/requests")._internal;

afterAll(async () => {
  // Requiring the controller pulls in the models, which open a connection pool.
  if (thinky.r && thinky.r.getPoolMaster) {
    try {
      await thinky.r.getPoolMaster().drain();
    } catch (_e) {
      // Ignore errors during cleanup
    }
  }
});

describe("normalizeNotes", () => {
  it("handles notes as an array", () => {
    expect(normalizeNotes(["Note 1", "Note 2"])).toEqual(["Note 1", "Note 2"]);
  });

  it("handles notes as an object (form data format)", () => {
    expect(normalizeNotes({ 0: "Note 1", 1: "Note 2" })).toEqual([
      "Note 1",
      "Note 2",
    ]);
  });

  it("filters out empty and whitespace-only notes", () => {
    expect(normalizeNotes(["Note 1", "", "   ", "\t\n", "Note 2"])).toEqual([
      "Note 1",
      "Note 2",
    ]);
  });

  it("handles null, undefined and empty collections", () => {
    expect(normalizeNotes(null)).toEqual([]);
    expect(normalizeNotes(undefined)).toEqual([]);
    expect(normalizeNotes([])).toEqual([]);
    expect(normalizeNotes({})).toEqual([]);
  });

  it("preserves leading and trailing whitespace on kept notes", () => {
    expect(normalizeNotes(["  Note with spaces  "])).toEqual([
      "  Note with spaces  ",
    ]);
  });

  // A crafted payload can nest an object under notes[0]; calling .trim() on it
  // used to throw and turn the whole submission into a 500.
  it("discards entries that are not strings instead of throwing", () => {
    expect(() =>
      normalizeNotes(["ok", { nested: "object" }, 42, null, undefined])
    ).not.toThrow();
    expect(normalizeNotes(["ok", { nested: "object" }, 42])).toEqual(["ok"]);
  });

  it("truncates an over-long note rather than storing megabytes", () => {
    const [note] = normalizeNotes(["x".repeat(20000)]);
    expect(note.length).toBe(5000);
  });

  it("caps the number of notes", () => {
    const many = Array.from({ length: MAX_NOTES + 50 }, (_, i) => `note ${i}`);
    expect(normalizeNotes(many)).toHaveLength(MAX_NOTES);
  });
});

describe("isTruthyFlag", () => {
  it("recognises the values a checkbox or hidden flag can send", () => {
    expect(isTruthyFlag("true")).toBe(true);
    expect(isTruthyFlag("TRUE")).toBe(true);
    expect(isTruthyFlag("1")).toBe(true);
    expect(isTruthyFlag("on")).toBe(true);
  });

  it("treats an absent or negative value as false", () => {
    expect(isTruthyFlag(undefined)).toBe(false);
    expect(isTruthyFlag("")).toBe(false);
    expect(isTruthyFlag("false")).toBe(false);
    expect(isTruthyFlag("0")).toBe(false);
  });

  it("collapses a duplicated flag", () => {
    expect(isTruthyFlag(["true", "false"])).toBe(true);
  });
});

describe("pairUploadedFiles", () => {
  // Pairing on the field-name index rather than on position in req.files is
  // what stops a reordered or partial upload attaching a description to the
  // wrong image.
  it("groups an image with its preview by index", () => {
    const files = [
      { fieldname: "image[0]", filename: "a.jpg" },
      { fieldname: "preview[0]", filename: "a-preview.jpg" },
      { fieldname: "image[1]", filename: "b.jpg" },
      { fieldname: "preview[1]", filename: "b-preview.jpg" },
    ];

    const pairs = pairUploadedFiles(files);
    expect(pairs.size).toBe(2);
    expect(pairs.get(0).image.filename).toBe("a.jpg");
    expect(pairs.get(0).preview.filename).toBe("a-preview.jpg");
    expect(pairs.get(1).image.filename).toBe("b.jpg");
  });

  it("pairs correctly even when the files arrive out of order", () => {
    const files = [
      { fieldname: "preview[1]", filename: "b-preview.jpg" },
      { fieldname: "image[0]", filename: "a.jpg" },
      { fieldname: "image[1]", filename: "b.jpg" },
      { fieldname: "preview[0]", filename: "a-preview.jpg" },
    ];

    const pairs = pairUploadedFiles(files);
    expect(pairs.get(0).image.filename).toBe("a.jpg");
    expect(pairs.get(0).preview.filename).toBe("a-preview.jpg");
    expect(pairs.get(1).image.filename).toBe("b.jpg");
    expect(pairs.get(1).preview.filename).toBe("b-preview.jpg");
  });

  it("keeps an image whose preview failed to upload", () => {
    const pairs = pairUploadedFiles([
      { fieldname: "image[0]", filename: "a.jpg" },
    ]);
    expect(pairs.get(0).image.filename).toBe("a.jpg");
    expect(pairs.get(0).preview).toBeUndefined();
  });

  it("ignores unrelated field names", () => {
    const pairs = pairUploadedFiles([
      { fieldname: "somethingElse", filename: "x" },
      { fieldname: "image", filename: "y" },
    ]);
    expect(pairs.size).toBe(0);
  });

  it("handles a missing or non-array files value", () => {
    expect(pairUploadedFiles(undefined).size).toBe(0);
    expect(pairUploadedFiles(null).size).toBe(0);
  });
});
