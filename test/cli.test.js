'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const cliModule = require('../src/cli.js');
const manifest = require('../src/manifest.js');
const { place } = require('../src/place.js');
const { writeShims } = require('../src/shims.js');

// The real readev-tools package root (this repo) — templates/ and core/ live here.
// Used by buildHealthyFixture() below to build a genuine install for the
// `verify` dispatch tests (mirrors test/verify.test.js's own fixture builder).
const REPO_ROOT = path.resolve(__dirname, '..');

const SETUP_PATH = path.join(__dirname, '..', 'src', 'setup.js');
const VERIFY_PATH = path.join(__dirname, '..', 'src', 'verify.js');
const MIGRATE_PATH = path.join(__dirname, '..', 'src', 'migrate.js');

// The real src/setup.js (the orchestrator this file dispatches to once
// present — lands in unit 4b-6) may or may not exist on disk depending on
// when this suite runs. Captured once so every helper below restores
// exactly this on-disk state afterward, instead of assuming "absent".
const REAL_SETUP_EXISTED = fs.existsSync(SETUP_PATH);
const REAL_SETUP_CONTENT = REAL_SETUP_EXISTED ? fs.readFileSync(SETUP_PATH, 'utf8') : null;

// Same capture, for src/verify.js (the read-only health check this file
// dispatches to once present — lands in unit 4c-1, already on disk by the
// time 4c-2 runs). Captured once so withoutVerify() below restores exactly
// this on-disk state afterward.
const REAL_VERIFY_EXISTED = fs.existsSync(VERIFY_PATH);
const REAL_VERIFY_CONTENT = REAL_VERIFY_EXISTED ? fs.readFileSync(VERIFY_PATH, 'utf8') : null;

// Same capture, for src/migrate.js (the v0.7.1 -> redesign migration
// orchestrator this file dispatches to once present — lands in unit 4d-4).
// Captured once so withoutMigrate() below restores exactly this on-disk
// state afterward.
const REAL_MIGRATE_EXISTED = fs.existsSync(MIGRATE_PATH);
const REAL_MIGRATE_CONTENT = REAL_MIGRATE_EXISTED ? fs.readFileSync(MIGRATE_PATH, 'utf8') : null;

/**
 * Writes a temporary src/setup.js with `contents`, runs `fn()`, then always
 * restores whatever was on disk before this call (the real setup.js if one
 * exists, otherwise removes the temp file entirely) — even if `fn()` throws
 * — so no test leaves a stray or corrupted src/setup.js behind.
 */
function withTempSetup(contents, fn) {
  // Clear the require cache BEFORE writing the fake contents (mirrors
  // withoutSetup's ordering below) so the injected fake is guaranteed to
  // take effect regardless of whether a prior test already required
  // src/setup.js — a cache entry present at the time of the write would
  // otherwise let a stale (previously cached) module survive the write.
  // Keyed directly off SETUP_PATH (rather than require.resolve, which
  // throws if src/setup.js does not exist on disk yet) so this is safe even
  // when REAL_SETUP_EXISTED is false and no file is present at this point.
  delete require.cache[SETUP_PATH];
  fs.writeFileSync(SETUP_PATH, contents);
  try {
    fn();
  } finally {
    delete require.cache[require.resolve('../src/setup.js')];
    if (REAL_SETUP_EXISTED) {
      fs.writeFileSync(SETUP_PATH, REAL_SETUP_CONTENT);
    } else {
      fs.unlinkSync(SETUP_PATH);
    }
  }
}

/**
 * Writes a temporary src/migrate.js with `contents`, runs `fn()`, then always
 * restores whatever was on disk before this call — even if `fn()` throws.
 * Mirrors withTempSetup() above exactly, keyed off MIGRATE_PATH/
 * REAL_MIGRATE_EXISTED/REAL_MIGRATE_CONTENT instead.
 */
function withTempMigrate(contents, fn) {
  delete require.cache[MIGRATE_PATH];
  fs.writeFileSync(MIGRATE_PATH, contents);
  try {
    fn();
  } finally {
    delete require.cache[require.resolve('../src/migrate.js')];
    if (REAL_MIGRATE_EXISTED) {
      fs.writeFileSync(MIGRATE_PATH, REAL_MIGRATE_CONTENT);
    } else {
      fs.unlinkSync(MIGRATE_PATH);
    }
  }
}

