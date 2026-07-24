# Plan — Faz 0: rea-tools shared foundation (`core/`)

## Context
Author the shared, tool-agnostic foundation of the REA redesign under `core/`. Content + doc-sync
only; packaging / installer / adapters are later phases. Governed by `docs/rea-target-state.md` §9.

## Files to create
- `core/README.md` — what the shared foundation is; that **both** rea-tools and rea-cli use it; what
  each file is; note that the npm/publishing wrapper + version pinning come later.
- `core/principles.md` — the 12 principles (A–L), canonical copy, **as pure principle statements**:
  strip the stale `→ REA:` skill-mapping lines and the now-false "Gap" note from the old
  `docs/principles.md` (tool-agnostic, no dropped-command references).
- `core/craft-checklist.md` — short curated code-quality checklist; each item a stable tag id
  (`CC-01`…) so review agents cite which item a finding maps to. Items: deep-vs-shallow module, code
  smells, naming, real error handling, right abstraction (grow later if thin).
- `core/rea-schema.md` — the `.rea/` format spec (see below), stamped `schema-version: 0.1`.

## Files to modify
- `docs/principles.md` — **truncate to a short pointer note** to `core/principles.md` (canonical); the
  full historical text stays in git, not duplicated on disk (avoids the very drift Faz 0 prevents).
  Existing links to this path (e.g. from `rea-target-state.md`) still resolve — they land on the
  pointer, which forwards to `core/`.
- `README.md` (repo) — short note: `core/` is the shared foundation; pointer to `rea-target-state.md` §9.
- `CLAUDE.md` — one-line note under File Structure that `core/` now holds the tool-agnostic foundation
  (full CLAUDE.md rewrite is a later phase).

## `rea-schema.md` — contents (step by step)
_Scope note: despite the name, this doc also states the **shim/write contract** (item 7) for root shim
files that live outside `.rea/`; state this in the doc's intro._
1. **Directory layout:** `knowledge/` (entity notes), `decisions/` (numbered ADRs), `sessions/`
   (timestamped), `plans/` (numbered dirs: brief/spec/plan/todo.md).
2. **Per-note-type naming/collision (§4):** `knowledge/` = entity-name, update-in-place, collision-guard
   (read-on-collision, disambiguate); `decisions/` = numbered, append-only, supersede-never-overwrite;
   `sessions/` = timestamped (naturally unique).
3. **plan.md format (G2):** dependency-graph table `| Unit | Title | Depends on |` (+ optional Mermaid).
   `Depends on` lives ONLY here.
4. **todo.md format (G2):** one section per unit, heading `### U<n> — <title>` (fixed, regex-checkable;
   unit-id derives from it); fields `Files:`, `Done when:`, `Size:`, `Status:` — each lives ONLY in
   todo.md. **unit-id is the join key** between plan.md and todo.md.
5. **Unit status + frontier (G3):** statuses `todo → in-progress → done | blocked`; frontier = units
   with `Status: todo` AND all `Depends on` = `done`; **no scalar NEXT pointer**; resume = recompute
   frontier + re-verify `in-progress` (commit exists → `done`, else → `todo`).
6. **Numbering (G6a):** `NNNN-slug`; uniqueness from the slug, not the number; **no central index file**;
   duplicate numbers are cosmetic (tidy renumbers).
7. **Shim write semantics (G6b):** markdown shims use managed markers `<!-- rea-tools:start … end -->`
   (replace only the managed region); JSON (settings.json) uses structured read-modify-write merge;
   **never blind-overwrite**.
8. **Capture note format only (§4):** minimal *provisional* fields per type — knowledge:
   name/description/type/links · decisions: number/date/status/superseded-by · sessions:
   date/summary/links (provisional; extend once `capture` ships). The write-**filter** *behavior*
   ("would another CLI find this useful?", `.rea/`-only) is an **`AGENTS.md` rule authored in a later
   phase** — one-line forward-pointer here, not the full rule (avoids duplicating/diverging it).
9. **Wikilinks:** bare entity names; path-qualified inside `plans/*/`.
10. **`schema-version: 0.1`** stamp + **bump policy** (minor on any field/rule addition, major on a
    breaking rename/removal) + a one-line note that consumers (rea-cli) will pin a schema version once
    packaging exists.

## Decisions
| # | Decision | Choice | Rejected | Rationale |
|---|----------|--------|----------|-----------|
| 1 | Foundation location | top-level `core/` | `packages/rea-core`, `@readev/core` scope | simplicity now; monorepo/package name deferred to when rea-cli vendors it |
| 2 | Faz 0 scope | content + doc-sync only | include npm packaging / installer | keep tight; packaging is a later phase |
| 3 | Schema format | markdown spec + templates | JSON Schema | §9/G2 — markdown-first, regex-checkable |
| 4 | principles source of truth | `core/principles.md` | keep in `docs/` | `core/` is the shared **source of truth** (used by both products); `docs/` = design-history |
| 5 | versioning | `schema-version` stamp in `rea-schema.md` | full package.json/semver now | version exists without premature npm setup |
