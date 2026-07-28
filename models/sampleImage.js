const thinky = require("../lib/thinky.js");
const type = thinky.type;
const config = require("../config.json");
const fs = require("fs-extra");
const path = require("path");

/**
 * The only directories an image file may be deleted from.
 *
 * `path` is read back out of the database, so it is treated as untrusted:
 * anything resolving outside these roots is refused rather than unlinked.
 */
const uploadRoots = [
  config.supportingImageRoot,
  config.supportingImagePreviewRoot,
]
  .filter(Boolean)
  .map((root) => path.resolve(root));

/**
 * @param {string} target
 * @returns {boolean} whether the path sits inside a configured upload root
 */
function isInsideUploadRoots(target) {
  const resolved = path.resolve(target);
  return uploadRoots.some(
    (root) => resolved === root || resolved.startsWith(root + path.sep)
  );
}

const SampleImage = thinky.createModel("SampleImage", {
  id: type.string(),
  uid: type.string().required(), // the full file name including extension
  requestID: type.string(),
  name: type.string().required(),
  path: type.string().required(), // the full absolute path including full file name and extension
  // The preview is written as a separate upload, so its filename cannot be
  // derived from `uid`: both used to be built from Date.now() independently and
  // silently diverged whenever the two writes landed on different milliseconds,
  // leaving getPreviewURL() pointing at a file that did not exist.
  previewUid: type.string().default(""),
  description: type.string(),
});

SampleImage.define("getURL", function () {
  return config.supportingImageRootURL + this.uid;
});

SampleImage.define("getPreviewURL", function () {
  // Fall back to `uid` for records created before previewUid existed.
  return config.supportingImagePreviewRootURL + (this.previewUid || this.uid);
});

/**
 * Delete the files backing a set of images from disk.
 *
 * Removing the database row on its own used to leave both the upload and its
 * generated preview behind forever, so public/uploads grew without bound and
 * kept serving images belonging to deleted requests.
 *
 * Failures are logged rather than thrown: an orphaned file is a housekeeping
 * problem, and it should not abort the deletion of the request itself.
 *
 * @param {Array} images - SampleImage documents (or plain objects)
 * @returns {Promise<void>}
 */
SampleImage.removeFilesFor = async (images) => {
  for (const image of images || []) {
    const targets = [];
    if (image.path) targets.push(image.path);
    // The preview's directory is not stored, only its filename, so it is
    // rebuilt from the configured root the same way getPreviewURL does.
    if (image.previewUid && config.supportingImagePreviewRoot) {
      targets.push(
        path.join(config.supportingImagePreviewRoot, image.previewUid)
      );
    }

    for (const target of targets) {
      if (!isInsideUploadRoots(target)) {
        console.error(
          `Refusing to delete "${target}": outside the configured upload directories.`
        );
        continue;
      }
      try {
        await fs.remove(target);
      } catch (err) {
        console.error(`Could not remove image file ${target}:`, err.message);
      }
    }
  }
};

/**
 * Delete this image's files from disk.
 *
 * @returns {Promise<void>}
 */
SampleImage.define("removeFiles", function () {
  return SampleImage.removeFilesFor([this]);
});

// Create index for faster lookups by requestID
SampleImage.ensureIndex("requestID");

module.exports = SampleImage;

const Request = require("./request");
SampleImage.belongsTo(Request, "request", "requestID", "id");
