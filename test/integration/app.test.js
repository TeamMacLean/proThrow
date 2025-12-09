const request = require("supertest");

// Skip integration tests if RethinkDB is not available
let app;
let rethinkAvailable = false;

beforeAll(async () => {
  try {
    app = require("../../app");
    rethinkAvailable = true;
  } catch (err) {
    console.log(
      "Skipping integration tests - RethinkDB not available:",
      err.message
    );
  }
});

afterAll(async () => {
  // Close any open connections
  if (rethinkAvailable) {
    const r = require("../../lib/thinky");
    if (r && r.getPoolMaster) {
      try {
        await r.getPoolMaster().drain();
      } catch (_e) {
        // Ignore errors during cleanup
      }
    }
  }
});

const conditionalTest = (name, fn) => {
  if (rethinkAvailable) {
    it(name, fn);
  } else {
    it.skip(name + " (RethinkDB not available)", fn);
  }
};

describe("Application Integration Tests", () => {
  describe("GET /signin", () => {
    conditionalTest("should return the sign in page", async () => {
      const response = await request(app).get("/signin");
      expect(response.status).toBe(200);
      expect(response.text).toContain("html");
    });
  });

  describe("Protected routes", () => {
    conditionalTest(
      "should redirect to signin for /new when not authenticated",
      async () => {
        const response = await request(app).get("/new");
        expect(response.status).toBe(302);
        expect(response.headers.location).toBe("/signin");
      }
    );

    conditionalTest(
      "should redirect to signin for /admin when not authenticated",
      async () => {
        const response = await request(app).get("/admin");
        expect(response.status).toBe(302);
        expect(response.headers.location).toBe("/signin");
      }
    );
  });
});
