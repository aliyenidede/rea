# templates/

`templates/` holds the redesign-era install-artifacts — `AGENTS.md`, the per-tool shims, the
`.rea/` scaffold, and the redesigned agent sources under `agents/` — that the future `npx` installer
places into a **host project**. These files are
not consumed here; they are the source the installer copies (and merges, for shim files) outward.

This is **distinct** from the legacy [`rea/templates/`](../rea/templates/): that tree is the
Claude-only, PyPI-era template set consumed by the current `rea` CLI, and it stays untouched during
the transition. `templates/` (this directory) is the new, tool-agnostic set for `rea-tools`.

See [`docs/rea-roadmap.md`](../docs/rea-roadmap.md) §4 — Phase 1 (this content is authored) and
Phase 4 (the installer that places it).
