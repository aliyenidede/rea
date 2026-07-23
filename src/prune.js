'use strict';

/**
 * src/prune.js — G1 obsolete-file prune (security-critical)
 *
 * Deletes files rea-tools previously placed but no longer owns. The prune
 * basis is a caller-supplied diff of two owned-path snapshots (never a fresh
 * disk scan) — see prune()'s parameters below — plus, on the one-time
 * legacy-host bridge, the hard-coded retired-file list (src/retired-list.js).
 *
 * Every candidate is first reduced to ONE canonical relative form
 * (toCanonicalRel — forward-slash, `..`-collapsed, absolute-resolved) and
 * every guard below, plus the eventual delete target, run against that SAME
 * canonical form — never the raw candidate string. This is what prevents a
 * non-canonical spelling (`x/../CLAUDE.md`, a redundant `./`, an absolute
 * path resolving inside root) from bypassing a guard that a plain-looking
 * candidate would have hit. Guards, in order, BEFORE any unlink, regardless
 * of what the manifest/retired-list says:
 *   - a whole-project guard that refuses a candidate whose canonical form is
 *     `''`/`.` (i.e. targetRoot itself)
 *   - a deny-list (isProtected, case-folded) that blocks the new-schema
 *     typed memory dirs, the legacy memory dirs/files, and user-content
 *     files
 *   - a containment check (isInsideRoot) that refuses any path resolving
 *     outside — or equal to — the target project root (../escape, an
 *     absolute path)
 *   - a real-path containment check that refuses a symlink/junction under
 *     targetRoot which resolves outside it (CWE-59)
 *
 * The canonicalization, lexical containment, and real-path containment
 * guards are NOT reimplemented here — they delegate to the shared
 * `src/safe-path.js` (the single tested source of truth for every module
 * that resolves a caller-influenced path against a project root).
 * `isInsideRoot`/`toCanonicalRel` are re-exported from safe-path below so
 * this module's public API is unchanged (safe-path's versions are
 * byte-identical to this module's originals). The real-path re-check calls
 * safe-path's NON-THROWING `isRealpathInsideRoot` and `continue`s on
 * `false` — it deliberately never calls the throwing `resolveInsideRoot`,
 * which would turn "skip one bad candidate" into "abort the whole prune".
 *
 * A guard violation is skipped, not thrown — a single bad candidate must
 * never abort the rest of the prune. Likewise a delete that throws
 * (EBUSY/EPERM on a locked file) is caught and the candidate is recorded in
 * `failed`, not thrown.
 *
 * Node built-ins only.
 *
 * Exported API:
 *   DENY_PREFIXES                - directory-prefix denylist (forward-slash,
 *                                   trailing-slash-terminated)
 *   DENY_FILES                   - exact-file denylist (forward-slash)
 *   isProtected(relPath)         - true if relPath is under a denied prefix
 *                                   or equals a denied file
 *   isInsideRoot(targetRoot, relPath)
 *                                 - true if relPath resolves STRICTLY inside
 *                                   targetRoot (root-equal is refused).
 *                                   Re-exported from src/safe-path.js.
 *   toCanonicalRel(targetRoot, relPath)
 *                                 - the single canonical (forward-slash,
 *                                   `..`-collapsed) relative form a candidate
 *                                   is checked and deleted under.
 *                                   Re-exported from src/safe-path.js.
 *   prune({ targetRoot, previouslyOwned, currentOwned, isBridge })
 *                                 - deletes owned-and-removed files (+ the
 *                                   retired list on the bridge); returns
 *                                   { deleted, failed } — both arrays of
 *                                   forward-slash paths relative to
 *                                   targetRoot. A candidate that fails to
 *                                   delete (e.g. EBUSY/EPERM) lands in
 *                                   `failed`, not thrown — it never aborts
 *                                   the rest of the prune.
 */

const fs = require('node:fs');
const path = require('node:path');

const manifest = require('./manifest');
const { RETIRED_FILES } = require('./retired-list');
const safePath = require('./safe-path');

/**
 * Directory prefixes that are never eligible for deletion, no matter what
 * the manifest or retired list says. Every entry ends with a trailing slash
 * so prefix-matching cannot false-positive on a sibling like
 * `.rea/plans-backup.md` matching `.rea/plans/`.
 */
const DENY_PREFIXES = [
  '.rea/knowledge/',
  '.rea/decisions/',
  '.rea/sessions/',
  '.rea/plans/',
  '.rea/log/', // legacy (pre-typed-memory) log dir, for a mid-migration host
];

/** Exact files that are never eligible for deletion. */
const DENY_FILES = [
  '.rea/lessons.md', // legacy (pre-typed-memory) lessons file
  'CLAUDE.md',
  '.claude/settings.json',
  '.gemini/settings.json', // shims module only ever merges into this file
];

/**
 * Returns true if `relPath` is under a denied directory prefix or equals a
 * denied file. Independent of the manifest/retired-list — this guard is
 * checked before every unlink regardless of why the path was a candidate.
 *
 * The comparison is case-folded (both sides lowercased) so a
 * case-insensitive filesystem (Windows, default macOS) cannot be used to
 * spell around the deny-list (e.g. `claude.md` resolving to the same file
 * as `CLAUDE.md`). Case-folding can only ever cause an *extra* safe skip on
 * a case-sensitive filesystem — never a false negative.
 */
