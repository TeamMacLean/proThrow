const config = require("./config.json");
const express = require("express");
const path = require("path");
const session = require("express-session");
const flash = require("express-flash");
const RDBStore = require("express-session-rethinkdb")(session);
const passport = require("passport");
const cookieParser = require("cookie-parser");
const fs = require("fs-extra");
const util = require("./lib/util.js");
// Required for its side effect: this initialises the shared thinky connection.
const _r = require("./lib/thinky");
const routes = require("./routes");

const app = express();

// Body parsing middleware. The submission form posts multipart/form-data and is
// handled by multer, so these limits only need to cover ordinary form posts.
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(express.json({ limit: "1mb" }));

// View engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// LESS middleware for CSS compilation
app.use(require("less-middleware")(path.join(__dirname, "public")));

app.use(cookieParser());

// Session store - use memory in local dev mode, RethinkDB otherwise
let sessionConfig = {
  secret: config.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // Blocks the session cookie from riding along on cross-site requests, which
    // is what stops a third-party page from acting as the signed-in user.
    sameSite: "lax",
    // Opt-in rather than derived from devMode: if the deployment is served over
    // plain HTTP, setting this would silently break every login.
    secure: config.secureCookies === true,
    maxAge: 86400000, // 1 day
  },
};

if (config.devMode && !util.isVpnMode()) {
  // Use memory store in local dev mode (no RethinkDB needed)
  console.log("🔧 DEV MODE: Using memory session store");
} else {
  // Use RethinkDB session store in VPN/production mode
  const store = new RDBStore({
    connectOptions: {
      host: config.dbHost || "localhost",
      port: config.dbPort || 28015,
      db: config.dbName || "prothrow",
    },
    table: "session",
    sessionTimeout: 86400000, // 1 day
  });
  sessionConfig.store = store;
}

// Kept in a variable so socket.io can reuse the very same middleware instance.
// Without it a websocket connection has no idea who is on the other end, and
// every socket handler had to trust whatever the client claimed.
const sessionMiddleware = session(sessionConfig);

// --- Uploaded files ---------------------------------------------------------
// The upload directories sit inside `public`, so the general static mount below
// would serve them - and that mount ran before any session middleware, which
// meant every uploaded gel image was readable by anyone holding the URL, signed
// in or not, indefinitely. Including people who had since left the group.
//
// Session and passport are attached for these two prefixes only, so ordinary
// CSS and JS requests still skip the session store rather than costing a
// database lookup each.
const requireSignedIn = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(403).send("Sign in to view this file.");
};

const uploadAuth = [
  sessionMiddleware,
  passport.initialize(),
  passport.session(),
  requireSignedIn,
];

// Mounted before the general static handler below, so these paths are served
// here - behind the check - rather than anonymously out of `public`.
app.use("/uploads", ...uploadAuth, express.static(config.supportingImageRoot));
app.use(
  "/preview",
  ...uploadAuth,
  express.static(config.supportingImagePreviewRoot)
);

app.use(sessionMiddleware);

// Express-flash for messages
app.use(flash());

// Passport authentication
app.use(passport.initialize());
app.use(passport.session());

// General assets only: /uploads and /preview are already handled above, behind
// authentication, and requests to them cannot reach here without passing it.
app.use(express.static(path.join(__dirname, "public")));

// Make config and user info available to all views
app.use((req, res, next) => {
  // Add config values to all views
  res.locals.devMode = config.devMode;
  res.locals.vpnMode = util.isVpnMode();
  // Used by views that embed server state in an inline <script> tag.
  res.locals.toSafeJSON = util.toSafeJSON;

  if (req.user != null) {
    res.locals.signedInUser = {
      username: req.user.username,
      name: req.user.name,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      mail: req.user.mail,
      isAdmin: util.isAdmin(req.user.username),
      iconURL: req.user.iconURL,
    };
  }

  next();
});

// Request logging (only in development)
if (config.devMode) {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

// Ensure essential folders exist
fs.ensureDir(config.supportingImageRoot, (err) => {
  if (err) {
    console.error("Error creating uploads directory:", err);
  }
});
fs.ensureDir(config.supportingImagePreviewRoot, (err) => {
  if (err) {
    console.error("Error creating preview directory:", err);
  }
});

// Setup passport strategies
util.setupPassport();

// Routes
app.use("/", routes);

module.exports = app;
// Shared with socket.io in server.js so websocket connections are authenticated
// by the same session and passport instances as ordinary requests.
module.exports.sessionMiddleware = sessionMiddleware;
module.exports.passport = passport;
