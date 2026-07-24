'use strict';

/**
 * src/legacy-scan.js — read-only legacy-artifact detector (4d-2)
 *
 * `scanLegacy(targetRoot)` detects and reports the Claude-specific legacy
 * artifacts a v0.7.1 host may still have lying around, for the `migrate`
 * verb's report (4d-4). It NEVER mutates anything — it only opens files to
 * read them; every finding is advisory ("flag and guide"), never
 * auto-removed/auto-migrated (see plan.md's Decisions table #2/#5).
 *
 * Findings, each `{kind, path, advice}`:
 *   1. 'legacy-claude-md' — an old, full `CLAUDE.md`: the content BEFORE the
 *      managed start marker is non-empty AND is not an EOL/whitespace-
 *      tolerant exact match to `shims.CLAUDE_SHIM_PREFIX` (the fixed note
 *      `writeShims` itself prepends when it CREATES a brand-new CLAUDE.md).
 *      Comparing against that single source of truth (rather than
 *      re-deriving it here) is what avoids the false-positive: a freshly-
 *      `setup`-created CLAUDE.md legitimately carries that exact preamble
 *      above the markers (`shims.applyMarkerBlock`'s absent-file branch
 *      prepends `createPrefix`; the legacy-append branch, used when a file
 *      already exists with no markers, does not), so it must never be
 *      flagged as legacy. "Before the start marker" = the WHOLE file when
 *      there is no start marker at all (a full legacy CLAUDE.md, unmarked).
 *   2. 'legacy-ci-workflow' — `.github/workflows/claude-review.yml` present.
 *   3. 'legacy-lint-hook' — `.claude/hooks/post-tool-use.sh` present.
 *
 * A finding whose underlying file cannot be read (e.g. a TOCTOU delete, or an
 * unreadable/EISDIR path) is treated as "nothing to report" for that check
 * rather than throwing — scanLegacy() never throws on a broken/unreadable
 * host.
 *
 * Node built-ins only.
 *
 * Exported API:
 *   scanLegacy(targetRoot) - returns Finding[] ({kind, path, advice}[]),
 *                            possibly empty. Read-only: writes nothing.
 */

const fs = require('node:fs');
const path = require('node:path');

const shims = require('./shims.js');

/** Builds one `{kind, path, advice}` finding record. Shared shape for every check below. */
function makeFinding(kind, relPath, advice) {
  return { kind, path: relPath, advice };
}

/**
 * Normalizes text for an EOL/whitespace-tolerant comparison: `\r\n` -> `\n`,
 * trailing whitespace stripped from every line, then the whole result
 * trimmed. Used to compare a host's CLAUDE.md pre-marker content against
 * `shims.CLAUDE_SHIM_PREFIX` without a CRLF checkout (or incidental trailing
 * spaces) causing a false "this is legacy content" positive.
 */
function normalizeForCompare(str) {
  return str
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .trim();
}

/**
 * Checks for an old, full CLAUDE.md whose pre-marker content is real legacy
 * prose rather than the shim's own canonical preamble note. Returns a single
 * finding, or `null` when the file is absent, unreadable, has no pre-marker
 * content, or that content matches the canonical preamble (EOL/whitespace-
 * tolerant).
 */
function scanClaudeMd(targetRoot) {
  const claudePath = path.join(targetRoot, 'CLAUDE.md');
  if (!fs.existsSync(claudePath)) {
    return null;
  }

  let content;
  try {
    content = fs.readFileSync(claudePath, 'utf8');
  } catch {
    return null; // unreadable (e.g. TOCTOU delete, EISDIR): nothing to report
  }

  const startIdx = content.indexOf(shims.MARKER_START);
  // No start marker at all -> the WHOLE file is "pre-marker content" (a full
  // legacy CLAUDE.md with no managed markers yet).
  const preMarkerContent = startIdx === -1 ? content : content.slice(0, startIdx);

  if (normalizeForCompare(preMarkerContent).length === 0) {
    return null; // nothing before the marker (or an empty file): not legacy
  }

  if (normalizeForCompare(preMarkerContent) === normalizeForCompare(shims.CLAUDE_SHIM_PREFIX)) {
    return null; // exactly the shim's own canonical preamble: freshly shimmed, not legacy
  }

  return makeFinding(
    'legacy-claude-md',
    'CLAUDE.md',
    'once `AGENTS.md` exists, move these project rules into it'
  );
}

/**
 * Checks for a legacy artifact's mere presence on disk. Returns a single
 * finding, or `null` when the path is absent.
 */
function scanPresence(targetRoot, relPath, kind, advice) {
  const absPath = path.join(targetRoot, relPath);
  if (!fs.existsSync(absPath)) {
    return null;
  }
  return makeFinding(kind, relPath, advice);
}

/**
 * Read-only legacy-artifact scan. Returns a `Finding[]` (possibly empty).
 * Mutates nothing — every check only ever reads/stats the filesystem.
 */
function scanLegacy(targetRoot) {
  const findings = [];

  const claudeFinding = scanClaudeMd(targetRoot);
  if (claudeFinding) {
    findings.push(claudeFinding);
  }

  const ciFinding = scanPresence(
    targetRoot,
    '.github/workflows/claude-review.yml',
    'legacy-ci-workflow',
    "legacy `@claude` review action — remove or replace with your CI's review"
  );
  if (ciFinding) {
    findings.push(ciFinding);
  }

  const hookFinding = scanPresence(
    targetRoot,
    '.claude/hooks/post-tool-use.sh',
    'legacy-lint-hook',
    'legacy REA lint hook — REA no longer manages it; keep or remove'
  );
  if (hookFinding) {
    findings.push(hookFinding);
  }

  return findings;
}

module.exports = {
  scanLegacy,
};
