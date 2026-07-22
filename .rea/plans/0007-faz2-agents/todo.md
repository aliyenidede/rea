# Todo — Faz 2: Agents

> **Execution framing (pass to every implementer):** this is markdown **prompt content**, not code —
> no TDD, no code-tests; do NOT run git/commit; keep the body tool-agnostic (no `Claude`/`.claude/`/`/rea-*`);
> do not invent product/package names. Base each file on the legacy
> `rea/templates/.claude/agents/<name>.md` (carry forward), apply the listed changes, write to
> `templates/agents/<name>.md`. Core references are project-root-relative (`core/...`), never inlined,
> never `../../` links. Keep additions minimal.

## Todo

- [x] Author `templates/agents/code-reviewer.md` (edit-heavy · F, C)
      Files: `templates/agents/code-reviewer.md`
      1. Carry forward legacy `rea/templates/.claude/agents/code-reviewer.md` (frontmatter verbatim: model sonnet).
      2. Add principle tag `F, C` near the top.
      3. Craft-checklist wiring: add a short step — read `core/craft-checklist.md`, assess the diff
         against CC-01…CC-06, and MANDATORY-tag every craft finding with its `CC-NN`.
      4. Add a test-quality review dimension: are the implementer's tests meaningful (assert real
         behaviour, cover the change's risk, not tautological)? Report weak/missing tests.
      5. Preserve 4-phase methodology, confidence scoring (<0.6 dropped), Hard Exclusions, Rationalizations.
      Test: file exists; has `F, C` tag; references `core/craft-checklist.md` (root-relative, not `../..`,
      not inlined); states CC-NN citation is mandatory for craft findings; has a test-quality check; no
      `Claude`/`.claude`/`/rea-` in the body; model still sonnet.

- [x] Author `templates/agents/plan-reviewer.md` (edit-heavy · A, B, C)
      Files: `templates/agents/plan-reviewer.md`
      1. Carry forward legacy plan-reviewer (frontmatter verbatim: model sonnet).
      2. Add principle tag `A, B, C`.
      3. Design-level craft wiring: read `core/craft-checklist.md`; flag planned designs that violate a
         craft item (shallow module → CC-01, leaky abstraction → CC-06, …); tag findings `CC-NN`.
      4. Add a MANDATORY pre-mortem before any PASS: 3 likely failure causes + probability + mitigated?;
         an unmitigated high-probability cause forces REVISE.
      5. Preserve claim checklist, gap-finding, Option-A/B decisions, PASS/REVISE, adversarial framing.
      Test: file exists; `A, B, C` tag; references `core/craft-checklist.md` (root-relative, not `../..`)
      with CC-NN tagging of craft findings; has a mandatory pre-mortem step gating PASS; keeps PASS/REVISE;
      body tool-agnostic; model sonnet.

- [x] Author `templates/agents/plan-validator.md` (edit-heavy · B, J, L)
      Files: `templates/agents/plan-validator.md`
      1. Carry forward legacy plan-validator (frontmatter verbatim: model sonnet).
      2. Add principle tag `B, J, L`.
      3. Align the plan↔todo cross-check to `core/rea-schema.md`: units keyed by their `U<n>` heading id; per-unit
         fields `Files:`/`Done when:`/`Size:`/`Status:` (todo|in-progress|done|blocked); deps via plan.md
         `Depends on`. Forward + backward coverage + orphan detection on the unit id.
      4. Retire scalar `NEXT`: do NOT expect/require a `NEXT:` pointer; the executable set is the computed
         frontier. Validate frontier-computability: no dependency cycles, no dangling `Depends on`.
      5. File paths come from `todo.md`'s `Files:` field, NOT `plan.md` (dep-graph only, no paths).
      6. Generalise the rules source: read the project's root instruction file generically (canonically
         `AGENTS.md`) — do NOT hardcode a Claude-specific rules filename. Keep the glob-the-real-filesystem
         step, consistency checks, and VALID / ISSUES-FOUND output.
      Test: file exists; `B, J, L` tag; references `core/rea-schema.md` (root-relative, not `../..`);
      checks the `U<n>` unit fields; reads file paths from todo.md `Files:` (not plan.md); rules source is
      generic `AGENTS.md` (no hardcoded Claude filename); NO reliance on a `NEXT:` pointer; still globs the
      real project structure; body tool-agnostic; model sonnet.

- [x] Author `templates/agents/dispatcher.md` (edit-heavy · I, H)
      Files: `templates/agents/dispatcher.md`
      1. Carry forward legacy dispatcher (frontmatter verbatim: model sonnet).
      2. Add principle tag `I, H`.
      3. Reframe: dispatcher RECEIVES an already-computed frontier (eligibility `Status: todo` + all
         `Depends on` done is deterministic, computed by the Phase-3 orchestrator and passed in) — it does
         NOT compute the frontier itself.
      4. Job = group the frontier units by PHYSICAL same-file collision: file-disjoint → one parallel group;
         shared file → serialize within batch; UNKNOWN impact → run alone (carry forward the safe default).
      5. File impact per unit comes from `todo.md`'s `Files:` field (not plan.md); grep fallback only if
         `Files:` absent, else `UNKNOWN`.
      6. Drop the "compute the full sequential schedule across all deps" framing. Keep the file conflict map
         and SCHEDULED / BLOCKED return.
      Test: file exists; `I, H` tag; dispatcher receives (does not compute) the frontier; file impact read
      from todo.md `Files:`; groups by physical file conflict; UNKNOWN→serial preserved; no whole-schedule
      language; body tool-agnostic; model sonnet.

