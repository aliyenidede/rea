---
number: 8
date: 2026-07-24
status: accepted
superseded-by:
---

# 0008 — A prompt that needs the host layout reads it from the manifest

## Status

Accepted — 2026-07-24, during planning of `.rea/plans/0012-skill-writer-host-audience/`.

## Context

`skill-writer` has to write a file into the project it is running in, which means it has to know
where that project keeps its agents and commands. Three sources were available:

- **Hardcode `.claude/`** — wrong the moment a non-Claude tool installs the toolkit, and it
  contradicts the tool-agnostic rule that keeps host-tool names out of prompt bodies.
- **Add a layout field to the manifest** (`place.js` writes `agentsDir`/`commandsDir`) — precise, but
  it bumps a schema whose current version is 1 and is never version-checked
  (`src/manifest.js:118-120`), and installs already in the wild (`readev-tools` 0.1.0/0.1.1) carry no
  such field, so the inference path has to exist anyway.
- **Infer from the manifest's `ownedFiles`** — the installer already records every file it placed, at
  host-relative paths (`.claude/agents/…`, `.claude/commands/…`). The layout is therefore data the
  project already holds.

No prompt read the manifest before this. `rea-init.md:19` checks only that it *exists*, as evidence
the mechanical layer ran.

## Decision

A prompt that needs to know the host's layout **reads `.rea/.rea-manifest.json` and derives it from
`ownedFiles`** — the directory of an owned `*/agents/*` entry for agents, `*/commands/*` for commands.
It does not hardcode a tool's folder, and it does not ask the human for something the project records.

Two consequences follow, and both are part of this decision:

- **No manifest, an unparseable manifest, or a manifest with no owned agent/command entry is a
  refusal, not a guess.** The prompt stops and names `npx readev-tools setup`. This mirrors
  `rea-init`'s preflight: refusing to start beats producing a half-configured project.
- **The manifest stays the ownership record, so a prompt must not add to it.** A file a user authors
  through a prompt is deliberately *not* recorded as owned — `prune.js:141-155` only deletes
  previously-owned paths, so staying out of the manifest is what keeps the user's file alive across
  the next `setup`.

Adding an explicit layout field remains open for the day a second tool layout lands; it would then be
a fast path with this inference as the fallback for older installs.

## Consequences

- New prompts that write into a host follow this pattern rather than inventing their own.
- The manifest gains a second audience: it is read by prompts, not only by `src/`. Its `ownedFiles`
  shape is now load-bearing for behaviour outside the installer, so changing that shape breaks
  prompts too.
- A host that never ran the installer gets a clear refusal instead of files in an invented location.
