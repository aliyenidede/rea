'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const cliModule = require('../src/cli.js');

const SETUP_PATH = path.join(__dirname, '..', 'src', 'setup.js');

// The real src/setup.js (the orchestrator this file dispatches to once
// present — lands in unit 4b-6) may or may not exist on disk depending on
// when this suite runs. Captured once so every helper below restores
// exactly this on-disk state afterward, instead of assuming "absent".
const REAL_SETUP_EXISTED = fs.existsSync(SETUP_PATH);
const REAL_SETUP_CONTENT = REAL_SETUP_EXISTED ? fs.readFileSync(SETUP_PATH, 'utf8') : null;

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

test('parseArgs(["setup", "/tmp/x"]) resolves verb=setup, target=/tmp/x, full=false', () => {
  const parsed = cliModule.parseArgs(['setup', '/tmp/x']);
  assert.deepEqual(parsed, { verb: 'setup', target: '/tmp/x', full: false });
});

test('parseArgs(["setup", "/tmp/x", "--full"]) resolves full=true', () => {
  const parsed = cliModule.parseArgs(['setup', '/tmp/x', '--full']);
  assert.deepEqual(parsed, { verb: 'setup', target: '/tmp/x', full: true });
});

test('parseArgs(["verify"]) defaults target to process.cwd()', () => {
  const parsed = cliModule.parseArgs(['verify']);
  assert.deepEqual(parsed, { verb: 'verify', target: process.cwd(), full: false });
});

test('cli(["verify"]) prints the "coming later" stub and returns 0', () => {
  const { result, out } = captureConsole(() => cliModule.cli(['verify']));
  assert.equal(result, 0);
  assert.match(out, /coming.*later/i);
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

test('cli(["setup", "-full"]) rejects the mistyped single-dash flag instead of treating it as target', () => {
  const { result, out, err } = captureConsole(() =>
    cliModule.cli(['setup', '-full'])
  );
  assert.notEqual(result, 0);
  const combined = `${out}\n${err}`;
  assert.match(combined, /usage/i);
});

test('cli(["setup", "--bogus"]) rejects an unrecognized long flag', () => {
  const { result, out, err } = captureConsole(() =>
    cliModule.cli(['setup', '--bogus'])
  );
  assert.notEqual(result, 0);
  const combined = `${out}\n${err}`;
  assert.match(combined, /usage/i);
});

test('cli(["setup", "/tmp/x", "--full"]) still parses full:true with target /tmp/x, dispatches to a present setup.js, and returns the mapped numeric exit code (not the raw result object)', () => {
  // The stub run() records its call args into a call-log file the test can
  // read back afterward (a plain closure variable would not survive across
  // the fresh module load withTempSetup triggers), so this still proves the
  // dispatch args (target, {full:true}) while asserting cli()'s return
  // value is the mapped numeric exit code, not the raw {target, opts}
  // object a naive `return s.run(...)` would produce. Forward slashes only,
  // so the path is embeddable in the generated stub source without any
  // Windows backslash-escaping gymnastics — fs accepts forward slashes on
  // Windows too. Lives under the OS temp dir (never inside the repo) so a
  // crash mid-test can never leave a stray file in the working tree.
  const callLogPath = path
    .join(os.tmpdir(), `rea-cli-test-call-log-${process.pid}.json`)
    .replace(/\\/g, '/');
  fs.rmSync(callLogPath, { force: true });
  withTempSetup(
    [
      "'use strict';",
      'const fs = require("node:fs");',
      'module.exports = {',
      '  run(target, opts) {',
      `    fs.writeFileSync('${callLogPath}', JSON.stringify({ target, opts }));`,
      '    return { placed: 1, pruned: [], failed: [], isBridge: false, full: opts.full };',
      '  },',
      '};',
      '',
    ].join('\n'),
    () => {
      try {
        const result = cliModule.cli(['setup', '/tmp/x', '--full']);
        assert.equal(result, 0, 'cli() must return the numeric exit code, not the raw result object');
        const recorded = JSON.parse(fs.readFileSync(callLogPath, 'utf8'));
        assert.deepEqual(recorded, { target: '/tmp/x', opts: { full: true } });
      } finally {
        fs.rmSync(callLogPath, { force: true });
      }
    }
  );
});

test('cli(["setup", "/tmp/x"]) returns 0 (not a thrown error) when the stub run() returns a bare object without a .failed array', () => {
  // Null-safe fallback: an older/stub run() might not return the full
  // {placed, pruned, failed, isBridge, full} shape. handleSetup must still
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

test('after all cli.js dispatch tests, src/setup.js on disk is exactly as it was before this suite ran', () => {
  assert.equal(fs.existsSync(SETUP_PATH), REAL_SETUP_EXISTED);
  if (REAL_SETUP_EXISTED) {
    assert.equal(fs.readFileSync(SETUP_PATH, 'utf8'), REAL_SETUP_CONTENT);
  }
});
