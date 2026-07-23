'use strict';

/**
 * src/safe-path.js — shared path-containment primitives (security-critical)
 *
 * The single, tested source of truth for "does this path stay inside the
 * target project root", used by every module that resolves a caller- or
 * template-influenced relative path against a project root before reading or
 * writing it (shims, place, verify, prune, rea-archive, manifest, ...).
 *
 * Background: a LEXICAL-ONLY containment check (`path.resolve()` +
 * `startsWith(resolvedRoot + path.sep)`) never touches the filesystem, so it
 * cannot detect that a path component *inside* the root is itself a symlink
 * or a directory junction pointing OUTSIDE it. `fs.writeFileSync`/
 * `copyFileSync`/`mkdirSync`/`readFileSync`/`existsSync` all follow symlinks
 * by default, so a malicious/compromised repo or starter template can plant
 * one and have a lexically-safe-looking write/read escape the project root
 * entirely (CWE-59). This module closes that gap with a REALPATH-aware
 * containment layer, on top of the lexical one, shared by every caller.
 *
 * Two independent layers, each with a non-throwing boolean and (where a
 * caller needs one) a throwing sibling — mirrors the pattern this module's
 * two consumers actually need: `prune` must SKIP one bad candidate without
 * aborting the rest of a multi-candidate sweep, while `shims`/`place`/
 * `verify` must REFUSE (throw) a single write/read outright.
 *
 *   Lexical layer (pure string resolution, no filesystem access):
 *     - `isInsideRoot(root, rel)`   - boolean, root-equal refused.
 *     - `toCanonicalRel(root, rel)` - the one canonical forward-slash,
 *       `..`-collapsed relative form a candidate is checked and acted on
 *       under, so a non-canonical spelling of the SAME target
 *       (`x/../y`, a redundant `./`, an absolute path resolving inside root)
 *       can never disagree with what actually gets read/written/deleted.
 *
 *   Realpath layer (touches the filesystem; catches an in-root symlink/
 *   junction that resolves OUTSIDE root — the lexical layer is blind to
 *   this):
 *     - `isRealpathInsideRoot(root, rel)` - boolean, NEVER throws (a
 *       realpath failure — permission, race, root not found via a bad
 *       candidate — means "cannot confirm containment", which resolves to
 *       `false`, the safe default for every caller). Tolerant of a brand
 *       new (not-yet-existing) file: it walks up to the NEAREST EXISTING
 *       ancestor of `dest` before calling `realpathSync`, so a legitimate
 *       new file under a real in-root directory is allowed, while a new
 *       file whose existing PARENT is an escaping symlink/junction is
 *       still caught — a realpath check on `dest` alone would miss exactly
 *       that case (`realpathSync` on a non-existent `dest` throws ENOENT,
 *       and a naive dest-only guard would then read that as "ok").
 *     - `resolveInsideRoot(root, rel)` - absolute dest, THROWS on escape:
 *       lexical guard, then `isRealpathInsideRoot`; refuses (throws) if
 *       either layer fails. This is the one every write/read call site
 *       should call directly.
 *
 * `prune` calls the non-throwing `isRealpathInsideRoot` directly and
 * `continue`s past a `false` (never the throwing `resolveInsideRoot` — that
 * would turn its "skip one bad candidate" contract into an "abort the whole
 * prune" crash).
 *
 * `isSamePath(a, b)` is a separate, small self-copy helper (`place`'s
 * dogfood `core -> core` self-copy guard): path equality that is
 * case-folded ONLY when the running filesystem is actually case-insensitive
 * (detected via a runtime probe, with a `process.platform` fallback) —
 * folding unconditionally would make two GENUINELY DIFFERENT paths compare
 * equal on a case-sensitive filesystem, a false positive that would wrongly
 * skip a legitimate copy.
 *
 * Known residual limits (not closed by this module, documented rather than
 * hidden):
 *   - TOCTOU: the realpath check and the later read/write/delete are not
 *     atomic; a symlink swapped in between the check and the operation
 *     still races. Would need `O_NOFOLLOW`/`openat` semantics Node does not
 *     expose portably.
 *   - A mid-path symlink/junction that resolves back INSIDE root is
 *     intentionally ALLOWED, not an escape — refusing it would break
 *     legitimate symlinked project layouts.
 *
 * Node built-ins only.
 *
 * Exported API:
 *   toCanonicalRel(root, rel)      - forward-slash, `..`-collapsed,
 *                                     absolute-resolved rel.
 *   isInsideRoot(root, rel)        - strict LEXICAL boolean containment,
 *                                     root-equal refused.
 *   isRealpathInsideRoot(root, rel) - non-throwing realpath containment,
 *                                     nearest-existing-ancestor tolerant of
 *                                     new files. NEVER throws.
 *   resolveInsideRoot(root, rel)   - absolute dest; lexical + realpath
 *                                     guarded; THROWS on escape or
 *                                     unconfirmable containment.
 *   isSamePath(a, b)               - path.resolve equality, case-folded
 *                                     only on a case-insensitive FS.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/**
 * Returns true if `relPath`, resolved against `root`, stays STRICTLY inside
 * `root`. Refuses a `../` escape, an absolute path pointing elsewhere, and
 * `root` itself (an empty/`.`/`./` candidate) — root-equal is never
 * "inside". Pure string resolution; never touches the filesystem. Hoisted
 * verbatim from src/prune.js.
 */
