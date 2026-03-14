Commit all staged and unstaged changes, push, and open a PR to the correct target branch.

## Step 0 — Confirm working directory

Run: `pwd` and `git remote -v`

This establishes which repo you are operating in. All subsequent steps must run in this directory only. Do NOT switch to another directory or repo during this command — even if you are aware of changes in other projects.

Run: `git branch --show-current`

Determine PR target:
- `feature/*` → PR to `staging`
- `hotfix/*` → PR to `main`
- Any other branch → ask the user which branch to PR to

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

```
gh pr create \
  --title "<commit title>" \
  --body "<bullet summary>" \
  --base <target-branch>
```

## Step 8 — Report

Print:
```
✅ Committed: <message>
✅ Pushed: <branch>
✅ PR opened: <url>
   Base: <target-branch>
```
