# REA Principles

The twelve principles below are the foundation every REA skill is built on. They were
distilled from Matt Pocock's 20 AI-coding principles (see
[`researches/ai-coding-principles.md`](researches/ai-coding-principles.md)) and REA's own
architecture rules, then owned through conversation — each one is kept because it earned its
place, not because it was copied from a source.

REA is mechanical on the outside (a CLI that copies files) and disciplined on the inside (the
slash commands and agents). These principles are that discipline. Every command and every
agent should trace back to one or more of them; when a skill drifts from a principle, the skill
is wrong, not the principle.

The lettering (A–L) is stable — refer to principles by letter in skills, plans, and reviews.

---

## A — Grilling is where planning starts, and it is codebase-aware.

Planning is not briefing the AI; it is thinking *with* it. The AI interrogates, you answer. The
questions are not generic — they come from an AI that has already read the code, so they are
concrete. The AI proposes; the human decides. A good question is worth more than a good answer.

→ REA: `talk` (framing) → `rea-grill` (one-question-at-a-time interrogation),
`explorer` (makes the questioning codebase-aware).

## B — A plan is not one document; it is layered.

"Where we are going" (destination) + "how we get there" (journey) + "what is in the detail"
(spec, todo) are three levels of detail that belong in separate documents. Pile them into one
file and all three degrade.

→ REA: `rea-plan` produces spec / plan / todo as distinct artifacts.

## C — Software-engineering knowledge is not a passive library; it is injected at the right moments.

General principles — deep modules, vertical slices / tracer bullets, TDD, the Pragmatic
Programmer rules — live in a reference the AI can consult, but they are **not** applied
automatically. They are invoked explicitly at the right moment: a hook, a plan step, a review
stage. Left passive, they gather dust and never get used.

→ REA: `code-reviewer` and `plan-reviewer` are the injection points. **Gap:** there is no
shared engineering reference for them to pull from yet — this is the main gap to close.

## D — Feedback loops are mandatory infrastructure.

Lint, typecheck, test — without these the AI codes blind. They are mandatory in REA's own
codebase, and REA detects and flags their absence in the user's project. Code produced without
a feedback loop has a very low ceiling; the fix is to improve the codebase, not to push harder
on the AI.

→ REA: `rea verify` (CLI health check), `rea-init` (wires up lint/test/CI), `implementer`
phase-gate (mandatory lint + test with a retry cap).

## E — Test first, code second (TDD).

If the AI writes code first and tests second, it fits the test to the code. Test → see it fail →
code → see it pass breaks the AI's tendency to "write the test that already passes."

→ REA: `implementer` is TDD-driven — test, then implementation, per cycle.

## F — Prefer deep modules; deep ≠ bloated.

Shallow modules (small, highly coupled, scattered) confuse the AI. Deep modules (large body,
simple interface) are both testable and AI-comprehensible. But "deep" is not "bloated" — a
3,800-line do-everything component is a loss of discipline, not a deep module. The test of a
deep module: it exports little, contains much, and its contents are still readable.

→ REA: `code-reviewer` (single-responsibility, file-size, testability checks).

## G — Work splits into "human-in-the-loop" and "AFK."

Alignment, taste, architectural decisions = human required. Implementation, refactor, writing
tests = can be handed to the AI. Blur the line and you either let the AI decide (bad) or write
the code yourself (slow). REA's command/agent split is built around this seam.

→ REA: `rea-execute` (AFK parallel implementation), planning stays human-in-the-loop.

## H — The plan is split by smart-zone; the agent does not re-split at runtime.

For AFK work, the todo/plan is broken up upfront so each unit finishes without exceeding the
model's **smart zone** (~140K tokens — approximate and model-dependent; the window within which
the model reasons well before attention degrades). When the agent runs, it stays faithful to that
plan — it
does not rewrite the plan and spawn new sessions on its own authority. Splitting the plan is the
job of the human plus the planning skill, not the runtime agent.

→ REA: `rea-plan` (todo sizing), `dispatcher` (groups work for parallel execution).

## I — Parallel sessions are first-class.

Instead of one session, multiple independent sessions can run at once. Switching between them is
fast and their states are visible. Sequential thinking is not imposed where a dependency graph
would allow parallelism.

→ REA: `rea-worktree` (isolated parallel branches), `rea-execute` (parallel dispatch).

## J — Architecture awareness cannot be delegated.

Let the agent write code, but "where does this module sit, what does it talk to" is the human's
question. Principle C (the reference) supports this decision; it does not replace it. Give the
shape of the codebase to the AI and you have handed it a job it is not good at.

→ REA: `explorer` surfaces structure, but the placement decision stays with the human.

## K — Automation does not override taste; QA is the human moment.

Production can be automated; the "is it good?" question cannot. QA is the moment a human imposes
their taste on the code. REA does not make it easy to skip QA — on the contrary, it keeps QA a
visible stage.

→ REA: the human diff-review checkpoint (before ship); `spec-reviewer` feeds it (did the work
match the requirement).

## L — Depend on a stack you understand, not on magic.

We use off-the-shelf tools — but only where we understand them. When something breaks we can
drop into the debugger; we avoid black-box dependencies. No "write everything from scratch"
obsession, but no "I don't know what I am using" either.

→ REA: this is REA's core stance — the CLI is mechanical and dumb, and all intelligence lives in
prompts you can read and change. Nothing is hidden.

---

## Known alignment gaps (feeds the skill audit)

- **C** — No shared software-engineering reference exists for `code-reviewer` / `plan-reviewer`
  to inject. This is the biggest gap.
- **Traceability** — Principles are not yet named inside the skills, so alignment is implicit and
  can silently drift. Skills should cite the principle letters they serve.
- **F, H, J, K** — Embodied only partially; verify each skill actually enforces its principle
  rather than merely relating to it.

_Provenance: distilled 2026-04-26 from Matt Pocock's 20 principles + REA's architecture rules;
brought into REA as a first-class document 2026-07-15._