function isInsideRoot(root, relPath) {
  const resolvedRoot = path.resolve(root);
  const resolvedEntry = path.resolve(root, relPath);
  const rootWithSep = resolvedRoot.endsWith(path.sep) ? resolvedRoot : `${resolvedRoot}${path.sep}`;
  return resolvedEntry.startsWith(rootWithSep);
}

/**
 * Returns the single canonical relative key for `relPath` against `root`:
 * forward-slash, `..`-collapsed, absolute-resolved. A non-canonical spelling
 * of the same target (`x/../y`, a redundant `./`, an absolute path that
 * still resolves inside root) always reduces to the same value. Pure string
 * resolution; never touches the filesystem. Hoisted verbatim from
 * src/prune.js.
 */
function toCanonicalRel(root, relPath) {
  const resolvedRoot = path.resolve(root);
  const resolvedEntry = path.resolve(root, relPath);
  return path.relative(resolvedRoot, resolvedEntry).replace(/\\/g, '/');
}

/**
 * Returns true if `p` exists as a filesystem ENTRY — including a DANGLING
 * symlink/junction (one whose target does not exist). Uses `fs.lstatSync`,
 * which inspects the entry itself and does NOT follow the final path
 * component, unlike `fs.existsSync` (which follows symlinks and reports
 * `false` for a dangling one). That distinction matters here: a dangling
 * in-root link must be treated as "exists" so `nearestExistingAncestor`
 * stops AT the link — rather than stepping past it to its parent — so the
 * caller's subsequent `realpathSync` runs on the link itself and can catch
 * it pointing outside root.
 */
