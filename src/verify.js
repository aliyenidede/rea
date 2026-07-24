'use strict';

/**
 * src/verify.js — read-only install health check (4c-1)
 *
 * `verify(targetRoot)` reports whether a previous `readev-tools setup` run is
 * still intact, WITHOUT fixing anything and WITHOUT writing anything ("CLI
 * is dumb, Claude is smart" — repair is `rea-tidy`'s job, not this module's).
 * It only opens files to read them; it never creates, modifies, or deletes
 * anything on disk.
 *
 * Every check is driven by the ownership manifest (src/manifest.js) — never
 * a hardcoded per-tool file list — so this module stays tool-agnostic: it
 * validates whatever a given install actually placed/shimmed, for whichever
 * tool(s) that was.
 *
 * Checks (in order):
 *   1. manifest present  - the manifest FILE exists on disk AND lists at
 *                           least one owned file. Absent (missing file, OR
 *                           present but corrupt/invalid-JSON — manifest.load()
 *                           throws on the latter, per its documented
 *                           contract) -> a single `fail` ("not installed" /
 *                           "corrupted") and verify() returns IMMEDIATELY
 *                           with only that one check — none of the checks
 *                           below make sense without a readable manifest.
 *   2. owned files present - every manifest.listOwned() path still exists on
 *                           disk (resolved via the shared, realpath-aware
 *                           src/safe-path.js#resolveInsideRoot guard, so a
 *                           path that would escape targetRoot — lexically or
 *                           via an in-root symlink/junction — is reported as
 *                           a failure rather than thrown out of verify()).
 *   3. core/ + scaffold  - the core/{principles,craft-checklist,rea-schema}.md
 *                           trio and the four typed .rea/ scaffold dirs
 *                           (knowledge/decisions/sessions/plans) exist. A
 *                           scaffold dir deleted/replaced between the
 *                           existence check and the stat (a TOCTOU race) is
 *                           treated as missing rather than throwing.
 *   4. shims intact      - for each manifest shimRegions[] entry, branch on
 *                           its recorded `marker` (never on the filename): a
 *                           `'readev-tools'` entry (a markdown shim — CLAUDE.md
 *                           or AGENTS.md) still contains both managed markers,
 *                           correctly ordered (start strictly before end —
 *                           a reversed pair is not treated as intact), and —
 *                           only when its managed body is a single line (a
 *                           pointer shim like CLAUDE.md, never AGENTS.md's
 *                           own multi-line body) — that line is
 *                           `@AGENTS.md`; a `'context.fileName'` entry (the
 *                           Gemini JSON shim) still has 'AGENTS.md' inside an
 *                           array at context.fileName. A malformed
 *                           shimRegions[] entry (not an object, or missing a
 *                           string file/marker) is reported as its own
 *                           problem line rather than throwing.
 *   5. CI                - reports presence/absence of a CI workflow under
 *                           .github/workflows/ as `skip` ALWAYS — informational
 *                           only (CI is --full/optional elsewhere), never a
 *                           hard fail or pass; only the detail text differs.
 *                           An unreadable workflows dir (e.g. EACCES, or a
 *                           TOCTOU delete) still resolves to `skip`.
 *
 * `ok` is true iff no check has status 'fail' (a 'skip' never affects `ok`).
 *
 * verify() never throws — every read that can fail on a broken/corrupt/
 * malformed/unreadable install (a corrupt manifest, an unreadable shim file,
 * a poisoned shimRegions[] entry, a deleted/unreadable core or scaffold
 * path, an unreadable CI workflows dir) is guarded and reported as a `fail`
 * (or, for CI, always a `skip`) check instead of propagating.
 *
 * Node built-ins only.
 *
 * Exported API:
 *   verify(targetRoot) - returns {checks: [{name, status: 'pass'|'fail'|'skip',
 *                         detail}], ok: boolean}
 */

const fs = require('node:fs');
const path = require('node:path');

