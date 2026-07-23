---
number: 2
date: 2026-07-23
status: accepted
superseded-by:
---

# 0002 — Safe-path hardening: shared symlink-escape guard

## Status

Accepted — 2026-07-23 (`.rea/plans/0011-safe-path-hardening/`, units 11-1 through 11-4).

## Context

Two live arbitrary-file-write vulnerabilities were found in the `rea-tools` npx installer, both
CWE-59 (symlink/junction escape). The shared root cause: containment checks across the installer
were **lexical-only** — `path.resolve` + `startsWith` against the target root, which never touches
the filesystem. A lexical check cannot see that a path component *inside* the target root is itself
a symlink/junction pointing *outside* it. Because `git clone` checks out POSIX symlinks verbatim, a
malicious repository or starter template can plant one, and `npx rea-tools setup`/`migrate` will
then write or copy *through* it to an arbitrary location on the victim's filesystem — no prior
victim access is required.

**Instance A — `src/shims.js`'s lexical-only `resolveInsideRoot`.** Used directly by the shim writes
(`AGENTS.md`/`CLAUDE.md`/`.gemini/settings.json`) and inherited by two further consumers:
`src/verify.js` (3 read sites — a lower-severity read-oracle / content-leak exposure) and
`src/settings-surgery.js` (a **write** site: `.claude/settings.json`). The settings-surgery
consumer was added by plan 0010's unit 4d-1 *after* this plan's original vulnerability inventory
was drafted; that draft said "exactly two consumers," which was stale — settings-surgery is a real
third importer, found during this plan's execution (2026-07-23). This inventory correction is
recorded here explicitly.

**Instance B — `src/place.js` had no containment check at all.** `copyFlatDir` and
`placeReaScaffold` performed `mkdirSync`/`copyFileSync` guarded only by an inline self-copy
comparison, with no root-containment logic of any kind. A single planted escaping directory
junction (e.g. `.claude`, `core`, `.rea/knowledge`) would redirect *every* file placed under it —
a larger blast radius than the 3 shim sites. This plan's original draft wrongly scoped `place.js`
out of the fix ("fixed layout literals → nothing to contain"); that scoping was corrected during
execution — a fixed destination *name* does not prevent a symlink escape of a destination
*directory* component.

**A third, low-severity same-class site — `src/manifest.js`'s `save()`** — wrote
`.rea/.rea-manifest.json` with no containment guard; an escaping `.rea/` junction would redirect it.
Severity is low (fixed filename, rea-tools-generated JSON content, not attacker-chosen path or
content), but it is now guarded on the same basis as the other sites for consistency.

## Decision

### 1. One shared primitive: `src/safe-path.js`

Instead of re-fixing each site independently (the historical pattern that produced this bug — the
containment/canonicalization/realpath logic had been reimplemented per-module, each with a
different subtle gap), every consumer now calls one shared module:

