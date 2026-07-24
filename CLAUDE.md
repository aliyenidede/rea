# REA — Development Toolkit

## What This Is

A portable CLI toolkit that bootstraps a structured Claude Code workflow (slash commands, CI, branch strategy, plan system) into any project. The CLI is mechanical — it copies files. All intelligence runs through Claude.

> **Redesign in progress (2026-07):** a full principle-derived, cross-tool redesign — two products (**readev-tools** methodology + **rea-cli** agent). Master plan: [docs/rea-roadmap.md](docs/rea-roadmap.md); readev-tools design: [docs/rea-target-state.md](docs/rea-target-state.md). The shipped v0.7.1 Python-CLI set described below is being superseded phase by phase on branch `feature/rea-redesign`: **Faz 0–3 done** (`core/` foundation, install templates, tool-agnostic agents + commands); **Faz 4 part 1 done — 2026-07-23** (the npx **readev-tools** installer core under `src/`/`bin/`/`test/` + distribution landing: `rea-dev` frozen at 0.7.2 as a deprecation shim, npx is the maintained path); **Faz 4 part 2 done — 2026-07-23** (0010: `npx readev-tools verify` — read-only manifest-driven health check — + `npx readev-tools migrate` — the one-time v0.7.1→redesign bridge: self-gating, `--dry-run`, archive-not-delete). **Faz 4 is code-complete (2026-07-24):** installer core + `verify` + `migrate` + the security gate all executed and committed; `node --test` 169 pass / 3 win32-EPERM skips / 0 fail. **Not yet:** `npm publish`/PyPI 0.7.2-shim release (user-gated), `rea-cli`; non-gating polish (long-agent trim, skill-writer audience prose) parked as 4e → a later plan 0012. **Security gate (done 2026-07-23, commit `a83b216`; residual closed 2026-07-24):** `.rea/plans/0011-safe-path-hardening/` closed two live symlink→arbitrary-**write** vulns (CWE-59) in `src/shims.js`/`src/place.js`/`src/settings-surgery.js` via a shared `src/safe-path.js` — every content **write** + `verify`'s owned/shim reads now go through `safe-path`'s realpath-aware containment (a few low-severity existence/enumeration read-probes remain uncontained by design). A Phase-4 audit then caught one residual source-side hole (`rea-archive` FIX D `rmdir` reachable via an intermediate `.rea` junction), closed by **FIX F** (ADR 0002 amendment); with FIX F **no installer FS mutation path bypasses containment** — the CWE-59 write/mutation class is genuinely closed. The must-precede-`npm publish` gate is met.

## Tech Stack

- Python 3.11+ (legacy `rea-dev` CLI, now a frozen deprecation shim)
- Typer (CLI framework)
- setuptools (packaging)
- pytest (tests)
- ruff (lint + format)
- Node.js ≥20 (the redesign `readev-tools` npx installer — `src/`, CommonJS, no runtime deps, `node:test`; run `npm test`)

## Architecture Rules

1. **CLI is dumb, Claude is smart** — `rea` CLI only copies files and creates directories. No logic, no decisions. All workflow intelligence lives in the slash command prompts under `rea/templates/.claude/commands/`.

2. **Templates are the product** — `rea/templates/` is the source of truth. When templates change, existing projects must run `rea setup` again to receive updates.

3. **Idempotent operations** — All CLI commands must be safe to run multiple times. `rea setup` always syncs (copies/overwrites) templates.

4. **Branch workflow** — `feature/*` → staging → main. Direct push to `main` or `staging` is forbidden. Hotfixes go `hotfix/*` → main.

5. **Semantic versioning** — Bump `version` in `pyproject.toml` on every release. Format: `MAJOR.MINOR.PATCH`. Minor for new commands/features, patch for template fixes.

6. **Composable agents** — Agents are building blocks, commands are orchestrators. Agents never call other agents directly — only commands orchestrate agent calls. Every agent must work standalone (callable by user directly) and as part of a command workflow.

## Distribution

