---
number: 7
date: 2026-07-24
status: accepted
superseded-by:
---

# 0007 — Defer the agent prompt-length trim until usage names a target

## Status

Accepted — 2026-07-24. Resolves half of the parked "4e" item; the other half (skill-writer's host
audience) becomes plan 0012.

## Context

Eight agents under `templates/agents/` exceed the ~100-line guideline: implementer 175,
security-scanner 171, plan-validator 168, bug-scanner 148, dispatcher 145, plan-reviewer 144,
skill-writer 143, code-reviewer 137. (explorer 73 and spec-reviewer 74 are inside it.)

The guideline's only source is `.rea/lessons.md:21` — *"Prompt length inversely correlates with
compliance per instruction ('curse of instructions'). Rule: keep agent prompts under 100 lines. If
longer, split into core prompt + reference files."* It is a lesson from prior experience, stated in
lines, never measured against this codebase.

Phase 2 already declined the trim once: `.rea/plans/0007-faz2-agents/plan.md` Decision 6 — *"Out of
scope; keep carry-forward … a length refactor risks losing battle-tested content."* Phase 4 parked it
again as non-gating "4e".

The blocking problem is measurement. The product is prompt content, and there is no eval harness —
plan 0008 decided documentation-style structural acceptance checks and explicitly deferred a real
command-eval. Nothing in `test/` asserts agent length, required sections, or conformance;
`test/templates.test.js` checks link resolution and stray closing tags only. So a trim could be
verified as *conformant* and *structurally intact* while being behaviourally worse, and we would not
know. `.rea/lessons.md:350` names this trap directly: conformance ≠ preservation ≠ efficacy.

## Decision

Do not trim now. The cost/benefit is inverted: the benefit is speculative (the guideline is
unmeasured here), the risk is concrete (losing instructions that demonstrably work), and we have no
instrument to tell the two apart.

This is a deferral with a trigger, not an open TODO. **Trim an agent when its own behaviour shows it
is over-instructed**, one agent at a time, with the observation cited:

- `implementer` skipping the test-first cycle or the self-review phase
- `bug-scanner` / `security-scanner` ignoring their hard exclusions or confidence thresholds
- `code-reviewer` / `plan-reviewer` not applying the false-positive filter
- any agent visibly dropping a phase its prompt mandates

At that point the target is known, the failure is the evidence, and the fix is scoped to one file —
which is a better position than a speculative sweep across eight.

Building an eval harness first was considered and rejected for now: with a handful of fixture runs
per agent it would not produce a trustworthy signal, and it converts a polish item into its own
project. If real usage makes trimming urgent across many agents at once, revisit the harness then.

## Consequences

- `templates/agents/` stays as-is. The ~100-line guideline remains a guideline, now with a recorded
  reason for the current exceptions.
- Phases stop re-litigating "what about 4e" — the trim has an owner condition instead of a backlog
  slot.
- Anyone trimming later must cite the observed failure in the plan, not the line count.
- The line counts above are a snapshot; re-measure before acting on them.
