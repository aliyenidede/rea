'use strict';

/**
 * test/verify.test.js — read-only install health check (4c-1)
 *
 * Builds a genuine healthy install by placing the REAL templates into a temp
 * host (mirroring test/templates.test.js's placeIntoTempHost() pattern:
 * place() then writeShims(), both against the same manifest, then
 * manifest.save() so verify()'s own manifest.load() finds it on disk) rather
 * than depending on src/setup.js — test/cli.test.js briefly mutates
 * src/setup.js ON DISK mid-run to exercise cli.js's lazy-load paths, and
 * requiring it from another test file races that mutation (see
 * test/setup.test.js's requireRealSetupModule() retry helper for the full
 * story). place()/shims.js carry no such hazard.
 *
 * src/verify.js itself is NOT hazard-free, though (added alongside 4c-2):
 * test/cli.test.js's withoutVerify() helper briefly deletes the actual
 * src/verify.js FILE ON DISK (then restores it in a `finally`) to exercise
 * cli.js's lazy-load dispatch path for `verify` — the exact same class of
 * race test/setup.test.js already guards against for src/setup.js. This
 * file's own top-level require of src/verify.js goes through
 * requireRealVerifyModule() below for the same reason.
 *
 * Every mutation test below builds its OWN fresh copy of the healthy fixture
 * (via buildHealthyFixture()) and mutates only that copy — nothing here ever
 * touches the real repository tree.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const manifest = require('../src/manifest.js');
const { place } = require('../src/place.js');
const { writeShims, MARKER_START, MARKER_END } = require('../src/shims.js');

/**
 * Requires the REAL ../src/verify.js, retrying a bounded number of times on a
 * specific transient condition before giving up.
 *
 * test/cli.test.js's withoutVerify() helper briefly mutates the actual
 * src/verify.js FILE ON DISK (deleting it, then restoring it in a `finally`)
 * to exercise src/cli.js's lazy-load dispatch path for `verify`. `node --test
 * <files...>` runs each test FILE as its own OS process (independently
 * verified), but both this file and cli.test.js resolve/read the exact same
 * physical src/verify.js path — so there is a narrow, purely timing-dependent
 * window where this module's top-level require() can observe cli.test.js's
 * process mid-delete: the file is briefly absent (MODULE_NOT_FOUND). The
 * delete is always self-correcting — cli.test.js's `finally` block guarantees
 * the real file returns within milliseconds — so a short bounded retry
 * recovers deterministically instead of this file failing on a purely
 * transient race that has nothing to do with the code under test here.
 * Mirrors test/setup.test.js's requireRealSetupModule() exactly (same
 * bounded-retry shape, same real sleep between attempts).
 */
function requireRealVerifyModule() {
  const maxAttempts = 25;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // require.resolve() itself throws MODULE_NOT_FOUND while cli.test.js
      // has the file deleted — resolved and cache-cleared INSIDE the try so
      // that transient failure is caught by the same retry logic below,
      // rather than escaping uncaught before the loop even starts.
      const verifyPath = require.resolve('../src/verify.js');
      delete require.cache[verifyPath];
      const mod = require('../src/verify.js');
      // withoutVerify() (unlike withTempSetup) never writes a fake stub in
      // src/verify.js's place — it only deletes-then-restores the real
      // file — so there is no stub-vs-real ambiguity to resolve here. The
      // `verify` function check still guards against a truncated/malformed
      // read observed mid-restore.
      if (mod && typeof mod.verify === 'function') {
        return mod;
      }
    } catch (e) {
      // Only retry a MODULE_NOT_FOUND for OUR OWN require of verify.js
      // (cli.test.js's withoutVerify() briefly deleting it) — never swallow
      // an unrelated error (e.g. a genuine missing dependency).
      const isOwnRequireMissing = e && e.code === 'MODULE_NOT_FOUND' && /verify\.js/.test(e.message);
      if (!isOwnRequireMissing || attempt === maxAttempts) {
        throw e;
      }
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 15);
  }
  throw new Error('requireRealVerifyModule: could not load a well-formed ../src/verify.js after retries');
}

