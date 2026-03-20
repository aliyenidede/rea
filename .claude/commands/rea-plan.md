---
name: rea-plan
description: "Full planning pipeline — research, draft, interrogation loop, adversarial review, write spec/plan/todo."
---

The user wants to plan a task. Run the full planning pipeline.

## Step 0 — Check for in-progress work

Before starting anything, check for existing `NEXT:` markers:
- Scan `.rea/plans/*/todo.md` for any `- [ ] NEXT:` lines
- If found, show the user: `Found in-progress work: [item text] in .rea/plans/<folder>/todo.md`
- Ask: "Resume this, or start a new plan?"
- If resume → jump to Step 7 and continue from the NEXT: item (do not create new files)
- If new plan → proceed from Step 1

## Step 1 — Understand the task

Read the user's request carefully. Then:
- Read `CLAUDE.md` to understand the project
- Read relevant feature `CLAUDE.md` files if they exist
- Read `.rea/lessons.md` if it exists — apply any relevant lessons to this plan before proceeding
- Check `.rea/plans/` to understand what has been built so far
- Research the actual files and functions that would need to change — use the `explorer` agent for codebase exploration to keep the main context clean

If the requirements are unclear after researching the codebase, ask **maximum 3** clarifying questions before proceeding. Prioritize by impact: scope > security/privacy > user experience > technical details. For anything beyond 3 questions, make an informed guess and document it in the spec as an **Assumption** — the user can correct it later.

Do NOT ask questions that can be answered by reading the codebase. Use the explorer agent first.

## Step 2 — Draft a plan

Write a strict technical requirements document. Rules:
- Include a brief description at the top for context
- Point to all relevant files and functions that need to be created or changed
- Explain algorithms step by step
- No actual code — describe behavior, not implementation
- No PM-style sections (no timelines, success metrics, migration plans unless technically required)
- Include specific and verbatim details from the user's prompt
- If the feature is large enough: break into phases. First phase is always the data layer (types, DB schema). Subsequent phases can run in parallel (e.g. Phase 2A — UI, Phase 2B — API). Only use phases if truly necessary.

## Step 3 — Plan validation

Do NOT skip this. Call the `plan-validator` agent with the draft plan and todo content.

The validator performs mechanical checks that the main model tends to rubber-stamp when self-reviewing:
- CLAUDE.md rule compliance (every file path checked against project rules)
- Architecture placement (shared modules in packages/, app-specific in apps/)
- Plan ↔ todo cross-check (every requirement has a todo item and vice versa)
- Internal consistency (no contradictions between sections)

**If VALID** → proceed to Step 4 without mentioning the validation.

**If ISSUES FOUND:**
1. Fix all rule violations and architecture errors silently (these have clear right answers)
2. Fix all coverage gaps silently (add missing todo items or remove orphans)
3. If any issue is ambiguous or requires a human decision → surface it to the user
4. After fixes, re-run the validator once to confirm (maximum 2 cycles)

Important: Do NOT self-review the plan with abstract questions like "is this correct?" — the validator agent exists specifically because self-review is unreliable. Trust the agent's mechanical checks over your own judgment about your output.

## Step 4 — Surface decisions

Separate:
- **Obvious solutions** — Claude handles, no need to ask
- **Real decisions** — requires human judgment (architectural trade-offs, scope choices, irreversible decisions)

For each real decision, explain:
- Option A: what it means, pros, cons
- Option B: what it means, pros, cons
- Recommendation with reasoning

Wait for human to decide before proceeding.

If any real decisions were identified: internally check if there is a more elegant solution. If a simpler approach exists with the same outcome, present it as an additional option. If not, proceed without mentioning this check.
If no real decisions were identified: skip this check.

## Step 5 — Determine task type and structure

Based on the plan, decide:
- **Type:** feature / bugfix / refactor / chore
- **Feature CLAUDE.md needed?**
  - Opens new domain (auth, billing, webhooks)? → YES
  - Has feature-specific rules or constraints? → YES
  - Will span multiple sessions? → YES
  - Simple bugfix or small change? → NO

