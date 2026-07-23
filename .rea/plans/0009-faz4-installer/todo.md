# Todo — Faz 4 (part 1): Distribution landing + npx installer core

Old-format (`NEXT:` markers, `[ ]`/`[x]`), one commit per item (1–5 files). Order: Pre-flight →
4a → 4b. Pre-flight units are independent and may run in parallel; 4a frames 4b; inside 4b the
manifest (4b-2) + placement (4b-3) precede the prune (4b-5), and the retired-file list is authored
before the bridging prune. The orchestrator (4b-6) wires the modules; the boundary edit (4b-7) is
independent content.

## Pre-flight

- [x] PF-1 — Remove stray `</content>` tags
      Files: `templates/agents/dispatcher.md`, `templates/agents/plan-validator.md`
      1. Delete the final line `</content>` from each file (no matching open tag; ships into the agent
         system prompt).
      2. Change nothing else.
      Test: `grep -rn "</content>" templates/` returns no matches.

- [x] PF-2 — rea-execute: run the outer gate on empty-frontier resume
      File: `templates/commands/rea-execute.md`
      1. In Step 2, change the "frontier empty and nothing blocked" branch so it routes to **Step 6**
         (outer full-suite gate) when any unit executed this run, matching Step 5 — not straight to
         Step 8.
      2. Preserve a documented fast-path to Step 8 ONLY for the genuinely-already-complete case (no unit
         executed this run); state the condition explicitly so the two branches differ on purpose.
      Test: the file's Step 2 empty-frontier branch references Step 6 (not "skip ahead to Step 8") for
      the work-happened case; the fast-path is explicitly conditioned on "no unit executed this run".

- [x] PF-3 — rea-execute: sanction the outer-gate-failure transition
      Files: `templates/commands/rea-execute.md`, `core/rea-schema.md`
      1. Step 6: on outer-gate failure after the retry budget, set affected unit(s) to `blocked` (not
         `in-progress`), because Step 0's resume re-verify does not auto-clear `blocked`.
      2. `core/rea-schema.md` "Unit status & computed frontier": add one line sanctioning `done → blocked`
         as an outer-gate-failure regression, and stating the resume re-verify must NOT auto-clear
         `blocked`.
      3. Bump `core/rea-schema.md` frontmatter `schema-version` `0.1 → 0.2` (minor/additive per the doc's
         own Versioning policy) AND update the Versioning section's in-body "currently `0.1`" text to `0.2`.
      4. Fix the stale `GEMINI.md` reference in "Shim write semantics": REA writes markdown managed-marker
         shims only for `AGENTS.md` + `CLAUDE.md`; the Gemini shim is `.gemini/settings.json` pointing at
         `AGENTS.md` (no `GEMINI.md` file is created). Aligns the schema with what 4b-4 builds.
      Test: rea-execute Step 6 sets `blocked` on failure; rea-schema lists `done → blocked` as a
      sanctioned regression and the re-verify exclusion for `blocked`; both the `schema-version`
      frontmatter and the Versioning body text read `0.2`; the shim-semantics section no longer implies a
      `GEMINI.md` file is written.

- [x] PF-4 — Doc-sync target-state → roadmap
      File: `docs/rea-target-state.md`
      1. §9 Deferred: mark "tiered-test tooling for non-Python" and "prompt-level testing/eval strategy"
         resolved-in-0008 (match roadmap §9).
      2. §5: remove `rea-update` from the Utilities line.
      3. §5.1: "the craft-reference" → "the `core/` reference trio".
      Test: none of the three stale statements remain; §9 marks both items resolved; §5 has no
      `rea-update`; §5.1 says "trio".

## 4a — Distribution landing

- [x] 4a-1 — pyproject metadata fix
      File: `pyproject.toml`
      1. `[project.urls]` Homepage/Repository/Issues: `readevb` → `aliyenidede`.
      2. Author block → the `aliyenidede` canonical identity.
      Test: no `readevb` remains in `pyproject.toml`; urls point at `github.com/aliyenidede/rea`.

