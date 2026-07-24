'use strict';

/**
 * src/migrate.js — v0.7.1 -> redesign migration orchestrator (4d-4)
 *
 * Wires the three 4d migration helpers into a single `migrate(targetRoot,
 * opts)` call, mirroring how src/setup.js wires the placement pipeline:
 *   1. `removeDeadRouterHook` (src/settings-surgery.js) — surgically removes
 *      the dead v0.7.1 SessionStart router hook from `.claude/settings.json`,
 *      preserving every other key/hook.
 *   2. `archiveLegacyRea` (src/rea-archive.js) — moves legacy `.rea/log/` +
 *      `.rea/lessons.md` under `.rea/_archive/`, never deleting.
 *   3. `scanLegacy` (src/legacy-scan.js) — read-only report of remaining
 *      Claude-specific legacy artifacts (an old CLAUDE.md, the legacy CI
 *      workflow, the legacy lint hook script) for the human to review.
 *
 * IMPORTANT: `migrate` self-gates on the aggregated outcome of all three
 * sub-checks above — it deliberately does NOT call/require
 * `setup.detectLegacyPresent`. That detector is invalid here: `setup`'s
 * prune step deletes `.claude/agents/rea-router.md` (one of the files
 * `detectLegacyPresent` looks for), so on the natural `setup` -> `migrate`
 * run order the detector would already report "no legacy host" and
 * `migrate` would silently skip all of its real work. Running the three
 * sub-checks directly and reporting "nothing to migrate" only when ALL
 * three found nothing keeps `migrate` correct in either run order
 * (`setup` -> `migrate` or `migrate` -> `setup`) and naturally idempotent —
 * a second run finds nothing left to do and reports "nothing to migrate".
 *
 * Node built-ins only, plus the three sibling modules listed above.
 *
 * Exported API:
 *   migrate(targetRoot, opts)      - opts: { dryRun = false }. Runs the
 *                                    three sub-checks in the order above,
 *                                    threading `dryRun` into the two
 *                                    MUTATING sub-modules only (`scanLegacy`
 *                                    is always read-only and takes no
 *                                    `dryRun`). Returns a structured,
 *                                    testable result — see below. Pure with
 *                                    respect to console output: this
 *                                    function prints nothing itself (mirrors
 *                                    verify.js's data-only contract); the
 *                                    human-readable report is built by
 *                                    `formatMigrateReport` and printed by
 *                                    `src/cli.js`'s `handleMigrate`.
 *   formatMigrateReport(result)    - pure function; returns an array of
 *                                    human-readable report lines for a
 *                                    `migrate()` result (hook status,
 *                                    archived/skipped/failed paths, legacy
 *                                    findings to review, and the two
 *                                    reminders), or a single "nothing to
 *                                    migrate" line when
 *                                    `result.nothingToMigrate` is true.
 *
 * `migrate()`'s return shape:
 *   {
 *     changed:  boolean   - from removeDeadRouterHook: was the dead router
 *                           hook removed (or, on dryRun, would it be)?
 *     removed:  string[]  - the matched router hook command string(s) taken
 *                           out (settings-surgery.js's `removed`).
 *     moved:    string[]  - archive destinations moved (or, on dryRun,
 *                           would-be moved) under `.rea/_archive/`.
 *     failed:   string[]  - archive destinations eligible to move but
 *                           refused/errored (a locked source, or a
 *                           symlink-escape destination) — needs attention.
 *     skipped:  string[]  - archive destinations refused because they
 *                           already exist (never overwrite prior archive
 *                           history) — needs attention.
 *     findings: Finding[] - scanLegacy()'s read-only {kind, path, advice}
 *                           list of remaining legacy artifacts to review.
 *     nothingToMigrate: boolean - true only when `!changed` AND `moved`,
 *                           `failed`, `skipped` are ALL empty AND
 *                           `findings` is empty. A non-empty `skipped` or
 *                           `failed` alone means legacy content is present
 *                           and needs attention — never "nothing to
 *                           migrate" on its own.
 *   }
 */

