const request = require("supertest");
const fs = require("fs-extra");
const path = require("path");
const config = require("../../config.json");
const thinky = require("../../lib/thinky");
const Request = require("../../models/request");
const SampleDescription = require("../../models/sampleDescription");
const SampleImage = require("../../models/sampleImage");
const Construct = require("../../models/construct");
const { checkDatabaseAvailable } = require("../helpers/database");

/** Smallest valid PNG, so multer's image checks see a real file. */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

/** Smallest valid JPEG, matching what the client-side resizer produces. */
const JPEG_1X1 = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64"
);

let app;
let sessionCookie;
let r;
let testRequestData;
let rethinkAvailable = false;

/**
 * A complete, valid set of core fields.
 *
 * Every value here is one the form actually offers; the server now rejects
 * anything else on create, so a fixture that drifts from lib/formOptions.js
 * will fail loudly rather than quietly storing an impossible request.
 */
const validFields = (overrides = {}) => ({
  species: "Homo sapiens",
  secondSpecies: "",
  tissue: "leaves",
  tissueAgeNum: "10",
  tissueAgeType: "day(s)",
  growthConditions: "soil grown",
  analysisType: "Discovery",
  secondaryAnalysisType: "None",
  typeOfPTM: "Phosphorylation",
  quantitativeAnalysisRequired: "Relative",
  typeOfLabeling: "Label-free",
  labelUsed: "None",
  samplePrep: "crude extract",
  digestion: "in gel",
  enzyme: "Trypsin",
  projectDescription: "Test project",
  hopedAnalysis: "Test analysis",
  bufferComposition: "Test buffer",
  ...overrides,
});

/**
 * Apply a field map to a supertest request as multipart fields.
 */
const withFields = (req, fields) => {
  Object.entries(fields).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => req.field(key, entry));
    } else {
      req.field(key, value);
    }
  });
  return req;
};

async function checkRethinkDB() {
  return checkDatabaseAvailable(r);
}

async function loginAs(username) {
  const res = await request(app)
    .post("/signin")
    .send({ username, password: "password" })
    .expect(302);
  return res.headers["set-cookie"];
}

beforeAll(async () => {
  app = require("../../app");
  r = thinky.r;

  rethinkAvailable = await checkRethinkDB();
  if (!rethinkAvailable) {
    console.log("RethinkDB not available - skipping setup");
    return;
  }

  sessionCookie = await loginAs("deeks");
});

afterAll(async () => {
  if (r && r.getPoolMaster) {
    try {
      await r.getPoolMaster().drain();
    } catch (_e) {
      // Ignore errors during cleanup
    }
  }
});

