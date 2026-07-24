# Plan — Faz 4 (part 1): Distribution landing + npx installer core

Strict technical requirements for the `0009-faz4-installer` plan. No code — behaviour only. The plan is
grouped **Pre-flight → 4a → 4b**; within each group units are sized to one commit (1–5 files). The
dependency shape is: pre-flight is independent; 4a's naming/metadata decisions frame 4b; inside 4b the
manifest + placement precede the prune, and the retired-file list is authored before the bridging prune.

---

## Context

- Source content already exists and is audited-clean: `core/` (principles, craft-checklist, rea-schema),
  `templates/AGENTS.md`, `templates/shims/`, `templates/agents/*` (11 agents + `skill-writer` +
  `skill-writer-patterns.md`), `templates/commands/*` (9 commands). The installer's job is to *place*
  this content, not author it.
- The legacy Python path (`rea/cli.py` `rea setup` + `rea/templates/.claude/`) still works and installs
  the old skill set. Phase 4 supersedes it without deleting the fallback.
- The contracts the installer implements are specified in `core/rea-schema.md` ("Shim write semantics",
  "Numbering") and roadmap §4 (Update & delete policy) / §9 (G1, G6b).

---

## Pre-flight — correctness fixes to shipped Faz 2/3 output

### PF-1 — Remove stray `</content>` tags
- Files: `templates/agents/dispatcher.md`, `templates/agents/plan-validator.md`.
- Delete the final line `</content>` from each (it has no matching open tag and would ship into the
  agent's system prompt). No other change.

### PF-2 — rea-execute: outer-gate must run on empty-frontier resume
- File: `templates/commands/rea-execute.md`.
- Step 2 currently routes "frontier empty and nothing blocked" to Step 8 (finish), bypassing Step 6
  (outer full-suite gate). Step 5 routes the same condition to Step 6. On a crash-resume where the last
  batch committed but Step 6 never ran, Step 0 re-verifies units to `done`, so the first Step-2 frontier
  is already empty → ship without the outer gate.
- Change: Step 2's "frontier empty, all done" branch must route to **Step 6** (run the outer gate once
  before finishing), matching Step 5 — unless *no unit executed this run at all* (a genuinely
  already-complete plan), in which case a documented fast-path to Step 8 is allowed. Make the two
  branches intentionally identical for the "work happened" case.

### PF-3 — rea-execute: sanction the outer-gate failure transition
- Files: `templates/commands/rea-execute.md`, `core/rea-schema.md`.
- At Step 6 every unit is already `done`; on outer-gate failure the command demotes to `in-progress`,
  which (a) is not a lifecycle transition the schema lists and (b) is silently reverted by Step 0's
  resume re-verify (a commit exists → back to `done`), masking the failure.
- Change: on outer-gate failure after the retry budget, set the affected unit(s) to **`blocked`** (Step 0
  does not auto-clear `blocked`). Add one line to `core/rea-schema.md`'s "Unit status & computed
  frontier" sanctioning `done → blocked` as an outer-gate-failure regression, and stating the resume
  re-verify must not auto-clear `blocked`.
- Because this adds a new rule to the schema, bump `core/rea-schema.md`'s frontmatter `schema-version`
  `0.1 → 0.2` (a minor, additive bump per the schema's own Versioning policy — the change invalidates
  nothing already on disk). Also update the Versioning section's in-body text ("currently `0.1`") to
  `0.2` so frontmatter and body do not drift.
- While in this file, fix the stale **`GEMINI.md`** reference in "Shim write semantics": the markdown
  managed-marker shims REA writes are **`AGENTS.md` + `CLAUDE.md` only**. REA never reads or writes a
  `GEMINI.md` file. The Gemini shim is `.gemini/settings.json`'s `context.fileName`, which lists both
  `AGENTS.md` (REA's file) and `GEMINI.md` (Gemini's own native file, preserved as a default) so Gemini
  reads REA's instructions alongside any existing `GEMINI.md`. This aligns the schema with what 4b-4
  builds (all under the one 0.2 bump).

### PF-4 — Doc-sync target-state to roadmap
- File: `docs/rea-target-state.md`.
- §9 Deferred: mark "tiered-test tooling for non-Python" and "prompt-level testing/eval strategy" as
  **resolved in 0008** (roadmap §9 already tags them; target-state still lists them open).
