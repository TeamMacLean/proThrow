const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const Util = require("./lib/util");
const Tax = require("./lib/taxLookup");
const admin = require("./controllers/admin");
const index = require("./controllers/index");
const Auth = require("./controllers/auth");
const Users = require("./controllers/users");
const Requests = require("./controllers/requests");

const config = require("./config.json");

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    // Save the full URL (path + query string) for redirect after login
    req.session.returnTo = req.originalUrl;
    // Explicitly save session before redirect to ensure returnTo persists
    req.session.save((err) => {
      if (err) {
        console.error("Error saving session:", err);
      }
      return res.redirect("/signin");
    });
  }
}

/**
 * Auth guard for XHR endpoints.
 *
 * Deliberately does not use isAuthenticated: that stores req.originalUrl as
 * session.returnTo, so a background type-ahead request firing after the session
 * expired would overwrite the user's real destination and land them on a JSON
 * response after signing back in, losing everything they had typed.
 */
function isAuthenticatedApi(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res
    .status(401)
    .json({ options: [], error: "Your session has expired. Please sign in again." });
}

function isAdmin(req, res, next) {
  // Guarded rather than dereferencing req.user directly: this only ever runs
  // after isAuthenticated today, but a reordering would otherwise turn a denial
  // into a 500.
  if (req.user && Util.isAdmin(req.user.username)) {
    return next();
  }
  // Answered 200 previously, so every client - including the fetch in the
  // admin UI - read a refusal as success.
  return res
    .status(403)
    .send("You are not a proteomics administrator.");
}

router.route("/").get(index.index);

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB, matching the Dropzone limit
// Up to 5 supporting images, each sent as an original plus a generated preview.
const MAX_UPLOAD_FILES = 12;

const allowedExtensions = new Set(
  (config.supportedFileTypes || []).map((ext) => ext.toLowerCase())
);

const storage = multer.diskStorage({
  destination: function (_, file, cb) {
    let targetDir;
    if (file.fieldname.startsWith("preview")) {
      targetDir = config.supportingImagePreviewRoot;
    } /** else if (file.fieldname.startsWith("image")) */ else {
      targetDir = config.supportingImageRoot;
    }
    cb(null, targetDir);
  },
  filename: function (_, file, cb) {
    // originalname is attacker-controlled and is not sanitised by multer, so it
    // has to be stripped of any path component before being joined to the
    // upload directory. The random suffix prevents two files uploaded in the
    // same millisecond from overwriting each other.
    const safeName = path
      .basename(file.originalname || "upload")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-120);
    const suffix = crypto.randomBytes(4).toString("hex");
    cb(null, `${Date.now()}-${suffix}-${safeName}`);
  },
});

/**
 * Reject anything that is not one of the configured image types.
 *
 * The Dropzone restrictions are client-side only; without this a direct POST
 * could write arbitrary files into public/uploads, which is served statically
 * from the same origin.
 */
function imageFileFilter(_req, file, cb) {
  const reject = () =>
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname), false);

  const mimetype = (file.mimetype || "").toLowerCase();

  // Previews are JPEG thumbnails this app generates itself, so they are checked
  // as JPEG rather than against the user-facing allow-list. Validating them
  // against that list would mean narrowing it (to PNG-only, say) rejected every
  // upload, because the preview of an allowed .png is always a .jpg.
  if (file.fieldname.startsWith("preview")) {
    return mimetype === "image/jpeg" ? cb(null, true) : reject();
  }

  const ext = path.extname(file.originalname || "").toLowerCase();
  if (allowedExtensions.has(ext) && mimetype.startsWith("image/")) {
    return cb(null, true);
  }
  return reject();
}

const upload = multer({
  limits: {
    fieldSize: 1024 * 1024, // 1MB per text field
    fileSize: MAX_UPLOAD_BYTES,
    files: MAX_UPLOAD_FILES,
  },
  fileFilter: imageFileFilter,
  storage: storage,
});

/**
 * Run multer and translate its errors into the JSON shape the React form
 * expects. Without this a rejected upload surfaces as an HTML 500 page that the
 * form cannot parse, so the user sees a generic failure with no explanation.
 */
