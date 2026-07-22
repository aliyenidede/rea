---
name: rea-execute
description: "Execute the active plan's frontier — orchestrator-computed frontier, agent-driven parallel dispatch, TDD, fresh-context batch review, and audit-trailed status tracking."
---

Principles: D, E, G, I, C

Execute the active plan using the frontier-driven, agent-driven implementation loop with parallel
dispatch.

## Step 0 — Find the active plan and resume

Scan `.rea/plans/*/todo.md` for any unit whose `Status:` is `todo`, `in-progress`, or `blocked`. If
more than one plan directory has open units, ask the human which one to run. If none do, report:

```
No active plan found. Run rea-grill then rea-plan first.
```

Stop here.

Otherwise report:

```
Active plan: .rea/plans/<folder>/
```

**Resume — re-verify `in-progress` units first.** For any unit whose `Status:` is `in-progress`
(left over from a session that did not finish cleanly), re-verify before anything else: check
whether a commit already exists that satisfies the unit's `Done when:` (inspect the git log for the
unit's `Files:`). If a qualifying commit exists → set `Status: done`. If none does → reset
`Status: todo` so the unit re-enters the frontier. This check always runs first — it is a no-op on a
fresh run where nothing is `in-progress`, per `core/rea-schema.md`.

**Only this command writes `Status:` into `todo.md`.** `implementer` never touches `todo.md` — it
only reports a status back to this command, which records it.

## Step 1 — Load context

Read:
- `.rea/plans/<folder>/plan.md` — the dependency graph (`Unit` / `Title` / `Depends on`)
- `.rea/plans/<folder>/todo.md` — per-unit detail (`Files:`, `Done when:`, `Size:`, `Status:`)
- `.rea/plans/<folder>/spec.md` — requirements and constraints, if present
- `AGENTS.md` — project rules, including the project's test and lint commands
- Any `.rea/knowledge/` notes linked from the plan

## Step 2 — Compute the frontier

Per `core/rea-schema.md`: the **frontier** is every unit with `Status: todo` whose every unit listed
in its `plan.md` `Depends on` has `Status: done`. Compute this directly by reading `todo.md`'s
`### U<n>` `Status:` fields together with `plan.md`'s `Depends on` column.

There is no scalar `NEXT:` pointer to scan for — that mechanism is retired. The frontier is always
recomputed from the per-unit `Status:` fields, never read from a leftover pointer.

> **Override note:** target-state §5.4 step 2 describes computing the frontier "via dispatcher."
> This command overrides that: frontier eligibility is deterministic filtering with no judgment call
> in it, so this command computes the frontier itself and hands the resulting unit-set to
> `dispatcher` for physical file-conflict grouping only — `dispatcher` does not recompute
> eligibility.

If the frontier is empty and no unit is `blocked`, every unit is done — skip ahead to Step 8.

If the frontier is empty but one or more units are `blocked`, stop and report the blocked units to
the human. Nothing else can proceed until they are resolved.

## Step 3 — Dispatch planning

Call the `dispatcher` agent with:
- The computed frontier (the list of eligible unit ids)
- The `todo.md` path

`dispatcher` groups the frontier's units into parallel / sequential / safe-sequential batches by
physical file conflict — it treats the frontier as given and does not re-derive eligibility.

Show the batch plan to the human (informational — no approval needed):

```
Dispatch plan:
  Batch 1 (parallel): U3, U5 — src/auth/, src/billing/
  Batch 2 (sequential): U4, U6 — src/shared/utils.py
  Batch 3 (safe-sequential): U7 — unknown scope
```

If `dispatcher` returns BLOCKED, fall back to sequential execution: process the frontier's units one
at a time, in the order given.

## Step 4 — Execute a batch

Process batches in the order given by the dispatch plan.

### 4a — Implement

1. Set every unit in the batch to `Status: in-progress` in `todo.md`.
2. Record `pre-batch-sha` — the current `HEAD` commit, before any implementer touches the tree.
3. Launch `implementer`:
   - **Parallel batch** — one `implementer` agent per unit, all launched in a single message; wait
     for every agent to return before continuing.
   - **Sequential / safe-sequential batch** — `implementer` agents one at a time, in the batch's
     given order.

   Give each `implementer` call the unit's todo item text verbatim (`Files:` / `Done when:` /
   `Size:`) plus the relevant `plan.md` context.

4. Handle each unit's returned status:
   - **DONE** → leave `Status: in-progress`, continue to review.
   - **DONE_WITH_CONCERNS** → show the concerns to the human; proceed only on explicit confirmation.
     If the human says no → set the unit `Status: blocked` and halt.
   - **BLOCKED** or **NEEDS_CONTEXT** → set the unit `Status: blocked`; show the blocker to the human;
     halt this batch. Units in the same batch that already reached DONE keep `Status: in-progress` —
     they are re-verified and picked up again on the next resume once the blocker is resolved.

If every unit in the batch reached DONE (or a human-confirmed DONE_WITH_CONCERNS), continue to 4b.

### 4b — Batch review (fresh-context agents, relevant ones only)

