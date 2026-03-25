---
name: rea-update
description: "Sync REA templates (commands + agents) to the current project without full init."
---

Sync all REA templates to the current project. This is the quick way to pull in template changes without running the full `/rea-init` pipeline.

## Step 1 — Find REA templates

Run: `pip show rea 2>/dev/null | grep Location` to find the installed REA package path.

If not installed, check if `rea/templates/.claude/` exists in the current repo (dev mode).

If neither found, stop: "REA is not installed. Run `pip install -e .` from the REA repo first."

## Step 2 — Sync templates

Copy all files from the REA templates directory to the project:

```bash
# Commands
cp -r <rea-path>/templates/.claude/commands/*.md .claude/commands/

# Agents
cp -r <rea-path>/templates/.claude/agents/*.md .claude/agents/
```

Do NOT overwrite `.claude/settings.json` or any hooks — those are project-specific.

## Step 3 — Report diff

Run: `git diff --stat .claude/`

Show what changed. If nothing changed, say "Already up to date."

## Step 4 — Summary

```
✅ Synced commands: <count> files
✅ Synced agents: <count> files
   Run /rea-commit when ready to commit.
```
