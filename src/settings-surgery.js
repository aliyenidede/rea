'use strict';

/**
 * src/settings-surgery.js — 4d-1 dead SessionStart router hook removal
 *
 * One-time migration surgery on a host project's `.claude/settings.json`:
 * removes the dead v0.7.1 SessionStart hook that shelled out to
 * `.claude/agents/rea-router.md` (an agent file the redesign no longer
 * ships), while preserving every other key and hook untouched — notably
 * `hooks.PostToolUse` (the working lint hook) and any unrelated top-level
 * keys a user may have added. This is Decision 3 (user-locked): never
 * blind-remove working user config; only the broken router hook goes.
 *
 * A structured JSON read-modify-write, not a text/regex edit, so anything
 * REA does not specifically recognize as the dead router hook is carried
 * through byte-for-byte in the parsed structure.
 *
 * Node built-ins only.
 *
 * Exported API:
 *   ROUTER_HOOK_PATH_FRAGMENT      - the substring identifying the dead
 *                                    router hook's command (tolerant of
 *                                    `cat`/quoting variations — a substring
 *                                    match, not exact-string equality)
 *   removeDeadRouterHook(targetRoot, [options])
 *                                  - reads `.claude/settings.json` under
 *                                    targetRoot (containment-checked),
 *                                    removes only SessionStart entries/inner
 *                                    hooks whose command references the dead
 *                                    router path, drops a now-empty
 *                                    SessionStart key entirely (never leaves
 *                                    it as `[]`), and writes the result back
 *                                    (2-space JSON + trailing newline) only
 *                                    if something changed and
 *                                    `options.dryRun` is not true. A missing
 *                                    file is a no-op (`changed:false`, no
 *                                    throw). Returns `{changed, removed}` —
 *                                    computed IDENTICALLY under dryRun, but
 *                                    no write happens in that case.
 *                                    `removed` lists the matched hook command
 *                                    string(s) that were taken out. Throws a
 *                                    contextual error (naming the file) if
 *                                    the existing settings.json is not valid
 *                                    JSON — this is invasive surgery on a
 *                                    user file, so a clear failure beats a
 *                                    bare pathless SyntaxError.
 *   filterHooksBy(entries, matches)  - pure helper; filters a SessionStart-
 *                                    shaped entries array against an inner-
 *                                    hook predicate. Exported for direct unit
 *                                    testing (see `test/settings-surgery.test.js`).
 */

const fs = require('node:fs');

const { resolveInsideRoot } = require('./safe-path');

const SETTINGS_REL_PATH = '.claude/settings.json';

// The dead v0.7.1 SessionStart router hook shelled out to this agent file —
// matched as a substring of the inner hook's `command` string, tolerant of
// `cat`/quoting variations, never exact-string equality.
const ROUTER_HOOK_PATH_FRAGMENT = '.claude/agents/rea-router.md';

/**
 * Returns true if `hookEntry` (one element of an inner `hooks[]` array —
 * shape `{type, command}`) is the dead router hook: its `command` is a
 * string containing ROUTER_HOOK_PATH_FRAGMENT.
 */
function isRouterHookCommand(hookEntry) {
  return (
    !!hookEntry &&
    typeof hookEntry.command === 'string' &&
    hookEntry.command.includes(ROUTER_HOOK_PATH_FRAGMENT)
  );
}

/**
 * Filters an array of SessionStart entries (shape `{matcher?, hooks:[...]}`)
 * against `matches` — a predicate applied to each INNER hook (the elements
 * of an entry's own `hooks[]` array). Preserves entry ordering and inner-hook
 * ordering.
 *
 * - An inner hook the predicate matches is removed.
 * - If EVERY inner hook of an entry matched, the whole entry is dropped.
 * - If only SOME matched, the entry is kept with just those hooks removed.
 * - An entry without a well-formed `hooks[]` array is preserved untouched
 *   (not the expected shape, nothing to match against).
 *
 * Returns `{ kept, removedCommands }`: `kept` is the new filtered array;
 * `removedCommands` lists the `command` string of every inner hook that was
 * removed, in encounter order.
 */
function filterHooksBy(entries, matches) {
  const kept = [];
  const removedCommands = [];

  for (const entry of entries) {
    const innerHooks = Array.isArray(entry && entry.hooks) ? entry.hooks : null;

    if (!innerHooks) {
      kept.push(entry);
      continue;
    }

    const remainingInnerHooks = [];
    for (const hook of innerHooks) {
      if (matches(hook)) {
        removedCommands.push(hook.command);
      } else {
        remainingInnerHooks.push(hook);
      }
    }

    if (remainingInnerHooks.length === innerHooks.length) {
      kept.push(entry); // nothing matched in this entry: preserve untouched
    } else if (remainingInnerHooks.length > 0) {
      kept.push({ ...entry, hooks: remainingInnerHooks }); // partial: keep entry minus matched hooks
    }
    // else: every inner hook matched -> drop the whole entry (push nothing)
  }

  return { kept, removedCommands };
}

/**
 * Reads, surgically edits, and (unless dryRun) writes back
 * `.claude/settings.json` under `targetRoot`, removing only the dead
 * v0.7.1 SessionStart router hook. Every other key/hook is preserved
 * untouched — see the module docstring.
 *
 * @param {string} targetRoot - absolute path to the host project root.
 * @param {object} [options]
 * @param {boolean} [options.dryRun] - if true, computes the SAME
 *   `{changed, removed}` result but never writes the file.
 * @returns {{changed: boolean, removed: string[]}} `removed` lists the
 *   matched router hook command string(s) that were taken out.
 */
function removeDeadRouterHook(targetRoot, { dryRun = false } = {}) {
  const settingsPath = resolveInsideRoot(targetRoot, SETTINGS_REL_PATH);

  if (!fs.existsSync(settingsPath)) {
    return { changed: false, removed: [] };
  }

  const raw = fs.readFileSync(settingsPath, 'utf8');
  let settings;
  try {
    settings = JSON.parse(raw);
  } catch (err) {
    throw new Error(`${settingsPath} is not valid JSON: ${err.message}`);
  }

  const sessionStart =
    settings && settings.hooks && Array.isArray(settings.hooks.SessionStart)
      ? settings.hooks.SessionStart
      : null;

  if (!sessionStart) {
    return { changed: false, removed: [] };
  }

  const { kept, removedCommands } = filterHooksBy(sessionStart, isRouterHookCommand);

  if (removedCommands.length === 0) {
    return { changed: false, removed: [] };
  }

  if (kept.length === 0) {
    delete settings.hooks.SessionStart; // never leave a now-empty SessionStart as []
  } else {
    settings.hooks.SessionStart = kept;
  }

  if (!dryRun) {
    fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  }

  return { changed: true, removed: removedCommands };
}

module.exports = {
  ROUTER_HOOK_PATH_FRAGMENT,
  removeDeadRouterHook,
  filterHooksBy,
};
