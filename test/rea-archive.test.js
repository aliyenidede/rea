'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { archiveLegacyRea } = require('../src/rea-archive.js');
const { createDirLinkOrSkip } = require('./helpers/symlink-fixtures');

/** Creates a unique tmp dir under the OS temp dir; returns its absolute path. */
function makeTmpRoot(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix || 'rea-archive-test-'));
}

/** Writes `content` to `relPath` under `root`, creating parent dirs as needed. */
function writeFile(root, relPath, content) {
  const abs = path.join(root, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content ?? 'content\n', 'utf8');
  return abs;
}

/**
 * Builds a fixture with a NESTED legacy log entry, a legacy lessons file, and
 * a typed-memory note — the exact shape the RED spec describes. Returns the
 * fresh targetRoot's absolute path.
 */
function buildLegacyFixture() {
  const targetRoot = makeTmpRoot();
  writeFile(targetRoot, '.rea/log/2026-01/x.md', 'legacy log entry\n');
  writeFile(targetRoot, '.rea/lessons.md', 'legacy lessons\n');
  writeFile(targetRoot, '.rea/knowledge/k.md', 'typed knowledge note\n');
  return targetRoot;
}

/**
 * Recursively snapshots every DIRECTORY and FILE under `root`, relative to
 * `root` (forward-slash). Files are captured with their raw bytes. Used to
 * prove a dry run performs NO writes at all — not just "no new files", but
 * no new directories either (specifically: no stray `.rea/_archive/`).
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

test('archiveLegacyRea(): archives nested .rea/log/ + .rea/lessons.md under .rea/_archive/, preserving structure; typed dir untouched; nothing deleted', () => {
  const targetRoot = buildLegacyFixture();
  try {
    const result = archiveLegacyRea(targetRoot);

    // --- the archived destinations exist, with the original content, and
    // relative structure preserved ---
    const archivedLog = path.join(targetRoot, '.rea', '_archive', 'log', '2026-01', 'x.md');
    const archivedLessons = path.join(targetRoot, '.rea', '_archive', 'lessons.md');
    assert.ok(fs.existsSync(archivedLog), 'expected .rea/_archive/log/2026-01/x.md to exist');
    assert.equal(fs.readFileSync(archivedLog, 'utf8'), 'legacy log entry\n');
    assert.ok(fs.existsSync(archivedLessons), 'expected .rea/_archive/lessons.md to exist');
    assert.equal(fs.readFileSync(archivedLessons, 'utf8'), 'legacy lessons\n');

    // --- the originals are gone from their old paths (moved, not copied) ---
    assert.equal(
      fs.existsSync(path.join(targetRoot, '.rea', 'log', '2026-01', 'x.md')),
      false,
      'the legacy log file must no longer exist at its old path'
    );
    assert.equal(
      fs.existsSync(path.join(targetRoot, '.rea', 'lessons.md')),
      false,
      'the legacy lessons file must no longer exist at its old path'
    );

    // --- FIX D: the now-empty legacy .rea/log/ tree is cleaned up ---
    assert.equal(
      fs.existsSync(path.join(targetRoot, '.rea', 'log')),
      false,
      '.rea/log/ must be removed once every file under it has been archived'
    );

    // --- the typed .rea/knowledge/k.md note is completely untouched ---
    const typedNote = path.join(targetRoot, '.rea', 'knowledge', 'k.md');
    assert.ok(fs.existsSync(typedNote), 'the typed knowledge note must survive');
    assert.equal(fs.readFileSync(typedNote, 'utf8'), 'typed knowledge note\n');

    // --- moved names both archived destinations; failed/skipped are empty ---
    assert.deepEqual(
      result.moved.slice().sort(),
      ['.rea/_archive/lessons.md', '.rea/_archive/log/2026-01/x.md'].sort()
    );
    assert.deepEqual(result.failed, []);
    assert.deepEqual(result.skipped, []);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('archiveLegacyRea(): a second run is a no-op', () => {
  const targetRoot = buildLegacyFixture();
  try {
    const first = archiveLegacyRea(targetRoot);
    assert.ok(first.moved.length > 0, 'sanity: the first run actually archived something');

    const second = archiveLegacyRea(targetRoot);
    assert.deepEqual(second.moved, []);
    assert.deepEqual(second.failed, []);
    assert.deepEqual(second.skipped, []);

    // still no data loss — the archived content survives the second run too
    assert.equal(
      fs.readFileSync(path.join(targetRoot, '.rea', '_archive', 'lessons.md'), 'utf8'),
      'legacy lessons\n'
    );
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('archiveLegacyRea(): a host with no legacy memory (only typed dirs) is a no-op', () => {
  const targetRoot = makeTmpRoot();
  try {
    writeFile(targetRoot, '.rea/knowledge/k.md', 'typed knowledge note\n');
    assert.equal(fs.existsSync(path.join(targetRoot, '.rea', 'log')), false, 'sanity: no legacy log dir');
    assert.equal(
      fs.existsSync(path.join(targetRoot, '.rea', 'lessons.md')),
      false,
      'sanity: no legacy lessons file'
    );

    const result = archiveLegacyRea(targetRoot);

    assert.deepEqual(result.moved, []);
    assert.deepEqual(result.failed, []);
    assert.deepEqual(result.skipped, []);
    assert.equal(
      fs.existsSync(path.join(targetRoot, '.rea', '_archive')),
      false,
      'no .rea/_archive/ dir should be created when there is nothing to archive'
    );
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('archiveLegacyRea(target, {dryRun:true}): returns the same {moved} but performs NO writes at all', () => {
  const targetRoot = buildLegacyFixture();
  try {
    const before = snapshotTree(targetRoot);

    const dryResult = archiveLegacyRea(targetRoot, { dryRun: true });

    assert.deepEqual(
      dryResult.moved.slice().sort(),
      ['.rea/_archive/lessons.md', '.rea/_archive/log/2026-01/x.md'].sort()
    );
    assert.deepEqual(dryResult.failed, []);
    assert.deepEqual(dryResult.skipped, []);

    const after = snapshotTree(targetRoot);

    assert.deepEqual(
      [...after.dirs].sort(),
      [...before.dirs].sort(),
      'dry run must not create or remove any directory'
    );
    assert.deepEqual(
      [...after.files.keys()].sort(),
      [...before.files.keys()].sort(),
      'dry run must not create or remove any file'
    );
    for (const [relPath, beforeBytes] of before.files) {
      assert.equal(
        Buffer.compare(beforeBytes, after.files.get(relPath)),
        0,
        `${relPath} must be byte-identical after a dry run`
      );
    }
    assert.equal(
      fs.existsSync(path.join(targetRoot, '.rea', '_archive')),
      false,
      'dry run must not create a .rea/_archive/ dir'
    );
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// FIX A (CRITICAL, data loss) — never overwrite an existing archive
// destination. Regression for: .rea/lessons.md is a single ACCUMULATING file
// (legacy rea-wrap keeps appending); a naive second archive of a newer batch
// would have clobbered an earlier archived batch, losing it permanently.
// ---------------------------------------------------------------------------

test('FIX A regression: an existing archive destination is never clobbered — the conflicting pair is skipped, not moved', () => {
  const targetRoot = makeTmpRoot();
  try {
    // A previous archive run already moved an OLDER lessons.md batch here.
    writeFile(targetRoot, '.rea/_archive/lessons.md', 'OLDER archived batch\n');
    // The legacy user, still on the old CLI, kept appending and now has a
    // NEWER batch sitting at the live legacy path.
    writeFile(targetRoot, '.rea/lessons.md', 'NEWER live batch\n');

    const result = archiveLegacyRea(targetRoot);

    // neither side was touched: the archived history survives byte-for-byte,
    // and the newer live file is left exactly where it was (nothing lost on
    // either side)
    assert.equal(
      fs.readFileSync(path.join(targetRoot, '.rea', '_archive', 'lessons.md'), 'utf8'),
      'OLDER archived batch\n',
      'a previously-archived destination must never be overwritten'
    );
    assert.equal(
      fs.readFileSync(path.join(targetRoot, '.rea', 'lessons.md'), 'utf8'),
      'NEWER live batch\n',
      'the conflicting source must be left in place, not lost'
    );

    assert.deepEqual(result.moved, []);
    assert.deepEqual(result.failed, []);
    assert.deepEqual(result.skipped, ['.rea/_archive/lessons.md']);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('FIX A regression (dry run): predicts the same skip and still performs no writes', () => {
  const targetRoot = makeTmpRoot();
  try {
    writeFile(targetRoot, '.rea/_archive/lessons.md', 'OLDER archived batch\n');
    writeFile(targetRoot, '.rea/lessons.md', 'NEWER live batch\n');

    const before = snapshotTree(targetRoot);
    const result = archiveLegacyRea(targetRoot, { dryRun: true });
    const after = snapshotTree(targetRoot);

    assert.deepEqual(result.moved, []);
    assert.deepEqual(result.failed, []);
    assert.deepEqual(result.skipped, ['.rea/_archive/lessons.md']);

    assert.deepEqual([...after.dirs].sort(), [...before.dirs].sort());
    assert.deepEqual([...after.files.keys()].sort(), [...before.files.keys()].sort());
    for (const [relPath, beforeBytes] of before.files) {
      assert.equal(Buffer.compare(beforeBytes, after.files.get(relPath)), 0);
    }
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// FIX B (HIGH, CWE-59) — the two top-level source checks must use lstatSync,
// never statSync, so a symlink/junction planted at either fixed path is
// never followed.
// ---------------------------------------------------------------------------

test('FIX B regression: a `.rea/log` that is a directory JUNCTION to `.rea/knowledge` is never followed — typed files untouched, nothing moved', (t) => {
  const targetRoot = makeTmpRoot();
  const knowledgeDir = path.join(targetRoot, '.rea', 'knowledge');
  const logLinkPath = path.join(targetRoot, '.rea', 'log');
  try {
    fs.mkdirSync(knowledgeDir, { recursive: true });
    fs.writeFileSync(path.join(knowledgeDir, 'k.md'), 'typed knowledge note\n', 'utf8');

    if (!createDirLinkOrSkip(t, knowledgeDir, logLinkPath)) {
      return;
    }

    const result = archiveLegacyRea(targetRoot);

    assert.deepEqual(result.moved, [], 'nothing should be moved through the .rea/log junction');
    assert.deepEqual(result.failed, []);
    assert.deepEqual(result.skipped, []);
    assert.equal(
      fs.readFileSync(path.join(knowledgeDir, 'k.md'), 'utf8'),
      'typed knowledge note\n',
      'the real typed-memory file, reached only via the junction, must survive untouched'
    );
    assert.equal(
      fs.existsSync(path.join(targetRoot, '.rea', '_archive')),
      false,
      'nothing should have been archived through the junction'
    );
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('FIX B regression (external target): a `.rea/log` junction pointing OUTSIDE targetRoot is never followed — nothing is pulled in', (t) => {
  const targetRoot = makeTmpRoot();
  const outsideRoot = makeTmpRoot('rea-archive-test-outside-');
  const logLinkPath = path.join(targetRoot, '.rea', 'log');
  try {
    fs.mkdirSync(path.join(targetRoot, '.rea'), { recursive: true });
    writeFile(outsideRoot, 'external-secret.md', 'do not move me via junction\n');

    if (!createDirLinkOrSkip(t, outsideRoot, logLinkPath)) {
      return;
    }

    const result = archiveLegacyRea(targetRoot);

    assert.deepEqual(result.moved, [], 'nothing should be moved through the .rea/log junction');
    assert.deepEqual(result.failed, []);
    assert.deepEqual(result.skipped, []);
    assert.ok(
      fs.existsSync(path.join(outsideRoot, 'external-secret.md')),
      'the external file, reached only via the junction, must stay exactly where it is'
    );
    assert.equal(
      fs.existsSync(path.join(targetRoot, '.rea', '_archive')),
      false,
      'nothing should have been archived through the junction'
    );
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
    fs.rmSync(outsideRoot, { recursive: true, force: true });
  }
});

test('FIX F regression (intermediate component): a `.rea` PARENT junction pointing OUTSIDE targetRoot is refused on the source side — no out-of-root empty-dir deletion (FIX D) and nothing pulled in', (t) => {
  const targetRoot = makeTmpRoot();
  const outsideRoot = makeTmpRoot('rea-archive-test-outside-parent-');
  // The `.rea` PARENT itself is the junction — the component FIX B's
  // final-component lstat cannot see through. Under the (pre-FIX-F) gate,
  // path.join(targetRoot, '.rea/log') would resolve via this junction to a
  // real dir outside root, FIX B would pass, and FIX D would rmdir the empty
  // dir below OUTSIDE the project root.
  const reaLinkPath = path.join(targetRoot, '.rea');
  try {
    // A genuine, EMPTY directory under the junction target's `log/` — exactly
    // what FIX D's removeEmptyDirsBottomUp would delete if it ran here.
    fs.mkdirSync(path.join(outsideRoot, 'log', 'empty-sub'), { recursive: true });
    // A real lessons file under the junction target too, to prove the source
    // enumeration/move side is refused as well.
    writeFile(outsideRoot, 'lessons.md', 'external lessons — must not move\n');

    if (!createDirLinkOrSkip(t, outsideRoot, reaLinkPath)) {
      return;
    }

    const result = archiveLegacyRea(targetRoot);

    assert.deepEqual(result.moved, [], 'nothing should be moved through the .rea parent junction');
    assert.deepEqual(result.failed, []);
    assert.deepEqual(result.skipped, []);
    // The load-bearing FIX F assertion: the empty dir OUTSIDE the project root
    // must survive — FIX D must never have run against the escaping source.
    assert.ok(
      fs.existsSync(path.join(outsideRoot, 'log', 'empty-sub')),
      'the empty dir outside root must NOT be rmdir-ed via the .rea parent junction (FIX D must not run on an escaping source)'
    );
    assert.ok(
      fs.existsSync(path.join(outsideRoot, 'log')),
      'the outside `log` dir must survive too'
    );
    assert.ok(
      fs.existsSync(path.join(outsideRoot, 'lessons.md')),
      'the external lessons file, reached only via the junction, must stay exactly where it is'
    );
    // `.rea/_archive` resolves through the junction to outsideRoot/_archive —
    // it must never have been created (no archive happened at all).
    assert.equal(
      fs.existsSync(path.join(outsideRoot, '_archive')),
      false,
      'nothing should have been archived through the .rea parent junction'
    );
  } finally {
    // Remove the junction FIRST (rm of targetRoot would otherwise recurse into
    // outsideRoot through it on some platforms).
    try {
      fs.unlinkSync(reaLinkPath);
    } catch {
      try {
        fs.rmdirSync(reaLinkPath);
      } catch {
        /* best-effort teardown */
      }
    }
    fs.rmSync(targetRoot, { recursive: true, force: true });
    fs.rmSync(outsideRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// FIX C (resilience) — one locked file (EBUSY on rename) must not abort the
// rest of the archive; it lands in `failed`, source left untouched. Also
// exercises FIX D's "never remove a non-empty dir" guard: the subdir still
// holding the failed file (and .rea/log itself) must survive the cleanup
// pass.
// ---------------------------------------------------------------------------

test('FIX C regression: a locked file (EBUSY on rename) does not abort the whole archive — recorded in `failed`, source left in place', () => {
  const targetRoot = buildLegacyFixture();
  const fsModule = require('node:fs');
  const originalRenameSync = fsModule.renameSync;
  try {
    const lockedSourceAbs = path.resolve(path.join(targetRoot, '.rea', 'log', '2026-01', 'x.md'));

    fsModule.renameSync = (src, dest) => {
      if (path.resolve(src) === lockedSourceAbs) {
        const err = new Error('EBUSY: resource busy or locked');
        err.code = 'EBUSY';
        throw err;
      }
      return originalRenameSync(src, dest);
    };

    const result = archiveLegacyRea(targetRoot);

    // the good candidate (lessons.md) is still archived
    assert.ok(
      fs.existsSync(path.join(targetRoot, '.rea', '_archive', 'lessons.md')),
      'the good candidate must still be archived despite the locked one failing'
    );
    // the locked candidate is left exactly where it was — not lost
    assert.ok(
      fs.existsSync(path.join(targetRoot, '.rea', 'log', '2026-01', 'x.md')),
      'the locked candidate must remain at its original path, not lost'
    );
    assert.equal(
      fs.existsSync(path.join(targetRoot, '.rea', '_archive', 'log', '2026-01', 'x.md')),
      false,
      'the locked candidate must not have been archived'
    );
    // FIX D guard: a dir still holding the locked file must never be removed
    assert.ok(
      fs.existsSync(path.join(targetRoot, '.rea', 'log')),
      '.rea/log must survive since it (transitively) still holds the locked file'
    );

    assert.deepEqual(result.moved, ['.rea/_archive/lessons.md']);
    assert.deepEqual(result.failed, ['.rea/_archive/log/2026-01/x.md']);
    assert.deepEqual(result.skipped, []);
  } finally {
    fsModule.renameSync = originalRenameSync;
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// FIX E (HIGH, CWE-59, destination side) — a pre-planted `.rea/_archive`
// symlink/junction pointing outside targetRoot must be refused as a move
// destination BEFORE any write through it; the escape is reported in
// `failed`, never silently followed. Mirrors the FIX B junction tests, but
// the link is planted at the DESTINATION this time.
// ---------------------------------------------------------------------------

test('FIX E regression: a `.rea/_archive` that is a directory JUNCTION to an EXTERNAL dir is refused as a move destination — nothing escapes, sources stay, reported in `failed`', (t) => {
  const targetRoot = makeTmpRoot();
  const outsideRoot = makeTmpRoot('rea-archive-test-outside-');
  const archiveLinkPath = path.join(targetRoot, '.rea', '_archive');
  try {
    writeFile(targetRoot, '.rea/lessons.md', 'legacy lessons\n');
    writeFile(targetRoot, '.rea/log/x.md', 'legacy log entry\n');

    if (!createDirLinkOrSkip(t, outsideRoot, archiveLinkPath)) {
      return;
    }

    const result = archiveLegacyRea(targetRoot);

    // nothing escaped to the external target of the junction
    assert.deepEqual(
      fs.readdirSync(outsideRoot),
      [],
      'the external target of the .rea/_archive junction must receive nothing'
    );

    // both legacy sources are left exactly where they were — nothing lost,
    // nothing moved through the link
    assert.equal(
      fs.readFileSync(path.join(targetRoot, '.rea', 'lessons.md'), 'utf8'),
      'legacy lessons\n',
      'the legacy lessons source must survive untouched'
    );
    assert.equal(
      fs.readFileSync(path.join(targetRoot, '.rea', 'log', 'x.md'), 'utf8'),
      'legacy log entry\n',
      'the legacy log source must survive untouched'
    );

    assert.deepEqual(result.moved, []);
    assert.deepEqual(result.skipped, []);
    assert.deepEqual(
      result.failed.slice().sort(),
      ['.rea/_archive/lessons.md', '.rea/_archive/log/x.md'].sort()
    );
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
    fs.rmSync(outsideRoot, { recursive: true, force: true });
  }
});

test('FIX E: a NORMAL (non-symlinked) pre-existing .rea/_archive dir does not block a legitimate archive', () => {
  const targetRoot = buildLegacyFixture();
  try {
    // Pre-create the archive root as an ordinary real directory (e.g. left
    // over from an earlier partial run) — not a symlink/junction.
    fs.mkdirSync(path.join(targetRoot, '.rea', '_archive'), { recursive: true });

    const result = archiveLegacyRea(targetRoot);

    assert.deepEqual(
      result.moved.slice().sort(),
      ['.rea/_archive/lessons.md', '.rea/_archive/log/2026-01/x.md'].sort()
    );
    assert.deepEqual(result.failed, []);
    assert.deepEqual(result.skipped, []);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// unit 11-6 regression — DANGLING escaping `.rea/_archive` junction (the gap
// closed by migrating the destination-realpath guard onto the shared
// `src/safe-path.js` `isRealpathInsideRoot`, which walks its nearest-existing-
// ancestor via `fs.lstatSync`). The module's PRIOR bespoke guard
// (`isDestinationRealpathInsideRoot`) walked its ancestor chain via
// `fs.existsSync`, which FOLLOWS a symlink/junction and reports a dangling
// one's target as "does not exist" — so the walk stepped PAST the link
// itself, straight to `.rea` (an in-root real directory), and never
// `realpathSync`-checked the link — silently treating an escaping dangling
// junction as safely contained. `safePath.isRealpathInsideRoot` uses
// `fs.lstatSync` instead, which reports a dangling link as "exists" (an entry
// is present, even though its target is not), so the walk stops AT the link
// and `realpathSync`s it — catching the escape.
// ---------------------------------------------------------------------------

test('unit 11-6 regression: a `.rea/_archive` that is a DANGLING directory JUNCTION (target never created) is refused as a move destination — nothing escapes, source stays, reported in `failed`', (t) => {
  const targetRoot = makeTmpRoot();
  const outsideRoot = makeTmpRoot('rea-archive-test-outside-');
  const neverCreatedTarget = path.join(outsideRoot, 'never-created');
  const archiveLinkPath = path.join(targetRoot, '.rea', '_archive');
  try {
    writeFile(targetRoot, '.rea/lessons.md', 'legacy lessons\n');

    // neverCreatedTarget is intentionally NEVER created — the junction is
    // dangling: its target does not exist on disk.
    if (!createDirLinkOrSkip(t, neverCreatedTarget, archiveLinkPath)) {
      return;
    }

    const result = archiveLegacyRea(targetRoot);

    // nothing was ever created at (or under) the dangling target
    assert.equal(
      fs.existsSync(neverCreatedTarget),
      false,
      'the dangling junction target must still not exist — nothing should have been created through it'
    );
    assert.deepEqual(
      fs.readdirSync(outsideRoot),
      [],
      'the outside dir the dangling junction lives under must receive nothing'
    );

    // the legacy source is left exactly where it was — nothing lost, nothing
    // moved through the link
    assert.equal(
      fs.readFileSync(path.join(targetRoot, '.rea', 'lessons.md'), 'utf8'),
      'legacy lessons\n',
      'the legacy lessons source must survive untouched'
    );

    assert.deepEqual(result.moved, [], 'the dangling destination must never be reported as moved');
    assert.deepEqual(result.skipped, []);
    assert.deepEqual(
      result.failed,
      ['.rea/_archive/lessons.md'],
      'the dangling-junction destination must be refused and recorded in `failed`, not silently allowed'
    );
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
    fs.rmSync(outsideRoot, { recursive: true, force: true });
  }
});

test('unit 11-6 regression (dry-run): a dangling .rea/_archive junction is predicted as failed, not moved', (t) => {
  // Same dangling-junction fixture as the real-run test above, but on a DRY
  // RUN — moveFile() never executes, so the OS-level ENOENT (thrown when a
  // real rename/mkdir traverses a dangling junction) never fires to mask a
  // wrong verdict. This is the assertion that actually discriminates the
  // fixed `safePath.isRealpathInsideRoot` guard from the OLD, reverted
  // `existsSync`-based bespoke guard: on a real run, the old guard's wrong
  // "safe" verdict would still get caught downstream by moveFile()'s own
  // ENOENT and land in `failed` anyway — masking the guard bug. On a dry
  // run there is no downstream write to catch the mistake, so the old guard
  // would wrongly predict `moved`, while the fixed guard correctly predicts
  // `failed`.
  const targetRoot = makeTmpRoot();
  const outsideRoot = makeTmpRoot('rea-archive-test-outside-');
  const neverCreatedTarget = path.join(outsideRoot, 'never-created');
  const archiveLinkPath = path.join(targetRoot, '.rea', '_archive');
  try {
    writeFile(targetRoot, '.rea/lessons.md', 'legacy lessons\n');

    // neverCreatedTarget is intentionally NEVER created — the junction is
    // dangling: its target does not exist on disk.
    if (!createDirLinkOrSkip(t, neverCreatedTarget, archiveLinkPath)) {
      return;
    }

    const result = archiveLegacyRea(targetRoot, { dryRun: true });

    // a dry run writes nothing at all — the dangling target still doesn't
    // exist, and the outside dir it lives under received nothing
    assert.equal(
      fs.existsSync(neverCreatedTarget),
      false,
      'the dangling junction target must still not exist — a dry run performs no writes'
    );
    assert.deepEqual(
      fs.readdirSync(outsideRoot),
      [],
      'the outside dir the dangling junction lives under must receive nothing on a dry run'
    );

    // the legacy source is left exactly where it was — a dry run writes
    // nothing on either side
    assert.equal(
      fs.readFileSync(path.join(targetRoot, '.rea', 'lessons.md'), 'utf8'),
      'legacy lessons\n',
      'the legacy lessons source must survive untouched'
    );

    // THE discriminating assertion: the escaping dangling destination must
    // be PREDICTED as failed, never as moved. Against the reverted
    // `existsSync`-based guard this goes RED (the old guard wrongly predicts
    // `moved` on a dry run, since there is no downstream write to catch it).
    assert.deepEqual(
      result.moved,
      [],
      'the dangling destination must never be PREDICTED as moved on a dry run'
    );
    assert.deepEqual(result.skipped, []);
    assert.deepEqual(
      result.failed,
      ['.rea/_archive/lessons.md'],
      'the dangling-junction destination must be predicted as failed, not silently predicted as moved'
    );
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
    fs.rmSync(outsideRoot, { recursive: true, force: true });
  }
});
