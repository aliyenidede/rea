'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const manifest = require('../src/manifest.js');
const shims = require('../src/shims.js');

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
  assert.equal(out, 'HEADER\n\n<!-- rea-tools:start -->\nBODY\n<!-- rea-tools:end -->\n');
});

test('applyMarkerBlock: markers present replaces only the managed region', () => {
  const existing =
    'TOP\n<!-- rea-tools:start -->\nOLD\n<!-- rea-tools:end -->\nBOTTOM\n';
  const out = shims.applyMarkerBlock(existing, 'NEW');
  assert.equal(out, 'TOP\n<!-- rea-tools:start -->\nNEW\n<!-- rea-tools:end -->\nBOTTOM\n');
});

test('applyMarkerBlock: markers absent appends the block, preserving existing content', () => {
  const existing = '# Hand-written notes\n\nSome content a human wrote.\n';
  const out = shims.applyMarkerBlock(existing, 'BODY');
  assert.ok(out.startsWith(existing), 'original content must be preserved verbatim at the start');
  assert.ok(out.includes('<!-- rea-tools:start -->\nBODY\n<!-- rea-tools:end -->'));
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
  const existing = '# Notes\n\n<!-- rea-tools:start -->\nUser started writing something but never closed it.\n';
  assert.throws(
    () => shims.applyMarkerBlock(existing, 'NEW', { fileLabel: 'CLAUDE.md' }),
    /Ambiguous rea-tools managed markers in CLAUDE\.md/
  );
});

test('applyMarkerBlock: two well-formed start/end pairs throws instead of silently updating only the first', () => {
  const existing =
    'TOP\n<!-- rea-tools:start -->\nFIRST OLD\n<!-- rea-tools:end -->\nMIDDLE\n<!-- rea-tools:start -->\nSECOND OLD\n<!-- rea-tools:end -->\nBOTTOM\n';
  assert.throws(
    () => shims.applyMarkerBlock(existing, 'NEW', { fileLabel: 'CLAUDE.md' }),
    /Ambiguous rea-tools managed markers in CLAUDE\.md/
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
      '# My Notes\n\nSome content above.\n\n<!-- rea-tools:start -->\nOLD STALE BODY\n<!-- rea-tools:end -->\n\nSome content below.\n',
      'utf8'
    );

    const m = manifest.createEmptyManifest();
    shims.writeShims(REPO_ROOT, targetRoot, m);

    const after = fs.readFileSync(claudePath, 'utf8');
    assert.ok(after.includes('Some content above.'), 'content above the markers must survive');
    assert.ok(after.includes('Some content below.'), 'content below the markers must survive');
    assert.ok(!after.includes('OLD STALE BODY'), 'the old managed region must be replaced');
    assert.ok(after.includes('@AGENTS.md'), 'the new managed body must be present');

    const starts = after.match(/<!-- rea-tools:start -->/g) || [];
    const ends = after.match(/<!-- rea-tools:end -->/g) || [];
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
    assert.ok(claudeAfter.includes('<!-- rea-tools:start -->'));
    assert.ok(claudeAfter.includes('@AGENTS.md'));

    assert.ok(agentsAfter.startsWith('# Legacy AGENTS notes\n\nHand-written stuff too.\n'));
    assert.ok(agentsAfter.includes('<!-- rea-tools:start -->'));
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
        'rea-tools only ever merges into'
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
      '<!-- rea-tools:start -->',
      'OLD',
      '<!-- rea-tools:end -->',
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

    const starts = after.match(/<!-- rea-tools:start -->/g) || [];
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
      '# Notes\n\n<!-- rea-tools:start -->\nUser started writing something but never closed it.\n';
    fs.writeFileSync(claudePath, original, 'utf8');

    const m = manifest.createEmptyManifest();
    assert.throws(
      () => shims.writeShims(REPO_ROOT, targetRoot, m),
      /Ambiguous rea-tools managed markers in CLAUDE\.md/
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
      /Ambiguous rea-tools managed markers in CLAUDE\.md/
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
      'TOP\n<!-- rea-tools:start -->\nFIRST OLD\n<!-- rea-tools:end -->\nMIDDLE\n' +
      '<!-- rea-tools:start -->\nSECOND OLD\n<!-- rea-tools:end -->\nBOTTOM\n';
    fs.writeFileSync(claudePath, original, 'utf8');

    const m = manifest.createEmptyManifest();
    assert.throws(
      () => shims.writeShims(REPO_ROOT, targetRoot, m),
      /Ambiguous rea-tools managed markers in CLAUDE\.md/
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
// Containment check.
// ---------------------------------------------------------------------------

test('resolveInsideRoot refuses to resolve a destination outside the target root', () => {
  const targetRoot = makeTmpRoot();
  try {
    assert.throws(() => shims.resolveInsideRoot(targetRoot, '../../escaped.md'));
    assert.throws(() => shims.resolveInsideRoot(targetRoot, path.join(os.tmpdir(), 'elsewhere.md')));
    assert.doesNotThrow(() => shims.resolveInsideRoot(targetRoot, 'CLAUDE.md'));
    assert.equal(shims.resolveInsideRoot(targetRoot, 'CLAUDE.md'), path.join(path.resolve(targetRoot), 'CLAUDE.md'));
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});
