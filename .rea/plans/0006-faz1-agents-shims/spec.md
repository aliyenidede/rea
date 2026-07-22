# Spec — Faz 1: AGENTS.md + shims + `.rea/` structure

## What
The second slice of the REA redesign (Phase 1 in [`docs/rea-roadmap.md`](../../../docs/rea-roadmap.md) §4).
Author the **behaviour side** of cross-platform REA as tool-agnostic **template source files**, ready
for the future npx installer (Phase 4) to place into any host project. **Content only — no installer
logic, no Python CLI changes.**

Three deliverables, all under a new top-level `templates/` directory:
- **`templates/AGENTS.md`** — the thin, always-on instruction file every major AI tool reads:
  behaviour steering (the `talk` default) + the `capture` memory reflex + a read-pull rule + a map of
  pointers into `core/` and `.rea/`.
- **per-tool shims** — `templates/shims/CLAUDE.md` (`@AGENTS.md` inside managed markers) and
  `templates/shims/gemini-settings.json` (the `settings.json` key that points Gemini CLI at `AGENTS.md`).
- **the `.rea/` typed scaffold** — `templates/.rea/{knowledge,decisions,sessions,plans}/` with a short
  README per directory: the on-disk skeleton defined by `core/rea-schema.md`.

## Why
Faz 0 shipped the tool-agnostic *content* (`core/`: principles, craft-checklist, schema). Faz 1 ships
the *behaviour + memory structure* that makes that content operate inside any host: one `AGENTS.md` +
two tiny shims cover every major tool (Claude Code / Codex / Cursor / Gemini / oh-my-pi), and the
`.rea/` scaffold is the durable cross-tool memory. This is the "behaviour side of cross-platform"
(roadmap §4 Phase 1). It carries **G4** (capture = pure `AGENTS.md` reflex, no hooks) and the **§4
memory-write filter**.

## Scope — in
- `templates/AGENTS.md` (tool-agnostic; managed-marker wrapped)
- `templates/shims/CLAUDE.md`, `templates/shims/gemini-settings.json`, `templates/shims/README.md`
- `templates/.rea/{knowledge,decisions,sessions,plans}/README.md` (scaffold + self-doc)
- `templates/README.md` (what the dir is, who places it)
- doc-sync: pointer in repo `README.md` + project `CLAUDE.md`; flip roadmap Phase 1 status

## Scope — out (later phases)
- the npx installer itself: init / prune / manifest / marker-merge write logic (Phase 4)
- wiring `AGENTS.md` into `rea-init`, or emitting these files from any CLI (Phase 4)
- the commands and agents that consume this behaviour (Phase 2 / 3)
- migrating this repo's own old-format `.rea/` (Phase 5)
- touching the Python CLI or the legacy `rea/templates/` tree (stays working during the transition)

## Constraints
- **Tool-agnostic `AGENTS.md`:** zero host-tool names in the body — no "Claude", no `.claude/`, no
  `/rea-*` command names. It is read by Claude Code, Codex, Cursor, Gemini, and oh-my-pi alike.
- **No hooks (G4):** capture is a pure `AGENTS.md` reflex + the write-filter rule; deliberately no hook
  enforcement.
- **Writes only to `.rea/`:** `AGENTS.md` instructs memory writes to `.rea/` only — never a tool's
  native memory or `CLAUDE.md`.
- **Never blind-overwrite (G6b):** shim templates carry managed markers
  (`<!-- rea-tools:start … end -->`); the JSON shim is a structured-merge payload. The *write logic* is
  Phase 4; Faz 1 defines the shim *shape*.
- Follows `core/rea-schema.md` (schema-version 0.1) for the `.rea/` layout + shim contract, and
  `docs/rea-target-state.md` §4, §5.1, §9 (G4 / G6b) for behaviour.

## Placement contract for Phase 4 (provisional assumption)
`AGENTS.md`'s pointer map references the `core/` files by a **host-project-root-relative** path
(`core/principles.md`, `core/craft-checklist.md`, `core/rea-schema.md`). This only resolves if the
Phase-4 installer places those files at that path in every host project. Target-state §5.1 confirms only
"the craft-reference" ships in the quick tier; the full `core/` trio shipping locally is a **Phase-1
assumption that Phase 4 must honour** (consistent with §5's "knowledge store pulled on demand:
principles.md, the craft reference, and `.rea/`" — all read from disk). **Flagged provisional:**
revisit when Phase 4 is detailed. If Phase 4 decides some `core/` files stay as remote references
instead of local files, `AGENTS.md`'s map needs a one-line follow-up edit — the assumption is recorded
here so that edit is visible, not silent.

## Gemini shim shape (already settled — do not re-derive)
The Gemini `settings.json` payload is **not** an open question: `docs/researches/cross-cli-instruction-command-discovery.md`
(the source folded into the roadmap) and roadmap §4 already fix it as the nested key `context.fileName`
holding an **array**: `{"context": {"fileName": ["AGENTS.md", "GEMINI.md"]}}`. Faz 1 ships that shape; the
only re-verify is whether that research doc has gone stale (it is flagged fast-moving), not the key name.

## Bootstrap note
Planned and executed with the **current (v0.7.1) commands** — `rea-grill` and the new pipeline don't
exist yet (Phase 3), so this plan uses the old plan/todo format (`NEXT:` markers, `[ ]`/`[x]` items),
exactly as Faz 0 (`0005-faz0-core`) did. The **new** `.rea/` schema (`core/rea-schema.md`) is what this
phase *scaffolds*, not what it writes its own plan in.
