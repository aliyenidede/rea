'use strict';

/**
 * src/manifest.js — Ownership manifest module
 *
 * Reads/writes the per-project REA ownership manifest at a fixed path
 * (MANIFEST_REL_PATH, relative to the target project root). The manifest
 * records which files/regions rea-tools has written so later runs
 * (place/shims/prune) can diff against a known-good previous state.
 *
 * Every stored path is a forward-slash relative path (relative to the
 * target root) — never a Windows backslash or absolute path. Paths are
 * normalized both when recorded and when compared, so a manifest written
 * on Windows is comparable against POSIX-style literals used elsewhere.
 *
 * This module is pure file/JSON IO (Node built-ins only). It has no
 * deletion logic — that lives in the prune module.
 *
 * Exported API:
 *   MANIFEST_REL_PATH                          - fixed manifest path, relative to targetRoot
 *                                                 ('.rea/.rea-manifest.json')
 *   MANIFEST_VERSION                            - current manifest schema version (integer)
 *   normalizeRelPath(inputPath, [targetRoot])   - returns a forward-slash relative path. If
 *                                                 targetRoot is given and inputPath is absolute,
 *                                                 inputPath is relativized against targetRoot
 *                                                 first; otherwise inputPath is assumed already
 *                                                 relative and only its separators are normalized.
 *   createEmptyManifest()                       - returns a fresh {version, ownedFiles: [],
 *                                                 shimRegions: []}
 *   load(targetRoot)                            - reads + parses the manifest; missing file
 *                                                 returns createEmptyManifest(). A partial/old
 *                                                 schema manifest is backfilled to a well-formed
 *                                                 shape; invalid JSON throws a contextual error.
 *   recordOwned(manifest, relPath)              - adds a normalized path to
 *                                                 manifest.ownedFiles (de-duped). Mutates and
 *                                                 returns the manifest. Throws if relPath is
 *                                                 absolute.
 *   recordShimRegion(manifest, file, marker)    - adds or updates a {file, marker} entry in
 *                                                 manifest.shimRegions, keyed by normalized file
 *                                                 path. Mutates and returns the manifest. Throws
 *                                                 if file is absolute.
 *   listOwned(manifest)                         - returns a shallow copy of manifest.ownedFiles
 *                                                 (array of forward-slash relative paths)
 *   save(targetRoot, manifest)                  - atomic write (temp file + rename) of
 *                                                 pretty-printed JSON to MANIFEST_REL_PATH under
 *                                                 targetRoot. Creates parent dirs as needed. Refuses
 *                                                 (throws) if `.rea` is an escaping symlink/junction —
 *                                                 guarded via src/safe-path.js's resolveInsideRoot
 *                                                 before the mkdir/write.
 */

const fs = require('node:fs');
const path = require('node:path');

const safePath = require('./safe-path');

const MANIFEST_REL_PATH = '.rea/.rea-manifest.json';
const MANIFEST_VERSION = 1;

/**
 * Returns a forward-slash relative path.
 *
 * If `targetRoot` is provided and `inputPath` is absolute, `inputPath` is
 * relativized against `targetRoot` first. Otherwise `inputPath` is assumed
 * to already be relative, and only its separators are normalized (any
 * backslash becomes a forward slash; a leading "./" is stripped).
 */
