const fs = require("fs");
const path = require("path");
const config = require("../config.json");
const sharp = require("sharp");
const SampleImage = require("../models/sampleImage");

const imageMimes = config.supportedFileTypes;

module.exports = (socket) => {
  // Handle file upload via socket
  socket.on("upload.file", async (data) => {
    try {
      const { name, buffer, uid } = data;
      const fileBuffer = Buffer.from(buffer);

      const newPath = path.join(config.supportingImageRoot, uid);
      const tmpPath = path.join(config.supportingImagePreviewRoot, uid);

      console.log("Saving file:", newPath);

      // Write the main file
      await fs.promises.writeFile(newPath, fileBuffer);

      // Create sample image record
      const si = new SampleImage({ path: newPath, name: name, uid: uid });
      const savedSI = await si.save();

      // Check if it's an image that needs a preview
      if (imageMimes.indexOf(path.extname(name)) > -1) {
        try {
          await sharp(newPath).resize(300).toFile(tmpPath);

          socket.emit("upload.complete", {
            name: name,
            preview: `${config.supportingImagePreviewRootURL}${uid}`,
            uid: savedSI.uid,
          });
        } catch (sharpErr) {
          console.error("Sharp error:", sharpErr);
          socket.emit("upload.error", {
            name: name,
            preview: `${config.supportingImagePreviewRootURL}${uid}`,
            error: "Failed to create preview",
          });
        }
      } else {
        socket.emit("upload.complete", {
          name: name,
          preview: `${config.supportingImagePreviewRootURL}${uid}`,
          uid: uid,
        });
      }
    } catch (uploadErr) {
      console.error("Upload error:", uploadErr);
      socket.emit("upload.error", {
        error: "File could not be saved",
      });
    }
  });
};