/**
 * Temporarily removes the real src/setup.js (if present) for the duration
 * of `fn()`, then restores it — even if `fn()` throws. Lets a test exercise
 * the "setup.js absent" lazy-load-guard path in src/cli.js without ever
 * permanently deleting the real orchestrator, and without ever letting a
 * REAL run() execute against this test process's cwd (a present setup.js
 * would otherwise place/shim/prune real files there).
 */
function withoutSetup(fn) {
  if (!REAL_SETUP_EXISTED) {
    fn();
    return;
  }
  delete require.cache[require.resolve('../src/setup.js')];
  fs.unlinkSync(SETUP_PATH);
  try {
    fn();
  } finally {
    fs.writeFileSync(SETUP_PATH, REAL_SETUP_CONTENT);
  }
}

/**
 * Temporarily removes the real src/verify.js (if present) for the duration of
 * `fn()`, then ALWAYS restores it — even if `fn()` throws. Mirrors
 * withoutSetup() above exactly. Unlike withoutSetup, there is no "must not
 * run a real write against cwd" hazard here — verify() is read-only — but the
 * restore-in-finally discipline still matters: test/verify.test.js runs in a
 * separate process and requires the real module, and `--test-concurrency=1`
 * only makes this safe if src/verify.js is never left deleted on disk.
 */
function withoutVerify(fn) {
  if (!REAL_VERIFY_EXISTED) {
    fn();
    return;
  }
  delete require.cache[require.resolve('../src/verify.js')];
  fs.unlinkSync(VERIFY_PATH);
  try {
    fn();
  } finally {
    fs.writeFileSync(VERIFY_PATH, REAL_VERIFY_CONTENT);
  }
}

/**
 * Temporarily removes the real src/migrate.js (if present) for the duration
 * of `fn()`, then ALWAYS restores it — even if `fn()` throws. Mirrors
 * withoutVerify() above exactly: migrate()'s own mutations are already
 * covered by test/migrate.test.js; this only proves cli.js's lazy-load
 * degrade path for the `migrate` verb.
 */
function withoutMigrate(fn) {
  if (!REAL_MIGRATE_EXISTED) {
    fn();
    return;
  }
  delete require.cache[require.resolve('../src/migrate.js')];
  fs.unlinkSync(MIGRATE_PATH);
  try {
    fn();
  } finally {
    fs.writeFileSync(MIGRATE_PATH, REAL_MIGRATE_CONTENT);
  }
}

/** Creates a unique tmp dir under the OS temp dir; returns its absolute path. */
function makeTmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rea-cli-verify-test-'));
}

/**
 * Builds a genuine healthy install into a fresh temp host — place() the real
 * templates, writeShims(), then manifest.save() — mirroring
 * test/verify.test.js's buildHealthyFixture(). Returns the temp host's
 * absolute path; callers are responsible for fs.rmSync()-ing it afterward.
 */
function buildHealthyFixture() {
  const targetRoot = makeTmpRoot();
  const m = manifest.createEmptyManifest();
  place(REPO_ROOT, targetRoot, m);
  writeShims(REPO_ROOT, targetRoot, m);
  manifest.save(targetRoot, m);
  return targetRoot;
}

/**
 * Builds a MINIMAL legacy fixture for the `migrate` verb's cli() dispatch
 * tests: just enough for migrate() to do real work (a dead SessionStart
 * router hook + a PostToolUse lint hook + an unrelated key in
 * `.claude/settings.json`, plus a legacy `.rea/lessons.md`) — mirrors
 * test/settings-surgery.test.js's/test/migrate.test.js's own fixture shape,
 * pared down since these tests only exercise cli()'s dispatch wiring
 * (parseArgs -> DISPATCH.migrate -> handleMigrate -> migrate()), not
 * migrate()'s own logic (already covered end-to-end by test/migrate.test.js).
 * Returns the temp host's absolute path; callers are responsible for
 * fs.rmSync()-ing it afterward.
 */
