const express = require("express");
const router = express.Router();
const multer = require("multer");

const Util = require("./lib/util");
const admin = require("./controllers/admin");
const index = require("./controllers/index");
const Auth = require("./controllers/auth");
const Users = require("./controllers/users");
const Requests = require("./controllers/requests");
const Tax = require("./lib/taxLookup");

const config = require("./config");

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    req.session.returnTo = req.path;
    return res.redirect("/signin");
  }
}

function isAdmin(req, res, next) {
  if (Util.isAdmin(req.user.username)) {
    return next();
  } else {
    return res.send("your not an admin!");
  }
}

router.route("/").get(index.index);

const upload = multer();

router
  .route("/new")
  .all(isAuthenticated)
  .get(Requests.new)
  .post(upload.none(), Requests.newPost);

//REQUEST

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

router
  .route("/request/:id/delete")
  .all(isAuthenticated)
  .all(isAdmin)
  .get(Requests.delete);

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

//USER
router.route("/user/:username").all(isAuthenticated).get(Users.show);
//TODO

//ADMIN

router.route("/admin").all(isAuthenticated).all(isAdmin).get(admin.index);

//AUTH

router.route("/signin").get(Auth.signIn).post(Auth.signInPost);

router.route("/signout").get(Auth.signOut);

router.route("*").get((req, res) => {
  res.render("404");
});

module.exports = router;
