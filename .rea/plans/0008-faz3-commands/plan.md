# Plan — Faz 3: Commands

## Brief
Author nine redesigned commands into a new tool-agnostic `templates/commands/` directory, move
`skill-writer` into `templates/agents/`, plus a dir README and doc-sync. Where a legacy equivalent exists
(`rea/templates/.claude/commands/<name>.md`), the redesigned command = that content **carried forward**
with the specific redesign edits below; `rea-fix` and `rea-tidy` are new. The legacy tree is the
*reference source* and stays untouched (Phase-4 prune removes it later). **No installer logic, no `rea
verify` CLI verb, no Python changes.**

**Method per command:** read the legacy base file (if any), apply the listed changes, write the result to
`templates/commands/<name>.md`. Preserve battle-tested logic (branch-safety routing, the triple-review +
max-fix-cycle discipline, the interrogation loop, the checkpoint gate). Keep additions minimal
(curse-of-instructions).

## Files to create
```
templates/commands/rea-init.md         templates/commands/rea-fix.md
templates/commands/rea-grill.md        templates/commands/rea-wrap.md
templates/commands/rea-plan.md         templates/commands/rea-tidy.md
templates/commands/rea-execute.md      templates/commands/rea-write-skill.md
templates/commands/rea-ship.md         templates/commands/README.md
templates/agents/skill-writer.md       (moved/reworked from the legacy tree)
templates/agents/skill-writer-patterns.md  (moved to the neutral tree iff skill-writer references it)
```

## Files to modify
```
templates/README.md        docs/rea-roadmap.md        CLAUDE.md
```

## Shared conventions (apply to every command file)
1. **Frontmatter:** minimal `name` + `description` only (the markdown-command format shared by the
   first-class tools). No `model:` on commands. Carry the legacy `name`/`description` forward where one
   exists, refreshed to the new role.
