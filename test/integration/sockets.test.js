/**
 * Websocket authentication and authorisation.
 *
 * Every socket handler mutates a request addressed purely by an id sent from
 * the browser. None of them used to establish who was asking, so an anonymous
 * websocket could reassign any request, drive it to any status (firing a
 * "completed" email at the submitter each time) and append arbitrary notes.
 */

const http = require("http");
const request = require("supertest");
const { io: ioClient } = require("socket.io-client");

const thinky = require("../../lib/thinky");
const Request = require("../../models/request");
const { attachSockets } = require("../../lib/socketServer");
const { checkDatabaseAvailable } = require("../helpers/database");

let app;
let server;
let io;
let baseURL;
let r;
let rethinkAvailable = false;

let adminCookie;
let ownerCookie;
let snooperCookie;
let target;

const OWNER = "socket_owner";
const SNOOPER = "socket_snooper";

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
  projectDescription: "Socket fixture",
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

/**
 * Open a socket, optionally carrying a session cookie.
 *
 * @param {string[]|null} cookie
 * @returns {Promise<{socket: object}|{error: Error}>}
 */
function connect(cookie) {
  return new Promise((resolve) => {
    const socket = ioClient(baseURL, {
      transports: ["websocket", "polling"],
      extraHeaders: cookie ? { Cookie: cookie.join("; ") } : {},
      reconnection: false,
      forceNew: true,
    });
    socket.on("connect", () => resolve({ socket }));
    socket.on("connect_error", (error) => {
      socket.close();
      resolve({ error });
    });
  });
}

/**
 * Emit an event and wait for whichever reply arrives first.
 *
 * @param {object} socket
 * @param {string} event
 * @param {object} payload
 * @param {string[]} expectEvents
 * @returns {Promise<{event: string, data: object}|null>}
 */
function emitAndWait(socket, event, payload, expectEvents) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 2500);
    expectEvents.forEach((name) =>
      socket.once(name, (data) => {
        clearTimeout(timer);
        resolve({ event: name, data });
      })
    );
    socket.emit(event, payload);
  });
}

