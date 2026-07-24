# Plan — Faz 4 (part 2): `rea verify` + v0.7.1→redesign migration

Strict technical requirements. No code — behaviour only. Grouped **4c (verify) → 4d (migration)**. Both
build on the executed 0009 installer modules; each unit is one commit (1–5 files).

## Context (what already exists — reuse, don't re-implement)
- `src/cli.js` — `DISPATCH = {setup, verify}`, `KNOWN_FLAGS = {--full}`; `handleVerify()` is a stub
  ("coming in a later release"); `handleSetup` lazy-loads `./setup` and maps its result object to an exit
  code. `parseArgs`/`cli` are the entry points.
- `src/manifest.js` — exported: `load`, `listOwned`, `normalizeRelPath`, `MANIFEST_REL_PATH` (+ `save`,
  `recordOwned`, `recordShimRegion`, `createEmptyManifest`).
- `src/shims.js` — exported: `MARKER_START`, `MARKER_END`, `applyMarkerBlock`, `mergeGeminiSettings`,
  `resolveInsideRoot`, `writeShims`. (`detectEol`/`buildBlockCore`/`parseTemplate` are **internal** — a
  read-only marker-presence check uses the exported `MARKER_START`/`MARKER_END` constants.)
- `src/prune.js` — `DENY_PREFIXES`, `DENY_FILES`, `isProtected(relPath)`, `isInsideRoot(root, rel)`,
  `toCanonicalRel`. (Deny-list + containment guards. **Note:** `DENY_PREFIXES` includes `.rea/log/` and
  `DENY_FILES` includes `.rea/lessons.md` — so `isProtected` must NOT be used to gate the archive move,
  which must move exactly those two paths; see 4d-3.)
- `src/setup.js` — exported: `HOST_LAYOUT`, `run(targetRoot, {full, sourceRoot})`; holds the legacy
  `PIP_UNINSTALL_NOTICE` string (4d-4 extends it to mention `migrate`). **`migrate` does NOT reuse
  `detectLegacyPresent`** — that gate breaks because `setup`'s prune deletes the very files it detects, so
  `migrate` **self-gates** (see 4d-4).
- `src/retired-list.js` — `RETIRED_FILES` (exported; not needed by migrate under self-gating).
- `.rea/.rea-manifest.json` = `{version, ownedFiles:[fwd-slash rel], shimRegions:[{file, marker}]}`.
- Legacy v0.7.1 host shapes (migration source): a full `CLAUDE.md`; `.claude/settings.json` with a
  SessionStart hook `{type:command, command:"cat .claude/agents/rea-router.md"}` + a PostToolUse lint hook
  `{matcher:"Write|Edit", command:"bash .claude/hooks/post-tool-use.sh"}`; `.claude/hooks/post-tool-use.sh`;
  `.github/workflows/claude-review.yml` (`anthropics/claude-code-action`, `@claude` issue-comment,
  `ANTHROPIC_API_KEY`); flat `.rea/log/` + `.rea/lessons.md`.

---

## 4c — `npx rea-tools verify`

### 4c-1 — verify module
- Files: `src/verify.js`, `test/verify.test.js`.
- `verify(targetRoot)` returns `{checks:[{name, status:'pass'|'fail'|'skip', detail}], ok:boolean}`.
  Pure read-only — opens files but writes nothing.
- Checks, all driven by the manifest (tool-agnostic — never a hardcoded per-tool file list):
  1. **manifest present** — `manifest.load` finds a non-empty manifest; if absent → a single `fail`
     ("not installed — run `npx rea-tools setup`") and stop.
  2. **owned files present** — every `listOwned()` path exists on disk (via `resolveInsideRoot`); each
     missing path is a `fail` line.
  3. **core/ + scaffold** — `core/{principles,craft-checklist,rea-schema}.md` at host root and the four
     `.rea/{knowledge,decisions,sessions,plans}/` dirs exist.
  4. **shims intact** — for each `shimRegions[]` entry, choose the check by the recorded `marker` value
     (NOT a hardcoded path): a markdown-marker shim (`CLAUDE.md`/`AGENTS.md`) still contains its managed
     markers (reuse the exported `shims.MARKER_START`/`MARKER_END` constants for a read-only,
     `\r?\n`-tolerant presence check), and `CLAUDE.md`'s managed body is `@AGENTS.md`; a `context.fileName`
     shim (`.gemini/settings.json`) still has `AGENTS.md` in `context.fileName`.
  5. **CI** — report presence/absence of a CI workflow as `skip` (informational; CI is `--full`/optional,
     never a hard fail).
- `ok = no check has status 'fail'`.

### 4c-2 — wire the verify verb
- Files: `src/cli.js`, `test/cli.test.js` (extend).
- Add `handleVerify(target)` that lazy-loads `./verify` (mirroring `loadSetup`'s `require.resolve`
  graceful-degrade), calls `verify(target)`, prints the per-check `PASS/FAIL/SKIP` report, and returns
  `0` when `ok`, `1` otherwise. Update `DISPATCH.verify` to pass `target`. Update the usage string.