- **PyPI package name:** `rea-dev` (https://pypi.org/project/rea-dev/)
- **CLI command:** `rea`
- **Install:** `pip install rea-dev`
- **Update:** `pip install --upgrade rea-dev`
- **Dev setup:** `pip install -e .`

## Commands

```bash
# Run tests
pytest

# Lint + format
ruff check .
ruff format .

# Use the CLI
rea setup <path>
rea version
```

## File Structure

```
rea/
├── cli.py                        # Typer app — setup, version (Rich output)
├── templates/
│   └── .claude/
│       ├── skill-writer-patterns.md # Patterns reference for skill-writer (not an agent)
│       ├── agents/               # Agent prompts
│       │   ├── explorer.md       # Read-only codebase research (Haiku)
│       │   ├── implementer.md    # TDD-driven implementation (Sonnet)
│       │   ├── spec-reviewer.md  # Requirement vs. implementation check (Sonnet)
│       │   ├── code-reviewer.md  # Code quality assessment (Sonnet)
│       │   ├── debugger.md       # Root cause debugging (Sonnet)
│       │   ├── plan-reviewer.md  # Adversarial plan review (Sonnet)
│       │   ├── plan-validator.md # Mechanical plan checks — rules, placement, coverage (Sonnet)
│       │   ├── dispatcher.md     # Parallel execution grouping (Sonnet)
│       │   ├── bug-scanner.md    # Logic bugs, edge cases, error handling gaps (Sonnet)
│       │   ├── security-scanner.md # Security vulnerabilities, OWASP top 10 (Sonnet)
│       │   ├── skill-writer.md   # Creates new agents/commands (Sonnet)
│       │   └── rea-router.md     # Session-start skill routing (Haiku)
│       └── commands/             # Slash command prompts (the product)
│           ├── rea-init.md       # Project setup
│           ├── rea-plan.md       # Planning pipeline + adversarial review
│           ├── rea-commit.md     # Commit + push + PR
│           ├── rea-verify.md     # Health check
│           ├── rea-brainstorm.md # Design exploration + spec
│           ├── rea-execute.md    # Parallel agent-driven execution
│           ├── rea-update.md     # Update REA from PyPI + sync templates
│           ├── rea-wrap.md       # Session wrap-up + log + lessons
│           ├── rea-worktree.md   # Git worktree setup
│           └── rea-write-skill.md # Create new agent or command
tests/
docs/
pyproject.toml
core/                            # tool-agnostic shared foundation (principles, craft-checklist, rea-schema) — full CLAUDE.md rewrite deferred to a later phase
package.json                     # readev-tools npm package (bin: readev-tools; files ship src/**, templates/**, core/**, bin/**; test script = node --test --test-concurrency=1 test/*.test.js)
bin/readev-tools.js                 # npx entry — requires src/cli.js
src/                             # redesign npx installer core (CommonJS): cli (setup|verify|migrate + --dry-run), manifest (ownership), place, shims (managed-marker + Gemini merge + CLAUDE_SHIM_PREFIX), prune (deny-list + containment), setup (orchestrator), retired-list, verify (read-only health check), migrate (v0.7.1→redesign bridge orchestrator), settings-surgery (remove dead router hook), legacy-scan (read-only legacy detect), rea-archive (move legacy .rea/ → _archive, never delete; lstat+realpath symlink guards)
test/                            # node:test suites for src/ modules + templates.test.js (host-layout link-resolution + stray-tag checks). Run: node --test --test-concurrency=1 test/*.test.js (serial — some tests swap sibling modules on disk)
templates/                       # redesign-era install artifacts (AGENTS.md + per-tool shims + .rea/ scaffold) the npx installer places into a host project — legacy rea/templates/ (Python-CLI Claude templates) is unchanged
templates/agents/                # redesign-era agent sources (tool-agnostic; Phase-4 installer places them per-tool) — legacy rea/templates/.claude/agents/ tree is unchanged
templates/commands/              # redesign-era command sources (tool-agnostic; Phase-4 installer places them per-tool) — legacy rea/templates/.claude/commands/ tree is unchanged
```

<!-- readev-tools:start -->
@AGENTS.md
<!-- readev-tools:end -->
