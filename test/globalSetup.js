/**
 * Runs once, in the main process, before any test worker starts.
 *
 * Jest runs test files in parallel workers, and each worker loads the models,
 * which means each one independently tries to create the database and its
 * tables. Against an existing database that is a no-op. Against an empty one -
 * which is what CI gets every single run - the exists-then-create check is not
 * atomic, so several workers decide to create the same table at once and
 * RethinkDB ends up with genuine duplicates. Every later query then fails with
 * "Table `x` is ambiguous; there are multiple tables with that name".
 *
 * Creating the schema once here removes the race: by the time any worker runs,
 * every table and index already exists, so the workers only ever take the
 * "already present" branch.
 */

module.exports = async () => {
  const thinky = require("../lib/thinky");

  // Requiring the models is what registers their tables and indexes.
  require("../models/request");
  require("../models/sampleDescription");
  require("../models/sampleImage");
  require("../models/construct");

  try {
    await thinky.ready();
  } catch (err) {
    // Not fatal: a developer without RethinkDB should still be able to run the
    // unit tests. Each integration suite checks availability itself, and fails
    // rather than skips when running in CI.
    console.log(
      `Skipping test database setup - RethinkDB is not reachable (${err.message})`
    );
  }

  // The workers open their own pools; this one would otherwise keep the process
  // alive after the run finishes.
  try {
    await thinky.r.getPoolMaster().drain();
  } catch (_e) {
    // Ignore errors during cleanup
  }
};
