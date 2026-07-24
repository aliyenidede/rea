---
name: rea-plan
description: "Synthesises rea-grill's brief into a layered spec / plan / todo — a dependency-graph plan.md, a smart-zone-sized todo.md — through a plan-validator + plan-reviewer pipeline with a mandatory human checkpoint. Use once a brief is approved and ready to become an executable plan."
---

Principles: B, H (`core/principles.md`)

The user has an approved brief and wants an executable plan built from it. This command reads
`rea-grill`'s `brief.md` and synthesises it into a layered spec / plan / todo — it never
re-interviews on ground the brief already settled. Run the pipeline below: draft the three files,
validate them mechanically, checkpoint any real decision with the human, then review them
adversarially before handing off to `rea-execute`.

## Step 0 — Locate the brief

Determine which brief this run plans:
- If the human named a plan folder or feature, use that folder's `.rea/plans/<NNNN>-<slug>/brief.md`.
- Otherwise scan `.rea/plans/*/` for a `brief.md` that has no `plan.md` next to it yet — that is
  the pending brief. If more than one folder qualifies, ask the human which one to plan.

If no qualifying `brief.md` exists, report:

```
No brief found. Run rea-grill first.
```

Stop here.

If `plan.md` already exists in the target folder, ask the human whether to revise the existing
plan or leave it as is. If left as is, suggest `rea-execute` instead of re-planning, and stop
here — do not fall through to the report below or to Step 1; that would silently overwrite an
already-approved spec/plan/todo. Only continue past this point if the human chose to revise, or if
no `plan.md` exists yet for this folder.

Report the located folder:

```
Planning: .rea/plans/<NNNN>-<slug>/brief.md
```

## Step 1 — Synthesise, do not re-interview

Read `brief.md`'s five fixed sections, in order: `## Goal` / `## Context` / `## Decisions
resolved` / `## Open questions` / `## Scope`. This is the identical section list `rea-grill`
writes — the fixed contract between the two commands.

- `## Goal` and `## Scope` drive `spec.md`'s what/why/scope.
- `## Context` is the codebase grounding already gathered — do not re-run `explorer` over ground
  it already covers.
- `## Decisions resolved` are settled — never re-ask them, never re-litigate them at the Checkpoint
  (Step 5).
- `## Open questions` split in two: anything `explorer` can resolve as a fact belongs in Step 2;
  anything that is a genuine choice becomes a Checkpoint decision in Step 5 instead of being
  silently picked here.

## Step 2 — Fill technical gaps (explorer)

Use the `explorer` agent for whatever the brief's `## Context` does not already cover but the plan
needs to be concrete: exact file paths, module boundaries, existing patterns to follow — the
detail `todo.md`'s `Files:` field requires. Also resolve any `## Open questions` item that turns
out to be a fact this way. Skip `explorer` entirely if the brief already grounds everything the
plan needs.

## Step 3 — Draft spec.md / plan.md / todo.md

Write all three files into the same folder as `brief.md` — `.rea/plans/<NNNN>-<slug>/` (see
`core/rea-schema.md`). Do not mint a new plan number; this plan belongs to the brief's existing
folder.

**`spec.md`** — the destination: what and why, synthesised from `## Goal`; scope (In / Out, from
`## Scope`); key constraints (from `## Context` and `## Decisions resolved`). If 2 or more
significant choices were made while drafting the plan (here or at the Checkpoint), add a
`## Decisions` table:

| # | Decision | Choice | Alternatives Rejected | Rationale |
|---|----------|--------|------------------------|-----------|

No code, no timelines, no PM-style sections.

**`plan.md`** — the journey: the dependency graph only, per `core/rea-schema.md`:

| Unit | Title | Depends on |
|------|-------|------------|

No file paths, no algorithm dump — those live in `todo.md`. An optional Mermaid graph may follow
the table for visual review. For a plan large enough to need phasing, express it through the
graph itself: foundational units (shared types, data layer) carry no `Depends on`; everything
downstream depends on them. The dependency column *is* the phasing — there is no separate phase
label.

**`todo.md`** — the detail: one `### U<n> — <title>` section per unit named in `plan.md`, with
exactly four fields, in this fixed order, per `core/rea-schema.md`:

```
Files: <file(s) this unit touches>
Done when: <the concrete, checkable completion condition>
Size: <e.g. "1 smart-zone">
Status: todo
```

Size every unit as **one vertical slice** — end-to-end and demoable — that fits inside one
smart-zone (principle H, `core/principles.md`): the plan does the splitting up front; nothing
re-splits at runtime. If a unit doesn't fit in one smart-zone, split it into two units here, not
later.

## Step 4 — Plan validation (plan-validator)

Do not skip this. Call the `plan-validator` agent with the drafted `plan.md` and `todo.md` (and
the project root). It mechanically checks rule compliance (against `AGENTS.md`), architecture
placement, plan↔todo coverage in both directions, and frontier computability (no dangling
`Depends on`, no cycles, well-formed `Status:`).

**If VALID** → proceed to Step 5 without mentioning the validation.

**If ISSUES FOUND:**
1. Fix rule violations, placement errors, and coverage gaps silently — they have clear right
   answers.
