# Plan — Faz 1: AGENTS.md + shims + `.rea/` structure

## Context
Phase 1 of the REA redesign. Author the behaviour + memory-structure layer as tool-agnostic template
source under a new top-level `templates/` directory. The future npx installer (Phase 4) will place
these into a host project; **Faz 1 only authors the source files** — no installer logic, no Python CLI
changes. Precedent: Faz 0 (`0005-faz0-core`) shipped `core/` the same way (content only, old tooling,
Python untouched).

## Placement model (the one architectural decision)
Two source homes exist after this phase, split by role:
- **`core/`** — the pure shared foundation vendored by rea-cli (principles, craft-checklist, schema).
  Faz 0.
- **`templates/`** (new) — the artifacts the installer *places into a host project*: `AGENTS.md`, the
  shims, and the `.rea/` scaffold. Faz 1.

Rationale: keeps install-artifacts out of the repo root (which already holds this repo's own `CLAUDE.md`
and old-format `.rea/`, both of which a root-level write would clobber), and keeps them separate from
the legacy Claude-only `rea/templates/` Python tree.

**Pointer-resolution contract (provisional — see spec.md):** `AGENTS.md`'s map references `core/` files
by a host-project-root-relative path. Target-state §5.1 confirms only "the craft-reference" is generated
into the quick tier; it does **not** state that `principles.md` and `rea-schema.md` ship locally. So the
map's `core/principles.md` and `core/rea-schema.md` pointers rest on a **Phase-1 assumption that Phase 4
must honour** — the installer vendors the full `core/` trio into every host project at `core/`. This is
recorded as a provisional assumption (spec.md "Placement contract for Phase 4"), not asserted as
already-settled; revisit when Phase 4 is detailed.

## Files to create

### `templates/README.md`
- One paragraph: `templates/` holds the redesign-era files the future npx installer places into a host
  project (`AGENTS.md`, per-tool shims, the `.rea/` scaffold).
- State it is **distinct** from the legacy `rea/templates/` (Claude-only, PyPI-era, untouched during
  the transition); pointer to roadmap §4 Phase 1 + Phase 4.

### `templates/AGENTS.md`  ← the core deliverable
Thin, always-on, **tool-agnostic**. All content wrapped in managed markers
`<!-- rea-tools:start --> … <!-- rea-tools:end -->` (the G6b shape). Four sections:
1. **Behaviour (the `talk` default stance):** a thinking engineer + curious researcher;
   **anti-sycophantic** — disagrees when warranted, no flattery, grounds claims in evidence; asks before
   assuming. Behaviour is *steered*; a role is **not** assigned. (target-state §5, §6)
2. **`capture` — the memory reflex:** on any of three triggers — (1) a user correction / a lesson,
   (2) a non-obvious decision, (3) a bug root-cause — write a small note to `.rea/` using the formats in
   `core/rea-schema.md`. **Memory-write filter (one line):** record durable project/domain knowledge &
   decisions, **not** the tool's own operational mistakes — test: "would this be true and useful if a
   *different* tool opened the project?" Writes go **only to `.rea/`**, never native memory or a shim.
   Knowledge notes update-in-place with the schema's collision guard. **No hooks** — behaviour reflex
   only (G4).
3. **Read = pull:** read the relevant `.rea/` notes on demand and follow their `[[links]]`; never
   auto-dump the whole store — keep context lean (smart-zone discipline; cf. Principle H).
4. **Map of pointers:** principles → `core/principles.md`; craft checklist → `core/craft-checklist.md`;
   `.rea/` format → `core/rea-schema.md`; memory → `.rea/`.

### `templates/shims/CLAUDE.md`
- A managed-marker block whose managed region is a single import line: `@AGENTS.md` — so a Claude-class
  host reads `AGENTS.md` as its context. Content outside the markers (if a target already has a
  `CLAUDE.md`) is preserved by the Phase-4 installer; the template defines the managed region only.

### `templates/shims/gemini-settings.json`
- The minimal `settings.json` fragment that points Gemini CLI at `AGENTS.md`. The shape is **already
  settled** (roadmap §4 + `docs/researches/cross-cli-instruction-command-discovery.md`): the nested key
  `context.fileName` holding an **array** — `{"context": {"fileName": ["AGENTS.md", "GEMINI.md"]}}`. Ship
  exactly that shape (keeping `GEMINI.md` in the array preserves Gemini's own default file as a
  fallback). This fragment is the "add one key, keep the rest" payload for G6b's JSON read-modify-write
  merge. The only re-verify is whether that research doc has gone stale (flagged fast-moving) — **not**
  the key name, which is fixed.

