---
name: rea-wrap
description: "Clean-close ritual for the end of a session — writes one session note to `.rea/sessions/`, suggests (never forces) a commit and any architecture-rule change, and reports remaining work."
---

Principles: — (a clean-close ritual; serves no single principle. See `core/principles.md`.)

The session is ending. Close it out: write one session note capturing what happened, link it to
whatever this session already captured into `.rea/knowledge/` and `.rea/decisions/`, suggest a
commit if the tree is dirty, suggest an architecture-rule change if one surfaced, and report
remaining work. This command writes only under `.rea/` — it never commits, never touches a project
rules file, and never writes to native memory. Work through the steps in order; if one step cannot
complete (no git history, no plans directory, nothing to report), skip it and note the gap in the
final report rather than stopping the whole ritual.

## Step 1 — Determine the session's dominant theme

Look at this session's commits, file changes, and conversation topics. Pick the dominant theme and
reduce it to a 2-3 word kebab-case slug (e.g. `coolify-setup`, `auth-refactor`). This slug names the
session note and anchors the summary in Step 2.

If no single theme stands out (the session touched several unrelated things), pick the theme that
took the most time or produced the most durable output, and mention the others briefly in the
summary instead of forcing a single label onto everything.

## Step 2 — Write the session log

**File:** `.rea/sessions/YYYY-MM-DD-HHMM-<slug>.md` — use the actual current date and time, no
separators in the time part (e.g. `2026-03-17-1830-coolify-setup.md`), per the `sessions/` naming
rule in `core/rea-schema.md`. The timestamp makes the filename unique on its own — no collision
check is needed for this note type.

Write exactly these frontmatter fields, then a short body:

```markdown
---
date: YYYY-MM-DD HH:MM:SS
summary: <one-line dominant theme, from Step 1>
links: [<wikilinks to notes this session touched — see Step 3>]
---

# Session: <slug>

## What happened
<2-4 sentences: what was done, grounded in the dominant theme>

## Commits
<`git log --oneline` since session start, or "none">

## Next
<what should happen next session>
```

This is the only file this command writes for the log itself. Do not also write to a legacy log
location — `.rea/sessions/` is the sole destination.

## Step 3 — Light consolidation — link the session's captures

During the session, the ongoing capture reflex (see `AGENTS.md`) may already have written notes into
`.rea/knowledge/` and `.rea/decisions/`, and may have touched a plan under `.rea/plans/`. Gather the
list of notes created or updated this session and add them to the session note's `links` field as
wikilinks (e.g. `[[some-entity]]`, `[[0004-some-decision]]`, `[[plans/0003-x/todo]]` — path-qualify
plan links per the wikilinks rule in `core/rea-schema.md`).

This is light linking only — connect what already exists. Do not rewrite, merge, or deduplicate
those notes here; reconciling duplicate or drifted notes is `rea-tidy`'s job, not this command's.

## Step 4 — Suggest a commit (never force)

Run `git status`. If there are uncommitted changes, note this in the final report as a suggestion —
do not run `git add`, `git commit`, or `git push` here. Committing (and everything downstream of it —
push, PR, deploy) is `rea-ship`'s job.

If the tree is clean, note that too — no suggestion needed.

## Step 5 — Suggest an architecture-rule change (never force — principle J)

Reflect on whether this session surfaced a lasting change to how the project is structured (a new
module boundary, a changed convention, a rule that should steer future sessions). If so, describe the
suggested change in the final report and point at the project's rules file (`AGENTS.md`) as where a
human would add it. Do not edit that file yourself — architecture awareness is a human call
(principle J), not something this command decides and writes on its own.

If nothing architectural surfaced this session, skip this silently.

## Step 6 — Count remaining work

Scan `.rea/plans/*/todo.md` for every unit's `Status:` field. Count every unit whose `Status` is
**not** `done` (`todo`, `in-progress`, and `blocked` all count as remaining). Do not attempt to
complete or fix any of them — only report the count, per plan directory if more than one plan is
active.

If no `.rea/plans/` directory exists, or every unit is `done`, report "none".

## Step 7 — Report

Print the final summary:

```
Session wrapped: <slug>

Saved:
  - .rea/sessions/<filename> (linked: <n> notes)

Suggested:
  - Commit: <"uncommitted changes — run rea-ship" or "tree clean, nothing to commit">
  - Architecture: <one-line suggestion, or "none">

Remaining:
  - <count of non-done units, per plan, or "none">
  - <next steps for next session, from the session note's Next section>
```

## Rules

- **Writes only under `.rea/`.** No `lessons.md`, no auto-write to any project rules file, no native
  memory writes — a suggestion in the report is as far as this command goes for anything outside
  `.rea/`.
- **Never commits.** `git status` (read) is fine; `git add` / `git commit` / `git push` are not — a
  dirty tree is a suggestion to run `rea-ship`, never an automatic action here.
- **Suggest, never force** — the commit suggestion (Step 4) and the architecture-rule suggestion
  (Step 5) both stop at describing the change; a human decides whether to act on either.
- **No heavy dedup.** Step 3 links existing notes; it does not merge, rewrite, or renumber them —
  that reconciliation is `rea-tidy`'s job.
- **Fault-tolerant.** If a step has nothing to do (clean tree, no plans directory, no architectural
  finding), skip it and say so plainly in the report rather than treating it as a failure.
- **Remaining-work count comes from `todo.md` `Status:` fields only** — never from a stale pointer,
  never by re-deriving it from conversation memory.