- §5: remove the retired `rea-update` from the "Utilities" line.
- §5.1: change "the craft-reference" (singular) → "the `core/` reference trio", matching what the quick
  tier actually ships (see 4b-3 / the AGENTS.md map).

---

## 4a — Distribution landing

### 4a-1 — pyproject metadata fix
- File: `pyproject.toml`.
- `[project.urls]` Homepage/Repository/Issues: `github.com/readevb/rea` → `github.com/aliyenidede/rea`.
- Author block: `readev`/`readevb@gmail.com` → the `aliyenidede` canonical identity.

### 4a-2 — Python CLI → deprecation shim
- Files: `rea/cli.py`, `pyproject.toml`.
- `rea setup` and the bare invocation print a clear deprecation notice: rea-dev is frozen; the maintained
  path is `npx rea-tools setup`. The command still performs its existing copy (does not crash or no-op
  silently) so a mid-transition user is warned, not broken.
- Bump the release version in **`pyproject.toml`** (`version = "0.7.1" → "0.7.2"`) — the sunset marker,
  per CLAUDE.md rule 5. `rea/__init__.py` resolves `__version__` dynamically from the installed package
  metadata, so it is NOT the bump point and is not edited.
- `rea version` unchanged. No network calls, no auto-migration.

### 4a-3 — README distribution rewrite
- File: `README.md`.
- Replace the pip/PyPI install + update sections (the "pip install rea-dev" hook, the `/rea-update`
  reference, the "pip install rea" mermaid node) with the npx flow: `npx rea-tools setup` → open the
  tool → `/rea-init`. Add a one-line note that `rea-dev` on PyPI is a frozen legacy fallback.

### 4a-4 — Docs: success-metric + rollback record (separate-repos confirmed)
- Files: `docs/rea-roadmap.md` (§9), `.rea/decisions/0001-distribution-and-rollback.md` (new ADR).
- **Separate repos:** this repo = `rea-tools`; `rea-cli` is a separate greenfield repo that vendors
  Layer 1 (`core/`) one-way. This is already the locked §9 framing — the session's brief monorepo detour
  is dropped, so §9's product-shape text needs no rewrite, only a one-line confirmation that the
  separate-repo path stands and the repo keeps the name `rea` while publishing the `rea-tools` package.
- Record the **success-metric + rollback plan** (roadmap §9 currently lists it undecided): success =
  dogfood (this repo's next feature runs end-to-end through grill→plan→execute→ship on the installed
  redesign set); rollback = the git tag from 4a-5 + `rea-dev` 0.7.1 still installable. Capture both in
  the ADR.

### 4a-5 — Rollback git tag
- No files (a git operation, recorded in the plan/log).
- Tag the pre-redesign `main` HEAD (the commit before `feature/rea-redesign` diverged) as a named
  rollback point (e.g. `pre-redesign-v0.7.1`). Document the tag name in 4a-4's rollback record.

### 4a-6 — rea-tools npm package scaffold
- Files: `package.json` (repo root), `bin/rea-tools.js` (entry stub).
- `package.json`: name `rea-tools`, `bin: { "rea-tools": "bin/rea-tools.js" }`, `files` including
  `templates/**`, `core/**`, `bin/**`, `README`; `type` + engines as appropriate; no runtime deps beyond
  Node built-ins if avoidable (the installer is file IO + JSON).
