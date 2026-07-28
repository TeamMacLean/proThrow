/**
 * Unit tests for SampleImage's on-disk cleanup.
 *
 * `path` is read back out of the database and then handed to an unlink, so the
 * containment check is the thing standing between a corrupted or crafted row
 * and an arbitrary file deletion.
 */

const fs = require("fs-extra");
const path = require("path");
const os = require("os");

const thinky = require("../../lib/thinky");
const SampleImage = require("../../models/sampleImage");
const config = require("../../config.json");

const uploadRoot = path.resolve(config.supportingImageRoot);
const previewRoot = path.resolve(config.supportingImagePreviewRoot);

let scratchDir;

beforeAll(async () => {
  await fs.ensureDir(uploadRoot);
  await fs.ensureDir(previewRoot);
  scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), "prothrow-test-"));
});

afterAll(async () => {
  if (scratchDir) await fs.remove(scratchDir);
  if (thinky.r && thinky.r.getPoolMaster) {
    try {
      await thinky.r.getPoolMaster().drain();
    } catch (_e) {
      // Ignore errors during cleanup
    }
  }
});

describe("SampleImage.removeFilesFor", () => {
  it("removes both the upload and its preview", async () => {
    const imagePath = path.join(uploadRoot, "unit-test-image.png");
    const previewUid = "unit-test-preview.jpg";
    const previewPath = path.join(previewRoot, previewUid);

    await fs.writeFile(imagePath, "image");
    await fs.writeFile(previewPath, "preview");

    await SampleImage.removeFilesFor([{ path: imagePath, previewUid }]);

    expect(await fs.pathExists(imagePath)).toBe(false);
    expect(await fs.pathExists(previewPath)).toBe(false);
  });

  it("does not throw when the files are already gone", async () => {
    await expect(
      SampleImage.removeFilesFor([
        {
          path: path.join(uploadRoot, "never-existed.png"),
          previewUid: "never-existed.jpg",
        },
      ])
    ).resolves.toBeUndefined();
  });

  // The guard that matters: a row whose path points somewhere else entirely
  // must not be able to delete that file.
  it("refuses to delete a file outside the upload directories", async () => {
    const outsider = path.join(scratchDir, "important.conf");
    await fs.writeFile(outsider, "do not delete me");

    await SampleImage.removeFilesFor([{ path: outsider }]);

    expect(await fs.pathExists(outsider)).toBe(true);
  });

  it("refuses a traversal path that escapes the upload directory", async () => {
    const outsider = path.join(scratchDir, "escaped.conf");
    await fs.writeFile(outsider, "do not delete me");

    const traversal = path.join(
      uploadRoot,
      path.relative(uploadRoot, outsider) // ../../.../escaped.conf
    );

    await SampleImage.removeFilesFor([{ path: traversal }]);

    expect(await fs.pathExists(outsider)).toBe(true);
  });

  it("handles an empty or missing list", async () => {
    await expect(SampleImage.removeFilesFor([])).resolves.toBeUndefined();
    await expect(SampleImage.removeFilesFor(undefined)).resolves.toBeUndefined();
  });

  it("skips an image row that has no path", async () => {
    await expect(
      SampleImage.removeFilesFor([{ description: "no path here" }])
    ).resolves.toBeUndefined();
  });
});
