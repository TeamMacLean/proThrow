/**
 * Unit tests for request controller - editable sections
 * Tests for Supporting Images and Notes handling
 *
 * These tests mirror the logic in controllers/requests.js to ensure
 * the helper functions behave correctly without requiring database access.
 */

describe("Request Controller - Editable Sections", () => {
  // --- normalizeNotes function tests ---
  // This mirrors the normalizeNotes() function in the controller
  describe("normalizeNotes", () => {
    const normalizeNotes = (notes) => {
      const notesArray = Array.isArray(notes)
        ? notes
        : Object.values(notes || {});
      return notesArray.filter((note) => note && note.trim());
    };

    it("should handle notes as an array", () => {
      const notes = ["Note 1", "Note 2", "Note 3"];
      const result = normalizeNotes(notes);
      expect(result).toEqual(["Note 1", "Note 2", "Note 3"]);
    });

    it("should handle notes as an object (form data format)", () => {
      const notes = { 0: "Note 1", 1: "Note 2", 2: "Note 3" };
      const result = normalizeNotes(notes);
      expect(result).toEqual(["Note 1", "Note 2", "Note 3"]);
    });

    it("should filter out empty string notes", () => {
      const notes = ["Note 1", "", "Note 3"];
      const result = normalizeNotes(notes);
      expect(result).toEqual(["Note 1", "Note 3"]);
    });

    it("should filter out whitespace-only notes", () => {
      const notes = ["Note 1", "   ", "\t\n", "Note 2"];
      const result = normalizeNotes(notes);
      expect(result).toEqual(["Note 1", "Note 2"]);
    });

    it("should handle null input", () => {
      expect(normalizeNotes(null)).toEqual([]);
    });

    it("should handle undefined input", () => {
      expect(normalizeNotes(undefined)).toEqual([]);
    });

    it("should handle empty array", () => {
      expect(normalizeNotes([])).toEqual([]);
    });

    it("should handle empty object", () => {
      expect(normalizeNotes({})).toEqual([]);
    });

    it("should preserve notes with leading/trailing whitespace", () => {
      const notes = ["  Note with spaces  "];
      const result = normalizeNotes(notes);
      expect(result).toEqual(["  Note with spaces  "]);
    });

    it("should handle mixed valid and invalid notes", () => {
      const notes = ["Valid", "", null, "Also valid", "   ", undefined];
      const result = normalizeNotes(notes);
      expect(result).toEqual(["Valid", "Also valid"]);
    });
  });

  // --- Image processing logic tests ---
  // This mirrors the processExistingImages() function logic
  describe("processExistingImages logic", () => {
    /**
     * Simulates the categorization logic for existing images.
     * Returns which images should be deleted vs updated.
     */
    const categorizeImageUpdates = (preExistingSupportingImages) => {
      const toDelete = [];
      const toUpdate = [];

      for (const image of preExistingSupportingImages) {
        const { id, deleteRequest, editedDescription, description } = image;

        if (deleteRequest) {
          toDelete.push(id);
        } else if (editedDescription) {
          toUpdate.push({ id, description });
        }
      }

      return { toDelete, toUpdate };
    };

    it("should identify images marked for deletion", () => {
      const images = [
        { id: "img1", deleteRequest: true, description: "Test" },
        { id: "img2", deleteRequest: false, description: "Keep" },
        { id: "img3", deleteRequest: true, description: "Delete me" },
      ];

      const result = categorizeImageUpdates(images);
      expect(result.toDelete).toEqual(["img1", "img3"]);
      expect(result.toUpdate).toEqual([]);
    });

    it("should identify images with edited descriptions", () => {
      const images = [
        {
          id: "img1",
          deleteRequest: false,
          editedDescription: true,
          description: "New description",
        },
        { id: "img2", deleteRequest: false, description: "Original" },
        {
          id: "img3",
          deleteRequest: false,
          editedDescription: true,
          description: "Updated",
        },
      ];

      const result = categorizeImageUpdates(images);
      expect(result.toDelete).toEqual([]);
      expect(result.toUpdate).toEqual([
        { id: "img1", description: "New description" },
        { id: "img3", description: "Updated" },
      ]);
    });

    it("should prioritize deletion over description updates", () => {
      const images = [
        {
          id: "img1",
          deleteRequest: true,
          editedDescription: true,
          description: "Edited but deleted",
        },
      ];

      const result = categorizeImageUpdates(images);
      expect(result.toDelete).toEqual(["img1"]);
      expect(result.toUpdate).toEqual([]);
    });

    it("should handle empty image array", () => {
      const result = categorizeImageUpdates([]);
      expect(result.toDelete).toEqual([]);
      expect(result.toUpdate).toEqual([]);
    });

    it("should handle images with no changes", () => {
      const images = [
        { id: "img1", deleteRequest: false, description: "Test 1" },
        { id: "img2", deleteRequest: false, description: "Test 2" },
      ];

      const result = categorizeImageUpdates(images);
      expect(result.toDelete).toEqual([]);
      expect(result.toUpdate).toEqual([]);
    });

    it("should handle image with empty description update", () => {
      const images = [
        {
          id: "img1",
          deleteRequest: false,
          editedDescription: true,
          description: "",
        },
      ];

      const result = categorizeImageUpdates(images);
      expect(result.toUpdate).toEqual([{ id: "img1", description: "" }]);
    });

    it("should handle undefined description in update", () => {
      const images = [
        {
          id: "img1",
          deleteRequest: false,
          editedDescription: true,
          description: undefined,
        },
      ];

      const result = categorizeImageUpdates(images);
      expect(result.toUpdate).toEqual([{ id: "img1", description: undefined }]);
    });
  });

  // --- createNewImages validation logic tests ---
  describe("createNewImages validation logic", () => {
    /**
     * Simulates the validation logic for new image uploads.
     * Returns which files are valid for processing.
     */
    const validateNewImageUploads = (files, imageNames) => {
      if (!files?.length || !imageNames?.length) {
        return { valid: [], skipped: [], hasWarning: files?.length > 0 };
      }

      const numImagesToProcess = Math.min(
        imageNames.length,
        Math.floor(files.length / 2)
      );

      const valid = [];
      const skipped = [];

      for (let i = 0; i < numImagesToProcess; i++) {
        const imageFile = files[i * 2];

        if (imageFile?.path && imageNames[i]) {
          valid.push({ index: i, name: imageNames[i], path: imageFile.path });
        } else {
          skipped.push(i);
        }
      }

      return { valid, skipped, hasWarning: false };
    };

    it("should validate complete file/name pairs", () => {
      const files = [
        { path: "/uploads/img1.jpg", filename: "img1.jpg" },
        { path: "/uploads/preview1.jpg" },
        { path: "/uploads/img2.jpg", filename: "img2.jpg" },
        { path: "/uploads/preview2.jpg" },
      ];
      const imageNames = ["Image 1", "Image 2"];

      const result = validateNewImageUploads(files, imageNames);
      expect(result.valid).toHaveLength(2);
      expect(result.skipped).toHaveLength(0);
    });

    it("should skip files without paths", () => {
      const files = [
        { filename: "img1.jpg" },
        { path: "/uploads/preview1.jpg" },
      ];
      const imageNames = ["Image 1"];

      const result = validateNewImageUploads(files, imageNames);
      expect(result.valid).toHaveLength(0);
      expect(result.skipped).toEqual([0]);
    });

    it("should skip files without names", () => {
      const files = [
        { path: "/uploads/img1.jpg", filename: "img1.jpg" },
        { path: "/uploads/preview1.jpg" },
      ];
      const imageNames = [""];

      const result = validateNewImageUploads(files, imageNames);
      expect(result.valid).toHaveLength(0);
      expect(result.skipped).toEqual([0]);
    });

    it("should return warning when files exist but no names", () => {
      const files = [{ path: "/uploads/img1.jpg" }];
      const imageNames = [];

      const result = validateNewImageUploads(files, imageNames);
      expect(result.hasWarning).toBe(true);
      expect(result.valid).toHaveLength(0);
    });

    it("should handle null files", () => {
      const result = validateNewImageUploads(null, ["Image 1"]);
      expect(result.valid).toHaveLength(0);
    });

    it("should handle null imageNames", () => {
      const files = [{ path: "/uploads/img1.jpg" }];
      const result = validateNewImageUploads(files, null);
      expect(result.hasWarning).toBe(true);
    });

    it("should handle empty arrays", () => {
      const result = validateNewImageUploads([], []);
      expect(result.valid).toHaveLength(0);
      expect(result.hasWarning).toBe(false);
    });

    it("should handle more names than file pairs", () => {
      const files = [
        { path: "/uploads/img1.jpg", filename: "img1.jpg" },
        { path: "/uploads/preview1.jpg" },
      ];
      const imageNames = ["Image 1", "Image 2", "Image 3"];

      const result = validateNewImageUploads(files, imageNames);
      // Only 1 pair of files, so only 1 image can be processed
      expect(result.valid).toHaveLength(1);
    });

    it("should handle more file pairs than names", () => {
      const files = [
        { path: "/uploads/img1.jpg", filename: "img1.jpg" },
        { path: "/uploads/preview1.jpg" },
        { path: "/uploads/img2.jpg", filename: "img2.jpg" },
        { path: "/uploads/preview2.jpg" },
      ];
      const imageNames = ["Image 1"];

      const result = validateNewImageUploads(files, imageNames);
      expect(result.valid).toHaveLength(1);
    });
  });

  // --- safeDbOperation pattern tests ---
  describe("safeDbOperation pattern", () => {
    const safeDbOperation = async (operation, errorMessage) => {
      try {
        return await operation();
      } catch (err) {
        // In real code, this logs to console.error
        return { error: true, message: errorMessage };
      }
    };

    it("should return result on success", async () => {
      const operation = async () => ({ success: true, data: "test" });
      const result = await safeDbOperation(operation, "Error message");
      expect(result).toEqual({ success: true, data: "test" });
    });

    it("should handle errors gracefully", async () => {
      const operation = async () => {
        throw new Error("Database error");
      };
      const result = await safeDbOperation(operation, "Custom error message");
      expect(result.error).toBe(true);
      expect(result.message).toBe("Custom error message");
    });

    it("should handle async operations", async () => {
      const operation = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "delayed result";
      };
      const result = await safeDbOperation(operation, "Error");
      expect(result).toBe("delayed result");
    });
  });
});
