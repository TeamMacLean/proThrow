/**
 * Report which secondary indexes exist, and which are missing.
 *
 * Read-only: it calls indexList() and nothing else, so it is safe to run
 * against production. Reads connection details from config.json, so it works
 * wherever the app is deployed.
 *
 * Usage, from the application directory:
 *   node scripts/check-indexes.js
 *
 * Indexes used to be created without waiting for their table to exist, and the
 * failure was swallowed, so a database built from scratch ended up with none of
 * them and every lookup became a full table scan. Restarting the app on the
 * current code creates any that are missing; this script confirms it.
 */

const config = require("../config.json");
const rethinkdbdash = require("rethinkdbdash");

/** The indexes the models declare via ensureIndex(). */
const EXPECTED = {
  Request: ["createdBy", "createdAt", "linkID"],
  SampleDescription: ["requestID"],
  SampleImage: ["requestID"],
  Construct: ["requestID"],
};

const r = rethinkdbdash({
  host: config.dbHost || "localhost",
  port: config.dbPort || 28015,
  db: config.dbName || "prothrow",
  silent: true,
});

async function main() {
  console.log(
    `Checking ${config.dbName || "prothrow"} on ${config.dbHost || "localhost"}:${config.dbPort || 28015}\n`
  );

  let missingTotal = 0;

  for (const [table, expected] of Object.entries(EXPECTED)) {
    try {
      const present = await r.table(table).indexList().run();
      const missing = expected.filter((index) => !present.includes(index));
      missingTotal += missing.length;

      console.log(`${table}`);
      console.log(`  present: ${present.length ? present.join(", ") : "(none)"}`);
      console.log(
        missing.length ? `  MISSING: ${missing.join(", ")}` : "  all present"
      );
    } catch (err) {
      console.log(`${table}\n  ERROR: ${err.msg || err.message}`);
      missingTotal += expected.length;
    }
  }

  console.log(
    missingTotal
      ? `\n${missingTotal} index(es) missing. Restart the app on the current code to create them.`
      : "\nAll expected indexes are present."
  );
}

main()
  .catch((err) => {
    console.error("Index check failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => r.getPoolMaster().drain());
