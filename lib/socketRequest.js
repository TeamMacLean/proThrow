const Request = require("../models/request");
const Email = require("../lib/email");

const SocketRequest = (socket) => {
  socket.on("assignTo", async (obj) => {
    try {
      const request = await Request.get(obj.id);
      if (!request) {
        console.error("Request not found:", obj.id);
        return;
      }

      request.assignedTo = obj.admin;
      await request.save();
      await Email.updatedRequest(request);
    } catch (err) {
      console.error("Error assigning request:", err);
    }
  });

  socket.on("toggleStatus", async (obj) => {
    try {
      const request = await Request.get(obj.id);
      if (!request) {
        console.error("Request not found:", obj.id);
        return;
      }

      if (request.status !== obj.status) {
        console.log(request.status, "is now", obj.status);

        request.status = obj.status;
        const savedRequest = await request.save();

        console.log(
          savedRequest.status,
          Request.statuses.COMPLETE,
          "==?",
          savedRequest.status === Request.statuses.COMPLETE
        );

        if (savedRequest.status === Request.statuses.COMPLETE) {
          await Email.requestComplete(request);
        } else {
          await Email.updatedRequest(request);
        }
      }
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  });

  socket.on("addNote", async (obj) => {
    try {
      const request = await Request.get(obj.id);
      if (!request) {
        console.error("Request not found:", obj.id);
        return;
      }

      request.notes.push(obj.note);
      await request.save();

      socket.emit("noteAdded", { note: obj.note });

      await Email.updatedRequest(request);
    } catch (err) {
      console.error("Error adding note:", err);
    }
  });
};

module.exports = SocketRequest;
