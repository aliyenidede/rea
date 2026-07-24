---
name: rea-ship
description: "Detect the repo's real situation — repo, remote, branch protection, CI, deploy target, solo or team — then suggest and confirm a commit / push / PR / deploy flow. Merges commit and deploy into one situation-aware ritual; never forces a step."
---

Principles: L, K (`core/principles.md`)

Ship the current working tree: commit, push, open a PR to the correct target branch, and — if the
project has a deploy mechanism configured — deploy and verify health. Detect the real state
mechanically first, then suggest the appropriate flow, then let the human confirm every
consequential step. Nothing here runs automatically just because it is possible.

## Step 0 — Confirm working directory

Run: `pwd` and `git remote -v`

This establishes which repo you are operating in. All subsequent steps must run in this directory
only. Do NOT switch to another directory or repo during this command — even if you are aware of
changes in other projects.

## Step 1 — Detect the real state (detect → suggest → confirm, never force)

Before suggesting anything, gather these facts mechanically — never guess, never assume:

- **Repo?** Check whether the working directory is inside a git work tree (e.g.
  `git rev-parse --is-inside-work-tree`).
- **Remote?** Run `git remote -v`. Note whether an `origin` (or any) remote exists.
- **Current branch?** Run `git branch --show-current`.
- **Branch protected? (best-effort)** If a remote and a GitHub CLI are available, check whether the
  relevant branch requires reviews (e.g. `gh api repos/<owner>/<repo>/branches/<branch>/protection`).
  Permission or API failures are common on many repos — treat an unreadable result as "unknown," not
  as "unprotected."
- **CI?** Look for a CI configuration in the repo (a workflow/pipeline config directory or file). If
  found, CI is present.
- **Deploy target?** Look for a redeploy mechanism the project has configured — a webhook URL, a
  platform CLI, a deploy hook — typically documented in `AGENTS.md` or a project config/secrets
  file. If nothing is declared, there is no deploy target.
- **Solo or team?** Run `git shortlog -sne` over the last ~50 commits (or ~90 days, whichever is more
  representative for this repo) and count distinct committer identities. The repo is **team** if any
  of: (a) more than one distinct committer shows up in that window, (b) branch protection (above)
  requires reviews, or (c) a `CODEOWNERS` file exists at the repo root. Otherwise it is **solo**.

Hold these facts — they drive every suggestion below. Do not re-derive them mid-command.

**No repo:** offer to run `git init`. If the human declines, stop here — there is nothing to ship.

## Step 2 — Suggest the flow: branch safety and PR-target routing

Branch safety checks — evaluate in order, using the branch detected in Step 1:

