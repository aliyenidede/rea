# Spec — Faz 2: Agents

## What
The third slice of the REA redesign (Phase 2 in [`docs/rea-roadmap.md`](../../../docs/rea-roadmap.md) §4;
design in [`docs/rea-target-state.md`](../../../docs/rea-target-state.md) §5 / §8). Author the redesigned
**sub-agent building blocks** as tool-agnostic template source files under a new `templates/agents/`
directory, ready for the future npx installer (Phase 4) to place into any host project. **Content only —
no installer logic, no Python CLI changes, no commands (Phase 3).**

Ten agents, authored fresh into `templates/agents/*.md`, carrying forward the existing legacy content in
`rea/templates/.claude/agents/` and applying the redesign edits:

- **explorer** — read-only fact-finder, "documentarian, not a critic". · A, J · haiku
- **implementer** — TDD (a test before every commit, minimum) + scoped feedback-gate (affected tests +
  lint, **not** the full suite) + faithful to the plan unit; aligned to the new `.rea/` schema unit
  fields. · D, E, H · sonnet
- **spec-reviewer** — matches intent → feeds the human K checkpoint. · K · sonnet
- **code-reviewer** — quality (deep modules) + a **test-quality** check + **consults
  `core/craft-checklist.md`** (tags every finding `CC-NN`). · F, C · sonnet
- **bug-scanner** — logic / edge / races. · D · sonnet
- **security-scanner** — OWASP. · D · sonnet
- **plan-reviewer** — *adversarial* (gaps, unresolved decisions, **pre-mortem**) + **consults
  `core/craft-checklist.md`** for design-level craft risks (tags `CC-NN`). · A, B, C · sonnet
- **plan-validator** — *mechanical* (rules compliance, file placement, plan↔todo coverage / orphan);
  aligned to `core/rea-schema.md` (`U<n>` unit-id join, computed frontier — **no scalar `NEXT`**);
  filesystem = source of truth. · B, J, L · sonnet
- **debugger** — root-cause: 4 phases, backward trace, escalation; "if testable" needs a stated reason.
  · L · sonnet
- **dispatcher** — groups the **computed frontier** by *physical* file-conflict for parallel fan-out (the
  plan gives logical deps; this catches same-file collisions among frontier units). · I, H · sonnet

## Why
Faz 0 shipped the tool-agnostic content (`core/`: principles, craft-checklist, schema); Faz 1 shipped the
behaviour + memory structure (`AGENTS.md`, shims, `.rea/` scaffold). Faz 2 ships the **operational
building blocks** — the sub-agents that commands (Phase 3) orchestrate. It **activates two Faz-0 assets
that are currently dormant**: it wires `core/craft-checklist.md` into `code-reviewer` / `plan-reviewer`
(closes Principle C's wiring, G5) and aligns the plan-mechanics agents (`plan-validator`, `dispatcher`,
`implementer`) to the new `core/rea-schema.md` (computed frontier, `U<n>` unit fields — G2/G3). It
also drops `rea-router` (no principle demands session-start routing; `.rea/lessons.md` 2026-03-21).

## Scope — in
- `templates/agents/{explorer,implementer,spec-reviewer,code-reviewer,bug-scanner,security-scanner,
  plan-reviewer,plan-validator,debugger,dispatcher}.md` (10 files)
- `templates/agents/README.md` (what the dir is; who places it; the parked per-tool-format note)
- doc-sync: `templates/README.md` (add the `agents/` subdir), root `CLAUDE.md` File Structure,
  `docs/rea-roadmap.md` Phase 2 status flip

## Scope — out (later phases / parked)
- the commands that orchestrate these agents (`rea-grill` / `rea-plan` / `rea-execute` / …) — **Phase 3**
- `skill-writer` — **not** part of this phase's edits; stays in the legacy tree; its move/rework is
  Phase 3 (it serves the `rea-write-skill` utility command)
- `rea-router` — **dropped**; simply not authored into `templates/agents/`. Removing the legacy file and
  its SessionStart hook is the **Phase 4** manifest prune + retired-file list, not this phase
