/**
 * Access-control tests.
 *
 * A request holds unpublished experimental detail. Edit and delete always
 * checked ownership, but show, clone and the per-user listing did not, so any
 * signed-in account could read every submission in the system - and clone was
 * worse, because the clone form embeds the whole record as JSON in the page.
 */

const request = require("supertest");
const thinky = require("../../lib/thinky");
const Request = require("../../models/request");
const { checkDatabaseAvailable } = require("../helpers/database");

let app;
let r;
let rethinkAvailable = false;
let adminCookie;
let ownerCookie;
let snooperCookie;
let ownedByOther;

const OWNER = "scientist_a";
const SNOOPER = "scientist_b";

const validFields = (overrides = {}) => ({
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
  projectDescription: "Confidential preliminary work",
  hopedAnalysis: "hopes",
  bufferComposition: "buffer",
  ...overrides,
});

const withFields = (req, fields) => {
  Object.entries(fields).forEach(([key, value]) => req.field(key, value));
  return req;
};

async function loginAs(username) {
  const res = await request(app)
    .post("/signin")
    .send({ username, password: "password" })
    .expect(302);
  return res.headers["set-cookie"];
}

beforeAll(async () => {
  app = require("../../app");
  r = thinky.r;

  rethinkAvailable = await checkDatabaseAvailable(r);
  if (!rethinkAvailable) return;

  adminCookie = await loginAs("deeks");
  ownerCookie = await loginAs(OWNER);
  snooperCookie = await loginAs(SNOOPER);

  const created = await withFields(
    request(app).post("/new").set("Cookie", ownerCookie),
    validFields()
  ).expect(200);
  ownedByOther = created.body;
});

afterAll(async () => {
  if (rethinkAvailable && ownedByOther) {
    try {
      const doomed = await Request.get(ownedByOther.requestID);
      if (doomed) {
        await doomed.removeChildren();
        await doomed.delete();
      }
    } catch (_e) {
      // Ignore cleanup failures
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

describe("Reading another user's request", () => {
  it("refuses to show it", async () => {
    if (!rethinkAvailable) return;

    const res = await request(app)
      .get(`/request/${ownedByOther.requestID}`)
      .set("Cookie", snooperCookie)
      .expect(302)
      .expect("Location", "/");

    // And none of the content leaked on the way out.
    expect(res.text).not.toContain("Confidential preliminary work");
  });

  // The clone page is the sharper version of the same hole: it renders the
  // record as JSON into window.existingRequest.
  it("refuses to clone it", async () => {
    if (!rethinkAvailable) return;

    const res = await request(app)
      .get(`/request/${ownedByOther.requestID}/clone`)
      .set("Cookie", snooperCookie)
      .expect(302)
      .expect("Location", "/");

    expect(res.text).not.toContain("Confidential preliminary work");
  });

  it("refuses to edit it", async () => {
    if (!rethinkAvailable) return;

    await request(app)
      .get(`/request/${ownedByOther.requestID}/edit`)
      .set("Cookie", snooperCookie)
      .expect(302)
      .expect("Location", "/");
  });

  it("refuses to list that user's requests", async () => {
    if (!rethinkAvailable) return;

    const res = await request(app)
      .get(`/user/${OWNER}`)
      .set("Cookie", snooperCookie)
      .expect(302)
      .expect("Location", "/");

    expect(res.text).not.toContain(ownedByOther.janCode);
  });
});

describe("The owner and the admins", () => {
  it("lets the owner show their own request", async () => {
    if (!rethinkAvailable) return;

    const res = await request(app)
      .get(`/request/${ownedByOther.requestID}`)
      .set("Cookie", ownerCookie)
      .expect(200);

    expect(res.text).toContain(ownedByOther.janCode);
  });

  it("lets the owner list their own requests", async () => {
    if (!rethinkAvailable) return;

    await request(app)
      .get(`/user/${OWNER}`)
      .set("Cookie", ownerCookie)
      .expect(200);
  });

  it("lets an admin show anyone's request", async () => {
    if (!rethinkAvailable) return;

    const res = await request(app)
      .get(`/request/${ownedByOther.requestID}`)
      .set("Cookie", adminCookie)
      .expect(200);

    expect(res.text).toContain(ownedByOther.janCode);
  });

  it("lets an admin clone and list on behalf of anyone", async () => {
    if (!rethinkAvailable) return;

    await request(app)
      .get(`/request/${ownedByOther.requestID}/clone`)
      .set("Cookie", adminCookie)
      .expect(200);

    await request(app)
      .get(`/user/${OWNER}`)
      .set("Cookie", adminCookie)
      .expect(200);
  });
});

describe("Admin-only routes", () => {
  it("answers 403 rather than 200 when refusing a non-admin", async () => {
    if (!rethinkAvailable) return;

    const res = await request(app)
      .get("/admin")
      .set("Cookie", snooperCookie)
      .expect(403);

    expect(res.text).toContain("not a proteomics administrator");
  });
});