function entryExists(p) {
  try {
    fs.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Walks UP from `dest` to its nearest EXISTING ancestor (`dest` itself, if
 * it exists — including a dangling symlink/junction, see `entryExists`;
 * otherwise its parent, grandparent, etc.). Used so a containment check can
 * tolerate a brand-new (not-yet-created) file/dir while still catching an
 * escaping symlink/junction anywhere along the existing part of the chain,
 * INCLUDING a dangling one whose target was never created. Always
 * terminates: some ancestor always exists in practice (the resolved root
 * itself does), and the `parent === candidate` filesystem-root guard
 * prevents an infinite loop even in the degenerate case where nothing does.
 */
function nearestExistingAncestor(dest) {
  let candidate = dest;
  while (!entryExists(candidate)) {
    const parent = path.dirname(candidate);
    if (parent === candidate) {
      // Reached the filesystem root without finding anything that exists.
      // Should be unreachable in practice, but this terminates the walk
      // rather than looping forever; the realpathSync call in the caller
      // will simply fail on this (equally non-existent) candidate.
      return candidate;
    }
    candidate = parent;
  }
  return candidate;
}

/**
 * Returns true if `relPath`, resolved against `root`, resolves — via
 * `fs.realpathSync` — to a real path at or inside `root`'s own real path.
 * Unlike `isInsideRoot`, this DOES touch the filesystem, so it catches a
 * symlink or directory junction living under `root` that points OUTSIDE it
 * (CWE-59) — something a lexical-only check cannot see.
 *
 * Tolerant of a brand-new (not-yet-existing) `dest`: walks up to the
 * nearest EXISTING ancestor before resolving it, so both a dest-that-is-a-
 * symlink and a dest-whose-existing-parent-chain-escapes are caught, while
 * legitimate new-file creation under a real in-root directory is still
 * allowed.
 *
 * NEVER throws (except if `root` itself does not exist — a caller error,
 * intentionally not wrapped, matching src/prune.js's own realpath call). A
 * `realpathSync` failure on the nearest existing ancestor (permission
 * denied, a TOCTOU race) is treated as "containment cannot be confirmed",
 * which resolves to `false` — the safe default shared by both a throwing
 * caller (refuse) and a skipping caller (skip).
 *
 * @param {string} root - absolute (or resolvable) path to the project root;
 *   must exist.
 * @param {string} relPath - path to check, relative to `root` (or absolute).
 * @returns {boolean}
 */
function isRealpathInsideRoot(root, relPath) {
  const resolvedRoot = fs.realpathSync(path.resolve(root));
  const dest = path.resolve(resolvedRoot, relPath);
  const nearestExisting = nearestExistingAncestor(dest);

  let real;
  try {
    real = fs.realpathSync(nearestExisting);
  } catch {
    return false; // can't verify containment: refuse
  }

  const resolvedRootWithSep = resolvedRoot.endsWith(path.sep) ? resolvedRoot : `${resolvedRoot}${path.sep}`;
  return real === resolvedRoot || real.startsWith(resolvedRootWithSep);
}

/**
 * Resolves `relPath` against `root` and returns the absolute destination —
 * refusing (throwing) if it escapes `root` either LEXICALLY (`../../x`, an
 * absolute path elsewhere) or via the FILESYSTEM (an in-root symlink/
 * junction that resolves outside root, or containment that cannot be
 * confirmed via realpath). This is the guard every write/read call site
 * should call directly, immediately before the actual `fs` operation.
 *
 * @param {string} root - absolute (or resolvable) path to the project root;
 *   must exist.
 * @param {string} relPath - path to resolve, relative to `root` (or
 *   absolute).
 * @returns {string} the absolute destination path.
 * @throws {Error} if `relPath` escapes `root`, lexically or via realpath.
 */
function resolveInsideRoot(root, relPath) {
  const resolvedRoot = path.resolve(root);
  const dest = path.resolve(resolvedRoot, relPath);

  if (!isInsideRoot(root, relPath)) {
    throw new Error(
      `Refusing to resolve outside target root: ${relPath} resolves to ${dest}, ` +
        `which is outside ${resolvedRoot}`
    );
  }

  if (!isRealpathInsideRoot(root, relPath)) {
    throw new Error(
      `Refusing to resolve ${relPath} inside ${resolvedRoot}: containment could not be ` +
        'confirmed via realpath (a symlink/junction along the path may resolve outside root)'
    );
  }

  return dest;
}

// Memoized across calls — probed at most once per process. `undefined`
// means "not probed yet"; a real filesystem probe is more trustworthy than a
// platform assumption alone (e.g. a case-sensitive volume mounted on
// macOS/Windows), but the probe itself needs a writable tmp dir, so a
// platform-based fallback covers the rare case that fails too.
let cachedIsCaseInsensitiveFs;

/**
 * Returns true if the running filesystem is case-insensitive (default on
 * Windows and macOS; not on Linux). Detected empirically by writing a probe
 * file and checking whether an upper-cased variant of its name resolves to
 * the same file — falls back to a `process.platform` check only if the
 * probe itself cannot run (e.g. an unwritable tmp dir). Memoized for the
 * life of the process.
 */
function isFsCaseInsensitive() {
  if (cachedIsCaseInsensitiveFs !== undefined) {
    return cachedIsCaseInsensitiveFs;
  }

  let probeDir;
  try {
    probeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rea-safe-path-case-probe-'));
    fs.writeFileSync(path.join(probeDir, 'probe.tmp'), '');
    cachedIsCaseInsensitiveFs = fs.existsSync(path.join(probeDir, 'PROBE.TMP'));
  } catch {
    // Probing the real filesystem failed (e.g. unwritable tmp dir) — fall
    // back to the platform default: win32/darwin ship case-insensitive by
    // default, every other platform (notably Linux) does not.
    cachedIsCaseInsensitiveFs = process.platform === 'win32' || process.platform === 'darwin';
  } finally {
    if (probeDir) {
      try {
        fs.rmSync(probeDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup only — never let this affect the result.
      }
    }
  }

  return cachedIsCaseInsensitiveFs;
}

/**
 * Returns true if `a` and `b` resolve to the same path. Case-folded ONLY
 * when the running filesystem is actually case-insensitive (see
 * `isFsCaseInsensitive`) — folding unconditionally would make two
 * GENUINELY DIFFERENT paths compare equal on a case-sensitive filesystem, a
 * false positive that would wrongly treat two distinct files as "the same
 * path" (e.g. wrongly skipping a legitimate copy in `place`'s self-copy
 * guard).
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function isSamePath(a, b) {
  const resolvedA = path.resolve(a);
  const resolvedB = path.resolve(b);
  if (isFsCaseInsensitive()) {
    return resolvedA.toLowerCase() === resolvedB.toLowerCase();
  }
  return resolvedA === resolvedB;
}

module.exports = {
  toCanonicalRel,
  isInsideRoot,
  isRealpathInsideRoot,
  resolveInsideRoot,
  isSamePath,
};
