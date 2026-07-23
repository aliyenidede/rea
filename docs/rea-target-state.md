# REA — Target State

_The design REA is being built toward, derived from the 12 principles ([`principles.md`](principles.md))._
_Last updated 2026-07-21. A destination spec: it records the settled design and the reasoning
behind it. The blow-by-blow decision narration lives in git, not here. **§9 records the 2026-07-21
design-closure decisions; where they conflict with earlier sections, §9 governs.**_

**Terms:**
- **Smart zone** — the ~140K-token window (approximate, model-dependent) within which a model
  reasons well; past it, attention degrades.
- **AFK** — "away from keyboard": autonomous work the agent runs without the human in the loop.
- **CAW** — the author's live production codebase, used here as the real-usage reference.
- **push / pull** (of knowledge) — *push* = a rule the agent always carries; *pull* = a reference
  it fetches only when relevant.
- **`AGENTS.md`** — the Layer-1 instruction file every major AI tool reads on load. In REA it holds
  behaviour steering + the `capture` reflex + a map of pointers (see §5). Kept thin.
- **`.rea/`** — the tool-agnostic memory directory (knowledge / decisions / sessions / plans).
- **frontier** — in a dependency graph, the set of units whose blockers are all done, i.e. what can
  run now. Used by `rea-plan`/`rea-execute` (work units) and, by analogy, by `rea-grill` (askable
  questions).
- **`NEXT`** — _(retired — see §9/G3)_ originally a singular `todo.md` pointer; superseded by
  per-unit `Status` + a computed frontier, so resume works under parallel execution.
- **craft-standard reference** — a bundled, curated doc of classic code-quality standards (Fowler
  code smells, deep modules, tracer bullets, Pragmatic Programmer rules) that review agents consult
  (§5.9).
- Commands are Claude slash commands (`/rea-grill`), referred to by name in prose. The CLI has a
  few verbs (`rea setup`, `rea verify`). `talk` and `capture` are **not** commands (see §5).

---

## 1. The perspective shift

The audit question was "does each skill *mention* the 12 principles?" That was wrong. The real
question is **"does REA actually operate by the principle?"** — behaviour, not annotation.

So the job: shape REA's operations to embody the 12 principles, redesigning the command/agent set
where a principle demands it. The **pipeline shape** already matches Matt Pocock's proven
`mattpocock/skills` flow (the source the principles were distilled from); the **surface** — the
commands, agents, and memory layout — is redesigned. We borrow Matt's patterns (the grill
primitive, the destination/journey plan split, fresh-context review, the push/pull craft standard);
we do not clone the repo.

_(Naming note: the old `rea-brainstorm` becomes `talk` + `rea-grill`; `rea-commit`+deploy become
`rea-ship`; `rea-router` and `rea-worktree` are dropped; `rea-verify` becomes a CLI verb. Details
below.)_

---

## 2. The two layers (foundational)

REA is a **tool-agnostic core** with a **Claude adapter** on top.

| Layer | What it is | Examples | Who uses it |
|---|---|---|---|
| **1 — General core** (tool-agnostic) | Methodology + artifacts + references. Plain files on disk. | The 12 principles; `.rea/`; `AGENTS.md`; the craft-standard reference | **Any** agent — Claude, Codex, Cursor, Gemini — and Obsidian |
| **2 — Tool adapter** (tool-bound) | The surface that *runs* the operations | `.claude/commands/`, `.claude/agents/`, hooks | Claude Code today |

**The rule that follows:** for every change, separate the **general asset** (a doc, reference,
rule, or schema any tool can use) from the **tool wiring** (the skill that invokes it). The general
asset is the product; the wiring is one adapter.

**What is and isn't cross-tool today, honestly:**
- **Layer 1 is genuinely cross-tool now.** `AGENTS.md` + `.rea/` are plain files every major tool
  reads (verified — see [`researches/cross-cli-instruction-command-discovery.md`](researches/cross-cli-instruction-command-discovery.md)).
  So the **methodology, memory, and continuity** port.
