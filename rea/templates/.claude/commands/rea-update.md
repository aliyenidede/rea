---
name: rea-update
description: "Update REA to the latest version from PyPI and sync templates to the current project."
---

Update REA from PyPI and sync templates to the current project.

## Step 1 — Update REA package

Run:
```bash
pip install --upgrade rea-dev
```

Check the result. If already up to date, note the current version. If upgraded, note old → new version.

## Step 2 — Show current version

Run: `rea version`

## Step 3 — Sync templates

Run: `rea setup .`

This copies all commands and agents from the installed package to the project's `.claude/` directory.

## Step 4 — Report diff

Run: `git diff --stat .claude/`

Show what changed. If nothing changed, say "Already up to date."

## Step 5 — Summary

```
✅ REA updated: <old-version> → <new-version> (or "already latest")
✅ Synced commands: <count> files
✅ Synced agents: <count> files
   Run /rea-commit when ready to commit.
```