- Tests: `verify` on a healthy fixture → exit 0; on a fixture with a deleted owned file → exit 1; on a
  fixture with `verify.js` absent → graceful placeholder, exit 0 (degrade like setup).

### 4c-3 — doc-sync verify
- Files: `docs/rea-target-state.md`, `templates/commands/rea-tidy.md`.
- target-state Terms line (`rea setup`, `rea verify`) + §5.9: state the concrete invocation
  `npx rea-tools verify`. rea-tidy.md's two references (lines ~19, ~160) "the dumb `rea verify` CLI verb
  (Phase 4)" → `npx rea-tools verify` (built, not future).

---

## 4d — v0.7.1→redesign migration (one-time bridge)

### 4d-1 — settings.json hook surgery
- Files: `src/settings-surgery.js`, `test/settings-surgery.test.js`.
- `removeDeadRouterHook(targetRoot, {dryRun = false} = {})` — structured read-modify-write on
  `.claude/settings.json` (missing → no-op): parse JSON; from `hooks.SessionStart[]` remove only entries
  whose inner hook `command` references `.claude/agents/rea-router.md`; drop a now-empty `SessionStart`
  array; **preserve every other key and hook** (notably `hooks.PostToolUse` — the working lint hook
  stays). Write back with stable formatting only if something changed **and** not `dryRun`. Containment-
  checked. Returns `{changed, removed:[…]}` (computed identically in `dryRun`, but no file is written).
- Tests: a settings.json with the router SessionStart hook + a PostToolUse lint hook → after, the router
  hook is gone and the lint hook + any unrelated keys survive; a settings.json without the router hook →
  no change; missing file → no-op.

