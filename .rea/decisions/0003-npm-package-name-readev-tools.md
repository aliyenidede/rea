---
number: 3
date: 2026-07-24
status: accepted
superseded-by:
---

# 0003 — npm package name: `readev-tools` (not `rea-tools`)

## Status

Accepted — 2026-07-24, during the first `npm publish` of the redesign installer.

## Context

Phase 4 built and named the npx installer package `rea-tools` throughout the design docs, plans,
and code (ADR 0001 / roadmap §9 / target-state §D1/§D2). At first publish, the npm registry
**refused the unscoped name `rea-tools`**:

```
403 Forbidden - PUT https://registry.npmjs.org/rea-tools -
Package name too similar to existing packages react-tools, rc-tools;
try renaming your package to '@aliyenidede/rea-tools' ...
```

This is npm's typosquat/similarity guard, enforced server-side — it cannot be worked around for the
unscoped `rea-tools` name. So `npx rea-tools setup` can never resolve to a package (no such package
can exist). The two real options were:

1. **Scoped** `@aliyenidede/rea-tools` → `npx @aliyenidede/rea-tools setup`. Keeps the name but puts
   the maintainer's username in every install command.
2. **A different unscoped name** → a clean `npx <name> setup`.

## Decision

Publish as the **unscoped package `readev-tools`** → install with **`npx readev-tools setup`**.

Rationale:
- **Brand fit.** The locked umbrella brand is already **readev** (roadmap §1 / target-state §D2:
  `readev` = the umbrella over rea-tools + rea-cli). `readev-tools` expresses that umbrella *better*
  than `rea-tools` did, and it is a clean, memorable, unscoped `npx` command — which matters for the
  open-source "find it and run it in ~10 min" front-door goal (roadmap §8/T1).
- **No maintainer name in the command** (user preference) — the scoped `@aliyenidede/...` form was
  rejected for exactly this.
- **Greenfield = zero migration cost.** Nothing had been published or installed yet, so renaming the
  package, the `bin` command, and even the internal shim managed-marker (`<!-- rea-tools:start -->`
  → `<!-- readev-tools:start -->`) carries no existing-host cost — there is no deployed marker to
  keep matching.

## Scope of the rename (what changed vs what did not)

**Renamed `rea-tools` → `readev-tools`** in all forward-looking + shipped surfaces:
- `package.json` `name` + `bin` key; the `bin` file `bin/rea-tools.js` → `bin/readev-tools.js`.
- `src/**` user-facing strings + the shim managed-marker prefix (`readev-tools:start`/`:end`,
  `readev-tools-owned`/`-managed`) and their `test/**` assertions (renamed together, suite green).
- `core/**`, `templates/**` (install artifacts, incl. the shim templates + command docs), `README.md`,
  `CLAUDE.md`, `docs/rea-roadmap.md`, `docs/rea-target-state.md`, and the `rea/cli.py` deprecation
  notice + its test.

**Deliberately NOT changed:**
- **Historical `.rea/` records** — session logs, plans `0005`–`0011`, and decisions `0001`/`0002`
  named the package `rea-tools` when that was the decision. Those records stay accurate to their
  moment; this ADR supersedes the name, it does not rewrite history.
- **Every other `rea-*` token** — the slash commands (`rea-init`, `rea-plan`, `rea-execute`, …), the
  `.rea/` memory dir, `core/rea-schema.md`, the Python package `rea-dev`, the sibling product
  `rea-cli`, the methodology brand **REA**, and the repository name **`rea`** (the repo keeps its
  name; the github-npx fallback points at `github:aliyenidede/rea`).

## Consequences

- Install/verb surface is now `npx readev-tools <setup|verify|migrate>`; the globally-installed
  command is `readev-tools`.
- ADR 0001 (distribution) and roadmap/target-state §D2 naming are updated where forward-looking;
  their historical framing of the package as `rea-tools` is superseded by this record.
- `node --test`: 169 pass / 3 win32-EPERM skips / 0 fail after the rename. Smoke install verified the
  renamed `bin/readev-tools.js` places correctly and writes the `readev-tools` marker.
- The PyPI `rea-dev` deprecation shim's notice now points users to `npx readev-tools setup`.
