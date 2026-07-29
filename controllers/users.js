const Request = require("../models/request");
const Util = require("../lib/util");

const Users = {};

Users.show = async (req, res) => {
  try {
    const username = req.params.username;

    // Anyone could previously list anyone else's submissions, which also handed
    // them the request ids needed to open each one.
    if (username !== req.user.username && !Util.isAdmin(req.user.username)) {
      console.error(
        `Unauthorized listing of ${username}'s requests by ${req.user.username}`
      );
      req.flash("error", "You are not authorized to view those requests.");
      return res.redirect("/");
    }

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
    req.flash("error", "Error fetching user requests.");
    return res.redirect("/");
  }
};

module.exports = Users;