function handleUpload(req, res, next) {
  upload.any()(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      const messages = {
        LIMIT_FILE_SIZE: "Each image must be 2MB or smaller.",
        LIMIT_FILE_COUNT: "You can upload at most 5 images.",
        LIMIT_UNEXPECTED_FILE: `Only these image types are accepted: ${(config.supportedFileTypes || []).join(", ")}.`,
        LIMIT_FIELD_VALUE: "One of the text fields is too long.",
      };
      return res.status(400).json({
        error: messages[err.code] || "Upload rejected.",
        errors: [messages[err.code] || "Upload rejected."],
      });
    }

    console.error("Unexpected upload error:", err);
    return res.status(500).json({ error: "Could not process the upload." });
  });
}

router
  .route("/new")
  .all(isAuthenticated)
  .get(Requests.new)
  .post(handleUpload, Requests.newPost);

/**
 * Server-side proxy for the NCBI taxonomy type-ahead.
 *
 * Keeps the API key off the client, applies the NBI proxy (axios' `proxy`
 * option is Node-only and was being silently ignored in the browser), and
 * returns canonical scientific names rather than echoing back what was typed.
 */
router.route("/api/taxonomy").all(isAuthenticatedApi).get(async (req, res) => {
  const term = typeof req.query.term === "string" ? req.query.term : "";
  if (!term.trim()) {
    return res.json({ options: [] });
  }

  try {
    const options = await Tax.lookup(term);
    return res.json({ options });
  } catch (err) {
    console.error("Taxonomy lookup failed:", err.message);
    return res.status(502).json({ options: [], error: "Species lookup failed." });
  }
});

router
  .route("/request/:id")
  .all(isAuthenticated)
  //.all(isAdmin)
  .get(Requests.show);

router
  .route("/request/:id/edit")
  .all(isAuthenticated)
  //    .all(isAdmin)
  .get(Requests.edit);

router.route("/request/:id/clone").all(isAuthenticated).get(Requests.clone);

// Deletion is a POST: as a GET it could be triggered by any link an admin was
// persuaded to click.
router
  .route("/request/:id/delete")
  .all(isAuthenticated)
  .all(isAdmin)
  .post(Requests.delete);

/**
router.route("/taxlookup/:input").get(function (req, res, next) {
  const input = req.params.input;

  // taxlookup still works 1-6-24 but rewrote in single place it is actually used to overcome proxy
  Tax.search(input)
    //Tax.search("human", config.NCBIAPIKey)
    .then((mainResults) => {
      //console.log("mainRessies", mainResults);
      // mainRessies are [] if untruthy
      const isEmptyMainSpeciesSearch =
        !mainResults ||
        !mainResults.length ||
        (mainResults.length === 1 && mainResults[0] == "");

      if (!isEmptyMainSpeciesSearch) {
        // test opposite case sometimes:
        // NB change to !!isEmptyMainSpeciesSearch
        // console.log("temp override MAIN speices results to truthy");
        // return res.json({
        //   options: [
        //     { value: "jeff", label: "the shark" },
        //     { value: "annihilus", label: "the clutter" },
        //   ],
        // });

        //console.log("primary species search went well!: " + mainResults);
        return res.json({ options: [{ value: input, label: input }] });
      } else {
        Tax.spell(input)
          .then((alternateResults) => {
            const isEmptyAlternativeSpeciesSearch =
              !alternateResults ||
              !alternateResults.length ||
              (alternateResults.length === 1 && alternateResults[0] == "");

            if (isEmptyAlternativeSpeciesSearch) {
              //   console.log("temp override speices results to truthy");
              //   return res.json({
              //     options: [
              //       { value: "jeff", label: "the shark" },
              //       { value: "annihilus", label: "the clutter" },
              //     ],
              //   });

              //console.log("no alternateResults from EITHER species search");
              return res.json({ options: [] });
            }

            let options = [];
            alternateResults.map((r) => {
              if (r.length > 0) {
                options.push({
                  value: r,
                  label: r,
                });
              }
            });
            //console.log("returning these alt search results", options);
            return res.json({ options: options });
          })
          .catch((err) => {
            //console.error("backend error fetching species", err);
            return res.json({});
          });
      }
    })
    .catch((err) => {
      console.error(err);
      return res.json({});
    });
});
*/

router.route("/user/:username").all(isAuthenticated).get(Users.show);

router.route("/admin").all(isAuthenticated).all(isAdmin).get(admin.index);

router.route("/signin").get(Auth.signIn).post(Auth.signInPost);

router.route("/signout").post(Auth.signOut);

router.route("*").get((req, res) => {
  res.render("404");
});

module.exports = router;
