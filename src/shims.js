'use strict';

/**
 * src/shims.js — G6b shim writer (never blind-overwrite)
 *
 * Writes the per-tool "shim" files that point an AI coding tool at
 * AGENTS.md — the single, tool-agnostic behaviour + memory file — without
 * ever destroying content a human (or another tool) wrote into those files.
 *
 * The contract (core/rea-schema.md, "Shim write semantics"):
 *   - Markdown shims (AGENTS.md, CLAUDE.md) are written INSIDE managed
 *     markers (`<!-- readev-tools:start -->` ... `<!-- readev-tools:end -->`):
 *       - exactly one well-formed start/end pair -> replace ONLY the region
 *         between them.
 *       - no markers at all, file exists (hand-written/legacy) -> APPEND the
 *         managed block at the end; existing content is never rewritten.
 *       - file absent -> create it with the managed block (CLAUDE.md also
 *         gets the fixed one-line note above the markers).
 *       - any OTHER marker count (an orphan start with no end, an orphan
 *         end with no start, or more than one of either) -> refuse to
 *         write and throw a contextual error naming the file; never guess.
 *     Marker matching tolerates `\r?\n` so a CRLF-edited file still matches,
 *     and the block written out reuses the dominant line-ending style
 *     (CRLF vs LF) already present in the file, so a CRLF file never ends
 *     up with mixed line endings. A brand-new file defaults to `\n`.
 *   - The JSON shim (.gemini/settings.json) uses a structured
 *     read-modify-write merge: only `context.fileName` is added/updated,
 *     every other key (top-level or inside `context`) is preserved as
 *     found. REA never reads or writes a GEMINI.md file. The fixed
 *     `['AGENTS.md', 'GEMINI.md']` pair is hard-coded in this module (it is
 *     not read from `templates/shims/gemini-settings.json` at runtime —
 *     that file exists only as human-readable documentation of the shape).
 *     Because this file is MERGED into (never fully owned the way a
 *     managed-block file is), it is tracked via a manifest shimRegion, not
 *     `ownedFiles` — recording it as owned would make it eligible for
 *     prune's blind-delete path and could destroy the user's other Gemini
 *     settings.
 *
 * The canonical managed content for the markdown shims is not hard-coded
 * here: it is read from the shipped template files (`templates/AGENTS.md`,
 * `templates/shims/CLAUDE.md`) under `sourceRoot`, so the templates stay
 * the single source of truth.
 *
 * Every write is contained inside `targetRoot` — via the shared, realpath-
 * aware `src/safe-path.js#resolveInsideRoot` guard, which refuses to resolve
 * outside it even when an in-root path component is itself a symlink/
 * junction pointing elsewhere — and every write is recorded in the ownership
 * manifest (src/manifest.js) so later runs (place/prune) know which
 * files/regions readev-tools owns.
 *
 * Node built-ins only.
 *
 * Exported API:
 *   MARKER_START, MARKER_END              - the literal marker comment strings
 *   applyMarkerBlock(existingContent, managedBody, [options]) - pure function;
 *                                            returns the new full file content
 *                                            per the replace/append/create rules
 *                                            above, reusing the existing file's
 *                                            dominant EOL style. `existingContent`
 *                                            is `null`/`undefined` for an absent
 *                                            file. `options.createPrefix`
 *                                            (default '') is prepended only in
 *                                            the absent-file (create) case.
 *                                            `options.fileLabel` (default 'the
 *                                            file') names the file in the error
 *                                            thrown for an ambiguous marker
 *                                            count. Throws if `existingContent`
 *                                            has any marker count other than
 *                                            "one well-formed pair" or "none".
 *   mergeGeminiSettings(existingSettings)  - pure function; returns a new settings
 *                                            object with `context.fileName` set to
 *                                            ['AGENTS.md', 'GEMINI.md'], every other
 *                                            key (top-level or inside `context`)
 *                                            preserved. `existingSettings` may be
 *                                            null/undefined (missing file).
 *   writeShims(sourceRoot, targetRoot, manifest) - writes CLAUDE.md, AGENTS.md and
 *                                            .gemini/settings.json under targetRoot
 *                                            using the templates under sourceRoot,
 *                                            recording each write in `manifest`.
 *   CLAUDE_SHIM_PREFIX                     - the literal one-line note text this
 *                                            module prepends above the managed
 *                                            markers when CREATING a brand-new
 *                                            CLAUDE.md (the `createPrefix` passed
 *                                            to `applyMarkerBlock` for CLAUDE.md in
 *                                            `writeShims`), kept as a hard-coded
 *                                            constant here — the single source of
 *                                            truth other modules (src/legacy-scan.js)
 *                                            compare a host's existing CLAUDE.md
 *                                            pre-marker content against, to avoid
 *                                            mistaking a freshly-shimmed CLAUDE.md
 *                                            for a legacy one. Kept in sync with
 *                                            `templates/shims/CLAUDE.md` by a
 *                                            drift-guard test (test/legacy-scan.test.js),
 *                                            not read from disk at require-time.
 */