**If current branch is `main`:**
Stop immediately. Print: "You're on the main branch. Direct commits to main are not allowed. Create
a feature/* or hotfix/* branch first."
Do not proceed to any further steps.

**If current branch is `staging`:**
Run `git status` to check for uncommitted changes.

- If changes exist: Ask "You have changes on staging. Is this a conflict resolution or merge
  cleanup?" If yes: proceed with the normal commit + push flow (Steps 3–7). After Step 11 (report),
  print: "When staging is tested and ready, run rea-ship from staging to create a release PR to
  main."
- If no changes: Ask "You're on staging with no uncommitted changes. Do you want to create a release
  PR from staging to main?" If yes: skip Steps 3–7 entirely and jump directly to Step 8, creating a
  staging → main release PR. If no: stop.

**If current branch is `feature/*` or `hotfix/*`:**
Determine PR target:
- `feature/*` → PR to `staging`
- `hotfix/*` → PR to `main`

Proceed as normal (Steps 3–10).

**Any other branch:**
Ask the user which branch to PR to, then proceed as normal (Steps 3–10).

### Solo vs team — where the human gate lands

- **Solo** (per Step 1): there is no one else to approve a PR, so the commit-time diff review in
  Step 4 **is** the K human moment. Once that diff is confirmed, this command proceeds through push,
  PR (still opened, for the repo's own record), CI-wait, and — if configured — deploy, without
  waiting on a review that cannot happen.
- **Team** (per Step 1): the PR is the review gate. After opening the PR (Step 8), stop and report —
  do not continue to CI-wait or deploy in the same run. Re-run this command later once the PR has
  been reviewed and merged.

## Step 3 — Check for changes

Run: `git status`

If nothing to commit, say so and stop.

## Step 4 — Review changes (the human diff checkpoint — K)

Run: `git diff` and `git diff --staged`

Understand what changed. Do not commit files that look like secrets (.env, credentials, private
keys). Show the human what changed before staging — this diff is the mandatory K checkpoint, and it
happens whether the repo is solo or team.

## Step 5 — Stage all changes

Run: `git add -A`

But exclude: `.env`, `*.key`, `*credentials*`, `*secret*`

## Step 6 — Write commit message

Follow the convention from `AGENTS.md`:
- New feature: `feat(vX.Y.Z): short description`
- Bug fix: `fix(vX.Y.Z): short description`
- Maintenance: `chore: short description`

For version bump: read current version from `package.json` or `pyproject.toml`, increment patch
version.

Body: bullet points explaining what changed and why. Be concise.

Do NOT include `Co-Authored-By` lines.

## Step 7 — Commit and push

```
git commit -m "<message>"
git push origin <current-branch>
```

If push fails because remote branch doesn't exist:
```
git push --set-upstream origin <current-branch>
```

If Step 1 found no remote: commit locally and stop here — report the commit, and offer to add a
remote (`git remote add origin <url>`) before pushing.

## Step 8 — Open PR

**For feature/* or hotfix/* branches (standard PR):**

```
gh pr create \
  --title "<commit title>" \
  --body "<bullet summary>" \
  --base <target-branch>
```

**For staging → main release PR (no uncommitted changes path from Step 2):**

Title format: `release(vX.Y.Z): <one-line summary of what's in this release>`

```
gh pr create \
  --title "release(vX.Y.Z): <summary>" \
  --body "$(git log staging --oneline --not main)" \
  --base main
```

Read the current version from `pyproject.toml` or `package.json` to fill in `vX.Y.Z`.

If Step 1 found no remote, or a GitHub CLI is unavailable: stop here — report the local commit (and
push, if a remote existed) and skip PR / CI-wait / deploy.

**Team repos:** stop after this step, per "Solo vs team" above — the PR review is the gate. Report
(Step 11) and end the run here.

## Step 9 — CI gate (solo repos only, when CI was detected)

If Step 1 found CI configured and this is a solo repo: wait for the pushed commit / PR to go green
(e.g. poll the PR's checks or the equivalent status). If CI fails, stop and report the failure — do
not proceed to deploy.

If no CI was detected, or this is a team repo, skip this step.

## Step 10 — Deploy (generic, solo repos only, when a deploy target was detected)

If Step 1 found a configured deploy target, this is a solo repo, and CI is green (or no CI was
configured): offer to deploy. On confirmation:

1. Trigger the project's configured redeploy mechanism — whatever it is (a webhook call, a platform
   CLI command, a deploy hook). This step does not assume a specific platform; it uses whatever
   Step 1 found the project declared.
2. Wait for the deploy to complete, then run the project's configured health check, if one exists,
   against the deployed target.
3. Report success or failure.

If no deploy target was detected, this is a team repo, or the human declines: skip deploy.

## Step 11 — Report

Print:
```
Committed: <message>
Pushed: <branch>
PR opened: <url>
   Base: <target-branch>
CI: <green / not applicable / not detected>
Deploy: <deployed + health-check result / skipped — reason>
```

If this was a feature/* → staging PR, append:
"When staging is tested and ready for production, run rea-ship from the staging branch to create a
release PR to main."

## Rules

- **Never force a step.** Detect, suggest, confirm — push / PR / deploy are proposals the human
  confirms, not automatic actions.
- **The secret-exclusion pathspec (Step 5) and the human-visible diff (Step 4) are mandatory** before
  every commit, solo or team.
- **Solo repos:** the Step 4 diff review is the K human moment; do not block waiting for a PR
  approval that cannot happen — proceed through CI-wait and deploy once the diff is confirmed.
- **Team repos:** stop after the PR is opened (Step 8); the review gate stands.
- **Degrade gracefully, never crash the flow:** no repo → offer `git init`; no remote → local commit
  only; no CI → skip the CI wait; no deploy target → stop at PR / push.
