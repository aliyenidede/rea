# REA Redesign — Master Roadmap

_The single place to see the whole plan and track status. Depth and rationale live in
[rea-target-state.md](rea-target-state.md) (the design) and [principles.md](principles.md) (the 12
principles); this file consolidates them plus the 2026-07 decisions into a flat, reviewable plan._

**Status legend:** ✅ done · 🔵 planned (plan written) · ⬜ not started · ⏸ parked

**Sources folded in:** `rea-target-state.md` (§1–§9), `principles.md`, `open-source-roadmap.md`,
`researches/cross-cli-instruction-command-discovery.md`, and the 2026-07-21/22 working sessions.

---

## 1. North star

REA is a **portable, disciplined AI-coding workflow**, delivered as **two open-source products that
share one brain**:

- **readev-tools** — the methodology delivered *into* a host you already use (Claude Code, Codex,
  Cursor, Gemini CLI, VS Code…). Methodology-as-guest, via `AGENTS.md` + `.rea/` + commands.
- **rea-cli** (brand: **readev**) — the *same* methodology as its **own** standalone coding-agent CLI,
  built on **oh-my-pi** (engine). A separate repo.

Both read the **same shared core** (principles + craft-checklist + `.rea/` schema), so they never
drift. Usage is **user choice** — a matrix, not a hierarchy:

| You want… | You run… |
|---|---|
| your Claude subscription | readev-tools inside **Claude Code** (sanctioned) |
| API-key / multi-provider / local models | **rea-cli** (oh-my-pi) |
| parallel agents, worktree isolation, mobile, VPS | any of the above inside **Orca** (optional host) |
| Codex / Cursor / Gemini | readev-tools' `AGENTS.md` steering (+ commands where the tool supports them) |

**The moat is the methodology, not the plumbing** — rules battle-tested on a live production codebase
(CAW). Goal is credibility + dogfooding, **not** a SaaS. Don't rebuild Archon; don't chase stars.

---

## 2. Architecture in one screen

- **Layer 1 — tool-agnostic core** (the product): the 12 principles, the craft-checklist, the `.rea/`
  memory + its schema, the `AGENTS.md` content. Plain files any tool (and Obsidian) reads.
- **Layer 2 — thin per-tool wiring**: place the shared files where each tool looks (`.claude/commands`,
  `.omp/commands`, …) + generate small shims (`CLAUDE.md = @AGENTS.md`, Gemini `settings.json`). Command
  *content* is shared markdown; only *placement* is tool-specific — **not** a per-tool rewrite.
  _(Corrects the old "Layer 2 is Claude-only, porting parked" framing — superseded by the oh-my-pi
  finding: omp reads `.omp/commands/*.md` with the same markdown-prompt-as-command model as Claude.)_
- **Cross-tool continuity:** all durable state lives in `.rea/` + `AGENTS.md` → switch Claude ↔ Codex ↔
  rea-cli mid-work and continue. The CLI is the interchangeable engine; **REA is the stable layer.**

---

## 3. The 12 principles (quick reference)

Refer to principles by letter in skills/plans/reviews. Homes below reflect the **redesigned** set.

| # | Principle | Primary home (redesigned) |
|---|---|---|
| A | Grilling starts planning, codebase-aware | `talk` → `rea-grill` → `explorer` |
| B | A plan is layered (destination/journey/detail) | `rea-plan` → spec / plan / todo |
| C | SE knowledge is injected, not passive | **craft-checklist** (Faz 0 ✅ `core/craft-checklist.md`) → `code-reviewer` / `plan-reviewer` _(the old "no reference" Gap is now closed — checklist shipped)_ |
| D | Feedback loops are mandatory | `implementer` scoped gate + tiered tests + `rea verify` |
| E | Test first, code second (TDD) | `implementer` (a test before every commit) |
| F | Prefer deep modules (deep ≠ bloated) | `code-reviewer` (via craft-checklist) |
| G | Human-in-loop vs AFK | `talk`/`rea-grill` = human; `rea-execute` = AFK |
| H | Plan split by smart-zone (~140K); no runtime re-split | `rea-plan` sizes; `rea-execute` fresh-context-per-unit |
| I | Parallel sessions are first-class | plan's dep-graph → `dispatcher` → parallel `implementer`s _(rea-worktree dropped; Orca owns human-level worktrees)_ |
| J | Architecture awareness can't be delegated | `rea-plan`/`rea-init`/`rea-wrap` confirm rules with the human |
| K | QA is the human moment | human gates: plan approval + pre-ship diff review |
| L | Depend on a stack you understand | mechanical CLI; readable prompts; `debugger`; `plan-validator` |

