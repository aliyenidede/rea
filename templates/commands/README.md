# templates/commands/

`templates/commands/` holds the redesigned REA command set — the source of truth, authored
tool-agnostic. The Phase-4 `npx` installer places them into each host tool's command folder (e.g.
`.claude/commands/`, oh-my-pi's location, …). Per-tool *format* porting (e.g. Gemini TOML) is
parked — this is a single-format markdown source for now.

Commands carry `name`/`description` frontmatter only (no `model:`).

See [`docs/rea-roadmap.md`](../../docs/rea-roadmap.md) §4 — Phase 3 for context.
