const config = require("../config.json");

/** The secret shipped in config-example.json. */
const EXAMPLE_SECRET = "cats";

/**
 * Validate the runtime configuration before the server accepts traffic.
 *
 * Several settings fail open rather than closed, and all of them are silent:
 *
 * - `devMode` gates a passwordless local login that accepts any username and
 *   grants admin to anything listed in `config.admins`. It was a plain
 *   truthiness check, so `"devMode": "false"` - a string, which is what you get
 *   from a careless edit or an env-var substitution - left the app wide open
 *   while looking disabled.
 * - `config-example.json` ships `"secret": "cats"`. A deployment that followed
 *   the documented "copy the example" path keeps it, and anyone who knows that
 *   can forge a session cookie for any user, including an admin.
 * - `vpnMode` exists in the config but nothing reads it; the code uses the
 *   VPN_MODE environment variable. Setting it and expecting LDAP silently
 *   leaves the passwordless strategy in place.
 *
 * @returns {{errors: string[], warnings: string[]}}
 */
function checkConfig() {
  const errors = [];
  const warnings = [];

  if (typeof config.devMode !== "boolean") {
    errors.push(
      `"devMode" must be a JSON boolean, not ${typeof config.devMode} (${JSON.stringify(config.devMode)}). ` +
        "A non-boolean is treated as true, which enables passwordless login."
    );
  }

  const inProduction = config.devMode === false;

  if (inProduction) {
    if (!config.secret || config.secret === EXAMPLE_SECRET) {
      errors.push(
        'The session "secret" is missing or still the example value. ' +
          "Anyone who knows it can forge a session cookie for any user, including an admin."
      );
    }
    if (config.secureCookies !== true) {
      warnings.push(
        '"secureCookies" is not enabled, so the session cookie will be sent over plain HTTP. ' +
          "Set it to true once the deployment is served over HTTPS."
      );
    }
  }

  if ("vpnMode" in config) {
    warnings.push(
      '"vpnMode" in config.json is not read by anything - LDAP in dev is enabled with the VPN_MODE environment variable ' +
        "(yarn dev:vpn). Remove the key to avoid the confusion."
    );
  }

  return { errors, warnings };
}

/**
 * Run the checks, printing warnings and refusing to continue on a real problem.
 *
 * @param {{exit?: Function, log?: Function}} [io]
 * @returns {boolean} whether the configuration is safe to serve with
 */
function assertConfigSafe({ exit = process.exit, log = console } = {}) {
  const { errors, warnings } = checkConfig();

  warnings.forEach((warning) => log.warn(`⚠️  Config warning: ${warning}`));

  if (errors.length) {
    log.error("\n❌ Refusing to start - unsafe configuration:\n");
    errors.forEach((error) => log.error(`   • ${error}`));
    log.error("");
    exit(1);
    return false;
  }

  return true;
}

module.exports = { checkConfig, assertConfigSafe, EXAMPLE_SECRET };