- `bin/rea-tools.js`: a **self-contained** shebang entry that prints a static usage/placeholder message
  and exits cleanly — it does NOT `require` `src/cli.js` yet (that module doesn't exist until 4b-1;
  requiring it here would crash this unit's own test). 4b-1 replaces the stub body to wire the dispatcher.
- Verify `npm pack --dry-run` lists `templates/` + `core/` in the tarball (the L4/L5 analogue).

---

## 4b — npx installer core

All 4b modules live under a source dir (e.g. `src/` inside the `rea-tools` package) and are covered by
the JS test suite (4b-9). Each module is pure file/JSON IO — deterministic and unit-testable.

### 4b-1 — CLI dispatcher + target resolution
- Files: `src/cli.js`, `bin/rea-tools.js` (replace the 4a-6 self-contained stub body with a
  `require('../src/cli.js')` + invoke — this is where the entry starts delegating to the dispatcher).
- Parse `argv`: verb (`setup` | `verify`), an optional target path (default cwd), a `--full` flag.
- `setup` calls the setup orchestrator (4b-6); `verify` is a stub that prints "coming in a later
  release" (real impl = 4c). Unknown verb → usage.

### 4b-2 — Ownership manifest module
- Files: `src/manifest.js` + test.
- Read/write a per-project manifest at a fixed `.rea/` path (e.g. `.rea/.rea-manifest.json`): a schema
  `{ version, ownedFiles: [...], shimRegions: [{file, marker}] }`.
- API: load (missing → empty), record an owned path, record a shim region, list owned paths, save.
  Atomic-ish write (temp + rename). No deletion logic here (that's the prune, 4b-5).
- **Path normalization (cross-platform):** every stored path is a **forward-slash relative** path
  (relative to the target root), normalized on write and on compare — never a Windows backslash or
  absolute path. This keeps a Windows-written manifest comparable against the POSIX-style `retired-list.js`
  literals (finding: a backslash manifest silently never matches the retired list).

### 4b-3 — Placement module
- Files: `src/place.js` + test.
- Given source roots (`templates/commands`, `templates/agents`, `core/`, `templates/.rea/`) and a resolved
  host layout for the target tool (Claude: `.claude/commands`, `.claude/agents`, host-root `core/`, host
  `.rea/`), copy each source file to its destination, creating parent dirs.
- **Exclude `skill-writer.md`** from the agents copy (Decision 2); include `skill-writer-patterns.md`
  under `.claude/agents/`.
- Copy the `core/` trio (`principles.md`, `craft-checklist.md`, `rea-schema.md`) to host-root `core/`
  (Decision 3: full trio, not just craft-checklist).
- **Create the `.rea/` typed scaffold** — copy `templates/.rea/{knowledge,decisions,sessions,plans}/README.md`
  into the host `.rea/`, creating the four typed dirs (finding #2: the installer owns `.rea/` creation now
  that `/rea-init` no longer does it). Never overwrite an existing populated dir's contents; only add the
  scaffold README where missing.
- Record every written path in the manifest (via 4b-2). Overwrite REA-owned files idempotently.

### 4b-4 — G6b shim writer
- Files: `src/shims.js` + test.
- `AGENTS.md` / `CLAUDE.md`: write the rea-tools-owned content **inside** `<!-- rea-tools:start -->` …
  `<!-- rea-tools:end -->`.
  - If the file exists **and has markers** → replace only the managed region, preserving everything
    outside it.
  - If the file exists **but has no markers** (a hand-written / legacy-host file) → **append** the managed
    block at the end, preserving all existing content (never rewrite what a human wrote). Both cases honor
    never-blind-overwrite.
  - If absent → create it with the managed block (+ for `CLAUDE.md`, the one-line note above the markers).
  - `AGENTS.md`'s managed block is the fixed always-on content from `templates/AGENTS.md` (Decision 8 —
    installer-owned, since that file is already generic + marker-wrapped). `CLAUDE.md`'s managed body =
    `@AGENTS.md`.
  - **Marker matching tolerates `\r?\n`** (a CRLF-edited file must still match).
- Gemini `settings.json` at **`.gemini/settings.json`**: structured read-modify-write — parse the
  existing JSON (missing → `{}`), ensure `context.fileName` is an array containing `AGENTS.md` **and**
  `GEMINI.md` (matching `templates/shims/gemini-settings.json`: `AGENTS.md` = REA's file, `GEMINI.md` =
  Gemini's own native file preserved as a default), leave every other key untouched, write back with
  stable formatting. **No `GEMINI.md` file is ever read or written by REA** — only this JSON key is
  touched (see PF-3's schema fix).
- **Containment check:** before writing, `path.resolve(target, dest)` must still start with the resolved
  target root; refuse otherwise.
- Record shim files/regions in the manifest.
- **Tests must prove the never-blind-overwrite contract:** (a) user content above/below existing markers
  survives; (b) a markers-absent file gets the block appended with its content intact; (c) an unrelated
  `settings.json` key survives; (d) a second run is idempotent; (e) a CRLF-line-ending `CLAUDE.md` still
  matches and preserves content.

### 4b-5 — G1 prune + retired-file list
- Files: `src/prune.js`, `src/retired-list.js` + test.
- `retired-list.js`: the hard-coded one-time bridge list (host-relative, forward-slash): PRUNE
  `.claude/commands/{rea-brainstorm,rea-commit,rea-update,rea-verify,rea-worktree}.md`,
  `.claude/agents/rea-router.md`, `.claude/skill-writer-patterns.md` (old root location).
- `prune.js`: given the **pre-run** manifest's previously-owned set (the in-memory snapshot 4b-6 captures
  before placement, not the freshly-saved one) and the current template set, delete owned files no longer
  present; on the one-time bridge (legacy files present, no manifest) additionally delete the retired list.
- **Guard (deny-list, independent of the manifest):** never delete a path under the new-schema typed
  memory dirs `.rea/knowledge/`, `.rea/decisions/`, `.rea/sessions/`, `.rea/plans/`, nor the legacy
  `.rea/log/` / `.rea/lessons.md` (for a mid-migration host), nor `CLAUDE.md` / `.claude/settings.json`.
- **Guard (containment):** before any `unlink`, `path.resolve(target, entry)` must resolve inside the
  target root; a path escaping the root (`../…`, absolute) is refused regardless of the deny-list.
- Tests: prunes an owned-but-removed file; leaves an unowned user file; refuses to delete a
  `.rea/knowledge/x.md` and a `.rea/decisions/x.md` even if wrongly listed; refuses a `../escape` path.

### 4b-6 — setup orchestrator + tiers + migration auto-detect
- Files: `src/setup.js` + test.
- Order: resolve host layout → **detect prior install + load the pre-run manifest into memory** (legacy
  command files present ∧ no manifest → the one-time bridge) → placement (4b-3) → shims (4b-4) → **prune
  (4b-5), diffing against the in-memory pre-run manifest snapshot (never a disk re-read)** → **save the
  new manifest (4b-2) LAST**. Saving last is a terminal, all-or-nothing commit: a crash before it leaves
  the *old* manifest on disk, so a retry keeps the correct previously-owned basis and no retired file is
  orphaned. (Prune must run before the new owned-set overwrites the old one, or its diff basis is gone.)
- Tier flag: quick (default) = the mechanical placement + shims + prune + manifest; `--full` = the same
  plus a printed hand-off telling the user to run `/rea-init --full` for GitHub/CI (the installer does
  **not** do GitHub — that stays intelligent, in the command).
- On the bridge path, print the `pip uninstall rea-dev` notice.
- Integration tests: (1) a fixture "legacy host" dir → after `setup`, the new set is placed, the `.rea/`
  scaffold exists, the retired files are gone, a user file + a user CLAUDE.md preamble both survive, the
  manifest lists the owned set; (2) **second-run-after-template-shrink** → run `setup` once, drop a file
  from the template set, re-run `setup` → the now-unowned file is pruned via the manifest diff (exercises
  the real prune→save ordering, not just the one-time bridge).

### 4b-7 — Installer↔rea-init boundary edit
- File: `templates/commands/rea-init.md`.
- Remove the duplication: the command no longer writes shims, creates `.rea/`, or authors the fixed
  always-on `AGENTS.md` marker block (the installer owns placement + shims + `.rea/` scaffold + the
  always-on block — Decision 8). Re-frame Step 0's boundary + Steps 3/4/5 so `/rea-init` is
  intelligent-only: classify the project and author only `AGENTS.md`'s **project-specific** sections
  (description, tech stack, architecture rules, file structure, commands) **outside** the managed
  markers; `--full` still does GitHub/CI.
- **Detect-and-halt (Decision 9):** Step 0 checks for the mechanical layer (`.rea/`, `core/`, the
  manifest); if any is missing, print the "run `npx rea-tools setup` first" message and **stop before
  Step 1** — do not write a half-configured project.

### 4b-8 — Template link-resolution + stray-tag smoke check
- Files: test (part of the 4b-9 suite; listed separately for clarity).
- Assert that every intra-repo relative link inside a *placed* template file resolves at the **host**
  layout (e.g. an agent at `.claude/agents/x.md` referencing `core/…` resolves from host root), not the
  source-tree layout (lesson L301).
- Assert no agent/command body contains a stray unmatched HTML/XML tag (backstops PF-1).

### 4b-9 — JS test runner + CI wiring
- Files: `package.json` (test script + dev dep on a Node test runner, or the built-in `node:test`),
  `.github/workflows/` addition or edit to run the JS tests alongside pytest/ruff during the transition.
- Wire all 4b module tests + 4b-8 checks into `npm test`. Keep `pytest`/`ruff` green (the Python CLI shim
  still exists) — the repo runs both suites during the transition.

---

## Architecture decisions

- The installer is **pure mechanical file/JSON IO** — no project analysis, no content authoring ("CLI is
  dumb, Claude is smart"). All intelligence stays in `/rea-init` and the command prompts.
- **Manifest is the ownership source of truth**; the hard-coded retired list is a *one-time bridge* only
  for hosts that predate the manifest. After the first `setup`, ownership is manifest-driven and the
  retired list is inert.
- **User memory and user-content files are never in scope for deletion** — enforced by an explicit
  deny-list (the new-schema typed dirs `knowledge/decisions/sessions/plans` + legacy `log/`/`lessons.md` +
  `CLAUDE.md`/`settings.json`) **and** a path-containment check (a path must resolve inside the target
  root), not merely by "the manifest doesn't list them".
- **Cross-platform (Windows first-class):** manifest paths are forward-slash relative (normalized on
  write/compare); marker matching tolerates `\r?\n`. The dev machine + many users are win32.
- **No new runtime dependencies** if avoidable — Node built-ins (`fs`, `path`) cover file/JSON IO; a dev
  dep is acceptable only for the test runner if `node:test` is insufficient.

## Decisions table

| # | Decision | Choice | Alternatives rejected | Rationale |
|---|----------|--------|-----------------------|-----------|
| 1 | Mechanical installer verb | `npx rea-tools setup` | `npx rea-tools init` (roadmap D1 literal) | `init` re-creates the `rea init`↔`/rea-init` collision lesson L80/L81 already fixed by renaming the CLI to `rea setup`; mirrors the verb users already know. Surfaced at checkpoint. |
| 2 | `skill-writer` in host install | Excluded | Ship parameterized to host folders | Audit F2: it hard-codes `templates/…` source paths absent in a host; it is a REA-maintainer meta-tool. Stays in-repo for maintainers. Surfaced at checkpoint. |
| 3 | core/ host placement | Full trio at host-root `core/` | Only `craft-checklist.md` (target-state §5.1 literal) | `AGENTS.md`'s map + ~15 agent/command refs point at all three; shipping one dead-links the rest on every install. |
| 4 | Ownership model | Per-project manifest + one-time hard-coded retired list | Retired list every run | Manifest is future-proof; retired list is only needed to bridge pre-manifest hosts (G1). |
| 5 | Prune safety | Deny-list (typed memory dirs + legacy + user-content) **and** path-containment check, independent of manifest | Trust "manifest doesn't own it" | Defense in depth: a manifest bug or a `../escape` entry must not be able to delete `.rea/knowledge/` or a user `CLAUDE.md`. |
| 8 | AGENTS.md always-on block owner | Installer (mechanical marker-write of the fixed `templates/AGENTS.md` block) | `/rea-init` re-authors it each run | The always-on block is generic + already marker-wrapped; re-authoring identical text is wasted work + drift risk. `/rea-init` adds only project-specific sections outside the markers. (Reviewer Decision 1 → Option A.) |
| 9 | `/rea-init` when mechanical layer absent | Detect-and-halt before Step 1 | Warn-and-continue | A file-existence check is cheap and prevents a half-configured project (no `.rea/plans/`, dangling `core/` pointers). (Reviewer Decision 2 → Option A.) |
| 6 | Repo structure | Separate repos: this repo = `rea-tools` at root; `rea-cli` = its own greenfield repo, vendors `core/` one-way | Monorepo (two packages, shared repo-root `core/`) | User decision this session; restores locked roadmap §9. Repo keeps name `rea`; npm package `rea-tools` is name-independent. No `packages/` structure introduced. |
| 7 | Publish/yank | Not performed by the plan | Auto `npm publish` / PyPI yank in a unit | Release is a user-gated manual step (lesson L75: don't upload unasked). |

## Pre-mortem (to be completed at Step 8 against plan-reviewer output)
Placeholder — filled during adversarial review.
