/**
 * Read-only audit of the stored data.
 *
 * Reports the conditions that the application code cannot currently detect for
 * itself, either because a bug wrote them silently or because the ORM's schema
 * is not actually enforced. Nothing here writes; it is safe against production.
 *
 * Usage, from the application directory:
 *   node scripts/audit-data.js
 *
 * Exits 0 when everything is clean, 1 when something needs attention, so it can
 * be dropped into a cron job later if that is useful.
 */

const fs = require("fs-extra");
const path = require("path");

const config = require("../config.json");
const rethinkdbdash = require("rethinkdbdash");
const { FORM_OPTIONS, REQUEST_STATUSES } = require("../lib/formOptions");
const {
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

/** Fields the Request model declares as required. */
const REQUIRED_REQUEST_FIELDS = [
  "createdBy",
  "janCode",
  "species",
  "tissue",
  "tissueAgeNum",
  "tissueAgeType",
  "growthConditions",
  "projectDescription",
  "hopedAnalysis",
  "bufferComposition",
  "analysisType",
  "secondaryAnalysisType",
  "typeOfPTM",
  "quantitativeAnalysisRequired",
  "typeOfLabeling",
  "labelUsed",
  "samplePrep",
  "digestion",
  "enzyme",
];

const findings = [];

/**
 * Record a finding.
 *
 * @param {"problem"|"note"} level
 * @param {string} title
 * @param {string[]} details
 * @param {string} [advice]
 */
function report(level, title, details, advice) {
  findings.push({ level, title, details, advice });
}

/**
 * @param {string[]} list
 * @param {number} [limit]
 * @returns {string[]} the list, truncated with a summary line
 */
function sample(list, limit = 10) {
  if (list.length <= limit) return list;
  return [...list.slice(0, limit), `...and ${list.length - limit} more`];
}

async function auditRequests() {
  const requests = await r.table("Request").run();
  console.log(`Requests: ${requests.length}`);

  // 1. Children embedded into the parent row by the old save() behaviour.
  const bloated = [];
  let largestBlob = 0;
  for (const request of requests) {
    const present = embeddedRelationKeys(request);
    if (!present.length) continue;
    const bytes = Buffer.byteLength(
      JSON.stringify(present.reduce((acc, k) => ((acc[k] = request[k]), acc), {}))
    );
    largestBlob = Math.max(largestBlob, bytes);
    bloated.push(`${request.janCode || request.id} (${present.join(", ")}, ${bytes} bytes)`);
  }
  if (bloated.length) {
    report(
      "problem",
      `${bloated.length} request(s) carry embedded copies of their children`,
      sample(bloated),
      `Largest blob ${largestBlob} bytes. These are stale duplicates written by the old save() behaviour and are ignored by the app now. Run "node scripts/repair-data.js --embedded" to strip them.`
    );
  }

  // 2. Required fields that are absent - possible because the ORM swallows its
  //    own validation errors and stores the raw value.
  const missingFields = [];
  for (const request of requests) {
    const missing = REQUIRED_REQUEST_FIELDS.filter(
      (field) => request[field] === undefined || request[field] === null
    );
    if (missing.length) {
      missingFields.push(`${request.janCode || request.id}: ${missing.join(", ")}`);
    }
  }
  if (missingFields.length) {
    report(
      "problem",
      `${missingFields.length} request(s) are missing required fields`,
      sample(missingFields),
      "These would be rejected if the ORM enforced its schema. Fix or delete them before turning enforcement on."
    );
  }

  // 3. Values that are no longer offered by the form. Edits still accept these
  //    deliberately, but it is worth knowing how many there are.
  const offList = [];
  for (const request of requests) {
    for (const [field, allowed] of Object.entries(FORM_OPTIONS)) {
      const value = request[field];
      if (value !== undefined && value !== null && !allowed.includes(value)) {
        offList.push(`${request.janCode || request.id}: ${field} = "${value}"`);
      }
    }
  }
  if (offList.length) {
    report(
      "note",
      `${offList.length} field value(s) are not in the current dropdown lists`,
      sample(offList),
      "Editing these still works - the server grandfathers a stored value - but new submissions cannot use them."
    );
  }

  // 4. Statuses outside the known set, which no dashboard bucket will match.
  const badStatus = requests
    .filter((request) => request.status && !REQUEST_STATUSES.includes(request.status))
    .map((request) => `${request.janCode || request.id}: "${request.status}"`);
  if (badStatus.length) {
    report(
      "problem",
      `${badStatus.length} request(s) have an unrecognised status`,
      sample(badStatus),
      "These fall into the dashboard's default bucket and cannot be reproduced through the UI."
    );
  }

  // 5. Duplicate JAN codes - the human-facing identifier.
  const byCode = new Map();
  requests.forEach((request) => {
    if (!request.janCode) return;
    byCode.set(request.janCode, (byCode.get(request.janCode) || 0) + 1);
  });
  const duplicates = [...byCode.entries()]
    .filter(([, count]) => count > 1)
    .map(([code, count]) => `${code} x${count}`);
  if (duplicates.length) {
    report(
      "problem",
      `${duplicates.length} JAN code(s) are used by more than one request`,
      sample(duplicates),
      "The label is how the team refers to a request, so duplicates are genuinely ambiguous."
    );
  }

  const noCode = requests.filter((request) => !request.janCode).length;
  if (noCode) {
    report("problem", `${noCode} request(s) have no JAN code`, [], null);
  }

  // 6. Notes that are not strings would break rendering and normalisation.
  const badNotes = requests
    .filter(
      (request) =>
        Array.isArray(request.notes) &&
        request.notes.some((note) => typeof note !== "string")
    )
    .map((request) => request.janCode || request.id);
  if (badNotes.length) {
    report(
      "problem",
      `${badNotes.length} request(s) have non-string notes`,
      sample(badNotes),
      null
    );
  }

  return requests;
}

/**
 * @param {Array} requests
 */
async function auditChildren(requests) {
  const parentIds = new Set(requests.map((request) => request.id));

  for (const table of CHILD_TABLES) {
    const rows = await r.table(table).run();
    console.log(`${table}: ${rows.length}`);

    // Split apart, because the two causes are different. A row with no
    // requestID at all was written by the old socket uploader, which never set
    // one; a row whose requestID points at nothing lost its parent later.
    const { parentless, stranded } = findOrphans(rows, parentIds);

    if (parentless.length) {
      const byPath = new Map();
      parentless.forEach((row) =>
        byPath.set(row.path || row.uid, (byPath.get(row.path || row.uid) || 0) + 1)
      );
      const worst = [...byPath.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([p, n]) => `x${n}  ${String(p).slice(0, 70)}`);

      report(
        "problem",
        `${parentless.length} ${table} row(s) have no requestID at all (${byPath.size} distinct files)`,
        worst,
        "Written by the removed socket uploader, which never set a parent. They are unreachable from the UI and are skipped by removeChildren, so they accumulate for ever. Safe to delete: run \"node scripts/repair-data.js --orphans\"."
      );
    }

    if (stranded.length) {
      report(
        "problem",
        `${stranded.length} ${table} row(s) point at a request that no longer exists`,
        sample(stranded.map((row) => `${row.id} (requestID: ${row.requestID})`)),
        "Left behind by deletions. Safe to delete: run \"node scripts/repair-data.js --orphans\"."
      );
    }

    // position drives sample ordering; a non-number sorts unpredictably.
    if (table !== "SampleImage") {
      const badPosition = rows.filter(
        (row) => row.position !== undefined && typeof row.position !== "number"
      );
      if (badPosition.length) {
        report(
          "problem",
          `${badPosition.length} ${table} row(s) have a non-numeric position`,
          sample(badPosition.map((row) => `${row.id}: ${JSON.stringify(row.position)}`)),
          "Ordering is computed with a subtraction, so these sort arbitrarily."
        );
      }
    }
  }
}

async function auditFiles() {
  const images = await r.table("SampleImage").run();
  const referenced = new Set();
  images.forEach((image) => {
    if (image.uid) referenced.add(image.uid);
    if (image.previewUid) referenced.add(image.previewUid);
    if (image.path) referenced.add(path.basename(image.path));
  });

  for (const [label, dir] of [
    ["uploads", config.supportingImageRoot],
    ["previews", config.supportingImagePreviewRoot],
  ]) {
    if (!dir || !(await fs.pathExists(dir))) continue;
    const onDisk = (await fs.readdir(dir)).filter((name) => !name.startsWith("."));
    const orphans = onDisk.filter((name) => !referenced.has(name));
    console.log(`${label} on disk: ${onDisk.length}`);
    if (orphans.length) {
      report(
        "note",
        `${orphans.length} file(s) in ${label} are not referenced by any image record`,
        sample(orphans),
        "Left over from deletions that predate on-disk cleanup, or from rejected uploads. Safe to remove once you are satisfied the list looks right."
      );
    }
  }

  // Only images that are actually reachable from a request matter here, and
  // only when their stored path belongs to this machine. Running the audit
  // against a copy of production data elsewhere would otherwise report every
  // single row as missing, because the paths refer to the production mount.
  const uploadRoot = path.resolve(config.supportingImageRoot || ".");
  const local = images.filter(
    (image) => image.requestID && image.path && path.resolve(image.path).startsWith(uploadRoot)
  );
  const elsewhere = images.filter(
    (image) => image.requestID && image.path && !path.resolve(image.path).startsWith(uploadRoot)
  );

  if (elsewhere.length) {
    report(
      "note",
      `${elsewhere.length} image record(s) store a path outside this machine's upload directory`,
      sample([...new Set(elsewhere.map((i) => path.dirname(i.path)))], 5),
      `Expected paths under ${uploadRoot}. If you are auditing a copy of production data, this is just the other host's layout and can be ignored.`
    );
  }

  const missing = local.filter((image) => !fs.pathExistsSync(image.path));
  if (missing.length) {
    report(
      "problem",
      `${missing.length} image record(s) point at a missing file`,
      sample(missing.map((image) => `${image.id}: ${image.path}`)),
      "These render as broken images on the request page."
    );
  }
}

async function main() {
  console.log(
    `Auditing ${config.dbName || "prothrow"} on ${config.dbHost || "localhost"}:${config.dbPort || 28015}\n`
  );

  const requests = await auditRequests();
  await auditChildren(requests);
  await auditFiles();

  console.log("");
  if (!findings.length) {
    console.log("✅ No problems found.");
    return 0;
  }

  const problems = findings.filter((f) => f.level === "problem");
  for (const finding of findings) {
    console.log(`${finding.level === "problem" ? "❌" : "ℹ️ "} ${finding.title}`);
    finding.details.forEach((detail) => console.log(`     ${detail}`));
    if (finding.advice) console.log(`     → ${finding.advice}`);
    console.log("");
  }

  console.log(
    `${problems.length} problem(s), ${findings.length - problems.length} note(s).`
  );
  return problems.length ? 1 : 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    console.error("Audit failed:", err.message);
    process.exitCode = 2;
  })
  .finally(() => r.getPoolMaster().drain());
