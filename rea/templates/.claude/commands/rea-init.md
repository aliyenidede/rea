---
name: rea-init
description: "Set up the REA development toolkit in a project — installs config, CI, branch protection."
---

You are setting up the REA development toolkit in this project. Follow these steps exactly.

## Step 1 — Check dependencies

Check that the following are available:

- `gh` CLI: run `gh auth status`. If not authenticated or not installed, stop and tell the user to run `gh auth login` first.
- `git` remote: run `git remote -v`. If no GitHub remote exists, stop and tell the user to push the repo to GitHub first.
- `workflow` scope: run `gh auth status` and check for `workflow` in the token scopes. If missing, stop and tell the user to run `gh auth refresh -h github.com -s workflow` first.

## Step 2 — Detect project state

Check what already exists:
- Is there a `CLAUDE.md`?
- Is there `.claude/settings.json`?
- Is there `.github/workflows/`?
- What is the tech stack? Check for `package.json`, `pyproject.toml`, `requirements.txt`, `Cargo.toml` etc.

Now classify the project into one of three states:

| State | Condition | Action |
|-------|-----------|--------|
| **Brownfield** | `CLAUDE.md` exists | Audit existing CLAUDE.md (Step 2B) |
| **Undocumented** | No `CLAUDE.md` BUT code files exist (src/, lib/, app/, packages/, etc.) | Auto-generate CLAUDE.md from codebase analysis (Step 2C) |
| **Greenfield** | No `CLAUDE.md` AND project directory is empty or contains only config files (.git, .gitignore, README.md) | Ask the user questions and write CLAUDE.md from scratch (Step 3) |

To detect code files: glob for `**/*.{ts,tsx,js,jsx,py,rs,go,java,rb,cs}` — if any matches exist, it is NOT greenfield.

## Step 2B — Brownfield only: audit CLAUDE.md

If brownfield, read the existing `CLAUDE.md` and check for these sections:

| Section | Why it matters |
|---|---|
| `## Architecture Rules` | Without this, Claude makes wrong placement decisions |
| `## Commands` | Without this, Claude runs wrong build/test/lint commands |
| `## Workflow Behavior` | Self-improvement loop + verification standard |

For each missing section, report it:
```
⚠️  CLAUDE.md is missing these sections:
  - ## Commands
  - ## Workflow Behavior
```

If `## Workflow Behavior` is missing: add it immediately without asking (same content as greenfield). No confirmation needed.

For other missing sections, report them and ask: "Should I add the missing sections? I'll ask you questions for each one."

If user says yes:
- `## Commands` → ask: "What are the build, test, and lint commands for this project?"
- `## Architecture Rules` → ask: "What are the main architectural rules I should always follow?"

Append only the missing sections. Never modify existing content.

Also scan for `features/` directory. If it exists, check each subdirectory for a `CLAUDE.md`:
```
⚠️  These features are missing a CLAUDE.md:
  - features/auth/
  - features/billing/
```
Ask: "Should I create CLAUDE.md files for these features? I'll ask 3 questions per feature."

If user says yes, for each feature ask:
1. What is the scope of this feature? (what's in, what's out)
2. What are the feature-specific rules and constraints?
3. What key decisions were made when building this?

## Step 2C — Undocumented only: auto-generate CLAUDE.md

If the project has code but no CLAUDE.md, do NOT ask greenfield questions. Instead, analyze the codebase and generate CLAUDE.md automatically.

### 2C.1 — Explore the codebase

Use the `explorer` agent to investigate:
- Project structure (directory tree, key directories)
- Tech stack (languages, frameworks, package managers, build tools)
- Entry points (main files, app directories, worker directories)
- Architecture patterns (monorepo? microservices? single app? API + frontend?)
- Build/test/lint commands (read package.json scripts, pyproject.toml, Makefile, etc.)
- Existing conventions (naming patterns, file organization, import patterns)

### 2C.2 — Generate draft CLAUDE.md

Write a `CLAUDE.md` with these sections, populated entirely from codebase analysis:
- **Project description** — inferred from README.md, package.json description, or directory structure
- **Tech stack** — detected from config files and dependencies
- **Architecture rules** — inferred from actual code organization (e.g., if shared code lives in `packages/`, state that rule)
- **File structure** — actual directory tree with brief descriptions
- **Commands** — extracted from package.json scripts, Makefile targets, pyproject.toml, etc.

