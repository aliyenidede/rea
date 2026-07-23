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
 * integer. verify.js's contract: verify(targetRoot) -> {checks, ok}, which
 * `handleVerify` maps to an exit code (0 when `ok`, else 1) after printing a
 * per-check report. migrate.js's contract: migrate(targetRoot, {dryRun}) ->
 * {changed, removed, moved, failed, skipped, findings, nothingToMigrate},
 * which `handleMigrate` maps to an exit code (0 normally, 1 if the
 * aggregate `failed` array is non-empty — `skipped`/`findings` are
 * informational only) after printing `migrate.formatMigrateReport(result)`.
 * All three dispatches lazily require their backing module (via the shared
 * lazyLoadModule() helper) so this module degrades gracefully if any of
 * them is ever absent.
 *
 * Exported API:
 *   parseArgs(argv) - pure argv parser; returns {verb, target, full, dryRun}.
 *                      target defaults to process.cwd() when omitted.
 *   cli(argv)        - parses argv, dispatches to the matching verb handler,
 *                       returns an exit code (0 ok, non-zero error).
 */

/**
 * Recognized flag tokens. Any argv token starting with one or more dashes
 * that is not in this set is treated as an unrecognized option by `cli()`
 * (see `findUnknownOption`), never silently absorbed as a positional.
 */
const KNOWN_FLAGS = new Set(['--full', '--dry-run']);

/**
 * Parses raw CLI argv (post `process.argv.slice(2)`) into a plain args
 * object. Pure function — no IO, no process.exit. The first non-flag token
 * is the verb; the second non-flag token (if any) is the target path
 * (defaults to `process.cwd()` when omitted); `--full` sets full=true;
 * `--dry-run` sets dryRun=true (consumed by the `migrate` verb only — the
 * `setup`/`verify` handlers simply ignore it).
 *
 * Note: this parser does not validate options — a mistyped flag (e.g.
 * `-full`) would be treated as a positional here. `cli()` guards against
 * that via `findUnknownOption` before dispatching, so callers relying on
 * `cli()` never observe a mistyped flag being misread as a target.
 */
function parseArgs(argv) {
  const positional = argv.filter((a) => !a.startsWith('--'));
  const full = argv.includes('--full');
  const dryRun = argv.includes('--dry-run');
  const verb = positional[0];
  const target = positional[1] !== undefined ? positional[1] : process.cwd();
  return { verb, target, full, dryRun };
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
 * Lazily requires `relName` (a same-directory module, e.g. './setup' or
 * './verify'). Returns null if the module does not exist yet so its caller
 * can degrade gracefully; re-throws any other error (including a real error
 * raised from inside the module itself while loading), so failures there are
 * never silently swallowed.
 *
 * Uses `require.resolve` to distinguish "the module is absent" from "the
 * module exists but throws while loading" — the latter must never resolve to
 * null (that would silently swallow a real bug, e.g. a missing dependency
 * required from inside it). Matching Node's internal MODULE_NOT_FOUND
 * *message* text is fragile and was replaced with this resolution check,
 * which never executes the module's body on the absent path.
 *
 * A second guard covers a subtler case: Node's internal module-RESOLUTION
 * path cache (separate from `require.cache`/`Module._cache`, and not cleared
 * by `delete require.cache[...]`) can keep returning a STALE resolved path
 * for `relName` after some earlier, successful `require.resolve(relName)`
 * call — even once the file backing that path has since been deleted. In
 * that situation `require.resolve` above still "succeeds" (returns the stale
 * path without re-checking disk), so it falls through to `require(relName)`,
 * which then throws ENOENT (not MODULE_NOT_FOUND) for that exact path. That
 * ENOENT is treated the same as "absent" here — but ONLY when it is thrown
 * for the exact path `require.resolve` just returned; an ENOENT thrown from
 * INSIDE the module's own body (e.g. it tries to read a missing data file at
 * a different path) must still propagate rather than being swallowed as
 * "module absent".
 *
 * Shared by loadSetup() and loadVerify() below — both dispatch handlers
 * degrade the same way when their backing module is missing.
 */
