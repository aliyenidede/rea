'use strict';

const test = require('node:test');
const { before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const manifest = require('../src/manifest.js');
const { place } = require('../src/place.js');

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
 * Uses a real (non-busy) synchronous sleep between attempts.
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

const { run } = requireRealSetupModule();

// The real readev-tools package root (this repo) — templates/ and core/ live here.
const REPO_ROOT = path.resolve(__dirname, '..');

/** Creates a unique tmp dir under the OS temp dir; returns its absolute path. */
function makeTmpRoot(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix || 'rea-setup-test-'));
}

/** Writes `content` to `relPath` under `root`, creating parent dirs as needed. */
function writeFile(root, relPath, content) {
  const abs = path.join(root, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content ?? 'content\n', 'utf8');
  return abs;
}

/** Copies a single file, creating the destination's parent dir as needed. */
function copyFile(srcAbs, destAbs) {
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  fs.copyFileSync(srcAbs, destAbs);
}

/**
 * Captures console.log/console.error/console.warn calls made during `fn()`
 * and returns the concatenated output alongside `fn`'s return value.
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
 * Builds a minimal fixture readev-tools source tree (mirroring the layout
 * place.js/shims.js/setup.js expect) under a fresh tmp dir:
 *   templates/commands/{a.md,b.md}
 *   templates/agents/x.md
 *   core/{principles.md,craft-checklist.md,rea-schema.md}
 *   templates/.rea/{knowledge,decisions,sessions,plans}/README.md
 *   templates/AGENTS.md + templates/shims/{CLAUDE.md,gemini-settings.json}
 *     (copied from the real repo so writeShims has well-formed marker
 *     templates to read).
 * Returns the fixture root's absolute path.
 */
function buildFixtureSourceRoot() {
  const fixtureRoot = makeTmpRoot('rea-setup-fixture-');

  writeFile(fixtureRoot, 'templates/commands/a.md', '# command a\n');
  writeFile(fixtureRoot, 'templates/commands/b.md', '# command b\n');
  writeFile(fixtureRoot, 'templates/agents/x.md', '# agent x\n');
  writeFile(fixtureRoot, 'core/principles.md', '# principles\n');
  writeFile(fixtureRoot, 'core/craft-checklist.md', '# craft checklist\n');
  writeFile(fixtureRoot, 'core/rea-schema.md', '# rea schema\n');
  for (const typeName of ['knowledge', 'decisions', 'sessions', 'plans']) {
    writeFile(fixtureRoot, `templates/.rea/${typeName}/README.md`, `# ${typeName}\n`);
  }
  copyFile(
    path.join(REPO_ROOT, 'templates', 'AGENTS.md'),
    path.join(fixtureRoot, 'templates', 'AGENTS.md')
  );
  copyFile(
    path.join(REPO_ROOT, 'templates', 'shims', 'CLAUDE.md'),
    path.join(fixtureRoot, 'templates', 'shims', 'CLAUDE.md')
  );
  copyFile(
    path.join(REPO_ROOT, 'templates', 'shims', 'gemini-settings.json'),
    path.join(fixtureRoot, 'templates', 'shims', 'gemini-settings.json')
  );

  return fixtureRoot;
}

// A single READ-ONLY fixture source tree, shared by every test below that
// never mutates it (Case 4 and Case 5) — built once instead of once per
// test to keep this file's total tmp-dir/file-copy load down, since this
// suite runs concurrently (as a separate process) alongside five other test
// files. Cases 2 and 3 still build their OWN fixture, since they mutate it
// (deleting templates/commands/b.md).
let sharedReadonlyFixtureRoot;

before(() => {
  sharedReadonlyFixtureRoot = buildFixtureSourceRoot();
});

