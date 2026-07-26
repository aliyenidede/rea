# readev-tools

Bootstraps a structured AI-coding workflow into any project: slash commands, review agents, a plan and
memory system, and branch rules. The installer copies files; the workflow runs inside your AI coding tool
(Claude Code today, and any tool that reads `AGENTS.md`).

[![CI](https://github.com/aliyenidede/rea/actions/workflows/ci.yml/badge.svg)](https://github.com/aliyenidede/rea/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/readev-tools)](https://www.npmjs.com/package/readev-tools)
[![node](https://img.shields.io/node/v/readev-tools)](https://www.npmjs.com/package/readev-tools)
[![license](https://img.shields.io/npm/l/readev-tools)](LICENSE)

```bash
npx readev-tools setup <project>   # place commands, agents, core/, .rea/, and shims
# then open the project in your coding tool and run:  /rea-init
```

## The problem

AI coding tools start every session cold. No memory of past decisions, no fixed plan format, no review
step, no branch rules. You re-explain context each time, and output quality tracks how closely you are
watching.

readev-tools gives the tool a fixed structure — the same commands, plan format, memory layout, and review
agents across every project and session. State lives in files (`AGENTS.md` + `.rea/`), so it survives a
session restart and moves between tools.

Naming, for reference: the GitHub repo is `rea`, the npm package is `readev-tools`, the product brand is
**readev**, the retired PyPI shim is `rea-dev`, and a planned standalone agent CLI is `rea-cli`.

## What it installs

Slash commands — you run these in your coding tool:

| Command | What it does |
|---|---|
| `/rea-init` | Sets up the project. Quick = commands + `.rea/`; `--full` also adds CI and branch protection. |
| `/rea-grill` | Interviews you about the task, one question at a time, aware of the codebase, and writes `brief.md`. |
| `/rea-plan` | Turns the brief into `spec.md` (what and why), `plan.md` (dependency graph), `todo.md` (sized steps). You approve before any code. |
| `/rea-execute` | Runs the plan: groups independent steps, implements each test-first, reviews after each batch, loops until done. Resumable. |
| `/rea-ship` | Commits, opens a PR, or deploys — after detecting the repo's actual state. Asks before acting. |
| `/rea-fix` | Short path for a small fix: debug → fix with a test → review → ship. Escalates to the full pipeline if the fix grows. |
| `/rea-wrap` | Writes a short session note to `.rea/`. |
| `/rea-tidy` | Reconciles memory, shims, and rules. Dry-run first, then you approve. |
| `/rea-write-skill` | Adds a new agent or command to the project, matching REA's conventions, via the `skill-writer` agent. |

Agents — building blocks the commands call, each also runnable on its own:

| Agent | What it does |
|---|---|
| `explorer` | Read-only research: finds files, traces data flow, reports facts. |
| `implementer` | Writes a failing test, makes it pass, commits. Runs affected tests + lint before returning. |
| `spec-reviewer` | Checks the diff against the requirement. |
| `code-reviewer` | Reviews quality against a bundled craft checklist (deep modules, DRY, test quality). |
| `bug-scanner` | Logic bugs, edge cases, races — each with a confidence score. |
| `security-scanner` | Injection, auth bypass, data exposure — each needs a concrete attack path or it is dropped. |
| `plan-reviewer` | Reads a plan adversarially and turns every gap into a decision you answer. |
| `plan-validator` | Mechanical checks: file paths exist, rules followed, todo covers the plan. |
| `dispatcher` | Groups todo items into parallel and sequential batches by file conflict. |
| `debugger` | Four-phase root-cause debugging, with an escalation rule after three failed fixes. |
| `skill-writer` | Authors a new agent or command file matching REA's conventions — the agent behind `/rea-write-skill`. |

Commands orchestrate agents; agents never call other agents.

## The pipeline

```
/rea-grill  →  /rea-plan  →  /rea-execute  →  /rea-ship
 interview      spec/plan/     build + review    commit / PR /
                todo           loop (AFK)         deploy
```

You stay in the loop at two points: you approve the plan, and you review the diff before ship.
`/rea-execute` is the one stretch that runs on its own.

What `/rea-plan` does, after a grill on "add stripe billing":

1. Reads the brief and the relevant files.
2. Writes `.rea/plans/0001-stripe-billing/`: `spec.md` (what and why), `plan.md` (steps as a dependency
   graph), `todo.md` (vertical slices, each sized to fit one context window).
3. Waits for your approval.

Then `/rea-execute`:

1. Reads `todo.md`, works out which steps are unblocked, and asks `dispatcher` to group them.
2. Runs `implementer` on each — test first, then code, then commit — several in parallel when they touch
   different files.
3. After each batch, runs the review agents over the new commits in a fresh context.
4. Loops until every step is done, then runs the full test suite once.

Interrupt any time; re-running `/rea-execute` picks up from the steps still marked incomplete.

## Memory — the `.rea/` graph

```
.rea/
├── knowledge/   # what we know — one note per module, gotcha, or concept
├── decisions/   # why — numbered ADRs, append-only
├── sessions/    # what happened — timestamped notes
└── plans/       # active work — NNNN-slug/{brief,spec,plan,todo}.md
```

The tool writes here during work on three triggers: a correction, a non-obvious decision, or a bug's root
cause. A filter keeps out its own operational chatter — a note goes in only if a different tool opening the
project would need it. Open the project in another tool and it reads the same notes.

## Install and update

```bash
npx readev-tools setup <project>    # first run and every update — safe to re-run
npx readev-tools verify <project>   # read-only: are the files, shims, and CI in place?
npx readev-tools migrate <project>  # one-time move off the old 0.7.x layout (archives, never deletes)
```

Re-running `setup` overwrites the files it owns (commands, agents, `core/`) with the current version and
prunes ones that were removed. It never overwrites yours: `CLAUDE.md` and `settings.json` are edited only
between managed markers, and everything outside them is left alone. Customize by adding your own files, not
by editing installed ones.

Needs Node.js 20 or later. Placement is complete for Claude Code (`.claude/`); other markdown-command tools
get the commands in their own folder, and every tool gets the `AGENTS.md` steering.

## Across tools

`AGENTS.md` and `.rea/` are plain files that Claude Code, Codex, Cursor, and Gemini all read. The installer
writes each tool's pointer to `AGENTS.md` — `CLAUDE.md` imports it, Gemini's `settings.json` lists it —
without touching your other settings. Switch tools mid-task and the next one picks up the same instructions
and memory.

## Legacy

`rea-dev` on PyPI (Python, last release 0.7.x) is a frozen shim that prints a notice pointing here.
`npx readev-tools` is the maintained path. The pre-redesign version is tagged `pre-redesign-v0.7.1`.

## Common questions & contributing

What `setup` writes, whether it overwrites your files, what `.rea/` is, how to update, and how to
uninstall or roll back — all answered in [docs/faq.md](docs/faq.md). To propose a change, run the
test suite, or find the branch/PR workflow, see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