function buildMigrateFixture() {
  const targetRoot = makeTmpRoot();
  const settingsPath = path.join(targetRoot, '.claude', 'settings.json');
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(
    settingsPath,
    `${JSON.stringify(
      {
        permissions: { allow: ['pytest*'] },
        hooks: {
          SessionStart: [
            { hooks: [{ type: 'command', command: 'cat .claude/agents/rea-router.md' }] },
          ],
          PostToolUse: [
            {
              matcher: 'Write|Edit',
              hooks: [{ type: 'command', command: 'bash .claude/hooks/post-tool-use.sh' }],
            },
          ],
        },
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  const lessonsPath = path.join(targetRoot, '.rea', 'lessons.md');
  fs.mkdirSync(path.dirname(lessonsPath), { recursive: true });
  fs.writeFileSync(lessonsPath, '# legacy lessons\n\n- lesson one\n', 'utf8');
  return targetRoot;
}

/**
 * Recursively snapshots every DIRECTORY and FILE under `root`, relative to
 * `root` (forward-slash). Files are captured with their raw bytes. Used to
 * prove `migrate --dry-run` reaches migrate() and performs NO writes at all
 * — not just "no new files", but no new directories either (e.g. no stray
 * `.rea/_archive/`). Mirrors test/migrate.test.js's own snapshotTree()
 * helper.
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

/**
 * Captures console.log/console.error calls made during `fn()` and returns
 * the concatenated output alongside `fn`'s return value.
 */
function captureConsole(fn) {
  const logs = [];
  const errors = [];
  const origLog = console.log;
  const origError = console.error;
  console.log = (...args) => logs.push(args.join(' '));
  console.error = (...args) => errors.push(args.join(' '));
  try {
    const result = fn();
    return { result, out: logs.join('\n'), err: errors.join('\n') };
  } finally {
    console.log = origLog;
    console.error = origError;
  }
}

test('parseArgs(["setup", "/tmp/x"]) resolves verb=setup, target=/tmp/x, dryRun=false', () => {
  const parsed = cliModule.parseArgs(['setup', '/tmp/x']);
  assert.deepEqual(parsed, { verb: 'setup', target: '/tmp/x', dryRun: false });
});

test('parseArgs(["verify"]) defaults target to process.cwd()', () => {
  const parsed = cliModule.parseArgs(['verify']);
  assert.deepEqual(parsed, { verb: 'verify', target: process.cwd(), dryRun: false });
});

test('parseArgs(["migrate", "/tmp/x", "--dry-run"]) resolves dryRun=true', () => {
  const parsed = cliModule.parseArgs(['migrate', '/tmp/x', '--dry-run']);
  assert.deepEqual(parsed, { verb: 'migrate', target: '/tmp/x', dryRun: true });
});

test('cli(["verify", "."]) with verify.js absent prints the graceful stub and returns 0', () => {
  // Proves the lazy-load guard for `verify`, mirroring the existing setup
  // guard test below: when src/verify.js cannot be resolved, `verify` must
  // degrade gracefully rather than crash. Runs BEFORE the two real-dispatch
  // tests below, but this is now belt-and-suspenders, not load-bearing: FIX H
  // (lazyLoadModule's ENOENT-at-the-resolved-path guard) makes this degrade
  // order-independent — see the dedicated regression test below, which
  // reproduces this exact scenario deliberately AFTER a real dispatch has
  // already resolved './verify' once.
  withoutVerify(() => {
    const { result, out } = captureConsole(() => cliModule.cli(['verify', '.']));
    assert.equal(result, 0);
    assert.match(out, /later release/i);
  });
});

test('cli(["verify", healthyFixture]) dispatches to the real verify(), prints a per-check report, and returns 0', () => {
  const targetRoot = buildHealthyFixture();
  try {
    const { result, out } = captureConsole(() => cliModule.cli(['verify', targetRoot]));
    assert.equal(result, 0);
    assert.match(out, /PASS|FAIL|SKIP/, 'report must render at least one per-check status line');
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('cli(["verify", "."]) with verify.js absent still degrades gracefully even AFTER a real dispatch already resolved "./verify" once (order-independence regression)', () => {
  // Reproduces the exact scenario FIX H closes: Node's module-resolution path
  // cache (populated by require.resolve, never cleared by
  // `delete require.cache[...]`) would otherwise keep returning the stale
  // resolved path for './verify' after this first real dispatch below — so a
  // LATER require.resolve('./verify') inside withoutVerify() would still
  // "succeed" against the cache, fall through to require(relName), and throw
  // ENOENT instead of degrading. Before FIX H, this test failed (ENOENT
  // propagated instead of the graceful placeholder); it must pass now
  // regardless of test order.
  const targetRoot = buildHealthyFixture();
  try {
    const first = captureConsole(() => cliModule.cli(['verify', targetRoot]));
    assert.equal(first.result, 0, 'sanity: the real dispatch above must have resolved "./verify" successfully');
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }

  withoutVerify(() => {
    const { result, out } = captureConsole(() => cliModule.cli(['verify', '.']));
    assert.equal(result, 0);
    assert.match(out, /later release/i);
  });
});

test('cli(["verify", brokenFixture]) returns 1 when an owned file is missing', () => {
  const targetRoot = buildHealthyFixture();
  try {
    const ownedFile = path.join(targetRoot, '.claude', 'commands', 'rea-init.md');
    assert.ok(fs.existsSync(ownedFile), 'sanity: fixture has this owned file before deletion');
    fs.unlinkSync(ownedFile);

    const { result, out } = captureConsole(() => cliModule.cli(['verify', targetRoot]));
    assert.equal(result, 1);
    assert.match(out, /PASS|FAIL|SKIP/, 'report must render at least one per-check status line');
    assert.match(out, /FAIL/, 'the broken fixture must report at least one failing check');
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('cli(["migrate", "."]) with migrate.js absent prints the graceful stub and returns 0', () => {
  // Proves the lazy-load guard for `migrate`, mirroring the existing verify
  // guard test above: when src/migrate.js cannot be resolved, `migrate` must
  // degrade gracefully rather than crash.
  withoutMigrate(() => {
    const { result, out } = captureConsole(() => cliModule.cli(['migrate', '.']));
    assert.equal(result, 0);
    assert.match(out, /later release/i);
  });
});

test('cli(["migrate", fixture]) dispatches to the real migrate(), prints the human-readable report, and returns 0', () => {
  const targetRoot = buildMigrateFixture();
  try {
    const { result, out } = captureConsole(() => cliModule.cli(['migrate', targetRoot]));
    assert.equal(result, 0);
    assert.match(out, /router hook/i, 'report must mention the dead router hook status');
    assert.match(out, /archived/i, 'report must mention the archived .rea/lessons.md');
    assert.match(out, /Reminder/, 'report must include the reminder lines');
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('cli(["migrate", fixture, "--dry-run"]) threads dryRun through to migrate() — returns 0 and leaves the fixture tree byte-for-byte unchanged', () => {
  // The critical seam this unit is about: proves --dry-run actually reaches
  // migrate() (not just that parseArgs sets the flag) by asserting NOTHING
  // was written — a recursive byte-snapshot of the whole fixture tree must
  // be identical before and after the dispatch.
  const targetRoot = buildMigrateFixture();
  try {
    const before = snapshotTree(targetRoot);

    const { result, out } = captureConsole(() => cliModule.cli(['migrate', targetRoot, '--dry-run']));

    const after = snapshotTree(targetRoot);
    assert.equal(result, 0);
    assert.match(out, /router hook/i, 'a dry run must still print the same report content');
    assertSnapshotsEqual(before, after, 'migrate --dry-run fixture tree');
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('cli(["migrate", "/tmp/x"]) returns 1 when the stub migrate() reports a non-empty failed array', () => {
  withTempMigrate(
    [
      "'use strict';",
      'module.exports = {',
      '  migrate() {',
      '    return { changed: false, removed: [], moved: [], failed: ["x"], skipped: [], findings: [], nothingToMigrate: false };',
      '  },',
      '  formatMigrateReport() {',
      "    return ['stub'];",
      '  },',
      '};',
      '',
    ].join('\n'),
    () => {
      const { result } = captureConsole(() => cliModule.cli(['migrate', '/tmp/x']));
      assert.equal(result, 1);
    }
  );
});

test('cli(["bogus"]) prints usage and returns non-zero', () => {
  const { result, out, err } = captureConsole(() => cliModule.cli(['bogus']));
  assert.notEqual(result, 0);
  const combined = `${out}\n${err}`;
  assert.match(combined, /usage/i);
});

test('cli(["setup", "."]) with setup.js absent prints the graceful stub and returns 0', () => {
  // Proves the lazy-load guard in src/cli.js: when src/setup.js cannot be
  // resolved, `setup` must degrade gracefully rather than crash. Uses
  // withoutSetup() to temporarily remove the real orchestrator (added in
  // unit 4b-6) for the duration of this call — never leaving it deleted,
  // and never letting a real run() execute against this process's cwd.
  withoutSetup(() => {
    const { result, out } = captureConsole(() => cliModule.cli(['setup', '.']));
    assert.equal(result, 0);
    assert.match(out, /later release/i);
  });
});

test('cli(["setup", "-full"]) rejects the mistyped single-dash flag and shows the /rea-init --full hint', () => {
  const { result, out, err } = captureConsole(() =>
    cliModule.cli(['setup', '-full'])
  );
  assert.notEqual(result, 0);
  const combined = `${out}\n${err}`;
  assert.match(combined, /usage/i);
  assert.match(combined, /rea-init --full/, 'the -full/--full-specific hint must be shown');
});

test('cli(["setup", "--bogus"]) rejects an unrecognized long flag WITHOUT the --full-specific hint', () => {
  const { result, out, err } = captureConsole(() =>
    cliModule.cli(['setup', '--bogus'])
  );
  assert.notEqual(result, 0);
  const combined = `${out}\n${err}`;
  assert.match(combined, /usage/i);
  assert.doesNotMatch(
    combined,
    /rea-init --full/,
    'the --full hint must only ever fire for the --full/-full token, never for an arbitrary unknown flag'
  );
});

test('cli(["setup", "/tmp/x", "--full"]) is rejected — --full was removed from the CLI, usage + hint on stderr, setup.run() never reached', () => {
  // --full used to be silently accepted (KNOWN_FLAGS) and dispatched through
  // to setup.run({full: true}). Now it must be rejected by the same
  // findUnknownOption path as any other unrecognized flag, plus the
  // one-line /rea-init --full hint (this exact token), and — critically —
  // the real orchestrator must never be reached. Proven the same way the old
  // dispatch test proved the opposite: a stub run() that records to a
  // call-log file must never be invoked.
  const callLogPath = path
    .join(os.tmpdir(), `rea-cli-test-full-rejected-${process.pid}.json`)
    .replace(/\\/g, '/');
  fs.rmSync(callLogPath, { force: true });
  withTempSetup(
    [
      "'use strict';",
      'const fs = require("node:fs");',
      'module.exports = {',
      '  run(target, opts) {',
      `    fs.writeFileSync('${callLogPath}', JSON.stringify({ target, opts }));`,
      '    return { placed: 1, pruned: [], failed: [], isBridge: false };',
      '  },',
      '};',
      '',
    ].join('\n'),
    () => {
      try {
        const { result, out, err } = captureConsole(() =>
          cliModule.cli(['setup', '/tmp/x', '--full'])
        );
        assert.notEqual(result, 0, "'setup --full' must now be rejected, not dispatched");
        const combined = `${out}\n${err}`;
        assert.match(combined, /usage/i);
        assert.match(combined, /rea-init --full/);
        assert.equal(
          fs.existsSync(callLogPath),
          false,
          'setup.run() must never be reached when --full is passed'
        );
      } finally {
        fs.rmSync(callLogPath, { force: true });
      }
    }
  );
});

test('cli(["--help"]) prints usage to stdout and returns 0', () => {
  const { result, out, err } = captureConsole(() => cliModule.cli(['--help']));
  assert.equal(result, 0);
  assert.match(out, /usage/i);
  assert.equal(err, '', '--help must print to stdout, never stderr');
});

test('cli(["-h"]) prints usage to stdout and returns 0', () => {
  const { result, out, err } = captureConsole(() => cliModule.cli(['-h']));
  assert.equal(result, 0);
  assert.match(out, /usage/i);
  assert.equal(err, '');
});

test('cli(["--bogus", "--help"]) still short-circuits to help — checked before the unknown-option scan', () => {
  const { result, out, err } = captureConsole(() => cliModule.cli(['--bogus', '--help']));
  assert.equal(result, 0);
  assert.match(out, /usage/i);
  assert.equal(err, '');
});

test('cli(["setup", "/tmp/x", "--help"]) short-circuits to help before dispatching to setup.run()', () => {
  const callLogPath = path
    .join(os.tmpdir(), `rea-cli-test-help-short-circuit-${process.pid}.json`)
    .replace(/\\/g, '/');
  fs.rmSync(callLogPath, { force: true });
  withTempSetup(
    [
      "'use strict';",
      'const fs = require("node:fs");',
      'module.exports = {',
      '  run(target, opts) {',
      `    fs.writeFileSync('${callLogPath}', JSON.stringify({ target, opts }));`,
      '    return { placed: 1, pruned: [], failed: [], isBridge: false };',
      '  },',
      '};',
      '',
    ].join('\n'),
    () => {
      try {
        const { result, out } = captureConsole(() =>
          cliModule.cli(['setup', '/tmp/x', '--help'])
        );
        assert.equal(result, 0);
        assert.match(out, /usage/i);
        assert.equal(
          fs.existsSync(callLogPath),
          false,
          'setup.run() must never be reached when --help is passed'
        );
      } finally {
        fs.rmSync(callLogPath, { force: true });
      }
    }
  );
});

test('cli(["--version"]) prints the package.json version to stdout and returns 0', () => {
  const pkg = require('../package.json');
  const { result, out, err } = captureConsole(() => cliModule.cli(['--version']));
  assert.equal(result, 0);
  assert.match(out, new RegExp(pkg.version.replace(/\./g, '\\.')));
  assert.equal(err, '', '--version must print to stdout, never stderr');
});

test('cli(["--bogus", "--version"]) still short-circuits to version — checked before the unknown-option scan and before dispatch', () => {
  const pkg = require('../package.json');
  const { result, out, err } = captureConsole(() => cliModule.cli(['--bogus', '--version']));
  assert.equal(result, 0);
  assert.match(out, new RegExp(pkg.version.replace(/\./g, '\\.')));
  assert.equal(err, '');
});

test('cli(["setup", "/tmp/x"]) returns 0 (not a thrown error) when the stub run() returns a bare object without a .failed array', () => {
  // Null-safe fallback: an older/stub run() might not return the full
  // {placed, pruned, failed, isBridge} shape. handleSetup must still
  // degrade to 0 rather than throwing on a missing `.failed`.
  withTempSetup(
    "'use strict';\nmodule.exports = { run() { return {}; } };\n",
    () => {
      const result = cliModule.cli(['setup', '/tmp/x']);
      assert.equal(result, 0);
    }
  );
});

test('cli(["setup", "/tmp/x"]) returns 1 when the stub run() reports a non-empty failed array', () => {
  withTempSetup(
    "'use strict';\nmodule.exports = { run() { return { failed: ['some/file.md'] }; } };\n",
    () => {
      const result = cliModule.cli(['setup', '/tmp/x']);
      assert.equal(result, 1);
    }
  );
});

test('cli(["setup", "."]) throws (not swallowed) when setup.js itself fails to load with MODULE_NOT_FOUND', () => {
  // setup.js exists and is resolvable, but its own body requires a missing
  // dependency — this must propagate as a real error, never be mistaken for
  // "setup.js is absent".
  withTempSetup("require('./definitely-missing-dep-xyz');\n", () => {
    assert.throws(
      () => cliModule.cli(['setup', '.']),
      /definitely-missing-dep-xyz/
    );
  });
});

test('cli(["setup", target, "--dry-run"]) refuses instead of running a real install', () => {
  // --dry-run is a migrate-only flag, but KNOWN_FLAGS accepts it globally, so
  // it used to fall through to a full, silent install: a user asking for a
  // preview mutated their project. A mutating verb must never absorb a flag
  // that promises the opposite.
  const callLogPath = path.join(os.tmpdir(), `readev-tools-dryrun-${process.pid}.json`);
  fs.rmSync(callLogPath, { force: true });
  withTempSetup(
    "'use strict';\nconst fs = require('node:fs');\nmodule.exports = { run(target, opts) {\n" +
      `  fs.writeFileSync(${JSON.stringify(callLogPath)}, JSON.stringify({ target, opts }));\n` +
      '  return { placed: 1, pruned: [], failed: [] };\n} };\n',
    () => {
      try {
        const { result, err } = captureConsole(() => cliModule.cli(['setup', '/tmp/x', '--dry-run']));
        assert.notEqual(result, 0, 'must exit non-zero rather than silently installing');
        assert.equal(
          fs.existsSync(callLogPath),
          false,
          'setup.run() must never be reached when --dry-run is passed'
        );
        assert.match(err, /--dry-run/);
        assert.match(err, /migrate/);
      } finally {
        fs.rmSync(callLogPath, { force: true });
      }
    }
  );
});

test('cli(["verify", target, "--dry-run"]) is refused too — the flag belongs to migrate alone', () => {
  const { result, err } = captureConsole(() => cliModule.cli(['verify', '.', '--dry-run']));
  assert.notEqual(result, 0);
  assert.match(err, /--dry-run/);
});

test('cli(["setup", "/tmp/x"]) prints what it placed and pruned', () => {
  // setup was the only verb that reported nothing at all: verify and migrate
  // both print a report, while a successful install exited 0 in silence, so a
  // user could not see what landed or what was removed.
  withTempSetup(
    "'use strict';\nmodule.exports = { run() { return " +
      "{ placed: 23, pruned: ['.claude/commands/rea-commit.md'], failed: [], isBridge: false }; " +
      '} };\n',
    () => {
      const { result, out } = captureConsole(() => cliModule.cli(['setup', '/tmp/x']));
      assert.equal(result, 0);
      assert.match(out, /23/, 'the placed count must be reported');
      assert.match(out, /pruned/i);
      assert.match(out, /rea-commit\.md/, 'a pruned file must be named, not just counted');
    }
  );
});

test('cli(["setup", "/tmp/x"]) reports the failed count alongside the exit code', () => {
  withTempSetup(
    "'use strict';\nmodule.exports = { run() { return " +
      "{ placed: 2, pruned: [], failed: ['.claude/commands/locked.md'], isBridge: false }; } };\n",
    () => {
      const { result, out } = captureConsole(() => cliModule.cli(['setup', '/tmp/x']));
      assert.equal(result, 1);
      assert.match(out, /failed/i);
    }
  );
});

test('cli(["setup", "/tmp/x"]) prints nothing extra when run() returns a bare object (no placed/pruned fields)', () => {
  // The null-safe path: an older/stub run() shape must not make the reporter
  // throw or print "undefined file(s)".
  withTempSetup("'use strict';\nmodule.exports = { run() { return {}; } };\n", () => {
    const { result, out } = captureConsole(() => cliModule.cli(['setup', '/tmp/x']));
    assert.equal(result, 0);
    assert.doesNotMatch(out, /undefined/);
  });
});

test('after all cli.js dispatch tests, src/setup.js on disk is exactly as it was before this suite ran', () => {
  assert.equal(fs.existsSync(SETUP_PATH), REAL_SETUP_EXISTED);
  if (REAL_SETUP_EXISTED) {
    assert.equal(fs.readFileSync(SETUP_PATH, 'utf8'), REAL_SETUP_CONTENT);
  }
});

test('after all cli.js dispatch tests, src/verify.js on disk is exactly as it was before this suite ran', () => {
  assert.equal(fs.existsSync(VERIFY_PATH), REAL_VERIFY_EXISTED);
  if (REAL_VERIFY_EXISTED) {
    assert.equal(fs.readFileSync(VERIFY_PATH, 'utf8'), REAL_VERIFY_CONTENT);
  }
});

test('after all cli.js dispatch tests, src/migrate.js on disk is exactly as it was before this suite ran', () => {
  assert.equal(fs.existsSync(MIGRATE_PATH), REAL_MIGRATE_EXISTED);
  if (REAL_MIGRATE_EXISTED) {
    assert.equal(fs.readFileSync(MIGRATE_PATH, 'utf8'), REAL_MIGRATE_CONTENT);
  }
});