after(() => {
  fs.rmSync(sharedReadonlyFixtureRoot, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Case 1: legacy host + one-time bridge.
// ---------------------------------------------------------------------------

test('run(): legacy host bridge — places the redesign set, creates the .rea scaffold, prunes retired files, preserves user content, prints the pip-uninstall notice', () => {
  const targetRoot = makeTmpRoot();
  try {
    // A retired legacy command file (no successor in the redesigned set).
    const retiredCommand = writeFile(
      targetRoot,
      '.claude/commands/rea-commit.md',
      '# legacy rea-commit\n'
    );
    // A user CLAUDE.md preamble, written above any managed markers.
    const claudeMdPath = writeFile(
      targetRoot,
      'CLAUDE.md',
      '# My Project Notes\n\nThis is a user-written preamble line.\n'
    );
    // Legacy (pre-typed-memory) project memory.
    const legacyLog = writeFile(targetRoot, '.rea/log/old.md', '# old session log\n');

    // Sanity: no manifest yet.
    assert.equal(fs.existsSync(path.join(targetRoot, manifest.MANIFEST_REL_PATH)), false);

    const { result, out } = captureConsole(() => run(targetRoot, { sourceRoot: REPO_ROOT }));

    // A redesign command is placed.
    assert.ok(
      fs.existsSync(path.join(targetRoot, '.claude', 'commands', 'rea-init.md')),
      'expected the redesigned rea-init.md command to be placed'
    );

    // The .rea/ typed scaffold exists.
    for (const typeName of ['knowledge', 'decisions', 'sessions', 'plans']) {
      assert.ok(
        fs.existsSync(path.join(targetRoot, '.rea', typeName, 'README.md')),
        `expected the .rea/${typeName}/README.md scaffold file to exist`
      );
    }

    // The retired legacy command is gone.
    assert.equal(fs.existsSync(retiredCommand), false, 'the retired rea-commit.md must be pruned');

    // User CLAUDE.md preamble survives.
    const claudeMdAfter = fs.readFileSync(claudeMdPath, 'utf8');
    assert.ok(
      claudeMdAfter.includes('This is a user-written preamble line.'),
      'the user CLAUDE.md preamble must survive'
    );

    // Legacy memory survives (protected by prune's deny-list).
    assert.ok(fs.existsSync(legacyLog), '.rea/log/old.md must survive');

    // The manifest now exists and lists an owned set.
    const manifestPath = path.join(targetRoot, manifest.MANIFEST_REL_PATH);
    assert.ok(fs.existsSync(manifestPath), 'the manifest file must now exist');
    const owned = manifest.listOwned(manifest.load(targetRoot));
    assert.ok(owned.length > 0, 'the manifest must list a non-empty owned set');

    // The pip-uninstall notice was printed.
    assert.match(out, /pip uninstall rea-dev/);

    // Return value sanity.
    assert.equal(result.isBridge, true);
    assert.ok(!('full' in result), 'the full concept was removed — run() must not return a `full` key');
    assert.ok(result.placed > 0);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Case 2: second-run-after-template-shrink — prune via the manifest diff.
// ---------------------------------------------------------------------------

test('run(): second run after a template file is dropped prunes it via the manifest diff, while a surviving file remains', () => {
  const fixtureRoot = buildFixtureSourceRoot();
  const targetRoot = makeTmpRoot();
  try {
    // Run 1: both a.md and b.md are placed.
    const run1 = run(targetRoot, { sourceRoot: fixtureRoot });
    assert.equal(run1.isBridge, false);
    assert.ok(fs.existsSync(path.join(targetRoot, '.claude', 'commands', 'a.md')));
    assert.ok(fs.existsSync(path.join(targetRoot, '.claude', 'commands', 'b.md')));

    // Shrink the template set: b.md no longer exists in the source.
    fs.unlinkSync(path.join(fixtureRoot, 'templates', 'commands', 'b.md'));

    // Run 2: b.md was owned last run, absent this run -> pruned via the diff.
    const run2 = run(targetRoot, { sourceRoot: fixtureRoot });
    assert.equal(run2.isBridge, false);
    assert.equal(
      fs.existsSync(path.join(targetRoot, '.claude', 'commands', 'b.md')),
      false,
      'b.md must be pruned after being dropped from the template set'
    );
    assert.ok(
      fs.existsSync(path.join(targetRoot, '.claude', 'commands', 'a.md')),
      'a.md must survive — it is still in the current template set'
    );
    assert.ok(
      run2.pruned.includes('.claude/commands/b.md'),
      'the pruned list returned from run() must name .claude/commands/b.md'
    );
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Case 3: a failed deletion must be re-recorded as owned, so the next run
// retries it instead of orphaning it forever.
// ---------------------------------------------------------------------------

test('run(): a file that fails to delete during prune is re-recorded as owned in the saved manifest, so the next run retries pruning it', () => {
  const fixtureRoot = buildFixtureSourceRoot();
  const targetRoot = makeTmpRoot();
  // node:fs is a singleton module instance shared by every `require('node:fs')`
  // call in this process, including the one inside src/prune.js — patching
  // `fs.rmSync` here is therefore visible to prune()'s own delete call, with
  // no need to touch/monkeypatch src/prune.js itself.
  const originalRmSync = fs.rmSync;
  try {
    // Run 1: both a.md and b.md are placed.
    run(targetRoot, { sourceRoot: fixtureRoot });
    const bPath = path.join(targetRoot, '.claude', 'commands', 'b.md');
    assert.ok(fs.existsSync(bPath));

    // Shrink the template set: b.md no longer exists in the source, so run 2
    // will try to prune it.
    fs.unlinkSync(path.join(fixtureRoot, 'templates', 'commands', 'b.md'));

    // Simulate a locked/undeletable file (e.g. EBUSY/EPERM on Windows): make
    // rmSync throw only for b.md's resolved path, pass every other call
    // through untouched.
    const resolvedBPath = path.resolve(bPath);
    fs.rmSync = (target, options) => {
      if (path.resolve(target) === resolvedBPath) {
        throw new Error('simulated EBUSY: file is locked');
      }
      return originalRmSync(target, options);
    };

    const { result: run2 } = captureConsole(() => run(targetRoot, { sourceRoot: fixtureRoot }));

    // The delete failed, so b.md is still on disk...
    assert.ok(fs.existsSync(bPath), 'b.md must still exist on disk — the simulated delete failed');
    // ...and run() reports it in `failed`, not `pruned`.
    assert.ok(
      run2.failed.includes('.claude/commands/b.md'),
      'the failed list returned from run() must name .claude/commands/b.md'
    );
    assert.equal(
      run2.pruned.includes('.claude/commands/b.md'),
      false,
      'a failed delete must not also be reported as pruned'
    );

    // The saved manifest must still list b.md as owned (FIX 2): a failed
    // deletion dropping out of ownedFiles would mean the next run's
    // `previouslyOwned` never includes it again, so prune would never retry
    // it — silently orphaning an obsolete-but-undeletable file forever. This
    // is the exact condition the next run's diff needs to re-attempt the
    // delete (proven directly by prune.test.js's own diff-based prune
    // coverage — not re-proven here via a third run() call, to keep this
    // integration test's IO footprint down).
    const savedOwned = manifest.listOwned(manifest.load(targetRoot));
    assert.ok(
      savedOwned.includes('.claude/commands/b.md'),
      'the saved manifest must still list .claude/commands/b.md as owned after a failed delete, ' +
        'so the next run retries pruning it'
    );
  } finally {
    fs.rmSync = originalRmSync;
    originalRmSync(targetRoot, { recursive: true, force: true });
    originalRmSync(fixtureRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Case 4: sourceRoot === targetRoot (the dogfood scenario) must not corrupt
// core/ via a self-copy.
// ---------------------------------------------------------------------------

test('place(): sourceRoot === targetRoot (running the installer against its own dev checkout) does not truncate or throw copying core/ onto itself', () => {
  // Uses the shared READ-ONLY fixture tree (never the real repo root —
  // place() would otherwise write .claude/commands, .claude/agents and
  // .rea/ scaffold files straight into this actual repository's working
  // tree) as BOTH source and target, reproducing the ADR 0001 dogfood
  // scenario in miniature: LAYOUT's `core -> core` entry means srcDirAbs
  // === destDirAbs for the core/ files when sourceRoot === targetRoot. This
  // test only reads from the fixture beforehand and re-places into it
  // (idempotent, content-preserving), so it is safe to share with Case 5.
  const fixtureRoot = sharedReadonlyFixtureRoot;

  const beforeContent = {};
  for (const fileName of ['principles.md', 'craft-checklist.md', 'rea-schema.md']) {
    beforeContent[fileName] = fs.readFileSync(path.join(fixtureRoot, 'core', fileName), 'utf8');
  }

  const m = manifest.createEmptyManifest();
  assert.doesNotThrow(() => {
    place(fixtureRoot, fixtureRoot, m);
  });

  for (const fileName of ['principles.md', 'craft-checklist.md', 'rea-schema.md']) {
    const afterContent = fs.readFileSync(path.join(fixtureRoot, 'core', fileName), 'utf8');
    assert.equal(
      afterContent,
      beforeContent[fileName],
      `core/${fileName} must be unchanged (not truncated) after a self-copy`
    );
  }

  const owned = manifest.listOwned(m);
  assert.ok(
    owned.includes('core/principles.md'),
    'core/principles.md must still be recorded as owned even though the physical copy was skipped'
  );
});

// ---------------------------------------------------------------------------
// Case 5: crash safety — manifest is saved LAST; a crash mid-run leaves the
// old (or absent) manifest on disk, and a corrected retry converges.
// ---------------------------------------------------------------------------

test('run(): a mid-run crash (ambiguous CLAUDE.md markers) throws, leaves no manifest on disk, and a corrected retry converges to the expected placed state', () => {
  // Uses the shared READ-ONLY fixture as sourceRoot — this test only ever
  // writes into its own separate targetRoot, never into the fixture.
  const fixtureRoot = sharedReadonlyFixtureRoot;
  const targetRoot = makeTmpRoot();
  try {
    // An ambiguous marker state (an orphan start marker, no matching end) —
    // real and portable: writeShims() (called after place() inside run())
    // throws on this via applyMarkerBlock's "refuse to guess" guard.
    const claudeMdPath = writeFile(
      targetRoot,
      'CLAUDE.md',
      '# My Project Notes\n\n<!-- readev-tools:start -->\nstray content, no end marker\n'
    );

    const manifestPath = path.join(targetRoot, manifest.MANIFEST_REL_PATH);
    assert.equal(fs.existsSync(manifestPath), false, 'sanity: no manifest before the crashing run');

    // (a) run() throws (not swallowed).
    assert.throws(
      () => run(targetRoot, { sourceRoot: fixtureRoot }),
      /[Aa]mbiguous/
    );

    // (b) the manifest is still absent — manifest.save() is the LAST step,
    // so a crash in writeShims() (which runs before prune/save) must never
    // leave a manifest behind.
    assert.equal(
      fs.existsSync(manifestPath),
      false,
      'no manifest must be written when run() crashes before reaching manifest.save()'
    );

    // Fix the ambiguous marker state so a retry can succeed.
    fs.writeFileSync(claudeMdPath, '# My Project Notes\n\nfixed, no stray markers.\n', 'utf8');

    // (c) a corrected retry converges: no throw, manifest now exists, and
    // the expected placed files are present.
    const retryResult = run(targetRoot, { sourceRoot: fixtureRoot });
    assert.ok(fs.existsSync(manifestPath), 'the manifest must now exist after a successful retry');
    assert.ok(fs.existsSync(path.join(targetRoot, '.claude', 'commands', 'a.md')));
    assert.ok(fs.existsSync(path.join(targetRoot, '.claude', 'commands', 'b.md')));
    assert.ok(retryResult.placed > 0);
  } finally {
    // fixtureRoot is the shared read-only fixture (cleaned up once, by the
    // module-level after() hook) — only targetRoot belongs to this test.
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});