const { verify } = requireRealVerifyModule();

// The real readev-tools package root (this repo) — templates/ and core/ live here.
const REPO_ROOT = path.resolve(__dirname, '..');

/** Creates a unique tmp dir under the OS temp dir; returns its absolute path. */
function makeTmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rea-verify-test-'));
}

/**
 * Places the full real template set (commands, agents, core trio, the `.rea/`
 * scaffold, and the AGENTS.md/CLAUDE.md/.gemini shims) into a fresh temp
 * host, then persists the manifest to disk — a genuine healthy install, per
 * the module docstring above. Returns the temp host's absolute path.
 */
function buildHealthyFixture() {
  const targetRoot = makeTmpRoot();
  const m = manifest.createEmptyManifest();
  place(REPO_ROOT, targetRoot, m);
  writeShims(REPO_ROOT, targetRoot, m);
  manifest.save(targetRoot, m);
  return targetRoot;
}

/** Returns the single check object named `name` from a verify() result, or undefined. */
function findCheck(result, name) {
  return result.checks.find((c) => c.name === name);
}

/**
 * Recursively snapshots every regular file under `root` as a Map of
 * forward-slash relative path -> raw file bytes (Buffer). Used to prove
 * verify() writes nothing: a before/after snapshot must be identical both in
 * the set of paths and in every file's bytes.
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

// ---------------------------------------------------------------------------
// Case (a): healthy install -> ok:true; CI check is always 'skip' (never
// forced to 'pass'), every other check is 'pass'.
// ---------------------------------------------------------------------------

test('verify(): healthy install -> ok:true, manifest/owned/core+scaffold/shims checks pass, CI is always skip', () => {
  const targetRoot = buildHealthyFixture();
  try {
    const result = verify(targetRoot);

    assert.equal(result.ok, true);
    assert.equal(
      result.checks.some((c) => c.status === 'fail'),
      false,
      'no check may be a fail on a healthy install'
    );

    assert.equal(findCheck(result, 'manifest present').status, 'pass');
    assert.equal(findCheck(result, 'owned files present').status, 'pass');
    assert.equal(findCheck(result, 'core/ + scaffold').status, 'pass');
    assert.equal(findCheck(result, 'shims intact').status, 'pass');

    // CI is ALWAYS skip (informational) — present vs. absent only changes the
    // detail text, never the status. This fixture has no .github/workflows/,
    // so it must still report 'skip', not 'fail'.
    const ciCheck = findCheck(result, 'CI');
    assert.ok(ciCheck, 'a CI check must always be reported');
    assert.equal(ciCheck.status, 'skip', 'CI must never be pass/fail — always informational');
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Case (b): a deleted owned file -> that check fails, ok:false.
// ---------------------------------------------------------------------------

test('verify(): a deleted owned file -> owned files present check fails, ok:false', () => {
  const targetRoot = buildHealthyFixture();
  try {
    const ownedFile = path.join(targetRoot, '.claude', 'commands', 'rea-init.md');
    assert.ok(fs.existsSync(ownedFile), 'sanity: fixture has this owned file before deletion');
    fs.unlinkSync(ownedFile);

    const result = verify(targetRoot);

    assert.equal(result.ok, false);
    const check = findCheck(result, 'owned files present');
    assert.equal(check.status, 'fail');
    assert.match(check.detail, /\.claude\/commands\/rea-init\.md/);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Case (c): CLAUDE.md with its markers stripped -> shim check fails.
// ---------------------------------------------------------------------------

test('verify(): CLAUDE.md with its markers stripped -> shims intact check fails', () => {
  const targetRoot = buildHealthyFixture();
  try {
    const claudeMdPath = path.join(targetRoot, 'CLAUDE.md');
    const original = fs.readFileSync(claudeMdPath, 'utf8');
    const stripped = original
      .split('\n')
      .filter((line) => !line.includes('readev-tools:start') && !line.includes('readev-tools:end'))
      .join('\n');
    assert.notEqual(stripped, original, 'sanity: the fixture actually had markers before stripping');
    fs.writeFileSync(claudeMdPath, stripped, 'utf8');

    const result = verify(targetRoot);

    assert.equal(result.ok, false);
    const check = findCheck(result, 'shims intact');
    assert.equal(check.status, 'fail');
    assert.match(check.detail, /CLAUDE\.md/);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Case (d): .gemini/settings.json missing AGENTS.md from context.fileName ->
// fail.
// ---------------------------------------------------------------------------

test('verify(): .gemini/settings.json missing AGENTS.md from context.fileName -> shims intact check fails', () => {
  const targetRoot = buildHealthyFixture();
  try {
    const settingsPath = path.join(targetRoot, '.gemini', 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.ok(
      settings.context.fileName.includes('AGENTS.md'),
      'sanity: the fixture actually had AGENTS.md in context.fileName before rewriting'
    );
    settings.context.fileName = ['GEMINI.md'];
    fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');

    const result = verify(targetRoot);

    assert.equal(result.ok, false);
    const check = findCheck(result, 'shims intact');
    assert.equal(check.status, 'fail');
    assert.match(check.detail, /\.gemini\/settings\.json/);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Robustness gap: a wrong single-line pointer body (both markers intact) ->
// fail. Exercises the `isSingleLine && trimmedBody !== '@AGENTS.md'` branch
// in checkMarkdownShimRegion, which case (c) above (markers stripped) never
// reaches.
// ---------------------------------------------------------------------------

test('verify(): CLAUDE.md markers intact but managed body is the wrong single-line pointer -> shims intact check fails', () => {
  const targetRoot = buildHealthyFixture();
  try {
    const claudeMdPath = path.join(targetRoot, 'CLAUDE.md');
    const original = fs.readFileSync(claudeMdPath, 'utf8');
    assert.ok(original.includes('@AGENTS.md'), 'sanity: the fixture actually has the "@AGENTS.md" pointer body');
    // Rewrites ONLY the managed body's pointer line — the literal "@AGENTS.md"
    // (with its leading "@") occurs exactly once in this file, between the
    // markers; the prose above the markers references plain "AGENTS.md"
    // (no "@"), so this replace cannot accidentally touch it.
    const rewritten = original.replace('@AGENTS.md', '@WRONG.md');
    assert.notEqual(rewritten, original, 'sanity: the pointer body was actually rewritten');
    fs.writeFileSync(claudeMdPath, rewritten, 'utf8');

    const result = verify(targetRoot);

    assert.equal(result.ok, false);
    const check = findCheck(result, 'shims intact');
    assert.equal(check.status, 'fail');
    assert.match(check.detail, /CLAUDE\.md/);
    assert.match(check.detail, /@WRONG\.md/);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Robustness gap: a manifest file that exists but holds invalid JSON must not
// crash verify() — manifest.load() throws on this per its documented
// contract (it only returns an empty manifest for a MISSING file).
// ---------------------------------------------------------------------------

test('verify(): a corrupt (invalid-JSON) manifest file does not throw -> a single "manifest present" fail check, ok:false', () => {
  const targetRoot = buildHealthyFixture();
  try {
    const manifestPath = path.join(targetRoot, manifest.MANIFEST_REL_PATH);
    fs.writeFileSync(manifestPath, '{ this is not valid JSON', 'utf8');

    let result;
    assert.doesNotThrow(() => {
      result = verify(targetRoot);
    }, 'verify() must never throw, even on a corrupt manifest file');

    assert.equal(result.ok, false);
    assert.equal(
      result.checks.length,
      1,
      'only the manifest-present check is reported for a corrupt manifest — verify() must stop immediately'
    );
    assert.equal(result.checks[0].name, 'manifest present');
    assert.equal(result.checks[0].status, 'fail');
    assert.match(result.checks[0].detail, /corrupt/i);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Robustness gap: reversed markers (end marker appears before the start
// marker) must NOT be treated as an intact managed block, even though both
// literal marker strings are present somewhere in the file.
// ---------------------------------------------------------------------------

test('verify(): CLAUDE.md with its markers reversed (end before start) -> shims intact check fails', () => {
  const targetRoot = buildHealthyFixture();
  try {
    const claudeMdPath = path.join(targetRoot, 'CLAUDE.md');
    const original = fs.readFileSync(claudeMdPath, 'utf8');
    // Swaps the two literal marker comment strings (via temporary
    // placeholders, so neither replace accidentally matches the other's
    // output) while leaving everything else — including the "@AGENTS.md"
    // line between them — untouched. Net effect: MARKER_END now appears at
    // an earlier index in the file than MARKER_START.
    const reversed = original
      .replace(MARKER_START, ' START ')
      .replace(MARKER_END, MARKER_START)
      .replace(' START ', MARKER_END);
    assert.ok(reversed.indexOf(MARKER_END) < reversed.indexOf(MARKER_START), 'sanity: markers are now reversed');
    fs.writeFileSync(claudeMdPath, reversed, 'utf8');

    const result = verify(targetRoot);

    assert.equal(result.ok, false);
    const check = findCheck(result, 'shims intact');
    assert.equal(check.status, 'fail');
    assert.match(check.detail, /CLAUDE\.md/);
    assert.match(check.detail, /out of order/i);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Robustness gap: a poisoned shimRegions[] entry (e.g. `null`) must not throw
// a TypeError out of verify() when its `.marker`/`.file` are accessed.
// ---------------------------------------------------------------------------

test('verify(): a malformed (null) shimRegions[] entry does not throw -> reported as a shims intact fail', () => {
  const targetRoot = buildHealthyFixture();
  try {
    const loadedManifest = manifest.load(targetRoot);
    loadedManifest.shimRegions.push(null);
    manifest.save(targetRoot, loadedManifest);

    let result;
    assert.doesNotThrow(() => {
      result = verify(targetRoot);
    }, 'verify() must never throw on a malformed shimRegions[] entry');

    assert.equal(result.ok, false);
    const check = findCheck(result, 'shims intact');
    assert.equal(check.status, 'fail');
    assert.match(check.detail, /malformed/i);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Robustness gap (fix B's guard): CLAUDE.md replaced by a directory of the
// same name -> fs.readFileSync throws EISDIR, which is portable (fires on
// Windows too, unlike an EACCES permission-bits test) — must not escape
// verify() as an uncaught exception.
// ---------------------------------------------------------------------------

test('verify(): CLAUDE.md replaced by a directory of the same name (EISDIR on read) does not throw -> shims intact check fails as unreadable', () => {
  const targetRoot = buildHealthyFixture();
  try {
    const claudeMdPath = path.join(targetRoot, 'CLAUDE.md');
    fs.rmSync(claudeMdPath, { force: true });
    fs.mkdirSync(claudeMdPath);

    let result;
    assert.doesNotThrow(() => {
      result = verify(targetRoot);
    }, 'verify() must never throw when a shim path is a directory instead of a file');

    assert.equal(result.ok, false);
    const check = findCheck(result, 'shims intact');
    assert.equal(check.status, 'fail');
    assert.match(check.detail, /CLAUDE\.md/);
    assert.match(check.detail, /unreadable/i);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Robustness gap (fix F's guard): an unreadable .github/workflows dir (e.g.
// EACCES) must not escape verify() as an uncaught exception — CI must still
// resolve to `skip`, never fail or throw. node:fs is a singleton module
// instance shared by every `require('node:fs')` call in this process,
// including the one inside src/verify.js — patching `fs.readdirSync` here is
// therefore visible to checkCi()'s own call, with no need to touch/
// monkeypatch src/verify.js itself (mirrors test/setup.test.js's fs.rmSync
// monkeypatch pattern for the same reason).
// ---------------------------------------------------------------------------

test('verify(): an unreadable .github/workflows dir (readdirSync throws) does not throw -> CI check is still skip', () => {
  const targetRoot = buildHealthyFixture();
  const originalReaddirSync = fs.readdirSync;
  try {
    const workflowsDir = path.join(targetRoot, '.github', 'workflows');
    fs.mkdirSync(workflowsDir, { recursive: true });
    fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), 'name: ci\n', 'utf8');

    // Simulate an unreadable dir (e.g. EACCES) by making readdirSync throw
    // only for the workflows dir's resolved path; every other call (used by
    // buildHealthyFixture()'s own place()/writeShims() calls, already done by
    // this point) passes through untouched.
    const resolvedWorkflowsDir = path.resolve(workflowsDir);
    fs.readdirSync = (target, options) => {
      if (path.resolve(target) === resolvedWorkflowsDir) {
        throw new Error('simulated EACCES: permission denied');
      }
      return originalReaddirSync(target, options);
    };

    let result;
    assert.doesNotThrow(() => {
      result = verify(targetRoot);
    }, 'verify() must never throw when the CI workflows dir is unreadable');

    const ciCheck = findCheck(result, 'CI');
    assert.equal(ciCheck.status, 'skip', 'CI must remain skip even when the workflows dir cannot be read');
    assert.match(ciCheck.detail, /unreadable/i);
  } finally {
    fs.readdirSync = originalReaddirSync;
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Case (e): no CI workflow -> skip, not fail (inherent — the fixture never
// places a .github/workflows/ dir).
// ---------------------------------------------------------------------------

test('verify(): no CI workflow -> CI check is skip (not fail), and does not affect ok', () => {
  const targetRoot = buildHealthyFixture();
  try {
    assert.equal(
      fs.existsSync(path.join(targetRoot, '.github', 'workflows')),
      false,
      'sanity: the fixture has no CI workflow dir'
    );

    const result = verify(targetRoot);

    const ciCheck = findCheck(result, 'CI');
    assert.equal(ciCheck.status, 'skip');
    assert.match(ciCheck.detail, /no CI workflow/i);
    assert.equal(result.ok, true);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Case (f): no manifest -> a single fail check, "not installed".
// ---------------------------------------------------------------------------

test('verify(): no manifest -> a single fail check, "not installed"', () => {
  const targetRoot = makeTmpRoot();
  try {
    assert.equal(fs.existsSync(path.join(targetRoot, manifest.MANIFEST_REL_PATH)), false, 'sanity: no manifest');

    const result = verify(targetRoot);

    assert.equal(result.ok, false);
    assert.equal(
      result.checks.length,
      1,
      'only the manifest-present check is reported when there is no manifest — verify() must stop immediately'
    );
    assert.equal(result.checks[0].name, 'manifest present');
    assert.equal(result.checks[0].status, 'fail');
    assert.match(result.checks[0].detail, /not installed/);
    assert.match(result.checks[0].detail, /npx readev-tools setup/);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// verify() is read-only: a healthy fixture tree is byte-identical after a run
// (covers every check path, since the fixture is healthy end-to-end).
// ---------------------------------------------------------------------------

test('verify(): writes nothing -- a healthy fixture tree is byte-identical after a run', () => {
  const targetRoot = buildHealthyFixture();
  try {
    const before = snapshotTree(targetRoot);

    const result = verify(targetRoot);
    assert.equal(result.ok, true); // sanity: this run actually exercised every check's read path

    const after = snapshotTree(targetRoot);

    assert.deepEqual(
      [...after.keys()].sort(),
      [...before.keys()].sort(),
      'verify() must not create or delete any file'
    );
    for (const [relPath, beforeBytes] of before) {
      assert.equal(
        Buffer.compare(beforeBytes, after.get(relPath)),
        0,
        `${relPath} must be byte-identical after verify()`
      );
    }
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});
