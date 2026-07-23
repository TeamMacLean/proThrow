const request = require("supertest");
const thinky = require("../../lib/thinky");

let app;
let r;
let rethinkAvailable = false;

async function checkRethinkDB() {
  if (!r) return false;
  try {
    await r.tableList().run();
    return true;
  } catch (_e) {
    return false;
  }
}

beforeAll(async () => {
  app = require("../../app");
  r = thinky.r;

  rethinkAvailable = await checkRethinkDB();
  if (!rethinkAvailable) {
    console.log("RethinkDB not available - skipping setup");
  }
});

afterAll(async () => {
  // Close any open connections
  if (rethinkAvailable && r && r.getPoolMaster) {
    try {
      await r.getPoolMaster().drain();
    } catch (_e) {
      // Ignore errors during cleanup
    }
  }
});

describe("Application Integration Tests", () => {
  describe("GET /signin", () => {
    it("should return the sign in page", async () => {
      if (!rethinkAvailable) return;
      const response = await request(app).get("/signin");
      expect(response.status).toBe(200);
      expect(response.text).toContain("html");
    });
  });

  describe("Protected routes", () => {
    it("should redirect to signin for /new when not authenticated", async () => {
      if (!rethinkAvailable) return;
      const response = await request(app).get("/new");
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe("/signin");
    });

    it("should redirect to signin for /admin when not authenticated", async () => {
      if (!rethinkAvailable) return;
      const response = await request(app).get("/admin");
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe("/signin");
    });
  });

  describe("Dashboard routes", () => {
    let sessionCookie;
    
    beforeAll(async () => {
      if (!rethinkAvailable) return;
      const loginRes = await request(app)
        .post("/signin")
        .send({ username: "deeks", password: "password" });
      sessionCookie = loginRes.headers["set-cookie"];
    });

    it("should load the user dashboard for logged-in user", async () => {
      if (!rethinkAvailable) return;
      const res = await request(app)
        .get("/user/deeks")
        .set("Cookie", sessionCookie);
      
      expect(res.status).toBe(200);
      expect(res.text).toContain("Requests for");
    });

    it("should load the admin dashboard for an admin user", async () => {
      if (!rethinkAvailable) return;
      const res = await request(app)
        .get("/admin")
        .set("Cookie", sessionCookie);
      
      expect(res.status).toBe(200);
      expect(res.text).toContain("Completed Requests");
      expect(res.text).toContain("Incomplete Requests");
    });
  });
});
