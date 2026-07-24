'use strict';

/**
 * test/migrate.test.js — v0.7.1 -> redesign migration orchestrator (4d-4)
 *
 * Builds each fixture in its own fresh temp dir (fs.mkdtempSync), cleaned up
 * in a `finally` block — mirrors test/setup.test.js's/test/rea-archive.test.js's
 * house style.
 *
 * `migrate` deliberately self-gates on the aggregated outcome of its three
 * sub-checks rather than on `setup.detectLegacyPresent` (see src/migrate.js's
 * module docstring) — the end-to-end test below proves this directly by
 * running the REAL `setup.run()` first (which prunes `.claude/agents/
 * rea-router.md`, the exact file `detectLegacyPresent` looks for) and then
 * asserting `migrate()` still does its real work.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { migrate, formatMigrateReport } = require('../src/migrate.js');

/**
 * Requires the REAL ../src/setup.js, retrying a bounded number of times on a
 * specific transient condition before giving up.
 *
 * test/cli.test.js's withTempSetup()/withoutSetup() helpers briefly mutate
 * the actual src/setup.js FILE ON DISK (deleting it, or overwriting it with
 * a fake stub) to exercise src/cli.js's lazy-load dispatch paths, then
 * restore it in a `finally` block. `node --test <files...>` runs each test
 * FILE as its own OS process (independently verified), but both this file
 * and cli.test.js resolve/read the exact same physical src/setup.js path —
 * so there is a narrow, purely timing-dependent window where this module's
 * top-level require() can observe cli.test.js's process mid-swap: either the
 * file is briefly absent (MODULE_NOT_FOUND) or briefly holds a fake stub
 * (which also exports a `run` function, but one that does nothing real).
 * The swap is always self-correcting — cli.test.js's `finally` blocks
 * guarantee the real file returns within milliseconds — so a short bounded
 * retry recovers deterministically instead of this file failing on a purely
 * transient race that has nothing to do with the code under test here.
 * Uses a real (non-busy) synchronous sleep between attempts. Mirrors
 * test/setup.test.js's requireRealSetupModule() exactly.
 */
function requireRealSetupModule() {
  const maxAttempts = 25;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // require.resolve() itself throws MODULE_NOT_FOUND while cli.test.js
      // has the file deleted — resolved and cache-cleared INSIDE the try so
      // that transient failure is caught by the same retry logic below,
      // rather than escaping uncaught before the loop even starts.
      const setupPath = require.resolve('../src/setup.js');
      delete require.cache[setupPath];
      const mod = require('../src/setup.js');
      // A fake stub from cli.test.js's withTempSetup() also exports a `run`
      // function, so "require() succeeded" alone is not proof this is the
      // real orchestrator — HOST_LAYOUT is only ever exported by the real
      // src/setup.js, never by any of cli.test.js's fake stub bodies.
      if (mod && typeof mod.run === 'function' && mod.HOST_LAYOUT) {
        return mod;
      }
    } catch (e) {
      // Only retry a MODULE_NOT_FOUND for OUR OWN require of setup.js
      // (cli.test.js's withoutSetup() briefly deleting it) — never swallow
      // an unrelated error (e.g. a genuine missing dependency).
      const isOwnRequireMissing = e && e.code === 'MODULE_NOT_FOUND' && /setup\.js/.test(e.message);
      if (!isOwnRequireMissing || attempt === maxAttempts) {
        throw e;
      }
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 15);
  }
  throw new Error('requireRealSetupModule: could not load a well-formed ../src/setup.js after retries');
}

const { run: setupRun } = requireRealSetupModule();

// The real readev-tools package root (this repo) — templates/ and core/ live here.
const REPO_ROOT = path.resolve(__dirname, '..');

/** Creates a unique tmp dir under the OS temp dir; returns its absolute path. */
function makeTmpRoot(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix || 'rea-migrate-test-'));
}

/** Writes `content` to `relPath` under `root`, creating parent dirs as needed. */
function writeFile(root, relPath, content) {
  const abs = path.join(root, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content ?? 'content\n', 'utf8');
  return abs;
}

/**
 * Captures console.log/console.error/console.warn calls made during `fn()`
 * (setup.run() prints the pip-uninstall notice on the legacy bridge) and
 * returns the concatenated output alongside `fn`'s return value.
 */
