---
name: installer-testing-and-tooling
description: REA-specific gotchas for working in src/ + test/ — the npx readev-tools installer: how to run the suite, why it must be serial, CLI-verb wiring, and reuse/export traps.
type: knowledge
links: [0002-safe-path-hardening, 0003-npm-package-name-readev-tools]
---

# Installer testing & tooling (`src/` + `test/`)

Domain gotchas for the npx installer codebase that live only in code + lessons, not in
`principles.md` or any agent prompt. Read before editing `src/`/`test/` or planning against them.
Source lessons: `.rea/lessons.md` entries dated 2026-07-23 (01:24, 06:48, 20:05, 23:47).

## Names: the package is `readev-tools`, not `rea-tools`

`package.json` name = **`readev-tools`**, bin = **`bin/readev-tools.js`**, run via `npx readev-tools`.
`CLAUDE.md` and older memory still say `rea-tools`/`bin/rea-tools.js` — those are **stale**; trust
`package.json`. Rename rationale: [[0003-npm-package-name-readev-tools]].

## Running the suite — one exact form only

```
node --test --test-concurrency=1 test/*.test.js      # === `npm test`
```

- **`--test-concurrency=1` (serial) is mandatory, not a perf tweak** — some test files swap sibling
  modules on disk (see below); concurrent runs race them.
- A **bare directory** arg (`node --test test/`) treats the directory itself as one failing test.
- **Bare `node --test`** (no path) auto-discovers `*.test.js` **repo-wide**, sweeping vendored clones
  under `docs/researches/temp/` (openchamber/archon) into ~27 unrelated failures.
- A **zero-match glob exits 0** (silent green). After changing the pattern or file set, verify the
  **file count** actually ran — don't trust a green with no assertions.
- `engines.node` is pinned `>=20`; the `test/*.test.js` glob self-resolves (Node's glob on Windows,
  `/bin/sh` on Linux CI) — pin to a version you actually test that on, not an aspirational lower bound.

## Tests that swap real production modules on disk

`test/cli.test.js` exercises `cli.js`'s lazy-load paths ("module absent" / "module throws") by
**physically deleting/rewriting the real `src/setup.js` / `src/verify.js` / `src/migrate.js`** via its
`withoutVerify` / `withoutMigrate` / `withSetupStub` helpers. Under the separate-process runner this
races any other file that `require()`s those modules (`test/setup.test.js`, `test/verify.test.js`) —
and becomes destructive the moment the swapped module has real side effects (a real `setup.run()`
against the process cwd would delete live repo files).

If you add or touch such a test:
1. **Restore the original content in `finally`** (capture it once at load; never blind-delete).
2. **Never let a real side-effecting entry point run against `process.cwd()`**.
3. Rely on serial runs (above) so a swapping file completes before another loads the module.

## Wiring a new CLI verb (`src/cli.js`)

`cli.js` is a pure dispatcher: `parseArgs(argv)` → `{verb, target, full, dryRun}` → `DISPATCH[verb]`.
Contract quirk worth knowing: **verb handlers return an integer exit code** (`bin/readev-tools.js`
assigns it straight to `process.exitCode`), but the **orchestrators return objects**
(`setup.run`→`{placed,pruned,failed,…}`, `verify`→`{checks,ok}`, `migrate`→`{failed,skipped,findings,…}`);
each `handle*` maps object→code (non-empty `failed` ⇒ 1). Only `parseArgs`/`cli` are exported.

When adding a verb, two holes bite (both hit `migrate`, caught by review not by unit tests):
- **Mirror the sibling verb's full cli-dispatch test tier** — module-absent→graceful-degrade, real
  dispatch prints report + returns 0, failure→non-zero exit, and **flag-threading through the real
  `cli()` path** (not just `parseArgs`). Testing `migrate()`'s logic + `parseArgs(['migrate',…])` is
  not enough; the `cli(['migrate', target])` wiring seam is the untested part.
- **Growing `parseArgs`'s return shape ripples to every `deepEqual(parsed, {…})` assertion** in
  `test/cli.test.js` — adding `dryRun` broke three. Update them all in the same change.

## Planning against this code — reuse/export traps

- **A "reuse this function" plan must verify the function is in the module's `module.exports`, not
  merely defined.** Cite the export line. Known private (defined-but-not-exported) helpers a plan
  cannot `require`: `setup.detectLegacyPresent`, `shims.detectEol`/`buildBlockCore`/`parseTemplate`,
  `manifest.manifestPathFor`. This is the single highest-value mechanical check when a plan builds on
  prior code.
- **Before renaming/removing a shared export, re-grep the current tree for ALL importers at execution
  time** — a consumer count from an earlier plan phase goes stale. (Plan 0011 asserted
  `resolveInsideRoot` had "exactly two consumers"; 0010 had since added a third,
  `src/settings-surgery.js`.) Land the rename **+ every repoint in one atomic commit** — any
  intermediate commit breaks the build.
- All path-containment lives in one shared `src/safe-path.js` (`resolveInsideRoot`, `isInsideRoot`,
  `isRealpathInsideRoot`, `toCanonicalRel`, `isSamePath`) — every FS **write** (and `verify`'s owned/shim
  reads) goes through it; don't re-derive containment per module. Why: [[0002-safe-path-hardening]],
  [[plans/0011-safe-path-hardening/plan]].

## The legacy bridge fires on filenames, and only on a manifest-less host

`setup.js:115` sets `isBridge = legacyPresent && !hasManifest`, and `detectLegacyPresent`
(`setup.js:84-86`) is purely `RETIRED_FILES.some(exists)` — it asks "is any retired *filename* on
disk", nothing more. Two consequences that are easy to get backwards:

- **Once a host has a manifest, the bridge can never fire again for it** — `retired-list.js`'s own
  docstring says the list goes inert after the first run. Any warning that tells a user "the bridge
  will delete this" about a manifest-carrying host is false.
- **A user's own file can impersonate a legacy install.** Someone naming their command
  `.claude/commands/rea-commit.md` in a repo where `.rea/` is untracked hands the next fresh clone a
  retired filename with no manifest beside it — `detectLegacyPresent` matches, the bridge runs, and
  prune deletes their file. This is the real reason to refuse retired names when authoring a skill,
  not any risk on the current host.
  (2026-07-24, caught by `plan-reviewer` on plan 0012)

## Smoke-testing a publish: never run `npx` from this repo

`npx readev-tools@<version> …` executed with the cwd **inside this repo** fails with
`'readev-tools' is not recognized as an internal or external command`. `npm exec` sees the local
project (`package.json` name `readev-tools`), decides it already satisfies the spec, skips the
registry install, and then looks for the bin in `node_modules/.bin` — which this repo does not have
(zero runtime deps, never `npm install`ed). It looks exactly like a broken publish and is not one:
the same command from any other directory works. Verify a release from a scratch dir, and use a
version the local `package.json` does **not** match if you want to be sure the registry copy ran.
(2026-07-24, chased during the 0.1.1 publish)

## Auditing this tree with Grep — brace-glob false negative

A `Grep` with a **brace-expansion glob** (`000{6,7,8}-*/todo.md`) **combined with a path prefix** can
silently return **zero matches** — a false negative, not an empty set. On any absence/coverage
question ("are there deferred notes?", "any importers left?"), **distrust a suspiciously-empty result**:
re-run with a `**/`-anchored glob or the `Glob` tool to confirm the file set before concluding "none".
