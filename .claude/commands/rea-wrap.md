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

Review the conversation for corrections, surprises, or mistakes. If any exist, append each to `.rea/lessons.md`:

```
## YYYY-MM-DD HH:MM:SS
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