---

## 4. readev-tools — the phases

### Phase 0 — Shared core content ✅
**Status:** done 2026-07-22 (commit `02509db`) — executed via `/rea-execute`; all 6 todos complete, CI green (22 passed, ruff clean), all spec+code reviews PASS.
**Plan:** `.rea/plans/0005-faz0-core/` · **Delivered** (in `core/`, content only):
- `core/principles.md` — the 12 principles, pure statements (strip stale `→ REA:`/Gap lines)
- `core/craft-checklist.md` — short tagged (`CC-NN`) code-quality checklist (deep modules, code smells,
  naming, real error handling, right abstraction). **Closes Principle C's gap.**
- `core/rea-schema.md` — the `.rea/` format spec: dir layout · per-note-type naming (§4) · plan.md
  dep-graph + todo.md unit fields (G2) · status lifecycle + computed frontier, no scalar NEXT (G3) ·
  numbering (G6a) · shim write contract (G6b) · capture note format (§4) · wikilinks · `schema-version`
  + bump policy
- `core/README.md` + doc-sync (repo `README.md`, `CLAUDE.md`, truncate `docs/principles.md` to a pointer)

**Carries:** G2, G3, G5, G6, §4. **Foundation of cross-platform** (tool-agnostic files). **Out:**
packaging/npm, installer, AGENTS.md, commands. Python CLI untouched.

### Phase 1 — AGENTS.md + shims + `.rea/` structure ✅
**Status:** done 2026-07-22 — executed via `/rea-execute`; all 4 todos complete; spec+code reviews PASS;
CI green (22 passed, ruff clean). **Plan:** `.rea/plans/0006-faz1-agents-shims/`.
**Delivers:**
- `AGENTS.md` (thin, always-on): behaviour steering (`talk` default — thinking engineer + curious
  researcher, **anti-sycophantic**) + the **`capture` reflex** (3 triggers: correction/lesson,
  non-obvious decision, bug root-cause; the memory-write filter) + read-pull instruction + a map of
  pointers. **No hooks (G4 — deliberate).**
- per-tool shims: `CLAUDE.md = @AGENTS.md`; Gemini `settings.json` (`context.fileName`)
- the on-disk `.rea/` typed structure (knowledge / decisions / sessions / plans)

**Carries:** G4, §4 write-filter behaviour, the AGENTS.md-standards cross-tool win. **Behaviour side of
cross-platform.**

### Phase 2 — Agents (edit + partial delete) ✅
**Status:** done 2026-07-22 — executed via `/rea-execute`; all agent files authored into `templates/agents/`;
spec reviews PASS; CI green (22 passed, ruff clean). **Plan:** `.rea/plans/0007-faz2-agents/`.
**Delivers** (sub-agent building blocks):
- `explorer` (read-only fact-finder), `implementer` (TDD + scoped feedback-gate)
- review — 4 focused parallel agents: `spec-reviewer` (intent → feeds human K), `code-reviewer`
  (quality F + test-quality + consults craft-checklist C), `bug-scanner` (logic/edge/races),
  `security-scanner` (OWASP)
- `plan-reviewer` (adversarial), `plan-validator` (mechanical), `debugger` (root-cause), `dispatcher`
  (physical file-conflict grouping for parallel fan-out)
- **Drop `rea-router`.** Wire the craft-checklist into `code-reviewer` / `plan-reviewer`.

### Phase 3 — Commands (the main skill delete + rewrite) ✅
**Status:** done 2026-07-22 — executed via `/rea-execute`; all 9 command files + moved `skill-writer`
agent + `templates/commands/README.md` authored, spec + code reviews PASS, CI green (22 passed, ruff
clean). **Plan:** `.rea/plans/0008-faz3-commands/`.
Pipeline: `talk` (behaviour, not a command) → `rea-grill` → `rea-plan` → `rea-execute` → `rea-ship` →
`rea-wrap`; bypass `rea-fix`; reconcile `rea-tidy`; bootstrap `rea-init`.
- `rea-init` — tiered (quick = no GitHub, ~1–2 min; `--full` adds CI + branch protection)
- `rea-grill` — codebase-aware interview; one-question-at-a-time (frontier-batching optional);
  fact/decision split; recommended answer per question; hard confirmation gate; writes `brief.md`