### 4d-2 — legacy scan (detect + report, never mutate)
- Files: `src/legacy-scan.js`, `src/shims.js`, `test/legacy-scan.test.js`.
- `scanLegacy(targetRoot)` returns a list of `{kind, path, advice}` findings, mutating nothing:
  - an old full `CLAUDE.md` — the content **before** the managed start-marker is non-empty **and is not
    an exact match** (EOL/whitespace-tolerant) to the shim's own canonical preamble note. **Avoids the
    false-positive** where a freshly-`setup`-created shim legitimately has that preamble above the markers
    (`shims.applyMarkerBlock`'s absent-file branch prepends it; the legacy-append branch does not). To
    prevent drift, **export the canonical preamble as a named constant from `src/shims.js`** (e.g.
    `CLAUDE_SHIM_PREFIX`) and compare against it — single source of truth vs. `templates/shims/CLAUDE.md`.
    (advice: "once `AGENTS.md` exists, move these project rules into it".)
  - `.github/workflows/claude-review.yml` present (advice: "legacy `@claude` review action — remove or
    replace with your CI's review").
  - `.claude/hooks/post-tool-use.sh` present (advice: "legacy REA lint hook — REA no longer manages it;
    keep or remove").
- Tests: a full-legacy fixture (all three) → three findings; a clean redesign host → none; **a
  freshly-shimmed `CLAUDE.md` (preamble note + markers, nothing else) → no CLAUDE.md finding** (proves the
  false-positive is closed); mutating nothing (fixture byte-unchanged).

### 4d-3 — legacy `.rea/` archive (move, never delete)
- Files: `src/rea-archive.js`, `test/rea-archive.test.js`.
- `archiveLegacyRea(targetRoot, {dryRun = false} = {})` — if `.rea/log/` or `.rea/lessons.md` exist, move
  them under `.rea/_archive/`, preserving relative structure (nested paths like `.rea/log/2026-01/x.md`
  land at `.rea/_archive/log/2026-01/x.md`); **never delete**. On `dryRun`, compute `{moved:[…]}` and
  perform **no writes at all** — create `.rea/_archive/` (and any subdirs) **only when `!dryRun` and there
  is something to move**, so a dry run leaves the tree byte-identical (no stray empty dir). Idempotent (a
  second run finds nothing to move).
- **Symlink scope:** sources are fixed literals (`.rea/log/`, `.rea/lessons.md`), not caller-supplied, so
  the realpath/symlink-escape guard `prune` applies to deletes is **out of scope** here; containment via
  `prune.isInsideRoot` on the destination is sufficient (stated explicitly rather than left implicit).
- **Never-archive guard (do NOT use `prune.isProtected`):** `prune`'s deny-list protects `.rea/log/` +
  `.rea/lessons.md` from deletion — the exact paths this unit must move — so `isProtected` is the wrong
  guard here. Instead, hardcode the never-archive set as only the **typed** dirs
  (`.rea/{knowledge,decisions,sessions,plans}`) + the manifest, and use `prune.isInsideRoot` /
  `prune.toCanonicalRel` for containment. Returns `{moved:[…]}`.
- Tests: a host with `.rea/log/x.md` + `.rea/lessons.md` + a typed `.rea/knowledge/k.md` → after, the two
  legacy paths live under `.rea/_archive/`, the typed note is untouched, nothing deleted; second run is a
  no-op.

### 4d-4 — migrate orchestrator + verb
- Files: `src/migrate.js`, `src/cli.js`, `src/setup.js`, `test/migrate.test.js`.
- **`migrate` self-gates — it does NOT call `detectLegacyPresent`** (that gate is invalid: `setup`'s
  prune deletes `rea-router.md`, so on the natural `setup`→`migrate` order the detector returns false and
  the verb would silently skip all its work). Instead run all three sub-checks and report "nothing to
  migrate" only when **all three** find nothing.
- `migrate(targetRoot, {dryRun})` — order: `removeDeadRouterHook(target,{dryRun})` →
  `archiveLegacyRea(target,{dryRun})` → `scanLegacy(target)` (read-only) → aggregate. If
  `!changed && moved.length===0 && findings.length===0` → "nothing to migrate". `dryRun` is threaded into
  the two mutating sub-modules (whose signatures accept it), so a dry run performs no writes/moves. Print
  a clear report: hook fixed, paths archived, legacy artifacts to review/remove, and the reminder — "once
  `AGENTS.md` exists, move the preserved `CLAUDE.md` rules into it" + `pip uninstall rea-dev`.
- **Update `src/setup.js`'s legacy notice** (`PIP_UNINSTALL_NOTICE`) so a legacy user learns `migrate`
  exists: after "pip uninstall rea-dev", add "run `npx rea-tools migrate` to finish the transition". This
  is the only reason 4d-4 touches `setup.js` (no `detectLegacyPresent` export).
- `src/cli.js`: add `migrate` to `DISPATCH` + `handleMigrate(target,{dryRun})`→exit code; add `--dry-run`
  to `KNOWN_FLAGS` + thread through `parseArgs`; usage → `<setup|verify|migrate> [target] [--full]
  [--dry-run]`.
- Tests (integration on a full legacy-host fixture): after `migrate` → dead router hook gone, lint hook +
  keys survive, `.rea/log`+`lessons.md` archived, typed dirs untouched, report lists the three scanned
  artifacts; `--dry-run` → identical report but the fixture is byte-for-byte unchanged.

### 4d-5 — doc-sync migration
- Files: `docs/rea-roadmap.md`, `docs/rea-target-state.md`.
- roadmap §10: mark the "v0.7.1→redesign migration UX" resolved — name the `npx rea-tools migrate` verb,
  its flag-and-guide + archive-not-delete behaviour, and that it's a one-time Claude-legacy bridge.
- target-state §5.10: note the **public** path = archive-and-start-fresh (the content distiller stays the
  private Phase-5 skill).

---

## Architecture decisions
- **`verify` is manifest-driven and tool-agnostic** — it validates whatever the manifest says was
  installed, so it works for any host, not a hardcoded Claude file list.
- **Migration is a one-time, deliberate `migrate` verb**, separate from the idempotent `setup`. Its
  Claude-specificity is inherent to its source (v0.7.1 was Claude-only); it is a contained legacy-remnant
  cleanup, not the cross-tool product surface.
- **`migrate` self-gates on actual work found, not on a legacy-detector** — so it is correct in either
  run order (`setup`→`migrate` or `migrate`→`setup`) and naturally idempotent (a second run finds nothing
  and reports "nothing to migrate"). It never depends on `setup`'s prune timing.
- **Safe by construction:** surgery is a structured JSON merge (preserve all else); archive moves never
  delete; legacy artifacts are reported not auto-removed; every mutation is containment-checked. Reuses
  the 0009 guards rather than re-implementing them.
- **No new runtime deps** — Node built-ins; `node:test` runner.

## Decisions table
| # | Decision | Choice | Alternatives rejected | Rationale |
|---|----------|--------|-----------------------|-----------|
| 1 | Migration home | Separate `npx rea-tools migrate` verb (`--dry-run`) | Auto inside `setup` on legacy-detect | Invasive user-file surgery must be deliberate + reported; keeps `setup` idempotent-safe. (User-locked.) |
| 2 | Old full `CLAUDE.md` | Flag-and-guide (preserve + report) | Auto-migrate prose into `AGENTS.md` | Parsing/moving rules is intelligent work — not the dumb CLI's job; belongs to `/rea-init`. (User-locked.) |
| 3 | settings.json hook scope | Remove only the broken rea-router SessionStart hook; keep the lint hook | Also remove the PostToolUse lint hook + `post-tool-use.sh` (G4) | Never blind-remove working user config; the broken hook must go, the working one is the user's. Decided silently — a Claude-legacy plumbing detail, not a cross-tool decision. |
| 4 | `verify` scope | Read-only report, manifest-driven | Verify-and-fix | Fixing is `rea-tidy`'s job; "CLI is dumb"; keeps `verify` tool-agnostic. |
| 5 | `.rea/` legacy data | Archive to `.rea/_archive/` (move, never delete) | Delete / auto-distill | Never lose user memory; the full distiller is the private Phase-5 skill. |

## Pre-mortem (filled at Step 8 against plan-reviewer output)
Placeholder.