- **Layer 2 (the commands/agents) is more portable than first thought.** The command *content* is
  tool-agnostic markdown; only *where* it is placed is tool-specific. Verified 2026-07-21: Claude reads
  `.claude/commands/*.md` and oh-my-pi reads `.omp/commands/*.md` with the **same
  markdown-prompt-as-command model**, and both read `AGENTS.md`-class rule files (omp via
  config-inheritance). So for markdown-command tools the rituals port ~1:1 — the same files in a
  different folder + thin shims, not a per-tool rewrite. Tools *without* a markdown-command mechanism
  still get the discipline via `AGENTS.md` only. (Supersedes the earlier "Layer 2 is Claude-only,
  porting parked" framing; see §9's rea-cli-engine note.)

**Cross-tool continuity (the real test of "cross"):** because all durable state lives in Layer-1
files, you can be mid-work in Claude, open Codex, and *continue* — it reads `AGENTS.md` (behaviour +
reflexes + map) and `.rea/` (memory + plan + `NEXT`) and picks up where you left off. The CLI is the
interchangeable engine; **REA is the stable layer.** Only the ephemeral in-context chat doesn't
carry — and it shouldn't (Principle 2: artifacts carry state, not context). This is *why* memory
lives in `.rea/` (never a tool's native memory) and progress lives on disk.

---

## 3. The 12 principles → primary home

A high-level map: each principle's **primary** home in the design (not every agent that touches it
— for the full wiring see §5).

| # | Principle | Primary home |
|---|---|---|
| A | Grilling, codebase-aware | `talk` (framing) → `rea-grill` (interrogation) → `explorer` (facts) |
| B | Layered plan | `rea-plan` → spec / plan / todo |
| C | SE knowledge injected | craft-standard reference (pulled) → `code-reviewer` / `plan-reviewer` |
| D | Feedback loops mandatory | `implementer` scoped gate + tiered tests + `rea verify` CLI |
| E | TDD | `implementer` (a test before every commit, minimum) |
| F | Deep modules | `code-reviewer` (interface/body/readability, via craft ref) |
| G | human-in-loop vs AFK | `talk`/`rea-grill` = human; `rea-execute` = AFK; halts at decisions |
| H | Smart-zone sizing | `rea-plan` sizes each unit; `rea-execute` fresh-context-per-unit; no runtime re-split |
| I | Parallel sessions | plan's dependency graph → `dispatcher` → parallel `implementer`s |
| J | Architecture not delegable | `rea-plan` / `rea-init` / `rea-wrap` confirm rules with the human |
| K | QA is the human moment | the human gates: plan approval, and the diff checkpoint before ship |
| L | Understood stack, not magic | mechanical CLI; readable prompts; `debugger`; `plan-validator` |

_On K: "the human moment" is every point where the human's taste/approval is required — plan
approval (`rea-plan`) and the diff review before `rea-ship`. The automated review agents (§5)
**feed** these human moments; they are not themselves K._

---

## 4. Memory — the `.rea/` knowledge graph (Layer 1)

REA's memory is `.rea/` markdown — tool-agnostic, **never** a tool's native memory (not Claude's
`~/.claude/memory`). Plain files any agent reads/writes; instructed via `AGENTS.md`; Obsidian
renders the graph.

**Structure:**

```
.rea/
├── knowledge/   # semantic — what we know. 1 note per entity (module / gotcha / concept)
├── decisions/   # ADRs — why. Numbered: 0001-<slug>.md, 0002-…
├── sessions/    # episodic — what happened, when. Timestamped: YYYY-MM-DD-HHMM-<slug>.md
└── plans/       # active work. Numbered dirs (sequential): 0001-<slug>/{brief,spec,plan,todo}.md
```

**Two kinds of write, don't conflate them:**
- **The knowledge graph** (`knowledge/` + `decisions/` + `sessions/`) is written by the **`capture`
  reflex** (continuously) and lightly consolidated by **`rea-wrap`** (session end). This is the
  durable, cross-session brain.
- **The `plans/` dir** (`brief`/`spec`/`plan`/`todo`) is the pipeline's own working output —
  written by `rea-grill` (brief), `rea-plan` (spec/plan/todo), and updated by `rea-execute`
  (`NEXT`). Commands that record a lasting decision do so through `capture` into `decisions/`.

**Read = pull.** `AGENTS.md` tells any agent: read the relevant `.rea/` notes on demand, follow
their `[[links]]`; never auto-dump the whole memory (Principle 2 / smart-zone).

**`capture`** — a standing `AGENTS.md` reflex (not a command), triggered by *events* during any work
(including plain chat), on 3 triggers: (1) a user correction / a lesson, (2) a non-obvious decision,
(3) a bug root-cause. Writes a small note. Commands also invoke it (e.g. `rea-grill` capturing a
resolved decision). Because it's always-on it fires even in commandless chat — which real usage
(CAW) showed is the majority of work. It revives REA's existing-but-dead self-improvement loop,
graph-aware and cross-tool.

**Naming, links, and collision (per note type):**
- **`knowledge/`** = entity-name, **update-in-place** — the name is the stable address `[[mover-capture]]`
  resolves to. Cheap: no dedup search. **Collision guard:** before writing `knowledge/<entity>.md`,
  if it exists, `capture` reads it to confirm the *same* entity; a *different* concept colliding on
  the name is disambiguated (`mover-capture-2` or a more specific name). One read, only on collision.
- **`decisions/`** = numbered ADRs (append; supersede an old one with a new one, never overwrite).
- **`sessions/`** = timestamped (naturally unique).
- **Wikilinks:** unique entity names resolve bare (`[[mover-capture]]`); the repeated filenames
  inside `plans/*/` (`plan.md`, `spec.md`) use **path-qualified** links (`[[plans/0003-x/plan]]`).

**Memory-write filter (an always-on `AGENTS.md` rule):** memory records **project / domain knowledge
and decisions** (durable, tool-agnostic), **not the CLI's own operational mistakes** ("Claude forgot
to run the test / hallucinated a name" — tool-specific noise). Test: *would this note be true and
useful if a different CLI opened the project?* Yes → write it; about the tool's own behaviour → skip.
Writes go only to `.rea/` — never `CLAUDE.md` or native memory — so memory stays portable across tools.

**Dedup / conflicts → `rea-tidy`** (§5.8), occasional and human-reviewed. Dedup is **fault-tolerant**
— a skipped cleanup leaves harmless clutter, not lost data (unlike `capture`, which must be
continuous). No engine-less auto-dedup; this is the deliberate, cheap way to pay the cost. Obsidian's
graph is the visual backstop for dupes/orphans.

**Division of labor:** capture = continuous + cheap · wrap = light · tidy = occasional + human.

**Grounded in real usage (CAW):** the write side was effectively dead (memory frozen ~2 weeks during
a very active period) while reads stayed alive — which is exactly why write must be continuous
(`capture`), not gated behind a session-end command that gets skipped.

Obsidian renders the wikilinked graph out of the box; frontmatter (Properties/Dataview) is a later
phase.

---

## 5. The skill set

**Pipeline:** `talk` *(behaviour, not a command)* → `rea-grill` → `rea-plan` → `rea-execute` →
`rea-ship` → `rea-wrap`. `rea-fix` is a lightweight bypass; `rea-tidy` reconciles; `rea-init`
bootstraps.

**Commands (human-invoked rituals):**

| Command | What it does | Principle |
|---|---|---|
| `rea-init` | Bootstrap a project — tiered (§5.1) | L |
| `rea-grill` | Codebase-aware interview → shared understanding, writes a brief (§5.2) | A |
| `rea-plan` | Synthesize the brief into layered spec / plan / todo, smart-zone sized (§5.3) | B, H |
| `rea-execute` | AFK build: parallel implementers, TDD, fresh-context review, capture (§5.4) | D, E, G, I |
| `rea-ship` | Situation-aware commit / PR / deploy / health-check (§5.5) | L, K |
| `rea-fix` | Lightweight bypass: talk + disciplined plan-less execute (§5.6) | G |
| `rea-wrap` | Light `.rea/`-only session summary — no commit, no dedup (§5.7) | — |
| `rea-tidy` | Reconcile artifacts: memory + shims + rules, human-in-loop (§5.8) | F |

Not commands: **`talk`** (default `AGENTS.md` behaviour steering, below) and **`capture`** (memory
reflex, §4). **`rea verify`** is a mechanical CLI check, not a Claude ritual (§5.9). Utilities:
`rea-write-skill`.

**Agents (sub-agent building blocks):**
- Generative **research is not a separate agent** — it's the `talk` behaviour (main agent). A
  research sub-agent is added later only if heavy external dives bloat context.
- **`explorer`** — documentarian, read-only fact-lookup for `rea-grill` / `rea-plan`;
  "documentarian, not a critic." · A, J
- **`implementer`** — TDD (a test before every commit, minimum) + scoped feedback-gate (affected
  tests + lint, not the full suite) + faithful to the plan unit. · D, E, H
- **Review — 4 separate, focused, parallel agents:** `spec-reviewer` (matches intent — feeds the
  human K checkpoint) · `code-reviewer` (quality F + a test-quality check + consults the craft
  standard C) · `bug-scanner` (logic / edge / races) · `security-scanner` (OWASP). The relevant
  ones run after each batch, in fresh context.
- **`plan-reviewer`** — *adversarial* plan review: gaps, unresolved decisions, pre-mortem. · A, B
- **`plan-validator`** — *mechanical* plan check: rules compliance, file placement, plan↔todo
  coverage / orphan detection (filesystem = source of truth). Complements `plan-reviewer`
  (dumb-but-thorough vs adversarial-judgment). · B, J, L
- **`debugger`** — root-cause: 4 phases, backward trace, escalation; "if testable" needs a stated
  reason. · L
- **`dispatcher`** — groups the frontier by *physical* file-conflict for parallel fan-out (the plan
  gives logical deps; this catches same-file collisions). Invoked by `rea-execute` (§5.4 step 2). · I, H

Dropped: **`rea-router`** (no principle demands session-start routing) and **`rea-worktree`**
(parallelism comes from sub-agent fan-out, not git worktrees).

**The three non-skill buckets (keeps `AGENTS.md` thin):**
- **`AGENTS.md` (thin, always-on):** *behaviour steering* — the `talk` default: a thinking engineer
  + curious researcher, **anti-sycophantic** (disagrees when warranted, no flattery, grounds
  claims; a role is *not* assigned, behaviour is *steered*); the `capture` reflex (trigger +
  one-line filter); a read-pull instruction; and a **map** of pointers. Loads every session → stays
  minimal. No command-specific detail, no tool-specific names.
- **Agents carry their own discipline** (loaded only when the agent runs).
- **Knowledge store, pulled on demand:** [`principles.md`](principles.md), the craft-standard
  reference, and `.rea/`.

### 5.1 rea-init — fast, tiered

Today's init forces GitHub upfront (auth, workflow scope, branch protection, CI, secrets) — a wall
just to *try* REA. Split it:
- **Quick (default, ~1–2 min):** the minimum to work — generate `AGENTS.md`, the `.rea/` structure,
  the `core/` reference trio, and the per-tool shims (`CLAUDE.md` = `@AGENTS.md`; Gemini `settings.json`).
  **No GitHub, no CI, no branch protection.** `pip install → rea setup . → /rea-init` → ready to
  `talk` / `rea-grill` / `rea-plan`.
- **Full (opt-in, later):** adds CI + branch protection + secrets. `/rea-init --full`.

init **creates** the shims; `rea-tidy` reconciles them if they later drift.

### 5.2 rea-grill — the interrogation ritual

After `talk` frames the idea, `rea-grill` resolves every decision. Project-aware — uses `explorer`.
- **Mechanism:** default **one question at a time** (walks the decision tree). The user can switch
  to **frontier-batching** at any moment (ask all currently-answerable questions as one numbered
  round, recompute after answers, parallel fact-finding); `rea-grill` may *suggest* frontier when
  many independent questions pile up. No forced upfront choice.
- **Adopted from Matt's `grilling`:** the **fact/decision split** (facts → look them up yourself;
  decisions → put them to the user); a **recommended answer** with every question; a hard
  **confirmation gate** — don't proceed until the user confirms shared understanding.