- `rea-plan` — reads `brief.md`, synthesises (does not re-interview) → spec (destination) / plan
  (journey = dependency graph) / todo (detail = vertical slices, smart-zone sized); human approves
- `rea-execute` — AFK: compute frontier via `dispatcher` → parallel `implementer`s (fresh context,
  TDD → scoped inner gate → commit) → after batch, relevant review agents (fresh context) → loop →
  full suite once before ship; resumable from `todo.md` status
- `rea-ship` — situation-aware: detect (repo/remote/protection/CI/deploy/solo-or-team) → suggest →
  confirm; generic deploy (detect the configured redeploy hook); never force
- `rea-fix` — lightweight interactive bypass: debug (root cause) → fix (TDD) → scoped tests → fresh
  review → ship → capture; **escalates** to the full path if scope grows
- `rea-wrap` — light `.rea/`-only session summary; does not commit, no heavy dedup
- `rea-tidy` — reconcile memory + shims + rules; dry-run report → human approval → fix
- `rea-write-skill` — utility: author a new agent/command via the `skill-writer` agent (moved into
  `templates/agents/`)

**Replaces the old set:** `rea-brainstorm` → `talk` + `rea-grill` · `rea-commit` → `rea-ship` · drop
`rea-worktree` · `rea-verify` → CLI verb · `rea-update` → utility, pip/PyPI path obsolete under npx
(D1), out of the Phase-3 nine.

### Phase 4 — npx installer + cross-platform placement + tests ✅
**Status:** code-complete 2026-07-23/24 — installer core + distribution landing (0009, `4da46bc`),
`verify` + `migrate` bridge (0010, `9a6cf58`), and the safe-path/CWE-59 security gate (0011, `a83b216`)
all executed and committed; the residual source-side CWE-59 hole (`rea-archive` FIX D) closed 2026-07-24
(FIX F). `node --test`: 169 pass / 3 win32-EPERM skips / 0 fail. **Only user-gated `npm publish`
(+ optional PyPI 0.7.2 shim) remains** — see §9. Non-gating polish (long-agent trim, skill-writer
audience prose) parked as 4e → a later plan 0012.
**Delivered:**
- ✅ `npx readev-tools setup` (JS installer; **PyPI dropped**, D1) — quick/full tiers. _(Mechanical verb is
  `setup`, not `init` — 0009 Decision 1, avoids the `rea init`↔`/rea-init` collision; overrides D1's
  literal wording.)_ `src/cli.js`, `src/setup.js`, `bin/readev-tools.js`.
- ✅ **manifest-based prune that actually deletes obsolete skills (G1)** + a one-time retired-file list
  for the v0.7.1 → redesign jump. `src/prune.js`, `src/retired-list.js`, `src/manifest.js`.
- ✅ per-tool placement (`.claude/` first-class; host-root `core/`; the `.rea/` typed scaffold) + shim
  writing via managed markers / JSON merge, never blind-overwrite (G6b) — **the real cross-platform
  mechanism**. `src/place.js`, `src/shims.js`, `src/settings-surgery.js`.
- ✅ feedback-gate tiers: inner = affected tests + lint; outer = full suite once; CI = safety net —
  realized in `rea-execute` (Phase 3) reading commands from `AGENTS.md` + the repo `ci.yml` safety net.
- ✅ the mechanical **`npx readev-tools verify`** CLI (files present? shim correct? CI configured?) —
  read-only, manifest-driven. `src/verify.js`.

**Update & delete policy (how a project receives changes when the installer re-runs):**
- **REA-owned files** (commands / agents / core) → **overwritten** with the current version (idempotent
  sync). Customise via *separate* files, never by editing REA files — so overwrite is always safe.
- **Obsolete files** → **deleted** via the manifest prune (G1) + the one-time retired-file list.
- **User-content files** (`CLAUDE.md`, `settings.json`) → **managed-marker / JSON merge**, never
  blind-overwrite (G6b).
- **✓ Resolved (Phase 4d):** the one-time **v0.7.1 → redesign migration UX** — the `npx readev-tools migrate`
  verb; see §10.

### Phase 5 — Private migration ⬜ (personal, not shipped)
Distil this repo's old-format `.rea/` (flat `log/` + `lessons.md` + `plans/0001-0004`) into the new
typed graph (lessons → knowledge/ + decisions/, logs → sessions/, wikilinked). Old `.rea/` archived,
not deleted. May take 2–3 sessions.

---

## 5. Gap closures & decisions → phase map

