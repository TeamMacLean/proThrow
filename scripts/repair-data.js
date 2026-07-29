/**
 * Repair the conditions that scripts/audit-data.js reports.
 *
 * DRY RUN BY DEFAULT. Nothing is written unless --apply is passed, so the
 * normal way to use this is to run it, read what it says it would do, and only
 * then run it again with --apply.
 *
 *   node scripts/repair-data.js                      # report only
 *   node scripts/repair-data.js --embedded --apply   # strip embedded children
 *   node scripts/repair-data.js --orphans --apply    # delete parentless rows
 *   node scripts/repair-data.js --all --apply        # both
 *
 * Take a database dump first. These are deletes.
 */

const config = require("../config.json");
const rethinkdbdash = require("rethinkdbdash");
const {
  RELATION_KEYS,
  CHILD_TABLES,
  embeddedRelationKeys,
  findOrphans,
} = require("../lib/dataRepair");

const r = rethinkdbdash({
  host: config.dbHost || "localhost",
  port: config.dbPort || 28015,
  db: config.dbName || "prothrow",
  silent: true,
});

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const all = args.includes("--all");
const doEmbedded = all || args.includes("--embedded");
const doOrphans = all || args.includes("--orphans");

/**
 * Remove the child copies that the old save() behaviour wrote into each parent.
 *
 * The application ignores these fields now - they are re-loaded from the child
 * tables on every read - so removing them changes nothing except the size of
 * the row.
 */
async function repairEmbedded() {
  const requests = await r.table("Request").run();
  const affected = requests.filter(
    (request) => embeddedRelationKeys(request).length
  );

  console.log(`\nEmbedded child copies: ${affected.length} request(s) affected`);
  if (!affected.length) return;

  const bytes = affected.reduce((total, request) => {
    const present = embeddedRelationKeys(request);
    return (
      total +
      Buffer.byteLength(
        JSON.stringify(present.reduce((acc, k) => ((acc[k] = request[k]), acc), {}))
      )
    );
  }, 0);
  console.log(`   would reclaim roughly ${bytes} bytes`);
  affected.slice(0, 5).forEach((request) => {
    console.log(`   ${request.janCode || request.id}`);
  });
  if (affected.length > 5) console.log(`   ...and ${affected.length - 5} more`);

  if (!apply) {
    console.log("   (dry run - pass --apply to write)");
    return;
  }

  // literal() replaces rather than merges, and the field list is fixed, so this
  // cannot touch anything the app actually reads.
  const result = await r
    .table("Request")
    .replace((row) => row.without(RELATION_KEYS))
    .run();
  console.log(`   replaced ${result.replaced} row(s), errors: ${result.errors}`);
  if (result.first_error) console.log(`   first error: ${result.first_error}`);
}

/**
 * Delete child rows that no request can reach.
 *
 * Two kinds: rows written with no requestID at all (the removed socket
 * uploader never set one), and rows whose parent has since been deleted. Both
 * are invisible in the UI and are skipped by removeChildren, so they only ever
 * accumulate.
 */
async function repairOrphans() {
  const parentIds = new Set(
    (await r.table("Request").pluck("id").run()).map((row) => row.id)
  );

  for (const table of CHILD_TABLES) {
    const rows = await r.table(table).pluck("id", "requestID").run();
    const { parentless, orphans: doomed } = findOrphans(rows, parentIds);

    console.log(`\n${table}: ${doomed.length} orphan(s) of ${rows.length} row(s)`);
    if (!doomed.length) continue;

    console.log(
      `   ${parentless.length} with no requestID, ${doomed.length - parentless.length} with a dead parent`
    );

    if (!apply) {
      console.log("   (dry run - pass --apply to write)");
      continue;
    }

    // Deleted in batches: a single delete over tens of thousands of ids builds
    // an array argument large enough for RethinkDB to refuse it.
    const ids = doomed.map((row) => row.id);
    let deleted = 0;
    for (let i = 0; i < ids.length; i += 500) {
      const batch = ids.slice(i, i + 500);
      const result = await r.table(table).getAll(...batch).delete().run();
      deleted += result.deleted;
      if (result.errors) {
        console.log(`   errors in batch: ${result.first_error}`);
      }
    }
    console.log(`   deleted ${deleted} row(s)`);
  }
}

async function main() {
  console.log(
    `Repairing ${config.dbName || "prothrow"} on ${config.dbHost || "localhost"}:${config.dbPort || 28015}`
  );
  console.log(apply ? "MODE: APPLY (writes)" : "MODE: dry run (no writes)");

  if (!doEmbedded && !doOrphans) {
    console.log(
      "\nNothing selected. Pass --embedded, --orphans or --all (and --apply to write)."
    );
    return;
  }

  if (doEmbedded) await repairEmbedded();
  if (doOrphans) await repairOrphans();

  console.log(
    apply
      ? "\nDone. Re-run scripts/audit-data.js to confirm."
      : "\nDry run complete. Re-run with --apply to make these changes."
  );
}

main()
  .catch((err) => {
    console.error("Repair failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => r.getPoolMaster().drain());
