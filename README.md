# readev-tools

**A portable, disciplined AI-coding workflow — delivered into whichever coding tool you already use.**

readev-tools drops a battle-tested methodology (planning, review, memory, branch discipline) into any
project as plain files your AI coding tool reads: an `AGENTS.md`, a set of slash commands, composable
review agents, and a typed `.rea/` memory graph. The installer is mechanical — it copies files. All the
intelligence runs through your model.

![CI](https://github.com/aliyenidede/rea/actions/workflows/ci.yml/badge.svg)
![npm](https://img.shields.io/npm/v/readev-tools)
![node](https://img.shields.io/badge/node-%E2%89%A520-brightgreen)
![license](https://img.shields.io/badge/license-MIT-blue)

```bash
npx readev-tools setup <project>     # place commands + agents + core/ + .rea/ + shims
# then open your coding tool in that project and run:  /rea-init
```

That's it — no install, always latest, cross-platform (Windows first-class).

---

## Why

AI coding tools are powerful but start every session cold: no memory of past decisions, no consistent
plan format, no review discipline, no branch rules. You rebuild context every time, and quality drifts
with your attention.

readev-tools gives the model a **fixed structure to operate inside** — the same grill→plan→execute→ship
pipeline, the same typed memory, the same craft checklist — across every project and every session. The
moat is the **methodology**, not the plumbing.

**Cross-tool by design.** The methodology is plain files (`AGENTS.md` + `.rea/`) that every major tool
reads, so you can switch **Claude Code ↔ Codex ↔ Gemini ↔ Cursor** mid-work and continue. The installer
writes each tool's shim (`CLAUDE.md = @AGENTS.md`, Gemini `settings.json`) and never blind-overwrites your
files — user content is preserved via managed markers.

---

## The pipeline

`talk` is a behaviour (a thinking engineer + curious researcher, anti-sycophantic) — always on, not a
command. The commands are the ritual:

| Step | Command | What happens |
|---|---|---|
| **Bootstrap** | `/rea-init` | Tiered setup — quick (no GitHub) or `--full` (CI + branch protection) |
| **Interrogate** | `/rea-grill` | Codebase-aware interview, one question at a time, → `brief.md` |
| **Plan** | `/rea-plan` | Spec (destination) / plan (dependency graph) / todo (sized slices); you approve |
| **Execute** | `/rea-execute` | AFK: parallel `implementer`s (TDD → scoped tests → commit) → fresh-context review → loop |
| **Ship** | `/rea-ship` | Situation-aware commit / PR / deploy — detects state, never forces |
| **Wrap** | `/rea-wrap` | Light session summary into `.rea/` |
| Bypass | `/rea-fix` | Lightweight debug→fix→review→ship; escalates to the full path if scope grows |
| Reconcile | `/rea-tidy` | Reconcile memory + shims + rules; dry-run → you approve |
| Utility | `/rea-write-skill` | Author a new agent/command matching conventions |

Human gates are deliberate: you approve the plan, and you review the diff before ship. Execute is the
only AFK stretch.

---

## Agents

Composable building blocks — commands orchestrate them; **agents never call other agents**, and each also
works standalone.

| Agent | Purpose |
|---|---|
| `explorer` | Read-only codebase research (facts, no opinions) |
| `implementer` | TDD implementation — a test before every commit, scoped feedback gate |
| `spec-reviewer` | Does the diff match the requirement? |
| `code-reviewer` | Quality (deep modules, DRY, test quality) — cites the shared craft checklist |
| `bug-scanner` | Logic bugs, edge cases, races — confidence-scored |
| `security-scanner` | Injection, auth bypass, data exposure — OWASP, attack-path validated |
| `plan-reviewer` | Adversarial plan review — forces gaps into the open before execution |
| `plan-validator` | Mechanical plan checks — rules, file placement, coverage |
| `dispatcher` | Groups work into parallel/sequential batches by file conflict |
| `debugger` | 4-phase root-cause debugging with escalation rules |

---

## Memory — the `.rea/` typed graph

Durable state lives in plain markdown under `.rea/`, tool-agnostic and Obsidian-renderable:

```
.rea/
├── knowledge/   # semantic — what we know (1 note per module / gotcha / concept)
├── decisions/   # ADRs — why (numbered, append-only, supersede-never-overwrite)
├── sessions/    # episodic — what happened, when (timestamped)
└── plans/       # active work (NNNN-slug/{brief,spec,plan,todo}.md)
```

A `capture` reflex writes to it during work (a correction, a non-obvious decision, a bug's root cause),
gated by a filter: record what a *different tool opening this project* would need — not the tool's own
operational chatter. Switch tools, and the next one reads the same graph and continues.

---

## Install & update

```bash
npx readev-tools setup <project>     # first run and every update — idempotent re-sync
npx readev-tools verify <project>    # read-only health check (files present? shims intact?)
npx readev-tools migrate <project>   # one-time v0.7.x → redesign bridge (archives legacy, never deletes)
```

- **REA-owned files** (commands / agents / `core/`) are overwritten with the current version on every run
  — customise via *separate* files, never by editing REA files, so re-sync is always safe.
- **Obsolete files** are pruned via a manifest; **your content** (`CLAUDE.md`, `settings.json`) is
  merged, never blind-overwritten.
- **Legacy note:** `rea-dev` on PyPI (Python CLI, last release 0.7.x) is a frozen deprecation shim — the
  maintained path is `npx readev-tools`.

Requires Node.js ≥ 20. Placement is first-class for Claude Code today (`.claude/`); other markdown-command
tools get the same files in their own folder, and every tool gets the `AGENTS.md` steering.

---

## Scope & philosophy

- **Co-pilot, not autonomous.** The model does the heavy lifting; you make the architecture and QA calls.
- **CLI is dumb, model is smart.** The installer only moves files — every decision lives in the prompts.
- **Battle-tested by dogfooding** on live production codebases, not designed in the abstract.
- **Two products, one brain.** `readev-tools` (this — the methodology as a guest in your tool) and a
  future `rea-cli` (the same methodology as its own standalone agent) share one core, so they never drift.

---

## License

MIT
