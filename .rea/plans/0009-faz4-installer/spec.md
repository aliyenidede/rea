# Spec — Faz 4 (part 1): Distribution landing + npx installer core

## What
The fifth slice of the REA redesign (Phase 4 in [`docs/rea-roadmap.md`](../../../docs/rea-roadmap.md) §4).
Phase 4 ships the **redesigned product** — the `npx` installer that places the tool-agnostic
`templates/` + `core/` content into a host project, with a per-project ownership manifest, G6b shim
writing, and a G1 obsolete-file prune. Phase 4 is split into sub-plans; **this plan covers the critical
path only**:

- **Pre-flight** — small correctness fixes to already-shipped Faz 2/3 output, found by the Phase-4
  readiness audit (independent of the installer; land first).
- **4a — Distribution landing** — the strategic cutover from the Python/PyPI path to `npx`, without a
  hard break: freeze the Python CLI as a deprecation shim, keep `rea-dev` 0.7.1 as an installable
  fallback (= the rollback), fix stale metadata, and scaffold the `rea-tools` npm package.
- **4b — npx installer core** — the mechanical `npx rea-tools <verb>` installer: per-tool file
  placement, ownership manifest, G6b shims (never blind-overwrite), G1 manifest-based prune + the
  one-time hard-coded retired-file list, quick/full tiers (mechanical half), and its own JS test suite.

**Out of this plan (later Phase-4 sub-plans — planned after 4a/4b execute):** 4c `npx rea-tools verify`
(inspects installer output — needs the installer to exist first); 4d the full migration UX (v0.7.1→
redesign transition + public `.rea/` data guidance + CI/hook artifact fate); 4e the non-gating
long-agent trim + `skill-writer` audience follow-through.

## Why
Faz 0–3 shipped the tool-agnostic content (`core/`, `AGENTS.md`, 11 agents, 9 commands) but nothing
places it into a host project yet — the current Python `rea setup` still installs the **legacy** v0.7.1
skill set from `rea/templates/.claude/`. Phase 4 is the phase that actually swaps the shipped product.
4a de-risks the swap (fallback + no hard PyPI break); 4b builds the mechanism the whole redesign has
been authored *for* (the placement/manifest/prune/shim contracts specified in `core/rea-schema.md`).
This plan is the load-bearing critical path: 4c and 4d both depend on the installer 4b builds.

## Scope — in
**Pre-flight:**
- Remove the stray trailing `</content>` line from `templates/agents/dispatcher.md` and
  `templates/agents/plan-validator.md` (ships into the deployed agent system prompt).
- Fix `templates/commands/rea-execute.md`: the "empty frontier, all done" case must route through the
  outer full-suite gate (Step 6) on a crash-resume, not skip to ship; and an outer-gate failure must
  not use an unsanctioned `done → in-progress` demotion that the resume re-verify silently undoes.
- Doc-sync `docs/rea-target-state.md` §9/§5/§5.1 to match roadmap §9 (resolved-in-0008 items; drop the
  retired `rea-update`; the "craft-reference" → "core/ reference trio" correction).

**4a — Distribution landing:**
- `pyproject.toml` — fix `[project.urls]` + author from the old org `readevb` to `aliyenidede`.
- `rea/cli.py` — convert to a thin deprecation shim that prints a "use `npx rea-tools …`" notice and
  still runs (does not crash existing users); keep `rea-dev` 0.7.1 installable on PyPI as the frozen
  fallback (no yank — that is a manual, user-gated action, not part of this plan).
- `README.md` — rewrite the distribution sections (pip → npx) and the workflow references.
- `docs/rea-roadmap.md` §9 + a `.rea/decisions/` ADR — record the **success-metric + rollback** plan
  (dogfood metric; git-tagged pre-redesign HEAD; PyPI 0.7.1 fallback). The **separate-repos** framing is
  already correct in §9 (this repo = `rea-tools`; `rea-cli` is a separate greenfield repo that vendors
  Layer 1 / `core/` one-way) — the session's brief monorepo detour is dropped, so §9 needs no rewrite
  there, only a one-line confirmation.
- Git-tag the pre-redesign `main` HEAD as the named rollback point.
- Scaffold the `rea-tools` npm package: a root `package.json` (name `rea-tools`, `bin`, `files`
  including `templates/**` + `core/**`) + a `bin/` entry stub. This repo publishes the single `rea-tools`
  package at its root; `rea-cli` lives in its own repo and is out of scope here.

**4b — npx installer core:**
- The installer CLI: `npx rea-tools <verb>` dispatching a mechanical `setup` verb (+ a `verify` stub
  reserved for 4c); target-dir resolution; a quick/full tier flag (the mechanical half — GitHub/CI stays
  in `/rea-init` full tier).
- **Placement** — copy `templates/commands/*` and `templates/agents/*` (excluding `skill-writer` per
  the audit — see Decisions), the `core/` trio, and the `.rea/` typed scaffold
  (`templates/.rea/{knowledge,decisions,sessions,plans}/README.md`) into the host tool's folders
  (`.claude/commands`, `.claude/agents`, host-root `core/`, host `.rea/`), recording every written path
  in the manifest. Creating the `.rea/` typed dirs is the installer's job (removed from `/rea-init`).
- **Ownership manifest** — a per-project `.rea/`-stored JSON of REA-owned files (and shim byte-regions),
  written every run; the source of truth for safe pruning.
