'use strict';

/**
 * src/cli.js — CLI dispatcher + target resolution
 *
 * Parses argv into `{verb, target, full}` and dispatches to the handler for
 * that verb. This module has no file IO of its own — it only resolves
 * arguments and delegates.
 *
 * Orchestrator contract: setup.run(targetRoot, { full }) -> a result object
 * ({placed, pruned, failed, isBridge, full}), never a number. `handleSetup`
 * maps that object to a numeric exit code (0 ok, 1 if `failed` is
 * non-empty) before returning, since `cli()`'s return value is assigned
 * straight to `process.exitCode` by bin/rea-tools.js, which requires an
 * integer. The `setup` dispatch still lazily requires `./setup` so this
 * module degrades gracefully if that file is ever absent.
 *
 * Exported API:
 *   parseArgs(argv) - pure argv parser; returns {verb, target, full}.
 *                      target defaults to process.cwd() when omitted.
 *   cli(argv)        - parses argv, dispatches to the matching verb handler,
 *                       returns an exit code (0 ok, non-zero error).
 */

/**
 * Recognized flag tokens. Any argv token starting with one or more dashes
 * that is not in this set is treated as an unrecognized option by `cli()`
 * (see `findUnknownOption`), never silently absorbed as a positional.
 */
const KNOWN_FLAGS = new Set(['--full']);

/**
 * Parses raw CLI argv (post `process.argv.slice(2)`) into a plain args
 * object. Pure function — no IO, no process.exit. The first non-flag token
 * is the verb; the second non-flag token (if any) is the target path
 * (defaults to `process.cwd()` when omitted); `--full` sets full=true.
 *
 * Note: this parser does not validate options — a mistyped flag (e.g.
 * `-full`) would be treated as a positional here. `cli()` guards against
 * that via `findUnknownOption` before dispatching, so callers relying on
 * `cli()` never observe a mistyped flag being misread as a target.
 */
function parseArgs(argv) {
  const positional = argv.filter((a) => !a.startsWith('--'));
  const full = argv.includes('--full');
  const verb = positional[0];
  const target = positional[1] !== undefined ? positional[1] : process.cwd();
  return { verb, target, full };
}

/**
 * Scans argv for a token that looks like an option (starts with `-` or
 * `--`) but is not a recognized flag. Returns the first such token, or null
 * if every dash-prefixed token is recognized. Used by `cli()` to reject
 * mistyped/unknown flags instead of letting them fall through as a
 * positional (e.g. `target`).
 */
function findUnknownOption(argv) {
  for (const a of argv) {
    if (a.startsWith('-') && !KNOWN_FLAGS.has(a)) {
      return a;
    }
  }
  return null;
}

/**
 * Lazily loads the setup orchestrator (src/setup.js, lands in unit 4b-6).
 * Returns null if the module does not exist yet so `setup` can degrade
 * gracefully; re-throws any other error (including a real error raised from
 * inside setup.js itself), so failures there are never silently swallowed.
 *
 * Uses `require.resolve` to distinguish "setup.js is absent" from "setup.js
 * exists but throws while loading" — the latter must never resolve to null
 * (that would silently swallow a real bug, e.g. a missing dependency
 * required from inside setup.js). Matching Node's internal
 * MODULE_NOT_FOUND *message* text is fragile and was replaced with this
 * resolution check, which never executes setup.js's body on the absent
 * path.
 */
function loadSetup() {
  try {
    require.resolve('./setup');
  } catch (e) {
    if (e && e.code === 'MODULE_NOT_FOUND') {
      return null;
    }
    throw e;
  }
  return require('./setup');
}

/**
 * `setup` verb handler: dispatches to the setup orchestrator (4b-6) when
 * present, otherwise prints a graceful placeholder. Returns an exit code.
 */
function handleSetup(target, full) {
  const s = loadSetup();
  if (!s) {
    console.log('rea-tools setup: orchestrator arrives in a later release');
    return 0;
  }
  // s.run() returns a result OBJECT ({placed, pruned, failed, isBridge, full}),
  // never a number — bin/rea-tools.js assigns this handler's return value
  // straight to process.exitCode, which Node requires to be an integer.
  // Map the result to a numeric exit code here rather than passing the
  // object through. Null-safe: a stub/older run() that returns a bare object
  // without a `.failed` array must still yield 0, not throw.
  const result = s.run(target, { full });
  return result && Array.isArray(result.failed) && result.failed.length > 0 ? 1 : 0;
}

/**
 * `verify` verb handler: real implementation lands in a later phase (4c).
 * Returns an exit code.
 */
function handleVerify() {
  console.log('rea-tools verify: coming in a later release');
  return 0;
}

/**
 * Prints short usage help to stderr.
 */
function printUsage() {
  console.error(
    ['Usage: rea-tools <setup|verify> [target] [--full]'].join('\n')
  );
}

const DISPATCH = {
  setup: (target, full) => handleSetup(target, full),
  verify: () => handleVerify(),
};

/**
 * Parses `argv` and dispatches to the matching verb handler. Returns an
 * exit code (0 ok, non-zero on error/unknown verb/unrecognized option).
 * Rejects any unrecognized `-`/`--` option (e.g. a mistyped `-full`) before
 * dispatch, rather than letting `parseArgs` silently absorb it as the
 * `target` positional. Never throws for an unknown verb, an unrecognized
 * option, or a missing orchestrator — only genuine internal errors
 * propagate.
 */
function cli(argv) {
  if (findUnknownOption(argv)) {
    printUsage();
    return 1;
  }
  const { verb, target, full } = parseArgs(argv);
  const handler = DISPATCH[verb];
  if (!handler) {
    printUsage();
    return 1;
  }
  return handler(target, full);
}

module.exports = {
  parseArgs,
  cli,
};