function normalizeRelPath(inputPath, targetRoot) {
  let rel = inputPath;
  if (targetRoot !== undefined && path.isAbsolute(inputPath)) {
    rel = path.relative(targetRoot, inputPath);
  }
  return rel.replace(/\\/g, '/').replace(/^\.\//, '');
}

/** Returns a fresh, empty manifest object. */
function createEmptyManifest() {
  return { version: MANIFEST_VERSION, ownedFiles: [], shimRegions: [] };
}

function manifestPathFor(targetRoot) {
  return path.join(targetRoot, MANIFEST_REL_PATH);
}

/**
 * Returns true if `p` is an absolute path on either POSIX or Windows,
 * regardless of the platform this code is currently running on.
 */
function isAbsoluteAnyPlatform(p) {
  return path.isAbsolute(p) || /^[A-Za-z]:[\\/]/.test(p) || p.startsWith('/');
}

/**
 * Reads + parses the manifest at targetRoot. Missing file returns an empty
 * manifest. A partial/old-schema manifest (missing ownedFiles/shimRegions/
 * version) is backfilled to a well-formed shape. Invalid JSON throws a
 * contextual error naming the manifest path rather than silently discarding
 * the corrupt record.
 */
function load(targetRoot) {
  const manifestPath = manifestPathFor(targetRoot);
  if (!fs.existsSync(manifestPath)) {
    return createEmptyManifest();
  }
  const raw = fs.readFileSync(manifestPath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Manifest at ${manifestPath} is not valid JSON: ${err.message}`);
  }
  if (!Array.isArray(parsed.ownedFiles)) {
    parsed.ownedFiles = [];
  }
  if (!Array.isArray(parsed.shimRegions)) {
    parsed.shimRegions = [];
  }
  if (parsed.version === undefined) {
    parsed.version = MANIFEST_VERSION;
  }
  return parsed;
}

/**
 * Adds a normalized path to manifest.ownedFiles (de-duped). Mutates and
 * returns manifest. Throws if `relPath` is absolute — callers must
 * pre-normalize via `normalizeRelPath(abs, targetRoot)` before recording,
 * since `record*` has no targetRoot to relativize against.
 */
function recordOwned(manifestObj, relPath) {
  if (isAbsoluteAnyPlatform(relPath)) {
    throw new Error(
      `recordOwned received an absolute path (${relPath}). Pre-normalize it first via ` +
        'normalizeRelPath(absPath, targetRoot).'
    );
  }
  const normalized = normalizeRelPath(relPath);
  if (!manifestObj.ownedFiles.includes(normalized)) {
    manifestObj.ownedFiles.push(normalized);
  }
  return manifestObj;
}

/**
 * Adds or updates a {file, marker} entry in manifest.shimRegions, keyed by
 * normalized file path. Mutates and returns manifest. Throws if `file` is
 * absolute — callers must pre-normalize via `normalizeRelPath(abs,
 * targetRoot)` before recording, since `record*` has no targetRoot to
 * relativize against.
 */
function recordShimRegion(manifestObj, file, marker) {
  if (isAbsoluteAnyPlatform(file)) {
    throw new Error(
      `recordShimRegion received an absolute path (${file}). Pre-normalize it first via ` +
        'normalizeRelPath(absPath, targetRoot).'
    );
  }
  const normalizedFile = normalizeRelPath(file);
  const existing = manifestObj.shimRegions.find((entry) => entry.file === normalizedFile);
  if (existing) {
    existing.marker = marker;
  } else {
    manifestObj.shimRegions.push({ file: normalizedFile, marker });
  }
  return manifestObj;
}

/** Returns a shallow copy of manifest.ownedFiles (array of forward-slash relative paths). */
function listOwned(manifestObj) {
  return [...manifestObj.ownedFiles];
}

/**
 * Atomically writes the manifest to MANIFEST_REL_PATH under targetRoot:
 * writes to a temp file then renames it over the real path. Creates parent
 * directories as needed.
 *
 * Guarded via `safePath.resolveInsideRoot` before the mkdir/write: refuses
 * (throws) if `.rea` is an escaping symlink/junction, i.e. containment
 * cannot be confirmed via realpath. For a fresh project (`.rea` does not
 * exist yet) this resolves via the nearest EXISTING ancestor — targetRoot
 * itself — and does not throw.
 */
function save(targetRoot, manifestObj) {
  const manifestPath = safePath.resolveInsideRoot(targetRoot, MANIFEST_REL_PATH);
  const tmpPath = `${manifestPath}.tmp`;

  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(tmpPath, `${JSON.stringify(manifestObj, null, 2)}\n`, 'utf8');
  fs.renameSync(tmpPath, manifestPath);
}

module.exports = {
  MANIFEST_REL_PATH,
  MANIFEST_VERSION,
  normalizeRelPath,
  createEmptyManifest,
  load,
  recordOwned,
  recordShimRegion,
  listOwned,
  save,
};
