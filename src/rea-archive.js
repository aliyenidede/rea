'use strict';

/**
 * src/rea-archive.js — legacy `.rea/` archive (4d-3)
 *
 * `archiveLegacyRea(targetRoot, {dryRun})` MOVES the pre-typed-memory legacy
 * locations — `.rea/log/` and `.rea/lessons.md` — under `.rea/_archive/`,
 * preserving each source's relative structure (a nested
 * `.rea/log/2026-01/x.md` lands at `.rea/_archive/log/2026-01/x.md`;
 * `.rea/lessons.md` lands at `.rea/_archive/lessons.md`). It NEVER deletes —
 * every source file that is moved is guaranteed to exist at its new path
 * before this module is done with it (rename, or copy-then-unlink as a
 * fallback — see moveFile() below).
 *
 * Both legacy sources are FIXED LITERALS (`.rea/log/`, `.rea/lessons.md`),
 * never caller-supplied — unlike src/prune.js's candidate list, which comes
 * from a manifest diff and therefore needs a realpath/symlink-escape guard
 * over an arbitrary, caller-influenced CANDIDATE PATH. Nothing here accepts
 * such a caller-controlled path, so that specific shape of guard is out of
 * scope. Two DIFFERENT, very real symlink hazards are in scope, though,
 * because either fixed side of a MOVE can be a link planted by a malicious/
 * compromised repo or template rather than the real dir/file it looks like:
 * the two fixed TOP-LEVEL SOURCE paths (`.rea/log`, `.rea/lessons.md` — see
 * FIX B), and the DESTINATION root (`.rea/_archive`, or `.rea` itself — see
 * FIX E). A plain lexical containment check on the destination is ALSO
 * performed, via prune's own `isInsideRoot`/`toCanonicalRel` helpers — this
 * one genuinely is defense-in-depth only (it can never fire for the fixed
 * `.rea/_archive/...` prefix built below); FIX E's realpath check is the
 * load-bearing guard for a destination-side symlink/junction.
 *
 * The never-archive guard below is INTENTIONALLY NOT `prune.isProtected`:
 * prune's deny-list exists to PROTECT `.rea/log/` and `.rea/lessons.md` from
 * deletion elsewhere in the codebase — the exact two paths this module's job
 * is to move. Reusing `isProtected` here would make archiving a no-op. This
 * module's own, narrower never-archive set instead protects the opposite
 * side of the migration: the four TYPED memory dirs
 * (`.rea/{knowledge,decisions,sessions,plans}`) and the ownership manifest —
 * these must never be moved or touched by this module.
 *
 * Fixes landed after the review gate on the first implementation:
 *
 *   FIX A (CRITICAL, data loss) — `.rea/lessons.md` is a single ACCUMULATING
 *   file (legacy `rea-wrap` keeps appending to it): if it was archived once,
 *   then the user (still on legacy) appends more and re-runs migrate, a
 *   naive second move would CLOBBER the earlier archived
 *   `.rea/_archive/lessons.md`, permanently losing the first batch, while
 *   still reporting success. Fix: before moving ANY planned pair, if the
 *   destination already exists, the move is refused — the pair is recorded
 *   in `skipped` instead of `moved`, and the SOURCE is left exactly where it
 *   is (nothing lost on either side). This existence check is a read, so it
 *   is safe to run on a dry run too — a dry run's `skipped` therefore
 *   predicts the same outcome a real run would produce.
 *
 *   FIX B (HIGH, CWE-59) — the two top-level source checks now use
 *   `fs.lstatSync` (never `fs.statSync`, which FOLLOWS symlinks). A
 *   malicious/compromised repo could plant a junction `.rea/log ->
 *   ../knowledge` (no elevation needed for a Windows junction; a POSIX
 *   symlink is carried by git as-is) — under `statSync`, `.isDirectory()`
 *   would report true, the walk would enumerate the REAL typed-memory files
 *   reached through the link, and move them OUT of `.rea/knowledge/`
 *   (defeating this module's own never-archive invariant), or a `.rea/log ->
 *   /outside` link could pull external files in. `lstatSync` reports the
 *   LINK's own type (neither a directory nor a file), so a symlinked/
 *   junctioned `.rea/log` or `.rea/lessons.md` is silently skipped in its
 *   entirety — exactly how a symlink Dirent nested inside a real `.rea/log/`
 *   is already skipped by listFilesRecursive().
 *
 *   FIX C (resilience) — each per-file `moveFile` call is wrapped in its own
 *   try/catch; a locked file (EBUSY/EPERM, realistic on Windows) is caught
 *   and recorded in `failed` rather than throwing out of `archiveLegacyRea`
 *   and discarding every other already-computed result. Mirrors
 *   src/prune.js's own "skip, not throw" invariant for its delete loop.
 *
 *   FIX D (honesty) — after a real (non-dry-run) pass, now-empty directories
 *   under `.rea/log/` (and `.rea/log` itself) are removed, deepest first, so
 *   a completed archive doesn't leave a misleading trail of empty legacy
 *   dirs behind. `fs.rmdirSync` refuses (throws) on a non-empty directory —
 *   that failure is caught and the directory is simply left in place, so a
 *   directory still holding a FIX-A-skipped or FIX-C-failed file (or an
 *   unrelated symlink entry) is NEVER removed. This cleanup only ever
 *   touches paths at or under `.rea/log/` — `.rea/lessons.md` is a file, not
 *   a dir, so it has nothing to clean up.
 *
 *   FIX E (HIGH, CWE-59, destination side) — FIX B hardened the two SOURCE
 *   paths; the DESTINATION was still only lexically contained (`prune.
 *   isInsideRoot`/`toCanonicalRel` do pure string resolution, no realpath).
 *   A malicious/compromised repo could plant `.rea/_archive` (or `.rea`
 *   itself) as a symlink/junction pointing OUTSIDE the project BEFORE this
 *   module ever runs (`setup`'s `place()` never creates `.rea/_archive`, so
 *   a pre-planted link survives untouched to this point) — `moveFile`'s
 *   `mkdirSync`/`renameSync`/`copyFileSync` would then resolve that link at
 *   the OS level and write the victim's real `.rea/lessons.md`/`.rea/log/**`
 *   content to the external target: an out-of-root write/exfiltration
 *   primitive the lexical check alone cannot see. Fix:
 *   `isDestinationRealpathInsideRoot()` walks UP from `destAbs` to its
 *   NEAREST EXISTING ANCESTOR (destAbs itself, and typically some or all of
 *   `.rea/_archive/...`, won't exist yet on a first archive — `.rea` or
 *   targetRoot itself always will), `fs.realpathSync`-resolves that
 *   ancestor, and requires the result to stay at-or-inside
 *   `fs.realpathSync(targetRoot)`. Run BEFORE `moveFile` (so a symlinked
 *   `.rea/_archive` never gets an out-of-root dir created through it in the
 *   first place); a realpathSync failure (permission/race) is treated as
 *   "containment cannot be confirmed" and refuses the move — the safe
 *   default, never a throw. A refused destination lands in `failed` (it was
 *   otherwise eligible, but refused for safety), exactly like a FIX-C move
 *   failure; the source is left untouched either way. Mirrors src/prune.js's
 *   own realpath re-check (its FIX 5) and this module's own FIX B, now
 *   applied to the destination side. This is a bespoke, narrow realpath-
 *   containment check — once plan `.rea/plans/0011-safe-path-hardening/`
 *   lands its shared `src/safe-path.js` (`resolveInsideRoot`/
 *   `isRealpathInsideRoot`), this helper is a candidate to be replaced by
 *   that single source of truth.
 *
 * On `dryRun`, `{moved, failed, skipped}` are computed identically to a real
 * run (every check involved — existence, realpath containment — is
 * read-only), but no write of any kind happens — `.rea/_archive/` (and any
 * subdirs) is only ever created lazily, inside the per-file move itself,
 * and the FIX D cleanup above never runs on a dry run — so a dry run leaves
 * the tree byte-identical, with no stray `.rea/_archive/` directory and no
 * removed legacy dirs.
 *
 * Idempotent: once a legacy source has been moved away (and, per FIX D, its
 * now-empty parent dirs removed), a second run finds nothing there to move
 * and returns `{moved: [], failed: [], skipped: []}`.
 *
 * Node built-ins only.
 *
 * Exported API:
 *   archiveLegacyRea(targetRoot, {dryRun = false} = {})
 *     - returns {moved, failed, skipped} — all arrays of forward-slash,
 *       targetRoot-relative archive DESTINATION paths:
 *         moved   - actually (or, on dryRun, would-be) moved to `.rea/_archive/...`.
 *         failed  - eligible to move but either the move itself threw (e.g. a
 *                   locked source file — FIX C), or the destination's
 *                   containment inside targetRoot could not be confirmed via
 *                   realpath (e.g. a symlinked/junctioned `.rea/_archive` —
 *                   FIX E); the source is left untouched either way.
 *         skipped - refused because the destination already exists (FIX A —
 *                   never overwrite previously-archived history); the
 *                   source is left untouched.
 */

