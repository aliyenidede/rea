'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  toCanonicalRel,
  isInsideRoot,
  isRealpathInsideRoot,
  resolveInsideRoot,
  isSamePath,
} = require('../src/safe-path.js');
const { createFileSymlinkOrSkip, createDirLinkOrSkip } = require('./helpers/symlink-fixtures');

/** Creates a unique tmp dir under the OS temp dir; returns its absolute path. */
function makeTmpRoot(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix || 'rea-safe-path-test-'));
}

/** Writes `content` to `relPath` under `root`, creating parent dirs as needed. */
function writeFile(root, relPath, content) {
  const abs = path.join(root, ...relPath.split('/'));
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content ?? 'content\n', 'utf8');
  return abs;
}

/**
 * Empirically detects (by probing a fresh tmp dir, never by trusting
 * `process.platform`) whether the running filesystem is case-insensitive.
 * Used only to compute the EXPECTED outcome in test (c) — kept independent
 * of src/safe-path.js's own detection so the test proves real behaviour
 * rather than just agreeing with the implementation's internals.
 */
function detectCaseInsensitiveFsForTest() {
  const dir = makeTmpRoot('rea-safe-path-case-probe-');
  try {
    fs.writeFileSync(path.join(dir, 'probe.tmp'), '');
    return fs.existsSync(path.join(dir, 'PROBE.TMP'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// (a) isInsideRoot() — strict lexical containment, root-equal refused.
// ---------------------------------------------------------------------------

test('(a) isInsideRoot() accepts a normal nested path inside root', () => {
  const targetRoot = makeTmpRoot();
  try {
    assert.equal(isInsideRoot(targetRoot, 'sub/dir/file.md'), true);
    assert.equal(isInsideRoot(targetRoot, 'CLAUDE.md'), true);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('(a) isInsideRoot() refuses a ../ escaping path and an absolute path outside root', () => {
  const targetRoot = makeTmpRoot();
  try {
    assert.equal(isInsideRoot(targetRoot, '../escape/secret.md'), false);
    assert.equal(isInsideRoot(targetRoot, '../../etc/passwd'), false);

    const elsewhere = makeTmpRoot('rea-safe-path-test-elsewhere-');
    try {
      assert.equal(isInsideRoot(targetRoot, path.join(elsewhere, 'x.md')), false);
    } finally {
      fs.rmSync(elsewhere, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('(a) isInsideRoot() refuses a root-equal candidate (targetRoot itself)', () => {
  const targetRoot = makeTmpRoot();
  try {
    assert.equal(isInsideRoot(targetRoot, ''), false, 'an empty relPath must not count as inside root');
    assert.equal(isInsideRoot(targetRoot, '.'), false, 'a "." relPath must not count as inside root');
    assert.equal(isInsideRoot(targetRoot, './'), false, 'a "./" relPath must not count as inside root');
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// (b) toCanonicalRel() — one canonical forward-slash rel form.
// ---------------------------------------------------------------------------

test(
  '(b) toCanonicalRel() collapses "x/../y", a redundant "./", and an absolute in-root path to the same forward-slash rel',
  () => {
    const targetRoot = makeTmpRoot();
    try {
      const viaDotDot = toCanonicalRel(targetRoot, 'x/../y/z.md');
      const viaRedundantDot = toCanonicalRel(targetRoot, './y/z.md');
      const viaAbsolute = toCanonicalRel(targetRoot, path.join(targetRoot, 'y', 'z.md'));

      assert.equal(viaDotDot, 'y/z.md');
      assert.equal(viaRedundantDot, 'y/z.md');
      assert.equal(viaAbsolute, 'y/z.md');
    } finally {
      fs.rmSync(targetRoot, { recursive: true, force: true });
    }
  }
);

// ---------------------------------------------------------------------------
// (c) isSamePath() — case-folded ONLY on a case-insensitive FS.
// ---------------------------------------------------------------------------

test(
  '(c) isSamePath(): a case-variant path is equal only on a case-insensitive FS; genuinely different paths are always false',
  () => {
    const targetRoot = makeTmpRoot();
    try {
      const lower = path.join(targetRoot, 'file.txt');
      const upperVariant = path.join(targetRoot, 'FILE.txt');
      const genuinelyDifferent = path.join(targetRoot, 'other.txt');

      const expectCaseVariantEqual = detectCaseInsensitiveFsForTest();

      assert.equal(isSamePath(lower, upperVariant), expectCaseVariantEqual);
      assert.equal(isSamePath(lower, genuinelyDifferent), false);
      assert.equal(isSamePath(lower, lower), true, 'a path must always be the same as itself');
    } finally {
      fs.rmSync(targetRoot, { recursive: true, force: true });
    }
  }
);

// ---------------------------------------------------------------------------
// SECURITY (d)-(h) — symlink/junction escape regressions.
//
// Fixture shape: an OS tmp dir (`parent`) containing `root/` (the safe area)
// and `outside/` as SIBLINGS, so an escape genuinely leaves `root`.
// ---------------------------------------------------------------------------

/**
 * (d)/(h-d) fixture: `root/escape-link.txt` is a FILE symlink pointing to a
 * real file under a sibling `outside/` dir — dest itself is the escaping
 * symlink. Returns `{root, rel, cleanup}`, or `null` if the test was skipped
 * (see handleLinkCreationFailure) — callers must return immediately on null.
 */
function buildEscapingFileSymlinkFixture(t) {
  const parent = makeTmpRoot();
  const root = path.join(parent, 'root');
  const outside = path.join(parent, 'outside');
  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  const outsideFile = writeFile(outside, 'secret.txt', 'do not leak me via a symlink\n');
  const linkPath = path.join(root, 'escape-link.txt');

  if (!createFileSymlinkOrSkip(t, outsideFile, linkPath)) {
    fs.rmSync(parent, { recursive: true, force: true });
    return null;
  }

  return {
    root,
    rel: 'escape-link.txt',
    cleanup: () => fs.rmSync(parent, { recursive: true, force: true }),
  };
}

/**
 * (e)/(h-e) fixture: `root/escape-parent` is a directory junction pointing to
 * a real dir under a sibling `outside/` dir; `rel` names a NEW (non-existent)
 * file under it — the naive "realpath dest only" guard would miss this,
 * because dest itself doesn't exist yet. Returns `{root, rel, cleanup}`, or
 * `null` if the test was skipped.
 */
function buildEscapingParentJunctionFixture(t) {
  const parent = makeTmpRoot();
  const root = path.join(parent, 'root');
  const outside = path.join(parent, 'outside');
  const outsideDir = path.join(outside, 'evil-dir');
  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(outsideDir, { recursive: true });
  const parentLink = path.join(root, 'escape-parent');

  if (!createDirLinkOrSkip(t, outsideDir, parentLink)) {
    fs.rmSync(parent, { recursive: true, force: true });
    return null;
  }

  return {
    root,
    rel: 'escape-parent/new-file.txt',
    cleanup: () => fs.rmSync(parent, { recursive: true, force: true }),
  };
}

/**
 * (f)/(h-f) fixture: a legit NEW file under a REAL in-root directory — no
 * symlink involved at all. Returns `{root, rel, cleanup}` — never skipped.
 */
function buildLegitNewFileFixture() {
  const root = makeTmpRoot();
  fs.mkdirSync(path.join(root, 'real-dir'), { recursive: true });

  return {
    root,
    rel: 'real-dir/new-file.txt',
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

/**
 * (g)/(h-g) fixture: `root/inside-link` is a directory junction that resolves
 * back INSIDE root (to `root/real-dir2`) — not an escape; must be allowed.
 * Returns `{root, rel, cleanup}`, or `null` if the test was skipped.
 */
function buildInsideSymlinkFixture(t) {
  const root = makeTmpRoot();
  const realDir = path.join(root, 'real-dir2');
  fs.mkdirSync(realDir, { recursive: true });
  writeFile(root, 'real-dir2/target.txt', 'inside content\n');
  const linkPath = path.join(root, 'inside-link');

  if (!createDirLinkOrSkip(t, realDir, linkPath)) {
    fs.rmSync(root, { recursive: true, force: true });
    return null;
  }

  return {
    root,
    rel: 'inside-link/target.txt',
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

/**
 * (i)/(h-i) fixture: `root/dangling-link` is a directory junction/symlink
 * pointing at a sibling `outside/never-created` target that is NEVER
 * created — a dangling link. Regression fixture for the
 * `nearestExistingAncestor` bug: an `fs.existsSync`-based walk FOLLOWS the
 * link, sees a dangling target as "does not exist", and steps PAST the link
 * itself to its parent — missing the escape entirely, because it never
 * `realpathSync`-checks the link. Returns `{root, rel, cleanup}`, or `null`
 * if the test was skipped.
 */
function buildDanglingLinkFixture(t) {
  const parent = makeTmpRoot();
  const root = path.join(parent, 'root');
  const outside = path.join(parent, 'outside');
  const neverCreatedTarget = path.join(outside, 'never-created');
  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  // neverCreatedTarget is intentionally NEVER created — the link is dangling.
  const linkPath = path.join(root, 'dangling-link');

  if (!createDirLinkOrSkip(t, neverCreatedTarget, linkPath)) {
    fs.rmSync(parent, { recursive: true, force: true });
    return null;
  }

  return {
    root,
    rel: 'dangling-link/newfile.txt',
    cleanup: () => fs.rmSync(parent, { recursive: true, force: true }),
  };
}

// --- resolveInsideRoot(): the throwing guard --------------------------------

test('(d) resolveInsideRoot(): throws when dest is a symlink escaping root', (t) => {
  const fx = buildEscapingFileSymlinkFixture(t);
  if (!fx) {
    return;
  }
  try {
    assert.throws(() => resolveInsideRoot(fx.root, fx.rel));
  } finally {
    fx.cleanup();
  }
});

test(
  '(e) resolveInsideRoot(): throws when dest is a new file whose existing parent is an escaping junction',
  (t) => {
    const fx = buildEscapingParentJunctionFixture(t);
    if (!fx) {
      return;
    }
    try {
      assert.throws(() => resolveInsideRoot(fx.root, fx.rel));
    } finally {
      fx.cleanup();
    }
  }
);

test('(f) resolveInsideRoot(): returns dest for a legit new file under a real in-root dir (no throw)', () => {
  const fx = buildLegitNewFileFixture();
  try {
    let dest;
    assert.doesNotThrow(() => {
      dest = resolveInsideRoot(fx.root, fx.rel);
    });
    assert.equal(dest, path.resolve(fx.root, fx.rel));
    assert.equal(
      fs.existsSync(dest),
      false,
      'resolveInsideRoot only resolves the path — it must not create the file itself'
    );
  } finally {
    fx.cleanup();
  }
});

test('(g) resolveInsideRoot(): allows a symlink resolving back INSIDE root (no throw)', (t) => {
  const fx = buildInsideSymlinkFixture(t);
  if (!fx) {
    return;
  }
  try {
    let dest;
    assert.doesNotThrow(() => {
      dest = resolveInsideRoot(fx.root, fx.rel);
    });
    assert.equal(dest, path.resolve(fx.root, fx.rel));
  } finally {
    fx.cleanup();
  }
});

test(
  '(i) resolveInsideRoot(): throws for a new file behind a DANGLING in-root link (never-created target)',
  (t) => {
    const fx = buildDanglingLinkFixture(t);
    if (!fx) {
      return;
    }
    try {
      assert.throws(() => resolveInsideRoot(fx.root, fx.rel));
    } finally {
      fx.cleanup();
    }
  }
);

test(
  'resolveInsideRoot(): refuses a "../" lexical escape and an absolute path outside root; accepts + resolves a legit in-root relPath (moved from test/shims.test.js — this tests the primitive, not shims-specific behaviour)',
  () => {
    const targetRoot = makeTmpRoot();
    try {
      assert.throws(() => resolveInsideRoot(targetRoot, '../../escaped.md'));
      assert.throws(() => resolveInsideRoot(targetRoot, path.join(os.tmpdir(), 'elsewhere.md')));
      assert.doesNotThrow(() => resolveInsideRoot(targetRoot, 'CLAUDE.md'));
      assert.equal(resolveInsideRoot(targetRoot, 'CLAUDE.md'), path.join(path.resolve(targetRoot), 'CLAUDE.md'));
    } finally {
      fs.rmSync(targetRoot, { recursive: true, force: true });
    }
  }
);

test('resolveInsideRoot(): throws for a root-equal candidate ("" or ".") — must not hand back root itself', () => {
  const targetRoot = makeTmpRoot();
  try {
    assert.throws(() => resolveInsideRoot(targetRoot, ''), /outside/i);
    assert.throws(() => resolveInsideRoot(targetRoot, '.'), /outside/i);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test(
  'isInsideRoot()/resolveInsideRoot(): refuse a sibling dir whose name is a prefix-superstring of root ("rootx")',
  () => {
    const parent = makeTmpRoot();
    const root = path.join(parent, 'root');
    fs.mkdirSync(root, { recursive: true });
    try {
      assert.equal(isInsideRoot(root, '../rootx/evil.txt'), false);
      assert.throws(() => resolveInsideRoot(root, '../rootx/evil.txt'));
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  }
);

// --- isRealpathInsideRoot(): the non-throwing boolean sibling ---------------
// (h) — must return the SAME matching booleans as (d)-(g) above, but NEVER
// throw, for every one of those scenarios.

test('(h-d) isRealpathInsideRoot(): returns false, without throwing, for an escaping file-symlink dest', (t) => {
  const fx = buildEscapingFileSymlinkFixture(t);
  if (!fx) {
    return;
  }
  try {
    let result;
    assert.doesNotThrow(() => {
      result = isRealpathInsideRoot(fx.root, fx.rel);
    });
    assert.equal(result, false);
  } finally {
    fx.cleanup();
  }
});

test(
  '(h-e) isRealpathInsideRoot(): returns false, without throwing, for a new file behind an escaping parent junction',
  (t) => {
    const fx = buildEscapingParentJunctionFixture(t);
    if (!fx) {
      return;
    }
    try {
      let result;
      assert.doesNotThrow(() => {
        result = isRealpathInsideRoot(fx.root, fx.rel);
      });
      assert.equal(result, false);
    } finally {
      fx.cleanup();
    }
  }
);

test('(h-f) isRealpathInsideRoot(): returns true for a legit new file under a real in-root dir', () => {
  const fx = buildLegitNewFileFixture();
  try {
    let result;
    assert.doesNotThrow(() => {
      result = isRealpathInsideRoot(fx.root, fx.rel);
    });
    assert.equal(result, true);
  } finally {
    fx.cleanup();
  }
});

test('(h-g) isRealpathInsideRoot(): returns true for a symlink resolving back INSIDE root', (t) => {
  const fx = buildInsideSymlinkFixture(t);
  if (!fx) {
    return;
  }
  try {
    let result;
    assert.doesNotThrow(() => {
      result = isRealpathInsideRoot(fx.root, fx.rel);
    });
    assert.equal(result, true);
  } finally {
    fx.cleanup();
  }
});

test(
  '(h-i) isRealpathInsideRoot(): returns false, without throwing, for a new file behind a DANGLING in-root link',
  (t) => {
    const fx = buildDanglingLinkFixture(t);
    if (!fx) {
      return;
    }
    try {
      let result;
      assert.doesNotThrow(() => {
        result = isRealpathInsideRoot(fx.root, fx.rel);
      });
      assert.equal(result, false, 'a dangling in-root link must not be treated as safely contained');
    } finally {
      fx.cleanup();
    }
  }
);
