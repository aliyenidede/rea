---
name: rea-fix
description: "Disciplined, interactive quick-fix path for a small, well-understood bug or change — root-cause debug, TDD fix, scoped tests + lint, fresh-context review, then hand off to rea-ship. No plan stage, no resume machinery. Escalates to the full `rea-grill` → `rea-plan` → `rea-execute` path the moment the fix stops being small."
---

Principles: G, H, J, K (`core/principles.md`)

A small bug or quick change does not need a full plan — but it still deserves every quality gate
`rea-execute` enforces, minus the plan itself. This command is that disciplined shortcut: it
composes `debugger` and `implementer` for the fix, reuses `rea-execute`'s fresh-context review
rules, and hands the ship step to `rea-ship`. It is interactive and synchronous — the human is
present throughout the run, so there is no `NEXT` / resume machinery.

## Escalation — check continuously, not just once

Before starting, and again after every step below, check the fix against this list. The moment
**any one** of these becomes true, stop immediately and hand off:

1. More than ~3 files need changing.
2. An architecture / design decision surfaces (principle J or K) — a real choice, not a mechanical
   edit.
3. The change spans more than one vertical slice or multiple modules.
4. `debugger` hits its own 3-attempt escalation (an architecture problem, not a bug).
5. The estimated size exceeds one smart zone (principle H).

On escalation, stop the run and report:

```
This has grown past a quick fix: <which criterion tripped, and why>.
Handing off to the normal path: run rea-grill, then rea-plan, then rea-execute.
```

Do not keep pushing on a fix that has tripped this list — that is exactly the undisciplined loop
this command exists to prevent.

## Step 0 — Take the problem

Get the bug report, error, or small change request from the human, plus whatever context they
already have (error message, stack trace, file paths, recent changes). Sanity-check it against the
Escalation list above using only what is already known — if it already looks bigger than a quick
fix, hand off now rather than starting the flow.

## Step 1 — Debug (root cause)

Record `pre-fix-sha` — the current `HEAD`, before calling `debugger` or `implementer`.

Call `debugger` with the problem description and context. `debugger` owns its own 4-phase root
cause investigation and its own 3-attempt escalation rule — do not re-derive or duplicate that
process here; take its finding as-is.

- `debugger` returns **BLOCKED** (including its own 3-attempt escalation) → stop, go to Escalation.
- `debugger` returns with a clear root cause (and, per its own contract, may already have applied
  a candidate fix) → continue to Step 2.

## Step 2 — Fix, under the implementer's TDD discipline

Hand the root cause finding to `implementer` as the fix unit, in the same shape a plan unit would
give it: the file(s) to touch, the `Done when:` condition (the bug no longer reproduces and a
regression test covers it), and the size (this step only holds while the fix stays within one
smart zone — see Escalation item 5). `implementer` applies its own risk-tiered RED-GREEN-REFACTOR
discipline, retry rules, and self-review — do not re-explain that process here.

- **DONE** → continue to Step 3.
- **DONE_WITH_CONCERNS** → show the concern to the human; proceed only on explicit confirmation.
- **BLOCKED** or **NEEDS_CONTEXT** → stop, go to Escalation.

## Step 3 — Scoped tests + lint

`implementer`'s own inner gate (its Step 4a/4b) already ran the affected tests and lint as part of
Step 2 — confirm its report shows both passing before moving on. There is no outer full-suite gate
here; that belongs to the plan-based `rea-execute` path this command deliberately bypasses. If the
report shows either still failing, this is itself an escalation signal (the fix is not as small as
it looked) — go to Escalation.

## Step 4 — Fresh-context review

Diff scope is `<pre-fix-sha>..HEAD` (recorded in Step 1) plus the union of the touched `Files:` —
this part is fix-specific, not shared.

For everything else, apply `rea-execute`'s Step 4b review-agent selection — `spec-reviewer` +
`code-reviewer` always, `bug-scanner` + `security-scanner` only when the diff includes code files
— and its 3-cycle fix-cycle cap, over this one fix instead of a batch; substitute this fix's
`Done when:` for the unit requirement and "go to Escalation" for `Status: blocked`.

Preserve `CC-NN` tags in whatever you surface — a CC-tagged finding is a blocking finding.

## Step 5 — Ship

Hand off to the `rea-ship` ritual — do not duplicate its branch-safety, secret-exclusion, or PR
mechanics here. Never skip `rea-ship`'s secret-check and human diff review (principle K); those are
mandatory whether the change came from a plan or from this quick-fix path.

## Step 6 — Capture

Apply the `capture` reflex (see `AGENTS.md`) on the root cause `debugger` found: a bug's root cause
is one of the three capture triggers. Write it as a knowledge note or a session note per
`core/rea-schema.md` — whichever fits the finding.

## Rules

- **Check the Escalation list before starting and after every step** — not just once. The instant
  any criterion is true, stop and hand off to `rea-grill` → `rea-plan` → `rea-execute`.
- **No plan stage, no `NEXT` / resume machinery.** This command is small and synchronous by design;
  if it needs resumability, it has already outgrown itself — escalate instead of adding it here.
- **Never touch a plan's `todo.md`.** This command operates outside the plan system entirely. If
  the work turns out to belong to an active plan's unit, do not edit that unit's `Status:` yourself
  — that field belongs only to `rea-execute`.
- **Never skip a relevant review agent** in Step 4 — the same always-run / code-files-only split
  `rea-execute` uses.
- **Never skip `rea-ship`'s secret-check and human diff.** Shipping through this path is not a
  shortcut around principle K.
- **Preserve `CC-NN` tags** on any craft-checklist finding surfaced during review.
