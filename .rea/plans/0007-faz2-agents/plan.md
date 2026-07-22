# Plan — Faz 2: Agents

## Brief
Author ten redesigned sub-agents into a new tool-agnostic `templates/agents/` directory, plus a dir
README and doc-sync. Each redesigned agent = the legacy `rea/templates/.claude/agents/<name>.md` content
**carried forward** with the specific redesign edits below. The legacy tree is the *reference source* and
stays untouched (Phase-4 prune removes it later). No commands, no installer, no Python changes.

**Method per agent:** read the legacy base file, apply the listed changes, write the result to
`templates/agents/<name>.md`. Preserve existing methodology / phases / confidence scoring /
false-positive filtering / "Rationalizations to Reject". Keep additions minimal (curse-of-instructions).

## Files to create
```
templates/agents/explorer.md          templates/agents/plan-reviewer.md
templates/agents/implementer.md        templates/agents/plan-validator.md
templates/agents/spec-reviewer.md      templates/agents/debugger.md
templates/agents/code-reviewer.md      templates/agents/dispatcher.md
templates/agents/bug-scanner.md        templates/agents/README.md
templates/agents/security-scanner.md
```

## Files to modify
```
templates/README.md        docs/rea-roadmap.md        CLAUDE.md
```

## Shared conventions (apply to every agent file)
1. **Frontmatter:** carry forward the legacy `name`, `description`, `tools`, and `model` verbatim
   (models already correct: explorer = haiku, all others = sonnet). No frontmatter changes.
2. **Principle tag:** add a one-line tag near the top (under the frontmatter or in the opening line)
   naming the principle letters that agent serves, e.g. `Principles: F, C`. Letters per the table below;
   names come from `core/principles.md`.
3. **Core references** are project-root-relative paths read at runtime (`core/craft-checklist.md`, etc.),
   never inlined and never `../../` links (see spec Constraints).
4. **Tool-agnostic body:** no `Claude` / `.claude/` / `/rea-*` strings in the prose.

## Per-agent changes

### code-reviewer.md · Principles F, C · (edit-heavy)
- Add principle tag `F, C`.
- **Craft-checklist wiring:** add a short step (in Phase 2 — Review, or a dedicated "Craft check" block):
  read `core/craft-checklist.md`; assess the diff against CC-01…CC-06; **MANDATORY — tag every _craft_
  finding with the `CC-NN` item it maps to** (per the checklist's citation rule). Correctness bugs with
  no CC mapping are still reported, without a CC tag.
- **Test-quality check:** add a review dimension — evaluate the tests the implementer wrote: do they
  assert real behaviour (not tautological / trivially-true), do they cover the risk of the change, are
  they meaningful? Report weak/missing tests as findings.
- Preserve the 4-phase methodology, confidence scoring (drop < 0.6), Hard Exclusions, Rationalizations.

### plan-reviewer.md · Principles A, B, C · (edit-heavy)
- Add principle tag `A, B, C`.
- **Craft-checklist wiring (design level):** read `core/craft-checklist.md`; flag *planned* designs that
  would violate a craft item (e.g. a shallow module / god object → CC-01, a leaky abstraction → CC-06);
  **tag such findings with `CC-NN`.**
- **Pre-mortem step (mandatory before a PASS verdict):** assume the plan was executed and failed;
  identify the 3 most likely causes, each with probability (low/medium/high) and whether the plan already
  mitigates it; an unmitigated high-probability cause forces `REVISE` (`.rea/lessons.md` 2026-03-28).
- Preserve the claim checklist, gap-finding, Option-A/B decision formulation, PASS/REVISE status. Keep it
  *adversarial*; the mechanical plan↔todo coverage is `plan-validator`'s domain.

### plan-validator.md · Principles B, J, L · (edit-heavy)
- Add principle tag `B, J, L`.
- **Schema alignment to `core/rea-schema.md`:** the plan↔todo cross-check now operates on the new unit
  model — units identified by their `U<n>` heading id; per-unit `todo.md` fields `Files:`, `Done when:`, `Size:`,
  `Status:` (`todo` | `in-progress` | `done` | `blocked`); dependencies declared via `plan.md`
  `Depends on`. Coverage checks: forward (every plan unit has a todo unit) + backward (every todo unit
  traces to a plan unit) + orphan detection, keyed on the `U<n>` unit id.
- **Retire scalar `NEXT`:** the validator must NOT expect or require a `NEXT:` pointer — the new schema
  has none; the executable set is the *computed frontier* (units with `Status: todo` whose `Depends on`
  are all `done`). Validate that statuses/deps are well-formed enough for the frontier to be computable
  (e.g. no dependency cycles, no dangling `Depends on`).
- **File paths come from `todo.md`, not `plan.md`:** under the new schema `plan.md` is dependency-graph
  only (`Unit | Title | Depends on`, no file paths). The placement / architecture check reads each unit's
  expected files from `todo.md`'s `Files:` field. Do NOT extract a file inventory from `plan.md` — it has
  none by design.
- **Generalise the rules source (tool-agnostic):** the rule-compliance check reads the project's root
  instruction/rules file generically — canonically `AGENTS.md` (the cross-tool instructions file) plus any
  project rules doc the host keeps — NOT a hardcoded Claude-specific filename (Decision 8). Keeps the body
  tool-agnostic and works on a host with no such file (degrades to "no project rules to enforce", not an
  error).
- Preserve: **glob the real project filesystem** before placement checks (`.rea/lessons.md` 2026-03-18);
  consistency checks; VALID / ISSUES-FOUND return.

### dispatcher.md · Principles I, H · (edit-heavy)
- Add principle tag `I, H`.
- **Reframe from schedule-builder to frontier-grouper:** the dispatcher RECEIVES an already-computed
  **frontier** (the units eligible now). Frontier eligibility (`Status: todo` + all `Depends on` done) is
  deterministic filtering with no LLM judgment, so the Phase-3 `rea-execute` orchestrator computes it and
  passes it in — the dispatcher does NOT compute it (Decision 7). Its job is the part that needs judgment:
  catch **physical same-file collisions** among the frontier units and group them for parallel fan-out —
  file-disjoint → one parallel group; sharing a file → serialize within the batch; `UNKNOWN` file impact →
  run alone/serial (safe default, carried forward).
- **File impact per unit comes from `todo.md`'s `Files:` field**, not `plan.md` (dep-graph only under the
  new schema). Fall back to grep only when `Files:` is absent; mark `UNKNOWN` if still unresolved.
