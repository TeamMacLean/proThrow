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
  if (rethinkAvailable && r && r.getPoolMaster) {
    try {
      await r.getPoolMaster().drain();
    } catch (_e) {
      // Ignore errors during cleanup
    }
  }
});

describe("Flash Messages Integration Test", () => {
  let sessionCookie;

  it("should establish a basic session", async () => {
    if (!rethinkAvailable) return;
    const res = await request(app).get("/");
    sessionCookie = res.headers["set-cookie"];
    expect(sessionCookie).toBeDefined();
  });

  describe("Failed Login Flash Message", () => {
    it("should display 'Authentication failed' flash message on signin page after failed attempt", async () => {
      if (!rethinkAvailable) return;
      // Step 1: Attempt to sign in with invalid credentials
      const loginAttemptRes = await request(app)
        .post("/signin")
        .set("Cookie", sessionCookie)
        .send({ username: "invalid_user", password: "" })
        .expect(302)
        .expect("Location", "/signin");

      // Extract the updated session cookie which now contains the flash message
      const updatedSessionCookie = loginAttemptRes.headers["set-cookie"] || sessionCookie;

      // Step 2: Follow the redirect back to the signin page and verify the HTML
      const renderRes = await request(app)
        .get("/signin")
        .set("Cookie", updatedSessionCookie)
        .expect(200);

      // Verify the HTML contains the visual flash message container and text (Bootstrap alert)
      expect(renderRes.text).toContain('alert-danger');
      expect(renderRes.text).toContain("Authentication failed");
    });
  });
  
  describe("Logout Flash Message", () => {
    it("should display 'You have successfully signed out.' flash message on homepage after signing out", async () => {
      if (!rethinkAvailable) return;
      // Step 1: Hit the signout endpoint
      const signoutRes = await request(app)
        .get("/signout")
        .set("Cookie", sessionCookie)
        .expect(302)
        .expect("Location", "/");

      const updatedSessionCookie = signoutRes.headers["set-cookie"] || sessionCookie;

      // Step 2: Follow the redirect back to the home page and verify the HTML
      const renderRes = await request(app)
        .get("/")
        .set("Cookie", updatedSessionCookie)
        .expect(200);

      // Verify the HTML contains the success flash message container and text
      expect(renderRes.text).toContain('alert-success');
      expect(renderRes.text).toContain("You have successfully signed out.");
    });
  });
});
