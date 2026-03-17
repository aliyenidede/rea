# REA — Development Toolkit

## What This Is

A portable CLI toolkit that bootstraps a structured Claude Code workflow (slash commands, CI, branch strategy, plan system) into any project. The CLI is mechanical — it copies files. All intelligence runs through Claude.

## Tech Stack

- Python 3.11+
- Typer (CLI framework)
- setuptools (packaging)
- pytest (tests)
- ruff (lint + format)

## Architecture Rules

1. **CLI is dumb, Claude is smart** — `rea` CLI only copies files and creates directories. No logic, no decisions. All workflow intelligence lives in the slash command prompts under `rea/templates/.claude/commands/`.

2. **Templates are the product** — `rea/templates/` is the source of truth. When templates change, existing projects must run `rea init` again to receive updates.

3. **Idempotent operations** — All CLI commands must be safe to run multiple times. `rea init` always syncs (copies/overwrites) templates.

4. **Branch workflow** — `feature/*` → staging → main. Direct push to `main` or `staging` is forbidden. Hotfixes go `hotfix/*` → main.

5. **Semantic versioning** — Bump `version` in `pyproject.toml` on every release. Format: `MAJOR.MINOR.PATCH`. Minor for new commands/features, patch for template fixes.

6. **Composable agents** — Agents are building blocks, commands are orchestrators. Agents never call other agents directly — only commands orchestrate agent calls. Every agent must work standalone (callable by user directly) and as part of a command workflow.

## Commands

```bash
# Install / dev setup
pip install -e .

# Run tests
pytest

# Lint + format
ruff check .
ruff format .

# Use the CLI
rea init <path>
rea version
```

## File Structure

```
rea/
├── cli.py                        # Typer app — init, version
├── templates/
│   └── .claude/
│       ├── agents/               # Agent prompts
│       │   ├── explorer.md       # Read-only codebase research (Haiku)
│       │   ├── implementer.md    # TDD-driven implementation (Sonnet)
│       │   ├── spec-reviewer.md  # Requirement vs. implementation check (Sonnet)
│       │   ├── code-reviewer.md  # Code quality assessment (Sonnet)
│       │   ├── debugger.md       # Root cause debugging (Sonnet)
│       │   ├── plan-reviewer.md  # Adversarial plan review (Sonnet)
│       │   ├── plan-validator.md # Mechanical plan checks — rules, placement, coverage (Sonnet)
│       │   ├── dispatcher.md     # Parallel execution grouping (Sonnet)
│       │   ├── skill-writer.md   # Creates new agents/commands (Sonnet)
│       │   └── rea-router.md     # Auto skill routing (Haiku)
│       └── commands/             # Slash command prompts (the product)
│           ├── rea-init.md       # Project setup
│           ├── rea-plan.md       # Planning pipeline + adversarial review
│           ├── rea-commit.md     # Commit + push + PR
│           ├── rea-verify.md     # Health check
│           ├── rea-brainstorm.md # Design exploration + spec
│           ├── rea-execute.md    # Parallel agent-driven execution
│           ├── rea-worktree.md   # Git worktree setup
│           └── rea-write-skill.md # Create new agent or command
tests/
docs/
pyproject.toml
```
