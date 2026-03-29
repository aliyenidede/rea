# REA

Structured development workflow for Claude Code.

REA installs slash commands, composable agents, and CI config into any project. The CLI copies files — all intelligence runs through Claude.

```bash
pip install rea-dev
rea setup .
# open Claude Code → /rea-init
```

## What you get

**Slash commands** (use inside Claude Code):

| Command | What it does |
|---------|-------------|
| `/rea-plan` | Write a spec + todo, adversarial review, get approval before coding |
| `/rea-execute` | Agents implement in parallel with spec review + code review |
| `/rea-commit` | Commit, push, open PR to the right branch automatically |
| `/rea-brainstorm` | Explore ideas before committing to a plan |
| `/rea-verify` | Health check — CI, branches, config |
| `/rea-write-skill` | Create a new custom agent or command |
| `/rea-wrap` | End-of-session summary + save lessons |
| `/rea-update` | Update REA + sync templates |

**Composable agents** (called by commands or standalone):

| Agent | Purpose |
|-------|---------|
| `explorer` | Read-only codebase research |
| `implementer` | TDD-driven implementation |
| `spec-reviewer` | Verifies implementation matches requirements |
| `code-reviewer` | Code quality assessment |
| `debugger` | 4-phase root cause debugging |
| `plan-reviewer` | Adversarial plan review |
| `dispatcher` | Groups todo items into parallel/sequential batches |
| `bug-scanner` | Logic bugs, edge cases, error handling gaps |
| `security-scanner` | Security vulnerabilities |
| `skill-writer` | Creates new agents/commands matching conventions |

## Quick start

**Requirements:** Python 3.11+, `gh` CLI authenticated, git repo with GitHub remote.

```bash
# Install
pip install rea-dev

# Add to your project
rea setup /path/to/project

# Finish setup in Claude Code
/rea-init
```

`/rea-init` detects your stack and installs CI workflows, branch protection, hooks, and a project-specific `CLAUDE.md`.

## How it works

1. **Plan** — `/rea-plan` researches your codebase, drafts a spec + todo, runs adversarial review, and waits for your approval before any code is written.

2. **Execute** — `/rea-execute` dispatches todo items to parallel agents. Each item goes through implementation, spec review, and code review.

3. **Commit** — `/rea-commit` detects your branch, commits, pushes, and opens a PR to the right target (`feature/*` → staging, `staging` → main).

Plans persist in `.rea/plans/` across sessions. The `NEXT:` marker tracks where you left off.

## Branch strategy

```
feature/*  →  PR to staging
staging    →  PR to main (release)
hotfix/*   →  PR to main (emergency)
```

## Architecture

Commands are orchestrators. Agents are building blocks. Agents never call other agents — only commands orchestrate.

## License

MIT
