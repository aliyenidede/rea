---
name: plan-as-knowledge-capsule
description: Deep session knowledge — a bug, its exploit, the fix, and the traps — is best captured as an executable .rea/plans/ entry the next session runs without rediscovery; notes only point at it.
type: knowledge
links:
  - core/rea-schema
  - rea-redesign-principle-derived-cross-tool
---

# Plan as knowledge capsule

**Doctrine.** When a session ends holding deep, hard-won knowledge — an exact bug, its exploit, the
correct fix, and the subtle failure modes around it — the highest-fidelity place to put it is an
**executable plan** (`.rea/plans/NNNN-<slug>/`, format per [[core/rea-schema]]), not prose a future
session must re-derive. A plan is *runnable*: the next session executes it with zero rediscovery. A
note is only a *pointer* — it still forces the reader to re-learn everything it gestures at. So the
plan is the source of truth; memory and `knowledge/` notes point **at** it, they never restate it.
Origin: `.rea/plans/0011-safe-path-hardening/`, authored the moment a live CWE-59 symlink-escape was
found rather than logged as "fix later" — a bare note would have made the next session re-earn what
this one already knew (lessons.md, 2026-07-23 20:05).

**Corollary — the meta-rule that governs Phase-5 capture.** Most of what a session learns is
*operational*: work to do, a reflex, a gotcha bound to an in-flight change — that stays in a plan or
in `lessons.md`, where it drives the next action. Only **durable domain facts** — a stable truth
about a module, a concept, or a constraint that outlives any single task — earn a `knowledge/` note.
The test before writing here: *would this still be true and useful after the current work ships?* If
it is really an unfinished task or a fix-in-waiting, it belongs in `plans/`; `knowledge/` is not a
to-do list. See [[rea-redesign-principle-derived-cross-tool]] for why both products share one `.rea/`
store and why capture stays a prompt reflex, not a hook.
