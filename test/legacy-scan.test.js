'use strict';

/**
 * test/legacy-scan.test.js — read-only legacy-artifact detector (4d-2)
 *
 * Builds each fixture in its own fresh temp dir (fs.mkdtempSync), cleaned up
 * in a `finally` block — mirrors test/shims.test.js's/test/verify.test.js's
 * house style. Every test also proves scanLegacy() mutates nothing: a
 * before/after byte snapshot of the whole fixture tree must be identical.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const manifest = require('../src/manifest.js');
const shims = require('../src/shims.js');
const { scanLegacy } = require('../src/legacy-scan.js');

// The real rea-tools package root (this repo) — templates/ lives here.
const REPO_ROOT = path.resolve(__dirname, '..');

/** Creates a unique tmp dir under the OS temp dir; returns its absolute path. */
function makeTmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rea-legacy-scan-test-'));
}

/** Writes `content` to `relPath` under `root`, creating parent dirs as needed. */
function writeFile(root, relPath, content) {
  const abs = path.join(root, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
  return abs;
}

/**
 * Recursively snapshots every regular file under `root` as a Map of
 * forward-slash relative path -> raw file bytes (Buffer). Used to prove
 * scanLegacy() writes nothing: a before/after snapshot must be identical both
 * in the set of paths and in every file's bytes. Mirrors
 * test/verify.test.js's snapshotTree() helper.
 */
function snapshotTree(root) {
  const snapshot = new Map();
  (function walk(dirAbs) {
    for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
      const abs = path.join(dirAbs, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.isFile()) {
        snapshot.set(path.relative(root, abs).replace(/\\/g, '/'), fs.readFileSync(abs));
      }
    }
  })(root);
  return snapshot;
}

/** Asserts `after` is byte-identical to `before` (same paths, same bytes). */
function assertUnchanged(before, after) {
  assert.deepEqual([...after.keys()].sort(), [...before.keys()].sort(), 'scanLegacy() must not create or delete any file');
  for (const [relPath, beforeBytes] of before) {
    assert.equal(Buffer.compare(beforeBytes, after.get(relPath)), 0, `${relPath} must be byte-identical after scanLegacy()`);
  }
}

/** Finds the finding whose `kind` equals `kind`, or undefined. */
function findByKind(findings, kind) {
  return findings.find((f) => f.kind === kind);
}

// ---------------------------------------------------------------------------
// Drift guard: CLAUDE_SHIM_PREFIX must never silently diverge from the real
// shipped template's own pre-marker content.
// ---------------------------------------------------------------------------

test('shims.CLAUDE_SHIM_PREFIX matches the actual pre-marker prefix parsed from templates/shims/CLAUDE.md', () => {
  const templateContent = fs.readFileSync(path.join(REPO_ROOT, 'templates', 'shims', 'CLAUDE.md'), 'utf8');
  const markerIdx = templateContent.indexOf(shims.MARKER_START);
  assert.notEqual(markerIdx, -1, 'sanity: the real template has the start marker');
  const actualPrefix = templateContent.slice(0, markerIdx);

  assert.equal(
    shims.CLAUDE_SHIM_PREFIX,
    actualPrefix,
    'CLAUDE_SHIM_PREFIX must be byte-identical to templates/shims/CLAUDE.md\'s real pre-marker content — ' +
      'otherwise src/legacy-scan.js could either miss real legacy CLAUDE.md content or false-positive on a ' +
      'freshly-shimmed one'
  );
});

// ---------------------------------------------------------------------------
// Case (i): a full-legacy fixture (all three artifacts) -> three findings.
// ---------------------------------------------------------------------------

