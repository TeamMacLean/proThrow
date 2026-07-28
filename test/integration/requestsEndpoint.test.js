const request = require("supertest");
const thinky = require("../../lib/thinky");
const Request = require("../../models/request");

let app;
let sessionCookie;
let r;
let testRequestData;
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

  // Wait for db
  rethinkAvailable = await checkRethinkDB();
  if (!rethinkAvailable) {
    console.log("RethinkDB not available - skipping setup");
    return;
  }

  // Authenticate
  const loginRes = await request(app)
    .post("/signin")
    .send({ username: "deeks", password: "password" })
    .expect(302);
  
  sessionCookie = loginRes.headers["set-cookie"];
});

afterAll(async () => {
  if (r && r.getPoolMaster) {
    try {
      await r.getPoolMaster().drain();
    } catch (_e) {
      // Ignore errors during cleanup
    }
  }
});

describe("Requests Endpoints Integration Test", () => {
  
  describe("POST /new", () => {
    it("should successfully create a new request via JSON endpoint with nested arrays", async () => {
      if (!rethinkAvailable) return;
      const response = await request(app)
        .post("/new")
        .set("Cookie", sessionCookie)
        .field("species", "Human")
        .field("secondSpecies", "None")
        .field("tissue", "Blood")
        .field("tissueAgeNum", "10")
        .field("tissueAgeType", "days")
        .field("growthConditions", "Standard")
        .field("analysisType", "LC-MS")
        .field("secondaryAnalysisType", "None")
        .field("typeOfPTM", "Phosphorylation")
        .field("quantitativeAnalysisRequired", "Yes")
        .field("typeOfLabeling", "TMT")
        .field("labelUsed", "TMT10plex")
        .field("samplePrep", "Standard")
        .field("digestion", "Trypsin")
        .field("enzyme", "Trypsin")
        .field("projectDescription", "Test project")
        .field("hopedAnalysis", "Test analysis")
        .field("bufferComposition", "Test buffer")
        .field("sampleNumbers[]", "S1")
        .field("sampleLabels[]", "Sample 1")
        .field("sampleDescriptions[]", "Desc 1")
        .field("accessions[]", "ACC1")
        .field("sequenceInfos[]", "SEQ1")
        .field("dbEntries[]", "DB1")
        .expect(200);

      expect(response.body).toHaveProperty("requestID");
      expect(response.body).toHaveProperty("janCode");
      
      testRequestData = response.body;
    });

    it("should deny POST edit access to a non-admin who didn't create the request", async () => {
      if (!rethinkAvailable) return;
      // Login as a non-admin
      const nonAdminLogin = await request(app)
        .post("/signin")
        .send({ username: "regular_user", password: "password" })
        .expect(302);
      
      const nonAdminCookie = nonAdminLogin.headers["set-cookie"];

      const response = await request(app)
        .post("/new")
        .set("Cookie", nonAdminCookie)
        .field("requestID", testRequestData.requestID)
        .field("janCode", testRequestData.janCode)
        .field("species", "Malicious Mouse") // Malicious update
        .expect(403);

      expect(response.body.error).toBe("You are not authorized to edit this request.");
      
      // Verify DB hasn't changed
      const dbReq = await Request.get(testRequestData.requestID);
      expect(dbReq.species).toBe("Human");
    });

    it("should successfully update an existing request", async () => {
      if (!rethinkAvailable) return;
      const response = await request(app)
        .post("/new")
        .set("Cookie", sessionCookie)
        .field("requestID", testRequestData.requestID)
        .field("janCode", testRequestData.janCode)
        .field("species", "Mouse") // Updated field
        .field("secondSpecies", "None")
        .field("tissue", "Blood")
        .field("tissueAgeNum", "10")
        .field("tissueAgeType", "days")
        .field("growthConditions", "Standard")
        .field("analysisType", "LC-MS")
        .field("secondaryAnalysisType", "None")
        .field("typeOfPTM", "Phosphorylation")
        .field("quantitativeAnalysisRequired", "Yes")
        .field("typeOfLabeling", "TMT")
        .field("labelUsed", "TMT10plex")
        .field("samplePrep", "Standard")
        .field("digestion", "Trypsin")
        .field("enzyme", "Trypsin")
        .field("projectDescription", "Updated project")
        .field("hopedAnalysis", "Test analysis")
        .field("bufferComposition", "Test buffer")
        .field("sampleNumbers[]", "S1")
        .field("sampleLabels[]", "Sample 1")
        .field("sampleDescriptions[]", "Desc 1")
        .field("accessions[]", "ACC1")
        .field("sequenceInfos[]", "SEQ1")
        .field("dbEntries[]", "DB1")
        .expect(200);

      expect(response.body.requestID).toBe(testRequestData.requestID);
      
      // Verify the update in the DB, including relations
      const updatedReq = await Request.get(testRequestData.requestID).getJoin({ samples: true, constructs: true }).run();
      expect(updatedReq.species).toBe("Mouse");
      expect(updatedReq.projectDescription).toBe("Updated project");
      
      // Ensure arrays were saved correctly with right keys
      expect(updatedReq.samples.length).toBeGreaterThan(0);
      expect(updatedReq.samples[0].sampleNumber).toBe("S1");
      expect(updatedReq.samples[0].requestID).toBe(testRequestData.requestID);
      
      expect(updatedReq.constructs.length).toBeGreaterThan(0);
      expect(updatedReq.constructs[0].accession).toBe("ACC1");
      expect(updatedReq.constructs[0].requestID).toBe(testRequestData.requestID);
    });
  });

  describe("GET /request/:id", () => {
    it("should show a request if it exists", async () => {
      if (!rethinkAvailable) return;
      expect(testRequestData.requestID).toBeDefined();

      const res = await request(app)
        .get(`/request/${testRequestData.requestID}`)
        .set("Cookie", sessionCookie)
        .expect(200);

      expect(res.text).toContain(testRequestData.janCode);
    });

    it("should redirect with flash error if request not found", async () => {
      if (!rethinkAvailable) return;
      const res = await request(app)
        .get(`/request/non-existent-id-123`)
        .set("Cookie", sessionCookie)
        .expect(302)
        .expect("Location", "/");

      const flashCookie = res.headers["set-cookie"] || sessionCookie;
      
      // Follow redirect to see flash message
      const renderRes = await request(app)
        .get("/")
        .set("Cookie", flashCookie)
        .expect(200);

      expect(renderRes.text).toContain("Request not found.");
      expect(renderRes.text).toContain("alert-danger");
    });
  });

  describe("GET /request/:id/edit", () => {
    it("should display edit form for valid request", async () => {
      if (!rethinkAvailable) return;
      const res = await request(app)
        .get(`/request/${testRequestData.requestID}/edit`)
        .set("Cookie", sessionCookie)
        .expect(200);

      expect(res.text).toContain("\"species\":\"Mouse\"");
      expect(res.text).toContain(testRequestData.janCode);
    });

    it("should deny edit access to a non-admin who didn't create the request", async () => {
      if (!rethinkAvailable) return;
      // Login as a non-admin
      const nonAdminLogin = await request(app)
        .post("/signin")
        .send({ username: "regular_user", password: "password" })
        .expect(302);
      
      const nonAdminCookie = nonAdminLogin.headers["set-cookie"];

      const res = await request(app)
        .get(`/request/${testRequestData.requestID}/edit`)
        .set("Cookie", nonAdminCookie)
        .expect(302)
        .expect("Location", "/");

      const flashCookie = res.headers["set-cookie"] || nonAdminCookie;
      
      const renderRes = await request(app)
        .get("/")
        .set("Cookie", flashCookie)
        .expect(200);

      expect(renderRes.text).toContain("You are not authorized to edit this request.");
    });
  });

  describe("GET /request/:id/clone", () => {
    it("should display clone form for valid request", async () => {
      if (!rethinkAvailable) return;
      const res = await request(app)
        .get(`/request/${testRequestData.requestID}/clone`)
        .set("Cookie", sessionCookie)
        .expect(200);

      expect(res.text).toContain("\"species\":\"Mouse\"");
      // The clone form should not have the janCode of the original request directly set as value, but the text might show it's a clone.
      expect(res.text).toContain("isClone"); // Let's check for some indicator, maybe just check status
    });
  });

  describe("GET /request/:id/delete", () => {
    it("should deny delete access to a non-admin at the router level", async () => {
      if (!rethinkAvailable) return;
      const nonAdminLogin = await request(app)
        .post("/signin")
        .send({ username: "regular_user", password: "password" })
        .expect(302);
      
      const nonAdminCookie = nonAdminLogin.headers["set-cookie"];

      const res = await request(app)
        .get(`/request/${testRequestData.requestID}/delete`)
        .set("Cookie", nonAdminCookie)
        .expect(200);
        
      expect(res.text).toContain("your not an admin!");
    });

    it("should delete request and redirect to admin", async () => {
      if (!rethinkAvailable) return;
      const res = await request(app)
        .get(`/request/${testRequestData.requestID}/delete`)
        .set("Cookie", sessionCookie);
      
      if (res.status === 500) {
        console.error("500 ERROR BODY:", res.text);
      }
      
      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/\/admin\?t=/);
      
      const flashCookie = res.headers["set-cookie"] || sessionCookie;
      
      // Follow redirect to verify flash message
      const renderRes = await request(app)
        .get("/admin")
        .set("Cookie", flashCookie)
        .expect(200);

      expect(renderRes.text).toContain("Request successfully deleted.");
      expect(renderRes.text).toContain("alert-success");
    });
  });
});