function captureConsole(fn) {
  const logs = [];
  const origLog = console.log;
  const origError = console.error;
  const origWarn = console.warn;
  console.log = (...args) => logs.push(args.join(' '));
  console.error = (...args) => logs.push(args.join(' '));
  console.warn = (...args) => logs.push(args.join(' '));
  try {
    const result = fn();
    return { result, out: logs.join('\n') };
  } finally {
    console.log = origLog;
    console.error = origError;
    console.warn = origWarn;
  }
}

/**
 * Recursively snapshots every DIRECTORY and FILE under `root`, relative to
 * `root` (forward-slash). Files are captured with their raw bytes. Used to
 * prove a dry run performs NO writes at all — not just "no new files", but
 * no new directories either. Mirrors test/rea-archive.test.js's
 * snapshotTree() helper.
 */
function snapshotTree(root) {
  const dirs = new Set();
  const files = new Map();
  (function walk(dirAbs) {
    for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
      const abs = path.join(dirAbs, entry.name);
      const rel = path.relative(root, abs).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        dirs.add(rel);
        walk(abs);
      } else if (entry.isFile()) {
        files.set(rel, fs.readFileSync(abs));
      }
    }
  })(root);
  return { dirs, files };
}

/** Asserts two snapshotTree() results are byte-for-byte identical. */
function assertSnapshotsEqual(before, after, label) {
  assert.deepEqual([...after.dirs].sort(), [...before.dirs].sort(), `${label}: directory set must be unchanged`);
  assert.deepEqual(
    [...after.files.keys()].sort(),
    [...before.files.keys()].sort(),
    `${label}: file set must be unchanged`
  );
  for (const [relPath, beforeBytes] of before.files) {
    assert.equal(
      Buffer.compare(beforeBytes, after.files.get(relPath)),
      0,
      `${label}: ${relPath} must be byte-identical`
    );
  }
}

/** Finds the finding whose `kind` equals `kind`, or undefined. */
function findByKind(findings, kind) {
  return findings.find((f) => f.kind === kind);
}

/**
 * The exact v0.7.1 settings.json shape: dead router hook + working lint hook
 * + an unrelated key. Mirrors test/settings-surgery.test.js's
 * fixtureWithRouterHook().
 */
function legacySettingsFixture() {
  return {
    permissions: {
      allow: ['pytest*', 'ruff*', 'mypy*', 'pip*', 'rea*'],
    },
    hooks: {
      SessionStart: [
        {
          hooks: [
            {
              type: 'command',
              command: 'cat .claude/agents/rea-router.md',
            },
          ],
        },
      ],
      PostToolUse: [
        {
          matcher: 'Write|Edit',
          hooks: [
            {
              type: 'command',
              command: 'bash .claude/hooks/post-tool-use.sh',
            },
          ],
        },
      ],
    },
  };
}

/**
 * Builds a GENUINE v0.7.1 legacy host under `targetRoot`: a real (non-shim)
 * CLAUDE.md, the dead-router + working-lint settings.json, the legacy lint
 * hook script, the legacy CI review workflow, flat `.rea/log/` +
 * `.rea/lessons.md`, and a retired legacy command file (so `setup`'s
 * one-time bridge fires). Mirrors the plan's "Building the genuine legacy
 * fixture" note.
 */
function buildGenuineLegacyFixture(targetRoot) {
  writeFile(
    targetRoot,
    'CLAUDE.md',
    '# My Old Project\n\n' +
      'These are real legacy project rules, written by hand before the redesign.\n' +
      'Always run the tests before committing. Never touch main directly.\n'
  );
  writeFile(targetRoot, '.claude/settings.json', `${JSON.stringify(legacySettingsFixture(), null, 2)}\n`);
  writeFile(targetRoot, '.claude/hooks/post-tool-use.sh', '#!/bin/bash\nruff check .\n');
  writeFile(
    targetRoot,
    '.github/workflows/claude-review.yml',
    'name: Claude Review\non:\n  issue_comment:\n    types: [created]\n'
  );
  writeFile(targetRoot, '.rea/log/2026-01/x.md', '# legacy session log entry\n');
  writeFile(targetRoot, '.rea/lessons.md', '# legacy lessons\n\n- lesson one\n');
  writeFile(targetRoot, '.claude/commands/rea-commit.md', '# legacy rea-commit command\n');
}

