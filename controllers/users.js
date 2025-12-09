const Request = require("../models/request");
const renderError = require("../lib/renderError");

const Users = {};

Users.show = async (req, res) => {
  try {
    const username = req.params.username;
    // Use getAll with index for faster lookups
    const result = await Request.getAll(username, { index: "createdBy" });
    const requests = await result.run();

    if (!requests || !requests.length) {
      return res.render("user/show", {
        requests: [],
        username,
        message: `No requests found for user ${username}`,
      });
    }

    // Sort by creation date (newest first)
    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.render("user/show", { requests, username });
  } catch (err) {
    console.error("Error fetching user requests:", err);
    return renderError(err, res);
  }
};

module.exports = Users;
