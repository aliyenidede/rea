'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  prune,
  isProtected,
  isInsideRoot,
  toCanonicalRel,
  DENY_PREFIXES,
  DENY_FILES,
} = require('../src/prune.js');
const { RETIRED_FILES } = require('../src/retired-list.js');
const { handleLinkCreationFailure, createDirLinkOrSkip } = require('./helpers/symlink-fixtures');

/** Creates a unique tmp dir under the OS temp dir; returns its absolute path. */
function makeTmpRoot(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix || 'rea-prune-test-'));
}

/** Writes `content` to `relPath` under `root`, creating parent dirs as needed. */
function writeFile(root, relPath, content) {
  const abs = path.join(root, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content ?? 'content', 'utf8');
  return abs;
}

// --- (a) an owned-but-removed file is pruned -------------------------------

test('(a) an owned-but-removed file is deleted and reported', () => {
  const targetRoot = makeTmpRoot();
  try {
    const abs = writeFile(targetRoot, '.claude/commands/old-command.md');

    const { deleted } = prune({
      targetRoot,
      previouslyOwned: ['.claude/commands/old-command.md'],
      currentOwned: [],
      isBridge: false,
    });

    assert.equal(fs.existsSync(abs), false, 'the owned-but-removed file must be deleted');
    assert.deepEqual(deleted, ['.claude/commands/old-command.md']);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('(a) a file still present in currentOwned is NOT deleted', () => {
  const targetRoot = makeTmpRoot();
  try {
    const abs = writeFile(targetRoot, '.claude/commands/still-here.md');

    const { deleted } = prune({
      targetRoot,
      previouslyOwned: ['.claude/commands/still-here.md'],
      currentOwned: ['.claude/commands/still-here.md'],
      isBridge: false,
    });

    assert.equal(fs.existsSync(abs), true, 'a file still owned by the current template set must survive');
    assert.deepEqual(deleted, []);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// --- (b) an unowned user file survives --------------------------------------

test('(b) an unowned user file survives (never a candidate)', () => {
  const targetRoot = makeTmpRoot();
  try {
    const userFile = writeFile(targetRoot, 'notes.md', 'my own notes');
    const ownedRemoved = writeFile(targetRoot, '.claude/commands/old-command.md');

    const { deleted } = prune({
      targetRoot,
      previouslyOwned: ['.claude/commands/old-command.md'],
      currentOwned: [],
      isBridge: false,
    });

    assert.equal(fs.existsSync(userFile), true, 'a user file never in previouslyOwned must survive');
    assert.equal(fs.existsSync(ownedRemoved), false, 'the actual owned-and-removed file must still be deleted');
    assert.deepEqual(deleted, ['.claude/commands/old-command.md']);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// --- (c) new-schema typed memory paths are never deleted --------------------

test('(c) new-schema typed memory paths survive even if wrongly passed in as owned-but-removed', () => {
  const targetRoot = makeTmpRoot();
  try {
    const knowledge = writeFile(targetRoot, '.rea/knowledge/x.md');
    const decision = writeFile(targetRoot, '.rea/decisions/0001-x.md');
    const session = writeFile(targetRoot, '.rea/sessions/y.md');
    const planDir = path.join(targetRoot, '.rea/plans/0001-x');
    fs.mkdirSync(planDir, { recursive: true });
    const planFile = writeFile(targetRoot, '.rea/plans/0001-x/plan.md');

    const previouslyOwned = [
      '.rea/knowledge/x.md',
      '.rea/decisions/0001-x.md',
      '.rea/sessions/y.md',
      '.rea/plans/0001-x/',
    ];

    const { deleted } = prune({
      targetRoot,
      previouslyOwned,
      currentOwned: [], // wrongly "removed" from the current template set
      isBridge: false,
    });

    assert.equal(fs.existsSync(knowledge), true, '.rea/knowledge/ must never be pruned');
    assert.equal(fs.existsSync(decision), true, '.rea/decisions/ must never be pruned');
    assert.equal(fs.existsSync(session), true, '.rea/sessions/ must never be pruned');
    assert.equal(fs.existsSync(planDir), true, '.rea/plans/<slug>/ directory must never be pruned');
    assert.equal(fs.existsSync(planFile), true, 'a file inside .rea/plans/<slug>/ must never be pruned');
    assert.deepEqual(deleted, [], 'nothing should have been deleted');
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// --- (c2) legacy .rea/log/ + .rea/lessons.md survive (mid-migration host) --

test('(c2) legacy .rea/log/x.md and .rea/lessons.md survive even if wrongly passed in', () => {
  const targetRoot = makeTmpRoot();
  try {
    const logFile = writeFile(targetRoot, '.rea/log/2026-07-01.md');
    const lessons = writeFile(targetRoot, '.rea/lessons.md');

    const { deleted } = prune({
      targetRoot,
      previouslyOwned: ['.rea/log/2026-07-01.md', '.rea/lessons.md'],
      currentOwned: [],
      isBridge: false,
    });

    assert.equal(fs.existsSync(logFile), true, 'legacy .rea/log/ must never be pruned');
    assert.equal(fs.existsSync(lessons), true, 'legacy .rea/lessons.md must never be pruned');
    assert.deepEqual(deleted, []);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('(c2b) CLAUDE.md and .claude/settings.json survive even if wrongly passed in', () => {
  const targetRoot = makeTmpRoot();
  try {
    const claudeMd = writeFile(targetRoot, 'CLAUDE.md', 'user project instructions');
    const settings = writeFile(targetRoot, '.claude/settings.json', '{}');

    const { deleted } = prune({
      targetRoot,
      previouslyOwned: ['CLAUDE.md', '.claude/settings.json'],
      currentOwned: [],
      isBridge: false,
    });

    assert.equal(fs.existsSync(claudeMd), true, 'CLAUDE.md must never be pruned');
    assert.equal(fs.existsSync(settings), true, '.claude/settings.json must never be pruned');
    assert.deepEqual(deleted, []);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// --- (d) the one-time bridge deletes the retired list ----------------------

test('(d) on the one-time bridge (no manifest), the retired list is deleted', () => {
  const targetRoot = makeTmpRoot();
  try {
    const createdPaths = RETIRED_FILES.map((relPath) => writeFile(targetRoot, relPath));
    const survivor = writeFile(targetRoot, '.claude/commands/rea-plan.md'); // not in retired list

    const { deleted } = prune({
      targetRoot,
      previouslyOwned: [], // no manifest yet
      currentOwned: [],
      isBridge: true,
    });

    for (const abs of createdPaths) {
      assert.equal(fs.existsSync(abs), false, `retired file must be deleted: ${abs}`);
    }
    assert.equal(fs.existsSync(survivor), true, 'a non-retired file must survive the bridge prune');
    assert.deepEqual([...deleted].sort(), [...RETIRED_FILES].sort());
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('(d2) the bridge prune only deletes retired-list entries that actually exist on disk', () => {
  const targetRoot = makeTmpRoot();
  try {
    // Only create one of the retired files; the rest are absent.
    const onlyOne = writeFile(targetRoot, RETIRED_FILES[0]);

    const { deleted } = prune({
      targetRoot,
      previouslyOwned: [],
      currentOwned: [],
      isBridge: true,
    });

    assert.equal(fs.existsSync(onlyOne), false);
    assert.deepEqual(deleted, [RETIRED_FILES[0]]);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('(d3) isBridge=false never consults the retired list, even if the files exist', () => {
  const targetRoot = makeTmpRoot();
  try {
    const abs = writeFile(targetRoot, RETIRED_FILES[0]);

    const { deleted } = prune({
      targetRoot,
      previouslyOwned: [],
      currentOwned: [],
      isBridge: false,
    });

    assert.equal(fs.existsSync(abs), true, 'without isBridge, retired-list files are not touched');
    assert.deepEqual(deleted, []);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// --- (e) an escaping or absolute path is refused (containment) -------------

test('(e) a ../escape relative path is refused; the real external file survives', () => {
  const targetRoot = makeTmpRoot('rea-prune-test-inner-');
  const outsideRoot = makeTmpRoot('rea-prune-test-outside-');
  try {
    const externalFile = writeFile(outsideRoot, 'secret.md', 'do not delete me');
    const escapeRelPath = path
      .relative(targetRoot, externalFile)
      .replace(/\\/g, '/');
    // Sanity: this really is an escaping (parent-traversing) relative path.
    assert.ok(escapeRelPath.startsWith('..'), `expected an escaping path, got: ${escapeRelPath}`);

    const { deleted } = prune({
      targetRoot,
      previouslyOwned: [escapeRelPath],
      currentOwned: [],
      isBridge: false,
    });

    assert.equal(fs.existsSync(externalFile), true, 'an escaping path must never be unlinked');
    assert.deepEqual(deleted, []);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
    fs.rmSync(outsideRoot, { recursive: true, force: true });
  }
});

test('(e2) an absolute path outside targetRoot is refused; the real external file survives', () => {
  const targetRoot = makeTmpRoot('rea-prune-test-inner-');
  const outsideRoot = makeTmpRoot('rea-prune-test-outside-');
  try {
    const externalFile = writeFile(outsideRoot, 'secret2.md', 'do not delete me either');

    const { deleted } = prune({
      targetRoot,
      previouslyOwned: [externalFile], // absolute path, outside targetRoot
      currentOwned: [],
      isBridge: false,
    });

    assert.equal(fs.existsSync(externalFile), true, 'an absolute escaping path must never be unlinked');
    assert.deepEqual(deleted, []);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
    fs.rmSync(outsideRoot, { recursive: true, force: true });
  }
});

// --- isProtected() unit tests -----------------------------------------------

test('isProtected() blocks every deny-list prefix and exact file', () => {
  assert.equal(isProtected('.rea/knowledge/x.md'), true);
  assert.equal(isProtected('.rea/decisions/0001-x.md'), true);
  assert.equal(isProtected('.rea/sessions/y.md'), true);
  assert.equal(isProtected('.rea/plans/0001-x/'), true);
  assert.equal(isProtected('.rea/plans/0001-x/plan.md'), true);
  assert.equal(isProtected('.rea/plans'), true, 'the bare typed-memory dir itself must be protected');
  assert.equal(isProtected('.rea/log/2026-07-01.md'), true);
  assert.equal(isProtected('.rea/lessons.md'), true);
  assert.equal(isProtected('CLAUDE.md'), true);
  assert.equal(isProtected('.claude/settings.json'), true);
});

test('isProtected() does not block a normal owned template file', () => {
  assert.equal(isProtected('.claude/commands/rea-plan.md'), false);
  assert.equal(isProtected('core/principles.md'), false);
  assert.equal(isProtected('AGENTS.md'), false);
});

test('isProtected() does not false-positive on a similarly-prefixed but distinct path', () => {
  // '.rea/plans-backup.md' must NOT match the '.rea/plans/' prefix.
  assert.equal(isProtected('.rea/plans-backup.md'), false);
  assert.equal(isProtected('.rea/lessons-archive.md'), false);
});

test('DENY_PREFIXES and DENY_FILES are exported as module constants', () => {
  assert.ok(Array.isArray(DENY_PREFIXES));
  assert.ok(Array.isArray(DENY_FILES));
  assert.ok(DENY_PREFIXES.includes('.rea/knowledge/'));
  assert.ok(DENY_FILES.includes('CLAUDE.md'));
});

// --- isInsideRoot() unit tests ----------------------------------------------

test('isInsideRoot() accepts a normal relative path inside the root', () => {
  const targetRoot = makeTmpRoot();
  try {
    assert.equal(isInsideRoot(targetRoot, '.claude/commands/rea-plan.md'), true);
    assert.equal(isInsideRoot(targetRoot, 'core/principles.md'), true);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('isInsideRoot() refuses a ../ escaping path and an absolute path outside root', () => {
  const targetRoot = makeTmpRoot();
  try {
    assert.equal(isInsideRoot(targetRoot, '../escape/secret.md'), false);
    assert.equal(isInsideRoot(targetRoot, '../../etc/passwd'), false);

    const elsewhere = makeTmpRoot('rea-prune-test-elsewhere-');
    try {
      assert.equal(isInsideRoot(targetRoot, path.join(elsewhere, 'x.md')), false);
    } finally {
      fs.rmSync(elsewhere, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('isInsideRoot() refuses a root-equal candidate (targetRoot itself)', () => {
  const targetRoot = makeTmpRoot();
  try {
    assert.equal(isInsideRoot(targetRoot, ''), false, 'an empty relPath must not count as inside root');
    assert.equal(isInsideRoot(targetRoot, '.'), false, 'a "." relPath must not count as inside root');
    assert.equal(isInsideRoot(targetRoot, './'), false, 'a "./" relPath must not count as inside root');
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// --- toCanonicalRel() unit tests ---------------------------------------------

test('toCanonicalRel() collapses ".." segments and normalizes to forward-slash', () => {
  const targetRoot = makeTmpRoot();
  try {
    assert.equal(toCanonicalRel(targetRoot, 'x/../CLAUDE.md'), 'CLAUDE.md');
    assert.equal(toCanonicalRel(targetRoot, '.claude/commands/rea-plan.md'), '.claude/commands/rea-plan.md');
    assert.equal(toCanonicalRel(targetRoot, ''), '');
    assert.equal(toCanonicalRel(targetRoot, '.'), '');
    assert.equal(toCanonicalRel(targetRoot, './'), '');
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// --- FIX 1 (CRITICAL): a root-equal candidate must never reach rmSync ------
// Regression for: isInsideRoot's `=== resolvedRoot` allowance let a
// candidate of '', '.', or './' resolve to targetRoot itself, pass both
// guards, and fs.rmSync(targetRoot, {recursive:true,force:true}) would have
// deleted the entire project.

test('FIX1: a root-equal candidate ("", ".", "./") is refused; targetRoot and a file inside it survive', () => {
  for (const rootEqualCandidate of ['', '.', './']) {
    const targetRoot = makeTmpRoot();
    try {
      const innerFile = writeFile(targetRoot, 'keep-me.md', 'must survive');

      const { deleted } = prune({
        targetRoot,
        previouslyOwned: [rootEqualCandidate],
        currentOwned: [],
        isBridge: false,
      });

      assert.equal(fs.existsSync(targetRoot), true, `targetRoot must survive for candidate ${JSON.stringify(rootEqualCandidate)}`);
      assert.equal(
        fs.existsSync(innerFile),
        true,
        `a file inside targetRoot must survive for candidate ${JSON.stringify(rootEqualCandidate)}`
      );
      assert.deepEqual(deleted, [], `nothing should have been deleted for candidate ${JSON.stringify(rootEqualCandidate)}`);
    } finally {
      fs.rmSync(targetRoot, { recursive: true, force: true });
    }
  }
});

// --- FIX 2 (CRITICAL): the deny-list must be checked against the SAME -----
// canonical form that gets deleted, not the raw candidate string.
// Regression for: isProtected() matched the raw candidate, but the delete
// target was path.resolve(targetRoot, relPath) (which collapses '..' and
// honors absolute paths) — so a non-canonical spelling of a protected file
// bypassed the deny-list while isInsideRoot said "inside".

test('FIX2: a "../"-laden candidate that canonicalizes to a protected file does not delete the real file', () => {
  const targetRoot = makeTmpRoot();
  try {
    const claudeMd = writeFile(targetRoot, 'CLAUDE.md', 'user project instructions');

    const { deleted } = prune({
      targetRoot,
      previouslyOwned: ['x/../CLAUDE.md'],
      currentOwned: [],
      isBridge: false,
    });

    assert.equal(fs.existsSync(claudeMd), true, 'the real CLAUDE.md must survive a "../"-laden alias candidate');
    assert.deepEqual(deleted, []);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('FIX2: an absolute-path candidate that resolves inside a denied prefix does not delete the real file', () => {
  const targetRoot = makeTmpRoot();
  try {
    const knowledgeFile = writeFile(targetRoot, '.rea/knowledge/n.md', 'real knowledge content');
    const absoluteCandidate = path.join(targetRoot, '.rea/knowledge/n.md');

    const { deleted } = prune({
      targetRoot,
      previouslyOwned: [absoluteCandidate],
      currentOwned: [],
      isBridge: false,
    });

    assert.equal(fs.existsSync(knowledgeFile), true, 'the real .rea/knowledge/ file must survive an absolute-path candidate');
    assert.deepEqual(deleted, []);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// --- FIX 3 (HIGH): the deny-list comparison is case-folded ------------------
// Regression for: on a case-insensitive filesystem (Windows, default macOS),
// 'claude.md' resolves to the same file as 'CLAUDE.md', but the deny-list
// string compare was case-sensitive, so it wasn't protected.

test('FIX3: a lowercase-spelled candidate ("claude.md") does not delete the real CLAUDE.md', () => {
  const targetRoot = makeTmpRoot();
  try {
    const claudeMd = writeFile(targetRoot, 'CLAUDE.md', 'user project instructions');

    const { deleted } = prune({
      targetRoot,
      previouslyOwned: ['claude.md'],
      currentOwned: [],
      isBridge: false,
    });

    // Assert against the REAL (uppercase) file, so this holds regardless of
    // whether the host filesystem is case-sensitive or case-insensitive.
    assert.equal(fs.existsSync(claudeMd), true, 'the real CLAUDE.md must never be deleted, regardless of candidate case');
    assert.deepEqual(deleted, []);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('isProtected() case-folds the comparison', () => {
  assert.equal(isProtected('claude.md'), true);
  assert.equal(isProtected('CLAUDE.MD'), true);
  assert.equal(isProtected('.REA/KNOWLEDGE/x.md'), true);
});

// --- FIX 4 (IMPORTANT): a delete failure is caught, not thrown -------------
// Regression for: fs.rmSync in the loop had no try/catch; a locked/
// permission-denied file (EBUSY/EPERM) would throw and abort the whole
// prune, contradicting the module's "skip, not throw" invariant.

test('FIX4: a delete failure on one candidate does not abort a subsequent good candidate; failures land in `failed`', () => {
  const targetRoot = makeTmpRoot();
  const fsModule = require('node:fs');
  const originalRmSync = fsModule.rmSync;
  try {
    const goodAbs = writeFile(targetRoot, 'good-file.md');
    const badAbs = writeFile(targetRoot, 'bad-file.md');
    const badAbsResolved = path.resolve(badAbs);

    fsModule.rmSync = (targetPath, options) => {
      if (path.resolve(targetPath) === badAbsResolved) {
        const err = new Error('EBUSY: resource busy or locked');
        err.code = 'EBUSY';
        throw err;
      }
      return originalRmSync(targetPath, options);
    };

    const result = prune({
      targetRoot,
      previouslyOwned: ['bad-file.md', 'good-file.md'],
      currentOwned: [],
      isBridge: false,
    });

    assert.equal(fs.existsSync(goodAbs), false, 'the good candidate must still be deleted despite the bad one failing');
    assert.equal(fs.existsSync(badAbs), true, 'the failing candidate is left on disk, not force-removed some other way');
    assert.deepEqual(result.deleted, ['good-file.md']);
    assert.deepEqual(result.failed, ['bad-file.md']);
  } finally {
    fsModule.rmSync = originalRmSync;
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// --- FIX 5 (MEDIUM): a symlink/junction escape is refused (CWE-59) ---------
// Regression for: isInsideRoot was lexical-only (no realpath); a symlinked
// directory under targetRoot pointing outside means a legitimately-named
// candidate lexically passes but the OS deletes outside root.

test('FIX5: a symlink/junction inside root pointing outside root is refused; the external file survives', (t) => {
  const targetRoot = makeTmpRoot('rea-prune-test-inner-');
  const outsideRoot = makeTmpRoot('rea-prune-test-outside-');
  const linkPath = path.join(targetRoot, 'escape-link');
  try {
    const externalFile = writeFile(outsideRoot, 'external-secret.md', 'do not delete me via symlink');

    try {
      if (process.platform === 'win32') {
        fs.symlinkSync(outsideRoot, linkPath, 'junction');
      } else {
        fs.symlinkSync(outsideRoot, linkPath);
      }
    } catch (err) {
      if (!handleLinkCreationFailure(t, err)) {
        return;
      }
    }

    const { deleted } = prune({
      targetRoot,
      previouslyOwned: ['escape-link/external-secret.md'],
      currentOwned: [],
      isBridge: false,
    });

    assert.equal(
      fs.existsSync(externalFile),
      true,
      'a file outside root, reached only via a symlink inside root, must survive'
    );
    assert.deepEqual(deleted, []);
  } finally {
    try {
      fs.unlinkSync(linkPath);
    } catch {
      // no-op: link may not have been created, or already removed
    }
    fs.rmSync(targetRoot, { recursive: true, force: true });
    fs.rmSync(outsideRoot, { recursive: true, force: true });
  }
});

// --- FIX5b (documented, verified-safe divergence from the old strict check) —
// unlike the old realpath check this module used to inline (which was
// STRICT: `realTarget.startsWith(realRoot + sep)`, so a candidate resolving
// to EXACTLY targetRoot was skipped), the shared safe-path.isRealpathInsideRoot
// treats real === root as CONTAINED (see src/safe-path.js's `real ===
// resolvedRoot` branch), so a symlink/junction that points at root itself is
// no longer special-cased out here — it proceeds to rmSync like any other
// owned-then-unowned candidate. This is safe because rmSync lstats the final
// path component and unlinks only the link entry for a symlink/junction; it
// does not recurse through it. This test pins that exact behaviour.

test('a symlink/junction inside root pointing at root ITSELF: the owned link is removed, but root and its contents survive (rmSync does not recurse through it)', (t) => {
  const targetRoot = makeTmpRoot('rea-prune-test-selflink-');
  const linkPath = path.join(targetRoot, 'self-link');
  try {
    const canary = writeFile(targetRoot, 'keep-me.txt', 'canary content — must survive');

    if (!createDirLinkOrSkip(t, targetRoot, linkPath)) {
      return; // skipped on this host (see handleLinkCreationFailure)
    }

    const { deleted, failed } = prune({
      targetRoot,
      previouslyOwned: ['self-link'],
      currentOwned: [],
      isBridge: false,
    });

    assert.deepEqual(deleted, ['self-link'], 'the owned-then-unowned self-pointing link must be reported deleted');
    assert.deepEqual(failed, []);
    assert.equal(fs.existsSync(targetRoot), true, 'targetRoot itself must survive');
    assert.equal(fs.existsSync(canary), true, 'a real file inside targetRoot must survive');
    assert.equal(
      fs.readFileSync(canary, 'utf8'),
      'canary content — must survive',
      'the canary file content must be untouched'
    );
    assert.equal(
      fs.existsSync(linkPath),
      false,
      'the link entry itself must be gone (rmSync removed the link, not its target)'
    );
  } finally {
    try {
      fs.unlinkSync(linkPath);
    } catch {
      // no-op: link may already have been removed by prune(), or never created
    }
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// --- FIX 6 (CRITICAL, cross-module): protect .gemini/settings.json ---------
// The shims module writes .gemini/settings.json as a user file it only ever
// merges into; it must never be pruned.

test('FIX6: .gemini/settings.json survives even if wrongly passed in as owned-but-removed', () => {
  const targetRoot = makeTmpRoot();
  try {
    const geminiSettings = writeFile(targetRoot, '.gemini/settings.json', '{"userSetting": true}');

    const { deleted } = prune({
      targetRoot,
      previouslyOwned: ['.gemini/settings.json'],
      currentOwned: [],
      isBridge: false,
    });

    assert.equal(fs.existsSync(geminiSettings), true, '.gemini/settings.json must never be pruned');
    assert.deepEqual(deleted, []);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('isProtected() blocks .gemini/settings.json and DENY_FILES exports it', () => {
  assert.equal(isProtected('.gemini/settings.json'), true);
  assert.ok(DENY_FILES.includes('.gemini/settings.json'));
});
