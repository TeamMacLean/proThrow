/**
 * Uploaded-file access control, and the concurrency of note appends.
 */

const fs = require("fs-extra");
const path = require("path");
const request = require("supertest");

const config = require("../../config.json");
const thinky = require("../../lib/thinky");
const Request = require("../../models/request");
const { checkDatabaseAvailable } = require("../helpers/database");

let app;
let r;
let rethinkAvailable = false;
let sessionCookie;
let fixtureName;
let fixtureRequest;

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
  projectDescription: "Uploads fixture",
  hopedAnalysis: "hopes",
  bufferComposition: "buffer",
  ...overrides,
});

const withFields = (req, fields) => {
  Object.entries(fields).forEach(([key, value]) => req.field(key, value));
  return req;
};

beforeAll(async () => {
  app = require("../../app");
  r = thinky.r;

  rethinkAvailable = await checkDatabaseAvailable(r);
  if (!rethinkAvailable) return;

  const login = await request(app)
    .post("/signin")
    .send({ username: "deeks", password: "password" })
    .expect(302);
  sessionCookie = login.headers["set-cookie"];

  // A real file in the uploads directory to fetch.
  fixtureName = `access-test-${Date.now()}.png`;
  await fs.ensureDir(config.supportingImageRoot);
  await fs.writeFile(
    path.join(config.supportingImageRoot, fixtureName),
    "not really a png"
  );

  const created = await withFields(
    request(app).post("/new").set("Cookie", sessionCookie),
    validFields()
  ).expect(200);
  fixtureRequest = created.body;
});

afterAll(async () => {
  if (fixtureName) {
    await fs.remove(path.join(config.supportingImageRoot, fixtureName));
  }
  if (rethinkAvailable && fixtureRequest) {
    try {
      const doomed = await Request.get(fixtureRequest.requestID);
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

describe("Uploaded files", () => {
  // Regression: the upload directories sit inside `public`, and the general
  // static mount ran before any session middleware - so every uploaded gel
  // image was fetchable by anyone holding the URL, signed in or not.
  it("are not served to an anonymous request", async () => {
    if (!rethinkAvailable) return;

    await request(app).get(`/uploads/${fixtureName}`).expect(403);
  });

  it("are not reachable anonymously through the public static mount either", async () => {
    if (!rethinkAvailable) return;

    // Same file, same path - this is the mount that used to answer first.
    const res = await request(app).get(`/uploads/${fixtureName}`);
    expect(res.status).toBe(403);
    expect(res.text).not.toContain("not really a png");
  });

  it("are served to a signed-in user", async () => {
    if (!rethinkAvailable) return;

    // Buffered explicitly: supertest does not parse an image/png body into
    // res.text, so without this the assertion would read undefined.
    const res = await request(app)
      .get(`/uploads/${fixtureName}`)
      .set("Cookie", sessionCookie)
      .buffer(true)
      .parse((response, callback) => {
        let data = "";
        response.on("data", (chunk) => (data += chunk));
        response.on("end", () => callback(null, data));
      })
      .expect(200);

    expect(res.body).toContain("not really a png");
  });

  it("guards the preview directory the same way", async () => {
    if (!rethinkAvailable) return;

    await request(app).get("/preview/anything.jpg").expect(403);
  });
});

describe("Appending notes", () => {
  // Regression: notes were appended by rewriting the whole document, so two
  // people adding one at the same time both wrote their own copy of the array
  // and the second silently discarded the first note.
  it("does not lose notes added concurrently", async () => {
    if (!rethinkAvailable) return;

    const notes = ["note one", "note two", "note three", "note four"];
    await Promise.all(
      notes.map((note) => Request.appendNote(fixtureRequest.requestID, note))
    );

    const updated = await Request.get(fixtureRequest.requestID);
    expect(updated.notes).toHaveLength(notes.length);
    expect(updated.notes.sort()).toEqual([...notes].sort());
  });

  it("reports a request that no longer exists", async () => {
    if (!rethinkAvailable) return;

    await expect(
      Request.appendNote("no-such-request-id", "note")
    ).rejects.toThrow(/no longer exists/i);
  });
});

describe("Admin dashboard", () => {
  it("renders for an admin", async () => {
    if (!rethinkAvailable) return;

    await request(app)
      .get("/admin")
      .set("Cookie", sessionCookie)
      .expect(200);
  });
});
