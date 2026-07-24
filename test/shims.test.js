'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const manifest = require('../src/manifest.js');
const shims = require('../src/shims.js');
const { createFileSymlinkOrSkip, createDirLinkOrSkip } = require('./helpers/symlink-fixtures');

/** The repo root — the real, shipped templates/ tree is the canonical source for these tests. */
const REPO_ROOT = path.resolve(__dirname, '..');

/** Creates a unique tmp dir under the OS temp dir; returns its absolute path. */
function makeTmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rea-shims-test-'));
}

function readTemplate(...segments) {
  return fs.readFileSync(path.join(REPO_ROOT, 'templates', ...segments), 'utf8');
}

// ---------------------------------------------------------------------------
// Low-level helpers — pure functions, no file IO.
// ---------------------------------------------------------------------------

test('applyMarkerBlock: file absent (null) creates prefix + managed block', () => {
  const out = shims.applyMarkerBlock(null, 'BODY', { createPrefix: 'HEADER\n\n' });
  assert.equal(out, 'HEADER\n\n<!-- readev-tools:start -->\nBODY\n<!-- readev-tools:end -->\n');
});

test('applyMarkerBlock: markers present replaces only the managed region', () => {
  const existing =
    'TOP\n<!-- readev-tools:start -->\nOLD\n<!-- readev-tools:end -->\nBOTTOM\n';
  const out = shims.applyMarkerBlock(existing, 'NEW');
  assert.equal(out, 'TOP\n<!-- readev-tools:start -->\nNEW\n<!-- readev-tools:end -->\nBOTTOM\n');
});

test('applyMarkerBlock: markers absent appends the block, preserving existing content', () => {
  const existing = '# Hand-written notes\n\nSome content a human wrote.\n';
  const out = shims.applyMarkerBlock(existing, 'BODY');
  assert.ok(out.startsWith(existing), 'original content must be preserved verbatim at the start');
  assert.ok(out.includes('<!-- readev-tools:start -->\nBODY\n<!-- readev-tools:end -->'));
});

test('mergeGeminiSettings: missing settings (undefined) produces the fixed fileName array', () => {
  const out = shims.mergeGeminiSettings(undefined);
  assert.deepEqual(out, { context: { fileName: ['AGENTS.md', 'GEMINI.md'] } });
});

test('mergeGeminiSettings: preserves an unrelated top-level key and an unrelated context key', () => {
  const out = shims.mergeGeminiSettings({
    unrelated: { foo: 'bar' },
    context: { otherThing: true, fileName: ['STALE.md'] },
  });
  assert.deepEqual(out, {
    unrelated: { foo: 'bar' },
    context: { otherThing: true, fileName: ['AGENTS.md', 'GEMINI.md'] },
  });
});

test('mergeGeminiSettings: an array (non-plain-object) existing settings resets to {} instead of spreading into numeric keys', () => {
  const out = shims.mergeGeminiSettings(['a', 'b', 'c']);
  assert.deepEqual(out, { context: { fileName: ['AGENTS.md', 'GEMINI.md'] } });
});

test('mergeGeminiSettings: an array `context` value resets to {} instead of being merged as numeric keys', () => {
  const out = shims.mergeGeminiSettings({ unrelated: 'keep', context: ['x', 'y'] });
  assert.deepEqual(out, { unrelated: 'keep', context: { fileName: ['AGENTS.md', 'GEMINI.md'] } });
});

// ---------------------------------------------------------------------------
// applyMarkerBlock — ambiguous marker counts (FIX 3): refuse, never guess.
// ---------------------------------------------------------------------------

test('applyMarkerBlock: an orphan start marker with no end marker throws instead of silently appending', () => {
  const existing = '# Notes\n\n<!-- readev-tools:start -->\nUser started writing something but never closed it.\n';
  assert.throws(
    () => shims.applyMarkerBlock(existing, 'NEW', { fileLabel: 'CLAUDE.md' }),
    /Ambiguous readev-tools managed markers in CLAUDE\.md/
  );
});

test('applyMarkerBlock: two well-formed start/end pairs throws instead of silently updating only the first', () => {
  const existing =
    'TOP\n<!-- readev-tools:start -->\nFIRST OLD\n<!-- readev-tools:end -->\nMIDDLE\n<!-- readev-tools:start -->\nSECOND OLD\n<!-- readev-tools:end -->\nBOTTOM\n';
  assert.throws(
    () => shims.applyMarkerBlock(existing, 'NEW', { fileLabel: 'CLAUDE.md' }),
    /Ambiguous readev-tools managed markers in CLAUDE\.md/
  );
});

