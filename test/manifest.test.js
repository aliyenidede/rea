'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const manifest = require('../src/manifest.js');
const { createDirLinkOrSkip } = require('./helpers/symlink-fixtures');

/** Creates a unique tmp dir under the OS temp dir; returns its absolute path. */
function makeTmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rea-manifest-test-'));
}

test('load() on a target with no manifest returns an empty manifest', () => {
  const targetRoot = makeTmpRoot();
  try {
    const m = manifest.load(targetRoot);
    assert.deepEqual(m, { version: 1, ownedFiles: [], shimRegions: [] });
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('recordOwned + recordShimRegion, save, then reload round-trips', () => {
  const targetRoot = makeTmpRoot();
  try {
    let m = manifest.load(targetRoot);
    manifest.recordOwned(m, '.claude/commands/rea-init.md');
    manifest.recordOwned(m, 'core/principles.md');
    manifest.recordShimRegion(m, 'AGENTS.md', 'rea-tools');

    manifest.save(targetRoot, m);

    const reloaded = manifest.load(targetRoot);
    assert.deepEqual(reloaded, {
      version: 1,
      ownedFiles: ['.claude/commands/rea-init.md', 'core/principles.md'],
      shimRegions: [{ file: 'AGENTS.md', marker: 'rea-tools' }],
    });
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('save() writes atomically: no leftover .tmp file, real file has valid JSON', () => {
  const targetRoot = makeTmpRoot();
  try {
    const m = manifest.load(targetRoot);
    manifest.recordOwned(m, 'core/principles.md');
    manifest.save(targetRoot, m);

    const manifestPath = path.join(targetRoot, manifest.MANIFEST_REL_PATH);
    const tmpPath = `${manifestPath}.tmp`;

    assert.equal(fs.existsSync(tmpPath), false, 'no leftover .tmp file should remain');
    assert.equal(fs.existsSync(manifestPath), true, 'the real manifest file should exist');

    const raw = fs.readFileSync(manifestPath, 'utf8');
    const parsed = JSON.parse(raw); // throws if not valid JSON
    assert.deepEqual(parsed, {
      version: 1,
      ownedFiles: ['core/principles.md'],
      shimRegions: [],
    });
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('a backslash path is stored forward-slash and compares equal to its POSIX form', () => {
  const targetRoot = makeTmpRoot();
  try {
    const m = manifest.load(targetRoot);
    manifest.recordOwned(m, 'a\\b\\c.md');

    assert.deepEqual(manifest.listOwned(m), ['a/b/c.md']);

    manifest.save(targetRoot, m);
    const reloaded = manifest.load(targetRoot);
    assert.deepEqual(manifest.listOwned(reloaded), ['a/b/c.md']);
    assert.equal(manifest.listOwned(reloaded)[0], 'a/b/c.md');
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('normalizeRelPath converts backslashes to forward slashes', () => {
  assert.equal(manifest.normalizeRelPath('a\\b\\c.md'), 'a/b/c.md');
  assert.equal(manifest.normalizeRelPath('already/posix.md'), 'already/posix.md');
});

test('normalizeRelPath relativizes an absolute path against targetRoot when given', () => {
  const targetRoot = path.resolve(os.tmpdir(), 'fake-target');
  const absolute = path.join(targetRoot, 'core', 'principles.md');
  assert.equal(manifest.normalizeRelPath(absolute, targetRoot), 'core/principles.md');
});

test('recordOwned is idempotent (no duplicate entries for the same normalized path)', () => {
  const targetRoot = makeTmpRoot();
  try {
    const m = manifest.load(targetRoot);
    manifest.recordOwned(m, 'core/principles.md');
    manifest.recordOwned(m, 'core\\principles.md'); // same path, backslash form
    assert.deepEqual(manifest.listOwned(m), ['core/principles.md']);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('listOwned returns a snapshot copy, not a live reference (FIX 1)', () => {
  const targetRoot = makeTmpRoot();
  try {
    const m = manifest.load(targetRoot);
    manifest.recordOwned(m, 'core/a.md');

    const snap = manifest.listOwned(m);
    manifest.recordOwned(m, 'core/new.md');

    assert.deepEqual(snap, ['core/a.md'], 'snapshot must not mutate when the manifest changes later');
    assert.deepEqual(manifest.listOwned(m), ['core/a.md', 'core/new.md']);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('load() backfills a partial/old-schema manifest so recordOwned does not throw (FIX 2a)', () => {
  const targetRoot = makeTmpRoot();
  try {
    const manifestPath = path.join(targetRoot, manifest.MANIFEST_REL_PATH);
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify({ version: 1 }), 'utf8');

    const m = manifest.load(targetRoot);
    assert.deepEqual(m, { version: 1, ownedFiles: [], shimRegions: [] });

    assert.doesNotThrow(() => manifest.recordOwned(m, 'core/principles.md'));
    assert.doesNotThrow(() => manifest.recordShimRegion(m, 'AGENTS.md', 'rea-tools'));
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('load() throws a contextual error naming the manifest path on invalid JSON (FIX 2b)', () => {
  const targetRoot = makeTmpRoot();
  try {
    const manifestPath = path.join(targetRoot, manifest.MANIFEST_REL_PATH);
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, '{ not json', 'utf8');

    assert.throws(() => manifest.load(targetRoot), (err) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.includes(manifestPath),
        `expected error message to include manifest path ${manifestPath}, got: ${err.message}`
      );
      return true;
    });
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('recordOwned throws on an absolute path (win32 and posix forms) but not on a relative one (FIX 3)', () => {
  const targetRoot = makeTmpRoot();
  try {
    const m = manifest.load(targetRoot);
    assert.throws(() => manifest.recordOwned(m, 'C:\\proj\\x.md'));
    assert.throws(() => manifest.recordOwned(m, '/abs/x.md'));
    assert.doesNotThrow(() => manifest.recordOwned(m, 'core/x.md'));
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('recordShimRegion throws on an absolute path (win32 and posix forms) but not on a relative one (FIX 3)', () => {
  const targetRoot = makeTmpRoot();
  try {
    const m = manifest.load(targetRoot);
    assert.throws(() => manifest.recordShimRegion(m, 'C:\\proj\\AGENTS.md', 'rea-tools'));
    assert.throws(() => manifest.recordShimRegion(m, '/abs/AGENTS.md', 'rea-tools'));
    assert.doesNotThrow(() => manifest.recordShimRegion(m, 'AGENTS.md', 'rea-tools'));
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('recordShimRegion is idempotent: calling twice for the same file (backslash then forward-slash) dedupes to one updated entry (FIX 5)', () => {
  const targetRoot = makeTmpRoot();
  try {
    const m = manifest.load(targetRoot);
    manifest.recordShimRegion(m, 'a\\b\\AGENTS.md', 'marker-1');
    manifest.recordShimRegion(m, 'a/b/AGENTS.md', 'marker-2');

    assert.deepEqual(m.shimRegions, [{ file: 'a/b/AGENTS.md', marker: 'marker-2' }]);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// SECURITY (Decision 8) — save() refuses to write when `.rea` is an escaping
// symlink/junction. Containment is enforced via the shared, realpath-aware
// src/safe-path.js#resolveInsideRoot guard (see test/safe-path.test.js for
// the primitive's own tests); this file only tests THIS module's behaviour.
//
// Fixture shape: an OS tmp dir (`parent`) containing `root/` (targetRoot) and
// `outside/` as SIBLINGS, so an escape genuinely leaves `root`.
// ---------------------------------------------------------------------------

test(
  'SECURITY: save() refuses to write when `.rea` is a directory JUNCTION escaping the target root; the outside dir is left untouched',
  (t) => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'rea-manifest-test-escape-'));
    const root = path.join(parent, 'root');
    const outside = path.join(parent, 'outside');
    fs.mkdirSync(root, { recursive: true });
    const outsideReaDir = path.join(outside, 'evil-rea');
    fs.mkdirSync(outsideReaDir, { recursive: true });

    try {
      const reaLink = path.join(root, '.rea');
      if (!createDirLinkOrSkip(t, outsideReaDir, reaLink)) {
        return;
      }

      const m = manifest.load(root);
      manifest.recordOwned(m, 'core/principles.md');

      assert.throws(() => manifest.save(root, m), /Refusing to resolve/);

      assert.equal(
        fs.existsSync(path.join(outsideReaDir, '.rea-manifest.json')),
        false,
        'no manifest file must leak through the escaping junction into the outside dir'
      );
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  }
);
