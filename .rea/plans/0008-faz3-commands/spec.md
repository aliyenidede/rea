# Spec — Faz 3: Commands

## What
The fourth slice of the REA redesign (Phase 3 in [`docs/rea-roadmap.md`](../../../docs/rea-roadmap.md) §4;
design in [`docs/rea-target-state.md`](../../../docs/rea-target-state.md) §5 / §8). Author the redesigned
**command layer** — the human-invoked rituals that **orchestrate** the Faz-2 sub-agents into the pipeline —
as tool-agnostic template source files under a new `templates/commands/` directory, ready for the future
npx installer (Phase 4) to place into any host tool's command folder. **Content only — no installer
logic, no Python CLI changes, no `rea verify` CLI verb (Phase 4).**

Nine commands, authored into `templates/commands/*.md`, carrying forward the existing legacy content in
`rea/templates/.claude/commands/` where an equivalent exists and applying the redesign edits:

- **rea-init** — tiered bootstrap: quick (default, no GitHub) vs `--full` (adds CI + branch protection). · L
- **rea-grill** — codebase-aware interview → shared understanding, writes `brief.md`. · A
- **rea-plan** — synthesise `brief.md` into layered spec / plan / todo, smart-zone sized. · B, H
- **rea-execute** — AFK build: computed frontier → parallel implementers → fresh-context review → loop.
  **The reference unit** — the shared execute contracts (frontier ownership, per-batch review selection,
  review-diff range) crystallise here. · D, E, G, I, C
- **rea-ship** — situation-aware commit / PR / deploy / health-check (detect → suggest → confirm). · L, K
- **rea-fix** — lightweight interactive plan-less bypass with an explicit escalation criterion. · G
- **rea-wrap** — light `.rea/`-only session summary; no commit, no dedup. · —
- **rea-tidy** — reconcile memory + shims + rules; dry-run → approve → fix (inline, no sub-agent). · F
- **rea-write-skill** — utility: author a new agent/command via `skill-writer`. · C, L

Plus: **move/rework `skill-writer`** into `templates/agents/skill-writer.md` (tool-agnostic, aligned to the
new conventions — Faz-2 parked this to Phase 3); a `templates/commands/README.md`; and doc-sync.

## Why
Faz 0 shipped the tool-agnostic content (`core/`: principles, craft-checklist, schema); Faz 1 shipped the
behaviour + memory structure (`AGENTS.md`, shims, `.rea/`); Faz 2 shipped the **operational building
blocks** (10 sub-agents). Faz 3 ships the **rituals that turn those blocks into a working pipeline** —
`talk` *(behaviour, not a command)* → `rea-grill` → `rea-plan` → `rea-execute` → `rea-ship` → `rea-wrap`,
with `rea-fix` as a bypass, `rea-tidy` as reconcile, `rea-init` as bootstrap. It **activates the schema
contracts end-to-end** (the commands are the first real *users* of `core/rea-schema.md`'s `U<n>` units,
computed frontier, and shim-write semantics — G2/G3/G6) and **resolves the reconciliations Faz 2 flagged
for this phase**: D7 frontier ownership, the content-authoring execute path, review-agent diff acquisition,
`rea-ship` solo/team detection, and the `rea-fix` escalation criterion.

## Scope — in
- `templates/commands/{rea-init,rea-grill,rea-plan,rea-execute,rea-ship,rea-fix,rea-wrap,rea-tidy,
  rea-write-skill}.md` (9 files)
- `templates/agents/skill-writer.md` (move/rework from the legacy tree; + its patterns reference if the
  agent depends on one)
- `templates/commands/README.md` (what the dir is; who places it; the parked per-tool-format note)
- doc-sync: `templates/README.md` (add the `commands/` subdir), root `CLAUDE.md` File Structure,
  `docs/rea-roadmap.md` Phase 3 status flip + the replaces-old-set mapping

## Scope — out (later phases / parked)
- **the npx installer** — init/prune/per-tool placement/marker-merge write logic, the **G1 ownership
  manifest** — **Phase 4**. `rea-init` (the command) is the *intelligent* bootstrap ritual only; the
  mechanical file placement is the installer's job (boundary noted in `plan.md`).
- **`rea verify`** — the *dumb* mechanical file/GitHub/branch-protection check — becomes a **CLI verb**
  (target-state §5.9), **not** a Phase-3 command. `rea-tidy` absorbs only the *intelligent* hygiene.
- **`rea-update`** — utility; its pip/PyPI update path is obsolete (npx, D1). Out of the Phase-3 nine.
- **per-tool command-format porting** (Gemini TOML `.gemini/commands/*.toml`, arg/shell micro-syntax) —
  **parked** (roadmap §6 pt 2); the source is single-format markdown serving the two first-class tools
  (Claude Code + oh-my-pi).