## Step 6 — Determine plan number and name

Check `.rea/plans/` for existing folders. Pick the next number.
Format: `<NNNN>-<kebab-case-task-name>`
Example: `0003-stripe-billing`

## Step 7 — Write plan files

Create `.rea/plans/<NNNN>-<task-name>/`:

**spec.md** — What and why:
- Task description (verbatim from user where possible)
- Scope (what's in, what's out)
- Key constraints and rules

**plan.md** — How (strict technical requirements document):
- Brief description for context
- All files and functions to create or modify (with file paths)
- Algorithms explained step by step (no code)
- Architecture decisions made (with reasoning)
- Phases only if the task is large (data layer first, then parallel phases)

**todo.md** — Soldier-level steps. Every item must be unambiguous.

**Task size rule:** Each todo item should result in a single commit touching 1-5 files. If a todo item would touch 6+ files or produce 200+ lines of diff, split it into smaller items.

```
## Todo

- [ ] NEXT: Create `src/billing/stripe-client.ts`
      1. Initialize Stripe client with STRIPE_SECRET_KEY
      2. Export createPaymentIntent(amount: number, customerId: string)
      3. Throw StripeError on invalid customerId
      Test: invalid customerId throws StripeError

- [ ] Add `STRIPE_SECRET_KEY` to `packages/config/src/index.ts`
      Zod schema: z.string().min(1)
      Test: missing key throws on startup

- [ ] ...
```

Todo item detail level by risk:
- **High risk** (DB write, payment, irreversible, cross-system): full algorithm steps + TDD format + test criteria
  ```
  - [ ] NEXT: Implement X
        RED: Write test for X — must watch it FAIL before coding
        GREEN: Minimal implementation to make test pass
        REFACTOR: Clean up, keep tests green
        Commit: one commit per RED-GREEN cycle
        Test: what proves this is correct
  ```
- **Low risk** (config, types, simple util): file path + behavior is enough

**`NEXT:` marker rules:**
- Always mark the first incomplete item with `NEXT:` (exactly one at a time)
- After completing a step: remove `NEXT:` from done item, add it to the next incomplete item
- `NEXT:` is the session resume point — at the start of any new session, Step 0 detects it automatically
- If all items are done: remove `NEXT:` entirely and update the log status to `completed`

**After writing all three files, run a verification pass:**
- For every requirement in `plan.md`: is there a todo item that implements it?
- For every todo item: does it trace back to a requirement in `plan.md`?
- If gaps exist, fix `todo.md` before proceeding.

## Step 8 — Adversarial review

Call the `plan-reviewer` agent with the just-written plan.md and todo.md paths.

**If PASS** → proceed to Step 9.

**If REVISE:**
1. Show gaps and inconsistencies to the user
2. For each "decision needed": present the options from the reviewer, ask the user to choose
3. Revise plan.md and todo.md based on feedback
4. Re-run plan-reviewer (maximum 2 cycles)
5. If still REVISE after 2 cycles → show remaining issues, ask the user: "Proceed anyway or keep revising?"

## Step 9 — Update project CLAUDE.md

If architectural decisions were made, append them to `CLAUDE.md` under a relevant section.

## Step 10 — Create feature CLAUDE.md (if needed)

If decided in Step 5, create `features/<task-name>/CLAUDE.md`:
- Feature scope
- Feature-specific rules
- Key decisions made

## Step 11 — Write log entry

**File name:** `.rea/log/YYYY-MM-DD-HHmm-plan-<task-name>.md`

Use the actual current date and time (24h format, no separators in time). Example: `2026-03-17-1430-plan-stripe-billing.md`

```markdown
# Plan: <task-name>

Date: YYYY-MM-DD HH:MM:SS
Plan: .rea/plans/<NNNN>-<task-name>/
Status: in progress

## Summary
<one paragraph describing what was planned>

## Decisions made
- <decision 1>
- <decision 2>

## Human decisions
- <what the human decided and why>
```

## Step 12 — Confirm

Show the user:
- Plan location
- Todo item count
- Any decisions that were made
- Ask: "Ready to execute?"
