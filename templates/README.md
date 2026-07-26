# templates/

`templates/` holds the redesign-era install-artifacts — `AGENTS.md`, the per-tool shims, the
`.rea/` scaffold, the redesigned agent sources under `agents/`, and the redesigned command sources
under `commands/` — that the future `npx` installer places into a **host project**. These files are
not consumed here; they are the source the installer copies (and merges, for shim files) outward.
See [`agents/README.md`](agents/README.md) and [`commands/README.md`](commands/README.md) for
per-directory details.

This is **distinct** from the legacy [`rea/templates/`](../rea/templates/): that tree is the
Claude-only, PyPI-era template set consumed by the current `rea` CLI, and it stays untouched during
the transition. `templates/` (this directory) is the new, tool-agnostic set for `readev-tools`.