// ---------------------------------------------------------------------------
// (a)-(f) — the never-blind-overwrite contract, via the full writeShims() pipeline.
// ---------------------------------------------------------------------------

test('(a) CLAUDE.md with user content above/below existing markers: content preserved, only managed region replaced', () => {
  const targetRoot = makeTmpRoot();
  try {
    const claudePath = path.join(targetRoot, 'CLAUDE.md');
    fs.writeFileSync(
      claudePath,
      '# My Notes\n\nSome content above.\n\n<!-- readev-tools:start -->\nOLD STALE BODY\n<!-- readev-tools:end -->\n\nSome content below.\n',
      'utf8'
    );

    const m = manifest.createEmptyManifest();
    shims.writeShims(REPO_ROOT, targetRoot, m);

    const after = fs.readFileSync(claudePath, 'utf8');
    assert.ok(after.includes('Some content above.'), 'content above the markers must survive');
    assert.ok(after.includes('Some content below.'), 'content below the markers must survive');
    assert.ok(!after.includes('OLD STALE BODY'), 'the old managed region must be replaced');
    assert.ok(after.includes('@AGENTS.md'), 'the new managed body must be present');

    const starts = after.match(/<!-- readev-tools:start -->/g) || [];
    const ends = after.match(/<!-- readev-tools:end -->/g) || [];
    assert.equal(starts.length, 1, 'exactly one start marker');
    assert.equal(ends.length, 1, 'exactly one end marker');

    assert.ok(!after.includes('\r'), 'an LF file must stay LF-only — no CRLF must be introduced');
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('(b) markers-absent CLAUDE.md and AGENTS.md get the managed block appended with existing content intact', () => {
  const targetRoot = makeTmpRoot();
  try {
    const claudePath = path.join(targetRoot, 'CLAUDE.md');
    const agentsPath = path.join(targetRoot, 'AGENTS.md');
    fs.writeFileSync(claudePath, '# Legacy CLAUDE notes\n\nHand-written stuff.\n', 'utf8');
    fs.writeFileSync(agentsPath, '# Legacy AGENTS notes\n\nHand-written stuff too.\n', 'utf8');

    const m = manifest.createEmptyManifest();
    shims.writeShims(REPO_ROOT, targetRoot, m);

    const claudeAfter = fs.readFileSync(claudePath, 'utf8');
    const agentsAfter = fs.readFileSync(agentsPath, 'utf8');

    assert.ok(claudeAfter.startsWith('# Legacy CLAUDE notes\n\nHand-written stuff.\n'));
    assert.ok(claudeAfter.includes('<!-- readev-tools:start -->'));
    assert.ok(claudeAfter.includes('@AGENTS.md'));

    assert.ok(agentsAfter.startsWith('# Legacy AGENTS notes\n\nHand-written stuff too.\n'));
    assert.ok(agentsAfter.includes('<!-- readev-tools:start -->'));
    assert.ok(agentsAfter.includes('## Behaviour'), 'the real AGENTS.md managed body must be appended');
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('(c) AGENTS.md managed block is created (byte-identical to templates/AGENTS.md) when the file is absent', () => {
  const targetRoot = makeTmpRoot();
  try {
    const m = manifest.createEmptyManifest();
    shims.writeShims(REPO_ROOT, targetRoot, m);

    const agentsAfter = fs.readFileSync(path.join(targetRoot, 'AGENTS.md'), 'utf8');
    const expected = readTemplate('AGENTS.md');
    assert.equal(agentsAfter, expected);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('(d) Gemini .gemini/settings.json merge adds context.fileName while preserving an unrelated key', () => {
  const targetRoot = makeTmpRoot();
  try {
    const geminiPath = path.join(targetRoot, '.gemini', 'settings.json');
    fs.mkdirSync(path.dirname(geminiPath), { recursive: true });
    fs.writeFileSync(
      geminiPath,
      JSON.stringify({ unrelated: { foo: 'bar' }, context: { otherThing: true } }, null, 2),
      'utf8'
    );

    const m = manifest.createEmptyManifest();
    shims.writeShims(REPO_ROOT, targetRoot, m);

    const after = JSON.parse(fs.readFileSync(geminiPath, 'utf8'));
    assert.deepEqual(after.unrelated, { foo: 'bar' }, 'unrelated top-level key must survive');
    assert.equal(after.context.otherThing, true, 'unrelated context key must survive');
    assert.deepEqual(after.context.fileName, ['AGENTS.md', 'GEMINI.md']);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('.gemini/settings.json is tracked as a shimRegion, NEVER as an owned (prune-deletable) file', () => {
  const targetRoot = makeTmpRoot();
  try {
    const m = manifest.createEmptyManifest();
    shims.writeShims(REPO_ROOT, targetRoot, m);

    assert.ok(
      !manifest.listOwned(m).includes('.gemini/settings.json'),
      '.gemini/settings.json must never be in ownedFiles — prune could blind-delete a user file that ' +
        'readev-tools only ever merges into'
    );

    const geminiRegion = m.shimRegions.find((r) => r.file === '.gemini/settings.json');
    assert.ok(geminiRegion, '.gemini/settings.json must be tracked as a shimRegion');
    assert.equal(geminiRegion.marker, 'context.fileName');
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('writeShims: an existing .gemini/settings.json that is not valid JSON throws a contextual error naming the file', () => {
  const targetRoot = makeTmpRoot();
  try {
    const geminiPath = path.join(targetRoot, '.gemini', 'settings.json');
    fs.mkdirSync(path.dirname(geminiPath), { recursive: true });
    fs.writeFileSync(geminiPath, '{ not valid json', 'utf8');

    const m = manifest.createEmptyManifest();
    assert.throws(
      () => shims.writeShims(REPO_ROOT, targetRoot, m),
      (err) => err instanceof Error && err.message.includes(geminiPath)
    );
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('(e) a second writeShims() run is idempotent', () => {
  const targetRoot = makeTmpRoot();
  try {
    const m = manifest.createEmptyManifest();
    shims.writeShims(REPO_ROOT, targetRoot, m);

    const claudePath = path.join(targetRoot, 'CLAUDE.md');
    const agentsPath = path.join(targetRoot, 'AGENTS.md');
    const geminiPath = path.join(targetRoot, '.gemini', 'settings.json');

    const claude1 = fs.readFileSync(claudePath, 'utf8');
    const agents1 = fs.readFileSync(agentsPath, 'utf8');
    const gemini1 = fs.readFileSync(geminiPath, 'utf8');

    shims.writeShims(REPO_ROOT, targetRoot, m);

    const claude2 = fs.readFileSync(claudePath, 'utf8');
    const agents2 = fs.readFileSync(agentsPath, 'utf8');
    const gemini2 = fs.readFileSync(geminiPath, 'utf8');

    assert.equal(claude1, claude2, 'CLAUDE.md must be byte-identical on a second run');
    assert.equal(agents1, agents2, 'AGENTS.md must be byte-identical on a second run');
    assert.equal(gemini1, gemini2, '.gemini/settings.json must be byte-identical on a second run');

    assert.equal(
      m.shimRegions.filter((r) => r.file === 'CLAUDE.md').length,
      1,
      'no duplicate shimRegions entry for CLAUDE.md after a second run'
    );
    assert.equal(
      m.shimRegions.filter((r) => r.file === 'AGENTS.md').length,
      1,
      'no duplicate shimRegions entry for AGENTS.md after a second run'
    );
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('(f) a CRLF-line-ending CLAUDE.md still matches the markers and preserves surrounding content', () => {
  const targetRoot = makeTmpRoot();
  try {
    const claudePath = path.join(targetRoot, 'CLAUDE.md');
    const crlfContent = [
      'TOP LINE',
      '',
      '<!-- readev-tools:start -->',
      'OLD',
      '<!-- readev-tools:end -->',
      '',
      'BOTTOM LINE',
      '',
    ].join('\r\n');
    fs.writeFileSync(claudePath, crlfContent, 'utf8');

    const m = manifest.createEmptyManifest();
    shims.writeShims(REPO_ROOT, targetRoot, m);

    const after = fs.readFileSync(claudePath, 'utf8');
    assert.ok(after.includes('TOP LINE'), 'content above the markers must survive');
    assert.ok(after.includes('BOTTOM LINE'), 'content below the markers must survive');
    assert.ok(!after.includes('OLD'), 'the old managed region must be replaced');
    assert.ok(after.includes('@AGENTS.md'));

    const starts = after.match(/<!-- readev-tools:start -->/g) || [];
    assert.equal(starts.length, 1, 'exactly one start marker — the CRLF marker must have matched, not been duplicated');

    assert.ok(
      !after.replace(/\r\n/g, '').includes('\n'),
      'no bare \\n outside of \\r\\n pairs — a CRLF file must not end up with mixed line endings'
    );
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('(g) a CLAUDE.md with an orphan start marker (no end) is left untouched — refused, not silently appended into', () => {
  const targetRoot = makeTmpRoot();
  try {
    const claudePath = path.join(targetRoot, 'CLAUDE.md');
    const original =
      '# Notes\n\n<!-- readev-tools:start -->\nUser started writing something but never closed it.\n';
    fs.writeFileSync(claudePath, original, 'utf8');

    const m = manifest.createEmptyManifest();
    assert.throws(
      () => shims.writeShims(REPO_ROOT, targetRoot, m),
      /Ambiguous readev-tools managed markers in CLAUDE\.md/
    );
    assert.equal(
      fs.readFileSync(claudePath, 'utf8'),
      original,
      'orphan-start-marker file must be left byte-identical, not appended into'
    );

    // A second run must still refuse — never treat the orphan start marker as matching a
    // freshly-written end marker and swallow the user's content in between.
    assert.throws(
      () => shims.writeShims(REPO_ROOT, targetRoot, m),
      /Ambiguous readev-tools managed markers in CLAUDE\.md/
    );
    assert.equal(
      fs.readFileSync(claudePath, 'utf8'),
      original,
      'orphan-start-marker file must still be byte-identical after a second refused run'
    );
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('(h) a CLAUDE.md with two well-formed start/end pairs is left untouched — refused, not silently half-updated', () => {
  const targetRoot = makeTmpRoot();
  try {
    const claudePath = path.join(targetRoot, 'CLAUDE.md');
    const original =
      'TOP\n<!-- readev-tools:start -->\nFIRST OLD\n<!-- readev-tools:end -->\nMIDDLE\n' +
      '<!-- readev-tools:start -->\nSECOND OLD\n<!-- readev-tools:end -->\nBOTTOM\n';
    fs.writeFileSync(claudePath, original, 'utf8');

    const m = manifest.createEmptyManifest();
    assert.throws(
      () => shims.writeShims(REPO_ROOT, targetRoot, m),
      /Ambiguous readev-tools managed markers in CLAUDE\.md/
    );
    assert.equal(
      fs.readFileSync(claudePath, 'utf8'),
      original,
      'duplicate-marker-pair file must be left byte-identical, not half-updated'
    );
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// SECURITY — containment is enforced via the shared, realpath-aware
// src/safe-path.js#resolveInsideRoot guard (see test/safe-path.test.js for
// the primitive's own tests — lexical-reject + legit-in-root coverage lives
// there now, not here; this file only tests THIS module's behaviour: a write
// through an in-root symlink/junction escaping targetRoot must be refused).
//
// Fixture shape: an OS tmp dir (`parent`) containing `root/` (targetRoot) and
// `outside/` as SIBLINGS, so an escape genuinely leaves `root`.
// ---------------------------------------------------------------------------

/** Creates a fresh `parent/{root,outside}` sibling pair; returns their absolute paths. */
function makeParentRootOutside(prefix) {
  const parent = makeTmpRoot(prefix);
  const root = path.join(parent, 'root');
  const outside = path.join(parent, 'outside');
  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  return { parent, root, outside };
}

test(
  'SECURITY: writeShims refuses to write CLAUDE.md when it is a FILE symlink escaping the target root; the outside file it points at is left untouched',
  (t) => {
    const { parent, root, outside } = makeParentRootOutside('rea-shims-test-escape-md-');
    try {
      const outsideFile = path.join(outside, 'secret.md');
      fs.writeFileSync(outsideFile, 'do not overwrite me via a shim write\n', 'utf8');
      const claudePath = path.join(root, 'CLAUDE.md');

      if (!createFileSymlinkOrSkip(t, outsideFile, claudePath)) {
        return;
      }

      const m = manifest.createEmptyManifest();
      assert.throws(() => shims.writeShims(REPO_ROOT, root, m));

      assert.equal(
        fs.readFileSync(outsideFile, 'utf8'),
        'do not overwrite me via a shim write\n',
        'the outside file the symlink points at must be left UNCHANGED'
      );
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  }
);

test(
  'SECURITY: writeShims refuses to write .gemini/settings.json when .gemini is a directory JUNCTION escaping the target root; the outside file it points at is left untouched',
  (t) => {
    const { parent, root, outside } = makeParentRootOutside('rea-shims-test-escape-gemini-');
    try {
      const outsideGeminiDir = path.join(outside, 'evil-gemini');
      fs.mkdirSync(outsideGeminiDir, { recursive: true });
      const outsideSettingsPath = path.join(outsideGeminiDir, 'settings.json');
      fs.writeFileSync(outsideSettingsPath, '{"do-not-touch": true}\n', 'utf8');

      const geminiLink = path.join(root, '.gemini');
      if (!createDirLinkOrSkip(t, outsideGeminiDir, geminiLink)) {
        return;
      }

      const m = manifest.createEmptyManifest();
      assert.throws(() => shims.writeShims(REPO_ROOT, root, m));

      assert.equal(
        fs.readFileSync(outsideSettingsPath, 'utf8'),
        '{"do-not-touch": true}\n',
        'the outside settings.json the junction points at must be left UNCHANGED'
      );
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  }
);
