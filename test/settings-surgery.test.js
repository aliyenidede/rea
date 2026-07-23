'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { removeDeadRouterHook, ROUTER_HOOK_PATH_FRAGMENT, filterHooksBy } = require('../src/settings-surgery.js');

/** Creates a unique tmp dir under the OS temp dir; returns its absolute path. */
function makeTmpRoot(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix || 'rea-settings-surgery-test-'));
}

/** Writes `content` to `relPath` under `root`, creating parent dirs as needed. */
function writeFile(root, relPath, content) {
  const abs = path.join(root, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content ?? 'content\n', 'utf8');
  return abs;
}

/** The exact v0.7.1 settings.json shape: dead router hook + working lint hook + an unrelated key. */
function fixtureWithRouterHook() {
  return {
    permissions: {
      allow: ['pytest*', 'ruff*', 'mypy*', 'pip*', 'rea*'],
    },
    hooks: {
      SessionStart: [
        {
          hooks: [
            {
              type: 'command',
              command: 'cat .claude/agents/rea-router.md',
            },
          ],
        },
      ],
      PostToolUse: [
        {
          matcher: 'Write|Edit',
          hooks: [
            {
              type: 'command',
              command: 'bash .claude/hooks/post-tool-use.sh',
            },
          ],
        },
      ],
    },
  };
}

// --- (a) the dead router hook is removed; lint hook + unrelated key survive -