- Captures crystallised decisions/terms to the knowledge graph (via `capture`).
- **Output artifact:** writes the synthesised shared understanding to **`.rea/plans/<NNNN>/brief.md`**
  — the durable handoff `rea-plan` reads (so plan can run in a later session/tool without the chat).

### 5.3 rea-plan — layered

Reads `rea-grill`'s **`brief.md`** and **synthesises** it (does **not** re-interview). Produces
three layered docs (Principle B), ordered spec → plan → todo:
- **spec.md** — *destination*: what / why, scope, key constraints.
- **plan.md** — *journey*: a **dependency graph** of the work units (not an algorithm dump). Each
  unit's blockers are explicit → the *frontier* is what `rea-execute` runs in parallel.
- **todo.md** — *detail*: the atomic units — each a **vertical slice** (end-to-end, demoable) sized
  to fit **one smart zone**. The plan does the splitting; the runtime never re-splits (H).

Gates: the human **approves the plan** and confirms architecture decisions (K, J); crystallised
decisions go to `.rea/decisions/`. Does **not** re-grill, re-split at runtime, or embed code.

### 5.4 rea-execute — the AFK build

Governed by G (AFK), with E, D, H, I, C. On `/rea-execute`:
1. **Read the plan** — pick the target plan dir under `.rea/plans/` (the one with an open `NEXT`, or
   named as an argument); load `plan.md` (dependency graph) + `todo.md`.