- **G6b shim writing** — `CLAUDE.md` managed-marker block-replace; `AGENTS.md` managed-marker;
  Gemini `settings.json` structured field-merge. Never blind-overwrite; preserve all user content.
- **G1 prune + retired-file list** — prune previously-owned files no longer in the template set; a
  one-time hard-coded retired-file list bridges the v0.7.1→redesign jump (no prior manifest). The prune
  never walks user-memory paths — the new-schema typed dirs `.rea/knowledge/`, `.rea/decisions/`,
  `.rea/sessions/`, `.rea/plans/` (the dirs every host's memory actually lives in) **plus** this repo's
  legacy `.rea/log/` + `.rea/lessons.md` (for a host mid-migration) — nor user-content files (`CLAUDE.md`,
  `.claude/settings.json`). Every write/delete is also containment-checked: a path must resolve *inside*
  the target project root or it is refused (guards a corrupt manifest entry like `../../elsewhere`).
- **Migration auto-detect (minimal, for this plan)** — on a host with legacy command files present and
  no manifest, run the retired-file prune and print a "`pip uninstall rea-dev`" notice. (The full
  migration UX — settings.json rea-router-hook surgery, CLAUDE.md content rescue, `.rea/log`+`lessons.md`
  archive — is 4d; 4b lays only the prune/manifest/shim mechanics 4d builds on.)
- **Installer↔`/rea-init` boundary** — edit `templates/commands/rea-init.md` so it no longer duplicates
  shim-writing and `.rea/` creation (the installer owns those); `/rea-init` becomes intelligent-only and
  points the user to run the installer first.
- **JS test suite** — deterministic tests for placement, manifest, G6b marker/JSON merge (the
  never-blind-overwrite contract), G1 prune (owned-only), plus a template-link-resolution check (links
  resolve at the *host* layout, not the source tree) and a stray-tag smoke check.

## Scope — out
- 4c `rea verify`, 4d full migration UX, 4e trim — separate later sub-plans.
- Actually publishing to npm or yanking/deprecating on PyPI — user-gated manual release steps, never run
  by a plan (lesson: don't `upload` unasked).
- Per-tool command/agent *format* porting (Gemini TOML, Codex TOML) — parked (roadmap §6); the installer
  is first-class for the markdown tools (Claude Code now; oh-my-pi placement is a thin follow-on).
- Touching the legacy `rea/templates/.claude/` tree contents (it stays as the frozen fallback's payload).

## Constraints
- **Never blind-overwrite (G6b):** every shim + user-content write is a managed-marker block-replace or a
  structured JSON field-merge; the installer preserves all bytes it does not own.
- **Prune only what REA owns (G1):** the prune is driven by the manifest (or, for the one-time bridge,
  the hard-coded retired list) and must never touch user memory or user-content files.
- **Idempotent:** re-running `setup` re-syncs safely (REA-owned files overwritten; user content
  preserved).
- **Cross-platform (Windows first-class):** the dev machine + many users are on win32. The manifest
  stores **forward-slash relative** paths (normalized on write and on compare); marker matching tolerates
  `\r?\n` (a CRLF-edited `CLAUDE.md`/`AGENTS.md` must not break the never-blind-overwrite guarantee); no
  backslash literal is compared against a POSIX-style retired-list entry.
- **Cross-tool honesty:** placement is first-class for Claude Code here; the source content is
  tool-agnostic and the installer is structured so oh-my-pi/other markdown-tool placement is an additive
  follow-on, not a rewrite.
- **Follows `core/rea-schema.md`** (schema-version 0.1) for the manifest + shim-write + retired-file
  contracts.

## Bootstrap note
Planned and executed with the **current (v0.7.1) commands** and the old plan/todo format (`NEXT:`
markers, `[ ]`/`[x]` items), exactly as 0005–0008 did — the redesigned pipeline lives in `templates/`
but is not installed in this repo. **Unlike 0005–0008 (pure markdown content), this plan is the first
redesign phase that produces real executable code (a JS installer + tests)** — so its `implementer`
units use genuine TDD (JS test runner), while its doc/content units (README, roadmap, the two
command/agent edits) stay content-authoring with pytest/ruff as a repo safety net only.

## Decisions (surfaced at the planning checkpoint — see plan.md Decisions table)
1. **Mechanical installer verb = `setup`** (`npx rea-tools setup`), not `init`, to avoid re-creating the
   `rea init`↔`/rea-init` collision that lesson L80/L81 already fixed once (CLI renamed to `rea setup`).
   Overrides roadmap D1's literal `npx rea-tools init` wording.
2. **`skill-writer` excluded from the host install set** — it is a REA-maintainer meta-tool that
   hard-codes `templates/…` source paths that do not exist in a host project (audit finding). It stays
   in the repo for maintainers; it is not placed into host `.claude/agents/`.

## Assumptions (decided silently — object to change)
- **Separate repos (user decision this session):** `rea-cli` is a separate greenfield repo (restores the
  locked roadmap §9 framing); this repo is `rea-tools` and publishes the single `rea-tools` npm package
  at its root. The repo keeps the name `rea` (npm package name `rea-tools` is independent of the repo
  name); no `packages/`/monorepo structure is introduced.
- **First-class host = Claude Code** (`.claude/`) + the Gemini `settings.json` shim. oh-my-pi/OpenCode/
  Codex/Cursor placement is an additive follow-on, not in this plan.
- **npm package `files`** must explicitly include `templates/**` and `core/**` (dotted/asset dirs are not
  picked up by default — cf. lesson L4/L5 for the Python analogue).