const manifest = require('./manifest.js');
const shims = require('./shims.js');
const safePath = require('./safe-path.js');

const CORE_FILES = ['principles.md', 'craft-checklist.md', 'rea-schema.md'];
const REA_SCAFFOLD_TYPES = ['knowledge', 'decisions', 'sessions', 'plans'];
const AGENTS_POINTER_BODY = '@AGENTS.md';

/** Appends a {name, status, detail} record to `checks`. Shared shape for every check below. */
function recordCheck(checks, name, status, detail) {
  checks.push({ name, status, detail });
}

/**
 * Checks that every manifest-owned path still exists on disk. Returns
 * {status, detail} for the single 'owned files present' check — a missing
 * path (or one that would resolve outside targetRoot) is its own line inside
 * `detail`, but they all roll up into one check record (mirrors checks 3/4
 * below, which likewise aggregate multiple sub-conditions into one record).
 */
function checkOwnedFilesPresent(targetRoot, owned) {
  const missing = [];
  for (const relPath of owned) {
    let absPath;
    try {
      absPath = safePath.resolveInsideRoot(targetRoot, relPath);
    } catch (err) {
      missing.push(`${relPath} (unresolvable: ${err.message})`);
      continue;
    }
    if (!fs.existsSync(absPath)) {
      missing.push(relPath);
    }
  }

  if (missing.length > 0) {
    return {
      status: 'fail',
      detail: `missing owned file(s):\n- ${missing.join('\n- ')}`,
    };
  }
  return {
    status: 'pass',
    detail: `${owned.length} of ${owned.length} owned file(s) present`,
  };
}

/**
 * Checks the core/ reference trio and the four typed .rea/ scaffold dirs.
 * Returns {status, detail} for the single 'core/ + scaffold' check.
 */
function checkCoreAndScaffold(targetRoot) {
  const missing = [];

  for (const fileName of CORE_FILES) {
    const absPath = path.join(targetRoot, 'core', fileName);
    if (!fs.existsSync(absPath)) {
      missing.push(`core/${fileName}`);
    }
  }

  for (const typeName of REA_SCAFFOLD_TYPES) {
    const absPath = path.join(targetRoot, '.rea', typeName);
    // fs.statSync() can throw if `absPath` is deleted/replaced between the
    // existsSync() check and the stat (a TOCTOU race) — treat any such throw
    // the same as "missing" rather than letting it escape verify().
    let isDir = false;
    try {
      isDir = fs.existsSync(absPath) && fs.statSync(absPath).isDirectory();
    } catch {
      isDir = false;
    }
    if (!isDir) {
      missing.push(`.rea/${typeName}/`);
    }
  }

  if (missing.length > 0) {
    return {
      status: 'fail',
      detail: `missing:\n- ${missing.join('\n- ')}`,
    };
  }
  return {
    status: 'pass',
    detail: 'core/ trio and .rea/{knowledge,decisions,sessions,plans} scaffold all present',
  };
}

/**
 * Returns the raw text between the FIRST well-formed marker pair in
 * `content`, or `null` if either marker is absent (a read-only presence
 * probe — this never needs shims.js's stricter "exactly one pair" write-path
 * validation, since verify() only ever reads). One leading and one trailing
 * `\r?\n` immediately touching a marker is stripped so the returned body has
 * no incidental blank line from the marker's own newline.
 */
function extractManagedBody(content) {
  const startIdx = content.indexOf(shims.MARKER_START);
  const endIdx = content.indexOf(shims.MARKER_END);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    return null;
  }
  let body = content.slice(startIdx + shims.MARKER_START.length, endIdx);
  body = body.replace(/^\r?\n/, '').replace(/\r?\n$/, '');
  return body;
}

/**
 * Validates one markdown-marker shim region (a manifest shimRegions[] entry
 * whose marker is 'readev-tools' — CLAUDE.md or AGENTS.md). Returns `null` when
 * intact, or a human-readable problem string otherwise.
 */