const fs = require('node:fs');
const path = require('node:path');

const prune = require('./prune');
const manifest = require('./manifest');

/** Legacy (pre-typed-memory) sources this module archives — fixed literals. */
const LEGACY_LOG_REL_DIR = '.rea/log';
const LEGACY_LESSONS_REL_FILE = '.rea/lessons.md';

/** Destination root every legacy source is moved under. */
const ARCHIVE_REL_DIR = '.rea/_archive';

/**
 * Never-archive set: ONLY the four typed memory dirs + the ownership
 * manifest. Not `prune.DENY_PREFIXES`/`DENY_FILES` — see module docstring
 * above for why that deny-list is the wrong guard for this module.
 */
const NEVER_ARCHIVE_PREFIXES = ['.rea/knowledge/', '.rea/decisions/', '.rea/sessions/', '.rea/plans/'];
const NEVER_ARCHIVE_FILES = [manifest.MANIFEST_REL_PATH];

/** Returns true if `canonicalRel` is one of the never-archive paths above. */
function isNeverArchive(canonicalRel) {
  if (NEVER_ARCHIVE_FILES.includes(canonicalRel)) {
    return true;
  }
  const withTrailingSlash = `${canonicalRel}/`;
  return NEVER_ARCHIVE_PREFIXES.some((prefix) => withTrailingSlash.startsWith(prefix));
}

