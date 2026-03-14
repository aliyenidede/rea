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
- Check `.rea/plans/` to understand what has been built so far
- Research the actual files and functions that would need to change

If the requirements are unclear after researching the codebase, ask up to 5 clarifying questions before proceeding. Incorporate answers into the plan.

## Step 2 — Draft a plan

Write a strict technical requirements document. Rules:
- Include a brief description at the top for context
- Point to all relevant files and functions that need to be created or changed
- Explain algorithms step by step
- No actual code — describe behavior, not implementation
- No PM-style sections (no timelines, success metrics, migration plans unless technically required)
- Include specific and verbatim details from the user's prompt
- If the feature is large enough: break into phases. First phase is always the data layer (types, DB schema). Subsequent phases can run in parallel (e.g. Phase 2A — UI, Phase 2B — API). Only use phases if truly necessary.

## Step 3 — Interrogation loop

Do NOT skip this. Run through each question and answer it yourself honestly:

1. "Is this plan 100% correct?" — Look for wrong assumptions, missing edge cases, incorrect architecture
2. "Am I sure about the problems I found?" — Go deeper, find root causes not symptoms
3. "Am I sure now?" — Only proceed when genuinely confident

## Step 4 — Surface decisions

Separate:
- **Obvious solutions** — Claude handles, no need to ask
- **Real decisions** — requires human judgment (architectural trade-offs, scope choices, irreversible decisions)

For each real decision, explain:
- Option A: what it means, pros, cons
- Option B: what it means, pros, cons
- Recommendation with reasoning

Wait for human to decide before proceeding.

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

**todo.md** — Soldier-level steps. Every item must be unambiguous:

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
- **High risk** (DB write, payment, irreversible, cross-system): full algorithm steps + test criteria
- **Low risk** (config, types, simple util): file path + behavior is enough

**`NEXT:` marker rules:**
- Always mark the first incomplete item with `NEXT:` (exactly one at a time)
- After completing a step: remove `NEXT:` from done item, add it to the next incomplete item
- `NEXT:` is the session resume point — at the start of any new session, Step 0 detects it automatically
- If all items are done: remove `NEXT:` entirely and update the log status to `completed`

## Step 8 — Update project CLAUDE.md

If architectural decisions were made, append them to `CLAUDE.md` under a relevant section.

## Step 9 — Create feature CLAUDE.md (if needed)

If decided in Step 5, create `features/<task-name>/CLAUDE.md`:
- Feature scope
- Feature-specific rules
- Key decisions made

## Step 10 — Write log entry

Create `.rea/log/<YYYY-MM-DD>-<NNNN>-<task-name>.md`:
```
# <task-name>

Date: <date>
Plan: .rea/plans/<NNNN>-<task-name>/
Status: in progress

## Summary
<one paragraph>

## Decisions made
- <decision 1>
- <decision 2>

## Human decisions
- <what the human decided and why>
```

## Step 11 — Confirm

Show the user:
- Plan location
- Todo item count
- Any decisions that were made
- Ask: "Ready to execute?"