- [x] Author `templates/agents/implementer.md` (edit-heavy · D, E, H)
      Files: `templates/agents/implementer.md`
      1. Carry forward legacy implementer (frontmatter verbatim: model sonnet).
      2. Add principle tag `D, E, H`.
      3. Unit model: honour `Files:` / `Done when:` / `Size:` (don't re-split — H); faithful to the unit;
         escalate if scope grows beyond it.
      4. Scoped feedback-gate: inner gate = affected tests + lint ONLY (not the full suite). Refine Step 4b
         from "Tests" to "affected tests". Keep mandatory verify + max-2-retries + BLOCKED-if-failing.
      5. TDD default-on (principle E): a real test before every commit for EVERY unit — rewrite the legacy
         low-risk branch so a test is the default; skip ONLY if genuinely untestable (pure type/rename/
         comment) WITH a stated reason (never silently, never a tautological test); risk tier gates
         RED-GREEN rigor, not test existence.
      6. Preserve risk assessment (as the rigor gate), self-review, escalation, DONE/BLOCKED/NEEDS_CONTEXT,
         Rationalizations, no-fabrication rule.
      Test: file exists; `D, E, H` tag; inner gate is "affected tests + lint", explicitly NOT the full
      suite; keeps the max-2-retries/BLOCKED discipline; TDD default-on (low-risk no longer auto-exempt;
      skip only with a stated untestable reason); body tool-agnostic; model sonnet.

- [x] Author the two light read/spec agents
      Files: `templates/agents/explorer.md`, `templates/agents/spec-reviewer.md`
      1. explorer: carry forward (model haiku verbatim); add principle tag `A, J`; keep/strengthen
         "documentarian, not a critic"; keep read-only phases; no other change.
      2. spec-reviewer: carry forward (model sonnet); add principle tag `K`; add one line that its
         intent-match result feeds the human QA checkpoint; keep PASS/FAIL + Missing/Extra/Wrong +
         Rationalizations.
      Test: both files exist; explorer has `A, J` + "documentarian" framing + model haiku; spec-reviewer
      has `K` + the QA-checkpoint line + model sonnet; bodies tool-agnostic.

- [x] Author the three light scan/debug agents
      Files: `templates/agents/bug-scanner.md`, `templates/agents/security-scanner.md`,
      `templates/agents/debugger.md`
      1. bug-scanner: carry forward (model sonnet); add principle tag `D`; no methodology change.
      2. security-scanner: carry forward (model sonnet); add principle tag `D`; no methodology change.
      3. debugger: carry forward (model sonnet); add principle tag `L`; make the "if testable" nuance
         explicit in Phase 4 (Implementation and Defense) — state the reason when a fix ships without a
         regression test; keep the 4 phases, escalation, Red Flags, Rationalizations.
      Test: all three exist with their tags (`D`, `D`, `L`); debugger states the "if testable" reason
      rule; scanners' methodologies unchanged; models sonnet; bodies tool-agnostic.

- [x] Create `templates/agents/README.md`
      Files: `templates/agents/README.md`
      1. 2–5 lines: what `templates/agents/` is — the redesigned REA sub-agent building blocks (source of
         truth), tool-agnostic; the Phase-4 npx installer places them into each host tool's agent folder;
         per-tool *format* porting (Codex TOML) is parked.
      2. Note the models (explorer = haiku, rest = sonnet) and point to `docs/rea-roadmap.md` §4 Phase 2.
      Test: file exists; explains the dir's purpose + who places it; mentions the parked per-tool-format
      note; links roadmap §4.

- [x] Doc-sync: templates README + project CLAUDE.md + roadmap status
      Files: `templates/README.md`, `CLAUDE.md`, `docs/rea-roadmap.md`
      1. `templates/README.md`: add the `agents/` subdir (redesigned agent set) to the tree description.
      2. `CLAUDE.md`: one line under File Structure for `templates/agents/` (redesign-era agent sources);
         note legacy `rea/templates/.claude/agents/` unchanged.
      3. `docs/rea-roadmap.md`: flip Phase 2 `⬜ → ✅` with a pointer to `.rea/plans/0007-faz2-agents/`.
         In §5: G5 row → craft-checklist wired (done); G2 + G3 rows → append that Phase 2 agents now
         reference the schema (alongside the existing "Phase 3 (used)"). Change no other phase's status.
      Test: `templates/README.md` + `CLAUDE.md` both reference `templates/agents/`; roadmap Phase 2 = ✅
      with the plan pointer; §5 G5 + G2/G3 updated; no other phase status changed.
