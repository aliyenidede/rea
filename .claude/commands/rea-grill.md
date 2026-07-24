---
name: rea-grill
description: "Codebase-aware interrogation ritual — explores the project with `explorer`, resolves open decisions one question at a time (with optional frontier-batching), works through design alternatives, and writes a brief for `rea-plan`. Use when starting a new feature and the scope or approach is not yet settled."
---

Principles: A (`core/principles.md`).

The user wants to think a feature through before planning it. Run the grilling ritual below:
explore the codebase first, split every open point into a fact (look it up yourself) or a decision
(put it to the user), work through design alternatives together, then write the shared
understanding to a brief that the planning command reads.

## Step 0 — Explore the codebase

Use the `explorer` agent to understand the current project structure, existing patterns, and any
code relevant to the idea. Skim `AGENTS.md` at the project root first for house rules and steering.
This context is what makes the questions in Step 2 concrete instead of generic.

`explorer` is read-only and reports findings, not a pass/fail status. If it cannot find enough
context to ground a question, do not block on it — carry the gap forward as an open question
(Step 5) instead of treating it as a resolved fact.

## Step 1 — Fact/decision split

Before asking the user anything, sort every open point about the feature into one of two buckets:

- **Fact** — answerable by reading the codebase (what exists today, how something is built, what a
  dependency does). Look these up yourself via `explorer`. Never put a fact to the user.
- **Decision** — a choice only the user can make (product intent, trade-off, priority, scope cut).
  These go to the user in Step 2.

## Step 2 — Ask decisions, one at a time

Default mode: ask the user ONE decision at a time. Wait for their answer before asking the next.

For every question:
- State the decision plainly, grounded in what `explorer` found.
- Attach a **recommended answer** with a one-line reason, so the user can just confirm it.
- Wait for the answer before moving on.

Do NOT dump all questions at once. One question, one answer, next question — this stays the
default until the user chooses otherwise.

### Optional: frontier-batching

At any point the user may switch to a batched round instead of one-at-a-time: ask every question
that is currently answerable independently (does not depend on an earlier answer) as one numbered
list, then recompute the next round once the answers come back. You may *suggest* switching to a
batched round when many independent questions have piled up — but never impose it upfront; one at
a time is the default until the user opts into batching.

## Step 3 — Design alternatives

Once the shape of the problem is clear, present 2-3 concrete alternatives for how to build it.

For each alternative:
- **Approach**: one-sentence summary
- **How it works**: brief technical description
- **Pros**: concrete advantages
- **Cons**: concrete disadvantages
- **Best when**: scenarios where this approach wins

Recommend one, but let the user decide.

## Step 4 — Capture as you go

As decisions and terms crystallise during the interrogation, apply the `capture` reflex (see
`AGENTS.md`): lasting decisions go to `.rea/decisions/`, stable entities and concepts go to
`.rea/knowledge/`. Capture continuously — do not wait until the end of the session.

## Step 5 — Write the brief

Once every decision is resolved (or explicitly deferred to planning), synthesise the shared
understanding into `brief.md` — the durable handoff `rea-plan` reads instead of re-interviewing.
This is a different document from `spec.md`, which `rea-plan` produces later.

Mint the plan number by listing `.rea/plans/` — there is no central index of taken numbers (see
the Numbering section of `core/rea-schema.md`): pick the next unused `NNNN`, pair it with a short
slug for the feature, and create `.rea/plans/<NNNN>-<slug>/`. Write `brief.md` inside it with
exactly these five sections, in this order:

```markdown
# Brief: <feature-name>

## Goal
<what we're building and why>

## Context
<codebase facts gathered via `explorer`, plus any external constraints>

## Decisions resolved
<each resolved decision -> the chosen answer -> the rationale>

## Open questions
<anything explicitly deferred to planning, so it isn't lost>

## Scope

### In
- <what's included>

### Out
- <what's explicitly excluded>
```

`## Goal` / `## Context` / `## Decisions resolved` / `## Open questions` / `## Scope` are a fixed
contract with `rea-plan` — do not rename, reorder, merge, or drop any of them, even if a section
ends up short.

## Step 6 — Show and confirm

Show the complete brief to the user. Ask: "Does this capture our shared understanding? Any
changes?"

If the user wants changes, update the brief and show it again.

## Step 7 — Hand off

Once the user explicitly approves:

```
Brief approved and saved to .rea/plans/<NNNN>-<slug>/brief.md. Run rea-plan to create the layered
plan.
```

## Rules

- **NEVER proceed to planning, or treat the brief as final, without explicit user approval.**
- Do not write spec/plan/todo files, and do not run rea-plan automatically.
- Do not skip the decision questions — even if the request seems clear.
- Never put a question to the user that `explorer` can answer; look it up first.
- Keep alternatives practical, not theoretical. Each must be implementable with the current stack.
- If the user says "just do it" or "skip the questions", explain that grilling ensures we build the
  right thing and ask at least 2 questions.