### 2C.3 — Present to user for confirmation

Show the generated CLAUDE.md to the user:
```
I analyzed the codebase and generated a CLAUDE.md draft.
Please review — is anything wrong or missing?
```

Wait for confirmation. Apply any corrections the user provides. Then proceed to Step 4.

## Step 3 — Greenfield only: generate CLAUDE.md

If the project is truly empty (no code files), ask the user these questions one by one:
1. What does this project do? (one sentence)
2. What is the tech stack?
3. What are the main architectural rules I should always follow?
4. What commands are used to build, test, and lint?

Then write a `CLAUDE.md` with the following sections:
- Project description (from Q1)
- Tech stack (from Q2)
- Architecture rules (from Q3)
- Commands: build, test, lint (from Q4)
- Always append this section verbatim:

```
## Workflow Behavior

**Self-Improvement Loop** — After any correction from the user, append the lesson to `.rea/lessons.md`:
```
## YYYY-MM-DD
**Mistake:** what went wrong
**Rule:** what to do instead
```
If the lesson is architectural (e.g. a rule about what can import what, where logic must live), promote it to the relevant section of `CLAUDE.md` instead of lessons.md.

**Verification Standard** — Before marking any task complete, ask: "Would a staff engineer approve this?" Run tests, check logs, prove it works.

**Verification Iron Rule** — NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE. Before saying "done": run the command that proves it, read the full output, check exit code. "Should work" is not evidence.
```

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

### SessionStart hook (automatic skill routing)
If `.claude/settings.json` exists but has no `SessionStart` hook entry, add one:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "cat .claude/agents/rea-router.md"
          }
        ]
      }
    ]
  }
}
```
Merge with existing hooks in settings.json — do not overwrite `PostToolUse` or other existing hooks.

Only add this hook if `.claude/agents/rea-router.md` exists.

### `.github/workflows/ci.yml`
If missing, create based on tech stack. See GitHub workflow templates.

### `.github/workflows/claude-review.yml`
If missing, create it with this exact content (uses `claude-code-action` — requires `ANTHROPIC_API_KEY` secret):

```yaml
name: claude-review

on:
  issue_comment:
    types: [created]

jobs:
  review:
    if: contains(github.event.comment.body, '@claude')
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: anthropics/claude-code-action@beta
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### `.gitattributes`
If missing, always create — regardless of stack:
```
* text=auto eol=lf
*.py text eol=lf
*.ts text eol=lf
*.tsx text eol=lf
*.js text eol=lf
*.json text eol=lf
*.yml text eol=lf
*.toml text eol=lf
*.md text eol=lf
*.sh text eol=lf
```

### Placeholder test
If no test files exist anywhere in the project (check recursively), create one based on stack:

- **Python**: create `tests/test_placeholder.py`:
```python
def test_placeholder():
    """Remove this once real tests exist."""
    pass
```

- **Node/pnpm or Node/npm**: create `src/__tests__/placeholder.test.ts` (or `.js` if no TypeScript):
```typescript
test("placeholder", () => {
  // Remove this once real tests exist.
});
```

### Python only: dev extras in `pyproject.toml`
If `pyproject.toml` exists and `[project.optional-dependencies]` section is missing, add:
```toml
[project.optional-dependencies]
dev = [
    "pytest>=8",
    "ruff>=0.4",
]
```
Also update `ci.yml` install step to use `pip install -e ".[dev]"` if not already.

### `.claude/agents/`
If missing, create directory and copy REA agent templates:
- `explorer.md` — read-only codebase research agent (Read, Glob, Grep, Haiku model)

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
{"required_status_checks":{"strict":true,"contexts":["test"]},"enforce_admins":false,"required_pull_request_reviews":null,"restrictions":null}
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

If the project deploys to Coolify (check ci.yml for Coolify steps — if present, include this):
  gh secret set COOLIFY_STAGING_WEBHOOK_URL
  gh secret set COOLIFY_PRODUCTION_WEBHOOK_URL

  Coolify setup checklist (do this in order):
    1. Create a new project in Coolify
    2. Add application → select GitHub repo
    3. Copy the deploy key from Coolify → add to GitHub repo Settings → Deploy keys (read-only)
    4. Set all environment variables (use .env.example as reference)
    5. Copy webhook URLs from Coolify → set as secrets above
    6. Trigger first deploy and verify

Run /rea-verify when done.
```