### `templates/shims/README.md`
- The shim contract: which tool each shim targets — **needs a shim:** `CLAUDE.md` → Claude Code;
  `gemini-settings.json` → Gemini CLI. **Reads `AGENTS.md` natively (no shim):** Codex, OpenCode, Cursor,
  and oh-my-pi (via config-inheritance). The G6b never-blind-overwrite rule (markdown → managed markers;
  JSON → structured merge). Pointer to `core/rea-schema.md` "Shim write semantics".

### `templates/.rea/knowledge/README.md`, `.../decisions/README.md`, `.../sessions/README.md`, `.../plans/README.md`
- Four short READMEs (2–4 lines each): what the dir holds + its naming rule (knowledge = entity-name,
  update-in-place; decisions = `NNNN-slug`, append-only; sessions = `YYYY-MM-DD-HHMM-slug`; plans =
  `NNNN-slug/` dirs) + a pointer to `core/rea-schema.md`. They document the scaffold **and** keep the
  otherwise-empty dirs tracked in git.

## Files to modify (doc-sync)

### `README.md` (repo)
- A short note (near the existing `core/` note) that `templates/` holds the Phase-1 `AGENTS.md` + shims
  + `.rea/` scaffold; pointer to roadmap §4.

### `CLAUDE.md` (project)
- A line under **File Structure** for the new top-level `templates/` (redesign-era install artifacts);
  note the legacy `rea/templates/` is unchanged.

### `docs/rea-roadmap.md`
- Flip **Phase 1** status `⬜ → ✅` (done) at execute completion, with a pointer to
  `.rea/plans/0006-faz1-agents-shims/`. (During *planning* it moves `⬜ → 🔵`; this todo unit closes it
  to `✅`.)

## Decisions table
| # | Decision | Choice | Alternatives Rejected | Rationale |
|---|----------|--------|-----------------------|-----------|
| 1 | Home for install-artifacts | new top-level `templates/` | repo root (clobbers own `CLAUDE.md`/`.rea/`); `core/` (that's the vendored foundation, not install-artifacts); legacy `rea/templates/` (Claude-only, PyPI-era) | keeps sources out of the working root, separate from the legacy tree, mirrors Faz 0's `core/` split; user pre-approved a dedicated template dir |
| 2 | Managed markers in the source now | include markers in the shim + `AGENTS.md` templates | defer markers to the Phase-4 installer | makes G6b concrete + copy-ready; markers are the shim's *shape*, not runtime logic; forward-compatible with the Phase-4 marker-merge |
| 3 | `.rea/` scaffold form | one short README per subdir | top-level README + `.gitkeep`; bare `.gitkeep` | self-documents each dir in place, renders in Obsidian, keeps dirs tracked without a separate keeper file |
| 4 | Plan/todo format for *this* plan | old (`NEXT:` markers) | new schema U-units (`core/rea-schema.md`) | the executing `/rea-execute` is still the old one (Phase 3 rewrites it); Faz 0 did the same; the new schema is what we *scaffold*, not what we plan in |
| 5 | Gemini `settings.json` shape | pinned nested array `{"context": {"fileName": ["AGENTS.md", "GEMINI.md"]}}` | flat `{"contextFileName": "AGENTS.md"}` (Gemini CLI does not read it); leaving it "verify at authoring time" | already verified in `docs/researches/cross-cli-instruction-command-discovery.md` + roadmap §4; treating a settled fact as open risked shipping the one Gemini deliverable in a non-working shape |
| 6 | `core/` pointer targets from host `AGENTS.md` | project-root `core/` path, backed by a provisional Phase-4 placement contract | placement-agnostic map (less useful, vaguer); assert-as-already-settled (silent dead-link risk) | an openly-flagged assumption (spec.md) beats a silently wrong pointer on every fresh install; Phase 4 honours or amends it |

## Non-goals (guardrails against scope creep)
- No installer, manifest, prune, or marker-merge *logic* (all Phase 4).
- No changes to the Python CLI, `rea/templates/`, or existing agents/commands.
- No migration of this repo's own `.rea/` (Phase 5).
- `AGENTS.md` carries **no** command-specific or host-tool-specific detail.
