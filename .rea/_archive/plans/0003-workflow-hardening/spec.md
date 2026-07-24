# Spec: Workflow Hardening + Skill-Writer Modernization

## Task Description

Three improvements in one release (v0.7.0):

1. **rea-init hardening** — Warn when project `.claude` paths leak into global `additionalDirectories`. Change branch protection to `enforce_admins: true`.

2. **rea-commit release flow** — Add branch safety (refuse direct push on main/staging). Add staging-to-main promotion flow for releases.

3. **skill-writer modernization** — Update the skill-writer agent to reflect all patterns established since v0.5.0: anti-rationalization tables, confidence scoring, false-positive filtering, escalation rules, hard exclusions, evidence requirements, tool selection matrix, correct model selection, Architecture Rule #6, phased methodology. Also update rea-write-skill command to ask agent complexity type.

## Scope

**In scope:**
- `rea/templates/.claude/commands/rea-init.md` — add additionalDirectories guard + enforce_admins
- `rea/templates/.claude/commands/rea-commit.md` — branch safety + release flow
- `rea/templates/.claude/agents/skill-writer.md` — full rewrite with modern patterns
- `rea/templates/.claude/commands/rea-write-skill.md` — add complexity type question
- `pyproject.toml` + `rea/__init__.py` — version bump to 0.7.0
- `CLAUDE.md` — update version reference if present

**Out of scope:**
- Existing agents (they already have the modern patterns)
- CLI code (`cli.py`) — no changes needed
- New agents or commands (only updating existing ones)
- CI/CD changes

## Key Constraints

- Lesson: prompts >100 lines should split into core + reference files. Skill-writer will exceed this — decision needed on how to split.
- Lesson: Architecture Rule #6 — agents never call agents. Skill-writer must teach this.
- Lesson: self-review is unreliable — skill-writer already teaches this, keep it.
- All changes are template-only except: version bump in `pyproject.toml` and a ~5-line addition to `cli.py` to copy `.claude/` root files (needed for `skill-writer-patterns.md` to be synced by `rea init`).
