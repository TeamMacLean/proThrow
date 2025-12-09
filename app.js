const config = require("./config.json");
const express = require("express");
const path = require("path");
const session = require("express-session");
const RDBStore = require("express-session-rethinkdb")(session);
const passport = require("passport");
const cookieParser = require("cookie-parser");
const fs = require("fs-extra");
const util = require("./lib/util.js");
const r = require("./lib/thinky");
const routes = require("./routes");

const app = express();

// Body parsing middleware
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json({ limit: "50mb" }));

// View engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// LESS middleware for CSS compilation
app.use(require("less-middleware")(path.join(__dirname, "public")));

// Static files
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

// Serve files from the uploads directory
app.use("/uploads", express.static(config.supportingImageRoot));
app.use("/preview", express.static(config.supportingImagePreviewRoot));

// Session store - use memory in local dev mode, RethinkDB otherwise
let sessionConfig = {
  secret: config.secret,
  resave: false,
  saveUninitialized: false,
};

if (config.devMode && !util.isVpnMode()) {
  // Use memory store in local dev mode (no RethinkDB needed)
  console.log("🔧 DEV MODE: Using memory session store");
} else {
  // Use RethinkDB session store in VPN/production mode
  const store = new RDBStore(r, {
    browserSessionsMaxAge: 60000, // 1 minute for browser sessions
    table: "session",
  });
  sessionConfig.store = store;
}

app.use(session(sessionConfig));

// Passport authentication
app.use(passport.initialize());
app.use(passport.session());

// Make config and user info available to all views
app.use((req, res, next) => {
  // Add config values to all views
  res.locals.devMode = config.devMode;
  res.locals.vpnMode = util.isVpnMode();

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
