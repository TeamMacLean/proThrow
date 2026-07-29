const Request = require("../models/request");
const Email = require("../lib/email");
const Util = require("../lib/util");
const config = require("../config.json");
const { FIELD_MAX_LENGTHS } = require("./formOptions");

/**
 * Socket handlers for the admin controls on the request page.
 *
 * Every handler here mutates a request that is addressed purely by an id sent
 * from the browser, so each one must establish who is asking and whether they
 * are allowed to. Previously none of them did: an unauthenticated websocket
 * could reassign any request, drive any request to any status (firing a
 * "completed" email at the submitter each time), and append arbitrary notes.
 *
 * @param {object} socket - a socket.io socket carrying an authenticated user
 */
const SocketRequest = (socket) => {
  const user = socket.request.user;

  /**
   * @returns {string} the signed-in username
   */
  const username = () => user && user.username;

  /**
   * Load a request and confirm the caller may act on it.
   *
   * @param {*} id
   * @param {{adminOnly?: boolean}} [options]
   * @returns {Promise<object|null>}
   */
  const loadPermitted = async (id, { adminOnly = false } = {}) => {
    if (typeof id !== "string" || !id) {
      socket.emit("actionError", { error: "A request id is required." });
      return null;
    }

    const request = await Request.get(id);
    if (!request) {
      socket.emit("actionError", { error: "That request no longer exists." });
      return null;
    }

    const isAdmin = Util.isAdmin(username());
    const isOwner = request.createdBy === username();

    if (adminOnly ? !isAdmin : !isAdmin && !isOwner) {
      console.warn(
        `Refused socket action on request ${id} for user ${username()}`
      );
      socket.emit("actionError", {
        error: "You are not allowed to change this request.",
      });
      return null;
    }

    return request;
  };

  socket.on("assignTo", async (obj) => {
    try {
      const assignee = obj && obj.admin;
      // Only real admins may be assigned work, and only an admin may assign it.
      if (assignee !== "unassigned" && !config.admins.includes(assignee)) {
        return socket.emit("actionError", {
          error: "That person is not a proteomics administrator.",
        });
      }

      const request = await loadPermitted(obj && obj.id, { adminOnly: true });
      if (!request) return;

      request.assignedTo = assignee;
      await request.save();
      socket.emit("assignSaved", { id: request.id, assignedTo: assignee });
      await Email.updatedRequest(
        request,
        assignee === "unassigned"
          ? "The request is no longer assigned to anyone."
          : `The request was assigned to ${assignee}.`
      );
    } catch (err) {
      console.error("Error assigning request:", err);
      socket.emit("actionError", { error: "Could not assign the request." });
    }
  });

  socket.on("toggleStatus", async (obj) => {
    try {
      const status = obj && obj.status;
      // Guards against an arbitrary string becoming a stored status, which then
      // renders on the dashboard and never matches any filter.
      if (!Request.allStatuses.includes(status)) {
        return socket.emit("actionError", { error: "Unknown status." });
      }

      const request = await loadPermitted(obj && obj.id, { adminOnly: true });
      if (!request) return;

      if (request.status === status) return;

      request.status = status;
      const savedRequest = await request.save();
      socket.emit("statusSaved", { id: savedRequest.id, status });

      if (savedRequest.status === Request.statuses.COMPLETE) {
        await Email.requestComplete(savedRequest);
      } else {
        await Email.updatedRequest(
          savedRequest,
          `The status was changed to "${status}".`
        );
      }
    } catch (err) {
      console.error("Error toggling status:", err);
      socket.emit("actionError", { error: "Could not update the status." });
    }
  });

  socket.on("addNote", async (obj) => {
    try {
      const note = obj && obj.note;
      if (typeof note !== "string" || !note.trim()) {
        return socket.emit("actionError", { error: "The note is empty." });
      }

      // Notes are readable by the submitter too, so the creator may add one as
      // well as an admin.
      const request = await loadPermitted(obj && obj.id);
      if (!request) return;

      const trimmed = note.trim().slice(0, FIELD_MAX_LENGTHS.note);
      // Appended in the database rather than by rewriting the whole document,
      // so two people adding a note at the same time do not overwrite each
      // other.
      request.notes = await Request.appendNote(request.id, trimmed);

      // Echoes the stored value rather than the submitted one, so the client
      // renders exactly what was saved.
      socket.emit("noteAdded", { note: trimmed });

      await Email.updatedRequest(request, "A note was added to the request.");
    } catch (err) {
      console.error("Error adding note:", err);
      socket.emit("actionError", { error: "Could not add the note." });
    }
  });
};

module.exports = SocketRequest;