- [x] 4a-2 — Python CLI → deprecation shim
      Files: `rea/cli.py`, `pyproject.toml`
      1. `rea setup` and the bare invocation print a deprecation notice (rea-dev frozen; use
         `npx rea-tools setup`) then still perform the existing copy (do not crash / no-op silently).
      2. Bump `version` in `pyproject.toml` (`0.7.1 → 0.7.2`) — the sunset marker (rule 5). Do NOT edit
         `rea/__init__.py`; it resolves `__version__` dynamically from package metadata.
      3. `rea version` unchanged; no network calls.
      Test: `pytest tests/test_cli.py` passes (adjust the test to assert the notice prints and the copy
      still happens); the shim never raises on a normal `rea setup .`; `pyproject.toml` version = 0.7.2.

- [x] 4a-3 — README distribution rewrite
      File: `README.md`
      1. Replace pip install / `/rea-update` / "pip install rea" sections with the npx flow:
         `npx rea-tools setup` → open the tool → `/rea-init`.
      2. Add a one-line note: `rea-dev` on PyPI is a frozen legacy fallback.
      Test: `grep -in "pip install rea" README.md` returns only the frozen-fallback note; the npx flow is
      present.

- [x] 4a-4 — Docs: success-metric + rollback record (separate-repos confirmed)
      Files: `docs/rea-roadmap.md`, `.rea/decisions/0001-distribution-and-rollback.md` (new ADR)
      1. Roadmap §9: add a one-line confirmation that the separate-repos path stands (this repo =
         `rea-tools`; `rea-cli` = separate greenfield repo vendoring `core/`; repo keeps name `rea`,
         publishes the `rea-tools` package). Do NOT rewrite §9's product-shape — it already says this.
      2. Record the success-metric + rollback plan (dogfood metric; git tag from 4a-5; PyPI 0.7.1
         fallback) in roadmap §9 and the new ADR.
      Test: roadmap §9 confirms separate-repos + names the repo/package split; the ADR exists and names
      the rollback mechanism; §9's "success metric + rollback" is no longer marked undecided.