- the npx installer: init / prune / per-tool placement / marker-merge write logic — **Phase 4**
- **per-tool agent-format porting** (Codex TOML `.codex/agents/`, etc.) — **parked** (roadmap §6 pt 3);
  the source is single-format markdown that serves the two first-class tools (Claude Code + oh-my-pi)
- touching the Python CLI or the legacy `rea/templates/` tree (stays working during the transition)
- roadmap §9 "review-agent diff acquisition" (which commit range each review sees) — a **Phase 3**
  (`rea-execute` wiring) concern; noted as a boundary here, not solved

## Constraints
- **Tool-agnostic body:** no host-tool names in the agent prose (no "Claude", no `.claude/`, no `/rea-*`).
  The frontmatter (`model:`, `tools:`) is the one per-tool wrinkle and uses the markdown-subagent format
  shared by the first-class tools; per-tool format porting is parked.
- **Core references are project-root-relative** (e.g. `core/craft-checklist.md`, `core/principles.md`,
  `core/rea-schema.md`) — an agent runs with the **project root as CWD**, so it resolves the file from
  root regardless of where the agent file itself lives. This is *different* from the Faz-1 static-doc
  link rule (`.rea/lessons.md` 2026-07-22 04:48): agents pull files at runtime, they do not carry
  clickable `../../` links. Relies on the Faz-1 provisional assumption that Phase 4 vendors the `core/`
  trio at the host project root (roadmap §10); if Phase 4 relocates `core/`, these references get the
  same one-line follow-up as the `AGENTS.md` map.
- **Pull, don't inline:** agents reference `core/` files by path (read on demand); never copy the
  checklist/principle text into the prompt (single source of truth; avoids drift; keeps prompts short).
- **Mandatory `CC-NN` citation:** `code-reviewer` and `plan-reviewer` must tag every **craft** finding
  with the `CC-NN` item it maps to (per `core/craft-checklist.md`); non-craft findings (correctness bugs,
  spec / security issues) carry no CC tag.
- **Keep prompts lean** (`.rea/lessons.md` 2026-03-17 "curse of instructions"): additions are minimal
  (a short consult block + a one-line principle tag), not a new large section. A full length-refactor of
  the already-long agents (some >100 lines) is **out of scope** — carry-forward preserves working content.
- **Preserve working content:** keep each agent's existing methodology, phases, confidence scoring,
  false-positive filtering, and "Rationalizations to Reject" tables (`.rea/lessons.md` 2026-03-28).
- **`plan-validator` globs the real filesystem** before checking placement (`.rea/lessons.md` 2026-03-18).
- **Action-taking agents return `NEEDS_CONTEXT`/`BLOCKED`** when external info is missing; never fabricate
  (`.rea/lessons.md` 2026-03-18).
- Follows `core/rea-schema.md` (schema-version 0.1) for the unit-field / frontier vocabulary and
  `docs/rea-target-state.md` §5 for each agent's role + principle map.

## Bootstrap note (same as Faz 0 / Faz 1)
Planned and executed with the **current (v0.7.1)** commands — `rea-grill` / the new pipeline don't exist
yet (Phase 3) — so this plan uses the old plan/todo format (`NEXT:` markers, `[ ]`/`[x]` items), exactly
as `0005-faz0-core` and `0006-faz1-agents-shims` did. The **new** `.rea/` schema is what the redesigned
agents *reference*, not what this plan is written in.

## Execution note (content-authoring, not code — recurring)
When this plan is run via `/rea-execute`, every `implementer` is authoring **markdown prompt content**,
not code. Pass each one the stable content-authoring framing (`.rea/lessons.md` 2026-07-22 03:40 / 04:48
/ 04:48-recurred): *"this is docs/prompt content — no TDD, no code-tests; do NOT run git/commit; keep the
body tool-agnostic; do not invent product/package names."* Treat the `pytest`/`ruff` CI gate as a
"didn't break the Python repo" safety net, not a content check.
