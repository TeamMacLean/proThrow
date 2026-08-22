/**
 * Performance tests for request loading
 * These tests ensure that database queries complete within acceptable time limits
 */

const { checkDatabaseAvailable } = require("../helpers/database");

const REQUEST_LOAD_TIMEOUT_MS = 1000; // 1 second max

let thinky;
let Request;
let SampleDescription;
let Construct;
let r;

// Try to load modules - if RethinkDB isn't available, tests will be skipped
try {
  thinky = require("../../lib/thinky");
  Request = require("../../models/request");
  SampleDescription = require("../../models/sampleDescription");
  Construct = require("../../models/construct");
  r = thinky.r;
} catch (e) {
  console.log("Could not load thinky:", e.message);
}

// Helper to check RethinkDB availability
async function checkRethinkDB() {
  return checkDatabaseAvailable(r);
}

/**
 * A minimal valid request, matching the fixture shape other integration
 * suites use.
 *
 * These tests used to query `r.table("Request").limit(n)` and measure
 * whatever happened to already be in the table. Against the (shared,
 * effectively permanent) production database that was always a large, stable
 * pool, so it never mattered which row came back. Once the test suite ran
 * against its own isolated database, this started racing every other test
 * file's create/delete cycles on the same table - occasionally picking up a
 * row another suite had already deleted before this file's own assertion ran.
 * Creating dedicated fixtures removes that race entirely.
 */
function newRequest(overrides = {}) {
  return new Request({
    createdBy: "performance_test",
    janCode: `perf${Date.now()}${Math.floor(Math.random() * 1e6)}`,
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
    projectDescription: "performance test",
    hopedAnalysis: "x",
    bufferComposition: "y",
    ...overrides,
  });
}

/** Persists a request plus `relatedCount` sample and construct rows each. */
async function createRequestWithRelations(relatedCount) {
  const request = await newRequest().save();

  for (let i = 0; i < relatedCount; i++) {
    await new SampleDescription({
      requestID: request.id,
      position: i,
      sampleNumber: String(i + 1),
      sampleLabel: `L${i}`,
      sampleDescription: `D${i}`,
    }).save();
    await new Construct({
      requestID: request.id,
      position: i,
      accession: `ACC${i}`,
      sequenceInfo: "seq",
      dbEntry: "db",
    }).save();
  }

  return request;
}

// The connection pool is shared by every suite in this file, so it is opened
// once and drained once here. Each describe block used to drain it in its own
// afterAll, which meant the first block to finish closed the pool and every
// later block saw the database as unavailable and skipped itself - silently, so
// the index checks below had not actually run in a long time.
let rethinkAvailable = false;
const createdRequestIds = [];

beforeAll(async () => {
  rethinkAvailable = await checkRethinkDB();
  console.log(
    rethinkAvailable
      ? "RethinkDB connected - running performance tests"
      : "RethinkDB not available - skipping performance tests"
  );
}, 10000);

afterAll(async () => {
  if (rethinkAvailable) {
    for (const id of createdRequestIds) {
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
  if (rethinkAvailable && r && r.getPoolMaster) {
    try {
      await r.getPoolMaster().drain();
    } catch (_e) {
      // Ignore errors during cleanup
    }
  }
});

describe("Request loading performance", () => {
  it("should load a request with joins in under 1 second", async () => {
    if (!rethinkAvailable) {
      console.log("Skipping: RethinkDB not available");
      return;
    }

    const request = await createRequestWithRelations(1);
    createdRequestIds.push(request.id);

    const startTime = Date.now();

    // This is the same query used by the edit page
    const result = await Request.get(request.id)
      .getJoin({ supportingImages: true, samples: true, constructs: true })
      .run();

    const elapsed = Date.now() - startTime;

    expect(result).toBeTruthy();
    expect(elapsed).toBeLessThan(REQUEST_LOAD_TIMEOUT_MS);

    console.log(`Request loaded in ${elapsed}ms`);
  });

  it("should load a request with many relations in under 1 second", async () => {
    if (!rethinkAvailable) {
      console.log("Skipping: RethinkDB not available");
      return;
    }

    const relatedCount = 20;
    const request = await createRequestWithRelations(relatedCount);
    createdRequestIds.push(request.id);

    const startTime = Date.now();

    const result = await Request.get(request.id)
      .getJoin({ supportingImages: true, samples: true, constructs: true })
      .run();

    const elapsed = Date.now() - startTime;

    expect(result).toBeTruthy();
    expect(elapsed).toBeLessThan(REQUEST_LOAD_TIMEOUT_MS);

    console.log(
      `Request with ${relatedCount * 2} related docs loaded in ${elapsed}ms`
    );
  });

  it("should load multiple requests in parallel efficiently", async () => {
    if (!rethinkAvailable) {
      console.log("Skipping: RethinkDB not available");
      return;
    }

    const requests = await Promise.all(
      Array.from({ length: 5 }, () => createRequestWithRelations(1))
    );
    requests.forEach((request) => createdRequestIds.push(request.id));

    const startTime = Date.now();

    // Load all requests in parallel
    const results = await Promise.all(
      requests.map((request) =>
        Request.get(request.id)
          .getJoin({ supportingImages: true, samples: true, constructs: true })
          .run()
      )
    );

    const elapsed = Date.now() - startTime;

    expect(results.length).toBe(requests.length);
    results.forEach((result) => expect(result).toBeTruthy());

    // Even loading 5 requests in parallel should complete in under 1 second
    expect(elapsed).toBeLessThan(REQUEST_LOAD_TIMEOUT_MS);

    console.log(
      `${requests.length} requests loaded in parallel in ${elapsed}ms`
    );
  });
});

describe("Index usage verification", () => {
  // Uses the file-level connection: opening or draining a second one here is
  // what previously stopped these tests running at all.
  it("should have index on SampleDescription.requestID", async () => {
    if (!rethinkAvailable) return;
    const indexes = await r.table("SampleDescription").indexList().run();
    expect(indexes).toContain("requestID");
  });

  it("should have index on SampleImage.requestID", async () => {
    if (!rethinkAvailable) return;
    const indexes = await r.table("SampleImage").indexList().run();
    expect(indexes).toContain("requestID");
  });

  it("should have index on Construct.requestID", async () => {
    if (!rethinkAvailable) return;
    const indexes = await r.table("Construct").indexList().run();
    expect(indexes).toContain("requestID");
  });

  it("should have index on Request.createdBy", async () => {
    if (!rethinkAvailable) return;
    const indexes = await r.table("Request").indexList().run();
    expect(indexes).toContain("createdBy");
  });
});
