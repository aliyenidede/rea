---
name: rea-commit
description: "Commit all staged and unstaged changes, push, and open a PR to the correct target branch."
---

Commit all staged and unstaged changes, push, and open a PR to the correct target branch.

## Step 0 — Confirm working directory

Run: `pwd` and `git remote -v`

This establishes which repo you are operating in. All subsequent steps must run in this directory only. Do NOT switch to another directory or repo during this command — even if you are aware of changes in other projects.

Run: `git branch --show-current`

**Branch safety checks — evaluate in order:**

**If current branch is `main`:**
Stop immediately. Print: "You're on the main branch. Direct commits to main are not allowed. Create a feature/* or hotfix/* branch first."
Do not proceed to any further steps.

**If current branch is `staging`:**
Run `git status` to check for uncommitted changes.

- If changes exist: Ask "You have changes on staging. Is this a conflict resolution or merge cleanup?" If yes: proceed with normal commit + push flow (Steps 2–6). After Step 8 (report), print: "When staging is tested and ready, run `/rea-commit` from staging to create a release PR to main."
- If no changes: Ask "You're on staging with no uncommitted changes. Do you want to create a release PR from staging to main?" If yes: skip Steps 2–6 entirely and jump directly to Step 7, creating a staging → main release PR. If no: stop.

**If current branch is `feature/*` or `hotfix/*`:**
Determine PR target:
- `feature/*` → PR to `staging`
- `hotfix/*` → PR to `main`

Proceed as normal (Steps 2–8).

**Any other branch:**
Ask the user which branch to PR to, then proceed as normal (Steps 2–8).

## Step 2 — Check for changes

Run: `git status`

If nothing to commit, say so and stop.

## Step 3 — Review changes

Run: `git diff` and `git diff --staged`

Understand what changed. Do not commit files that look like secrets (.env, credentials, private keys).

## Step 4 — Stage all changes

Run: `git add -A`

But exclude: `.env`, `*.key`, `*credentials*`, `*secret*`

## Step 5 — Write commit message

Follow the convention from CLAUDE.md:
- New feature: `feat(vX.Y.Z): short description`
- Bug fix: `fix(vX.Y.Z): short description`
- Maintenance: `chore: short description`

For version bump: read current version from `package.json` or `pyproject.toml`, increment patch version.

Body: bullet points explaining what changed and why. Be concise.

Do NOT include `Co-Authored-By` lines.

## Step 6 — Commit and push

```
git commit -m "<message>"
git push origin <current-branch>
```

If push fails because remote branch doesn't exist:
```
git push --set-upstream origin <current-branch>
```

## Step 7 — Open PR

**For feature/* or hotfix/* branches (standard PR):**

```
gh pr create \
  --title "<commit title>" \
  --body "<bullet summary>" \
  --base <target-branch>
```

**For staging → main release PR (no uncommitted changes path from Step 0):**

Title format: `release(vX.Y.Z): <one-line summary of what's in this release>`

```
gh pr create \
  --title "release(vX.Y.Z): <summary>" \
  --body "$(git log staging --oneline --not main)" \
  --base main
```

Read the current version from `pyproject.toml` or `package.json` to fill in `vX.Y.Z`.

## Step 8 — Report

Print:
```
✅ Committed: <message>
✅ Pushed: <branch>
✅ PR opened: <url>
   Base: <target-branch>
```

If this was a feature/* → staging PR, append:
"When staging is tested and ready for production, run `/rea-commit` from the `staging` branch to create a release PR to main."
