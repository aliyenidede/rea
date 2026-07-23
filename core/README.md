# core/

`core/` is the shared, tool-agnostic foundation used by **both** `readev-tools` and `rea-cli` — one
source of truth so the two products never drift.

## Why

Both products deliver the same methodology:
- **readev-tools** — the methodology delivered *into* a host (VS Code, Claude Code, Codex, …).
- **rea-cli** — the same methodology as its own standalone coding-agent CLI.

If the foundation were written twice, it would drift. `core/` is written once, here, and both
products read from it. `rea-cli` vendors `core/` as a clean one-way dependency — it consumes this
content, it never forks or edits its own copy.

## Files

- **[`principles.md`](./principles.md)** — the 12 principles (A–L): the methodology rules both
  products enforce, as pure tool-agnostic principle statements.
- **[`craft-checklist.md`](./craft-checklist.md)** — the short code-quality checklist review agents
  cite; each item carries a stable tag id (`CC-01`, `CC-02`, …) so a review finding can point at
  exactly which item it maps to.
- **[`rea-schema.md`](./rea-schema.md)** — the `.rea/` format spec: directory layout, per-note-type
  naming/collision rules, `plan.md`/`todo.md` format, unit status + frontier, numbering, and the
  shim write contract.

## Not yet

Packaging (an npm publishing wrapper) and version pinning for consumers land in a later phase, once
`rea-cli` actually vendors `core/`. For now this is plain content in a plain folder — no
`package.json`, no package scope, no install story.
