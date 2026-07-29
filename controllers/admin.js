const Request = require("../models/request");
const config = require("../config.json");
const thinky = require("../lib/thinky.js");
const r = thinky.r;

const admin = {};

/**
 * Most requests to pull into the dashboard.
 *
 * The query had no limit, so it loaded and rendered every request ever
 * submitted on each page view - fine at a few hundred rows, progressively
 * slower for ever after. Newest first, so the cap drops the oldest.
 */
const DASHBOARD_LIMIT = 500;

admin.index = async (req, res) => {
  try {
    const requests = await Request.orderBy({ index: r.desc("createdAt") })
      .limit(DASHBOARD_LIMIT)
      .run();

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