_All 2026-07-21 closures (rea-target-state §9). "Where" = which phase implements it._

| Ref | Decision | Where |
|---|---|---|
| D1 | Distribution = `npx`, drop PyPI | Phase 4 |
| D2 | Names: readev-tools + rea-cli (readev umbrella) | all / naming |
| G1 | Manifest-based obsolete-file prune + retired list | Phase 4 ✅ (`src/prune.js` + `src/retired-list.js`, 0009) |
| G2 | plan.md/todo.md schema (unit-id join, single-location fields) | Phase 0 ✅ (spec, `core/rea-schema.md`) → Phase 2 ✅ (plan-validator / dispatcher / implementer reference it) → Phase 3 ✅ (used by `rea-plan`'s spec/plan/todo authoring and `rea-execute`'s frontier computation) |
| G3 | Retire scalar NEXT → computed frontier + status re-verify | Phase 0 ✅ (spec, `core/rea-schema.md`) → Phase 2 ✅ (plan-validator / dispatcher / implementer reference it) → Phase 3 ✅ (used — `rea-execute` computes the frontier from `Status:`/`Depends on`, retiring the `NEXT:` scan) |
| G4 | capture = pure `AGENTS.md` reflex, **no hooks** (deliberate) | Phase 1 |
| G5 | single short craft-checklist + mandatory citation | Phase 0 ✅ (written, `core/craft-checklist.md`) → Phase 2 ✅ (wired into code-reviewer / plan-reviewer) |
| G6a | `NNNN-slug` numbering, slug-unique, no central index | Phase 0 ✅ (spec, `core/rea-schema.md`) |
| G6b | shim managed-markers + JSON merge, never blind-overwrite | Phase 0 ✅ (spec, `core/rea-schema.md`) → Phase 4 ✅ (impl: `src/shims.js` + `src/settings-surgery.js`, 0009) |

---

## 6. Cross-platform plan

**Target hosts** (from the cross-CLI research; re-verify — fast-moving):

| Tool | Instruction file | Reads AGENTS.md | Commands | Subagents |
|---|---|---|---|---|
| Claude Code | `CLAUDE.md` (`@import`) | via `@AGENTS.md` shim | `.claude/commands` / `SKILL.md` (MD+YAML) | `.claude/agents/*.md` |
| oh-my-pi | config-inheritance | yes (rule files) | `.omp/commands/*.md` (**same model as Claude**) | task-agent-discovery |
| Codex CLI | `AGENTS.md` | **native** | `.agents/skills/*` (SKILL.md) | TOML `.codex/agents/` |
| OpenCode | `AGENTS.md` | **native** | `.opencode/commands/*.md` | `.opencode/agents/*.md` |
| Gemini CLI | `GEMINI.md` | via `settings.json` | `.gemini/commands/*.toml` (**TOML only**) | `.gemini/agents/*.md` |
| Cursor CLI | `.cursor/rules` + AGENTS.md | **native** | Skills (SKILL.md) | reads `.claude/`+`.codex/` agents |

**The path:**
1. **Instructions port cheaply** — one `AGENTS.md` + two tiny shims (`CLAUDE.md` import, Gemini
   `settings.json`) covers all. → Phase 1.
2. **Commands: markdown-command tools port ~1:1** (Claude, oh-my-pi, OpenCode) — same file, different
   folder. **TOML tools (Gemini) + arg/shell micro-syntax differ.** Codegen-vs-thin-shim for the
   non-markdown tools is **⏸ parked** until a real need; thin-shim fits REA's philosophy better.
3. **Subagents don't port literally** (MD+YAML vs Codex TOML); Cursor reads `.claude/`+`.codex/` as the
   one bridge. ⏸ parked per-tool.
4. **Hooks don't port** (tool-specific event models) — and REA uses none anyway (G4).
5. **Watch:** convergence toward folder-based `SKILL.md` (Claude/Codex/Cursor) — re-check before
   finalising the command layer.

**Practical stance:** first-class today = Claude Code + oh-my-pi (full pipeline). Codex/OpenCode/Cursor/
Gemini get `AGENTS.md` steering now; full command port when demand appears.

---

## 7. rea-cli — the phases (separate repo)

rea-cli is a **co-equal product**, but honestly **downstream of readev-tools**: it vendors the shared core
(Phase 0) and ports readev-tools' commands (Phase 3), so its meaty work follows readev-tools; only the
engine/provider scaffold starts early, in parallel. **Not yet designed in depth** — the phases below are
a sketch. rea-cli will get its **own design pass** (its own grill→plan and its own `rea-cli-target-state`
doc), the way `rea-target-state.md` serves readev-tools.