const fs = require('node:fs');
const path = require('node:path');

const manifest = require('./manifest');
const safePath = require('./safe-path');

const MARKER_START = '<!-- readev-tools:start -->';
const MARKER_END = '<!-- readev-tools:end -->';

/**
 * The literal prefix text this module prepends above the managed markers when
 * CREATING a brand-new CLAUDE.md (see `writeShims`'s `claudeTemplate.prefix`,
 * itself parsed from `templates/shims/CLAUDE.md`). Hard-coded here (not read
 * from disk) so it is available as a plain constant to callers that only want
 * to compare against it (src/legacy-scan.js) without needing a `sourceRoot`.
 * A drift-guard test (test/legacy-scan.test.js) asserts this stays
 * byte-identical to the real template's own pre-marker content, so the two
 * can never silently diverge.
 */
const CLAUDE_SHIM_PREFIX =
  '# CLAUDE.md\n' +
  '\n' +
  'This project uses [`AGENTS.md`](AGENTS.md) as its single source of behaviour and memory\n' +
  'instructions. Content you add outside the managed markers below is yours to keep — a re-init or\n' +
  'update only touches the managed region.\n' +
  '\n';

// Matches the full marker pair (start marker, tolerant interior newline, body,
// tolerant interior newline, end marker), tolerant of CRLF line endings.
// Non-greedy so a file with a stray second start marker still stops at the
// first end marker.
const MARKER_BLOCK_RE = new RegExp(
  `${escapeRegExp(MARKER_START)}\\r?\\n[\\s\\S]*?\\r?\\n${escapeRegExp(MARKER_END)}`
);

// The label recorded in the manifest's shimRegions for every markdown shim
// written by this module.
const SHIM_MARKER_LABEL = 'readev-tools';

// The label recorded in the manifest's shimRegions for the Gemini JSON shim
// (it is tracked as a shim region, never as an owned/deletable file — see
// the module docstring's "Shim write semantics" section).
const GEMINI_SHIM_MARKER_LABEL = 'context.fileName';

