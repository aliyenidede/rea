# Todo — Faz 3: Commands

> **Execution framing (pass to every implementer):** this is markdown **prompt content**, not code —
> no TDD, no code-tests; do NOT run git/commit; keep the body tool-agnostic (no `Claude`/`.claude/`/`/rea-*`,
> no other-tool names; refer to sibling commands and agents by bare name; read project rules from
> `AGENTS.md`). Where a legacy base exists (`rea/templates/.claude/commands/<name>.md`), carry it forward,
> apply the listed changes, write to `templates/commands/<name>.md`. Core references are project-root-relative
> (`core/rea-schema.md`, `core/craft-checklist.md`, `core/principles.md`), never inlined, never `../../`
> links. Commands orchestrate agents; agents never call agents; degrade on `BLOCKED`/`NEEDS_CONTEXT`. Keep
> additions minimal (curse-of-instructions); do not invent product/package names.

## Todo

- [ ] NEXT: Author `templates/commands/rea-execute.md` (edit-heavy · D, E, G, I, C — reference unit)
      Files: `templates/commands/rea-execute.md`
      1. Carry forward legacy `rea/templates/.claude/commands/rea-execute.md`; add principle tag `D, E, G, I, C`;
         minimal `name`/`description` frontmatter.
      2. Frontier ownership (D7): the orchestrator computes the frontier deterministically — read each
         `todo.md` `### U<n>` `Status:` + `plan.md` `Depends on`; frontier = `Status: todo` ∧ all `Depends on`
         `done` (`core/rea-schema.md`). RETIRE the scalar `NEXT:` scan. Pass the frontier unit-set + todo.md
         path to `dispatcher` for physical file-conflict grouping ONLY; add a one-line note that this overrides
         target-state §5.4's literal "compute the frontier via dispatcher" wording.
      3. Resume: recompute from scratch; re-verify `in-progress` units (commit exists → `done`, else → `todo`).
         Only this command writes `Status:`; `implementer` never touches `todo.md`.
      4. Carry forward: parallel-dispatch fan-out (N implementers in one message → wait all → review);
         implementer status handling (DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT); review→fix cycle
         (max 3); CI gate; mark-complete + loop; pattern-detection reflection; audit-trail (never delete
         completed items); sequential fallback when `dispatcher` returns BLOCKED.
      5. After-batch review = fresh-context agents, relevant only: `spec-reviewer` + `code-reviewer`
         (craft C, tags `CC-NN`) always; add `bug-scanner` + `security-scanner` ONLY when the batch touched
         code. Preserve `CC-NN` tags when surfacing findings.
      6. Review-diff: record `HEAD` sha before a batch; pass each review agent `<pre-batch-sha>..HEAD` + the
         union of the batch units' `Files:`.
      7. Feedback-gate tiers: inner (in implementer) = affected tests + lint; outer (here, before ship) =
         full suite once; read test/lint commands generically from `AGENTS.md` — never hardcode `pytest`;
         degrade to full suite if no affected-test selector; a pure-prose unit gates on `Done when:` + lint
         (implementer's carve-out — no fabricated test).
      8. Content authoring (no mode imposed on authoring): the unit's `Done when:` is the gate; implementer's
         documentation-only carve-out means a prose unit is never handed a fabricated test — nothing extra
         needed. Orchestrator rule: run `bug-scanner`/`security-scanner` ONLY when the batch diff includes
         code files (skip on pure prose); `spec-reviewer` + `code-reviewer` always. TDD stays for code units.
         Apply `capture` triggers; halt for the human at any decision/blocker (G).
      Test: file exists; `D, E, G, I, C` tag; orchestrator computes the frontier and passes it to `dispatcher`
      (no `NEXT:` scan); the §5.4 override note is present; resume re-verifies `in-progress` via commit;
      after-batch review names the 4 agents with the code-only rule for bug/security + `CC-NN` preserved;
      review-diff uses `<sha>..HEAD` + `Files:`; inner vs outer gate tiers stated with generic (non-`pytest`)
      tooling; content authoring imposes no mode — gates on `Done when:` and runs bug/security only when the
      batch diff includes code files; body tool-agnostic; refs `core/rea-schema.md` root-relative.

- [ ] Author `templates/commands/rea-ship.md` (edit-heavy · L, K)
      Files: `templates/commands/rea-ship.md`
      1. Carry forward legacy `rea/templates/.claude/commands/rea-commit.md`; add principle tag `L, K`;
         minimal frontmatter. Merges commit + deploy.
      2. Carry forward near-verbatim: branch-safety ladder (main blocked; `staging` = release-PR-to-main with
         `git log --not main` body; `feature/*`→staging; `hotfix/*`→main) + PR-target routing; git-status /
         `git diff` review-before-commit; secret-exclusion pathspec (`.env`/`*.key`/`*credentials*`/`*secret*`);
         commit-message convention + version-bump read; push `--set-upstream` fallback; `gh pr create`; report.
      3. Detect → suggest → confirm (never force): mechanically detect repo?/remote?/protected?/branch
         strategy?/CI?/deploy target?/solo-or-team?; degrade gracefully (no repo→offer `git init`; remote
         missing→local commit; CI→wait green; deploy present→offer deploy+health-check; none→stop at PR/push).
      4. Solo/team detection: team if >1 distinct committer over a defined window (`git shortlog -sne`, last
         ~50 commits / ~90 days) OR branch protection requires reviews OR `CODEOWNERS` exists; else solo.
         Solo → commit-time `git diff` checkpoint IS the K moment; team → branch + PR gate.
      5. Generic deploy: detect any configured redeploy webhook/hook → push → CI-wait-green → redeploy →
         health-check (modelled on but not hardcoded to Coolify); none → stop at PR/push. Secret check + human
         diff (K) mandatory before commit; push/PR/deploy are proposals the user confirms.
      Test: file exists; `L, K` tag; branch-safety ladder + secret pathspec + version-bump carried forward;
      detect→suggest→confirm framing present; solo/team detection is the `git shortlog`/branch-protection/
      `CODEOWNERS` rule with solo→diff-checkpoint, team→PR; deploy is generic (not hardcoded Coolify);
      body tool-agnostic (no `.claude`/`/rea-`).

- [ ] Author `templates/commands/rea-grill.md` (new-heavy · A)
      Files: `templates/commands/rea-grill.md`
      1. Carry forward legacy `rea/templates/.claude/commands/rea-brainstorm.md`; add principle tag `A`;
         minimal frontmatter.
      2. Carry forward: `explorer`-first exploration; one-question-at-a-time loop (never dump all);
         design-alternatives dialogue (Approach/pros/cons/best-when); show-and-confirm approval gate +
         "never proceed without explicit approval".
      3. Fact/decision split: facts → look up via `explorer`; decisions → put to the user, each with a
         recommended answer.
      4. Optional frontier-batching: default one-at-a-time; user may switch to a numbered round of all
         currently-answerable questions (recompute after); command may suggest frontier when many independent
         questions pile up.
      5. `capture` crystallised decisions/terms to `.rea/knowledge/` + `.rea/decisions/`. Output artifact:
         write the synthesised understanding to `.rea/plans/<NNNN>-<slug>/brief.md` (mint `<NNNN>` by listing
         `.rea/plans/`, G6a) — the durable handoff `rea-plan` reads (NOT `spec.md`). Fixed sections (stated
         identically in rea-plan): `## Goal` / `## Context` / `## Decisions resolved` / `## Open questions` /
         `## Scope`.
      Test: file exists; `A` tag; uses `explorer`; one-question-at-a-time default with optional
      frontier-batching; fact/decision split with a recommended answer per question; hard confirmation gate;
      writes `brief.md` under `.rea/plans/<NNNN>-<slug>/` (mints number by listing, no central index) with
      the five fixed sections (Goal / Context / Decisions resolved / Open questions / Scope); body tool-agnostic.

- [ ] Author `templates/commands/rea-plan.md` (edit-heavy · B, H)
      Files: `templates/commands/rea-plan.md`
      1. Carry forward legacy `rea/templates/.claude/commands/rea-plan.md`; add principle tag `B, H`;
         minimal frontmatter. Reads the fixed `brief.md` sections (`## Goal` / `## Context` /
         `## Decisions resolved` / `## Open questions` / `## Scope`) and SYNTHESISES them — does NOT re-interview.
      2. Carry forward: `plan-validator` invocation + silent-fix + re-run (max 2); Checkpoint gate (real
         decisions Option A/B + recommendation vs assumptions vs none, STOP on real trade-offs); `plan-reviewer`
         adversarial + MANDATORY pre-mortem + REVISE loop (max 2); decisions-table format; phased-plan concept;
         plan↔todo coverage pass; hand-off to `rea-execute`.
      3. Drop: legacy in-command clarifying questions (now `rea-grill`); the `NEXT:` machinery (G3).
      4. Produce the new schema (G2): `spec.md` (destination); `plan.md` = `| Unit | Title | Depends on |`
         table (+ optional Mermaid), NO file paths / NO algorithm dump; `todo.md` = one `### U<n> — <title>`
         section per unit with `Files:`/`Done when:`/`Size:`/`Status:` in order, each a vertical slice sized to
         one smart zone (H), `Status:` = `todo`. Each field in exactly one file (`Depends on` only in plan.md).
      5. Write spec/plan/todo into the SAME `.rea/plans/<NNNN>-<slug>/` as `brief.md`. Crystallised decisions →
         `.rea/decisions/` (numbered ADR, G6a, append-only); session note → `.rea/sessions/` or via `capture`.
         Preserve `CC-NN` from `plan-reviewer` (CC-tagged design smell = blocking gap). Human approves the plan
         + confirms architecture (K, J).
      Test: file exists; `B, H` tag; reads the five fixed `brief.md` sections and synthesises (no re-interview); produces the G2
      `plan.md` dep-graph table (no paths) + `### U<n>` `todo.md` with the four ordered fields; retires
      `NEXT:`; wires `plan-validator` + `plan-reviewer` with the mandatory pre-mortem; keeps the Checkpoint
      gate; decisions → `.rea/decisions/`; references `core/rea-schema.md` root-relative; body tool-agnostic.

- [ ] Author `templates/commands/rea-fix.md` (new · G)
      Files: `templates/commands/rea-fix.md`
      1. New command (no direct legacy base — composes `rea-execute` + `rea-ship` shapes); add principle tag
         `G`; minimal frontmatter. Interactive / human-supervised; everything execute enforces except the plan.
      2. Flow: `debugger` (root cause) → fix (TDD via the `implementer` discipline) → scoped tests + lint →
         fresh-context review (relevant agents, same per-batch selection + `<sha>..HEAD` diff rule as
         `rea-execute`) → ship (hand off to the `rea-ship` ritual — reference it, do NOT duplicate its
         branch-safety/secret/PR mechanics; never skip its secret-check + human diff K) → `capture`. No
         `NEXT`/resume machinery.
      3. Escalation criterion — STOP and return to `rea-grill`→`rea-plan`→`rea-execute` on ANY of: (1) >~3
         files; (2) an architecture/design (J/K) decision surfaces; (3) >1 vertical slice / multiple modules;
         (4) `debugger` hits its 3-attempt escalation; (5) estimated size > one smart zone. State the list so
         the command self-checks and hands off cleanly.
      4. Every execute quality gate retained; honor `capture` on the root cause; preserve `CC-NN` if it
         reviews; never corrupt a plan's `todo.md` `Status:`.
      Test: file exists; `G` tag; flow is debug→fix(TDD)→scoped tests+lint→fresh review→ship→capture with
      the ship step handing off to the `rea-ship` ritual (not duplicated); the 5-item escalation list is
      explicit and returns to the normal path; references `rea-execute`/`rea-ship` by bare name; body tool-agnostic.

- [ ] Author `templates/commands/rea-wrap.md` (edit — radical slim · —)
      Files: `templates/commands/rea-wrap.md`
      1. Carry forward legacy `rea/templates/.claude/commands/rea-wrap.md`; minimal frontmatter; note it serves
         no single principle (a clean-close ritual).
      2. Carry forward (retargeted): session-log writer → `.rea/sessions/YYYY-MM-DD-HHMM-<slug>.md` (fields
         `date`/`summary`/`links` per `core/rea-schema.md`); session-name-from-dominant-theme; remaining-work
         count from `todo.md` `Status`; final report.
      3. Drop: auto-commit (now only SUGGESTS commit if uncommitted — that's `rea-ship`); the
         lesson-scanning-to-`lessons.md` logic (superseded by the continuous `capture` reflex; `lessons.md`
         retires into `.rea/knowledge` + `.rea/decisions`); `CLAUDE.md` auto-write (now suggests, human
         confirms — J); native-memory writes.
      4. New framing: writes ONLY to `.rea/`; light consolidation linking the session's captures;
         fault-tolerant + suggested-not-forced; no heavy dedup (that's `rea-tidy`).
      Test: file exists; writes only to `.rea/sessions/` in the timestamped format; does NOT commit (suggests
      only); no `lessons.md`/`CLAUDE.md`/native-memory writes; suggests-not-forces; body tool-agnostic.

- [ ] Author `templates/commands/rea-tidy.md` (new · F)
      Files: `templates/commands/rea-tidy.md`
      1. New command; add principle tag `F`; minimal frontmatter. User-invoked; dry-run report (`--check`) →
         human approval → fix. Reconciliation is done INLINE in the command's own agent — no dedicated
         sub-agent (Decision 8).
      2. Three jobs: memory (orphans/conflicts/dedup — same concept, different names); shims (`CLAUDE.md` ↔
         `AGENTS.md` managed-marker drift; Gemini `settings.json`); rules (stale/conflicting). Plus occasional
         numbering reconciliation for duplicate `NNNN-` dirs (G6a).
      3. Salvage from legacy `rea-verify.md`: the lessons-hygiene checks (architectural lessons → rules not
         `lessons.md`; stale duplicate lessons → flag) → the memory + rules reconciliation.
      4. Never blind-overwrite a shim — edit only inside the managed markers; Gemini JSON = field-merge (G6b).
         Boundary note in the body: rea-verify's mechanical file/GitHub checks are the `rea verify` CLI verb
         (Phase 4), not this command.
      Test: file exists; `F` tag; user-invoked `--check` dry-run → approve → fix; three jobs (memory/shims/
      rules) done inline (no new sub-agent); respects managed markers (never blind-overwrite); states the
      `rea verify` CLI-verb boundary; body tool-agnostic.

- [ ] Author `templates/commands/rea-init.md` (edit — tiered · L)
      Files: `templates/commands/rea-init.md`
      1. Carry forward legacy `rea/templates/.claude/commands/rea-init.md`; add principle tag `L`; minimal
         frontmatter. The intelligent, tiered bootstrap ritual.
      2. Quick tier (default): generate `AGENTS.md` (carry forward the legacy project-state classification
         Brownfield/Undocumented/Greenfield + `explorer`-driven auto-generation, RETARGETED to author
         `AGENTS.md`, not `CLAUDE.md`); create the typed `.rea/` graph; place the `core/` craft-checklist
         reference; write per-tool shims inside managed markers (`CLAUDE.md`=`@AGENTS.md`; Gemini
         `settings.json` merge — G6b). No GitHub/CI/branch-protection.
      3. Full tier (`--full`): carry forward the legacy GitHub blocks — gh-auth/workflow-scope checks,
         staging-branch creation, branch-protection PUT with the private-repo guard, `ci.yml` +
         `claude-review.yml` + `.gitattributes` templates, placeholder-test, secrets checklist; + the
         Step-4.5 skill-leakage check.
      4. Drop: the SessionStart-hook-for-`rea-router` wiring (G4); the PyPI framing (npx, D1); the
         `CLAUDE.md`-as-primary framing. Boundary note in the body: the mechanical file placement + the G1
         ownership manifest + prune are the Phase-4 npx installer; this command is the intelligent layer;
         `rea-tidy` reconciles shim drift.
      Test: file exists; `L` tag; two tiers (quick default = AGENTS.md + `.rea/` + craft-ref + G6b shims,
      no GitHub; `--full` = CI + branch protection + secrets); generates `AGENTS.md` (not CLAUDE.md-as-primary);
      shims written inside managed markers; no SessionStart-hook/`rea-router`; no PyPI; states the Phase-4
      installer boundary; body tool-agnostic.

- [ ] Author `templates/commands/rea-write-skill.md` + move `templates/agents/skill-writer.md` (utility · C, L)
      Files: `templates/commands/rea-write-skill.md`, `templates/agents/skill-writer.md`,
      `templates/agents/skill-writer-patterns.md` (if skill-writer references it)
      1. rea-write-skill command: carry forward legacy `rea/templates/.claude/commands/rea-write-skill.md`;
         add principle tag `C, L`; minimal frontmatter; retarget it to orchestrate the moved `skill-writer`
         agent to author a new agent/command matching the redesign conventions (neutral `templates/` source,
         tool-agnostic body, schema-aware).
      2. Move `skill-writer`: carry forward legacy `rea/templates/.claude/agents/skill-writer.md` into
         `templates/agents/skill-writer.md`; align to the new conventions (produces files at neutral
         `templates/` paths with tool-agnostic bodies + minimal frontmatter; aware of the new `.rea/` schema
         and the `core/` references); keep frontmatter `model: sonnet`, `tools:` verbatim. Keep it an AGENT
         (composable, standalone-callable — CLAUDE.md rule 6), not folded into the command.
      3. If `skill-writer` references the patterns doc (`rea/templates/.claude/skill-writer-patterns.md`),
         carry the patterns doc forward to the neutral path `templates/agents/skill-writer-patterns.md` and
         reference it there (project-root-relative) — never point the redesign agent at the legacy
         `.claude/`-bearing path.
      Test: both files exist; command has `C, L` tag and orchestrates `skill-writer` by bare name;
      `templates/agents/skill-writer.md` is tool-agnostic, schema-aware, references `core/` root-relative,
      keeps `model: sonnet`; the patterns doc (if referenced) is carried to `templates/agents/skill-writer-patterns.md`
      (not the legacy `.claude/` path); bodies have no `.claude`/`/rea-` strings.

- [ ] Create `templates/commands/README.md`
      Files: `templates/commands/README.md`
      1. 2–5 lines: what `templates/commands/` is — the redesigned REA command set (source of truth),
         tool-agnostic; the Phase-4 npx installer places them into each host tool's command folder
         (`.claude/commands/`, oh-my-pi's location, …); per-tool *format* porting (Gemini TOML) is parked.
      2. Note commands carry `name`/`description` frontmatter only (no model); point to
         `docs/rea-roadmap.md` §4 Phase 3.
      Test: file exists; explains the dir's purpose + who places it (Phase 4) + the parked per-tool-format
      note; links roadmap §4; no host-tool-specific source-path claim.

- [ ] Doc-sync: templates README + project CLAUDE.md + roadmap status
      Files: `templates/README.md`, `CLAUDE.md`, `docs/rea-roadmap.md`
      1. `templates/README.md`: add the `commands/` subdir (redesigned command set) + a `commands/README.md`
         note, mirroring the `agents/` entry.
      2. `CLAUDE.md`: one line under File Structure for `templates/commands/` (redesign-era command sources);
         note legacy `rea/templates/.claude/commands/` unchanged.
      3. `docs/rea-roadmap.md`: flip Phase 3 `⬜ → ✅` with a pointer to `.rea/plans/0008-faz3-commands/`;
         record the replaces-old-set mapping (`rea-brainstorm`→`talk`+`rea-grill`; `rea-commit`→`rea-ship`;
         drop `rea-worktree`; `rea-verify`→CLI verb; `rea-update`→utility, pip/PyPI path obsolete under npx
         (D1), out of the Phase-3 nine); in §5 append that G2/G3 is now USED by the Phase-3 commands; in §9
         mark the P3-resolved deferrals (rea-fix escalation, rea-ship solo/team, review-agent diff
         acquisition, the prompt-level testing/eval strategy, non-Python tiered-test tooling) as decided in
         0008. Change no other phase's status.
      Test: `templates/README.md` + `CLAUDE.md` both reference `templates/commands/`; roadmap Phase 3 = ✅
      with the plan pointer + replaces-old-set mapping; §5 G2/G3 marked used + §9 deferrals marked decided;
      no other phase status changed.