function isProtected(relPath) {
  const normalized = manifest.normalizeRelPath(relPath).replace(/\/+$/, '').toLowerCase();
  if (DENY_FILES.some((denyFile) => denyFile.toLowerCase() === normalized)) {
    return true;
  }
  const withTrailingSlash = `${normalized}/`;
  return DENY_PREFIXES.some((prefix) => withTrailingSlash.startsWith(prefix.toLowerCase()));
}

/**
 * Deletes files rea-tools previously owned but no longer owns.
 *
 * @param {object} args
 * @param {string} args.targetRoot - absolute path to the host project root.
 * @param {string[]} [args.previouslyOwned] - the PRE-RUN manifest's owned-set
 *   snapshot (forward-slash relative paths), captured in memory BEFORE
 *   placement — never a fresh disk/manifest read.
 * @param {string[]} [args.currentOwned] - the current template/owned set
 *   (forward-slash relative paths) after this run's placement.
 * @param {boolean} [args.isBridge] - true on the one-time legacy-host bridge
 *   (legacy command files present, no manifest yet); also deletes the
 *   hard-coded retired list.
 * @returns {{deleted: string[], failed: string[]}} `deleted` — the
 *   forward-slash relative paths actually deleted. `failed` — candidates
 *   that were eligible (passed every guard, existed on disk) but whose
 *   delete threw (e.g. a locked file); these are skipped, not thrown.
 */
function prune({ targetRoot, previouslyOwned = [], currentOwned = [], isBridge = false }) {
  const currentSet = new Set(currentOwned.map((relPath) => manifest.normalizeRelPath(relPath)));

  const candidates = new Set();
  for (const relPath of previouslyOwned) {
    const normalized = manifest.normalizeRelPath(relPath);
    if (!currentSet.has(normalized)) {
      candidates.add(normalized);
    }
  }
  if (isBridge) {
    for (const relPath of RETIRED_FILES) {
      candidates.add(manifest.normalizeRelPath(relPath));
    }
  }

  const deleted = [];
  const failed = [];
  for (const relPath of candidates) {
    // Canonicalize ONCE. Every guard below, and the eventual delete target,
    // run against this SAME resolved form — never the raw candidate string —
    // so a non-canonical spelling (`x/../CLAUDE.md`, a redundant `./`, an
    // absolute path that still resolves inside root) cannot disagree with
    // what actually gets unlinked.
    const canonicalRel = safePath.toCanonicalRel(targetRoot, relPath);

    if (canonicalRel === '' || canonicalRel === '.') {
      continue; // root-equal candidate: never eligible (whole-project guard)
    }
    if (isProtected(canonicalRel)) {
      continue; // deny-list guard: refuse, do not unlink
    }
    if (!safePath.isInsideRoot(targetRoot, canonicalRel)) {
      continue; // containment guard: refuse, do not unlink
    }

    const absPath = path.resolve(targetRoot, canonicalRel);
    if (!fs.existsSync(absPath)) {
      continue; // nothing on disk to delete
    }

    // Lexical containment above only guards the *named* path; a symlink or
    // junction living under targetRoot can point outside it, so the OS
    // would delete outside root even though the candidate lexically passed.
    // Re-check containment via realpath before the unlink — NON-THROWING:
    // a single bad candidate must be SKIPPED, never abort the rest of the
    // prune, so this calls safePath.isRealpathInsideRoot (never the
    // throwing safePath.resolveInsideRoot).
    if (!safePath.isRealpathInsideRoot(targetRoot, canonicalRel)) {
      // Skip ONLY a genuine escape: the realpath resolves OUTSIDE root (a
      // symlink/junction escape, CWE-59) or containment could not be
      // confirmed at all. A symlink/junction that resolves to root itself,
      // or to some path INSIDE root, IS contained — isRealpathInsideRoot
      // returns true for that case, so it is NOT skipped here and falls
      // through to the rmSync below. That is safe: rmSync lstats the final
      // path component and, for a symlink/junction, unlinks the link entry
      // itself rather than recursing through it — so a link that merely
      // "points at" root never causes root's own contents to be touched,
      // even though the link entry is deleted.
      continue;
    }

    try {
      fs.rmSync(absPath, { recursive: true, force: true });
      deleted.push(canonicalRel);
    } catch {
      // e.g. EBUSY/EPERM on a locked file (realistic on Windows): skip this
      // one candidate, never abort the rest of the prune.
      failed.push(canonicalRel);
    }
  }

  return { deleted, failed };
}

module.exports = {
  DENY_PREFIXES,
  DENY_FILES,
  isProtected,
  // Re-exported from src/safe-path.js (byte-identical to this module's
  // former originals) so the public API is unchanged — src/rea-archive.js
  // and test/prune.test.js both call these directly off this module.
  isInsideRoot: safePath.isInsideRoot,
  toCanonicalRel: safePath.toCanonicalRel,
  prune,
};
