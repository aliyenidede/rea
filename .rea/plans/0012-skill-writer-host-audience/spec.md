# Spec: skill-writer for the host audience

## What

Make `skill-writer` produce a skill that is actually usable in the project it runs in, then remove
the installer exclusion that currently keeps the agent out of host projects.

Today `skill-writer` derives its output path as `templates/agents/<name>.md` /
`templates/commands/rea-<name>.md` — this repository's source layout. No host project has a
`templates/` directory, so `src/place.js:52` excludes the agent from placement rather than shipping
something meaningless. The command that drives it, `rea-write-skill`, **is** placed. Every host
therefore receives a command whose agent is missing.

After this change: the agent picks source mode or host mode from the project it is running in, it
refuses names that a later `setup` would destroy, and it ships.

## Why

`/rea-write-skill` is advertised in the README and installed by `npx readev-tools setup`. It cannot
work for any user of the published package. This is the smallest change that turns a shipped-but-dead
feature into a working one, and it needs no eval harness to verify: placement is code, and the path
behaviour is observable in one live run.

## Scope

### In

- `templates/agents/skill-writer.md` — mode detection, host-path derivation, name-collision refusal,
  and the rules text that currently forbids writing into a host tool's folder.
- `templates/commands/rea-write-skill.md` — the matching orchestration change, including its Step 6
  placement-boundary paragraph and its handling of a BLOCKED return.
- `src/place.js` — remove `'skill-writer.md'` from the agents `exclude` list.
- `test/place.test.js` — invert the existing "must NOT record skill-writer.md" assertions.
- Doc sync: the 4e line in `docs/rea-roadmap.md`.
- One live verification run against a scratch host project.

### Out

- The agent prompt-length trim — deferred with a trigger in ADR 0007.
- Any prompt-eval harness (deferred by plan 0008; unchanged here).
- New host layouts beyond what the manifest records — `LAYOUT` has only `claude` today.
- Changes to `prune.js`, `retired-list.js`, or `migrate.js` behaviour. This plan reads them.
- The em-dash mojibake in `src/cli.js:223` — unrelated, tracked separately.

## Key constraints

Verified 2026-07-24; each drives a design choice below.

- **The manifest already records the host layout.** `ownedFiles` holds host-relative paths
  (`.claude/agents/…`, `.claude/commands/…`); schema is `{version, ownedFiles[], shimRegions[]}` with
  `MANIFEST_VERSION = 1`, backfilled on load and never version-checked (`src/manifest.js:118-120`).
- **No prompt reads the manifest today.** `rea-init.md:19` checks only that it *exists*, as proof the
  mechanical layer ran. This plan introduces the read-and-parse pattern.
- **Placement overwrites unconditionally.** `place.js:83-93` copies every non-excluded file and
  records it as owned; a pre-existing unowned file is overwritten and becomes owned. So this repo's
  stale v0.7.1 `.claude/agents/skill-writer.md` needs no cleanup unit — the first `setup` after the
  exclusion is removed replaces it.
- **A user's own skill is safe from prune, with two exceptions.** `prune.js:141-155` deletes only
  previously-owned paths and, on the one-time bridge, `RETIRED_FILES` (`retired-list.js:23-29`).
  `skill-writer.md` is not in that list, so a legacy host's old copy is overwritten, never deleted.
- **Nothing tests prompt content.** `templates.test.js` asserts host-layout link resolution and
  unmatched closing tags only; no length, section, or conformance checks exist. Content units are
  verified by a structural `Done when:` checklist plus the live run, following the house style of
  plans 0007/0008.

## Decisions

| # | Decision | Choice | Alternatives rejected | Rationale |
|---|----------|--------|------------------------|-----------|
| 1 | Prompt-length trim | Out of scope; deferred with a trigger | Trim all eight long agents now; build an eval first | No instrument distinguishes a good trim from a bad one; Phase 2 already declined for the same reason. ADR 0007. |
| 2 | Dual audience | Detect: `templates/agents/` + `templates/commands/` at root ⇒ source mode, else host mode | Host-only; ask per invocation | Host-only breaks this repo's own authoring path (used through Phases 2–3); asking re-requests what the project already records. |
| 3 | Host-path source | Derive from the manifest's `ownedFiles` | Add an explicit layout field to the manifest | Works against installs already in the wild (0.1.0/0.1.1 manifests carry no such field), needs no schema bump. Revisit if a second tool layout lands. |
| 4 | No manifest in host mode | Return BLOCKED naming `npx readev-tools setup` | Default to `.claude/`; ask the user | Mirrors `rea-init`'s preflight: refusing beats guessing a layout, and defaulting to `.claude/` would be wrong in a non-Claude project. |
| 5 | Name collisions | Refuse both classes (manifest-owned path, retired name) with BLOCKED | Warn and continue | A warning the user skips costs them the file; the check reads two authoritative sources. |
| 6 | Stale unowned copy in this repo | No cleanup unit | Explicit delete step | `place.js` overwrites it and records ownership; a delete step would be dead code. |
| 7 | Retired-name match method | File stem **plus** skill type | Full destination-path match; bare stem across both types | A full-path match misses `.claude/skill-writer-patterns.md`, which has no `/agents/` segment; a type-blind stem match refuses a command named `router` for colliding with a retired *agent*. |
| 8 | Why a retired name is refused | A manifest-less checkout reads that filename as a legacy install, so the one-time bridge deletes it | "The bridge will delete it" (unqualified) | `setup.js:115` sets `isBridge = legacyPresent && !hasManifest`, and host mode requires a manifest — so the bridge cannot fire on the current host. The real exposure is a clone where `.rea/` is untracked: `detectLegacyPresent` (`setup.js:85`) then matches the user's own file. |
| 9 | Unreadable manifest | Same BLOCKED as no manifest | Leave implicit | `manifest.load` throws on invalid JSON rather than returning empty (`manifest.js:100-122`); the failure path deserves naming, not inference. |
| 10 | Verification of the prompt half | U5 invokes the agent live in a scratch host, both refusal paths included | Structural checklist only | Installer mechanics (place/verify/prune) are orthogonal to the prompt logic this plan changes; checking only those is how the dead-agent bug shipped. |
