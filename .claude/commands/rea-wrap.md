---
name: rea-wrap
description: "Wrap up the current session — summarize work, save context, prepare for next session."
---

The user is ending this session and moving to a new one. Your job is to close out all work, persist everything important, and leave a clean state for the next session. Do all steps — do not ask for confirmation, do not propose changes. Act.

## Step 1 — Commit uncommitted changes

Run: `git status`

If there are uncommitted changes, commit them now using the commit conventions from CLAUDE.md. Push to the current branch. Do not ask — just do it.

If there are no changes, skip.

## Step 2 — Write session log

**File name:** `.rea/log/YYYY-MM-DD-HHmm-session-<session-name>.md`

Use the actual current date and time (24h format, no separators in time). `<session-name>` is a 2-3 word kebab-case summary of what was done this session. Example: `2026-03-17-1830-session-coolify-setup.md`

To determine the session name: look at commits, changes, and conversation topics — pick the dominant theme.

```markdown
# Session: <session-name>

Date: YYYY-MM-DD HH:MM:SS

## Commits
<run git log --oneline --since="4 hours ago" and paste output>

## Decisions
- <important decisions made this session>

## Next
- <what should happen next session>
```

## Step 3 — Save lessons

Scan the visible conversation for lessons. Look for BOTH categories with equal priority:

**User corrections and redirections:**

Enumerate user messages in order. Skip `tool_result` blocks, system wrappers (`<task-notification>`, `<command-message>`, `<ide_opened_file>`), and empty/whitespace-only messages.

For each remaining user message, apply this per-message judgment: *"Did the user push back, correct, redirect, reject, or disagree with what I just did?"*

**Behavior-change gate:** Only log a correction if the assistant actually changed approach, output, or plan after the message. Skepticism without behavior change is not a lesson. This gate applies uniformly — to direct refusals, short pushbacks, ironic tone, and questions that imply disagreement. If there was no behavior change, skip the message.

**Gate-unverifiable case (partial context):** If the pushback turn is visible but the confirming follow-up turns are outside current context, log as provisional with the exact inline note `(behavior-change unverifiable — context truncated)` appended to the Lesson line.

When logging a correction: include the verbatim user quote in its original language — do not translate. Preserve harsh, profane, or ironic wording exactly as written. Non-English corrections stay in their original language. Also include one line of context describing what the assistant had just done, and what changed afterwards (or the provisional marker if unverifiable).

**Long-session coverage note:** If the session is long and early turns are no longer accessible in current context, explicitly state in the Step 7 final report which portion of the session was scanned (e.g. "Lessons captured from turns 80–200; earlier turns not in context").

**Internal mistakes and surprises:**
- Approaches that failed or had to be abandoned
- Unexpected behaviors, gotchas, or edge cases discovered
- Assumptions that turned out to be wrong

For each lesson found, append to `.rea/lessons.md`:

```
## YYYY-MM-DD HH:MM:SS
**Source:** user-correction | internal-mistake | discovery
**Lesson:** what was learned
**Rule:** what to do in the future
```

If a lesson is architectural (affects how code is structured or deployed), add it directly to the relevant section in `CLAUDE.md` instead.

If no lessons, skip.

## Step 4 — Update CLAUDE.md

Read `CLAUDE.md`. Check against this session's work:
- New commands or workflows added? Update the Commands section.
- New architectural rules discovered? Update Architecture Rules.
- File structure changed? Update the file tree.

Edit directly. Do not ask.

## Step 5 — Update memory

Save to memory:
- Important decisions made
- User preferences discovered
- Project state changes

Skip if nothing noteworthy.

## Step 6 — Check remaining work

Check `.rea/plans/*/todo.md` for any `- [ ]` items. Count remaining. Do NOT attempt to complete them — only report the count.

## Step 7 — Report

Print the final summary:

```
Session wrapped.

Done:
  - <2-3 bullets of what was accomplished>

Saved:
  - <what was written to log/lessons/CLAUDE.md/memory>

Remaining:
  - <open todo count or "none">
  - <next steps for next session>
```
