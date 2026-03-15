Execute the current plan using the agent-driven implementation loop.

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

## Step 2 — Execute items

For each item marked with `NEXT:`:

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

If there are more items with `- [ ]`:
- Show progress: `Completed X/Y items. Next: <item text>`
- Go back to Step 2

If all items are done:
```
All tasks complete. Run /rea-commit to open a PR.
```

## Rules

- **Never skip the spec-reviewer or code-reviewer.** Every item goes through the full triple loop.
- **Maximum 3 fix cycles** per review stage. If still failing, stop and ask the user.
- **Do not modify plan.md or spec.md** during execution. If something needs to change in the plan, stop and tell the user.
- **One item at a time.** Do not parallelize items (parallel execution is a future iteration).
- **Keep the user informed.** After each item completes, show a brief status update.