2. If any issue is ambiguous or needs a human call → surface it at the Checkpoint (Step 5) instead
   of guessing.
3. Re-run `plan-validator` once to confirm the fixes (maximum 2 cycles total).

Do not self-review the draft with questions like "does this look right?" — trust
`plan-validator`'s mechanical checks over your own read of your own output.

## Step 5 — Checkpoint (never skip)

Always show the human a summary before going further, even if everything looks settled.

1. **Real decisions** — trade-offs or irreversible choices that need human judgment (including any
   `## Open questions` from the brief that turned out to be a genuine choice, not a fact): for
   each, Option A (pros/cons), Option B (pros/cons), and a recommendation with reasoning.
2. **Assumptions** — anything decided without asking (file placement, naming, an ambiguous
   requirement resolved one way).
3. **If neither** — say "No decisions needed — proceeding."

**Rules:**
- Real decisions → STOP and wait for the human's answer. Do not proceed to Step 6.
- Assumptions only → show them, proceed unless the human objects.
- Never silently resolve a trade-off; when in doubt, treat it as a decision, not an assumption.

## Step 6 — Adversarial review (plan-reviewer)

Call the `plan-reviewer` agent with `plan.md` and `todo.md`.

**The pre-mortem is mandatory** — `plan-reviewer` runs it before returning PASS. Do not treat a
PASS as final if you can see an unmitigated high-probability failure cause yourself; if so, raise
it and treat this run as REVISE.

**If PASS** → proceed to Step 7.

**If REVISE:**
1. Show the gaps, inconsistencies, and pre-mortem findings to the human. Preserve every `CC-NN`
   tag as-is — a craft-checklist-tagged design smell is a blocking gap, the same as any other
   finding.
2. For each "Decision Needed", present the reviewer's Option A / Option B and ask the human to
   choose.
3. Revise `plan.md` / `todo.md` accordingly.
4. Re-run `plan-reviewer` (maximum 2 cycles).
5. If still REVISE after 2 cycles → show the remaining issues and ask the human: "Proceed anyway or
   keep revising?"

`plan-reviewer`'s own claim checklist and plan↔todo consistency matrix double as the final
coverage pass — no separate step is needed for it.

## Step 7 — Capture crystallised decisions

Apply the `capture` reflex (`AGENTS.md`) for every decision that crystallised during planning — at
the Checkpoint (Step 5) or during the review loop (Step 6): write a numbered ADR into
`.rea/decisions/`. Mint the number by listing `.rea/decisions/` — there is no central index
(`core/rea-schema.md`). Only decisions durable enough to matter beyond this one plan need an ADR;
a purely local scope pick already captured in `spec.md`'s `## Decisions` table does not also need
one.

If anything about this session is worth a durable note beyond the decisions themselves, write it
to `.rea/sessions/` via the same `capture` reflex — this is not a separate mandatory step, just the
reflex applied here too.

## Step 8 — Confirm and hand off

Show the human:
- Plan location: `.rea/plans/<NNNN>-<slug>/`
- Unit count (from `plan.md`'s table)
- Any decisions made (Checkpoint + review loop)

This is also where the human confirms architecture decisions, not just the plan's content
(principles K, J) — the two gates (Checkpoint content vs. architecture placement) can be confirmed
together here since both already surfaced during Steps 4–6.

Ask: "Ready to execute?"

If yes:

```
Plan approved. Run rea-execute to build it.
```

If no: stay in the session and address whatever concern the human raises — revise `spec.md` /
`plan.md` / `todo.md` as needed (re-running Step 4 and/or Step 6 if the revision is substantive) —
then ask again. Do not hand off until the human confirms.

## Rules

- **Never re-interview.** `## Decisions resolved` in `brief.md` is settled; only a genuinely new
  open question earns a Checkpoint entry.
- **`NEXT:` is retired.** Progress lives entirely in each unit's `Status:` field in `todo.md` (see
  `core/rea-schema.md`) — this command never writes or scans for a `NEXT:` marker.
- **`plan.md` is the dependency graph only.** No file paths, no algorithm dump — `todo.md` carries
  the per-unit detail.
- **Each field lives in exactly one file.** `Depends on` only in `plan.md`; `Files:` / `Done
  when:` / `Size:` / `Status:` only in `todo.md`.
- **Never skip the Checkpoint (Step 5).** A real decision always stops the run for the human; an
  assumption is shown, not hidden.
- **The pre-mortem is mandatory**, not a formality — `plan-reviewer` cannot return PASS without
  one, and an unmitigated high-probability cause forces REVISE.
- **Maximum 2 cycles** for `plan-validator`'s fix loop; **maximum 2 cycles** for `plan-reviewer`'s
  REVISE loop.
- **Preserve `CC-NN` tags.** A craft-checklist-tagged finding from `plan-reviewer` is a blocking
  gap like any other.
- **Do not embed code** in any of the three files — describe behavior, not implementation.
- **Crystallised decisions go to `.rea/decisions/`** via the `capture` reflex — numbered,
  append-only, mint the number by listing the directory.
- **Human approval gates the hand-off** (principles K, J) — do not invoke `rea-execute`
  automatically; wait for an explicit "Ready to execute?" confirmation.