function checkMarkdownShimRegion(targetRoot, relFile) {
  let absPath;
  try {
    absPath = safePath.resolveInsideRoot(targetRoot, relFile);
  } catch (err) {
    return `${relFile}: unresolvable (${err.message})`;
  }
  if (!fs.existsSync(absPath)) {
    return `${relFile}: file is missing`;
  }

  let content;
  try {
    content = fs.readFileSync(absPath, 'utf8');
  } catch (err) {
    // e.g. the path is actually a directory (EISDIR), or became unreadable
    // (EACCES/EBUSY) between the existsSync() check above and this read.
    return `${relFile}: unreadable (${err.message})`;
  }

  const startIdx = content.indexOf(shims.MARKER_START);
  const endIdx = content.indexOf(shims.MARKER_END);
  // Both markers must be present AND correctly ordered — start strictly
  // before end. A file where both literal marker strings are present but
  // REVERSED (end appears before start) is not a valid managed block; this
  // mirrors extractManagedBody's own `endIdx < startIdx -> null` guard below.
  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
    return `${relFile}: managed markers are missing or out of order (readev-tools:start/end)`;
  }

  // The pointer-body check below is only meaningful for a single-line
  // managed body (e.g. CLAUDE.md's "@AGENTS.md" pointer) — it never fires
  // for a multi-line body (e.g. AGENTS.md's own real, multi-line content),
  // which is a documented, accepted limitation of this read-only check: a
  // multi-line managed body's actual CONTENT is never validated, only its
  // marker presence/order above. Guarded by shape (single line), never by
  // hardcoding a filename.
  const body = extractManagedBody(content);
  const trimmedBody = body === null ? null : body.trim();
  const isSingleLine = trimmedBody !== null && !/\r?\n/.test(trimmedBody);
  if (isSingleLine && trimmedBody !== AGENTS_POINTER_BODY) {
    return `${relFile}: managed body is "${trimmedBody}", expected the "${AGENTS_POINTER_BODY}" pointer`;
  }

  return null;
}

/**
 * Validates the Gemini JSON shim region (a manifest shimRegions[] entry
 * whose marker is 'context.fileName' — .gemini/settings.json). Returns
 * `null` when intact, or a human-readable problem string otherwise.
 */
function checkGeminiShimRegion(targetRoot, relFile) {
  let absPath;
  try {
    absPath = safePath.resolveInsideRoot(targetRoot, relFile);
  } catch (err) {
    return `${relFile}: unresolvable (${err.message})`;
  }
  if (!fs.existsSync(absPath)) {
    return `${relFile}: file is missing`;
  }

  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch (err) {
    return `${relFile}: not valid JSON (${err.message})`;
  }

  const fileName = settings && settings.context && settings.context.fileName;
  if (!Array.isArray(fileName) || !fileName.includes('AGENTS.md')) {
    return `${relFile}: context.fileName does not include "AGENTS.md"`;
  }

  return null;
}

/**
 * Checks every manifest shimRegions[] entry, branching per-entry on its
 * recorded `marker` value (never on the filename). Returns {status, detail}
 * for the single 'shims intact' check.
 */
function checkShimsIntact(targetRoot, shimRegions) {
  if (shimRegions.length === 0) {
    return { status: 'pass', detail: 'no shim regions recorded in the manifest' };
  }

  const problems = [];
  for (const region of shimRegions) {
    // Defend against a poisoned manifest (e.g. shimRegions: [null], or an
    // entry missing its file/marker string) — never let a malformed entry
    // throw a TypeError out of verify(); report it as its own problem line
    // instead and move on to the next region.
    if (
      typeof region !== 'object' ||
      region === null ||
      Array.isArray(region) ||
      typeof region.file !== 'string' ||
      typeof region.marker !== 'string'
    ) {
      problems.push('malformed shim region entry in manifest');
      continue;
    }

    let problem;
    if (region.marker === 'context.fileName') {
      problem = checkGeminiShimRegion(targetRoot, region.file);
    } else {
      // Every other recorded marker value is a markdown marker-block shim
      // (currently always 'readev-tools' — CLAUDE.md/AGENTS.md).
      problem = checkMarkdownShimRegion(targetRoot, region.file);
    }
    if (problem) {
      problems.push(problem);
    }
  }

  if (problems.length > 0) {
    return { status: 'fail', detail: `shim problem(s):\n- ${problems.join('\n- ')}` };
  }
  return { status: 'pass', detail: `${shimRegions.length} shim region(s) intact` };
}