- [x] 4a-5 — Rollback git tag (tag created locally; push held for user confirmation)
      Files: none (git op; record in 4a-4's ADR)
      1. Identify the pre-redesign `main` HEAD (commit before `feature/rea-redesign` diverged).
      2. Create an annotated tag `pre-redesign-v0.7.1` on it; push the tag.
      Test: `git tag --list "pre-redesign-*"` shows the tag; the ADR names it.

- [x] 4a-6 — rea-tools npm package scaffold
      Files: `package.json`, `bin/rea-tools.js`
      1. `package.json`: name `rea-tools`, `bin: {"rea-tools": "bin/rea-tools.js"}`, `files`
         including `templates/**`, `core/**`, `bin/**`, `README*`; set `engines.node`; avoid runtime deps.
      2. `bin/rea-tools.js`: SELF-CONTAINED shebang entry that prints a static usage/placeholder message
         and exits cleanly — does NOT `require('../src/cli.js')` (that module lands in 4b-1; requiring it
         now would crash this unit's test).
      Test: `npm pack --dry-run` lists `templates/` + `core/` files; `node bin/rea-tools.js` runs without
      crashing (prints the static usage stub).

## 4b — npx installer core

- [x] 4b-1 — CLI dispatcher + target resolution
      Files: `src/cli.js`, `bin/rea-tools.js`
      RED: test that `cli(["setup", "/tmp/x"])` resolves verb=setup, target=/tmp/x; `cli(["verify"])`
      hits the stub; unknown verb prints usage and exits non-zero.
      GREEN: minimal argv parse (verb | target | `--full`); dispatch `setup`→orchestrator (stub until
      4b-6), `verify`→"coming later". Replace the 4a-6 self-contained stub body in `bin/rea-tools.js`
      with `require('../src/cli.js')` + invoke.
      REFACTOR: keep dispatch table small.
      Commit: one RED-GREEN cycle.
      Test: the three dispatch cases above pass; `node bin/rea-tools.js setup .` reaches the dispatcher.

- [x] 4b-2 — Ownership manifest module
      Files: `src/manifest.js`, `test/manifest.test.js`
      RED: test load-missing → empty manifest; record owned path + shim region; save then reload
      round-trips; write is atomic (temp+rename); a path recorded with backslashes is stored
      forward-slash and compares equal to its POSIX form (cross-platform normalization).
      GREEN: `{version, ownedFiles[], shimRegions[]}` with load/record/list/save; JSON pretty-write;
      normalize every stored path to forward-slash relative on write + compare.
      REFACTOR: single fixed `.rea/.rea-manifest.json` path constant.
      Test: round-trip + missing-file + backslash-normalization cases pass.

- [x] 4b-3 — Placement module
      Files: `src/place.js`, `test/place.test.js`
      RED: test that placing into a temp host copies every `templates/commands/*` and `templates/agents/*`
      EXCEPT `skill-writer.md`, copies `skill-writer-patterns.md` under `.claude/agents/`, copies the
      `core/` trio to host-root `core/`, copies `templates/.rea/{knowledge,decisions,sessions,plans}/README.md`
      into host `.rea/` (creating the four typed dirs), creates parent dirs, and records each path in the
      manifest.
      GREEN: copy per the host layout map; exclude `skill-writer.md`; place the `.rea/` scaffold (only add
      the README where the dir is missing — never touch an existing populated dir); record via 4b-2.
      REFACTOR: layout map as data (per-tool table).
      Test: destination tree + manifest match; `skill-writer.md` absent; trio present; the four `.rea/`
      typed dirs + their READMEs present.

- [x] 4b-4 — G6b shim writer (never blind-overwrite)
      Files: `src/shims.js`, `test/shims.test.js`
      RED: (a) writing `CLAUDE.md` into a file with user content above/below existing markers preserves
      that content and replaces only the managed region; (b) a markers-ABSENT `CLAUDE.md`/`AGENTS.md` gets
      the managed block APPENDED with all existing content intact; (c) `AGENTS.md` managed block created
      when the file is absent (using the fixed `templates/AGENTS.md` block — Decision 8); (d) Gemini
      `.gemini/settings.json` merge adds `context.fileName=["AGENTS.md","GEMINI.md"]` while preserving an
      unrelated key; (e) a second run is idempotent; (f) a CRLF-line-ending `CLAUDE.md` still matches the
      markers and preserves content.
      GREEN: marker block-replace/append for markdown (regex tolerant of `\r?\n`); JSON field-merge for
      `.gemini/settings.json`; containment-check `path.resolve` inside target root before writing; record
      shim regions in the manifest.
      REFACTOR: one marker helper reused across AGENTS.md/CLAUDE.md.
      Commit: RED-GREEN per sub-case is fine; land as one unit.
      Test: all cases (a)–(f) pass — the never-blind-overwrite contract holds on markers-present,
      markers-absent, and CRLF inputs.

- [x] 4b-5 — G1 prune + retired-file list
      Files: `src/prune.js`, `src/retired-list.js`, `test/prune.test.js`
      RED: (a) an owned-but-removed file is pruned; (b) an unowned user file survives; (c) a new-schema
      memory path (`.rea/knowledge/x.md`, `.rea/decisions/0001-x.md`, `.rea/sessions/y.md`,
      `.rea/plans/0001-x/`) is NEVER deleted even if wrongly passed in; (c2) the legacy `.rea/log/x.md` /
      `.rea/lessons.md` also survive (mid-migration host); (d) the one-time bridge (legacy files present,
      no manifest) deletes the retired list; (e) a `../escape` or absolute path is refused (containment).
      GREEN: `retired-list.js` = the hard-coded host-relative PRUNE set (rea-brainstorm/rea-commit/
      rea-update/rea-verify/rea-worktree commands, rea-router agent, root skill-writer-patterns.md);
      `prune.js` deletes owned-and-removed + (on bridge) the retired list; deny-list guards
      `.rea/knowledge/`, `.rea/decisions/`, `.rea/sessions/`, `.rea/plans/`, `.rea/log/`, `.rea/lessons.md`,
      `CLAUDE.md`, `.claude/settings.json`; containment-check `path.resolve` inside target root before any
      unlink.
      REFACTOR: deny-list + containment as module constants asserted before any unlink.
      Test: cases (a)–(e) pass; the deny-list blocks a typed-memory deletion and the containment check
      blocks an escaping path.

- [x] 4b-6 — setup orchestrator + tiers + migration auto-detect
      Files: `src/setup.js`, `test/setup.test.js`
      RED: (1) integration test on a fixture "legacy host" (has `.claude/commands/rea-commit.md`, a user
      `CLAUDE.md` preamble, a `.rea/log/old.md`): after `setup`, the redesign set is placed, the `.rea/`
      typed scaffold (knowledge/decisions/sessions/plans) exists, retired files are gone, the user
      preamble + `.rea/log/old.md` both survive, the manifest lists the owned set, and the
      `pip uninstall rea-dev` notice printed. (2) second-run-after-template-shrink: `setup`, drop a file
      from the template set, re-run `setup` → the now-unowned file is pruned via the manifest diff.
      GREEN: order detect(+load pre-run manifest to memory)→place→shims→prune(diff vs the in-memory
      pre-run snapshot)→save-manifest LAST; `--full` prints the `/rea-init --full` hand-off (installer does
      NOT do GitHub); bridge path prints the pip-uninstall notice.
      REFACTOR: orchestrator reads a single host-layout descriptor.
      Test: both integration cases pass (scaffold created; legacy memory + user CLAUDE.md preamble survive;
      retired files pruned; second run prunes a dropped template file via the manifest diff).

- [x] 4b-7 — Installer↔rea-init boundary edit
      File: `templates/commands/rea-init.md`
      1. Remove shim-writing (Step 5), `.rea/` creation (Step 4), AND the fixed always-on `AGENTS.md`
         marker-block authoring (Step 3) — the installer owns all of these (Decision 8).
      2. Re-frame `/rea-init` as intelligent-only: classify the project and author only `AGENTS.md`'s
         project-specific sections (description, tech stack, architecture rules, file structure, commands)
         OUTSIDE the managed markers; `--full` still does GitHub/CI.
      3. Step 0 detect-and-halt (Decision 9): check for the mechanical layer (`.rea/`, `core/`, the
         manifest); if any is missing, print "run `npx rea-tools setup` first" and STOP before Step 1.
      Test: rea-init.md no longer writes shims, creates `.rea/`, or authors the always-on marker block; it
      halts before Step 1 when the mechanical layer is absent; it authors only project-specific AGENTS.md
      sections outside the markers.

- [x] 4b-8 — Template link-resolution + stray-tag smoke check
      Files: `test/templates.test.js`
      1. For each placed template file, assert every intra-repo relative link resolves at the HOST layout
         (agent at `.claude/agents/x.md` → `core/…` resolves from host root), not the source tree (L301).
      2. Assert no agent/command body contains an unmatched HTML/XML tag (backstops PF-1).
      Test: both assertions run in `npm test` and pass against the current template set.

- [x] 4b-9 — JS test runner + CI wiring
      Files: `package.json`, `.github/workflows/ci.yml`
      1. `package.json`: `test` script running the Node test runner (`node --test` or `node:test`); a dev
         dep only if `node:test` is insufficient.
      2. CI: run `npm test` alongside the existing `pytest`/`ruff` during the transition (both must be
         green).
      Test: `npm test` runs all 4b module tests + 4b-8 checks green; CI config invokes both suites.