2. **Compute the frontier via `dispatcher`** — the units whose blockers are done, grouped by
   physical file-conflict (file-disjoint units can run in parallel).
3. **Spawn an `implementer` sub-agent per frontier unit** (parallel where file-disjoint), each in
   **fresh context**: TDD (failing test → code) → **affected tests + lint only** (scoped inner gate)
   → commit → return a short summary (DONE / BLOCKED / concerns).
4. **Orchestrator stays lean** — holds only summaries. Updates `todo.md` (mark done, advance `NEXT`).
5. **After the batch, the relevant review sub-agents** (fresh context) review the diff — spec /
   code+test-quality / bug / security — against the craft standard.
6. **Loop** — recompute the frontier until the plan is done or a **decision / blocker** halts it for
   the human (G).
7. **Before ship**, run the **full suite once** (outer gate); CI is the safety net.

**Why it stays in smart-zone / enables full AFK:** heavy work happens in per-unit fresh sub-agent
contexts (discarded after); the orchestrator holds only summaries; progress lives in `todo.md`
(`NEXT`) → a dead session resumes by re-running `/rea-execute`.

**Placement:** this orchestration lives in the `rea-execute` command file (loaded only when invoked)
— nothing execute-specific goes into `AGENTS.md`. The discipline (TDD, gate) lives in `implementer`.

