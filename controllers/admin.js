const Request = require("../models/request");
const config = require("../config.json");
const thinky = require("../lib/thinky.js");
const r = thinky.r;

const admin = {};

admin.index = async (req, res) => {
  try {
    const requests = await Request.orderBy({ index: r.desc("createdAt") }).run();

    const completedRequests = [];
    const incompleteRequests = [];
    const discardedRequests = [];
    const samplesUsedUpRequests = [];

    requests.forEach((request) => {
      switch (request.status) {
        case "complete":
          completedRequests.push(request);
          break;
        case "discarded":
          discardedRequests.push(request);
          break;
        case "samples used up":
          samplesUsedUpRequests.push(request);
          break;
        default:
          incompleteRequests.push(request);
      }
    });

    return res.render("admin/index", {
      completedRequests,
      incompleteRequests,
      discardedRequests,
      samplesUsedUpRequests,
      admins: config.admins,
    });
  } catch (err) {
    console.error("Error loading admin dashboard:", err);
    req.flash("error", "Error loading admin dashboard.");
    return res.redirect("/");
  }
};

module.exports = admin;
