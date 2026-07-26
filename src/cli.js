'use strict';

/**
 * src/cli.js — CLI dispatcher + target resolution
 *
 * Parses argv into `{verb, target, dryRun}` and dispatches to the handler
 * for that verb. This module has no file IO of its own — it only resolves
 * arguments and delegates.
 *
 * `--help`/`-h` and `--version` are handled entirely inside `cli()`, before
 * the unknown-option check and before any verb dispatch: they print to
 * stdout and return 0 regardless of what else is in argv.
 *
 * Orchestrator contract: setup.run(targetRoot, opts) -> a result object
 * ({placed, pruned, failed, isBridge}), never a number. `handleSetup`
 * prints that object as a report (`printSetupReport`) and maps it to a
 * numeric exit code (0 ok, 1 if `failed` is
 * non-empty) before returning, since `cli()`'s return value is assigned
 * straight to `process.exitCode` by bin/readev-tools.js, which requires an
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
 *   parseArgs(argv) - pure argv parser; returns {verb, target, dryRun}.
 *                      target defaults to process.cwd() when omitted.
 *   cli(argv)        - parses argv, dispatches to the matching verb handler,
 *                       returns an exit code (0 ok, non-zero error).
 */

/**
 * The published readev-tools version, printed by `--version`. Read from
 * package.json rather than hard-coded so it can never drift from a release
 * — npm always ships package.json in the tarball regardless of the `files`
 * allow-list, so this resolves the same way from a source checkout and from
 * an installed package.
 */
const PACKAGE_VERSION = require('../package.json').version;

/**
 * Recognized flag tokens. Any argv token starting with one or more dashes
 * that is not in this set is treated as an unrecognized option by `cli()`
 * (see `findUnknownOption`), never silently absorbed as a positional.
 * `--help`/`-h`/`--version` are NOT in this set — they are handled directly
 * inside `cli()`, before this check ever runs (see cli()'s doc comment).
 */
const KNOWN_FLAGS = new Set(['--dry-run']);

/**
 * Parses raw CLI argv (post `process.argv.slice(2)`) into a plain args
 * object. Pure function — no IO, no process.exit. The first non-flag token
 * is the verb; the second non-flag token (if any) is the target path
 * (defaults to `process.cwd()` when omitted); `--dry-run` sets dryRun=true
 * (consumed by the `migrate` verb only — `cli()` refuses it outright for
 * any other verb rather than letting a write happen under a flag that
 * promises otherwise).
 *
 * Note: this parser does not validate options — a mistyped flag (e.g.
 * `-full`) would be treated as a positional here. `cli()` guards against
 * that via `findUnknownOption` before dispatching, so callers relying on
 * `cli()` never observe a mistyped flag being misread as a target.
 */
function parseArgs(argv) {
  const positional = argv.filter((a) => !a.startsWith('--'));
  const dryRun = argv.includes('--dry-run');
  const verb = positional[0];
  const target = positional[1] !== undefined ? positional[1] : process.cwd();
  return { verb, target, dryRun };
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
function handleSetup(target) {
  const s = loadSetup();
  if (!s) {
    console.log('readev-tools setup: orchestrator arrives in a later release');
    return 0;
  }
  // s.run() returns a result OBJECT ({placed, pruned, failed, isBridge}),
  // never a number — bin/readev-tools.js assigns this handler's return value
  // straight to process.exitCode, which Node requires to be an integer.
  // Map the result to a numeric exit code here rather than passing the
  // object through. Null-safe: a stub/older run() that returns a bare object
  // without a `.failed` array must still yield 0, not throw.
  const result = s.run(target);
  printSetupReport(result);
  return result && Array.isArray(result.failed) && result.failed.length > 0 ? 1 : 0;
}

/**
 * Prints what a setup run placed, pruned, and failed to remove. `setup` was
 * the one verb that reported nothing — a successful install exited 0 in
 * silence, leaving no way to see what landed or what was deleted. Every
 * pruned path is named rather than only counted (a deletion the user cannot
 * see is the one worth showing); failures are counted here because setup.js
 * already warns with their full list.
 *
 * Null-safe by design: a stub or older `run()` may return a bare object with
 * no `placed`/`pruned`/`failed` fields, and that must print nothing at all
 * rather than "placed undefined file(s)".
 */
function printSetupReport(result) {
  if (!result || typeof result !== 'object') {
    return;
  }
  const placed = typeof result.placed === 'number' ? result.placed : null;
  const pruned = Array.isArray(result.pruned) ? result.pruned : [];
  const failed = Array.isArray(result.failed) ? result.failed : [];
  if (placed === null && pruned.length === 0 && failed.length === 0) {
    return;
  }

  const parts = [];
  if (placed !== null) {
    parts.push(`placed ${placed} file(s)`);
  }
  parts.push(`pruned ${pruned.length}`);
  if (failed.length > 0) {
    parts.push(`failed ${failed.length}`);
  }
  const suffix = result.isBridge ? ' — first run on a legacy install' : '';
  console.log(`readev-tools setup: ${parts.join(', ')}${suffix}`);
  for (const relPath of pruned) {
    console.log(`  pruned  ${relPath}`);
  }
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
    console.log('readev-tools verify: orchestrator arrives in a later release');
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
    console.log('readev-tools migrate: orchestrator arrives in a later release');
    return 0;
  }
  const result = m.migrate(target, { dryRun });
  printMigrateReport(m, result);
  return result && Array.isArray(result.failed) && result.failed.length > 0 ? 1 : 0;
}

