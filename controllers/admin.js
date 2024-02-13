const Request = require("../models/request");
const renderError = require("../lib/renderError");
const admin = {};

admin.index = (req, res) => {
  Request.run()
    .then((requests) => {
      const completedRequests = [];
      const incompleteRequests = [];
      const discardedRequests = [];
      const samplesUsedUpRequests = [];

      requests.sort(function (a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      requests.map((m) => {
        if (m.status === "complete") {
          completedRequests.push(m);
        } else if (m.status === "discarded") {
          discardedRequests.push(m);
        } else if (m.status === "samples used up") {
          samplesUsedUpRequests.push(m);
        } else {
          incompleteRequests.push(m);
        }
      });

      return res.render("admin/index", {
        // requests,
        completedRequests,
        incompleteRequests,
        discardedRequests,
        samplesUsedUpRequests,
      });
    })
    .catch((err) => {
      return renderError(err, res);
    });
};

module.exports = admin;
