# Spec — Faz 4 (part 2): `rea verify` + v0.7.1→redesign migration

## What
The next slice of Phase 4 (roadmap §4). Builds on the executed installer (0009): the mechanical
**`npx rea-tools verify`** health check (4c) and the **one-time v0.7.1→redesign migration** (4d). Both
sit on the already-built, tested installer modules (`manifest`, `shims`, `prune`, `setup`).

- **4c — `npx rea-tools verify`** — a tool-agnostic, **manifest-driven** health check: reads
  `.rea/.rea-manifest.json` and reports, per check, whether the install is intact (owned files present,
  `core/` trio + `.rea/` scaffold present, each recorded shim region intact). Reports only — it never
  fixes (fixing is `rea-tidy`'s job). Replaces the `verify` stub already wired in `src/cli.js`.
- **4d — migration** — the **one-time bridge** from a prior REA install to the redesign. Because the
  only REA installs that exist are v0.7.1 (which was Claude-only), this cleanup necessarily touches the
  legacy Claude-only artifacts v0.7.1 left behind — a **contained, mechanical legacy-remnant cleanup**,
  not part of the going-forward cross-tool product. Going forward, a cross-tool `setup` is the norm and
  needs no migration.

## Why
`setup` already does the safe, idempotent part of the jump (place the new cross-tool set, prune the
retired REA-owned skill files, write shims without clobbering, print "run migrate"). What's left is (a)
a way to confirm an install is healthy (`verify`) and (b) the **invasive** cleanup of a legacy host's
own files that `setup` deliberately does not touch: a now-dead SessionStart hook, the old flat `.rea/`
memory layout, and stale legacy artifacts. Per the locked boundary, invasive user-file surgery is a
**deliberate, reported, `--dry-run`-able `migrate` verb**, kept out of the idempotent `setup`.

## Scope — in

**4c — verify (tool-agnostic, manifest-driven):**
- `src/verify.js` — checks driven by the manifest, not hardcoded per tool:
  - **files present:** every `ownedFiles[]` path exists on disk.
  - **core/ + scaffold:** the `core/` trio at host root and the `.rea/` typed dirs exist.
  - **shims intact:** for each recorded `shimRegions[]` entry — a markdown shim still has its managed
    markers (and `CLAUDE.md`'s managed body is `@AGENTS.md`); a JSON shim (`.gemini/settings.json`) still
    has `AGENTS.md` in `context.fileName`.
  - **CI:** report presence/absence only (SKIP, never a hard fail — CI is `--full`/optional).
  - Output: a per-check `PASS/FAIL/SKIP` report; non-zero exit if any hard check FAILs.
- Wire `handleVerify(target)` in `src/cli.js` to lazy-load `src/verify.js` (same graceful-degrade
  pattern as `setup`), map the result to an exit code, update the usage string.
- Doc-sync: `docs/rea-target-state.md` Terms line + §5.9, and `templates/commands/rea-tidy.md`'s two
  "the dumb `rea verify` CLI verb (Phase 4)" references → the concrete `npx rea-tools verify`.
- JS tests: healthy install (all PASS), a missing owned file (FAIL), a broken/stripped shim (FAIL), a
  no-CI install (SKIP).

**4d — migration (one-time v0.7.1→redesign bridge):**
- `src/settings-surgery.js` — structured JSON read-modify-write on a legacy `.claude/settings.json`:
  **remove only the broken SessionStart hook** whose command references `.claude/agents/rea-router.md`
  (it errors every session once `rea-router.md` is pruned). Preserve every other key and hook, including
  the user's working PostToolUse lint hook (decision: never blind-remove working user config). Reuses the
  containment guard.
- `src/legacy-scan.js` — **detect and report** (never mutate) the legacy artifacts a v0.7.1 host has, for
  the migration report: an old full `CLAUDE.md` body outside the rea-tools markers (project rules the
  user should move into `AGENTS.md`); `.github/workflows/claude-review.yml` (the old `@claude`
  issue-comment `claude-code-action` form); `.claude/hooks/post-tool-use.sh`. These are flagged as "legacy
  — safe to remove / move", not auto-deleted.
- `src/rea-archive.js` — **archive, never delete** the legacy flat memory: move `.rea/log/` and
  `.rea/lessons.md` into `.rea/_archive/`. Guarded (containment; never touches the new typed dirs
  `knowledge/decisions/sessions/plans`). Public hosts then start fresh with the typed structure — the
  full old→new distiller is the **private Phase-5 skill**, not shipped.
- `src/migrate.js` — the orchestrator + the `migrate` verb: detect a legacy install
  (`setup.detectLegacyPresent`), then settings-surgery → rea-archive → legacy-scan → print a clear report
  (what changed, what was archived, what the user must do: review the preserved `CLAUDE.md` rules, remove
  the flagged legacy artifacts, `pip uninstall rea-dev`). Supports `--dry-run` (report only, no writes).
  Wire the `migrate` verb + `--dry-run` flag into `src/cli.js`.
- Doc-sync: roadmap §10 (v0.7.1→redesign migration UX — mark resolved, name the `migrate` verb);
  `docs/rea-target-state.md` §5.10 (note the public path = archive-not-distill).
- JS tests: a full legacy-host fixture → after `migrate`, the dead rea-router hook is gone, the lint hook
  + other keys survive, `.rea/log`+`lessons.md` are archived (not deleted), the typed dirs are untouched,
  the report lists the flagged artifacts; `--dry-run` writes nothing.

## Scope — out
- 4e (long-agent trim + `skill-writer` audience) — non-gating, separate later plan.
- The full old→new `.rea/` **content distiller** (flat log/lessons → typed knowledge/decisions/sessions)
  — the **private Phase-5** skill, not shipped; public migration archives + starts fresh.
- Auto-migrating the old `CLAUDE.md` prose into `AGENTS.md` — intelligent work; migration only
  flag-and-guides (decision 2). Auto-deleting user-editable `.yml`/`.sh` — reported, not deleted.
- Actually publishing npm/PyPI, pushing tags — user-gated manual steps.
- Any new hooks — the redesign uses **zero hooks (G4)**; migration only removes a broken legacy one.

## Constraints
- **Tool-agnostic where it can be:** `verify` is manifest-driven (works for whatever a host installed,
  not hardcoded to Claude). Migration's Claude-specificity is inherent to its *source* (v0.7.1 was
  Claude-only) and is a contained legacy concern — not the cross-tool norm.
- **Never blind-overwrite / never blind-delete (G6b/G1):** settings surgery is a structured JSON merge
  that preserves all other user content; archive moves (never deletes) user memory; legacy artifacts are
  reported, not auto-removed. Every write/move is containment-checked (inside the target root).
- **CLI is dumb:** `verify` and `migrate` are pure file/JSON IO. Anything intelligent (rewriting rules,
  authoring `AGENTS.md` content) stays in `/rea-init` or is flag-and-guide.
- **Reuse, don't re-implement:** build on `manifest`, `shims`, `prune`, `setup` (0009) — reuse their
  containment guard, deny-list, marker/EOL helpers, and `detectLegacyPresent`.
- Cross-platform (Windows first-class): forward-slash manifest paths, `\r?\n`-tolerant markers.

## Bootstrap note
Old plan/todo format (`NEXT:` markers), same as 0005–0009. Real executable code (JS) — `implementer`
units use genuine TDD (`node --test`); doc units stay content-authoring with `npm test`/`pytest`/`ruff`
as the repo safety net.

## Decisions (locked with the user this session)
1. **Migration home = a separate `npx rea-tools migrate` verb** (not auto inside `setup`) — invasive
   user-file surgery is a deliberate, reported, `--dry-run`-able step; `setup` stays idempotent-safe.
2. **Old full `CLAUDE.md` = flag-and-guide** (preserve the body, report "move into `AGENTS.md`") — not
   auto-migrated (that's intelligent work, not the dumb CLI's job).
3. **settings.json hook scope = remove only the broken rea-router SessionStart hook**; leave the working
   PostToolUse lint hook (report that REA no longer manages it). Never blind-remove working user config.
   Decided without escalating: hooks are a Claude-only legacy detail, not a cross-tool product decision.
