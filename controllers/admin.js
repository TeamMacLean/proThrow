const Request = require("../models/request");
const renderError = require("../lib/renderError");
const config = require("../config.json");

const admin = {};

admin.index = async (req, res) => {
  try {
    const requests = await Request.run();

    const completedRequests = [];
    const incompleteRequests = [];
    const discardedRequests = [];
    const samplesUsedUpRequests = [];

    // Sort by creation date (newest first)
    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
    return renderError(err, res);
  }
};

module.exports = admin;