- `toCanonicalRel` / `isInsideRoot` — strict lexical containment, root-equal refused (hoisted
  verbatim from `prune`'s pre-existing implementation).
- `isRealpathInsideRoot` — realpath-aware containment that **never throws**: a realpath failure
  resolves to `false`, and it walks up to the nearest *existing* ancestor before calling `realpath`,
  so it tolerates a not-yet-created destination file.
- `resolveInsideRoot` — the lexical check plus the realpath guard, but **throws** on escape; this is
  the write/read guard used by callers that must abort rather than skip.
- `isSamePath` — case-folded comparison, applied only on a case-insensitive filesystem.

The realpath layer intentionally ships as two shapes over one implementation: a non-throwing
boolean (`isRealpathInsideRoot`) and a throwing sibling (`resolveInsideRoot`). This lets `prune`
keep its pre-existing contract — skip one bad candidate, never abort the whole sweep, by calling the
boolean and `continue`-ing on `false` — while `shims`/`place`/`verify`/`settings-surgery`/`manifest`
refuse outright by calling the throwing form. One implementation, two reactions, chosen per call
site's existing failure semantics.

### 2. Nearest-existing-ancestor tolerance

Walking up to the nearest existing ancestor before calling `realpath` closes both failure modes —
a destination that is itself a symlink, and a new file whose existing parent directory escapes —
without breaking legitimate new-file creation (a destination-only realpath check was considered and
rejected as false-safe: it would pass a not-yet-existing path straight through with no check at
all).

A concrete hardening gap was caught during execution (unit 11-1 code review, before the primitive
was trusted): the ancestor-existence check must use `fs.lstatSync` (which does not follow the final
path component), not `fs.existsSync` (which follows a symlink and reports a *dangling* escaping link
as "absent," stepping past it as though it did not exist). Using `existsSync` there would have let a
dangling symlink/junction (pointing at a target not yet created) bypass the check entirely. This was
found and fixed before `safe-path.js` was adopted by any consumer.

### 3. Modules converged

Now call `safe-path.js` directly:

- `src/shims.js`, `src/verify.js`, `src/settings-surgery.js`, `src/place.js`, `src/manifest.js` — all
  writes/reads route through the throwing `resolveInsideRoot`.
- `src/prune.js` — its delete sweep routes through the non-throwing `isRealpathInsideRoot`; `prune`
  also re-exports `safe-path`'s `isInsideRoot`/`toCanonicalRel` to preserve its own public API for
  existing importers.
- `src/rea-archive.js` — migrated in a post-plan follow-up (unit 11-6, 2026-07-23). Both its lexical
  containment (`toCanonicalRel`/`isInsideRoot`) and its destination-realpath guard now call
  `safe-path` directly, calling the same **non-throwing** `isRealpathInsideRoot` boolean `prune` uses
  (a refused destination lands in `failed`, never thrown). The bespoke
  `isDestinationRealpathInsideRoot()` helper (its `fs.existsSync`-based ancestor walk) was deleted
  entirely, and the now-unused `prune` require was removed. This also closes rea-archive's own
  dangling-link gap: `safe-path`'s `lstatSync`-based nearest-existing-ancestor walk correctly treats a
  dangling (never-created-target) symlink/junction entry itself as the nearest existing ancestor and
  refuses it, where the old `existsSync`-based walk stepped past it (following the broken link,
  reporting it as "absent") to a real in-root ancestor further up, wrongly reporting containment. No
  module retains a bespoke containment implementation any longer.

## Consequences

- **TOCTOU is not closed.** The realpath check and the later write/read/delete are not atomic; a
  symlink swapped in between the check and the operation still races (closing this fully would need
  `O_NOFOLLOW`/`openat` semantics that Node does not expose portably). This matches `prune`'s
  pre-existing same-window limitation and is not a regression — it is an acknowledged residual limit
  of the whole approach, not just this fix.
- A mid-path symlink/junction that resolves back *inside* the root is intentionally **allowed**, not
  treated as an escape — refusing it would break legitimate symlinked project layouts.
- One minor, documented and tested behavioural side effect: at the exact-root boundary, an
  owned-then-unowned symlink/junction that resolves to the root itself is now *cleaned up* by
  `prune` (only the link entry is unlinked; `rmSync` does not recurse through it, so the root and its
  contents survive) rather than silently skipped as before.
- `src/rea-archive.js`'s destination-realpath guard, originally left as an open follow-up item
  tracked by its own in-code `TODO`, was subsequently migrated onto the shared `safe-path.js`
  primitive (unit 11-6, 2026-07-23) — so no module in the installer retains a bespoke containment
  implementation.
- This plan (`.rea/plans/0011-safe-path-hardening/`) **must land before any `npm publish` of
  `rea-tools`** — two live arbitrary-write vulnerabilities existed prior to it. Units 11-1 → 11-2 →
  11-3 were the security-critical spine of the fix; this record (unit 11-5) closes the plan.
- `docs/rea-roadmap.md` §9 "Carry-forward debt" now lists the shared `safe-path.js` fix as a closed
  item and points here.