const { removeDeadRouterHook } = require('./settings-surgery.js');
const { archiveLegacyRea } = require('./rea-archive.js');
const { scanLegacy } = require('./legacy-scan.js');

const REMINDER_AGENTS_MD =
  'Reminder: once `AGENTS.md` exists, move the preserved `CLAUDE.md` rules into it.';
const REMINDER_PIP_UNINSTALL = 'Reminder: run `pip uninstall rea-dev`.';

/**
 * Runs the full migration pipeline against `targetRoot`: settings.json
 * surgery -> `.rea/` archive -> read-only legacy scan -> aggregate. See the
 * module docstring for the self-gating rationale and the full return shape.
 *
 * @param {string} targetRoot - the host project root to migrate.
 * @param {object} [opts]
 * @param {boolean} [opts.dryRun] - threaded into `removeDeadRouterHook` and
 *   `archiveLegacyRea` (the two mutating sub-modules); `scanLegacy` is
 *   always read-only and ignores this flag entirely.
 * @returns {{changed: boolean, removed: string[], moved: string[], failed:
 *   string[], skipped: string[], findings: object[], nothingToMigrate:
 *   boolean}}
 */
function migrate(targetRoot, { dryRun = false } = {}) {
  const hookResult = removeDeadRouterHook(targetRoot, { dryRun });
  const archiveResult = archiveLegacyRea(targetRoot, { dryRun });
  const findings = scanLegacy(targetRoot);

  const nothingToMigrate =
    !hookResult.changed &&
    archiveResult.moved.length === 0 &&
    archiveResult.failed.length === 0 &&
    archiveResult.skipped.length === 0 &&
    findings.length === 0;

  return {
    changed: hookResult.changed,
    removed: hookResult.removed,
    moved: archiveResult.moved,
    failed: archiveResult.failed,
    skipped: archiveResult.skipped,
    findings,
    nothingToMigrate,
  };
}

/**
 * Pure function: renders a `migrate()` result into human-readable report
 * lines. Never touches the filesystem or console itself — callers (e.g.
 * `src/cli.js`'s `handleMigrate`) decide how/whether to print these lines.
 *
 * @param {ReturnType<typeof migrate>} result
 * @returns {string[]}
 */
function formatMigrateReport(result) {
  if (result.nothingToMigrate) {
    return ['Nothing to migrate — no legacy v0.7.1 artifacts found.'];
  }

  const lines = [];

  if (result.changed) {
    lines.push(
      `Fixed: removed the dead SessionStart router hook (${result.removed.join(', ')}).`
    );
  } else {
    lines.push('Router hook: nothing to fix (no dead SessionStart router hook found).');
  }

  if (result.moved.length > 0) {
    lines.push(`Archived ${result.moved.length} legacy file(s) under .rea/_archive/:`);
    for (const relPath of result.moved) {
      lines.push(`  - ${relPath}`);
    }
  }

  if (result.skipped.length > 0) {
    lines.push(
      `Skipped ${result.skipped.length} archive destination(s) that already exist (needs attention):`
    );
    for (const relPath of result.skipped) {
      lines.push(`  - ${relPath}`);
    }
  }

  if (result.failed.length > 0) {
    lines.push(`Failed to archive ${result.failed.length} file(s) (needs attention):`);
    for (const relPath of result.failed) {
      lines.push(`  - ${relPath}`);
    }
  }

  if (result.findings.length > 0) {
    lines.push('Legacy artifacts to review/remove:');
    for (const finding of result.findings) {
      lines.push(`  - ${finding.path}: ${finding.advice}`);
    }
  }

  lines.push(REMINDER_AGENTS_MD);
  lines.push(REMINDER_PIP_UNINSTALL);

  return lines;
}

module.exports = {
  migrate,
  formatMigrateReport,
};
