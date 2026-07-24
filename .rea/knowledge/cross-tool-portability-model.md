---
name: cross-tool-portability-model
description: "REA's canonical cross-tool portability model — sources are tool-agnostic under core/+templates/, per-tool placement is the installer's job, and portability is stated PER LAYER (methodology ports everywhere now; skill-files are first-class only on markdown-command tools). The redesign ships zero hooks."
type: reference
links:
  - cross-platform-placement-default
---

# Cross-tool portability model

The single canonical statement of how the REA redesign is "cross-tool." It was re-tripped on 4×
across sessions (drifting to a Claude default, over-claiming "full cross-platform," resurrecting the
"Claude adapter" framing, escalating hook cleanup as a user decision) — so it lives here once instead
of being re-derived. This note only consolidates; the authoritative homes are cited inline — don't
restate them here.

## Two layers — state portability per layer, never flatly

| Layer | What | Portability today |
|-------|------|-------------------|
| Methodology | `AGENTS.md` + the `.rea/` schema | Ports to **every** tool now. |
| Skill-files | commands + agents | Shared markdown, port **~1:1**; **first-class only on markdown-command tools** (Claude Code + oh-my-pi). TOML tools (Gemini, Codex) are **⏸ parked**. |

Never say "full cross-platform" unqualified — it's true for the methodology layer and only partial for
skill-files. See `docs/rea-roadmap.md` §6 (the per-tool matrix + parking rationale, points 2–4).

## Source vs placement

- Sources are **tool-agnostic** under `core/` (vendored knowledge) and `templates/` (install payload).
  **Never author a host-tool source path** — no `templates/.claude/…`.
- Per-tool placement (`.claude/`, `.omp/`, …) is the **installer's** job (Phase 4).
- There is **no fat per-tool adapter — only thin placement**. Command *content* is shared markdown;
  only *placement* is tool-specific. The old "Claude adapter / Layer-2 is Claude-only" framing is
  **superseded** (`docs/rea-roadmap.md` §2, per the oh-my-pi finding).

## Hooks & Claude-legacy plumbing

- The redesign ships **zero hooks** (roadmap decision **G4**, `docs/rea-roadmap.md` §5).
- `.claude/`, `settings.json`, and hooks surface **only** as remnants of migration's v0.7.1 source
  (which was Claude-only) — treat them as contained, mechanical legacy cleanup and **decide such
  Claude-only micro-details silently** with the safe default; they never reach the user as decisions.
- Discuss the redesign at the **cross-tool level**. The filter: "cross-tool product decision, or
  Claude-legacy plumbing detail?" — only the former is surfaced.

## Already enforced / stated (pointers, not restatement)

- `templates/agents/skill-writer.md` — enforces the **tool-agnostic body** rule for every authored
  skill (no host-tool name or private path; siblings by bare name; `.rea`/`core/` cited root-relative).
- `templates/README.md` + `templates/agents/README.md` — the source-vs-placement boundary at the
  directory level (neutral source here; installer places per-tool).
- [[cross-platform-placement-default]] — the feedback memory this note canonicalizes (paths + framing
  + what-to-surface, incl. the 2026-07-23 hooks broadening).