**Engine (locked):** **oh-my-pi** (MIT, batteries-included Pi fork) as a **plugin/config layer — no hard
fork.** Already ships web search (25-provider), parallel schema-validated subagents, deterministic
multi-subagent workflows, LSP, debugger, browser, git ops. → rea-cli = *packaging + config*, not a
bespoke agent build.

### C0 — Repo + engine scaffold ⬜ (can start early)
Greenfield repo; stand oh-my-pi up as the base (plugin layer, or embed via the Node SDK
`@oh-my-pi/pi-coding-agent`); vendor the shared core. **Depends on:** Phase 0.

### C1 — Provider + auth ⬜ (can start early)
Claude subscription **via the Agent SDK** (sanctioned bridge; **not** raw OAuth — ToS-restricted,
omp/Pi's `/login` OAuth is the grey case) + API-key + multi-provider config. Personal use fine; a
metered credit pool was announced 2026-06-15 then paused → keep the layer flexible. **Volatile —
re-verify.**

### C2 — Command surface ⬜ (waits on readev-tools Phase 3)
Port rea's commands to `.omp/commands/*.md` (~1:1 from the Claude commands); wire the
grill→plan→execute→ship pipeline; reuse omp's native subagents/workflows for execute's parallel fan-out.
**Depends on:** readev-tools Phase 3.

### C3 — Interop + verify ⬜
Round-trip acceptance test: a project touched by rea-cli is **losslessly readable by readev-tools-in-Claude
and vice-versa** (the proof the shared core works). **Depends on:** C2 + readev-tools Phase 1.

### C4 — Branding + distribution ⬜
readev branding; install path; docs; optional Orca-host polish.

**Risk:** single-maintainer upstream (oh-my-pi), like Orca — mitigated by MIT + Node-SDK-embeddable
(fork if it dies).

---

## 8. Genuine open-source track (parallel, mostly non-code)

_From `open-source-roadmap.md`. Goal: a stranger can **find it, get why it matters, and run it in
~10 min.** Demand-driven, not a big-bang launch._

- **T1 — Legibility (front door):** rewrite README (hook + 60-sec quickstart + one real end-to-end
  example); **fix broken project links → canonical org `aliyenidede`** (pyproject/README/PyPI); a 2-min
  demo gif; repo hygiene (tidy the "session lessons" commit noise).
- **T2 — Publish the lessons (highest leverage):** extract 8–10 generalised rules from CAW's production
  `CLAUDE.md` → a writeup ("field notes from running Claude Code on a live trading system") → link from
  README. This is marketing + proof + docs + differentiator in one.
- **T3 — Widen (after signal):** `AGENTS.md` generation (= Phase 1, the cheap cross-tool win) ·
  Obsidian-native brain (point a vault at `.rea/`; graph + backlinks free) · **thin MCP server** (expose
  plan/review/memory as MCP tools — the "Archon at the right scale"; ⏸ only if real cross-tool need) ·
  `CONTRIBUTING.md` + `good first issue`s · distribution (awesome-claude-code lists, r/ClaudeAI, X).
- **Future direction — domain packs:** lean domain-agnostic core + installable packs (coding today;
  research, content, n8n, api later). **Every pack = byproduct of a real task that week, never abstract
  infra.** Don't rebuild Archon.
- **Guardrails:** bar = "others can trust & use it," not stars · maintenance level chosen up front ·
  keep dogfooding (the strongest credibility signal) · scope stays disciplined so REA *accelerates*
  other work, not distracts.

---

## 9. Deferred / per-component decisions

**Separate-repos path confirmed** (2026-07-23, unit 4a-4, `.rea/plans/0009-faz4-installer/`): the
product shape stands exactly as designed in `rea-target-state.md` §9 "Product shape (two products,
two repos)" — no rewrite needed there, this is a confirmation checkpoint only. This repo keeps the
name `rea` and publishes the **`readev-tools`** npm package; **`rea-cli`** is a separate greenfield repo
that vendors Layer 1 (`core/`) one-way.

Resolved when their component is built (not blocking):
- `rea-fix` escalation criterion (when a "small fix" becomes real work) — **decided in 0008** (Phase 3):
  stop + return to the normal path on ANY of {>~3 files; an arch/design (J/K) decision; >1 vertical
  slice/module; `debugger` 3-attempt escalation; >1 smart-zone}
