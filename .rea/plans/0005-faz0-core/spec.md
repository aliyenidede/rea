# Spec — Faz 0: rea-tools shared foundation (`core/`)

## What
The first slice of the REA redesign: author the tool-agnostic shared foundation that **both
rea-tools and rea-cli** use — a single source of truth so the two products never drift. **Content
only.**

Three foundation files (+ a README), living in a top-level `core/` folder:
- the **12 principles** (methodology rules)
- a **craft-checklist** (code-quality checklist the review agents cite)
- the **`.rea/` format spec** (how plan / todo / memory files are written)

## Why
Both products deliver the same methodology. If the foundation is written twice, it drifts. One
shared, versioned source → rea-cli reuses it instead of copying → no divergence. (Design:
`docs/rea-target-state.md` §8 item 0 + §9.)

## Scope — in
- `core/principles.md`, `core/craft-checklist.md`, `core/rea-schema.md`, `core/README.md`
- a `schema-version: 0.1` stamp inside `rea-schema.md`
- doc-sync: a pointer note in the repo `README.md` and `CLAUDE.md` to `core/`

## Scope — out (later phases)
- npm `package.json` / publishing name (added when rea-cli actually vendors `core/`)
- the npx installer (init / prune / shim placement)
- `AGENTS.md` content, per-tool shims, the commands/agents
- migrating this repo's own old `.rea/`
- touching the Python CLI (stays working during the transition)

## Constraints
- **Tool-agnostic:** zero Claude-specifics in these files (rea-cli / oh-my-pi reads the same).
- **Markdown, not JSON Schema** (per §9/G2 — agents read markdown; regex-checkable).
- Follows the closed decisions in `docs/rea-target-state.md` §9 (G2/G3/G5/G6, §4).
