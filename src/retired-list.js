'use strict';

/**
 * src/retired-list.js — One-time bridge retired-file list
 *
 * A hard-coded, host-relative, forward-slash list of files that belonged to
 * the pre-manifest (legacy v0.7.1) skill set and have no successor in the
 * redesigned template set. It exists only to bridge a host that predates the
 * ownership manifest (see src/manifest.js): a host with legacy command files
 * present and no manifest gets these files pruned once, on the first
 * `setup` run. After that first run, ownership is manifest-driven and this
 * list is inert (never consulted again for that host).
 *
 * This module is pure data — no file IO, no logic. Deletion (including the
 * deny-list + containment guards) lives in src/prune.js.
 *
 * Exported API:
 *   RETIRED_FILES - array of host-relative, forward-slash file paths to
 *                    delete on the one-time legacy-host bridge.
 */

const RETIRED_FILES = [
  '.claude/commands/rea-brainstorm.md',
  '.claude/commands/rea-commit.md',
  '.claude/commands/rea-update.md',
  '.claude/commands/rea-verify.md',
  '.claude/commands/rea-worktree.md',
  '.claude/agents/rea-router.md',
  '.claude/skill-writer-patterns.md',
];

module.exports = {
  RETIRED_FILES,
};