describe("Requests Endpoints Integration Test", () => {
  describe("POST /new", () => {
    it("should successfully create a new request via JSON endpoint with nested arrays", async () => {
      if (!rethinkAvailable) return;
      const response = await withFields(
        request(app).post("/new").set("Cookie", sessionCookie),
        validFields({
          samplesSubmitted: "true",
          constructsSubmitted: "true",
          "sampleNumbers[]": "1",
          "sampleLabels[]": "Sample 1",
          "sampleDescriptions[]": "Desc 1",
          "accessions[]": "ACC1",
          "sequenceInfos[]": "SEQ1",
          "dbEntries[]": "DB1",
        })
      ).expect(200);

      expect(response.body).toHaveProperty("requestID");
      expect(response.body).toHaveProperty("janCode");
      expect(response.body.warnings).toEqual([]);

      testRequestData = response.body;
    });

    it("should reject a value that is not one of the form's options", async () => {
      if (!rethinkAvailable) return;
      const response = await withFields(
        request(app).post("/new").set("Cookie", sessionCookie),
        validFields({ digestion: "whatever the client felt like" })
      ).expect(400);

      expect(response.body.errors.join(" ")).toContain('"digestion"');
    });

    it("should reject a request with no species", async () => {
      if (!rethinkAvailable) return;
      const response = await withFields(
        request(app).post("/new").set("Cookie", sessionCookie),
        validFields({ species: "" })
      ).expect(400);

      expect(response.body.errors.join(" ")).toContain('"species"');
    });

    it("should accept a request with no second species", async () => {
      if (!rethinkAvailable) return;
      const response = await withFields(
        request(app).post("/new").set("Cookie", sessionCookie),
        validFields({ secondSpecies: "" })
      ).expect(200);

      const created = await Request.get(response.body.requestID);
      expect(created.secondSpecies).toBe("");

      await created.delete();
    });

    it("should deny POST edit access to a non-admin who didn't create the request", async () => {
      if (!rethinkAvailable) return;
      const nonAdminCookie = await loginAs("regular_user");

      const response = await withFields(
        request(app).post("/new").set("Cookie", nonAdminCookie),
        validFields({
          requestID: testRequestData.requestID,
          janCode: testRequestData.janCode,
          species: "Malicious Mouse",
        })
      ).expect(403);

      expect(response.body.error).toBe(
        "You are not authorized to edit this request."
      );

      const dbReq = await Request.get(testRequestData.requestID);
      expect(dbReq.species).toBe("Homo sapiens");
    });

    it("should successfully update an existing request", async () => {
      if (!rethinkAvailable) return;
      const response = await withFields(
        request(app).post("/new").set("Cookie", sessionCookie),
        validFields({
          requestID: testRequestData.requestID,
          janCode: testRequestData.janCode,
          samplesSubmitted: "true",
          constructsSubmitted: "true",
          species: "Mus musculus",
          projectDescription: "Updated project",
          "sampleNumbers[]": "1",
          "sampleLabels[]": "Sample 1",
          "sampleDescriptions[]": "Desc 1",
          "accessions[]": "ACC1",
          "sequenceInfos[]": "SEQ1",
          "dbEntries[]": "DB1",
        })
      ).expect(200);

      expect(response.body.requestID).toBe(testRequestData.requestID);

      const updatedReq = await Request.get(testRequestData.requestID)
        .getJoin({ samples: true, constructs: true })
        .run();
      expect(updatedReq.species).toBe("Mus musculus");
      expect(updatedReq.projectDescription).toBe("Updated project");

      // Relations must be keyed on requestID (capital D) or they orphan.
      expect(updatedReq.samples.length).toBeGreaterThan(0);
      expect(updatedReq.samples[0].sampleNumber).toBe("1");
      expect(updatedReq.samples[0].requestID).toBe(testRequestData.requestID);

      expect(updatedReq.constructs.length).toBeGreaterThan(0);
      expect(updatedReq.constructs[0].accession).toBe("ACC1");
      expect(updatedReq.constructs[0].requestID).toBe(
        testRequestData.requestID
      );
    });

    // Regression: the form once failed to submit any sample fields at all,
    // and the controller read that empty list as "delete every sample".
    // An edit that carries no samples section must leave the rows untouched.
    it("should NOT delete existing samples when the payload omits the samples section", async () => {
      if (!rethinkAvailable) return;

      const before = await SampleDescription.filter({
        requestID: testRequestData.requestID,
      }).run();
      expect(before.length).toBeGreaterThan(0);

      await withFields(
        request(app).post("/new").set("Cookie", sessionCookie),
        validFields({
          requestID: testRequestData.requestID,
          janCode: testRequestData.janCode,
          species: "Mus musculus",
          projectDescription: "Edited without touching samples",
        })
      ).expect(200);

      const after = await SampleDescription.filter({
        requestID: testRequestData.requestID,
      }).run();
      expect(after.length).toBe(before.length);
      expect(after[0].sampleNumber).toBe(before[0].sampleNumber);
    });

    it("should delete samples when the payload says it carried the samples section", async () => {
      if (!rethinkAvailable) return;

      await withFields(
        request(app).post("/new").set("Cookie", sessionCookie),
        validFields({
          requestID: testRequestData.requestID,
          janCode: testRequestData.janCode,
          samplesSubmitted: "true",
          species: "Mus musculus",
        })
      ).expect(200);

      const after = await SampleDescription.filter({
        requestID: testRequestData.requestID,
      }).run();
      expect(after.length).toBe(0);

      // Put one back so later assertions have something to work with.
      await withFields(
        request(app).post("/new").set("Cookie", sessionCookie),
        validFields({
          requestID: testRequestData.requestID,
          janCode: testRequestData.janCode,
          samplesSubmitted: "true",
          species: "Mus musculus",
          "sampleNumbers[]": "1",
          "sampleLabels[]": "Sample 1",
          "sampleDescriptions[]": "Desc 1",
        })
      ).expect(200);
    });

    // Regression: rows used to be matched by value, so two samples sharing a
    // number both resolved to the same stored row - the first was overwritten
    // by the second and the unmatched row was deleted as an orphan.
    it("should keep both rows when two samples share a sample number", async () => {
      if (!rethinkAvailable) return;

      const created = await withFields(
        request(app).post("/new").set("Cookie", sessionCookie),
        validFields({
          samplesSubmitted: "true",
          "sampleNumbers[]": ["1", "1"],
          "sampleLabels[]": ["First tag", "Second tag"],
          "sampleDescriptions[]": ["Desc A", "Desc B"],
        })
      ).expect(200);

      // Edit again with the same duplicated numbers.
      await withFields(
        request(app).post("/new").set("Cookie", sessionCookie),
        validFields({
          requestID: created.body.requestID,
          janCode: created.body.janCode,
          samplesSubmitted: "true",
          "sampleNumbers[]": ["1", "1"],
          "sampleLabels[]": ["First tag", "Second tag"],
          "sampleDescriptions[]": ["Desc A", "Desc B"],
        })
      ).expect(200);

      const samples = (
        await SampleDescription.filter({
          requestID: created.body.requestID,
        }).run()
      ).sort((a, b) => a.position - b.position);

      expect(samples).toHaveLength(2);
      expect(samples.map((s) => s.sampleLabel)).toEqual([
        "First tag",
        "Second tag",
      ]);

      const doomed = await Request.get(created.body.requestID);
      await doomed.removeChildren();
      await doomed.delete();
    });

    it("should keep both rows when two constructs share an accession", async () => {
      if (!rethinkAvailable) return;

      const created = await withFields(
        request(app).post("/new").set("Cookie", sessionCookie),
        validFields({
          constructsSubmitted: "true",
          "accessions[]": ["AT1G01010", "AT1G01010"],
          "sequenceInfos[]": ["MSEQ-GFP-TAG", "MSEQ-HIS-TAG"],
          "dbEntries[]": ["entry-a", "entry-b"],
        })
      ).expect(200);

      await withFields(
        request(app).post("/new").set("Cookie", sessionCookie),
        validFields({
          requestID: created.body.requestID,
          janCode: created.body.janCode,
          constructsSubmitted: "true",
          "accessions[]": ["AT1G01010", "AT1G01010"],
          "sequenceInfos[]": ["MSEQ-GFP-TAG", "MSEQ-HIS-TAG"],
          "dbEntries[]": ["entry-a", "entry-b"],
        })
      ).expect(200);

      const constructs = (
        await Construct.filter({ requestID: created.body.requestID }).run()
      ).sort((a, b) => a.position - b.position);

      expect(constructs).toHaveLength(2);
      // The distinguishing field must survive; losing it loses the sequence.
      expect(constructs.map((c) => c.sequenceInfo)).toEqual([
        "MSEQ-GFP-TAG",
        "MSEQ-HIS-TAG",
      ]);

      const doomed = await Request.get(created.body.requestID);
      await doomed.removeChildren();
      await doomed.delete();
    });

    it("should let a sample number be corrected in place", async () => {
      if (!rethinkAvailable) return;

      const created = await withFields(
        request(app).post("/new").set("Cookie", sessionCookie),
        validFields({
          samplesSubmitted: "true",
          "sampleNumbers[]": "7",
          "sampleLabels[]": "Original",
          "sampleDescriptions[]": "Desc",
        })
      ).expect(200);

      await withFields(
        request(app).post("/new").set("Cookie", sessionCookie),
        validFields({
          requestID: created.body.requestID,
          janCode: created.body.janCode,
          samplesSubmitted: "true",
          "sampleNumbers[]": "8",
          "sampleLabels[]": "Original",
          "sampleDescriptions[]": "Desc",
        })
      ).expect(200);

      const samples = await SampleDescription.filter({
        requestID: created.body.requestID,
      }).run();
      expect(samples).toHaveLength(1);
      expect(samples[0].sampleNumber).toBe("8");

      const doomed = await Request.get(created.body.requestID);
      await doomed.removeChildren();
      await doomed.delete();
    });

    it("should reject an edit whose updatedAt is stale", async () => {
      if (!rethinkAvailable) return;

      const response = await withFields(
        request(app).post("/new").set("Cookie", sessionCookie),
        validFields({
          requestID: testRequestData.requestID,
          janCode: testRequestData.janCode,
          updatedAt: new Date(0).toISOString(),
          species: "Mus musculus",
        })
      ).expect(409);

      expect(response.body.error).toContain("changed by someone else");
    });

    it("should accept an edit whose updatedAt matches the stored value", async () => {
      if (!rethinkAvailable) return;

      const current = await Request.get(testRequestData.requestID);
      await withFields(
        request(app).post("/new").set("Cookie", sessionCookie),
        validFields({
          requestID: testRequestData.requestID,
          janCode: testRequestData.janCode,
          updatedAt: new Date(current.updatedAt).toISOString(),
          species: "Mus musculus",
        })
      ).expect(200);
    });

    // The real form reads updatedAt out of the window.existingRequest blob that
    // EJS renders, so the round trip has to survive that serialisation - a
    // precision mismatch here would 409 on every single legitimate edit.
    it("should accept the updatedAt value exactly as the edit page renders it", async () => {
      if (!rethinkAvailable) return;

      const page = await request(app)
        .get(`/request/${testRequestData.requestID}/edit`)
        .set("Cookie", sessionCookie)
        .expect(200);

      const match = page.text.match(/window\.existingRequest = (\{.*?\});/s);
      expect(match).not.toBeNull();
      const rendered = JSON.parse(match[1].replace(/\\u003c/g, "<"));
      expect(rendered.updatedAt).toBeTruthy();

      await withFields(
        request(app).post("/new").set("Cookie", sessionCookie),
        validFields({
          requestID: testRequestData.requestID,
          janCode: testRequestData.janCode,
          updatedAt: rendered.updatedAt,
          species: "Mus musculus",
          projectDescription: "Round-tripped through the edit page",
        })
      ).expect(200);

      const saved = await Request.get(testRequestData.requestID);
      expect(saved.projectDescription).toBe(
        "Round-tripped through the edit page"
      );
    });

    it("should reject a malformed JAN code on edit", async () => {
      if (!rethinkAvailable) return;

      const response = await withFields(
        request(app).post("/new").set("Cookie", sessionCookie),
        validFields({
          requestID: testRequestData.requestID,
          janCode: "not a valid <code>",
          species: "Mus musculus",
        })
      ).expect(400);

      expect(response.body.error).toContain("label");
    });

    it("should keep an off-list value editable on an existing request", async () => {
      if (!rethinkAvailable) return;

      // Simulate a legacy record whose stored value predates the current list.
      const legacy = await Request.get(testRequestData.requestID);
      legacy.digestion = "a historic technique";
      await legacy.save();

      await withFields(
        request(app).post("/new").set("Cookie", sessionCookie),
        validFields({
          requestID: testRequestData.requestID,
          janCode: testRequestData.janCode,
          digestion: "a historic technique",
          species: "Mus musculus",
          projectDescription: "Fixing a typo on a legacy record",
        })
      ).expect(200);

      const saved = await Request.get(testRequestData.requestID);
      expect(saved.projectDescription).toBe("Fixing a typo on a legacy record");

      saved.digestion = "in gel";
      await saved.save();
    });

    // Regression: multer had no fileFilter, so a direct POST could write any
    // file type into public/uploads, which is served from the same origin.
    it("should reject an upload that is not an allowed image type", async () => {
      if (!rethinkAvailable) return;

      const req = request(app).post("/new").set("Cookie", sessionCookie);
      withFields(req, validFields());
      const response = await req
        .attach("image[0]", Buffer.from("<script>alert(1)</script>"), {
          filename: "evil.html",
          contentType: "text/html",
        })
        .expect(400);

      expect(response.body.error).toMatch(/image types/i);
    });

    it("should reject an image disguised with an allowed extension", async () => {
      if (!rethinkAvailable) return;

      const req = request(app).post("/new").set("Cookie", sessionCookie);
      withFields(req, validFields());
      const response = await req
        .attach("image[0]", Buffer.from("not really an image"), {
          filename: "evil.png",
          contentType: "text/html",
        })
        .expect(400);

      expect(response.body.error).toMatch(/image types/i);
    });

    describe("supporting images", () => {
      /**
       * Create a request carrying one image and its generated preview, in the
       * same shape the browser sends them.
       */
      const createWithImage = async () => {
        const req = request(app).post("/new").set("Cookie", sessionCookie);
        withFields(
          req,
          validFields({
            "imageNames[0]": "gel.png",
            "imageDescriptions[0]": "A gel",
          })
        );
        return (
          req
            .attach("image[0]", PNG_1X1, {
              filename: "gel.png",
              contentType: "image/png",
            })
            // The form generates the preview with the image resizer, which
            // always emits JPEG regardless of the original's format.
            .attach("preview[0]", JPEG_1X1, {
              filename: "gel.jpg",
              contentType: "image/jpeg",
            })
            .expect(200)
        );
      };

      it("stores the image and its preview under separate filenames", async () => {
        if (!rethinkAvailable) return;

        const created = await createWithImage();
        const images = await SampleImage.filter({
          requestID: created.body.requestID,
        }).run();

        expect(images).toHaveLength(1);
        expect(images[0].description).toBe("A gel");
        expect(images[0].uid).toBeTruthy();
        // Previously the preview filename was re-derived from the image's,
        // which broke whenever the two writes landed on different milliseconds.
        expect(images[0].previewUid).toBeTruthy();
        expect(images[0].previewUid).not.toBe(images[0].uid);
        expect(images[0].getPreviewURL()).toContain(images[0].previewUid);

        const doomed = await Request.get(created.body.requestID);
        await doomed.removeChildren();
        await doomed.delete();
      });

      it("deletes an image, and its files, when the edit marks it for deletion", async () => {
        if (!rethinkAvailable) return;

        const created = await createWithImage();
        const [image] = await SampleImage.filter({
          requestID: created.body.requestID,
        }).run();

        const imagePath = image.path;
        const previewPath = path.join(
          config.supportingImagePreviewRoot,
          image.previewUid
        );
        expect(await fs.pathExists(imagePath)).toBe(true);
        expect(await fs.pathExists(previewPath)).toBe(true);

        await withFields(
          request(app).post("/new").set("Cookie", sessionCookie),
          validFields({
            requestID: created.body.requestID,
            janCode: created.body.janCode,
            "preExistingSupportingImages[0][id]": image.id,
            "preExistingSupportingImages[0][deleteRequest]": "true",
          })
        ).expect(200);

        const remaining = await SampleImage.filter({
          requestID: created.body.requestID,
        }).run();
        expect(remaining).toHaveLength(0);

        // Deleting the row used to leave both files on disk forever.
        expect(await fs.pathExists(imagePath)).toBe(false);
        expect(await fs.pathExists(previewPath)).toBe(false);

        const doomed = await Request.get(created.body.requestID);
        await doomed.delete();
      });

      it("removes image files when the whole request is deleted", async () => {
        if (!rethinkAvailable) return;

        const created = await createWithImage();
        const [image] = await SampleImage.filter({
          requestID: created.body.requestID,
        }).run();

        const imagePath = image.path;
        const previewPath = path.join(
          config.supportingImagePreviewRoot,
          image.previewUid
        );
        expect(await fs.pathExists(imagePath)).toBe(true);

        await request(app)
          .post(`/request/${created.body.requestID}/delete`)
          .set("Cookie", sessionCookie)
          .expect(302);

        expect(await fs.pathExists(imagePath)).toBe(false);
        expect(await fs.pathExists(previewPath)).toBe(false);
      });

      it("updates an image description when the edit marks it edited", async () => {
        if (!rethinkAvailable) return;

        const created = await createWithImage();
        const [image] = await SampleImage.filter({
          requestID: created.body.requestID,
        }).run();

        await withFields(
          request(app).post("/new").set("Cookie", sessionCookie),
          validFields({
            requestID: created.body.requestID,
            janCode: created.body.janCode,
            "preExistingSupportingImages[0][id]": image.id,
            "preExistingSupportingImages[0][editedDescription]": "true",
            "preExistingSupportingImages[0][description]": "A better caption",
          })
        ).expect(200);

        const updated = await SampleImage.get(image.id);
        expect(updated.description).toBe("A better caption");

        const doomed = await Request.get(created.body.requestID);
        await doomed.removeChildren();
        await doomed.delete();
      });

      // The image IDs come from the browser, so one request's payload must not
      // be able to delete another request's images.
      it("ignores an image id belonging to a different request", async () => {
        if (!rethinkAvailable) return;

        const victim = await createWithImage();
        const attacker = await createWithImage();

        const [victimImage] = await SampleImage.filter({
          requestID: victim.body.requestID,
        }).run();

        await withFields(
          request(app).post("/new").set("Cookie", sessionCookie),
          validFields({
            requestID: attacker.body.requestID,
            janCode: attacker.body.janCode,
            "preExistingSupportingImages[0][id]": victimImage.id,
            "preExistingSupportingImages[0][deleteRequest]": "true",
          })
        ).expect(200);

        const stillThere = await SampleImage.get(victimImage.id);
        expect(stillThere).not.toBeNull();

        for (const id of [victim.body.requestID, attacker.body.requestID]) {
          const doomed = await Request.get(id);
          await doomed.removeChildren();
          await doomed.delete();
        }
      });
    });

    it("should ignore silentUpdate from a non-admin", async () => {
      if (!rethinkAvailable) return;

      // A request the non-admin owns, so the edit itself is permitted.
      const ownCookie = await loginAs("regular_user");
      const created = await withFields(
        request(app).post("/new").set("Cookie", ownCookie),
        validFields()
      ).expect(200);

      const response = await withFields(
        request(app).post("/new").set("Cookie", ownCookie),
        validFields({
          requestID: created.body.requestID,
          janCode: created.body.janCode,
          silentUpdate: "true",
          projectDescription: "Attempting a silent update",
        })
      ).expect(200);

      // The edit succeeds; the flag simply carries no authority. The assertion
      // that matters is that the request still saved correctly.
      expect(response.body.editingForm).toBe(true);

      const saved = await Request.get(created.body.requestID);
      expect(saved.projectDescription).toBe("Attempting a silent update");

      await saved.delete();
    });
  });

  describe("GET /api/taxonomy", () => {
    // Regression: this sat behind the page auth guard, which stores the URL as
    // session.returnTo. A background type-ahead request firing after the
    // session expired sent the user to a JSON blob after signing back in,
    // losing everything they had typed into the form.
    it("should answer 401 JSON when signed out, without hijacking returnTo", async () => {
      if (!rethinkAvailable) return;

      const res = await request(app)
        .get("/api/taxonomy?term=nicotiana")
        .expect(401);

      expect(res.body.options).toEqual([]);
      expect(res.headers.location).toBeUndefined();
    });

    it("should return an empty option list for a blank term", async () => {
      if (!rethinkAvailable) return;

      const res = await request(app)
        .get("/api/taxonomy?term=%20")
        .set("Cookie", sessionCookie)
        .expect(200);

      expect(res.body.options).toEqual([]);
    });
  });

  describe("GET /request/:id", () => {
    it("should show a request if it exists", async () => {
      if (!rethinkAvailable) return;
      expect(testRequestData.requestID).toBeDefined();

      const res = await request(app)
        .get(`/request/${testRequestData.requestID}`)
        .set("Cookie", sessionCookie)
        .expect(200);

      expect(res.text).toContain(testRequestData.janCode);
    });

    // Regression: every user-supplied field used to be rendered with EJS's
    // unescaped <%- tag, so a submitted <script> ran in the admin's browser.
    it("should escape HTML in user-supplied fields", async () => {
      if (!rethinkAvailable) return;

      const payload = '<script>window.__xss=1</script>';
      const created = await withFields(
        request(app).post("/new").set("Cookie", sessionCookie),
        validFields({
          projectDescription: payload,
          bufferComposition: payload,
        })
      ).expect(200);

      const res = await request(app)
        .get(`/request/${created.body.requestID}`)
        .set("Cookie", sessionCookie)
        .expect(200);

      expect(res.text).not.toContain(payload);
      expect(res.text).toContain("&lt;script&gt;");

      const doomed = await Request.get(created.body.requestID);
      await doomed.delete();
    });

    it("should redirect with flash error if request not found", async () => {
      if (!rethinkAvailable) return;
      const res = await request(app)
        .get(`/request/non-existent-id-123`)
        .set("Cookie", sessionCookie)
        .expect(302)
        .expect("Location", "/");

      const flashCookie = res.headers["set-cookie"] || sessionCookie;

      const renderRes = await request(app)
        .get("/")
        .set("Cookie", flashCookie)
        .expect(200);

      expect(renderRes.text).toContain("Request not found.");
      expect(renderRes.text).toContain("alert-danger");
    });
  });

  describe("GET /request/:id/edit", () => {
    it("should display edit form for valid request", async () => {
      if (!rethinkAvailable) return;
      const res = await request(app)
        .get(`/request/${testRequestData.requestID}/edit`)
        .set("Cookie", sessionCookie)
        .expect(200);

      expect(res.text).toContain('"species":"Mus musculus"');
      expect(res.text).toContain(testRequestData.janCode);
    });

    // Regression: asserting the JSON merely appears in the HTML is not enough.
    // A stray closing script tag earlier in the same block - it was once in a
    // code comment - ends the element, so the browser treats the assignment as
    // plain text and window.existingRequest is never set. The edit form then
    // silently loads completely empty.
    it("should assign window.existingRequest inside a script element that is still open", async () => {
      if (!rethinkAvailable) return;

      const res = await request(app)
        .get(`/request/${testRequestData.requestID}/edit`)
        .set("Cookie", sessionCookie)
        .expect(200);

      const assignmentAt = res.text.indexOf("window.existingRequest =");
      expect(assignmentAt).toBeGreaterThan(-1);

      const openedAt = res.text.lastIndexOf("<script", assignmentAt);
      expect(openedAt).toBeGreaterThan(-1);

      // Nothing between the opening tag and the assignment may close the element.
      const preamble = res.text.slice(openedAt, assignmentAt);
      expect(preamble).not.toMatch(/<\/script/i);
    });

    // Regression: window.existingRequest is emitted inside a script element, and
    // JSON.stringify does not escape "<", so a stored field could once break
    // out of the tag entirely.
    it("should not let a field close the injected script tag", async () => {
      if (!rethinkAvailable) return;

      const created = await withFields(
        request(app).post("/new").set("Cookie", sessionCookie),
        validFields({
          projectDescription: '</script><script>window.__xss=1</script>',
        })
      ).expect(200);

      const res = await request(app)
        .get(`/request/${created.body.requestID}/edit`)
        .set("Cookie", sessionCookie)
        .expect(200);

      expect(res.text).not.toContain("</script><script>window.__xss=1");
      // Escaping "<" is enough to stop the tag closing; ">" is harmless.
      expect(res.text).toContain("\\u003c/script>");

      const doomed = await Request.get(created.body.requestID);
      await doomed.delete();
    });

    it("should deny edit access to a non-admin who didn't create the request", async () => {
      if (!rethinkAvailable) return;
      const nonAdminCookie = await loginAs("regular_user");

      const res = await request(app)
        .get(`/request/${testRequestData.requestID}/edit`)
        .set("Cookie", nonAdminCookie)
        .expect(302)
        .expect("Location", "/");

      const flashCookie = res.headers["set-cookie"] || nonAdminCookie;

      const renderRes = await request(app)
        .get("/")
        .set("Cookie", flashCookie)
        .expect(200);

      expect(renderRes.text).toContain(
        "You are not authorized to edit this request."
      );
    });
  });

  describe("GET /request/:id/clone", () => {
    it("should display clone form for valid request", async () => {
      if (!rethinkAvailable) return;
      const res = await request(app)
        .get(`/request/${testRequestData.requestID}/clone`)
        .set("Cookie", sessionCookie)
        .expect(200);

      expect(res.text).toContain('"species":"Mus musculus"');
      expect(res.text).toContain("isClone");
    });
  });

  describe("POST /request/:id/delete", () => {
    it("should deny delete access to a non-admin at the router level", async () => {
      if (!rethinkAvailable) return;
      const nonAdminCookie = await loginAs("regular_user");

      // Denials used to answer HTTP 200, so any client reading the status
      // treated a refusal as success.
      const res = await request(app)
        .post(`/request/${testRequestData.requestID}/delete`)
        .set("Cookie", nonAdminCookie)
        .expect(403);

      expect(res.text).toContain("not a proteomics administrator");
    });

    // Regression: deletion used to be a GET, so any link an admin followed
    // could destroy a request.
    it("should not expose deletion over GET", async () => {
      if (!rethinkAvailable) return;

      await request(app)
        .get(`/request/${testRequestData.requestID}/delete`)
        .set("Cookie", sessionCookie)
        .expect(200); // falls through to the catch-all 404 page

      const stillThere = await Request.get(testRequestData.requestID);
      expect(stillThere).not.toBeNull();
    });

    it("should delete request and redirect to admin", async () => {
      if (!rethinkAvailable) return;
      const res = await request(app)
        .post(`/request/${testRequestData.requestID}/delete`)
        .set("Cookie", sessionCookie);

      if (res.status === 500) {
        console.error("500 ERROR BODY:", res.text);
      }

      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/\/admin\?t=/);

      const flashCookie = res.headers["set-cookie"] || sessionCookie;

      const renderRes = await request(app)
        .get("/admin")
        .set("Cookie", flashCookie)
        .expect(200);

      expect(renderRes.text).toContain("Request successfully deleted.");
      expect(renderRes.text).toContain("alert-success");
    });

    it("should remove the request's child rows too", async () => {
      if (!rethinkAvailable) return;

      const leftovers = await SampleDescription.filter({
        requestID: testRequestData.requestID,
      }).run();
      expect(leftovers).toHaveLength(0);
    });
  });
});
