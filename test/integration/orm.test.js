/**
 * Data-integrity tests for the hand-rolled ORM in lib/thinky.js.
 *
 * These cover failures that are invisible from the application layer: a save
 * that reports success without writing anything, a document quietly carrying
 * copies of its own children, and a schema default shared between documents.
 */

const thinky = require("../../lib/thinky");
const Request = require("../../models/request");
const SampleDescription = require("../../models/sampleDescription");
const Util = require("../../lib/util");
const { checkDatabaseAvailable } = require("../helpers/database");

let r;
let rethinkAvailable = false;
const created = [];

/** A minimal valid request. */
const newRequest = (overrides = {}) =>
  new Request({
    createdBy: "orm_test",
    janCode: `orm${Date.now()}${Math.floor(Math.random() * 1e6)}`,
    species: "Homo sapiens",
    secondSpecies: "",
    tissue: "leaves",
    tissueAgeNum: "10",
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
    projectDescription: "orm test",
    hopedAnalysis: "x",
    bufferComposition: "y",
    ...overrides,
  });

async function persist(request) {
  await request.save();
  created.push(request.id);
  return request;
}

beforeAll(async () => {
  r = thinky.r;
  rethinkAvailable = await checkDatabaseAvailable(r);
});

afterAll(async () => {
  if (rethinkAvailable) {
    for (const id of created) {
      try {
        const doomed = await Request.get(id);
        if (doomed) {
          await doomed.removeChildren();
          await doomed.delete();
        }
      } catch (_e) {
        // Ignore cleanup failures
      }
    }
  }
  if (r && r.getPoolMaster) {
    try {
      await r.getPoolMaster().drain();
    } catch (_e) {
      // Ignore errors during cleanup
    }
  }
});

describe("save() and joined relations", () => {
  // Regression: save() serialised the whole instance, and getJoin attaches
  // relations as ordinary properties - so every edit wrote full copies of the
  // child rows into the parent's own row. linkedRequests was the worst case,
  // because those siblings each carried their own embedded copies, so the
  // document grew every time it was saved.
  it("does not write joined children into the parent document", async () => {
    if (!rethinkAvailable) return;

    const request = await persist(newRequest());
    await new SampleDescription({
      requestID: request.id,
      position: 0,
      sampleNumber: "1",
      sampleLabel: "L",
      sampleDescription: "D",
    }).save();

    const joined = await Request.get(request.id)
      .getJoin({ samples: true, constructs: true, supportingImages: true })
      .run();
    expect(joined.samples).toHaveLength(1);

    joined.projectDescription = "edited";
    await joined.save();

    // Read the raw document, bypassing the ORM entirely.
    const raw = await r.table("Request").get(request.id).run();
    expect(raw.projectDescription).toBe("edited");
    expect(raw.samples).toBeUndefined();
    expect(raw.constructs).toBeUndefined();
    expect(raw.supportingImages).toBeUndefined();
  });

  it("still returns the relations on the in-memory instance", async () => {
    if (!rethinkAvailable) return;

    const request = await persist(newRequest());
    const joined = await Request.get(request.id).getJoin({ samples: true }).run();
    expect(Array.isArray(joined.samples)).toBe(true);
  });
});

describe("save() write results", () => {
  // Regression: rethinkdbdash reports write problems in the result body rather
  // than rejecting, so updating a deleted document returned {skipped: 1} and
  // the caller reported a clean success.
  it("throws when updating a document that no longer exists", async () => {
    if (!rethinkAvailable) return;

    const request = await persist(newRequest());
    const stale = await Request.get(request.id);

    await (await Request.get(request.id)).delete();

    stale.projectDescription = "written into the void";
    await expect(stale.save()).rejects.toThrow(/matched no document/i);
  });
});

describe("schema defaults", () => {
  // Regression: the default array was stored once on the schema and handed out
  // by reference, so pushing a note onto a document that had defaulted mutated
  // the default itself - and every later document started life carrying that
  // other request's note.
  it("gives each document its own copy of an array default", async () => {
    if (!rethinkAvailable) return;

    const first = newRequest();
    const second = newRequest();

    expect(first.notes).toEqual([]);
    expect(second.notes).toEqual([]);
    expect(first.notes).not.toBe(second.notes);

    first.notes.push("only on the first");

    expect(second.notes).toEqual([]);
    expect(newRequest().notes).toEqual([]);
  });

  it("keeps the default clean across a save", async () => {
    if (!rethinkAvailable) return;

    const first = await persist(newRequest());
    first.notes.push("first request's note");
    await first.save();

    const second = await persist(newRequest());
    expect(second.notes).toEqual([]);

    const raw = await r.table("Request").get(second.id).run();
    expect(raw.notes).toEqual([]);
  });
});

describe("Util.generateJanCode", () => {
  const originalRun = Request.run;

  afterEach(() => {
    Request.run = originalRun;
  });

  it("appends a suffix when the base code is taken", async () => {
    Request.run = async () => [{ janCode: "ab260729" }];
    const code = await Util.generateJanCode("Ada", "Bell", "abell");
    expect(code).toMatch(/^[a-z]+\d{6}[A-Z]?$/);
    expect(code).not.toBe("ab260729");
  });

  // Regression: the old loop indexed past the end of the suffix alphabet once
  // 26 codes were taken, produced a code ending in the literal "undefined",
  // and then span forever - blocking the event loop for the whole process.
  it("rejects instead of hanging when every suffix is taken", async () => {
    const base = await (async () => {
      Request.run = async () => [];
      return Util.generateJanCode("Ada", "Bell", "abell");
    })();

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    Request.run = async () => [
      { janCode: base },
      ...alphabet.map((letter) => ({ janCode: base + letter })),
    ];

    await expect(
      Util.generateJanCode("Ada", "Bell", "abell")
    ).rejects.toThrow(/already in use/i);
  });

  it("never produces a code containing 'undefined'", async () => {
    Request.run = async () => [{ janCode: "ab260729" }];
    const code = await Util.generateJanCode("Ada", "Bell", "abell");
    expect(code).not.toContain("undefined");
  });
});