**Feedback-gate tiers** (fixes the 4000-tests-per-todo problem): inner (per unit) = affected tests
(`pytest-testmon` / hex-graph trace) + lint; outer (before ship) = full suite once (+ `pytest-xdist`);
CI = full suite safety net.

**Cross-tool:** the fan-out is **sub-agent orchestration** (not Claude-specific) — it works on any
sub-agent-capable tool once that tool's agent definitions are generated (parked, §2). A tool without
sub-agents (rare) gets a warning.

### 5.5 rea-ship — situation-aware (detect → suggest → confirm, never force)

Merges commit + deploy. Governed by L (act on the real, detected state — no magic), K (human diff),
G (confirm outward actions).
1. **Detect** (mechanically): git repo? remote? branch protected? branch strategy? CI? deploy target
   (any configured webhook / redeploy hook)? solo or team?
2. **Suggest** the appropriate flow — confirm every consequential step, never force:
   - no repo → local commit / offer `git init`; remote missing → local commit / offer a remote
   - main protected → propose a branch + PR *(solo → can't self-approve a PR; use the commit-time
     diff checkpoint instead of a PR gate)*
   - CI present → wait for green; deploy target present → offer deploy + health-check; none → stop
     at PR / push
3. **Safety:** secret-check + diff before commit (mechanical git pathspec, not model-improvised);
   the human sees the diff (K).
4. **Never force:** push / PR / deploy are all *proposals* the user confirms or adjusts.

Deploy is **generic** — it detects whatever redeploy mechanism the project configured (a webhook, a
platform hook) and offers push → CI → redeploy → health-check. (Modelled on the author's Coolify
pipeline, but not hardcoded to it.) Almost entirely git/gh mechanics → ports as a plain command.

### 5.6 rea-fix — the lightweight bypass (interactive)

Real usage (CAW) is mostly chat-debug → fix → commit, which **skips execute's principles** (no TDD,
no review, no gate, no capture) and causes problems. `rea-fix` is the disciplined version:
**talk (understand / debug via `debugger`) + plan-less execute** —

debug (root cause) → fix (**TDD**) → **scoped tests + lint** → **fresh-context review** (the relevant
review agents) → ship → **capture**.

It is **interactive / human-supervised**, not a big AFK loop: the work is small and synchronous, so
it needs no `NEXT`/resume machinery. **Every execute quality gate stays** — the only thing skipped is
the plan stage. **Escalation:** if a "small fix" turns out to be real work (multiple files, a design
choice, ballooning scope), `rea-fix` **stops and returns to the normal path** (`rea-grill` →
`rea-plan` → `rea-execute`). "Thought it was small, but it grew → escalate."

### 5.7 rea-wrap — light, `.rea/`-only session close