test('(a) the router SessionStart hook is removed; PostToolUse lint hook + unrelated key survive', () => {
  const targetRoot = makeTmpRoot();
  try {
    const settingsPath = writeFile(
      targetRoot,
      '.claude/settings.json',
      `${JSON.stringify(fixtureWithRouterHook(), null, 2)}\n`
    );

    const result = removeDeadRouterHook(targetRoot);

    assert.equal(result.changed, true);
    assert.ok(result.removed.length > 0, 'removed must name what was taken out');
    assert.ok(
      result.removed.some((entry) => entry.includes(ROUTER_HOOK_PATH_FRAGMENT)),
      'removed must reference the dead router hook path'
    );

    const written = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.equal(written.hooks.SessionStart, undefined, 'the SessionStart key must be gone entirely');
    assert.deepEqual(written.hooks.PostToolUse, [
      {
        matcher: 'Write|Edit',
        hooks: [{ type: 'command', command: 'bash .claude/hooks/post-tool-use.sh' }],
      },
    ]);
    assert.deepEqual(written.permissions, {
      allow: ['pytest*', 'ruff*', 'mypy*', 'pip*', 'rea*'],
    });
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// --- (b) a now-empty SessionStart array is dropped, not left as [] ---------

test('(b) a now-empty SessionStart array is dropped (the key is removed, not left as [])', () => {
  const targetRoot = makeTmpRoot();
  try {
    const settingsPath = writeFile(
      targetRoot,
      '.claude/settings.json',
      `${JSON.stringify(fixtureWithRouterHook(), null, 2)}\n`
    );

    removeDeadRouterHook(targetRoot);

    const written = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.equal(
      Object.prototype.hasOwnProperty.call(written.hooks, 'SessionStart'),
      false,
      'SessionStart must be removed as a key, not left as an empty array'
    );
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// --- (c) settings without the router hook: no change, no write -------------

test('(c) settings without the router hook: changed:false, file byte-unchanged', () => {
  const targetRoot = makeTmpRoot();
  try {
    const fixture = {
      permissions: { allow: ['pytest*'] },
      hooks: {
        SessionStart: [
          {
            hooks: [{ type: 'command', command: 'echo unrelated' }],
          },
        ],
        PostToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [{ type: 'command', command: 'bash .claude/hooks/post-tool-use.sh' }],
          },
        ],
      },
    };
    const rawBefore = `${JSON.stringify(fixture, null, 2)}\n`;
    const settingsPath = writeFile(targetRoot, '.claude/settings.json', rawBefore);

    const result = removeDeadRouterHook(targetRoot);

    assert.equal(result.changed, false);
    assert.deepEqual(result.removed, []);
    const rawAfter = fs.readFileSync(settingsPath, 'utf8');
    assert.equal(rawAfter, rawBefore, 'the file must be byte-unchanged when nothing matched');
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// --- (d) missing settings.json: no-op, no throw -----------------------------

test('(d) missing settings.json: no-op (changed:false, no throw)', () => {
  const targetRoot = makeTmpRoot();
  try {
    const settingsPath = path.join(targetRoot, '.claude', 'settings.json');
    assert.equal(fs.existsSync(settingsPath), false, 'sanity: settings.json must not exist');

    let result;
    assert.doesNotThrow(() => {
      result = removeDeadRouterHook(targetRoot);
    });

    assert.equal(result.changed, false);
    assert.deepEqual(result.removed, []);
    assert.equal(fs.existsSync(settingsPath), false, 'no file must be created for a missing settings.json');
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// --- (e) dryRun computes the same result but never writes -------------------

test('(e) dryRun:true on case (a)\'s input returns the same {changed, removed} but the file is byte-unchanged', () => {
  const targetRoot = makeTmpRoot();
  try {
    const rawBefore = `${JSON.stringify(fixtureWithRouterHook(), null, 2)}\n`;
    const settingsPath = writeFile(targetRoot, '.claude/settings.json', rawBefore);

    const wetResult = removeDeadRouterHook(targetRoot, { dryRun: true });

    assert.equal(wetResult.changed, true);
    assert.ok(wetResult.removed.length > 0);

    const rawAfter = fs.readFileSync(settingsPath, 'utf8');
    assert.equal(rawAfter, rawBefore, 'dryRun must never write the file');

    // Sanity: a real (non-dry) run on an identical fixture produces the same
    // {changed, removed} shape.
    const otherRoot = makeTmpRoot();
    try {
      writeFile(otherRoot, '.claude/settings.json', rawBefore);
      const realResult = removeDeadRouterHook(otherRoot);
      assert.deepEqual(realResult, wetResult);
    } finally {
      fs.rmSync(otherRoot, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// --- (f) multiple SessionStart entries: router entry gone, unrelated entry -
// survives byte-for-byte -----------------------------------------------------

test('(f) SessionStart with [routerEntry, unrelatedCustomEntry]: the router entry is gone, the unrelated entry survives byte-for-byte', () => {
  const targetRoot = makeTmpRoot();
  try {
    const unrelatedCustomEntry = {
      matcher: 'Custom',
      hooks: [{ type: 'command', command: 'echo my-own-session-start-hook' }],
    };
    const fixture = {
      hooks: {
        SessionStart: [
          {
            hooks: [{ type: 'command', command: 'cat .claude/agents/rea-router.md' }],
          },
          unrelatedCustomEntry,
        ],
        PostToolUse: [
          {
            matcher: 'Write|Edit',
            hooks: [{ type: 'command', command: 'bash .claude/hooks/post-tool-use.sh' }],
          },
        ],
      },
    };
    const settingsPath = writeFile(targetRoot, '.claude/settings.json', `${JSON.stringify(fixture, null, 2)}\n`);

    const result = removeDeadRouterHook(targetRoot);

    assert.equal(result.changed, true);

    const written = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.equal(written.hooks.SessionStart.length, 1, 'only the unrelated entry must remain');
    assert.deepEqual(
      written.hooks.SessionStart[0],
      unrelatedCustomEntry,
      'the unrelated custom SessionStart entry must survive byte-for-byte'
    );
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// --- (g) partial match within a single entry: only the router inner hook ---
// is removed, the entry (and its matcher + surviving hook) is kept ----------

test('(g) an entry with hooks:[routerHook, someOtherHook]: only the router inner hook is removed; the entry, its matcher and the surviving hook are kept', () => {
  const targetRoot = makeTmpRoot();
  try {
    const someOtherHook = { type: 'command', command: 'echo some-other-session-start-hook' };
    const fixture = {
      hooks: {
        SessionStart: [
          {
            matcher: 'Mixed',
            hooks: [{ type: 'command', command: 'cat .claude/agents/rea-router.md' }, someOtherHook],
          },
        ],
      },
    };
    const settingsPath = writeFile(targetRoot, '.claude/settings.json', `${JSON.stringify(fixture, null, 2)}\n`);

    const result = removeDeadRouterHook(targetRoot);

    assert.equal(result.changed, true);

    const written = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.equal(written.hooks.SessionStart.length, 1, 'the entry itself must be kept (not dropped)');
    assert.equal(written.hooks.SessionStart[0].matcher, 'Mixed', "the entry's matcher must survive");
    assert.deepEqual(
      written.hooks.SessionStart[0].hooks,
      [someOtherHook],
      'only the surviving (non-router) inner hook must remain'
    );
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// --- (h) corrupt settings.json: a contextual error names the file ----------

test('(h) invalid JSON in settings.json: a contextual error is thrown, naming the file', () => {
  const targetRoot = makeTmpRoot();
  try {
    const settingsPath = writeFile(targetRoot, '.claude/settings.json', '{ this is not valid JSON');

    assert.throws(() => removeDeadRouterHook(targetRoot), (err) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.includes(settingsPath),
        `error message must name the file; got: ${err.message}`
      );
      return true;
    });
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// --- filterHooksBy() direct unit tests ---------------------------------------

test('filterHooksBy() keeps an entry unmodified when no inner hook matches', () => {
  const entry = { matcher: 'X', hooks: [{ type: 'command', command: 'echo a' }] };
  const { kept, removedCommands } = filterHooksBy([entry], () => false);

  assert.deepEqual(kept, [entry]);
  assert.equal(kept[0], entry, 'an untouched entry must be the SAME object reference, not a copy');
  assert.deepEqual(removedCommands, []);
});

test('filterHooksBy() drops the whole entry when every inner hook matches', () => {
  const entry = { hooks: [{ type: 'command', command: 'echo a' }, { type: 'command', command: 'echo b' }] };
  const { kept, removedCommands } = filterHooksBy([entry], () => true);

  assert.deepEqual(kept, []);
  assert.deepEqual(removedCommands, ['echo a', 'echo b']);
});

test('filterHooksBy() keeps the entry minus only the matched inner hooks on a partial match', () => {
  const keepHook = { type: 'command', command: 'echo keep' };
  const dropHook = { type: 'command', command: 'echo drop' };
  const entry = { matcher: 'X', hooks: [dropHook, keepHook] };
  const { kept, removedCommands } = filterHooksBy([entry], (hook) => hook.command === 'echo drop');

  assert.deepEqual(kept, [{ matcher: 'X', hooks: [keepHook] }]);
  assert.deepEqual(removedCommands, ['echo drop']);
});

test('filterHooksBy() preserves an entry without a well-formed hooks[] array untouched', () => {
  const malformedEntry = { matcher: 'X' }; // no hooks[] at all
  const { kept, removedCommands } = filterHooksBy([malformedEntry], () => true);

  assert.deepEqual(kept, [malformedEntry]);
  assert.deepEqual(removedCommands, []);
});