- `rea-ship` solo/team detection method — **decided in 0008** (Phase 3): mechanical — team if >1 distinct
  committer over a defined window (`git shortlog -sne`, last ~50 commits / ~90 days) OR branch
  protection requires reviews OR `CODEOWNERS` exists; else solo
- review-agent diff acquisition (which commit range each review sees) — **decided in 0008** (Phase 3):
  record `HEAD` before a batch; pass each fresh review agent `<pre-batch-sha>..HEAD` + the union of the
  batch `Files:`
- tiered-test tooling for non-Python projects (pytest-testmon is Python-only) — **decided in 0008**
  (Phase 3): read test + lint commands generically from `AGENTS.md`/project rules; language-appropriate
  affected-test selector where one exists, else full-suite fallback
- a prompt-level testing / eval strategy (the whole redesign is prompt content) — **decided in 0008**
  (Phase 3): documentation-style structural acceptance checks (each todo `Test:` line reads an assertion
  off the authored file); a real command-eval harness stays deferred
- a redesign success metric + rollback plan — **decided** (2026-07-23, unit 4a-4): success = dogfood —
  this repo's next feature runs end-to-end through grill→plan→execute→ship on the installed redesign
  command/agent set; rollback = the git tag `pre-redesign-v0.7.1` (unit 4a-5, on the pre-redesign `main`
  HEAD) + `rea-dev` 0.7.1 remains installable from PyPI as a frozen fallback. Full record:
  `.rea/decisions/0001-distribution-and-rollback.md`.
- Obsidian frontmatter (Properties/Dataview) — after the plain wikilink graph

**Carry-forward debt (from P1/P2):**
- **✓ Closed (2026-07-23, 0009):** `core/` placement assumption (Faz 1). The host-project `core/`
  location that `AGENTS.md` and the agents' `core/…` pointers rest on was a *provisional* Phase-1
  assumption (`.rea/plans/0006-faz1-agents-shims/spec.md` "Placement contract for Phase 4"). Phase 4's
  installer now vendors the `core/` trio at the host root verbatim — `src/place.js` `LAYOUT` entry
  `{ srcDir: 'core', destDir: 'core' }` (README excluded) — so every root-relative `core/…` reference
  resolves as-authored; no relocation/rewrite was needed.
- **Long-agent prompt-length refactor (Faz 2)** — several carried-forward agents exceed the ~100-line
  "curse of instructions" guideline; Faz 2 kept them verbatim to preserve battle-tested content
  (`.rea/plans/0007-faz2-agents/plan.md` Decision 6, out of scope). Revisit as a dedicated trim pass, not
  during a carry-forward.
- **✓ Closed (2026-07-23, 0011):** shared `src/safe-path.js` + symlink-escape fix. Closed a CWE-59
  symlink/junction-escape class (arbitrary file write via `npx readev-tools setup`/`migrate`) across the
  installer's write/read/prune paths. This was the must-land-before-`npm publish` security gate. Full
  record: `.rea/decisions/0002-safe-path-hardening.md`, `.rea/plans/0011-safe-path-hardening/`.

---

## 10. Forgotten / to-slot items

_Anything raised that isn't yet placed lands here, then moves into a phase._
- **✓ Resolved (Phase 4d):** **v0.7.1 → redesign migration UX** — how an existing v0.7.1 user crosses the
  breaking jump (Python installer → npx; entire skill set replaced). The retired-file list handles
  *pruning*; the full transition path is the **`npx readev-tools migrate` verb**: `--dry-run` flag-and-guide,
  **archive-not-delete** (never deletes user memory — moves the legacy flat `.rea/log/` + `lessons.md`
  under `.rea/_archive/`; only *removes* the dead SessionStart router hook, preserving every other
  setting), reports remaining legacy artifacts (old `CLAUDE.md` body, legacy CI workflow, legacy lint
  hook script) for the human to review, plus a one-time Claude-legacy bridge (the old `CLAUDE.md` body
  is flagged — "once `AGENTS.md` exists, move the preserved `CLAUDE.md` rules into it" — not
  auto-migrated).
- **✓ Resolved (Phase 4, 0009):** `core/` host-project placement. The installer vendors the full `core/`
  trio (`principles.md`, `craft-checklist.md`, `rea-schema.md`) into every host project at a host-root
  `core/` path so `AGENTS.md`'s map pointers resolve — `src/place.js` `LAYOUT` `core → core` (README
  excluded). Mechanism decided + implemented; no longer an open question.
