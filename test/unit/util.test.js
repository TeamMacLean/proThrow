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
});
