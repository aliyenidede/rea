Check every REA component in this project and report status. Be thorough.

## Checks

Run each check and report ✅ / ⚠️ / ❌:

**Dependencies:**
- `gh auth status` → gh CLI installed and authenticated?
- `git remote -v` → GitHub remote exists?

**Files:**
- `.claude/settings.json` exists and has allowed commands?
- `.claude/commands/rea-init.md` exists?
- `.claude/commands/rea-plan.md` exists?
- `.claude/commands/rea-commit.md` exists?
- `.claude/commands/rea-verify.md` exists?
- `.claude/commands/rea-brainstorm.md` exists?
- `.claude/commands/rea-execute.md` exists?
- `.claude/commands/rea-worktree.md` exists?
- `.claude/commands/rea-write-skill.md` exists?
- `.claude/agents/explorer.md` exists?
- `.claude/agents/implementer.md` exists?
- `.claude/agents/spec-reviewer.md` exists?
- `.claude/agents/code-reviewer.md` exists?
- `.claude/agents/debugger.md` exists?
- `.claude/agents/plan-reviewer.md` exists?
- `.claude/agents/dispatcher.md` exists?
- `.claude/agents/skill-writer.md` exists?
- `.claude/agents/rea-router.md` exists?
- `.claude/hooks/post-tool-use.sh` exists?
- `.github/workflows/ci.yml` exists?
- `.github/workflows/claude-review.yml` exists?
- `CLAUDE.md` exists and is non-empty?
- `.rea/log/` directory exists?
- `.rea/plans/` directory exists?
- `.claude/settings.json` has `SessionStart` hook for rea-router?

**GitHub:**
- `git branch -r | grep staging` → staging branch exists on remote?
- `gh api repos/{owner}/{repo}/branches/main/protection` → main branch protection active?
- `gh api repos/{owner}/{repo}/branches/staging/protection` → staging branch protection active?
- `gh secret list` → OPENROUTER_API_KEY present?
- `gh secret list` → COOLIFY_STAGING_WEBHOOK_URL present?
- `gh secret list` → COOLIFY_PRODUCTION_WEBHOOK_URL present?

**Lessons:**
- `.rea/lessons.md` exists? If yes, read it and check:
  - Any lesson that starts with "never import", "always put", "X must live in", "X cannot call" → these are architectural and should be in `CLAUDE.md`, not lessons.md. Flag them.
  - Any lesson that duplicates an existing rule already in `CLAUDE.md` → flag as stale.

## Output format

Print a clean report:
```
✅ gh CLI — authenticated
✅ CLAUDE.md — OK
✅ .claude/settings.json — OK
✅ .claude/commands/ — all rea-* present
✅ .claude/hooks/post-tool-use.sh — OK
✅ .github/workflows/ci.yml — OK
✅ .github/workflows/claude-review.yml — OK
✅ staging branch — exists
✅ branch protection — main + staging active
⚠️  COOLIFY_STAGING_WEBHOOK_URL — missing
❌ COOLIFY_PRODUCTION_WEBHOOK_URL — missing
```

Then list all issues with exact fix instructions:
```
Issues found (2):
  1. gh secret set COOLIFY_STAGING_WEBHOOK_URL
  2. gh secret set COOLIFY_PRODUCTION_WEBHOOK_URL
```

If no issues: "Everything looks good. Ready to work."
