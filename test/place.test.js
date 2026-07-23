'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const manifest = require('../src/manifest.js');
const { place } = require('../src/place.js');
const { createDirLinkOrSkip } = require('./helpers/symlink-fixtures');

// The real readev-tools package root (this repo) — templates/ and core/ live here.
const SOURCE_ROOT = path.resolve(__dirname, '..');

/** Creates a unique tmp dir under the OS temp dir; returns its absolute path. */
function makeTmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rea-place-test-'));
}

/** Lists file (not dir) names directly inside `dirAbs`. */
function listFiles(dirAbs) {
  return fs
    .readdirSync(dirAbs, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name);
}

test('place() copies commands, agents (minus skill-writer.md), core trio, and the .rea scaffold; records the manifest', () => {
  const targetRoot = makeTmpRoot();
  try {
    const m = manifest.load(targetRoot);
    place(SOURCE_ROOT, targetRoot, m);

    // --- commands: every templates/commands/* file EXCEPT README.md lands under .claude/commands/ ---
    const sourceCommandFiles = listFiles(path.join(SOURCE_ROOT, 'templates', 'commands'));
    assert.ok(sourceCommandFiles.length > 0, 'sanity: source commands dir is non-empty');
    assert.ok(sourceCommandFiles.includes('README.md'), 'sanity: source commands dir has README.md');
    for (const fileName of sourceCommandFiles) {
      const destPath = path.join(targetRoot, '.claude', 'commands', fileName);
      if (fileName === 'README.md') {
        assert.equal(fs.existsSync(destPath), false, 'README.md must NOT be placed');
      } else {
        assert.ok(fs.existsSync(destPath), `expected ${destPath} to exist`);
      }
    }

    // --- agents: every templates/agents/* file EXCEPT skill-writer.md and README.md ---
    const sourceAgentFiles = listFiles(path.join(SOURCE_ROOT, 'templates', 'agents'));
    assert.ok(sourceAgentFiles.includes('skill-writer.md'), 'sanity: source has skill-writer.md');
    assert.ok(sourceAgentFiles.includes('README.md'), 'sanity: source agents dir has README.md');
    for (const fileName of sourceAgentFiles) {
      const destPath = path.join(targetRoot, '.claude', 'agents', fileName);
      if (fileName === 'skill-writer.md' || fileName === 'README.md') {
        assert.equal(fs.existsSync(destPath), false, `${fileName} must NOT be placed`);
      } else {
        assert.ok(fs.existsSync(destPath), `expected ${destPath} to exist`);
      }
    }
    // skill-writer-patterns.md explicitly IS placed under .claude/agents/
    assert.ok(
      fs.existsSync(path.join(targetRoot, '.claude', 'agents', 'skill-writer-patterns.md')),
      'skill-writer-patterns.md must be placed under .claude/agents/'
    );

    // --- core trio at host-root core/ (exactly the trio — no core/README.md) ---
    for (const fileName of ['principles.md', 'craft-checklist.md', 'rea-schema.md']) {
      const destPath = path.join(targetRoot, 'core', fileName);
      assert.ok(fs.existsSync(destPath), `expected ${destPath} to exist`);
    }
    assert.equal(
      fs.existsSync(path.join(targetRoot, 'core', 'README.md')),
      false,
      'source-tree core/README.md must NOT be placed into the host project'
    );
    assert.deepEqual(
      listFiles(path.join(targetRoot, 'core')).sort(),
      ['craft-checklist.md', 'principles.md', 'rea-schema.md'],
      'host core/ must contain exactly the trio'
    );

    // --- source-tree README.md files must not ship into .claude/commands or .claude/agents ---
    assert.equal(
      fs.existsSync(path.join(targetRoot, '.claude', 'commands', 'README.md')),
      false,
      'source-tree templates/commands/README.md must NOT be placed'
    );
    assert.equal(
      fs.existsSync(path.join(targetRoot, '.claude', 'agents', 'README.md')),
      false,
      'source-tree templates/agents/README.md must NOT be placed'
    );

    // --- .rea/ typed scaffold: the four typed dirs + their README.md ---
    for (const typeName of ['knowledge', 'decisions', 'sessions', 'plans']) {
      const destReadme = path.join(targetRoot, '.rea', typeName, 'README.md');
      assert.ok(fs.existsSync(destReadme), `expected ${destReadme} to exist`);
    }

    // --- manifest recorded every placed path (relative, forward-slash) ---
    const owned = manifest.listOwned(m);
    assert.ok(
      owned.includes('.claude/agents/skill-writer-patterns.md'),
      'manifest should record skill-writer-patterns.md'
    );
    assert.ok(
      !owned.some((p) => p.endsWith('/skill-writer.md')),
      'manifest must NOT record skill-writer.md'
    );
    assert.ok(owned.includes('core/principles.md'), 'manifest should record core/principles.md');
    assert.ok(
      owned.includes('.rea/knowledge/README.md'),
      'manifest should record .rea/knowledge/README.md'
    );
    // source-tree README.md files (maintainer-facing) must never appear in the manifest
    assert.equal(owned.includes('core/README.md'), false, 'manifest must NOT record core/README.md');
    assert.equal(
      owned.includes('.claude/commands/README.md'),
      false,
      'manifest must NOT record .claude/commands/README.md'
    );
    assert.equal(
      owned.includes('.claude/agents/README.md'),
      false,
      'manifest must NOT record .claude/agents/README.md'
    );
    for (const fileName of sourceCommandFiles) {
      if (fileName === 'README.md') {
        continue;
      }
      assert.ok(
        owned.includes(`.claude/commands/${fileName}`),
        `manifest should record .claude/commands/${fileName}`
      );
    }
    // no absolute / backslash paths ever recorded
    for (const relPath of owned) {
      assert.equal(path.isAbsolute(relPath), false, `${relPath} must not be absolute`);
      assert.equal(relPath.includes('\\'), false, `${relPath} must not contain a backslash`);
    }
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('place() never touches an already-populated .rea/<type> dir', () => {
  const targetRoot = makeTmpRoot();
  try {
    const knowledgeDir = path.join(targetRoot, '.rea', 'knowledge');
    fs.mkdirSync(knowledgeDir, { recursive: true });
    fs.writeFileSync(path.join(knowledgeDir, 'my-notes.md'), 'user content\n', 'utf8');

    const m = manifest.load(targetRoot);
    place(SOURCE_ROOT, targetRoot, m);

    // the user's file survives untouched
    assert.equal(
      fs.readFileSync(path.join(knowledgeDir, 'my-notes.md'), 'utf8'),
      'user content\n'
    );
    // the scaffold README is NOT added to an already-populated dir
    assert.equal(fs.existsSync(path.join(knowledgeDir, 'README.md')), false);

    // an empty/missing typed dir still gets the scaffold README
    assert.ok(fs.existsSync(path.join(targetRoot, '.rea', 'decisions', 'README.md')));
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('place() throws on an unknown tool', () => {
  const targetRoot = makeTmpRoot();
  try {
    const m = manifest.load(targetRoot);
    assert.throws(() => place(SOURCE_ROOT, targetRoot, m, 'nonexistent-tool'));
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

test('place() resolves a RELATIVE targetRoot, so manifest keys stay clean root-relative paths', () => {
  const targetRootAbs = makeTmpRoot();
  const originalCwd = process.cwd();
  try {
    // mkdtempSync creates targetRootAbs directly inside os.tmpdir() — so the
    // dir name itself, relative to its parent, is a plain (non-"../") relative
    // path, exactly like the raw positional argument cli.js's parseArgs hands
    // place() for a target such as `rea setup my-app`.
    const parentDir = path.dirname(targetRootAbs);
    const relTargetRoot = path.basename(targetRootAbs);
    process.chdir(parentDir);

    const m = manifest.load(targetRootAbs);
    place(SOURCE_ROOT, relTargetRoot, m);

    // files actually land under the resolved absolute target root
    assert.ok(fs.existsSync(path.join(targetRootAbs, 'core', 'principles.md')));

    const owned = manifest.listOwned(m);
    assert.ok(owned.length > 0, 'sanity: some paths were recorded');
    assert.ok(
      owned.includes('core/principles.md'),
      'manifest should record the clean root-relative key core/principles.md, ' +
        'not prefixed with the relative targetRoot'
    );
    for (const relPath of owned) {
      assert.equal(path.isAbsolute(relPath), false, `${relPath} must not be absolute`);
      assert.equal(relPath.includes('\\'), false, `${relPath} must not contain a backslash`);
      assert.equal(
        relPath.startsWith(relTargetRoot),
        false,
        `${relPath} must not be prefixed with the relative targetRoot (${relTargetRoot})`
      );
    }
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(targetRootAbs, { recursive: true, force: true });
  }
});

test('place() is idempotent — safe to run twice on the same targetRoot', () => {
  const targetRoot = makeTmpRoot();
  try {
    const m = manifest.load(targetRoot);
    place(SOURCE_ROOT, targetRoot, m);

    // an already-placed .rea/<type>/README.md (dir now non-empty from run 1)
    const readmePath = path.join(targetRoot, '.rea', 'knowledge', 'README.md');
    assert.ok(fs.existsSync(readmePath), 'sanity: scaffold README placed on first run');
    const originalReadmeContent = fs.readFileSync(readmePath, 'utf8');
    const originalReadmeMtimeMs = fs.statSync(readmePath).mtimeMs;

    // a normal placed file, dirtied so we can prove run 2 overwrites it cleanly
    const commandFiles = listFiles(path.join(targetRoot, '.claude', 'commands'));
    assert.ok(commandFiles.length > 0, 'sanity: at least one command file placed on run 1');
    const commandPath = path.join(targetRoot, '.claude', 'commands', commandFiles[0]);
    const originalCommandContent = fs.readFileSync(commandPath, 'utf8');
    fs.writeFileSync(commandPath, 'stale content that must be overwritten\n', 'utf8');

    // (a) no error on run 2
    assert.doesNotThrow(() => place(SOURCE_ROOT, targetRoot, m));

    // (b) manifest.listOwned has no duplicate entries after two runs on the same manifest object
    const owned = manifest.listOwned(m);
    assert.equal(
      owned.length,
      new Set(owned).size,
      'manifest.listOwned must have no duplicates after a second run'
    );

    // (c) the already-placed .rea/knowledge/README.md stays untouched on run 2
    assert.equal(fs.readFileSync(readmePath, 'utf8'), originalReadmeContent);
    assert.equal(
      fs.statSync(readmePath).mtimeMs,
      originalReadmeMtimeMs,
      'scaffold README.md must not be rewritten on a second run (dir is now non-empty)'
    );

    // (d) a normal .claude/commands/*.md file is overwritten cleanly back to the source content
    assert.equal(fs.readFileSync(commandPath, 'utf8'), originalCommandContent);
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// SECURITY — a planted directory symlink/junction at a placed dest dir (e.g.
// `.claude`) must not redirect place()'s writes outside targetRoot (CWE-59).
//
// Fixture shape: an OS tmp dir (`parent`) containing `root/` (the placement
// targetRoot) and `outside/` as SIBLINGS, so an escape genuinely leaves root.
// ---------------------------------------------------------------------------

test(
  'SECURITY: place() refuses to write through a `.claude` directory junction escaping targetRoot; the outside dir it points at is left untouched',
  (t) => {
    const parent = makeTmpRoot();
    const root = path.join(parent, 'root');
    const outside = path.join(parent, 'outside');
    const evilClaudeDir = path.join(outside, 'evil-claude');
    fs.mkdirSync(root, { recursive: true });
    fs.mkdirSync(evilClaudeDir, { recursive: true });

    try {
      const claudeLink = path.join(root, '.claude');
      if (!createDirLinkOrSkip(t, evilClaudeDir, claudeLink)) {
        return;
      }

      const m = manifest.load(root);
      // Pin the matcher to the containment guard's own error (safe-path.js's
      // resolveInsideRoot messages all start with "Refusing to resolve …",
      // for both the lexical and realpath-escape branches) — a plain string
      // 2nd arg to assert.throws is only a failure MESSAGE, not an error
      // matcher, so it would pass for ANY thrown error, not specifically
      // this containment guard.
      assert.throws(() => place(SOURCE_ROOT, root, m), /Refusing to resolve/);

      // The outside target place() would have written into (via the
      // junction) must be completely untouched: no `commands`/`agents`
      // subdirs, no files — the containment guard must fire BEFORE the
      // first fs.mkdirSync/copyFileSync, not after.
      assert.deepEqual(
        fs.readdirSync(evilClaudeDir),
        [],
        'no file/dir must have been written into the outside target through the junction'
      );
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  }
);

// ---------------------------------------------------------------------------
// SECURITY — placeReaScaffold's containment guard must run BEFORE the
// "already populated?" reads (fs.existsSync/fs.readdirSync), not after. If an
// escaping `.rea/<type>` junction points at a POPULATED outside dir, a guard
// placed AFTER those reads would follow the junction, see `alreadyPopulated
// === true`, and silently `continue` — leaving place() throwing nothing while
// having already read through the junction. The fixed order (guard BEFORE
// the reads) must throw instead, and never touch the outside dir at all.
// ---------------------------------------------------------------------------

test(
  'SECURITY: place() refuses to read through a populated `.rea/knowledge` junction escaping targetRoot before the "already populated?" check; the outside dir it points at is left untouched',
  (t) => {
    const parent = makeTmpRoot();
    const root = path.join(parent, 'root');
    const outside = path.join(parent, 'outside');
    const evilKnowledgeDir = path.join(outside, 'evil-knowledge');
    fs.mkdirSync(root, { recursive: true });
    fs.mkdirSync(evilKnowledgeDir, { recursive: true });

    try {
      // The escape target is POPULATED — this is the exact condition under
      // which the OLD (guard-after-reads) code would have computed
      // alreadyPopulated === true and silently `continue`d instead of
      // throwing.
      const plantedFile = path.join(evilKnowledgeDir, 'already-here.txt');
      fs.writeFileSync(plantedFile, 'planted content\n', 'utf8');

      // `.rea/` must exist as the junction's parent before the junction
      // itself can be created inside it.
      fs.mkdirSync(path.join(root, '.rea'), { recursive: true });

      const knowledgeLink = path.join(root, '.rea', 'knowledge');
      if (!createDirLinkOrSkip(t, evilKnowledgeDir, knowledgeLink)) {
        return;
      }

      const m = manifest.load(root);
      // Pin the matcher to the containment guard's own error (see the
      // `.claude`-junction SECURITY test above for why a plain string 2nd
      // arg would not be a real matcher).
      assert.throws(() => place(SOURCE_ROOT, root, m), /Refusing to resolve/);

      // The outside target the junction points at must be completely
      // untouched: exactly the one planted file, with its original content,
      // and NO scaffold README.md leaked through the junction.
      assert.deepEqual(
        fs.readdirSync(evilKnowledgeDir),
        ['already-here.txt'],
        'the outside dir must contain exactly its original file — nothing added, nothing removed'
      );
      assert.equal(
        fs.readFileSync(plantedFile, 'utf8'),
        'planted content\n',
        'the outside file\'s content must be untouched'
      );
      assert.equal(
        fs.existsSync(path.join(evilKnowledgeDir, 'README.md')),
        false,
        'the scaffold README.md must NOT have been written into the outside dir through the junction'
      );
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  }
);
