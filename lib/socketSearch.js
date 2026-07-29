const Request = require("../models/request");
const Util = require("../lib/util");

/** Most matches to return for a navbar search. */
const SEARCH_LIMIT = 20;
/** Ignore very short terms: they match almost everything and cost a scan. */
const MIN_SEARCH_LENGTH = 2;

/**
 * Navbar search over requests.
 *
 * The previous implementation resolved `data.split("")`, so the dropdown listed
 * the individual characters of whatever had been typed - the feature had never
 * actually searched anything.
 *
 * Results are scoped to what the caller may see: an admin searches everything,
 * anyone else only their own requests.
 *
 * @param {object} socket - a socket.io socket carrying an authenticated user
 */
const SocketSearch = (socket) => {
  socket.on("search", async (searchString) => {
    try {
      const term = typeof searchString === "string" ? searchString.trim() : "";
      if (term.length < MIN_SEARCH_LENGTH) {
        return socket.emit("search result", []);
      }

      const user = socket.request.user;
      const username = user && user.username;
      const needle = term.toLowerCase();

      let query = Request;
      if (!Util.isAdmin(username)) {
        query = Request.filter({ createdBy: username });
      }

      const requests = await query.run();

      const matches = requests
        .filter((request) =>
          [
            request.janCode,
            request.species,
            request.secondSpecies,
            request.tissue,
            request.createdBy,
            request.createdByName,
            request.projectDescription,
          ].some(
            (field) =>
              typeof field === "string" && field.toLowerCase().includes(needle)
          )
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, SEARCH_LIMIT)
        .map((request) => ({
          id: request.id,
          janCode: request.janCode,
          species: request.species,
          status: request.status,
        }));

      socket.emit("search result", matches);
    } catch (err) {
      console.error("Search error:", err);
      socket.emit("search error", { error: "Search failed." });
    }
  });
};

module.exports = SocketSearch;
