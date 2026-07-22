# shims/

Per-tool shims that point an AI coding tool at [`AGENTS.md`](../AGENTS.md) — the single,
tool-agnostic behaviour + memory file. A shim exists only for tools that don't already read
`AGENTS.md` on their own; tools that read it natively need nothing here.

## Needs a shim

| Shim file | Target tool |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Claude Code |
| [`gemini-settings.json`](gemini-settings.json) | Gemini CLI |

## Reads `AGENTS.md` natively (no shim)

Codex, OpenCode, Cursor, and oh-my-pi (via config-inheritance) all read `AGENTS.md` directly — no
shim file is placed for them.

## Write rule (G6b — never blind-overwrite)

A shim file may hold user content `rea-tools` never wrote; overwriting the whole file would destroy
it. Two write strategies, one per format:

- **Markdown shims** (`CLAUDE.md`) are written inside managed markers
  (`<!-- rea-tools:start --> … <!-- rea-tools:end -->`) — a re-init or update replaces only the
  region between the markers, never anything outside it.
- **JSON shims** (`gemini-settings.json`) use a structured read-modify-write merge — read the
  existing file, add or update only the keys `rea-tools` requires, and leave every other key as
  found. There is no marker equivalent for JSON; the merge is field-by-field.

See [`core/rea-schema.md`](../../core/rea-schema.md) — "Shim write semantics" — for the full
contract this README summarizes.