function escapeRegExp(literal) {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Returns the number of non-overlapping occurrences of `literal` in `str`. */
function countOccurrences(str, literal) {
  let count = 0;
  let idx = str.indexOf(literal);
  while (idx !== -1) {
    count += 1;
    idx = str.indexOf(literal, idx + literal.length);
  }
  return count;
}

/**
 * Returns the dominant EOL style (`'\r\n'` or `'\n'`) found in `content`, by
 * counting `\r\n` pairs against bare `\n` occurrences. Empty/absent content
 * defaults to `'\n'`. Ties (equal counts, including zero-and-zero) default to
 * `'\n'` as well.
 */
function detectEol(content) {
  if (!content) {
    return '\n';
  }
  let crlfCount = 0;
  let lfCount = 0;
  const eolRe = /\r\n|\n/g;
  let match = eolRe.exec(content);
  while (match !== null) {
    if (match[0] === '\r\n') {
      crlfCount += 1;
    } else {
      lfCount += 1;
    }
    match = eolRe.exec(content);
  }
  return crlfCount > lfCount ? '\r\n' : '\n';
}

/** Rewrites every line ending in `str` (`\r\n` or bare `\n`) to `eol`. */
function normalizeEol(str, eol) {
  return str.replace(/\r\n|\n/g, eol);
}

/**
 * Builds the marker pair wrapping `managedBody`, with NO trailing newline.
 * `managedBody`'s own internal line endings are normalized to `eol` so the
 * block never introduces a line-ending style different from the rest of the
 * file it is written/appended into.
 */
function buildBlockCore(managedBody, eol) {
  return `${MARKER_START}${eol}${normalizeEol(managedBody, eol)}${eol}${MARKER_END}`;
}

/**
 * Pure function implementing the never-blind-overwrite contract for a single
 * markdown shim file.
 *
 * - `existingContent` is `null`/`undefined` for an absent file -> the file is
 *   created as `options.createPrefix` (default '') followed by the managed
 *   block, using `\n` line endings.
 * - `existingContent` contains exactly one well-formed start/end marker pair
 *   -> only that region is replaced; everything before/after it is preserved
 *   untouched, and the written block reuses the file's dominant EOL style.
 * - `existingContent` exists but has NO markers at all -> the managed block
 *   is appended at the end, using the file's dominant EOL style; existing
 *   content is preserved untouched.
 * - `existingContent` has any OTHER marker count (an orphan start with no
 *   end, an orphan end with no start, or more than one of either) -> the
 *   marker state is ambiguous and could cause content loss on a
 *   replace/append; this function refuses to guess and throws instead.
 */
function applyMarkerBlock(existingContent, managedBody, options = {}) {
  if (existingContent === null || existingContent === undefined) {
    const eol = '\n';
    const prefix = options.createPrefix || '';
    return `${prefix}${buildBlockCore(managedBody, eol)}${eol}`;
  }

  const startCount = countOccurrences(existingContent, MARKER_START);
  const endCount = countOccurrences(existingContent, MARKER_END);
  const eol = detectEol(existingContent);

  if (startCount === 1 && endCount === 1 && MARKER_BLOCK_RE.test(existingContent)) {
    return existingContent.replace(MARKER_BLOCK_RE, buildBlockCore(managedBody, eol));
  }

  if (startCount === 0 && endCount === 0) {
    const blockCore = buildBlockCore(managedBody, eol);
    if (existingContent.length === 0) {
      return `${blockCore}${eol}`;
    }
    let base = existingContent;
    if (!/\r?\n$/.test(base)) {
      base += eol;
    }
    base += eol; // blank-line separator before the appended block
    return `${base}${blockCore}${eol}`;
  }

  const label = options.fileLabel || 'the file';
  throw new Error(
    `Ambiguous readev-tools managed markers in ${label}: found ${startCount} start marker(s) ` +
      `(${MARKER_START}) and ${endCount} end marker(s) (${MARKER_END}); expected exactly one ` +
      'matching pair, or none. Refusing to write automatically to avoid corrupting or losing ' +
      'existing content — please resolve the markers in this file manually.'
  );
}

/**
 * Returns true if `value` is a plain object — `typeof value === 'object'`,
 * non-null, and NOT an array. Guards `mergeGeminiSettings` (and its context
 * sub-object check) against `typeof [] === 'object'` treating an array as
 * spreadable settings, which would scatter it into numeric-key properties
 * instead of being reset to `{}`.
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Pure function: returns a NEW settings object with `context.fileName` set
 * to `['AGENTS.md', 'GEMINI.md']`, preserving every other key — top-level or
 * nested inside `context` — exactly as found. `existingSettings` may be
 * null/undefined (missing/empty file) or a non-plain-object (e.g. an array),
 * in which case it is treated as `{}`.
 */
function mergeGeminiSettings(existingSettings) {
  const base = isPlainObject(existingSettings) ? existingSettings : {};
  const existingContext = isPlainObject(base.context) ? base.context : {};

  return {
    ...base,
    context: {
      ...existingContext,
      fileName: ['AGENTS.md', 'GEMINI.md'],
    },
  };
}

/**
 * Splits a marker-wrapped template file's content into `{ prefix, body }`:
 * `prefix` is everything before the start marker (e.g. CLAUDE.md's one-line
 * note); `body` is the interior content between the markers (no leading/
 * trailing newline). Throws if the template has no marker pair — a
 * malformed template is a bug in the shipped templates, not a recoverable
 * runtime condition.
 */
function parseTemplate(content, sourcePath) {
  const match = content.match(MARKER_BLOCK_RE);
  if (!match) {
    throw new Error(`Expected managed markers (${MARKER_START} ... ${MARKER_END}) in template file: ${sourcePath}`);
  }
  const prefix = content.slice(0, match.index);
  const body = match[0]
    .replace(new RegExp(`^${escapeRegExp(MARKER_START)}\\r?\\n`), '')
    .replace(new RegExp(`\\r?\\n${escapeRegExp(MARKER_END)}$`), '');
  return { prefix, body };
}

/**
 * Writes one markdown shim file under targetRoot, applying the marker-block
 * contract. Throws (via `applyMarkerBlock`) if the existing file has an
 * ambiguous marker count instead of writing/corrupting it.
 */
function writeMarkdownShim(targetRoot, relFile, managedBody, createPrefix, manifestObj) {
  const destPath = safePath.resolveInsideRoot(targetRoot, relFile);
  const existingContent = fs.existsSync(destPath) ? fs.readFileSync(destPath, 'utf8') : null;

  const newContent = applyMarkerBlock(existingContent, managedBody, { createPrefix, fileLabel: relFile });

  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, newContent, 'utf8');

  if (manifestObj) {
    manifest.recordShimRegion(manifestObj, manifest.normalizeRelPath(destPath, targetRoot), SHIM_MARKER_LABEL);
  }
}

