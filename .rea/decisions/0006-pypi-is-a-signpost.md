---
number: 6
date: 2026-07-24
status: accepted
superseded-by:
---

# 0006 — PyPI stays published as a signpost; 0.7.3 installs nothing

## Status

Accepted — 2026-07-24. Extends [[0001-distribution-and-rollback]] (§3 rollback plan unchanged).

## Context

`rea-dev` 0.7.2 was defined as "0.7.1 behaviour plus a deprecation notice". Checked against the
published artifact, that meant: `pip install rea-dev` → `rea setup <dir>` printed one line of
warning and then **still installed the retired 0.7.x command set** — `rea-brainstorm`, `rea-commit`,
`rea-update`, `rea-verify`, `rea-worktree`, all removed in Phase 3. A user who skipped one line of
text got a 2026-03 product on disk, silently and with exit code 0.

The alternative raised was deleting the PyPI project outright. Rejected:

- It voids [[0001-distribution-and-rollback]] §3, whose rollback plan is the git tag
  `pre-redesign-v0.7.1` **plus** "rea-dev 0.7.1 remains installable from PyPI as a frozen fallback" —
  and the redesign has not yet passed its own dogfood success metric (§2). Removing the safety net
  before the thing it protects is proven is the wrong order.
- Deleting a PyPI project is irreversible and frees the name; a stale `pip install rea-dev` in
  someone's script could later resolve to a different author's package. ~1300 downloads exist in the
  90 days before this decision (mostly bots and our own installs, but the name is public).
- The deprecation pointer disappears: `No matching distribution found` is a dead end, while a
  published shim tells the reader where the project actually lives now.

## Decision

Keep the project published, and reduce it to a pure signpost.

- **0.7.3**: `rea setup` prints the notice plus the `npx readev-tools setup` / `migrate` commands and
  **exits 1**. No directories, no file copies. Bare `rea` prints the same panel. `rea version` stays
  clean of the notice (the 4a-2 invariant).
- The wheel drops `[tool.setuptools.package-data]` — the retired template tree is no longer
  distributed. It stays in the repo under `rea/templates/` as the record of what 0.7.1/0.7.2 shipped.
- Non-zero exit is deliberate: a CI step still calling `rea setup` must fail visibly rather than
  appear to have installed something.
- The fallback route is named in the tool's own output (`pip install rea-dev==0.7.1`), so removing
  the copy behaviour never leaves a user without a way back.

## Consequences

- `pip install rea-dev` remains valid forever; what it installs is a pointer, not a product.
- Anyone who wants the old behaviour pins 0.7.1 — which still ships the templates.
- Deleting the project stays available as a later option, but not before the dogfood metric in
  [[0001-distribution-and-rollback]] §2 is met.
- Optional and not done here: yanking the 0.6.x releases so resolvers only see 0.7.x. Yanking is
  reversible; deletion is not.
