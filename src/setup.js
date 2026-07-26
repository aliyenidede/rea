'use strict';

/**
 * src/setup.js — setup orchestrator
 *
 * Wires the mechanical placement pipeline (manifest -> place -> shims ->
 * prune -> manifest) into a single `run(targetRoot, opts)` call: this is the
 * only module that knows the ORDER those pieces run in. Each piece
 * (src/place.js, src/shims.js, src/prune.js, src/manifest.js) stays a small,
 * standalone, pure-IO module; this file adds no placement/shim/deletion
 * logic of its own.
 *
 * Orchestration order (see the inline comments in run() for why):
 *   1. detect  (legacy host? existing manifest?)
 *   2. load the PRE-RUN manifest into memory (captured before any write)
 *   3. place   (into a FRESH in-memory manifest for this run)
 *   4. shims
 *   5. prune   (diffs the pre-run snapshot vs this run's owned set — never a
 *               fresh disk re-read; on the one-time legacy bridge, also
 *               deletes the hard-coded retired list)
 *   6. save the fresh manifest LAST — a terminal, all-or-nothing commit. A
 *      crash before this step leaves the OLD manifest on disk, so a retry
 *      keeps the correct previously-owned basis.
 *
 * `run()`'s only side-effecting choice of its own is *when* to print the
 * one-off legacy pip-uninstall notice on the bridge — the installer itself
 * never touches GitHub or CI; setup is the mechanical placement + shims +
 * prune + manifest only. GitHub/CI wiring lives in `/rea-init --full`
 * inside the AI coding tool, never in this CLI.
 *
 * Node built-ins only, plus the sibling modules listed above.
 *
 * Exported API:
 *   HOST_LAYOUT              - the host-layout descriptor this orchestrator
 *                               wires today ({ tool: 'claude' }). Adding a
 *                               new host tool is a data addition to
 *                               place.js's LAYOUT table plus this
 *                               descriptor — never a scattered layout
 *                               literal in this file.
 *   run(targetRoot, opts)    - opts: { sourceRoot =
 *                               path.resolve(__dirname, '..') }. Runs the
 *                               full setup pipeline against targetRoot,
 *                               reading source content from sourceRoot (the
 *                               readev-tools package root — defaults to this
 *                               package's own root so a normal CLI install
 *                               needs no override; tests inject a fixture
 *                               sourceRoot). Returns { placed, pruned,
 *                               failed, isBridge } — placed is the
 *                               count of files owned by this run, pruned/
 *                               failed are prune()'s deleted/failed arrays.
 */

const fs = require('node:fs');
const path = require('node:path');

const manifest = require('./manifest.js');
const { place } = require('./place.js');
const { writeShims } = require('./shims.js');
const { prune } = require('./prune.js');
const { RETIRED_FILES } = require('./retired-list.js');

/**
 * The host-layout descriptor this orchestrator wires today. `tool` selects
 * the per-tool copy layout from place.js's LAYOUT table by name. Adding a
 * new host tool means adding a data entry to that table (and, eventually,
 * letting this descriptor vary) — not scattering a new layout literal
 * through this orchestrator.
 */
const HOST_LAYOUT = { tool: 'claude' };

const PIP_UNINSTALL_NOTICE =
  'Legacy rea-dev detected. You can now: pip uninstall rea-dev; ' +
  'run `npx readev-tools migrate` to finish the transition.';

/**
 * True if any hard-coded retired (pre-manifest, legacy v0.7.1) file exists
 * under targetRoot. Used only to detect the one-time legacy-host bridge —
 * never consulted again once a host has a manifest.
 */
function detectLegacyPresent(targetRoot) {
  return RETIRED_FILES.some((relPath) => fs.existsSync(path.join(targetRoot, relPath)));
}

/**
 * Runs the full setup pipeline against `targetRoot`: detect -> load the
 * pre-run manifest snapshot -> place -> shims -> prune (diffed against that
 * snapshot) -> save the new manifest last. See the module docstring for the
 * full order rationale.
 *
 * @param {string} targetRoot - the host project root to set up.
 * @param {object} [opts]
 * @param {string} [opts.sourceRoot] - the readev-tools package root containing
 *   `templates/` and `core/`. Defaults to this package's own root; tests
 *   inject a fixture tree here.
 * @returns {{placed: number, pruned: string[], failed: string[], isBridge:
 *   boolean}}
 */
function run(targetRoot, { sourceRoot = path.resolve(__dirname, '..') } = {}) {
  targetRoot = path.resolve(targetRoot);
  sourceRoot = path.resolve(sourceRoot);

  // 1. Detect: a legacy host is one with a retired command file present but
  // no manifest yet — the manifest is what turns "detect legacy every run"
  // into "detect legacy exactly once".
  const manifestPath = path.join(targetRoot, manifest.MANIFEST_REL_PATH);
  const hasManifest = fs.existsSync(manifestPath);
  const legacyPresent = detectLegacyPresent(targetRoot);
  const isBridge = legacyPresent && !hasManifest;

  // 2. Load the PRE-RUN manifest into memory now, before any write below —
  // this snapshot is prune's diff basis, never a fresh disk re-read.
  const preRun = manifest.load(targetRoot);
  const previouslyOwned = manifest.listOwned(preRun);

  // 3. Build a FRESH manifest for this run and place into it.
  const current = manifest.createEmptyManifest();
  place(sourceRoot, targetRoot, current, HOST_LAYOUT.tool);

  // 4. Shims (AGENTS.md / CLAUDE.md managed blocks + the Gemini settings
  // merge) also record into the same fresh manifest.
  writeShims(sourceRoot, targetRoot, current);

  const currentOwned = manifest.listOwned(current);

  // 5. Prune: diff the pre-run snapshot against this run's owned set; on the
  // one-time bridge, also delete the hard-coded retired list.
  const pruneResult = prune({ targetRoot, previouslyOwned, currentOwned, isBridge });

  // A file whose delete threw (e.g. a locked file on Windows, or a failed
  // bridge retired-file deletion) is obsolete but still present on disk —
  // and it is NOT in `current` (this run's fresh owned set), since it is no
  // longer part of the placed/shimmed content. If we saved `current` as-is,
  // that path would drop out of the manifest's ownedFiles entirely, so the
  // next run's `previouslyOwned` would never include it again and prune
  // would never retry deleting it — it would be silently orphaned forever.
  // Re-record it as owned so it stays a prune candidate on the next run.
  for (const relPath of pruneResult.failed) {
    manifest.recordOwned(current, relPath);
  }

  // 6. Save LAST — a terminal, all-or-nothing commit. A crash before this
  // point leaves the OLD manifest on disk, so a retry still diffs against
  // the correct previously-owned basis.
  manifest.save(targetRoot, current);

  if (isBridge) {
    console.log(PIP_UNINSTALL_NOTICE);
  }
  if (pruneResult.failed.length > 0) {
    console.warn(
      `readev-tools setup: could not remove ${pruneResult.failed.length} obsolete file(s): ` +
        pruneResult.failed.join(', ')
    );
  }

  return {
    placed: currentOwned.length,
    pruned: pruneResult.deleted,
    failed: pruneResult.failed,
    isBridge,
  };
}

module.exports = {
  HOST_LAYOUT,
  run,
};
