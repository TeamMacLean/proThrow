/**
 * Shared RethinkDB availability check for the integration suites.
 *
 * Every integration test guards its body with `if (!rethinkAvailable) return`,
 * which is the right behaviour for a developer who has not started RethinkDB:
 * the suite skips instead of drowning them in connection errors.
 *
 * In CI that same behaviour is actively dangerous. If the database service
 * fails to start, all of those guards return early, every test reports as
 * passed, and the build goes green having verified nothing at all. So in CI a
 * missing database is a hard failure rather than a quiet skip.
 */

/**
 * @param {object} r - the rethinkdbdash instance from lib/thinky
 * @returns {Promise<boolean>} whether the database is usable
 * @throws when the database is unreachable and the run is in CI
 */
async function checkDatabaseAvailable(r) {
  if (!r) {
    if (process.env.CI) {
      throw new Error("No RethinkDB driver was provided to the test suite.");
    }
    return false;
  }

  try {
    // CI gets an empty database every run, so the schema bootstrap has to
    // finish before anything queries it.
    await require("../../lib/thinky").ready();
    await r.tableList().run();
    return true;
  } catch (err) {
    if (process.env.CI) {
      throw new Error(
        "RethinkDB is not reachable, so the integration tests cannot run. " +
          "Failing rather than skipping: a green build that asserted nothing " +
          `is worse than a red one. Underlying error: ${err.message}`
      );
    }
    console.log("RethinkDB not available - skipping integration tests");
    return false;
  }
}

module.exports = { checkDatabaseAvailable };
