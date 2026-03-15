Execute the current plan using the agent-driven implementation loop with parallel dispatch.

## Step 0 — Find active plan

Scan `.rea/plans/*/todo.md` for any `- [ ] NEXT:` lines.

If no NEXT: marker found:
```
No active plan found. Run /rea-plan first.
```
Stop here.

If found, report:
```
Active plan: .rea/plans/<folder>/
Next item: <item text>
```

## Step 1 — Load context

Read the plan files:
- `.rea/plans/<folder>/plan.md` — requirements and architecture
- `.rea/plans/<folder>/todo.md` — full task list
- `.rea/lessons.md` — if it exists, apply lessons to execution
- `CLAUDE.md` — project rules

## Step 1.5 — Dispatch planning

Call the `dispatcher` agent with:
- todo.md path
- plan.md path

The dispatcher will return an execution schedule with parallel groups.

Show the groups to the user (informational — no approval needed):
```
Dispatch plan:
  Batch 1 (parallel): items 1, 3 — src/auth/, src/billing/
  Batch 2 (sequential): items 2, 4 — src/shared/utils.py
  Batch 3 (safe-sequential): item 5 — unknown scope
```

If the dispatcher returns BLOCKED, fall back to sequential execution (one item at a time, original todo order).

## Step 2 — Execute items

Process batches in order from the dispatch plan.

**For parallel batches:** Launch multiple `implementer` agents simultaneously (one per item in the batch, using multiple Agent tool calls in a single message). Wait for all to complete before proceeding to reviews.

**For sequential and safe-sequential batches:** Execute items one at a time in order.

For each item (whether parallel or sequential):

### 2a — Implement

Call the `implementer` agent with:
- The todo item text (verbatim)
- Relevant sections from plan.md

Wait for the agent to return a status:
- **DONE** → proceed to 2b
- **DONE_WITH_CONCERNS** → show concerns to user, ask if OK to proceed. If yes → 2b. If no → stop.
- **BLOCKED** → show blocker to user, stop execution, keep NEXT: on this item
- **NEEDS_CONTEXT** → show what's unclear to user, stop execution, keep NEXT: on this item

### 2b — Spec review

Call the `spec-reviewer` agent with:
- The original todo item text (the requirement)
- File paths that were changed by the implementer

Wait for the agent to return a status:
- **PASS** → proceed to 2c
- **FAIL** → show the gap list to the user. Call implementer again with fix instructions. Re-run spec-reviewer. Maximum 3 fix cycles. If still FAIL after 3 → stop and report.

### 2c — Code review

Call the `code-reviewer` agent with:
- File paths that were changed by the implementer

Wait for the agent to return a status:
- **No Critical or Important issues** → item is done
- **Critical or Important issues found** → show issues. Call implementer with fix instructions. Re-run code-reviewer. Maximum 3 fix cycles. If still has Critical after 3 → stop and report.
- **Minor issues only** → note them but proceed (do not fix unless user asks)

### 2d — Mark complete

Update `.rea/plans/<folder>/todo.md`:
1. Change `- [ ] NEXT: <item>` to `- [x] <item>`
2. Find the next `- [ ]` item and add `NEXT:` prefix to it
3. If no more `- [ ]` items exist, all tasks are done

## Step 3 — Loop or finish

If there are more batches to process:
- Show progress: `Completed X/Y items. Next batch: <batch info>`
- Go back to Step 2 for the next batch

If all items are done, proceed to Step 3.5.

## Step 3.5 — Pattern detection

After all items are complete, internally reflect: did you notice any recurring patterns during this execution that would benefit from a dedicated agent or command? Do NOT output your reasoning — only tell the user if you found a pattern.

Examples of patterns worth surfacing:
- Same boilerplate code generated multiple times
- A specific review concern that came up repeatedly
- A workflow step that was manually repeated

If patterns found:
```
Pattern detected: <description>
This could be a new [agent/command]. Run /rea-write-skill to create it.
```

If no patterns: skip silently.

## Step 4 — Finish

```
All tasks complete. Run /rea-commit to open a PR.
```

## Rules

- **Never skip the spec-reviewer or code-reviewer.** Every item goes through the full triple loop.
- **Maximum 3 fix cycles** per review stage. If still failing, stop and ask the user.
- **Do not modify plan.md or spec.md** during execution. If something needs to change in the plan, stop and tell the user.
- **Use the dispatcher agent for parallel grouping.** Items in the same sequential group run in order. Parallel groups run simultaneously.
- **If dispatcher returns BLOCKED, fall back to sequential.** Execute items one at a time in original todo order.
- **Keep the user informed.** After each batch completes, show a brief status update.
