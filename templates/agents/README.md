# templates/agents/

`templates/agents/` holds the redesigned REA sub-agent building blocks — the source of truth,
authored tool-agnostic. The Phase-4 `npx` installer places them into each host tool's agent folder
(e.g. Claude Code's agent folder, oh-my-pi's location, …). Per-tool *format* porting (e.g. Codex
TOML) is parked — this is a single-format markdown source for now.

Models: `explorer` runs on haiku; every other agent runs on sonnet.

See [`docs/rea-roadmap.md`](../../docs/rea-roadmap.md) §4 — Phase 2 for context.