function lazyLoadModule(relName) {
  let resolved;
  try {
    resolved = require.resolve(relName);
  } catch (e) {
    if (e && e.code === 'MODULE_NOT_FOUND') {
      return null;
    }
    throw e;
  }
  try {
    return require(relName);
  } catch (e) {
    if (e && e.code === 'ENOENT' && e.path === resolved) {
      return null;
    }
    throw e;
  }
}

/**
 * Lazily loads the setup orchestrator (src/setup.js, landed in unit 4b-6).
 * See lazyLoadModule() for the graceful-degrade contract.
 */
function loadSetup() {
  return lazyLoadModule('./setup');
}

/**
 * Lazily loads the read-only install health check (src/verify.js, landed in
 * unit 4c-1). See lazyLoadModule() for the graceful-degrade contract.
 */
function loadVerify() {
  return lazyLoadModule('./verify');
}

/**
 * Lazily loads the v0.7.1 -> redesign migration orchestrator (src/migrate.js,
 * landed in unit 4d-4). See lazyLoadModule() for the graceful-degrade
 * contract.
 */
function loadMigrate() {
  return lazyLoadModule('./migrate');
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
 * Prints one readable line per check in a verify() result, e.g.
 * `PASS  manifest present — <detail>`. Every check's `status` (pass/fail/
 * skip) is already one of a fixed, known set of 4-letter words, so the
 * uppercased label lines up without further padding.
 */
function printVerifyReport(result) {
  for (const check of result.checks) {
    console.log(`${check.status.toUpperCase()}  ${check.name} — ${check.detail}`);
  }
}

/**
 * `verify` verb handler: dispatches to the read-only health check (4c-1)
 * when present, otherwise prints a graceful placeholder. Returns an exit
 * code (0 when the result's `ok` is true, 1 otherwise).
 */
function handleVerify(target) {
  const v = loadVerify();
  if (!v) {
    console.log('rea-tools verify: orchestrator arrives in a later release');
    return 0;
  }
  const result = v.verify(target);
  printVerifyReport(result);
  return result.ok ? 0 : 1;
}

/**
 * Prints one readable line per `migrate.formatMigrateReport(result)` entry.
 */
function printMigrateReport(migrateModule, result) {
  for (const line of migrateModule.formatMigrateReport(result)) {
    console.log(line);
  }
}

/**
 * `migrate` verb handler: dispatches to the v0.7.1 -> redesign migration
 * orchestrator (4d-4) when present, otherwise prints a graceful placeholder.
 * Returns an exit code — 0 normally, 1 if the aggregate `failed` array is
 * non-empty (mirrors handleSetup's failed -> 1; a non-empty `skipped` or a
 * non-empty `findings` list is informational only and still returns 0).
 * Null-safe like handleSetup: a stub/older migrate() that returns a bare
 * object without a `.failed` array must still yield 0, not throw.
 */
function handleMigrate(target, { dryRun } = {}) {
  const m = loadMigrate();
  if (!m) {
    console.log('rea-tools migrate: orchestrator arrives in a later release');
    return 0;
  }
  const result = m.migrate(target, { dryRun });
  printMigrateReport(m, result);
  return result && Array.isArray(result.failed) && result.failed.length > 0 ? 1 : 0;
}

/**
 * Prints short usage help to stderr.
 */
function printUsage() {
  console.error(
    ['Usage: rea-tools <setup|verify|migrate> [target] [--full] [--dry-run]'].join('\n')
  );
}

const DISPATCH = {
  setup: (target, full) => handleSetup(target, full),
  verify: (target) => handleVerify(target),
  migrate: (target, full, dryRun) => handleMigrate(target, { dryRun }),
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
  const { verb, target, full, dryRun } = parseArgs(argv);
  const handler = DISPATCH[verb];
  if (!handler) {
    printUsage();
    return 1;
  }
  return handler(target, full, dryRun);
}

module.exports = {
  parseArgs,
  cli,
};
