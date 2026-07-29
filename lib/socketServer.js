const { Server } = require("socket.io");

const config = require("../config.json");
const socketSearch = require("./socketSearch");
const socketRequest = require("./socketRequest");

/**
 * Attach the websocket layer to an HTTP server.
 *
 * Extracted from server.js so the tests exercise exactly the wiring production
 * uses. Previously this lived inline in server.js, which meant the only way to
 * test the socket handlers was to reimplement their setup - and the setup is
 * the part that carries the authentication.
 *
 * @param {import('http').Server} httpServer
 * @param {object} app - the Express app, carrying sessionMiddleware and passport
 * @returns {import('socket.io').Server}
 */
function attachSockets(httpServer, app) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.devMode ? "*" : config.baseURL,
      methods: ["GET", "POST"],
    },
  });

  // The same session and passport middleware the HTTP side uses, so a socket
  // knows which signed-in user it belongs to.
  io.engine.use(app.sessionMiddleware);
  io.engine.use(app.passport.initialize());
  io.engine.use(app.passport.session());

  // Refused at the handshake rather than inside each handler: a connection with
  // no authenticated session has no business being open at all.
  io.use((socket, next) => {
    const user = socket.request.user;
    if (user && user.username) return next();
    return next(new Error("unauthorized"));
  });

  io.on("connection", (socket) => {
    socketSearch(socket);
    socketRequest(socket);
  });

  return io;
}

module.exports = { attachSockets };