Diff scope for every review agent: the explicit commit range `<pre-batch-sha>..HEAD`, plus the union
of the batch's units' `Files:` lists. This is deterministic and safe to hand to an agent with no
memory of the implementation session.

**Always run**, regardless of what changed:
- `spec-reviewer` — verifies the diff matches each unit's `Done when:` requirement (one call per
  unit, or one call covering the batch with each unit's requirement text attached).
- `code-reviewer` — craft quality and test quality over the batch diff. Tag every finding that maps
  to `core/craft-checklist.md` with its `CC-NN` id.

**Run only when the batch diff includes code files** (skip on a pure-prose / documentation batch —
these agents only produce noise on a markdown-only diff):
- `bug-scanner`
- `security-scanner`

Preserve `CC-NN` tags when surfacing findings — a CC-tagged design smell is a blocking finding like
any other.

**Fix cycle (shared across the four review agents, maximum 3 cycles):**
- Any FAIL (spec-reviewer) or Critical/Important finding (code-reviewer, bug-scanner,
  security-scanner) → send it back to the relevant unit's `implementer` with fix instructions;
  re-run only the review agent(s) that raised the finding, against the updated diff.
- Minor / Nit findings → note them; do not block.
- If a Critical or FAIL finding still remains after 3 cycles → stop, report to the human, and set the
  affected unit(s) `Status: blocked`.

**No authoring mode is imposed here.** A unit's `Done when:` is its completion gate whether the unit
is code or prose; `implementer`'s documentation-only carve-out (no test on a pure rename / config /
doc change, with a stated reason) already covers prose units — nothing extra is added for that. TDD
(principle E) stays mandatory for code units. The only content-aware rule at this level is the
bug-scanner / security-scanner gate above.

### 4c — Mark the batch complete

Once every unit in the batch clears review, set each unit's `Status: done` in `todo.md`.

Never delete a unit's section from `todo.md`, even once it is `done` — `todo.md` is the audit trail;
`Status: done` is the permanent record.

## Step 5 — Loop

Recompute the frontier (Step 2) — newly `done` units may unblock dependents. If the frontier is
non-empty, return to Step 3 for the next batch. Report brief progress to the human between batches:

```
Completed batch N. Frontier: <unit ids>. Next batch: <batch info>
```

If the frontier is empty and no unit is `blocked`, proceed to Step 6.

## Step 6 — Outer gate: full suite once

Before finishing, run the project's full test suite and full lint once — the outer feedback-gate
tier. Read the test and lint commands generically from `AGENTS.md` (or the project's own rules) —
never hardcode a specific tool (e.g. do not assume `pytest`); use whatever the project declares. If
the project provides a narrower affected-test selector appropriate to its language, that selector is
what `implementer` already used per unit as the **inner** tier (affected tests + lint, run inside
`implementer`); this outer tier is the one full run across everything, in addition to — not a repeat
of — that inner tier. The project's own CI remains the final safety net behind both.

If anything fails: send the failure output back to the `implementer` responsible for the most likely
unit (or, if not clearly attributable, report to the human) with fix instructions. Maximum 2 fix
cycles. If still failing after 2 cycles → stop, show the errors to the human, and leave the affected
unit(s) `Status: in-progress` (or `Status: blocked`, at the human's direction) rather than `done`.

## Step 7 — Pattern detection

After the outer gate passes, internally reflect: did any recurring pattern show up during this run
that would benefit from a dedicated agent or command? Do not output the reasoning — only tell the
human if a pattern was found.

Examples worth surfacing:
- The same boilerplate generated multiple times
- A review concern that came up repeatedly across batches
- A workflow step that was manually repeated

If a pattern is found:

```
Pattern detected: <description>
This could be a new agent or command. Run rea-write-skill to create it.
```

If no pattern is found, skip silently.

## Step 8 — Finish

```
All units complete. Run rea-ship to commit / open a PR / deploy.
```

## Rules

- **Never skip a relevant review agent.** `spec-reviewer` and `code-reviewer` always run over a
  batch; `bug-scanner` and `security-scanner` run whenever the batch diff includes code files.
- **Never delete completed units from `todo.md`.** `Status: done` is the audit trail — deleting a
  unit's section is data loss.
- **Maximum 3 fix cycles** per batch review stage (Step 4b); **maximum 2 fix cycles** for the outer
  gate (Step 6). If still failing, stop and ask the human.
- **Do not modify `plan.md` or `spec.md`** during execution. If something in the plan needs to
  change, stop and tell the human (principle H — the runtime agent does not re-split the plan).
- **Use `dispatcher` for grouping the frontier into batches**; if it returns BLOCKED, fall back to
  sequential execution in frontier order.
- **Only this command writes `Status:`** into `todo.md`. `implementer` reports a status back; it
  never edits `todo.md` itself.
- **Halt for the human at any decision or blocker** — a real architectural choice, a `BLOCKED` /
  `NEEDS_CONTEXT` return, or a review finding that survives its fix-cycle cap (principle G). Apply
  the `capture` reflex (per `AGENTS.md`) whenever a lasting decision or a root-cause surfaces during
  the run.
- **Keep the human informed.** Report progress after each batch and at the outer gate.