/**
 * Reports presence/absence of a CI workflow under .github/workflows/. Always
 * `skip` — informational only, never affects `ok`.
 */
function checkCi(targetRoot) {
  const workflowsDir = path.join(targetRoot, '.github', 'workflows');
  let workflowFile = null;
  try {
    if (fs.existsSync(workflowsDir) && fs.statSync(workflowsDir).isDirectory()) {
      const entries = fs.readdirSync(workflowsDir, { withFileTypes: true });
      const match = entries.find((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name));
      if (match) {
        workflowFile = match.name;
      }
    }
  } catch (err) {
    // CI is ALWAYS informational — an unreadable workflows dir (e.g. EACCES
    // on a mode-000 dir, or a TOCTOU delete between existsSync and the
    // readdirSync) must still resolve to `skip`, never a throw or a fail.
    return {
      status: 'skip',
      detail: `CI workflow dir present but unreadable (${err.message}) — informational only`,
    };
  }

  if (workflowFile) {
    return {
      status: 'skip',
      detail: `CI workflow found: .github/workflows/${workflowFile} (informational only)`,
    };
  }
  return {
    status: 'skip',
    detail: 'no CI workflow found under .github/workflows/ (optional — informational only)',
  };
}

/**
 * Read-only install health check. Returns {checks: [{name, status, detail}],
 * ok}. Writes nothing — opens files but only ever reads them.
 */
function verify(targetRoot) {
  const checks = [];

  const manifestPath = path.join(targetRoot, manifest.MANIFEST_REL_PATH);
  const manifestFileExists = fs.existsSync(manifestPath);

  let loadedManifest;
  try {
    loadedManifest = manifest.load(targetRoot); // missing file -> a well-formed empty manifest
  } catch (err) {
    // manifest.js's documented contract: load() throws a contextual error
    // when the manifest file EXISTS but holds invalid JSON — it only returns
    // an empty manifest for a MISSING file. verify() must never throw, so a
    // corrupt manifest is reported the same way a missing one is: a single
    // fail, then stop immediately (none of the other checks can run without
    // a readable manifest).
    recordCheck(checks, 'manifest present', 'fail', `manifest is corrupted: ${err.message}`);
    return { checks, ok: false };
  }
  const owned = manifest.listOwned(loadedManifest);

  if (!manifestFileExists || owned.length === 0) {
    recordCheck(
      checks,
      'manifest present',
      'fail',
      'not installed — run `npx readev-tools setup`'
    );
    return { checks, ok: false };
  }
  recordCheck(
    checks,
    'manifest present',
    'pass',
    `manifest found at ${manifest.MANIFEST_REL_PATH} with ${owned.length} owned file(s)`
  );

  const ownedResult = checkOwnedFilesPresent(targetRoot, owned);
  recordCheck(checks, 'owned files present', ownedResult.status, ownedResult.detail);

  const coreResult = checkCoreAndScaffold(targetRoot);
  recordCheck(checks, 'core/ + scaffold', coreResult.status, coreResult.detail);

  const shimsResult = checkShimsIntact(targetRoot, loadedManifest.shimRegions);
  recordCheck(checks, 'shims intact', shimsResult.status, shimsResult.detail);

  const ciResult = checkCi(targetRoot);
  recordCheck(checks, 'CI', ciResult.status, ciResult.detail);

  const ok = checks.every((check) => check.status !== 'fail');
  return { checks, ok };
}

module.exports = {
  verify,
};
