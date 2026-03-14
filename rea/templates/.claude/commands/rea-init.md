You are setting up the REA development toolkit in this project. Follow these steps exactly.

## Step 1 — Check dependencies

Check that the following are available:

- `gh` CLI: run `gh auth status`. If not authenticated or not installed, stop and tell the user to run `gh auth login` first.
- `git` remote: run `git remote -v`. If no GitHub remote exists, stop and tell the user to push the repo to GitHub first.
- `workflow` scope: run `gh auth status` and check for `workflow` in the token scopes. If missing, stop and tell the user to run `gh auth refresh -h github.com -s workflow` first.

## Step 2 — Detect project state

Check what already exists:
- Is there a `CLAUDE.md`? If yes → brownfield. If no → greenfield.
- Is there `.claude/settings.json`?
- Is there `.github/workflows/`?
- What is the tech stack? Check for `package.json`, `pyproject.toml`, `requirements.txt`, `Cargo.toml` etc.

## Step 3 — Greenfield only: generate CLAUDE.md

If no `CLAUDE.md` exists, ask the user these questions one by one:
1. What does this project do? (one sentence)
2. What is the tech stack?
3. What are the main architectural rules I should always follow?
4. What commands are used to build, test, and lint?

Then write a `CLAUDE.md` with: project description, tech stack, architecture rules, commands.

## Step 4 — Install missing files

Install only what is missing. Never overwrite existing files.

### `.claude/settings.json`
If missing, create it based on detected tech stack:
- Node/pnpm: `{"permissions": {"allow": ["pnpm run build:*", "pnpm run test:*", "pnpm run typecheck:*", "pnpm run lint:*"]}}`
- Node/npm: same with `npm run`
- Python: `{"permissions": {"allow": ["pytest*", "ruff*", "mypy*"]}}`

### `.claude/hooks/post-tool-use.sh`
If missing, create hooks directory and script:
- Node/pnpm: `pnpm run lint --fix 2>/dev/null || true`
- Node/npm: `npm run lint --fix 2>/dev/null || true`
- Python: `ruff format . 2>/dev/null || true`

Also create `.claude/settings.json` hook entry if not present:
```json
{
  "hooks": {
    "PostToolUse": [{"matcher": "Write|Edit", "hooks": [{"type": "command", "command": "bash .claude/hooks/post-tool-use.sh"}]}]
  }
}
```

### `.github/workflows/ci.yml`
If missing, create based on tech stack. See GitHub workflow templates.

### `.github/workflows/claude-review.yml`
If missing, create it with this exact content (uses `claude-code-action` — requires `ANTHROPIC_API_KEY` secret):

```yaml
name: claude-review

on:
  pull_request:
    types: [opened, synchronize]
  issue_comment:
    types: [created]

jobs:
  review:
    if: |
      (github.event_name == 'pull_request') ||
      (github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude'))
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: anthropics/claude-code-action@beta
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          direct_prompt: |
            Review this pull request. Focus on bugs, security issues, and major design problems.
            Be concise. Skip trivial style comments.
```

### `.rea/log/` and `.rea/plans/`
Create if missing.

## Step 5 — Create staging branch

Run: `git checkout -b staging 2>/dev/null || true && git push origin staging 2>/dev/null || true && git checkout -`

## Step 6 — Set up branch protection

First check if the repo is private:
```bash
gh api repos/{owner}/{repo} --jq '.private'
```

If `true`: warn the user that branch protection requires GitHub Pro on private repos, and skip.
If `false`: run via gh CLI:

```
gh api repos/{owner}/{repo}/branches/main/protection --method PUT --input - <<EOF
{"required_status_checks":{"strict":true,"contexts":["ci"]},"enforce_admins":false,"required_pull_request_reviews":null,"restrictions":null}
EOF
```

Same for staging branch.

## Step 7 — Report

Print a clear summary:
```
✅ CLAUDE.md — OK
✅ .claude/settings.json — created
✅ .claude/hooks/ — created
✅ .github/workflows/ci.yml — created
✅ .github/workflows/claude-review.yml — created
✅ staging branch — created
✅ branch protection — main + staging

⚠️  Add these GitHub secrets (run each command):
  gh secret set ANTHROPIC_API_KEY
  gh secret set COOLIFY_STAGING_WEBHOOK_URL
  gh secret set COOLIFY_PRODUCTION_WEBHOOK_URL

Run /rea-verify when done.
```