Since `capture` writes the critical stuff continuously, `rea-wrap` is a small, safe "close cleanly"
ritual:
- Writes a **session summary** to `.rea/sessions/` (what the session did, key decisions, open
  threads / `NEXT`) + light consolidation (link the session's captures).
- **Writes only to `.rea/`** — never `CLAUDE.md` or native memory.
- **Does not commit** (that's `rea-ship`) — suggests it if there are uncommitted changes.
- **Does not auto-write architecture rules** — suggests, the human confirms (J).
- **No heavy dedup** (that's `rea-tidy`).
- **Fault-tolerant + low-friction:** a skipped wrap only loses the summary (capture already saved the
  critical stuff). Suggested at natural end-points, never forced; a Claude Stop-hook nudge is an
  optional Layer-2 bonus.

### 5.8 rea-tidy — reconcile the persistent artifacts

One coherent job — *keep on-disk state consistent* — across three artifact kinds (all occasional,
fault-tolerant, human-reviewed):
- **Memory:** orphans, conflicts, dedup (same concept, different names).
- **Shims:** `CLAUDE.md` ↔ `AGENTS.md` drift, `.gemini/settings.json` config.
- **Rules:** stale / conflicting rules.

Runs as **dry-run report → human approval → fix** (`rea-tidy --check` = report only). Absorbs what a
health-check skill would do — which is why there is no `rea-verify` skill.

### 5.9 rea verify — a mechanical CLI check (not a skill)

Setup is `rea-init` (idempotent — re-running re-syncs shims); intelligent reconciliation is
`rea-tidy`. What's left is mechanical (files present? shim correct? CI configured?) — a **dumb
`rea verify` CLI** ("CLI is dumb, Claude is smart"), not a ritual.

### 5.10 migration — a private one-off skill (not shipped)

Public REA ships the new `.rea/` format as the default; a new project starts with it, no migration
burden. For the author's existing projects (e.g. CAW) with a large old-format `.rea/` (flat `log/` +
`lessons.md` + `plans/`), a **private, one-off migration skill** — *not* in the REA templates —
distils the old data into the new typed graph (lessons → `knowledge/` + `decisions/`, logs →
`sessions/`, wikilinked). It may take 2–3 sessions for a clean result; the old `.rea/` is archived,
not deleted.

---

## 6. What REA looks like when this is done

**Pipeline:** `talk` (behaviour) → `rea-grill` → `rea-plan` → `rea-execute` → `rea-ship` →
`rea-wrap`; `rea-fix` = lightweight bypass, `rea-tidy` = reconcile, `rea-init` = bootstrap.

- **Layer 1 is the product:** the 12 principles, a craft-standard reference, and a wikilinked
  `.rea/` brain — tool-agnostic files. `AGENTS.md` exposes behaviour + reflexes + a map; **switch
  tools mid-work and continue**; Obsidian gives a free graph.
- **`talk`** is the default chat stance — a thinking engineer + curious researcher
  (anti-sycophantic), not a passive executor; it frames an idea before anything formal.
- **Planning** is a codebase-aware interview (`rea-grill` → `brief.md`) → a layered spec/plan/todo,
  each unit a vertical slice sized to one smart zone, with a dependency graph.
- **Execution** runs implementers in parallel, fresh context per unit, TDD on every unit, a scoped
  inner gate + full suite at the boundary, resumable from disk → full AFK.
- **Review** happens in fresh-context sub-agents on the real dimensions (spec / code / bug /
  security), against the spec and a real craft standard; findings feed the human's diff review.
- **Memory** fills continuously (`capture`), closes lightly (`rea-wrap`), reconciles occasionally
  (`rea-tidy`) — tool-agnostic, never a CLI's own mistakes.
- **Human checkpoints** stay where taste / architecture / QA live: plan approval, architecture-rule
  confirmation, the diff-review before code ships.

### Later workstreams (design decided, implementation pending)
- **AGENTS.md cross-tool** — the *decision* is made and verified (canonical `AGENTS.md` + per-tool
  shims: `CLAUDE.md` = `@AGENTS.md`, a Gemini `settings.json` snippet; Codex/OpenCode/Cursor read it
  natively). The *implementation* (emitting them from `rea-init`) is the pending work.
- **Command / agent portability** — sub-agent orchestration works on any sub-agent tool, but the
  agent-definition format differs per tool (Claude/Gemini MD, Codex TOML). Codegen vs thin shim:
  parked until a real need appears.
- **CLI polish + 5-minute setup** — the tiered `rea-init`; fix the `pyproject` project links
  (canonical org = `aliyenidede`).
- **Obsidian frontmatter** — after the plain wikilink graph.

---

## 7. Settled choices (quick reference)

The design is settled; this lists the non-obvious outcomes (the *how-we-got-here* is in git):

- **canonical org** = `aliyenidede`; **distribution** = `npx` (PyPI dropped — §9/D1); **naming** =
  `rea-tools` (methodology) + `rea-cli` (agent, brand `readev`) — §9/D2
- **smart zone** = ~140K, model-dependent
- **K** = every human-review gate (plan approval + pre-ship diff), not a PR gate; automated review
  agents feed it
- **rea-wrap** suggests, never auto-writes/commits
- **wikilinks** = bare entity names, path-qualified only where filenames repeat (`plans/*/`)
- **Obsidian frontmatter** = later; **vault scope** = `.rea/`
- **dropped** `rea-router` + `rea-worktree`; **kept** `plan-validator` (mechanical, distinct from
  `plan-reviewer`); **`rea-verify`** → a CLI verb, not a skill
- **migration** = a private one-off skill, not shipped

---

## 8. Sequence (implementation)

1. **Craft-standard reference** — write the curated doc; wire it into `code-reviewer` / `plan-reviewer`.
2. **`AGENTS.md` core** — behaviour steering + `capture` reflex (+ memory-write filter + collision
   guard) + read-pull + the map. Thin. Plus the per-tool shims and the `.rea/` typed structure.
3. **The agents** — `explorer`, `implementer`, the 4 review agents (+ test-quality in
   `code-reviewer`), `plan-reviewer`, `plan-validator`, `debugger`, `dispatcher`. Drop `rea-router`.
4. **The commands** — `rea-grill` (+ brief), `rea-plan`, `rea-execute`, `rea-ship`, `rea-wrap`,
   `rea-fix`, `rea-tidy`, `rea-init` (tiered).
5. **Tiered tests + `rea verify` CLI** — the feedback-gate tiers and the mechanical health check.
6. **Private migration skill** *(personal, not shipped)* — distil the existing CAW `.rea/` into the
   new graph, one-off.
7. **Later** — CLI polish + 5-min setup; command/agent portability; Obsidian frontmatter.

---

## 9. Design-closure decisions (2026-07-21)

A working session closed the open design gaps and set the product shape. Where these conflict with
earlier sections, this section governs.

### Product shape (two products, two repos)
- **Two products, one shared "REA brain":**
  - **rea-tools** — the methodology delivered *into* a host (VS Code, Claude Code, Codex, …). This is
    the design in §1–§8. Methodology-as-guest; steers via `AGENTS.md` + `.rea/`.
  - **rea-cli** (brand: **readev**) — the *same* methodology as its own standalone coding-agent CLI.
    Engine = **oh-my-pi** (a batteries-included MIT fork of Pi), used as a **plugin/config layer, not a
    hard fork** (see "rea-cli engine" below; Archon/Pi-self-host/VPS remain out of scope). A **separate
    greenfield repo with its own plan** — not part of §8.
- **`readev`** = the umbrella/brand over both (optional).
- **Repos:** the current `rea` repo evolves into **rea-tools** (keeps history); rea-cli is greenfield
  and **vendors Layer 1** (principles + craft-checklist + `.rea/` schema) as a clean one-way
  dependency. → Layer 1 becomes a **versioned, schema-specified, vendorable package** — a new
  implementation **item 0**, ahead of §8.1.
- **Orca** (an ADE desktop app running terminal agents in isolated worktrees, bring-your-own
  subscription) is an **optional host** for rea-cli, not a dependency. It owns worktree isolation →
  double-confirms the dropped `rea-worktree`. Usage is a **user-choice matrix**: rea-cli standalone ·
  rea-cli in Orca · rea-tools in VS Code · rea-tools in any CLI.
- **Framing amendment:** §2's "REA is the stable layer, the CLI is the interchangeable engine" and
  Principle L's "CLI is dumb, Claude is smart" describe **rea-tools' mechanical installer**. rea-cli
  is deliberately REA-*as-engine* (intelligent); scope those framings to the installer, not to rea-cli.

### D1 — Distribution
rea-tools ships via **`npx`** (JS installer); **PyPI dropped**. Install: `npx rea-tools init` (or
`npx github:aliyenidede/rea-tools init`). Rationale: rea-tools is just files; the audience already has
Node (AI CLIs are npm-distributed); cross-platform incl. Windows; zero-install, always-latest. The npm
package doubles as the vendorable Layer-1 artifact.

### D2 — Naming
**rea-tools** (methodology toolkit) + **rea-cli** (standalone agent); **readev** = optional umbrella
brand. Resolves the earlier `rea`-means-two-things collision: the mechanical installer keeps the
`rea-tools` name/verbs; the intelligent agent is `rea-cli`/`readev`.

### Gap closures
- **G1 — obsolete-file cleanup:** the installer writes a per-project **manifest** of REA-owned files;
  each run prunes files it previously owned that are no longer in the template set, and **never touches
  files it doesn't own** (user extensions survive). A one-time hard-coded "retired files" list bridges
  the v0.7.1 → redesign jump (no prior manifest exists).
- **G2 — plan/todo schema:** `plan.md` = the dependency graph only — a table
  `| Unit | Title | Depends on |` (+ optional Mermaid). `todo.md` = one section per unit with a fixed,
  regex-checkable header: `Files:` · `Done when:` · `Size:` · `Status:` (unit-id from the
  `### U3 — …` heading). **unit-id is the join key**; each field lives in exactly one place (no drift):
  `Depends on` only in plan.md; `Files`/`Done when`/`Size`/`Status` only in todo.md.
- **G3 — resume under parallel execution:** the singular `NEXT` pointer is **retired**. Progress = each
  unit's `Status` in todo.md (single source of truth). The **frontier is computed** each run:
  `Status: todo` ∧ all `Depends on` are `done`. Statuses: `todo → in-progress → done | blocked`. Resume
  = re-run `/rea-execute`; `in-progress` units from a dead session are re-verified (commit exists →
  `done`, else → `todo`).
- **G4 — capture reliability:** capture stays a **pure `AGENTS.md` reflex** + the capture steps already
  embedded in commands. **No hooks** — a *deliberate* choice: hook-injected reminders caused intrusive
  over-triggering in practice (the model treats them as directives, nags, acts without asking; cf. the
  dropped `rea-router`). Accepted trade-off: best-effort chat-capture over intrusive enforcement. (This
  amends §5.7, which had offered a Stop-hook as an optional bonus.)
- **G5 — craft standard:** a **single short `craft-checklist.md`** in Layer 1 (deep-vs-shallow module,
  code smells, naming, real error handling, right abstraction) — *not* a multi-file prose reference and
  **no targeted-pull machinery** (it's short → read in full). `code-reviewer`/`plan-reviewer` **must tag
  each finding with the checklist item** it maps to (keeps it active, not dusty). Grow only if it proves
  too thin.
- **G6a — parallel numbering:** `plans/` and `decisions/` keep `NNNN-slug` names, but **uniqueness comes
  from the slug, not the number** → parallel branches producing `0007-auth` + `0007-cache` are different
  dirs and merge cleanly; duplicate numbers are cosmetic, renumbered occasionally by `rea-tidy`. **No
  central index file** (that would be the conflict point) — the directory listing is the index.
- **G6b — shim write semantics:** the installer **never blind-overwrites**. The markdown managed-marker
  shims are **`AGENTS.md` + `CLAUDE.md` only**, written inside **managed markers**
  (`<!-- rea-tools:start … end -->`); re-init replaces only the managed region, preserving user content.
  **REA never writes a `GEMINI.md` file** — Gemini is served by a **structured read-modify-write merge**
  into `.gemini/settings.json`, whose `context.fileName` lists `AGENTS.md` (REA's file) alongside
  `GEMINI.md` (Gemini's own native file, preserved as a default); every other key is kept. Ownership is
  tracked via the G1 manifest; `rea-tidy` reconciles later drift.

### rea-cli engine — decided 2026-07-21 (verified)
- **Engine = `oh-my-pi` (omp)** — a MIT, batteries-included rewrite/fork of Mario Zechner's Pi
  (`can1357/oh-my-pi`). rea-cli is built as a **layer on omp, not a hard fork** — fork only if a core
  behaviour the extension system genuinely can't reach appears. Rationale: omp already ships what rea-cli
  would otherwise build — **web search (25-provider), parallel schema-validated subagents, deterministic
  multi-subagent workflows**, LSP, debugger, browser, git ops — plus a full extension surface.
- **How rea's surface ports (verified):** omp reads **markdown slash-commands** from
  `.omp/commands/<name>.md` (project) / `~/.omp/agent/commands/` (user) — the *same*
  markdown-prompt-as-command model as Claude Code's `.claude/commands/`, so rea's commands port ~1:1.
  Behaviour steering ports via omp's **config-inheritance** (auto-reads Cursor/Cline/Copilot-style rule
  files → the AGENTS.md class) + `system-prompt-customization`; sub-agents via `task-agent-discovery`; TS
  extensions + MCP for anything tool-shaped. → the parked "command/agent portability" (§2/§6) is
  **near-free for omp** — the same markdown files, not a re-authoring.
- **So rea-cli = omp (engine) + rea-tools' methodology files** (AGENTS.md + `.rea/` + craft-checklist +
  commands rendered to `.omp/commands/`) **+ Claude-sub-via-Agent-SDK provider config + branding.** It is
  *packaging + config*, not a bespoke agent build — weeks, not months.
- **Claude auth (verified, volatile):** the sanctioned way to use a Claude **subscription** in a
  third-party agent is the **Claude Agent SDK** (Anthropic's official bridge; support.claude.com article
  15036540), *not* a raw subscription OAuth token (that pattern — the OpenClaw case, which omp/Pi's
  `/login` OAuth path resembles — was ToS-restricted Feb–Apr 2026). Personal/local use is fine. A metered
  per-plan credit pool for programmatic use ($20/$100/$200) was announced for 2026-06-15 then **paused**;
  Agent-SDK usage currently still draws on normal subscription limits, but metering may return → keep the
  provider layer flexible (Agent-SDK-sub + API-key + other providers).
- **Dependency risk:** omp is single-maintainer (like Orca); mitigated by MIT + Node-SDK-embeddable
  (`@oh-my-pi/pi-coding-agent`) → fork if it dies.

### Deferred (per-component, decided when that component is planned)
`rea-fix` escalation criterion · `rea-ship` solo/team detection · review-agent diff acquisition ·
tiered-test tooling for non-Python projects (**decided in 0008**) · a prompt-level testing/eval
strategy (**decided in 0008**) · a redesign success metric + rollback plan.
