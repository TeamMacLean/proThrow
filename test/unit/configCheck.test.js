/**
 * Tests for the startup configuration guard.
 *
 * Each of these settings fails open: getting it wrong leaves the app running
 * and looking healthy while authentication is effectively disabled.
 */

const path = require("path");

const CONFIG_PATH = path.resolve(__dirname, "../../config.json");

/**
 * Load lib/configCheck with a substituted config.json.
 *
 * @param {object} config
 * @returns {object} the freshly loaded module
 */
function loadWithConfig(config) {
  jest.resetModules();
  jest.doMock(CONFIG_PATH, () => config, { virtual: false });
  return require("../../lib/configCheck");
}

afterEach(() => {
  jest.resetModules();
  jest.dontMock(CONFIG_PATH);
});

describe("checkConfig", () => {
  it("accepts a well-formed production config", () => {
    const { checkConfig } = loadWithConfig({
      devMode: false,
      secret: "a genuinely random value",
      secureCookies: true,
    });
    expect(checkConfig().errors).toEqual([]);
  });

  it("accepts a normal dev config", () => {
    const { checkConfig } = loadWithConfig({ devMode: true, secret: "cats" });
    expect(checkConfig().errors).toEqual([]);
  });

  // The gate was a truthiness check, so a string "false" - which is what a
  // careless edit or an env-var substitution produces - read as true and left
  // passwordless login enabled while appearing to be off.
  it("rejects a non-boolean devMode", () => {
    const { checkConfig } = loadWithConfig({
      devMode: "false",
      secret: "something",
    });
    expect(checkConfig().errors.join(" ")).toMatch(/devMode/);
  });

  it("rejects the example session secret in production", () => {
    const { checkConfig, EXAMPLE_SECRET } = loadWithConfig({
      devMode: false,
      secret: "cats",
      secureCookies: true,
    });
    expect(EXAMPLE_SECRET).toBe("cats");
    expect(checkConfig().errors.join(" ")).toMatch(/secret/i);
  });

  it("rejects a missing secret in production", () => {
    const { checkConfig } = loadWithConfig({ devMode: false, secureCookies: true });
    expect(checkConfig().errors.join(" ")).toMatch(/secret/i);
  });

  it("warns about insecure cookies in production without blocking startup", () => {
    const { checkConfig } = loadWithConfig({
      devMode: false,
      secret: "a genuinely random value",
    });
    const { errors, warnings } = checkConfig();
    expect(errors).toEqual([]);
    expect(warnings.join(" ")).toMatch(/secureCookies/);
  });

  it("warns that vpnMode is not read by anything", () => {
    const { checkConfig } = loadWithConfig({
      devMode: true,
      secret: "cats",
      vpnMode: true,
    });
    expect(checkConfig().warnings.join(" ")).toMatch(/vpnMode/);
  });
});

describe("assertConfigSafe", () => {
  const silentLog = { warn: () => {}, error: () => {} };

  it("exits when the configuration is unsafe", () => {
    const { assertConfigSafe } = loadWithConfig({
      devMode: false,
      secret: "cats",
    });

    const exit = jest.fn();
    assertConfigSafe({ exit, log: silentLog });
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("does not exit when the configuration is safe", () => {
    const { assertConfigSafe } = loadWithConfig({
      devMode: false,
      secret: "a genuinely random value",
      secureCookies: true,
    });

    const exit = jest.fn();
    expect(assertConfigSafe({ exit, log: silentLog })).toBe(true);
    expect(exit).not.toHaveBeenCalled();
  });
});