beforeAll(async () => {
  app = require("../../app");
  r = thinky.r;

  rethinkAvailable = await checkDatabaseAvailable(r);
  if (!rethinkAvailable) return;

  server = http.createServer(app);
  io = attachSockets(server, app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;

  adminCookie = await loginAs("deeks");
  ownerCookie = await loginAs(OWNER);
  snooperCookie = await loginAs(SNOOPER);

  const created = await withFields(
    request(app).post("/new").set("Cookie", ownerCookie),
    validFields()
  ).expect(200);
  target = created.body;
});

afterAll(async () => {
  if (target) {
    try {
      const doomed = await Request.get(target.requestID);
      if (doomed) {
        await doomed.removeChildren();
        await doomed.delete();
      }
    } catch (_e) {
      // Ignore cleanup failures
    }
  }
  if (io) io.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  if (r && r.getPoolMaster) {
    try {
      await r.getPoolMaster().drain();
    } catch (_e) {
      // Ignore errors during cleanup
    }
  }
});

describe("Socket handshake", () => {
  it("refuses a connection with no session", async () => {
    if (!rethinkAvailable) return;

    const result = await connect(null);
    expect(result.socket).toBeUndefined();
    expect(result.error.message).toBe("unauthorized");
  });

  it("accepts a signed-in connection", async () => {
    if (!rethinkAvailable) return;

    const { socket, error } = await connect(adminCookie);
    expect(error).toBeUndefined();
    expect(socket.connected).toBe(true);
    socket.close();
  });
});

describe("Request mutations over sockets", () => {
  it("refuses a status change from a non-admin", async () => {
    if (!rethinkAvailable) return;

    const { socket } = await connect(snooperCookie);
    const reply = await emitAndWait(
      socket,
      "toggleStatus",
      { id: target.requestID, status: "complete" },
      ["actionError", "statusSaved"]
    );
    socket.close();

    expect(reply.event).toBe("actionError");

    const unchanged = await Request.get(target.requestID);
    expect(unchanged.status).toBe("incomplete");
  });

  it("refuses an unknown status even from an admin", async () => {
    if (!rethinkAvailable) return;

    const { socket } = await connect(adminCookie);
    const reply = await emitAndWait(
      socket,
      "toggleStatus",
      { id: target.requestID, status: "totally made up" },
      ["actionError", "statusSaved"]
    );
    socket.close();

    expect(reply.event).toBe("actionError");
    expect(reply.data.error).toMatch(/unknown status/i);

    const unchanged = await Request.get(target.requestID);
    expect(unchanged.status).toBe("incomplete");
  });

  it("lets an admin set a real status", async () => {
    if (!rethinkAvailable) return;

    const { socket } = await connect(adminCookie);
    const reply = await emitAndWait(
      socket,
      "toggleStatus",
      { id: target.requestID, status: "samples received" },
      ["actionError", "statusSaved"]
    );
    socket.close();

    expect(reply.event).toBe("statusSaved");

    const updated = await Request.get(target.requestID);
    expect(updated.status).toBe("samples received");
  });

  it("refuses to assign someone who is not an administrator", async () => {
    if (!rethinkAvailable) return;

    const { socket } = await connect(adminCookie);
    const reply = await emitAndWait(
      socket,
      "assignTo",
      { id: target.requestID, admin: SNOOPER },
      ["actionError", "assignSaved"]
    );
    socket.close();

    expect(reply.event).toBe("actionError");

    const unchanged = await Request.get(target.requestID);
    expect(unchanged.assignedTo).not.toBe(SNOOPER);
  });

  it("refuses a note on someone else's request", async () => {
    if (!rethinkAvailable) return;

    const { socket } = await connect(snooperCookie);
    const reply = await emitAndWait(
      socket,
      "addNote",
      { id: target.requestID, note: "I should not be able to write this" },
      ["actionError", "noteAdded"]
    );
    socket.close();

    expect(reply.event).toBe("actionError");

    const unchanged = await Request.get(target.requestID);
    expect(unchanged.notes).not.toContain("I should not be able to write this");
  });

  it("lets the request's owner add a note", async () => {
    if (!rethinkAvailable) return;

    const { socket } = await connect(ownerCookie);
    const reply = await emitAndWait(
      socket,
      "addNote",
      { id: target.requestID, note: "  My own note  " },
      ["actionError", "noteAdded"]
    );
    socket.close();

    expect(reply.event).toBe("noteAdded");
    // Echoes what was stored, not what was sent.
    expect(reply.data.note).toBe("My own note");

    const updated = await Request.get(target.requestID);
    expect(updated.notes).toContain("My own note");
  });

  it("rejects an empty note", async () => {
    if (!rethinkAvailable) return;

    const { socket } = await connect(ownerCookie);
    const reply = await emitAndWait(
      socket,
      "addNote",
      { id: target.requestID, note: "   " },
      ["actionError", "noteAdded"]
    );
    socket.close();

    expect(reply.event).toBe("actionError");
  });

  it("refuses an action on a request that does not exist", async () => {
    if (!rethinkAvailable) return;

    const { socket } = await connect(adminCookie);
    const reply = await emitAndWait(
      socket,
      "toggleStatus",
      { id: "no-such-request", status: "complete" },
      ["actionError", "statusSaved"]
    );
    socket.close();

    expect(reply.event).toBe("actionError");
  });
});

describe("Search over sockets", () => {
  // The old handler resolved `data.split("")`, so the dropdown listed the
  // individual characters of whatever had been typed.
  it("returns matching requests rather than characters", async () => {
    if (!rethinkAvailable) return;

    const { socket } = await connect(ownerCookie);
    const reply = await emitAndWait(socket, "search", target.janCode, [
      "search result",
      "search error",
    ]);
    socket.close();

    expect(reply.event).toBe("search result");
    expect(Array.isArray(reply.data)).toBe(true);
    expect(reply.data.some((row) => row.janCode === target.janCode)).toBe(true);
    expect(reply.data[0]).toHaveProperty("id");
  });

  it("does not leak another user's requests to a non-admin", async () => {
    if (!rethinkAvailable) return;

    const { socket } = await connect(snooperCookie);
    const reply = await emitAndWait(socket, "search", target.janCode, [
      "search result",
      "search error",
    ]);
    socket.close();

    expect(reply.event).toBe("search result");
    expect(reply.data).toEqual([]);
  });

  it("ignores a term that is too short to be useful", async () => {
    if (!rethinkAvailable) return;

    const { socket } = await connect(ownerCookie);
    const reply = await emitAndWait(socket, "search", "a", [
      "search result",
      "search error",
    ]);
    socket.close();

    expect(reply.data).toEqual([]);
  });
});