test('scanLegacy(): a full-legacy fixture (old CLAUDE.md body + markers appended, CI workflow, lint hook) -> three findings', () => {
  const targetRoot = makeTmpRoot();
  try {
    // A real old CLAUDE.md body (non-empty prose, NOT the shim preamble) with
    // the managed markers appended AFTER it — exactly what
    // shims.applyMarkerBlock's legacy-append branch (no createPrefix)
    // produces when `setup` is run against a hand-written CLAUDE.md.
    const legacyBody =
      '# Project Rules\n\nAlways use TypeScript strict mode.\nNever commit directly to main.\n';
    const claudeContent = shims.applyMarkerBlock(legacyBody, '@AGENTS.md');
    writeFile(targetRoot, 'CLAUDE.md', claudeContent);
    writeFile(targetRoot, '.github/workflows/claude-review.yml', 'name: claude-review\non: issue_comment\n');
    writeFile(targetRoot, '.claude/hooks/post-tool-use.sh', '#!/bin/sh\necho lint\n');

    const before = snapshotTree(targetRoot);
    const findings = scanLegacy(targetRoot);
    const after = snapshotTree(targetRoot);

    assert.equal(findings.length, 3);

    const claudeFinding = findByKind(findings, 'legacy-claude-md');
    assert.ok(claudeFinding, 'the legacy CLAUDE.md body must be flagged');
    assert.equal(claudeFinding.path, 'CLAUDE.md');
    assert.match(claudeFinding.advice, /AGENTS\.md/);

    const ciFinding = findByKind(findings, 'legacy-ci-workflow');
    assert.ok(ciFinding, 'the legacy CI workflow must be flagged');
    assert.equal(ciFinding.path, '.github/workflows/claude-review.yml');
    assert.match(ciFinding.advice, /@claude/);

    const hookFinding = findByKind(findings, 'legacy-lint-hook');
    assert.ok(hookFinding, 'the legacy lint hook must be flagged');
    assert.equal(hookFinding.path, '.claude/hooks/post-tool-use.sh');
    assert.match(hookFinding.advice, /lint hook/);

    assertUnchanged(before, after);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Case (ii): a clean redesign host (none of the three artifacts) -> [].
// ---------------------------------------------------------------------------

test('scanLegacy(): a clean redesign host (none of the three artifacts present) -> []', () => {
  const targetRoot = makeTmpRoot();
  try {
    const before = snapshotTree(targetRoot);
    const findings = scanLegacy(targetRoot);
    const after = snapshotTree(targetRoot);

    assert.deepEqual(findings, []);
    assertUnchanged(before, after);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Case (iii): a FRESHLY-SHIMMED CLAUDE.md (the canonical preamble note +
// markers + @AGENTS.md, nothing else) -> NO CLAUDE.md finding. This is the
// false-positive the unit closes.
// ---------------------------------------------------------------------------

test('scanLegacy(): a freshly-shimmed CLAUDE.md (canonical preamble + markers only) -> no legacy-claude-md finding', () => {
  const targetRoot = makeTmpRoot();
  try {
    const m = manifest.createEmptyManifest();
    // The exact production path a brand-new host takes: writeShims() against
    // an absent CLAUDE.md creates it via applyMarkerBlock's absent-file
    // (create) branch, prepending shims.CLAUDE_SHIM_PREFIX.
    shims.writeShims(REPO_ROOT, targetRoot, m);

    const claudePath = path.join(targetRoot, 'CLAUDE.md');
    assert.ok(fs.existsSync(claudePath), 'sanity: writeShims created CLAUDE.md');

    const before = snapshotTree(targetRoot);
    const findings = scanLegacy(targetRoot);
    const after = snapshotTree(targetRoot);

    assert.equal(
      findByKind(findings, 'legacy-claude-md'),
      undefined,
      'a freshly-shimmed CLAUDE.md must never be flagged as legacy'
    );

    assertUnchanged(before, after);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Robustness: a freshly-shimmed CLAUDE.md checked out with CRLF line endings
// must still match the canonical preamble (EOL-tolerant comparison) and not
// be flagged.
// ---------------------------------------------------------------------------

test('scanLegacy(): a freshly-shimmed CLAUDE.md re-saved with CRLF line endings -> still no legacy-claude-md finding', () => {
  const targetRoot = makeTmpRoot();
  try {
    const m = manifest.createEmptyManifest();
    shims.writeShims(REPO_ROOT, targetRoot, m);

    const claudePath = path.join(targetRoot, 'CLAUDE.md');
    const original = fs.readFileSync(claudePath, 'utf8');
    const crlf = original.replace(/\n/g, '\r\n');
    assert.notEqual(crlf, original, 'sanity: the file was actually rewritten with CRLF endings');
    fs.writeFileSync(claudePath, crlf, 'utf8');

    const findings = scanLegacy(targetRoot);

    assert.equal(
      findByKind(findings, 'legacy-claude-md'),
      undefined,
      'a CRLF-checkout of a freshly-shimmed CLAUDE.md must still match the canonical preamble'
    );
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Robustness: a full legacy CLAUDE.md with NO markers at all (never shimmed)
// must still be flagged — "before the start marker" is the whole file.
// ---------------------------------------------------------------------------

test('scanLegacy(): a full legacy CLAUDE.md with no markers at all -> flagged (whole file counts as pre-marker content)', () => {
  const targetRoot = makeTmpRoot();
  try {
    writeFile(targetRoot, 'CLAUDE.md', '# Old Rules\n\nDo not use var, use const/let.\n');

    const findings = scanLegacy(targetRoot);

    const claudeFinding = findByKind(findings, 'legacy-claude-md');
    assert.ok(claudeFinding, 'an unmarked, full legacy CLAUDE.md must be flagged');
    assert.equal(claudeFinding.path, 'CLAUDE.md');
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Robustness: an empty CLAUDE.md (no content at all) must not be flagged —
// there is no legacy prose to move anywhere.
// ---------------------------------------------------------------------------

test('scanLegacy(): an empty CLAUDE.md -> no legacy-claude-md finding', () => {
  const targetRoot = makeTmpRoot();
  try {
    writeFile(targetRoot, 'CLAUDE.md', '');

    const findings = scanLegacy(targetRoot);

    assert.equal(findByKind(findings, 'legacy-claude-md'), undefined);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});