- Drop the language that implies computing the full sequential schedule across all deps. Output = parallel
  groups for the current frontier + a file conflict map + notes. Keep SCHEDULED / BLOCKED return.

### implementer.md · Principles D, E, H · (edit-heavy)
- Add principle tag `D, E, H`.
- **Unit model:** the item it receives is a schema unit — honour `Files:` (expected touch set),
  `Done when:` (the completion condition to satisfy and report against), `Size:` (stay within it; don't
  re-split — principle H). Faithful to the unit; escalate if scope grows beyond it.
- **Scoped feedback-gate (principle D):** the inner gate runs **affected tests + lint only, NOT the full
  suite** (the full suite is the outer gate that `rea-execute` runs once, Phase 3). Refine the current
  Step 4b ("Tests") to "affected tests". Keep the mandatory-verify + retry-cap discipline: run lint +
  affected tests, fix failures, **max 2 retries, `BLOCKED` if still failing** (`.rea/lessons.md`
  2026-03-25) — do not soften to "run the relevant test suite".
- **TDD (principle E) — default-on:** at least one real test before every commit, for EVERY unit (not
  only high-risk). Rewrite the legacy low-risk branch ("write tests if the item specifies test criteria")
  so a test is the default; a unit may skip it ONLY when genuinely untestable (pure type/rename/comment)
  and then must state the reason — never silently, never a tautological test (mirrors `debugger`'s
  "(if testable)" escape; avoids colliding with `code-reviewer`'s no-tautological-test check). The risk
  tier gates the RED-GREEN-REFACTOR *rigor*, not whether a test exists (Decision 9; principle E / target-state §5).
- Preserve risk assessment (as the rigor gate), self-review, escalation, `DONE`/`BLOCKED`/`NEEDS_CONTEXT`,
  Rationalizations, and the no-fabrication rule.

### explorer.md · Principles A, J · (light)
- Add principle tag `A, J`. Strengthen/keep the "documentarian, not a critic" framing (read-only;
  reports what exists; does not propose changes). Keep haiku, keep read-only phases. No other changes.

### spec-reviewer.md · Principle K · (light)
- Add principle tag `K` and one line framing that its intent-match result **feeds the human QA
  checkpoint** (K = QA is the human moment). Keep PASS/FAIL, Missing/Extra/Wrong lists, Rationalizations.

### bug-scanner.md · Principle D · (light)
- Add principle tag `D` (part of the mandatory review/feedback loop). No methodology changes.

### security-scanner.md · Principle D · (light)
- Add principle tag `D`. No methodology changes.

### debugger.md · Principle L · (light)
- Add principle tag `L`. Ensure the "if testable" nuance is explicit in **Phase 4 (Implementation and
  Defense)** — the step that writes a failing regression test "(if testable)": when a fix ships without a
  regression test, the agent must state the reason it was not testable.
  Keep the 4 phases, escalation (3 attempts → architecture), Red Flags, Rationalizations.

## templates/agents/README.md (new)
2–5 lines: what `templates/agents/` is — the redesigned REA sub-agent building blocks (source of truth),
authored tool-agnostic; the future npx installer (Phase 4) places them into each host tool's agent folder
(`.claude/agents/`, oh-my-pi's location, …); per-tool *format* porting (Codex TOML) is parked; pointer to
`docs/rea-roadmap.md` §4 Phase 2. Note the models: explorer = haiku, the rest = sonnet.

## Doc-sync (modify)
- `templates/README.md`: add the `agents/` subdir to the tree description (the redesigned agent set),
  alongside the existing `AGENTS.md` / `shims/` / `.rea/` entries.
- `CLAUDE.md`: one line under File Structure noting `templates/agents/` (redesign-era agent sources);
  legacy `rea/templates/.claude/agents/` unchanged.
- `docs/rea-roadmap.md`: flip Phase 2 `⬜ → ✅` with a pointer to `.rea/plans/0007-faz2-agents/`. In §5:
  (a) the **G5** row — mark the craft-checklist "wire" as done (now in code-reviewer/plan-reviewer);
  (b) the **G2** and **G3** rows — append that Phase 2 agents (plan-validator/dispatcher/implementer) now
  reference the schema, alongside the existing "Phase 3 (used)" mapping. Change no other phase's status.

## Decisions

| # | Decision | Choice | Alternatives rejected | Rationale |
|---|----------|--------|-----------------------|-----------|
| 1 | Where the redesigned agent SOURCE files live | Neutral `templates/agents/*.md` | `templates/.claude/agents/` (Claude-specific path as source) — conflates content with placement, the anti-pattern the redesign corrects; in-place edit of legacy `rea/templates/.claude/agents/` — breaks the transition model | Layer-1 content is tool-agnostic; per-tool placement (`.claude/`, `.omp/`) is the Phase-4 installer's job. Mirrors `templates/AGENTS.md`. |
| 2 | How agents reference `core/` files | Project-root-relative path, read at runtime (`core/craft-checklist.md`) | Inline the checklist/principles text (drift, prompt bloat); `../../core/...` clickable links (wrong — agents run from project root, not from the file's location) | Single source of truth (pull, not push); resolves in both the source repo and a host where Phase 4 vendors `core/` at root. |
| 3 | `rea-router` | Drop (not authored in the new tree) | Keep it | No principle demands session-start routing; mid-session intent routing is the platform's job (`.rea/lessons.md` 2026-03-21). |
| 4 | `skill-writer` | Not touched this phase | Redesign it now | It serves the `rea-write-skill` utility command → belongs with the Phase-3 command work; out of Faz-2 scope. |
| 5 | Per-tool agent-format porting | Parked (single-format markdown source) | Emit Codex TOML / per-tool variants now | Roadmap §6 pt 3 parks it; first-class tools (Claude + oh-my-pi) both read the markdown format. |
| 6 | Prompt-length refactor of already-long agents (>100 lines) | Out of scope; keep carry-forward | Rewrite each to <100 lines | Faz 2 is edit-not-rewrite; a length refactor risks losing battle-tested content. Additions kept minimal instead. |
| 7 | Who computes the frontier (`Status: todo` + all `Depends on` done) | The Phase-3 `rea-execute` orchestrator (deterministic); `dispatcher` only groups | `dispatcher` computes it (target-state §5.4 literal wording) | Frontier eligibility is pure filtering with no LLM judgment; deterministic code beats an LLM agent for it. Documented so Phase 3 owns frontier computation. |
| 8 | `plan-validator`'s project-rules source | Generic project instruction file (canonically `AGENTS.md`) | Hardcode a Claude-specific rules filename | Tool-agnostic-body constraint + Faz-1 architecture (`AGENTS.md` is the cross-tool rules file); a hardcoded Claude filename breaks non-Claude hosts. |
| 9 | `implementer` TDD requirement | Default: ≥1 real test before every commit for every unit; skip ONLY when genuinely untestable, with an explicit stated reason (never silently, never a tautological test) | Legacy risk-tiered exemption (self-judged low-risk = test-optional) | Principle E / target-state §5 state TDD unconditionally; a self-judged "low-risk, no test" is the exact failure mode E exists to prevent. The stated-reason escape mirrors `debugger`'s "(if testable)" pattern and avoids colliding with `code-reviewer`'s no-tautological-test check. Risk tier still gates RED-GREEN-REFACTOR rigor, not whether a test exists. |

## Boundary notes (do NOT solve here)
- **Review-agent diff acquisition** — which commit range each review agent sees — is `rea-execute`
  wiring (Phase 3), not an agent-prompt concern (roadmap §9).
- **Content-authoring execute mode** — the `rea-execute` TDD/pytest mismatch for prose content — is the
  roadmap's deferred prompt-eval gap; handled at execution time via the framing block (spec Execution
  note), a real fix is Phase 3.

## Dependency graph (for the frontier / dispatcher during execute)
- The 10 agent files + `templates/agents/README.md` are mutually **file-disjoint** → all parallelisable.
- **Doc-sync** (`templates/README.md`, `CLAUDE.md`, `docs/rea-roadmap.md`) `Depends on` all agent files
  existing (it describes them) → runs last.
