const config = require("./config");
const express = require("express");
const path = require("path");
const session = require("express-session");
const rethinkSession = require("session-rethinkdb")(session);
const passport = require("passport");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const util = require("./lib/util.js");
const thinky = require("./lib/thinky");
const store = new rethinkSession(thinky.r);
const fs = require("fs-extra");
const routes = require("./routes");
const SampleImage = require("./models/sampleImage");

const app = express();

app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use(bodyParser.json({ limit: "50mb" }));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(require("less-middleware")(path.join(__dirname, "public")));

app.use(express.static(path.join(__dirname, "public"))); // ???
app.use(cookieParser());

// Serve files from the uploads directory
app.use("/uploads", express.static(config.supportingImageRoot));
app.use("/preview", express.static(config.supportingImagePreviewRoot));

app.use(
  session({
    secret: config.secret,
    resave: false,
    saveUninitialized: false,
    store,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  if (req.user != null) {
    res.locals.signedInUser = {};
    res.locals.signedInUser.username = req.user.username;
    res.locals.signedInUser.name = req.user.name;
    res.locals.signedInUser.fistName = req.user.firstName;
    res.locals.signedInUser.lastName = req.user.lastName;
    res.locals.signedInUser.mail = req.user.mail;
    res.locals.signedInUser.isAdmin = util.isAdmin(req.user.username);
    return next(null, req, res);
  } else {
    return next();
  }
});

app.use((req, res, next) => {
  console.log(req.url);
  next();
});

//ensure essential folders exist
fs.ensureDir(config.supportingImageRoot, (err) => {
  if (err) {
    console.error(err);
  }
});
fs.ensureDir(config.supportingImagePreviewRoot, (err) => {
  if (err) {
    console.error(err);
  }
});

util.setupPassport();

app.use("/", routes);

module.exports = app;
