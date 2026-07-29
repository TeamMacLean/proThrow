/**
 * Tests for the rules shared by the data audit and the data repair.
 *
 * This predicate decides which rows get deleted from production, and the audit
 * is what an operator reads before agreeing to that. Both scripts import it from
 * one place precisely so they cannot disagree, and these tests pin the rule
 * down.
 */

const {
  RELATION_KEYS,
  CHILD_TABLES,
  embeddedRelationKeys,
  findOrphans,
} = require("../../lib/dataRepair");

describe("embeddedRelationKeys", () => {
  it("finds relation keys stored on a row", () => {
    expect(
      embeddedRelationKeys({ janCode: "x", samples: [], linkedRequests: [{}] })
    ).toEqual(["samples", "linkedRequests"]);
  });

  it("returns nothing for a clean row", () => {
    expect(embeddedRelationKeys({ janCode: "x", species: "Homo sapiens" })).toEqual(
      []
    );
  });

  // An empty array is still a stored relation and still needs stripping.
  it("counts an empty array as embedded", () => {
    expect(embeddedRelationKeys({ samples: [] })).toEqual(["samples"]);
  });

  it("handles a missing row", () => {
    expect(embeddedRelationKeys(null)).toEqual([]);
    expect(embeddedRelationKeys(undefined)).toEqual([]);
  });

  it("covers every relation the models declare", () => {
    expect(RELATION_KEYS).toEqual(
      expect.arrayContaining([
        "samples",
        "constructs",
        "supportingImages",
        "linkedRequests",
      ])
    );
  });
});

describe("findOrphans", () => {
  const parents = new Set(["req-1", "req-2"]);

  it("keeps rows whose parent exists", () => {
    const rows = [
      { id: "a", requestID: "req-1" },
      { id: "b", requestID: "req-2" },
    ];
    expect(findOrphans(rows, parents).orphans).toEqual([]);
  });

  // Written by the removed socket uploader, which never set a parent.
  it("classifies a row with no requestID as parentless", () => {
    const { parentless, stranded } = findOrphans([{ id: "a" }], parents);
    expect(parentless.map((r) => r.id)).toEqual(["a"]);
    expect(stranded).toEqual([]);
  });

  it("classifies a row whose parent is gone as stranded", () => {
    const { parentless, stranded } = findOrphans(
      [{ id: "a", requestID: "deleted-long-ago" }],
      parents
    );
    expect(parentless).toEqual([]);
    expect(stranded.map((r) => r.id)).toEqual(["a"]);
  });

  it("treats an empty-string requestID as parentless, not stranded", () => {
    const { parentless } = findOrphans([{ id: "a", requestID: "" }], parents);
    expect(parentless.map((r) => r.id)).toEqual(["a"]);
  });

  it("combines both kinds into orphans", () => {
    const rows = [
      { id: "keep", requestID: "req-1" },
      { id: "no-parent" },
      { id: "dead-parent", requestID: "gone" },
    ];
    const { orphans } = findOrphans(rows, parents);
    expect(orphans.map((r) => r.id).sort()).toEqual(["dead-parent", "no-parent"]);
  });

  it("never reports a healthy row as an orphan", () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      id: `row-${i}`,
      requestID: i % 2 ? "req-1" : "req-2",
    }));
    expect(findOrphans(rows, parents).orphans).toEqual([]);
  });

  it("handles a missing row list", () => {
    expect(findOrphans(undefined, parents).orphans).toEqual([]);
    expect(findOrphans(null, parents).orphans).toEqual([]);
  });

  it("covers every child table keyed on requestID", () => {
    expect(CHILD_TABLES).toEqual([
      "SampleDescription",
      "Construct",
      "SampleImage",
    ]);
  });
});
