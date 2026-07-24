---
number: 1
date: 2026-07-23
status: accepted
superseded-by:
---

# 0001 — Distribution split (separate repos) + redesign success metric & rollback

## Status

Accepted — 2026-07-23 (unit 4a-4, `.rea/plans/0009-faz4-installer/`).

## Context

The 2026-07-21 design-closure session (`docs/rea-target-state.md` §9 "Product shape (two products,
two repos)") already locked the product shape: **two products, one shared "REA brain"** — `rea-tools`
(the methodology, delivered into a host tool) and `rea-cli`/`readev` (the same methodology as a
standalone agent CLI, built on oh-my-pi). That session decided the repos would be **separate**: this
repo evolves into `rea-tools` (keeping its history), and `rea-cli` is a new, greenfield repo that
**vendors Layer 1** (`core/principles.md`, `core/craft-checklist.md`, `core/rea-schema.md`) as a
clean one-way dependency, rather than the two products sharing a monorepo.

During Phase 4 planning (`.rea/plans/0009-faz4-installer/`), a brief detour proposed a monorepo
(`packages/rea-tools` + `packages/rea-cli` sharing a repo-root `core/`) as a possible alternative.
That detour was rejected in favor of the original locked framing — see plan.md Decision 6
("Repo structure"). This ADR records that the separate-repos path stands, and closes the last two
items `docs/rea-roadmap.md` §9 listed as undecided: the redesign's **success metric** and its
**rollback plan**.

## Decision

### 1. Distribution: separate repos, confirmed

- **This repo** keeps its name (`rea`) and its git history. It publishes the **`rea-tools`** npm
  package (`npx rea-tools setup`, per roadmap D1). The repo name and the package name are
  intentionally independent — no rename, no `packages/` restructuring.
- **`rea-cli`** (brand: `readev`) is a **separate, greenfield repo**. It is not created by this plan;
  it is scaffolded later, in its own `C0` phase (roadmap §7), and it **vendors Layer 1** (`core/`) as
  a one-way dependency — `rea-cli` pulls from `rea-tools`'s published `core/` trio, `rea-tools` never
  depends on `rea-cli`.
- No monorepo. This closes the brief monorepo detour raised during Phase-4 planning; the original
  `rea-target-state.md` §9 product-shape text is unchanged — this ADR is a confirmation, not a
  redesign.

### 2. Redesign success metric

The redesign (Phases 0–4, i.e. everything behind `feature/rea-redesign`) is considered successful
once it clears a **dogfood** bar, not a synthetic test suite:

> This repo's own next real feature runs **end-to-end** through the redesigned pipeline —
> `talk`/`rea-grill` → `rea-plan` → `rea-execute` → `rea-ship` — using the installed redesign
> command/agent set (placed by the Phase-4 npx installer), without falling back to the legacy
> Python-CLI `.claude/` template set.

This is deliberately a real-usage proof, not a unit-test count: the redesign's product *is* the
prompt/workflow content, so the only trustworthy signal is that it works when this repo actually
uses it on itself.

### 3. Rollback plan

If the dogfood run above fails badly enough that the redesigned pipeline needs to be abandoned (not
just fixed forward), two independent fallbacks exist:

- **Git tag `pre-redesign-v0.7.1`** (created in unit 4a-5) — an annotated tag on the pre-redesign
  `main` HEAD (the commit before `feature/rea-redesign` diverged). Checking this tag out restores the
  last known-good pre-redesign state of the repo, including the old `.claude/` template set and the
  Python CLI's original behaviour.
- **PyPI fallback `rea-dev` 0.7.1** — the Python CLI package remains published and installable
  (`pip install rea-dev==0.7.1`) as a frozen legacy path (unit 4a-2's deprecation shim keeps `rea
  setup` working; it does not remove the old install path). A user who already adopted the redesign
  via `npx rea-tools` can fall back to the frozen PyPI package without losing the ability to run REA
  at all.

Rollback is a last resort: it discards the redesign's phase-by-phase progress back to the tagged
commit. It is not a per-unit fallback — individual failing units are fixed forward (`rea-fix`/normal
debugging), not rolled back.

## Consequences

- `docs/rea-roadmap.md` §9 no longer lists "a redesign success metric + rollback plan" as undecided;
  it now points here.
- Phase 4 unit 4a-5 must create the `pre-redesign-v0.7.1` tag this ADR references; until that unit
  runs, the tag name is reserved but the tag itself does not yet exist.
- `rea-cli`'s eventual `C0` scaffold (roadmap §7) is confirmed to start as its own repo, not as a
  package inside this one — anyone later reviving the monorepo idea must supersede this ADR (per
  `core/rea-schema.md`'s decisions rule: a new numbered ADR, never an edit to this file).
