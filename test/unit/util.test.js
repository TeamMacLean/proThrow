const Util = require("../../lib/util");

describe("Util", () => {
  describe("isAdmin", () => {
    it("should return true for admin users", () => {
      // This test depends on config.admins containing 'deeks'
      expect(Util.isAdmin("deeks")).toBe(true);
    });

    it("should return false for non-admin users", () => {
      expect(Util.isAdmin("randomuser")).toBe(false);
    });
  });

  describe("toSafeName", () => {
    it("should convert spaces to underscores", () => {
      expect(Util.toSafeName("hello world")).toBe("hello_world");
    });

    it("should convert ampersands to 'and'", () => {
      expect(Util.toSafeName("fish & chips")).toBe("fish_and_chips");
    });

    it("should remove special characters", () => {
      expect(Util.toSafeName("test@#$%")).toBe("test____");
    });

    it("should convert to lowercase", () => {
      expect(Util.toSafeName("UPPERCASE")).toBe("uppercase");
    });
  });

  describe("isDevMode", () => {
    it("should return the devMode config value", () => {
      // In test environment, devMode should be true based on config.json
      expect(typeof Util.isDevMode()).toBe("boolean");
    });
  });

  describe("getAuthStrategy", () => {
    it("should return a valid strategy name", () => {
      const strategy = Util.getAuthStrategy();
      expect(["local", "ldapauth"]).toContain(strategy);
    });
  });

  describe("toSafeJSON", () => {
    it("round-trips ordinary values", () => {
      expect(JSON.parse(Util.toSafeJSON({ a: 1, b: "two" }))).toEqual({
        a: 1,
        b: "two",
      });
    });

    // The output is emitted between <script> tags, where an unescaped "<"
    // lets a stored value close the tag and start executing.
    it("escapes angle brackets so a value cannot close the script tag", () => {
      const output = Util.toSafeJSON({
        note: "</script><script>alert(1)</script>",
      });
      expect(output).not.toContain("</script>");
      expect(output).toContain("\\u003c");
      expect(JSON.parse(output).note).toBe(
        "</script><script>alert(1)</script>"
      );
    });

    it("escapes the unicode line and paragraph separators", () => {
      const lineSeparator = String.fromCharCode(0x2028);
      const paragraphSeparator = String.fromCharCode(0x2029);
      const output = Util.toSafeJSON({
        note: `a${lineSeparator}b${paragraphSeparator}c`,
      });

      expect(output).not.toContain(lineSeparator);
      expect(output).not.toContain(paragraphSeparator);
      expect(JSON.parse(output).note).toBe(
        `a${lineSeparator}b${paragraphSeparator}c`
      );
    });
  });

  describe("generateUniqueId", () => {
    it("returns a distinct id each call", () => {
      const first = Util.generateUniqueId();
      const second = Util.generateUniqueId();
      expect(typeof first).toBe("string");
      expect(first.length).toBeGreaterThan(0);
      expect(first).not.toBe(second);
    });
  });
});