- **a real prompt-eval harness** (run a command against a fixture project, assert behaviour) — **deferred**
  (roadmap §9); P3 uses documentation-style structural acceptance checks (see Execution note).
- **the private v0.7.1 → redesign migration** and its UX — **Phase 5 / Phase 4 §10**.
- touching the Python CLI or the legacy `rea/templates/` tree (stays working during the transition).

## Constraints
- **Tool-agnostic body:** no host-tool names in the command prose (no `Claude`, no `.claude/`, no `/rea-*`
  slash syntax, no `Codex`/`Gemini`/`Cursor`/`oh-my-pi`/`omp`). Commands refer to each other and to agents
  **by bare name** (`rea-plan`, `explorer`). The minimal `name` / `description` frontmatter is the one
  per-tool wrinkle (the markdown-command model shared by the first-class tools); per-tool format porting is
  parked. **Carve-out:** `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, and Gemini's `settings.json` are the shim
  filenames defined by `core/rea-schema.md` (Shim write semantics); `rea-init` and `rea-tidy` may name them
  literally where they write / reconcile a shim — that is the schema's own vocabulary, not a host-tool-name
  violation.
- **`AGENTS.md` is the canonical root instruction file** — commands read project rules from it generically,
  never a hardcoded `CLAUDE.md` or a tool's native-memory API (same rule `plan-validator` follows).
- **Core references are project-root-relative** paths read at runtime (`core/rea-schema.md`,
  `core/craft-checklist.md`, `core/principles.md`) — a command runs with the **project root as CWD**. Never
  inline the schema/checklist text; never `../../` clickable links (same rule Faz 2 applied to agents).
- **Commands orchestrate; agents are building blocks** (`CLAUDE.md` rule 6): a command calls agents; agents
  never call agents. Every command must **degrade sensibly** when a sub-agent returns `BLOCKED` /
  `NEEDS_CONTEXT` (carry forward the legacy sequential-fallback pattern).
- **Operate the NEW `.rea/` schema** (`core/rea-schema.md`, schema-version 0.1) even though this plan is
  written in the OLD format: `rea-plan` writes the `| Unit | Title | Depends on |` `plan.md` table and the
  `### U<n> —` `todo.md` sections (`Files:`/`Done when:`/`Size:`/`Status:`); `rea-execute` reads per-unit
  `Status` and the **computed frontier** — **no scalar `NEXT`** (G3). Each field lives in exactly one file
  (G2).
- **Honor the shim + numbering + capture contracts:** shims written only inside `<!-- rea-tools:start -->` /
  `<!-- rea-tools:end -->` markers, Gemini `settings.json` = structured merge, memory writes go **only** to
  `.rea/` (G6b); numbered dirs minted by listing the directory, no central index, duplicate numbers cosmetic
  (G6a); the `capture` reflex's 3 triggers + memory-write filter apply inside every command that records a
  lasting decision.
- **Preserve `CC-NN` citations** when surfacing `code-reviewer` / `plan-reviewer` findings — never strip or
  summarise them away; treat CC-tagged design smells from `plan-reviewer` as implementation-blocking gaps.
- **Wikilinks:** bare names for the unique stores (`[[knowledge-entity]]`); path-qualified into plans
  (`[[plans/0008-faz3-commands/plan]]`).
- **Keep prompts lean** (`.rea/lessons.md` 2026-03-17 "curse of instructions"): carry-forward preserves
  working content; a full length-refactor of the already-long legacy commands is **out of scope**. Don't
  invent product/package names.

## Bootstrap note (same as Faz 0 / Faz 1 / Faz 2)
Planned and executed with the **current (v0.7.1)** commands — the redesigned `rea-grill` / `rea-plan` /
`rea-execute` don't exist yet (this phase *builds* them) — so this plan uses the old plan/todo format
(`NEXT:` markers, `[ ]` / `[x]` items), exactly as `0005`–`0007` did. The **new** `.rea/` schema is what
the redesigned commands *reference and produce*, not what this plan is written in.

## Execution note (content-authoring, not code — recurring)
When this plan is run via `/rea-execute`, every `implementer` is authoring **markdown prompt content**, not
code. Pass each one the stable content-authoring framing (`.rea/lessons.md` 2026-07-22 03:40 / 04:48):
*"this is docs/prompt content — no TDD, no code-tests; do NOT run git/commit; keep the body tool-agnostic
(no `Claude`/`.claude/`/`/rea-*`); do not invent product/package names."* Each todo `Test:` line is a
**structural** assertion readable from the authored command file (has the right sections, cites the schema,
orchestrates the correct agents, carries forward the named legacy safety logic) — never a code test. Treat
the `pytest` / `ruff` CI gate as a "didn't break the Python repo" safety net, not a content check.
