/**
 * Performance tests for request loading
 * These tests ensure that database queries complete within acceptable time limits
 */

const REQUEST_LOAD_TIMEOUT_MS = 1000; // 1 second max

let thinky;
let Request;
let r;

// Try to load modules - if RethinkDB isn't available, tests will be skipped
try {
  thinky = require("../../lib/thinky");
  Request = require("../../models/request");
  r = thinky.r;
} catch (e) {
  console.log("Could not load thinky:", e.message);
}

// Helper to check RethinkDB availability
async function checkRethinkDB() {
  if (!r) return false;
  try {
    await r.tableList().run();
    return true;
  } catch (_e) {
    return false;
  }
}

describe("Request loading performance", () => {
  let rethinkAvailable = false;

  beforeAll(async () => {
    rethinkAvailable = await checkRethinkDB();
    if (rethinkAvailable) {
      console.log("RethinkDB connected - running performance tests");
    } else {
      console.log("RethinkDB not available - skipping performance tests");
    }
  }, 10000);

  afterAll(async () => {
    if (rethinkAvailable && r && r.getPoolMaster) {
      try {
        await r.getPoolMaster().drain();
      } catch (_e) {
        // Ignore errors during cleanup
      }
    }
  });

  it("should load a request with joins in under 1 second", async () => {
    if (!rethinkAvailable) {
      console.log("Skipping: RethinkDB not available");
      return;
    }

    // Get a request ID to test with
    const requests = await r.table("Request").limit(1).run();

    if (requests.length === 0) {
      console.log("No requests in database, skipping test");
      return;
    }

    const requestId = requests[0].id;
    const startTime = Date.now();

    // This is the same query used by the edit page
    const result = await Request.get(requestId)
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

    // Find a request with the most samples/images for stress testing
    const requests = await r.table("Request").limit(20).run();

    if (requests.length === 0) {
      console.log("No requests in database, skipping test");
      return;
    }

    // Find the request with the most related data
    let maxRelated = 0;
    let testRequestId = requests[0].id;

    for (const req of requests) {
      const [samples, images, constructs] = await Promise.all([
        r
          .table("SampleDescription")
          .getAll(req.id, { index: "requestID" })
          .count()
          .run(),
        r
          .table("SampleImage")
          .getAll(req.id, { index: "requestID" })
          .count()
          .run(),
        r
          .table("Construct")
          .getAll(req.id, { index: "requestID" })
          .count()
          .run(),
      ]);

      const total = samples + images + constructs;
      if (total > maxRelated) {
        maxRelated = total;
        testRequestId = req.id;
      }
    }

    console.log(
      `Testing with request ${testRequestId.substring(0, 8)}... (${maxRelated} related docs)`
    );

    const startTime = Date.now();

    const result = await Request.get(testRequestId)
      .getJoin({ supportingImages: true, samples: true, constructs: true })
      .run();

    const elapsed = Date.now() - startTime;

    expect(result).toBeTruthy();
    expect(elapsed).toBeLessThan(REQUEST_LOAD_TIMEOUT_MS);

    console.log(
      `Request with ${maxRelated} related docs loaded in ${elapsed}ms`
    );
  });

  it("should load multiple requests in parallel efficiently", async () => {
    if (!rethinkAvailable) {
      console.log("Skipping: RethinkDB not available");
      return;
    }

    const requests = await r.table("Request").limit(5).run();

    if (requests.length < 2) {
      console.log("Not enough requests in database, skipping test");
      return;
    }

    const startTime = Date.now();

    // Load all requests in parallel
    const results = await Promise.all(
      requests.map((req) =>
        Request.get(req.id)
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
  let rethinkAvailable = false;

  beforeAll(async () => {
    rethinkAvailable = await checkRethinkDB();
  }, 10000);

  afterAll(async () => {
    if (rethinkAvailable && r && r.getPoolMaster) {
      try {
        await r.getPoolMaster().drain();
      } catch (_e) {
        // Ignore
      }
    }
  });

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
