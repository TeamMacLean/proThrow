/**
 * Shared definitions for the data audit and the data repair.
 *
 * Both scripts need the same answer to "what counts as broken". Keeping the
 * rules here means the audit cannot report something as safe to delete that the
 * repair then treats differently - a drift that would be quietly destructive,
 * because the audit is the thing an operator reads before agreeing to a delete.
 */

/**
 * Relation names that `getJoin` attaches to a document in memory, and which
 * must therefore never be found stored on a Request row.
 */
const RELATION_KEYS = [
  "samples",
  "constructs",
  "supportingImages",
  "linkedRequests",
];

/** Child tables keyed to a request by `requestID` (capital D). */
const CHILD_TABLES = ["SampleDescription", "Construct", "SampleImage"];

/**
 * Which relation keys are physically stored on this row.
 *
 * @param {object} row
 * @returns {string[]}
 */
function embeddedRelationKeys(row) {
  return RELATION_KEYS.filter((key) => row && row[key] !== undefined);
}

/**
 * Split child rows into those that are reachable and those that are not.
 *
 * `parentless` rows never had a requestID - the removed socket uploader wrote
 * them that way. `stranded` rows had one, but the request has since been
 * deleted. Neither is visible in the UI, and `removeChildren` filters on
 * requestID so neither is ever cleaned up.
 *
 * @param {Array<{id: string, requestID?: string}>} rows
 * @param {Set<string>} parentIds - ids of every surviving request
 * @returns {{parentless: Array, stranded: Array, orphans: Array}}
 */
function findOrphans(rows, parentIds) {
  const parentless = [];
  const stranded = [];

  for (const row of rows || []) {
    if (!row.requestID) {
      parentless.push(row);
    } else if (!parentIds.has(row.requestID)) {
      stranded.push(row);
    }
  }

  return { parentless, stranded, orphans: [...parentless, ...stranded] };
}

module.exports = {
  RELATION_KEYS,
  CHILD_TABLES,
  embeddedRelationKeys,
  findOrphans,
};