2. **Principle tag:** add a one-line tag near the top naming the principle letters the command serves
   (letters per the spec's command list; names come from `core/principles.md`).
3. **Core references** are project-root-relative paths read at runtime (`core/rea-schema.md`, etc.), never
   inlined, never `../../` links.
4. **Tool-agnostic body:** no `Claude` / `.claude/` / `/rea-*` / other-tool strings in the prose; refer to
   sibling commands and agents by **bare name**; read project rules from **`AGENTS.md`** generically.
5. **Orchestrate, don't nest:** a command may call agents; agents never call agents. Handle every agent
   `BLOCKED` / `NEEDS_CONTEXT` return with a sequential fallback or a clean stop-and-ask (CLAUDE.md rule 6).
6. **Schema + shim + capture contracts:** produce/read the new schema (G2/G3); mint numbered dirs by
   listing the directory (G6a); write shims only inside managed markers and memory only to `.rea/` (G6b);
   apply the `capture` 3-trigger + memory-write filter when recording a lasting decision.

## Per-command changes

### rea-execute.md · Principles D, E, G, I, C · (edit-heavy — the reference unit) · from legacy rea-execute.md
- Add principle tag `D, E, G, I, C`.
- **Carry forward:** find-active-plan + load-context; the **parallel-dispatch fan-out** (launch N
  `implementer` agents in one message, wait for all, then review); implementer status handling
  (`DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT`); the review → fix-cycle machinery with a
  **max-3-cycle** cap; the CI gate; mark-complete + loop; the pattern-detection reflection; the audit-trail
  rules (never delete completed items); the sequential fallback when `dispatcher` returns `BLOCKED`.
- **Frontier ownership (D7 — the reconciliation):** the **orchestrator** (this command) computes the
  frontier deterministically — read every `todo.md` `### U<n>` `Status:` + `plan.md` `Depends on`; the
  frontier = units with `Status: todo` whose every `Depends on` is `done` (`core/rea-schema.md`). **Retire
  the scalar `NEXT:` scan** the legacy command used (G3). Pass the computed frontier unit-set + the
  `todo.md` path to `dispatcher`, which does **physical file-conflict grouping only** and must not
  recompute it. Add a one-line note citing target-state §5.4's literal "compute the frontier via
  dispatcher" wording and stating this command overrides it.
- **Resume:** re-run the frontier computation from scratch; any unit left `in-progress` by a dead session is
  re-verified first — a commit for it exists → set `done`; none → reset to `todo` (G3).
- **Status ownership:** **only this command** writes `Status:` into `todo.md`; `implementer` is forbidden to.
- **Review after each batch — four fresh-context agents, relevant ones only:** run `spec-reviewer`
  (intent → human K) + `code-reviewer` (quality F + test-quality + craft C, tags `CC-NN`) always; add
  `bug-scanner` + `security-scanner` **only when the batch touched code** (skip them for pure
  content/prose units — they produce noise on markdown). **Preserve the `CC-NN` tags** when surfacing
  findings; a CC-tagged design smell is treated like any other blocking finding.
- **Review-diff acquisition (resolves roadmap §9):** record the `HEAD` sha **before** dispatching a batch;
  pass each review agent the explicit commit range `<pre-batch-sha>..HEAD` **plus** the union of the batch
  units' `Files:` lists — deterministic and fresh-context-safe.
- **Feedback-gate tiers:** inner (per unit, in `implementer`) = affected tests + lint only; outer (this
  command, before ship) = the full suite once; CI = the safety net. **Tooling is generic** — read the
  project's test + lint commands from `AGENTS.md` / project rules; use a language-appropriate affected-test
  selector where one exists, else fall back to the full suite as the inner gate; **never hardcode `pytest`**.
- **Content authoring — no mode imposed on authoring:** the unit's `Done when:` is the completion gate, and
  `implementer`'s "documentation-only → no test, stated reason" carve-out means a prose unit is simply never
  handed a fabricated test — nothing extra is needed to "author docs." TDD (E) stays mandatory for code
  units. The **only** orchestrator-side rule: run `bug-scanner` / `security-scanner` **only when the batch
  diff includes code files** (skip them on pure prose — they only produce noise on markdown); `spec-reviewer`
  + `code-reviewer` (craft) always run. This keys reviewer relevance off what actually changed (which
  naturally handles a mixed batch), with no per-unit content/code label for the plan to carry.
- **Capture + halt:** apply the `capture` triggers during the run; **halt for the human** at any decision
  or blocker (G).

### rea-ship.md · Principles L, K · (edit-heavy) · from legacy rea-commit.md
- Add principle tag `L, K`. Merges commit + deploy.
- **Carry forward near-verbatim:** the **branch-safety detection ladder** (main = blocked; `staging` =
  release-PR-to-main path with the `git log --not main` body; `feature/*` → staging; `hotfix/*` → main) +
  PR-target routing; the git-status / `git diff` / `git diff --staged` review-before-commit step; the
  **secret-exclusion pathspec** (`git add -A` excluding `.env` / `*.key` / `*credentials*` / `*secret*`);
  the commit-message convention + version-bump read (`pyproject.toml` / `package.json`); push-with-
  `--set-upstream` fallback; the `gh pr create` block; the final report.
- **Detect → suggest → confirm (never force):** mechanically detect repo? / remote? / branch protected? /
  branch strategy? / CI? / deploy target? / solo-or-team? Then suggest the flow with graceful degradation:
  no repo → offer `git init`; remote missing → local commit / offer a remote; CI present → wait for green;
  deploy target present → offer deploy + health-check; none → stop at PR / push.
- **Solo/team detection (resolves roadmap §9):** **team** if the repo has more than one distinct committer
  over a defined recent window (`git shortlog -sne` over the last ~50 commits, or ~90 days) **or** branch
  protection requires reviews **or** a `CODEOWNERS` file exists; else **solo**. **Solo** → the commit-time `git diff` checkpoint **is** the K
  human moment (can't self-approve a PR); **team** → propose branch + PR and let the review gate stand.
- **Generic deploy:** detect whatever redeploy mechanism the project configured (a webhook / platform hook)
  and offer push → CI-wait-for-green → redeploy → health-check. Modelled on the author's Coolify pipeline
  but **not hardcoded** to it; none configured → stop at PR / push.
- **Safety:** the secret check + the human-visible diff (K) are mandatory before commit; push / PR / deploy
  are all proposals the user confirms.

### rea-grill.md · Principle A · (new-heavy) · from legacy rea-brainstorm.md
- Add principle tag `A`. Codebase-aware interrogation ritual; `talk` (behaviour) frames the idea first.
- **Carry forward:** the **`explorer`-first** codebase exploration; the **one-question-at-a-time**
  interrogation loop (ask one, wait, repeat; never dump all questions at once); the design-alternatives
  dialogue (Approach / how-it-works / pros / cons / best-when — absorbed here since `talk` is not a
  command); the **show-and-confirm approval gate** + the "**never proceed without explicit approval**" rule.
- **Fact/decision split (Matt's grilling):** *facts* → look them up yourself via `explorer`; *decisions* →
  put them to the user. Attach a **recommended answer** to every question.
- **Frontier-batching (optional):** default is one-at-a-time; the user may switch to a numbered round of all
  currently-answerable questions (recompute after answers); the command may *suggest* frontier when many
  independent questions pile up. No forced upfront choice.
- **Capture** crystallised decisions / terms to `.rea/knowledge/` + `.rea/decisions/` (via the reflex).
- **Output artifact — `brief.md` (fixed shape = the `rea-grill` → `rea-plan` contract):** write the
  synthesised shared understanding to **`.rea/plans/<NNNN>-<slug>/brief.md`** (mint `<NNNN>` by listing
  `.rea/plans/`, G6a) — the durable handoff `rea-plan` reads (**not `spec.md`**). Fixed sections, stated
  **identically** here and in `rea-plan`: `## Goal` (what + why) · `## Context` (codebase facts from
  `explorer` + constraints) · `## Decisions resolved` (each resolved decision → chosen answer → rationale) ·
  `## Open questions` (anything deferred to planning) · `## Scope` (in / out). `core/rea-schema.md` mandates
  no internal shape for `brief.md`; this list is the command-level output contract, not a schema-version
  change.

### rea-plan.md · Principles B, H · (edit-heavy) · from legacy rea-plan.md
- Add principle tag `B, H`. **Reads `brief.md` and SYNTHESISES it — does not re-interview.** Reads the
  **fixed `brief.md` sections** `rea-grill` writes (`## Goal` / `## Context` / `## Decisions resolved` /
  `## Open questions` / `## Scope`) — state the identical section list so the two commands can be authored
  in separate fresh contexts without drift.
- **Carry forward:** the `plan-validator` invocation + silent-fix + re-run (**max 2 cycles**); the
  **Checkpoint gate** (real decisions as Option A/B + recommendation vs assumptions vs "no decisions", STOP
  on real trade-offs); the `plan-reviewer` adversarial invocation + the **mandatory pre-mortem** + the
  `REVISE` loop (**max 2 cycles**); the decisions-table format; the phased-plan concept; the plan ↔ todo
  coverage verification pass; the hand-off to `rea-execute`.
- **Drop:** the legacy in-command clarifying questions (interrogation now lives in `rea-grill`); the
  `NEXT:` marker machinery (G3).
- **Produce the new schema (G2):** `spec.md` (destination — what/why/scope/constraints); `plan.md` = the
  **dependency-graph table** `| Unit | Title | Depends on |` (+ optional Mermaid), **no file paths, no
  algorithm dump**; `todo.md` = one `### U<n> — <title>` section per unit with `Files:` / `Done when:` /
  `Size:` / `Status:` in that order, each unit a **vertical slice sized to one smart zone** (H), `Status:`
  initialised to `todo`. Each field in exactly one file (`Depends on` only in `plan.md`).
- Write spec/plan/todo into the **same `.rea/plans/<NNNN>-<slug>/`** dir as the `brief.md` from `rea-grill`.
- **Crystallised decisions → `.rea/decisions/`** (numbered ADRs, G6a, append-only); a session/log note to
  `.rea/sessions/` or via `capture`. **Preserve `CC-NN`** tags from `plan-reviewer`; a CC-tagged design
  smell is a blocking gap. The human **approves the plan** and confirms architecture decisions (K, J).

### rea-fix.md · Principle G · (new) · composes rea-execute + rea-ship shapes
- Add principle tag `G`. The disciplined, **interactive / human-supervised** quick-fix path — everything
  execute enforces except the plan stage.
- **Flow:** `debugger` (root cause) → fix (**TDD** via the `implementer` discipline) → **scoped tests +
  lint** → **fresh-context review** (the relevant review agents, same per-batch selection + `<sha>..HEAD`
  diff rule as `rea-execute`) → **ship** → **capture**. No `NEXT` / resume machinery (small + synchronous).
- **The ship step hands off to the `rea-ship` ritual** (detect → suggest → confirm) — reference `rea-ship`
  as the source of truth for commit / PR / deploy; do **not** duplicate its branch-safety / secret / PR
  mechanics (keeps prompts lean). `rea-fix` is interactive, so the human is present to run / confirm the
  ship the way the legacy path hands `rea-execute` off to `rea-commit`; **never silently skip `rea-ship`'s
  secret-check + human diff (K)**.
- **Escalation criterion (resolves roadmap §9) — stop and return to `rea-grill` → `rea-plan` →
  `rea-execute` on ANY of:** (1) more than ~3 files need changing; (2) an architecture / design (J/K)
  decision surfaces; (3) the change spans more than one vertical slice / multiple modules; (4) `debugger`
  hits its 3-attempt → architecture escalation; (5) the estimated size exceeds one smart zone. State the
  list explicitly so the command can self-check and hand off cleanly.
- Every execute quality gate is retained; honor `capture` triggers on the root cause; preserve `CC-NN` if it
  reviews; never corrupt a plan's `todo.md` `Status`.

### rea-wrap.md · Principle — · (edit — radical slim) · from legacy rea-wrap.md
- **Carry forward (retargeted):** the session-log writer → `.rea/sessions/YYYY-MM-DD-HHMM-<slug>.md`
  (fields `date` / `summary` / `links` per `core/rea-schema.md`); the session-name-from-dominant-theme
  derivation; the remaining-work count from `todo.md` `Status`; the final report.
- **Drop:** the auto-commit step (wrap now only **suggests** commit if there are uncommitted changes —
  committing is `rea-ship`'s job); the elaborate lesson-scanning-to-`lessons.md` logic (superseded by the
  continuous `capture` reflex, Faz 1; `lessons.md` retires into the typed `.rea/knowledge` + `.rea/decisions`
  graph); the `CLAUDE.md` auto-write (wrap now **suggests** architecture-rule changes, human confirms — J);
  native-memory writes.
- **New framing:** writes **only** to `.rea/`; light consolidation linking the session's captures;
  fault-tolerant + suggested-not-forced; **no heavy dedup** (that's `rea-tidy`).

### rea-tidy.md · Principle F · (new) · absorbs rea-verify's intelligent hygiene
- Add principle tag `F`. A **user-invoked** command that reconciles the persistent artifacts; runs as
  **dry-run report (`--check`) → human approval → fix**. Does the reconciliation **inline in its own agent —
  no dedicated sub-agent** (Decision 8).
- **Three jobs:** **memory** (orphans / conflicts / dedup — same concept under different names);
  **shims** (`CLAUDE.md` ↔ `AGENTS.md` managed-marker drift; Gemini `settings.json`); **rules** (stale /
  conflicting). Plus occasional numbering reconciliation for duplicate `NNNN-` dirs (G6a).
- **Salvage from legacy rea-verify:** the lessons-hygiene checks (architectural lessons belong in rules not
  `lessons.md`; stale duplicate lessons → flag) → the memory + rules reconciliation.
- **Never blind-overwrite** a shim — edit only inside the managed markers; Gemini JSON = field-merge (G6b).
- **Boundary:** rea-verify's *mechanical* file-presence / GitHub-config checks do **not** come here — they
  become the dumb `rea verify` CLI verb (Phase 4), not this command.

### rea-init.md · Principle L · (edit — tiered) · from legacy rea-init.md
- Add principle tag `L`. The **intelligent** bootstrap ritual; tiered.
- **Quick tier (default, ~1–2 min):** generate **`AGENTS.md`** (project-aware — carry forward the legacy
  Step-2 project-state classification Brownfield / Undocumented / Greenfield + the `explorer`-driven
  auto-generation, **retargeted to author `AGENTS.md`, not `CLAUDE.md`**); create the typed `.rea/` graph
  (`knowledge/` / `decisions/` / `sessions/` / `plans/`); place the `core/` craft-checklist reference; write
  the per-tool shims **inside managed markers** (`CLAUDE.md` = `@AGENTS.md`; Gemini `settings.json` merge —
  G6b). **No GitHub, no CI, no branch protection.**
- **Full tier (`--full`, opt-in):** carry forward the legacy mechanical GitHub blocks — gh-auth /
  workflow-scope dependency checks, staging-branch creation, branch-protection PUT with the private-repo
  guard, `ci.yml` + `claude-review.yml` + `.gitattributes` templates, placeholder-test generation, the
  secrets checklist; plus the Step-4.5 skill-leakage check.
- **Drop:** the SessionStart-hook-for-`rea-router` wiring (G4 — no hooks); the PyPI framing (npx, D1); the
  `CLAUDE.md`-as-primary framing (`AGENTS.md` is canonical; `CLAUDE.md` = `@AGENTS.md` managed-marker shim).
- **Boundary:** the mechanical file placement + the **G1 ownership manifest + prune** are the **Phase-4 npx
  installer**; `rea-init` (the command) is the intelligent layer that composes on top. `rea-tidy` reconciles
  shim drift later.

### rea-write-skill.md (+ move skill-writer) · Principles C, L · (utility + agent move) · from legacy rea-write-skill.md
- **rea-write-skill command:** carry forward the legacy `rea-write-skill.md`; retarget it to orchestrate the
  moved `skill-writer` agent to author a new agent/command that matches the redesign conventions
  (tool-agnostic body, neutral `templates/` source, schema-aware); tool-agnostic prose.
- **Move `skill-writer` → `templates/agents/skill-writer.md`:** carry forward the legacy
  `rea/templates/.claude/agents/skill-writer.md`; align it to the new command/agent conventions (produces
  files at neutral `templates/` paths with tool-agnostic bodies + minimal frontmatter; aware of the new
  `.rea/` schema and the `core/` references). Keep it an **agent** (composable, standalone-callable — CLAUDE.md
  rule 6), not folded into the command. If it references the patterns doc
  (`rea/templates/.claude/skill-writer-patterns.md`), **carry the patterns doc forward to the neutral path
  `templates/agents/skill-writer-patterns.md`** and reference it there (project-root-relative) — never point
  a redesign agent at the legacy `.claude/`-bearing path (tool-agnostic-body rule; the legacy tree stays a
  reference source only).

### templates/commands/README.md (new)
- 2–5 lines: what `templates/commands/` is — the redesigned REA command set (source of truth), authored
  tool-agnostic; the future npx installer (Phase 4) places them into each host tool's command folder
  (`.claude/commands/`, oh-my-pi's location, …); per-tool *format* porting (Gemini TOML) is parked; pointer
  to `docs/rea-roadmap.md` §4 Phase 3. Note commands carry `name`/`description` frontmatter only (no model).

## Doc-sync (modify)
- `templates/README.md`: add the `commands/` subdir (the redesigned command set) to the tree description,
  alongside the existing `AGENTS.md` / `agents/` / `shims/` / `.rea/` entries; add a `commands/README.md`
  note mirroring the `agents/` one.
- `CLAUDE.md`: one line under File Structure for `templates/commands/` (redesign-era command sources); note
  the legacy `rea/templates/.claude/commands/` unchanged.
- `docs/rea-roadmap.md`: flip Phase 3 `⬜ → ✅` with a pointer to `.rea/plans/0008-faz3-commands/`; record
  the **replaces-old-set** mapping (`rea-brainstorm` → `talk` + `rea-grill`; `rea-commit` → `rea-ship`; drop
  `rea-worktree`; `rea-verify` → CLI verb; `rea-update` → utility, pip/PyPI path obsolete under npx (D1),
  out of the Phase-3 nine); in §5 append that the G2 / G3 schema is now **used** by the Phase-3 commands; in
  §9 mark the P3-resolved deferrals (rea-fix escalation, rea-ship solo/team, review-agent diff acquisition,
  the prompt-level testing / eval strategy, non-Python tiered-test tooling) as **decided in 0008**. Change
  no other phase's status.

## Decisions

| # | Decision | Choice | Alternatives rejected | Rationale |
|---|----------|--------|-----------------------|-----------|
| 1 | Command SOURCE path | Neutral `templates/commands/*.md` (+ minimal `name`/`description` frontmatter) | `templates/.claude/commands/` (Claude-specific source — conflates content with placement); in-place edit of the legacy tree | Layer-1 content is tool-agnostic; per-tool placement is the Phase-4 installer's job. Mirrors Faz-2 D1 (`templates/agents/`). |
| 2 | Scope | 9 commands **+ move `skill-writer`** into `templates/agents/` | 8 pipeline commands only (roadmap literal) — defers a needed utility and leaves `rea-write-skill` referencing an agent absent from the new tree; fold `skill-writer` into the command | User-approved this session. `rea-write-skill` needs `skill-writer` to exist in the redesign tree; keeping it an agent preserves composability (CLAUDE.md rule 6). |
| 3 | Frontier ownership (D7) | `rea-execute` (orchestrator) computes the frontier deterministically; `dispatcher` only groups by physical file-conflict | `dispatcher` computes it (target-state §5.4 literal wording) | Frontier eligibility (`Status: todo` ∧ all `Depends on` `done`) is pure filtering with no LLM judgment; deterministic code beats an agent. `dispatcher.md` was already authored to receive it (Faz-2 D7). |
| 4 | Content-authoring in execute | **No** mode imposed on authoring: the unit's `Done when:` is the gate and `implementer`'s documentation-only carve-out handles prose (no fabricated test). Reviewer selection is the only orchestrator rule — run `bug-scanner` / `security-scanner` only when the batch diff includes code files; `spec-reviewer` + `code-reviewer` always | An implementer-facing mode flag / editing `implementer.md` (touches the Faz-2 agent); a per-unit content-vs-code label the plan must carry (unnecessary — the implementer self-handles the test, the scanners key off the actual diff) | The plan is the source of truth (B/H); the leanest thing that works (L) — the orchestrator keys reviewer relevance off what actually changed, nothing more. TDD (E) intact for code units. |
| 5 | Review-diff acquisition | Record `HEAD` before a batch; pass each fresh review agent `<pre-batch-sha>..HEAD` + the union of the batch `Files:` | Whole-repo diff (wrong scope); no range (a fresh agent sees nothing); per-file only (misses cross-file interactions) | Deterministic, fresh-context-safe, matches "review the batch diff". Resolves roadmap §9. |
| 6 | `rea-ship` solo/team detection | Mechanical: team if >1 distinct committer over a defined window (`git shortlog -sne`, last ~50 commits / ~90 days) OR branch protection requires reviews OR `CODEOWNERS` exists; else solo | Ask the user every ship (friction); assume solo (skips team review); assume team (blocks a solo dev on an un-approvable PR) | Mechanical detection of the real state (L). Solo → commit-time diff checkpoint (K); team → PR gate. |
| 7 | `rea-fix` escalation criterion | Stop + return to the normal path on ANY of {>~3 files; an arch/design (J/K) decision; >1 vertical slice/module; `debugger` 3-attempt escalation; >1 smart-zone} | Leave it to judgment (balloons into an undisciplined AFK loop, or over-escalates trivial fixes) | A bright, self-checkable line keeps the bypass disciplined (G) without a plan stage. Resolves roadmap §9. |
| 8 | `rea-tidy` reconciliation engine | Inline in the command's own agent — **no** dedicated sub-agent | Author a new tidy/dedup agent in `templates/agents/` | rea-tidy is occasional + `--check` dry-run + human-approved; a new agent is unjustified extra Faz-2-scope work. Add one later only if it proves too heavy. |
| 9 | Tiered-test tooling (non-Python) | Read test + lint commands generically from `AGENTS.md` / project rules; language-appropriate affected-test selector where one exists, else full-suite fallback; content → structure checks | Hardcode `pytest` / `pytest-testmon` (Python-only) | The redesign is cross-language; a Python-only selector breaks Principle D on every other host. Resolves roadmap §9. |
| 10 | Prompt-level eval for P3 | Documentation-style **structural** acceptance checks (each todo `Test:` line reads an assertion off the authored file), same as Faz 0–2 | Build a real command-eval harness now (run a command against a fixture project, assert behaviour) | Roadmap §9 defers the eval harness; P3 is content authoring — a structural check is the right acceptance for markdown prompts. |

## Boundary notes (do NOT solve here)
- **The npx installer** — file placement into each tool's folder, the **G1 ownership manifest**, the
  obsolete-file prune + the one-time retired-file list, the marker-merge write mechanics — is **Phase 4**.
  `rea-init` (command) is the intelligent ritual that composes on top; do not build installer plumbing here.
- **`rea verify`** — the mechanical file/GitHub/branch-protection check — is a **CLI verb** (Phase 4), not
  a command. `rea-tidy` takes only the intelligent hygiene half of the legacy rea-verify.
- **Per-tool command-format porting** (Gemini TOML, arg/shell micro-syntax) — **parked** (roadmap §6);
  author single-format markdown.
- **A real prompt-eval harness** — **deferred** (roadmap §9); P3 uses structural acceptance checks.
- **The v0.7.1 → redesign migration + its UX** — **Phase 5 / Phase 4 §10**.

## Dependency graph (for the frontier / dispatcher during execute)
- All 9 command files + `templates/agents/skill-writer.md` + `templates/commands/README.md` are mutually
  **file-disjoint** → all parallelisable at the *file* level.
- The real ordering is a **contract** dependency, not a file one: `rea-execute` is the **reference unit** —
  the frontier-ownership, per-batch review-selection, and `<sha>..HEAD` diff contracts crystallise there and
  are cited by `rea-fix`. Author `rea-execute` **first**, then `rea-ship`, then `rea-fix` (it references both).
  `rea-grill` produces `brief.md` (the fixed section shape above) and `rea-plan` consumes it — a **contract
  dependency**: author `rea-grill`'s `brief.md` section list as the reference, and `rea-plan` must read the
  identical sections (both change-lists state the same five sections so the two can be authored in separate
  fresh contexts without drift).
- **Doc-sync** (`templates/README.md`, `CLAUDE.md`, `docs/rea-roadmap.md`) `Depends on` all command files
  existing (it describes them) → runs **last**. `templates/commands/README.md` also runs late (describes the
  set) but is file-disjoint from doc-sync.
- Execution order for the bootstrap (legacy `/rea-execute`) checklist: rea-execute → rea-ship → rea-grill →
  rea-plan → rea-fix → rea-wrap → rea-tidy → rea-init → rea-write-skill(+skill-writer) → commands/README →
  doc-sync.