/**
 * Recursively lists every regular file under `dirAbs`, as forward-slash paths
 * relative to `dirAbs` itself. Directory entries only (no symlink
 * following) — a symlink living inside `dirAbs` is neither a file nor a
 * directory to `withFileTypes` Dirents (it reports `isSymbolicLink()`
 * instead), so it is silently skipped rather than moved; this is acceptable
 * because both legacy sources are fixed, non-caller-controlled literals (see
 * module docstring).
 */
function listFilesRecursive(dirAbs) {
  const results = [];
  (function walk(currentAbs, currentRel) {
    for (const entry of fs.readdirSync(currentAbs, { withFileTypes: true })) {
      const entryAbs = path.join(currentAbs, entry.name);
      const entryRel = currentRel ? `${currentRel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(entryAbs, entryRel);
      } else if (entry.isFile()) {
        results.push(entryRel);
      }
    }
  })(dirAbs, '');
  return results;
}

/**
 * Moves `sourceAbs` to `destAbs` — rename, falling back to copy-then-unlink
 * on EXDEV (cross-device rename, e.g. source and dest on different mounted
 * volumes) — creating `destAbs`'s parent directory first. Never deletes
 * `sourceAbs` without the copy having already succeeded. Callers are
 * responsible for never invoking this when `destAbs` already exists (FIX A
 * lives in the caller, archiveLegacyRea(), not here).
 */
function moveFile(sourceAbs, destAbs) {
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  try {
    fs.renameSync(sourceAbs, destAbs);
  } catch (err) {
    if (err && err.code === 'EXDEV') {
      fs.copyFileSync(sourceAbs, destAbs);
      fs.unlinkSync(sourceAbs);
    } else {
      throw err;
    }
  }
}

/**
 * Removes now-empty directories at and under `rootAbs`, deepest first
 * (FIX D). `fs.rmdirSync` throws on a non-empty directory — that failure is
 * caught and the directory is simply left in place, so a directory still
 * holding a FIX-A-skipped or FIX-C-failed file (or an unrelated symlink
 * entry that was never followed) is NEVER removed. An unreadable directory
 * (readdirSync throws) is likewise left alone rather than treated as an
 * error. Symlink entries are neither followed nor removed (`isDirectory()`
 * is false for them via lstat-backed Dirents), mirroring
 * listFilesRecursive()'s own symlink handling.
 */
function removeEmptyDirsBottomUp(rootAbs) {
  if (!fs.existsSync(rootAbs)) {
    return;
  }

  const dirsDeepestFirst = [];
  (function walk(dirAbs) {
    let entries;
    try {
      entries = fs.readdirSync(dirAbs, { withFileTypes: true });
    } catch {
      return; // unreadable: leave whatever is under here alone
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(path.join(dirAbs, entry.name));
      }
    }
    // Post-order push: every subdirectory of dirAbs has already been walked
    // (and had its own removal attempted below) by the time dirAbs itself is
    // pushed here — this ordering alone is what makes the array deepest-first.
    dirsDeepestFirst.push(dirAbs);
  })(rootAbs);

  for (const dirAbs of dirsDeepestFirst) {
    try {
      fs.rmdirSync(dirAbs);
    } catch {
      // Not empty (a skipped/failed file, an un-removed subdirectory, or a
      // symlink entry still lives inside), or some other transient issue —
      // leave it in place, never force.
    }
  }
}

/**
 * Returns true if `destAbs`'s NEAREST EXISTING ANCESTOR directory resolves
 * (via `fs.realpathSync`) to a path at or inside `targetRoot`'s own real
 * path (FIX E). `destAbs` itself — and typically some or all of its parent
 * chain under `.rea/_archive/` — won't exist yet the first time this runs,
 * so this walks UP the path until it finds an ancestor that DOES exist;
 * `.rea` (or `targetRoot` itself) always does, so the walk always
 * terminates. Run this BEFORE any mkdirSync/rename/copy targeting `destAbs`,
 * so a symlinked/junctioned `.rea/_archive` (or `.rea` itself) pointing
 * outside the project is refused before an out-of-root directory or file is
 * ever created through it (CWE-59) — mirrors src/prune.js's own realpath
 * re-check and this module's own FIX B, now applied to the destination.
 *
 * A `realpathSync` failure (permission denied, or a TOCTOU race where the
 * ancestor disappears mid-check) is NOT treated as "no symlink here" — it is
 * treated as "containment cannot be confirmed", which refuses the move (the
 * safe default); this function never throws.
 *
 * TODO: this is a bespoke, narrow realpath-containment check — once plan
 * `.rea/plans/0011-safe-path-hardening/` lands its shared `src/safe-path.js`
 * (`resolveInsideRoot`/`isRealpathInsideRoot`), replace this helper with
 * that single source of truth.
 */
function isDestinationRealpathInsideRoot(targetRoot, destAbs) {
  let realRoot;
  try {
    realRoot = fs.realpathSync(targetRoot);
  } catch {
    return false; // can't even resolve the root itself: refuse
  }
  const realRootWithSep = realRoot.endsWith(path.sep) ? realRoot : `${realRoot}${path.sep}`;

  let candidate = destAbs;
  while (!fs.existsSync(candidate)) {
    const parent = path.dirname(candidate);
    if (parent === candidate) {
      // Reached the filesystem root without finding anything that exists.
      // Should never happen (targetRoot itself always exists), but guards
      // against an infinite loop regardless.
      return false;
    }
    candidate = parent;
  }

  let realCandidate;
  try {
    realCandidate = fs.realpathSync(candidate);
  } catch {
    return false; // cannot confirm containment: refuse
  }

  return realCandidate === realRoot || realCandidate.startsWith(realRootWithSep);
}

/**
 * Moves the legacy `.rea/log/` dir and `.rea/lessons.md` file under
 * `.rea/_archive/`, preserving relative structure. Never deletes, never
 * overwrites a previously-archived destination (FIX A).
 *
 * @param {string} targetRoot - absolute path to the host project root.
 * @param {object} [options]
 * @param {boolean} [options.dryRun] - when true, computes the same result
 *   but performs NO writes at all (no move, no directory creation, no
 *   directory removal).
 * @returns {{moved: string[], failed: string[], skipped: string[]}} see the
 *   module docstring's "Exported API" section above.
 */
function archiveLegacyRea(targetRoot, { dryRun = false } = {}) {
  const legacyLogAbs = path.join(targetRoot, ...LEGACY_LOG_REL_DIR.split('/'));
  const legacyLessonsAbs = path.join(targetRoot, ...LEGACY_LESSONS_REL_FILE.split('/'));

  // FIX B: lstatSync — NEVER statSync — for both top-level source checks.
  // statSync follows a symlink/junction; a `.rea/log` or `.rea/lessons.md`
  // planted as a link (to the real .rea/knowledge/, or to somewhere outside
  // the project entirely) would then be walked/read straight through it.
  // lstatSync reports the link's own type (neither a directory nor a file),
  // so a linked source is treated as absent and skipped in its entirety.
  const legacyLogIsRealDir = fs.existsSync(legacyLogAbs) && fs.lstatSync(legacyLogAbs).isDirectory();
  const legacyLessonsIsRealFile =
    fs.existsSync(legacyLessonsAbs) && fs.lstatSync(legacyLessonsAbs).isFile();

  // Plan every (source, destination) pair up front — nothing is written yet,
  // regardless of dryRun, so this planning step is always safe to run.
  const planned = [];

  if (legacyLogIsRealDir) {
    for (const relFile of listFilesRecursive(legacyLogAbs)) {
      planned.push({
        sourceAbs: path.join(legacyLogAbs, ...relFile.split('/')),
        destRelToRoot: `${ARCHIVE_REL_DIR}/log/${relFile}`,
      });
    }
  }

  if (legacyLessonsIsRealFile) {
    planned.push({
      sourceAbs: legacyLessonsAbs,
      destRelToRoot: `${ARCHIVE_REL_DIR}/lessons.md`,
    });
  }

  const moved = [];
  const failed = [];
  const skipped = [];

  for (const { sourceAbs, destRelToRoot } of planned) {
    // Canonicalize the destination once; every guard below and the eventual
    // move target run against this SAME resolved form.
    const canonicalDestRel = prune.toCanonicalRel(targetRoot, destRelToRoot);

    // Defense-in-depth only (see module docstring) — for the fixed
    // `.rea/_archive/...` destinations built above, neither guard can ever
    // actually fire.
    if (!prune.isInsideRoot(targetRoot, canonicalDestRel) || isNeverArchive(canonicalDestRel)) {
      continue;
    }

    const destAbs = path.join(targetRoot, ...canonicalDestRel.split('/'));

    // FIX A: never clobber a previously-archived destination. This is a
    // read, so it is safe to evaluate on a dry run too — a dry run's
    // `skipped` then predicts exactly what a real run would refuse.
    if (fs.existsSync(destAbs)) {
      skipped.push(canonicalDestRel);
      continue;
    }

    // FIX E: refuse a destination whose nearest existing ancestor resolves
    // outside targetRoot via a symlink/junction (e.g. a pre-planted
    // `.rea/_archive -> /outside` link). Also a read, so evaluated on a dry
    // run too — a dry run's `failed` then predicts this refusal as well.
    if (!isDestinationRealpathInsideRoot(targetRoot, destAbs)) {
      failed.push(canonicalDestRel);
      continue;
    }

    if (dryRun) {
      moved.push(canonicalDestRel);
      continue;
    }

    // FIX C: a locked/permission-denied source (EBUSY/EPERM) must not abort
    // the rest of the archive — caught and recorded, never thrown.
    try {
      moveFile(sourceAbs, destAbs);
      moved.push(canonicalDestRel);
    } catch {
      failed.push(canonicalDestRel);
    }
  }

  // FIX D: clean up now-empty legacy source dirs, deepest first. Only ever
  // touches `.rea/log/` (a file like `.rea/lessons.md` has no dir to clean
  // up) and only on a real run — never on a dry run, and never when the
  // top-level source was a symlink/junction (FIX B already left that alone).
  if (!dryRun && legacyLogIsRealDir) {
    removeEmptyDirsBottomUp(legacyLogAbs);
  }

  return { moved, failed, skipped };
}

module.exports = {
  archiveLegacyRea,
};