/**
 * Builds the short usage/help text — shared by the stderr error path
 * (`printUsage`, below) and the stdout `--help` path in `cli()`, so the two
 * can never drift apart.
 */
function usageText() {
  return [
    'Usage: readev-tools <setup|verify|migrate> [target]',
    '  setup   [target]              place or refresh the toolkit (always writes)',
    '  verify  [target]              read-only health check',
    '  migrate [target] [--dry-run]  one-time v0.7.1 -> redesign bridge',
    '',
    '  -h, --help                    show this help and exit',
    '      --version                 show the installed version and exit',
  ].join('\n');
}

/**
 * Prints short usage help to stderr — the error path (unknown verb,
 * unrecognized option). `--help`/`-h` print the same text to stdout instead
 * (see `cli()`), since that is a successful, requested action, not an error.
 */
function printUsage() {
  console.error(usageText());
}

/**
 * Shown alongside usage ONLY when the specific rejected token is `--full`/
 * `-full` — `setup --full` was removed from the CLI (it only ever flipped a
 * GitHub/CI hand-off notice; the installer itself never touched GitHub or
 * CI). This points the user at where that wiring actually lives, without
 * adding noise to every other unrecognized-flag rejection.
 */
const FULL_FLAG_HINT =
  "readev-tools: '--full' was removed from the CLI — for GitHub/CI wiring, run " +
  '`/rea-init --full` inside your AI coding tool.';

const DISPATCH = {
  setup: (target) => handleSetup(target),
  verify: (target) => handleVerify(target),
  migrate: (target, dryRun) => handleMigrate(target, { dryRun }),
};

/**
 * Parses `argv` and dispatches to the matching verb handler. Returns an
 * exit code (0 ok, non-zero on error/unknown verb/unrecognized option).
 *
 * `--help`/`-h` and `--version` are checked FIRST — before the
 * unknown-option scan and before any verb dispatch — so `readev-tools
 * --help` (no verb at all) and `readev-tools <anything> --help` both print
 * usage to stdout and return 0, regardless of what else is in argv.
 *
 * Rejects any unrecognized `-`/`--` option (e.g. a mistyped `-full`) before
 * dispatch, rather than letting `parseArgs` silently absorb it as the
 * `target` positional. `setup --full` (removed from the CLI — see
 * `FULL_FLAG_HINT`) is rejected here too, with a one-line hint shown only
 * for that specific token so every OTHER unrecognized flag stays a plain
 * usage rejection. Never throws for an unknown verb, an unrecognized
 * option, or a missing orchestrator — only genuine internal errors
 * propagate.
 */
function cli(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usageText());
    return 0;
  }
  if (argv.includes('--version')) {
    console.log(PACKAGE_VERSION);
    return 0;
  }
  const unknown = findUnknownOption(argv);
  if (unknown) {
    printUsage();
    if (unknown === '--full' || unknown === '-full') {
      console.error(FULL_FLAG_HINT);
    }
    return 1;
  }
  const { verb, target, dryRun } = parseArgs(argv);
  const handler = DISPATCH[verb];
  if (!handler) {
    printUsage();
    return 1;
  }
  // `--dry-run` is migrate's flag alone. It used to be accepted globally and
  // then ignored, so `setup <target> --dry-run` performed a full, silent
  // install — a flag that promises "change nothing" must never be absorbed
  // by a verb that writes. Refuse rather than guess which one was meant.
  if (dryRun && verb !== 'migrate') {
    console.error(
      `readev-tools: --dry-run is supported by the 'migrate' verb only; '${verb}' always writes.`
    );
    printUsage();
    return 1;
  }
  return handler(target, dryRun);
}

module.exports = {
  parseArgs,
  cli,
};