/**
 * Writes the .gemini/settings.json shim under targetRoot, merging in
 * context.fileName. This file is a USER file readev-tools only ever merges a
 * key into — it is recorded as a manifest shimRegion, NEVER as an owned
 * file, so prune's blind-delete-when-no-longer-owned path can never target
 * it (see the module docstring's "Shim write semantics" section).
 */
function writeGeminiShim(targetRoot, relFile, manifestObj) {
  const destPath = safePath.resolveInsideRoot(targetRoot, relFile);

  let existingSettings = {};
  if (fs.existsSync(destPath)) {
    const raw = fs.readFileSync(destPath, 'utf8');
    if (raw.trim().length > 0) {
      try {
        existingSettings = JSON.parse(raw);
      } catch (err) {
        throw new Error(`Existing Gemini settings file is not valid JSON: ${destPath}: ${err.message}`);
      }
    }
  }

  const merged = mergeGeminiSettings(existingSettings);

  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');

  if (manifestObj) {
    manifest.recordShimRegion(
      manifestObj,
      manifest.normalizeRelPath(destPath, targetRoot),
      GEMINI_SHIM_MARKER_LABEL
    );
  }
}

/**
 * Writes all shims (CLAUDE.md, AGENTS.md, .gemini/settings.json) under
 * `targetRoot`. The markdown shims' managed content is read from the
 * canonical templates under `sourceRoot` (`templates/AGENTS.md`,
 * `templates/shims/CLAUDE.md`); the Gemini JSON shim's `context.fileName`
 * pair is fixed in code (see `mergeGeminiSettings`), not read from a
 * template. Records every write in `manifest` (src/manifest.js). Safe to
 * call repeatedly (idempotent) and never destroys content it does not own.
 */
function writeShims(sourceRoot, targetRoot, manifestObj) {
  const agentsTemplatePath = path.join(sourceRoot, 'templates', 'AGENTS.md');
  const agentsTemplate = parseTemplate(fs.readFileSync(agentsTemplatePath, 'utf8'), agentsTemplatePath);
  writeMarkdownShim(targetRoot, 'AGENTS.md', agentsTemplate.body, agentsTemplate.prefix, manifestObj);

  const claudeTemplatePath = path.join(sourceRoot, 'templates', 'shims', 'CLAUDE.md');
  const claudeTemplate = parseTemplate(fs.readFileSync(claudeTemplatePath, 'utf8'), claudeTemplatePath);
  writeMarkdownShim(targetRoot, 'CLAUDE.md', claudeTemplate.body, claudeTemplate.prefix, manifestObj);

  writeGeminiShim(targetRoot, '.gemini/settings.json', manifestObj);
}

module.exports = {
  MARKER_START,
  MARKER_END,
  CLAUDE_SHIM_PREFIX,
  applyMarkerBlock,
  // Exported so verify.js can apply this module's own "exactly one pair"
  // rule when reporting on a managed file, instead of keeping a second copy
  // of the counting logic that could drift from the write path's.
  countOccurrences,
  mergeGeminiSettings,
  writeShims,
};
