---
number: 5
date: 2026-07-24
status: accepted
superseded-by:
---

# 0005 — `--dry-run` is refused on writing verbs, not implemented for `setup`

## Status

Accepted — 2026-07-24.

## Context

`--dry-run` was added for `migrate` (plan 0010) and registered in `KNOWN_FLAGS`, which is global to
the parser. `parseArgs` returned `dryRun` for every verb and the `setup` handler simply ignored it,
so `readev-tools setup <target> --dry-run` performed a **full, silent install**. A flag whose entire
meaning is "change nothing" was absorbed by the one verb that writes the most. Found by dogfooding:
running it against a scratch directory to preview the install created the whole tree instead.

Two ways out:

1. **Refuse the flag** on any verb that is not `migrate`.
2. **Implement a real preview** for `setup` — compute the placement, prune, and shim plan and print
   it without writing.

## Decision

Refuse it (option 1). `cli()` now exits non-zero with a message naming `migrate` as the only verb
that takes `--dry-run`, before any handler runs.

A real `setup` preview is deliberately **not** implemented yet, for a reason beyond effort: the
installer's containment guarantees live at the write sites. `src/safe-path.js` resolves and
validates each destination as it is written — a symlinked destination is caught by
`resolveInsideRoot` at the moment of the write, not by an earlier plan pass. A dry-run that skips
the writes also skips those checks, so its output would describe a plan that the real run might
refuse — a preview that lies in exactly the case that matters ([[0002-safe-path-hardening]]).
Implementing one properly means factoring the plan out of the write path with the containment
checks attached to the plan, not to the write. That is a real design task, not a flag.

Until then, the honest surface is: `setup` always writes, and it now reports what it did.

## Consequences

- `readev-tools setup . --dry-run` and `verify . --dry-run` exit 1 with usage. Previously the first
  installed silently and the second was a no-op.
- Per-verb usage text replaces the single flat line, so the flag's scope is visible without reading
  the source.
- Anyone adding a preview later must move containment validation into the plan step; a
  write-skipping dry-run is not an acceptable shortcut.
