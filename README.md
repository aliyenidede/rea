# REA

A portable development toolkit that bootstraps a structured Claude Code workflow into any project.

```bash
pip install rea
rea init <project>          # copies slash commands + creates .rea/ dirs
# open Claude Code → /rea-init
```

---

## What it does

REA installs four slash commands into your project and a structured plan/log system. The CLI is mechanical — it copies files. All intelligence runs through Claude.

```
rea init             → copies .claude/commands/ + creates .rea/
/rea-init            → scans project, installs missing config, sets up GitHub
/rea-plan            → full planning pipeline with interrogation loop
/rea-commit          → detects branch, opens PR to correct target
/rea-verify          → health check, reports missing pieces with fix commands
```

---

## Install

```bash
pip install git+https://github.com/aliyenidede/rea.git
```

**Requirements:** `gh` CLI authenticated, git repo with GitHub remote.

---

## Quickstart

```bash
# 1. Install into your project
rea init /path/to/project

# 2. Open Claude Code in that project
# 3. Run
/rea-init
```

`/rea-init` detects your stack (Node/pnpm, Python, etc.) and installs:
- `.claude/settings.json` — allowed commands
- `.claude/hooks/post-tool-use.sh` — auto-lint on every file write
- `.github/workflows/ci.yml` — test + typecheck + lint on every PR
- `.github/workflows/claude-review.yml` — `@claude` PR review via OpenRouter
- `staging` branch + GitHub branch protection

---

## Plan pipeline

```
/rea-plan "add stripe billing"
```

1. Researches relevant files and functions
2. Drafts a strict technical requirements doc (no code, no PM sections)
3. Runs interrogation loop — "100% sure?" — until plan is solid
4. Surfaces real decisions with trade-offs → you decide
5. Writes `.rea/plans/0001-stripe-billing/spec.md`, `plan.md`, `todo.md`
6. Creates `.rea/log/<date>-<task>.md`

`todo.md` uses a `NEXT:` marker for session continuity — next time you run `/rea-plan`, it finds the marker and asks to resume.

---

## Plan file structure

```
.rea/
├── log/
│   └── 2026-03-14-0001-stripe-billing.md
└── plans/
    └── 0001-stripe-billing/
        ├── spec.md    ← what and why
        ├── plan.md    ← technical requirements
        └── todo.md    ← soldier-level steps with NEXT: marker
```

---

## Branch strategy

```
main      → production
staging   → pre-production
feature/* → PR to staging
hotfix/*  → PR to main
```

`/rea-commit` detects the current branch and opens the PR to the right target automatically.

---

## Flowchart

See [docs/flowchart.md](docs/flowchart.md) — full Mermaid diagram of the complete workflow.

---

## CLAUDE.md hierarchy

```
~/.claude/CLAUDE.md           ← global rules (all projects)
project/CLAUDE.md             ← project architecture + stack
project/features/x/CLAUDE.md ← feature-specific rules (created by /rea-plan when needed)
```

`/rea-plan` creates a feature-level `CLAUDE.md` when the task opens a new domain (auth, billing, webhooks) or spans multiple sessions.
