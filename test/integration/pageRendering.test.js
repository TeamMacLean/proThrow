/**
 * Browser-level tests for the server-rendered pages.
 *
 * The rest of the integration suite asserts on the response *string*, which is
 * a weaker claim than it looks: a page can contain exactly the right bytes and
 * still do the wrong thing once parsed. That is how a stray closing script tag
 * in a code comment shipped - it ended the script element early, so
 * `window.existingRequest` was never assigned and the edit form loaded
 * completely blank, while every substring assertion kept passing.
 *
 * These tests parse the HTML and run its inline scripts, then assert on the
 * resulting window. That is the same thing the browser does, so it catches the
 * whole class: premature tag closure, a syntax error in the injected JSON,
 * broken escaping - anything that stops the page working rather than merely
 * changing its text.
 */

const request = require("supertest");
const { JSDOM, VirtualConsole } = require("jsdom");
const thinky = require("../../lib/thinky");
const Request = require("../../models/request");
const { checkDatabaseAvailable } = require("../helpers/database");

let app;
let sessionCookie;
let r;
let rethinkAvailable = false;

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
  projectDescription: "Page rendering fixture",
  hopedAnalysis: "x",
  bufferComposition: "y",
  ...overrides,
});

const withFields = (req, fields) => {
  Object.entries(fields).forEach(([key, value]) => req.field(key, value));
  return req;
};

/**
 * Parse a server-rendered page and run its inline scripts.
 *
 * External scripts are deliberately not fetched: this is about the markup the
 * server produced, not the React bundle or the CDN libraries.
 *
 * @param {string} html
 * @returns {object} the resulting window
 */
function renderInBrowser(html) {
  // Page scripts that depend on the CDN libraries will throw here because those
  // are not loaded; that noise is irrelevant to what these tests assert.
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM(html, { runScripts: "dangerously", virtualConsole });
  return dom.window;
}

async function createRequest(overrides) {
  const res = await withFields(
    request(app).post("/new").set("Cookie", sessionCookie),
    validFields(overrides)
  ).expect(200);
  return res.body;
}

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

describe("Edit page, parsed and executed as a browser would", () => {
  it("actually assigns window.existingRequest", async () => {
    if (!rethinkAvailable) return;

    const created = await createRequest();
    const res = await request(app)
      .get(`/request/${created.requestID}/edit`)
      .set("Cookie", sessionCookie)
      .expect(200);

    const window = renderInBrowser(res.text);

    // The assertion that the old substring-based test could not make: the
    // browser ends up with the data, not merely the bytes.
    expect(window.existingRequest).toBeDefined();
    expect(window.existingRequest.id).toBe(created.requestID);
    expect(window.existingRequest.janCode).toBe(created.janCode);
    expect(window.existingRequest.species).toBe("Homo sapiens");
    expect(window.existingRequest.tissue).toBe("leaves");
    expect(window.isAdmin).toBe(true);

    const doomed = await Request.get(created.requestID);
    await doomed.delete();
  });

  it("carries the timestamp the concurrency check needs", async () => {
    if (!rethinkAvailable) return;

    const created = await createRequest();
    const res = await request(app)
      .get(`/request/${created.requestID}/edit`)
      .set("Cookie", sessionCookie)
      .expect(200);

    const window = renderInBrowser(res.text);
    expect(window.existingRequest.updatedAt).toBeTruthy();
    expect(Number.isNaN(Date.parse(window.existingRequest.updatedAt))).toBe(
      false
    );

    const doomed = await Request.get(created.requestID);
    await doomed.delete();
  });

  it("marks a clone as a clone and clears its id", async () => {
    if (!rethinkAvailable) return;

    const created = await createRequest();
    const res = await request(app)
      .get(`/request/${created.requestID}/clone`)
      .set("Cookie", sessionCookie)
      .expect(200);

    const window = renderInBrowser(res.text);
    expect(window.existingRequest).toBeDefined();
    expect(window.existingRequest.isClone).toBe(true);
    expect(window.existingRequest.id).toBeUndefined();
    expect(window.existingRequest.tissue).toBe("leaves");

    const doomed = await Request.get(created.requestID);
    await doomed.delete();
  });

  it("leaves window.existingRequest unset on a brand new request", async () => {
    if (!rethinkAvailable) return;

    const res = await request(app)
      .get("/new")
      .set("Cookie", sessionCookie)
      .expect(200);

    const window = renderInBrowser(res.text);
    expect(window.existingRequest).toBeUndefined();
  });

  // Both halves matter, and only a real parser can check them together: the
  // payload must not execute, and the page must still work despite it.
  it("survives a field containing a closing script tag, without executing it", async () => {
    if (!rethinkAvailable) return;

    const hostile = '</script><script>window.__xss = true;</script>';
    const created = await createRequest({ projectDescription: hostile });

    const res = await request(app)
      .get(`/request/${created.requestID}/edit`)
      .set("Cookie", sessionCookie)
      .expect(200);

    const window = renderInBrowser(res.text);

    expect(window.__xss).toBeUndefined();
    expect(window.existingRequest).toBeDefined();
    expect(window.existingRequest.id).toBe(created.requestID);
    // Round-trips intact rather than being mangled by the escaping.
    expect(window.existingRequest.projectDescription).toBe(hostile);

    const doomed = await Request.get(created.requestID);
    await doomed.delete();
  });

  it("does not execute a closing script tag stored in a note", async () => {
    if (!rethinkAvailable) return;

    const created = await createRequest({
      "notes[0]": '</script><script>window.__xss = true;</script>',
    });

    const res = await request(app)
      .get(`/request/${created.requestID}/edit`)
      .set("Cookie", sessionCookie)
      .expect(200);

    const window = renderInBrowser(res.text);
    expect(window.__xss).toBeUndefined();
    expect(window.existingRequest.notes).toHaveLength(1);

    const doomed = await Request.get(created.requestID);
    await doomed.delete();
  });
});

describe("Request detail page, parsed as a browser would", () => {
  it("renders a scripted field as text rather than markup", async () => {
    if (!rethinkAvailable) return;

    const created = await createRequest({
      projectDescription: '<script>window.__xss = true;</script>',
      bufferComposition: '<img src=x onerror="window.__xss = true">',
    });

    const res = await request(app)
      .get(`/request/${created.requestID}`)
      .set("Cookie", sessionCookie)
      .expect(200);

    const window = renderInBrowser(res.text);

    expect(window.__xss).toBeUndefined();
    // The escaped value must still be readable to a human.
    expect(window.document.body.textContent).toContain(
      "<script>window.__xss = true;</script>"
    );
    // ...but must not have become a real element.
    const injected = [...window.document.querySelectorAll("script")].some((s) =>
      s.textContent.includes("__xss")
    );
    expect(injected).toBe(false);
    expect(window.document.querySelector("img[onerror]")).toBeNull();

    const doomed = await Request.get(created.requestID);
    await doomed.delete();
  });
});
