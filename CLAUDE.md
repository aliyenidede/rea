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
│       └── commands/             # Slash command prompts (the product)
│           ├── rea-init.md
│           ├── rea-plan.md
│           ├── rea-commit.md
│           └── rea-verify.md
tests/
docs/
pyproject.toml
```