// ---------------------------------------------------------------------------
// Case 1: end-to-end on a GENUINE legacy fixture — setup.run() FIRST, THEN
// migrate() — proves migrate is NOT gated on detectLegacyPresent.
// ---------------------------------------------------------------------------

test('migrate(): after a real setup.run() (which prunes rea-router.md), migrate() still does real work — dead hook gone, lint hook + keys survive, .rea/log+lessons.md archived, typed dirs untouched, report lists findings + reminders', () => {
  const targetRoot = makeTmpRoot();
  try {
    buildGenuineLegacyFixture(targetRoot);

    // Run the REAL setup orchestrator first. This places the redesign set,
    // appends the managed markers to CLAUDE.md, and prunes the retired
    // rea-router.md — the exact file a detectLegacyPresent-style gate would
    // look for. settings.json, .rea/log/, .rea/lessons.md, and CLAUDE.md
    // itself are all prune-protected (src/prune.js's deny-list), and the
    // CI workflow / lint hook script are not readev-tools-managed at all, so
    // every piece migrate() needs to act on survives setup's prune.
    const { result: setupResult } = captureConsole(() =>
      setupRun(targetRoot, { full: false, sourceRoot: REPO_ROOT })
    );
    assert.equal(setupResult.isBridge, true, 'sanity: the legacy bridge must have fired');
    assert.equal(
      fs.existsSync(path.join(targetRoot, '.claude', 'agents', 'rea-router.md')),
      false,
      'sanity: setup must have pruned rea-router.md — the file a detectLegacyPresent-style gate looks for'
    );

    const result = migrate(targetRoot);

    // --- settings.json surgery -----------------------------------------
    const settingsAfter = JSON.parse(fs.readFileSync(path.join(targetRoot, '.claude', 'settings.json'), 'utf8'));
    assert.equal(settingsAfter.hooks.SessionStart, undefined, 'the dead router SessionStart hook must be gone');
    assert.deepEqual(
      settingsAfter.hooks.PostToolUse,
      legacySettingsFixture().hooks.PostToolUse,
      'the working PostToolUse lint hook must survive untouched'
    );
    assert.deepEqual(
      settingsAfter.permissions,
      legacySettingsFixture().permissions,
      'the unrelated permissions key must survive untouched'
    );
    assert.equal(result.changed, true);
    assert.ok(result.removed.length > 0);

    // --- .rea/ archive ----------------------------------------------------
    assert.ok(
      fs.existsSync(path.join(targetRoot, '.rea', '_archive', 'log', '2026-01', 'x.md')),
      'the nested legacy log entry must be archived, preserving structure'
    );
    assert.ok(
      fs.existsSync(path.join(targetRoot, '.rea', '_archive', 'lessons.md')),
      'the legacy lessons.md must be archived'
    );
    assert.equal(
      fs.existsSync(path.join(targetRoot, '.rea', 'log')),
      false,
      'the now-empty legacy .rea/log dir must be cleaned up'
    );
    assert.equal(
      fs.existsSync(path.join(targetRoot, '.rea', 'lessons.md')),
      false,
      'the legacy .rea/lessons.md must be gone from its old location'
    );
    assert.ok(result.moved.includes('.rea/_archive/log/2026-01/x.md'));
    assert.ok(result.moved.includes('.rea/_archive/lessons.md'));
    assert.equal(result.failed.length, 0);
    assert.equal(result.skipped.length, 0);

    // --- typed .rea/ dirs untouched ----------------------------------------
    for (const typeName of ['knowledge', 'decisions', 'sessions', 'plans']) {
      assert.ok(
        fs.existsSync(path.join(targetRoot, '.rea', typeName, 'README.md')),
        `the typed .rea/${typeName}/ scaffold must be untouched`
      );
    }

    // --- read-only legacy scan findings --------------------------------
    assert.ok(findByKind(result.findings, 'legacy-claude-md'), 'must report the legacy CLAUDE.md prose');
    assert.ok(findByKind(result.findings, 'legacy-ci-workflow'), 'must report the legacy CI workflow');
    assert.ok(findByKind(result.findings, 'legacy-lint-hook'), 'must report the legacy lint hook script');

    assert.equal(result.nothingToMigrate, false);

    // --- report content --------------------------------------------------
    const report = formatMigrateReport(result).join('\n');
    assert.match(report, /router hook/i);
    assert.match(report, /CLAUDE\.md/);
    assert.match(report, /claude-review\.yml/);
    assert.match(report, /post-tool-use\.sh/);
    assert.match(report, /AGENTS\.md/);
    assert.match(report, /pip uninstall rea-dev/);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Case 2: dry-run on the same genuine fixture shape — identical result/report,
// but the fixture tree is byte-for-byte unchanged.
// ---------------------------------------------------------------------------

test('migrate(target, {dryRun:true}) computes an identical result/report to a real run, but leaves the fixture tree byte-for-byte unchanged', () => {
  const realRoot = makeTmpRoot();
  const dryRoot = makeTmpRoot();
  try {
    buildGenuineLegacyFixture(realRoot);
    buildGenuineLegacyFixture(dryRoot);

    captureConsole(() => setupRun(realRoot, { full: false, sourceRoot: REPO_ROOT }));
    captureConsole(() => setupRun(dryRoot, { full: false, sourceRoot: REPO_ROOT }));

    const beforeDry = snapshotTree(dryRoot);

    const realResult = migrate(realRoot);
    const dryResult = migrate(dryRoot, { dryRun: true });

    const afterDry = snapshotTree(dryRoot);
    assertSnapshotsEqual(beforeDry, afterDry, 'dry-run fixture tree');

    assert.deepEqual(dryResult, realResult, 'the dry-run result must be structurally identical to the real run');
    assert.deepEqual(
      formatMigrateReport(dryResult),
      formatMigrateReport(realResult),
      'the dry-run report must be identical to the real run report'
    );
  } finally {
    fs.rmSync(realRoot, { recursive: true, force: true });
    fs.rmSync(dryRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Case 3: a clean redesign host (no legacy artifacts) -> nothingToMigrate.
// ---------------------------------------------------------------------------

test('migrate(): a clean redesign host (no legacy artifacts) reports nothingToMigrate: true', () => {
  const targetRoot = makeTmpRoot();
  try {
    captureConsole(() => setupRun(targetRoot, { full: false, sourceRoot: REPO_ROOT }));

    const result = migrate(targetRoot);

    assert.equal(result.changed, false);
    assert.deepEqual(result.moved, []);
    assert.deepEqual(result.failed, []);
    assert.deepEqual(result.skipped, []);
    assert.deepEqual(result.findings, []);
    assert.equal(result.nothingToMigrate, true);

    const report = formatMigrateReport(result).join('\n');
    assert.match(report, /nothing to migrate/i);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Case 4: running migrate twice (real) -> the second run is idempotent.
// ---------------------------------------------------------------------------

test('migrate(): running migrate twice (real) reports nothingToMigrate: true on the second run', () => {
  const targetRoot = makeTmpRoot();
  try {
    // A minimal legacy fixture with only the two MUTATING sub-modules' work
    // (the dead router hook + the legacy .rea/ data) and none of
    // scanLegacy's read-only findings (which are advisory-only and are
    // never resolved by migrate() itself, so a fixture that has them would
    // never converge to "nothing to migrate" on a later run).
    writeFile(targetRoot, '.claude/settings.json', `${JSON.stringify(legacySettingsFixture(), null, 2)}\n`);
    writeFile(targetRoot, '.rea/log/2026-01/x.md', '# legacy session log entry\n');
    writeFile(targetRoot, '.rea/lessons.md', '# legacy lessons\n\n- lesson one\n');

    const firstResult = migrate(targetRoot);
    assert.equal(firstResult.nothingToMigrate, false, 'sanity: the first run must have found real work');

    const secondResult = migrate(targetRoot);
    assert.equal(secondResult.changed, false);
    assert.deepEqual(secondResult.moved, []);
    assert.deepEqual(secondResult.failed, []);
    assert.deepEqual(secondResult.skipped, []);
    assert.deepEqual(secondResult.findings, []);
    assert.equal(secondResult.nothingToMigrate, true, 'the second run must be idempotent — nothing left to migrate');
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});
