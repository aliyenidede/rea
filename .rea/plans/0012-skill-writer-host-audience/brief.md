# Brief: skill-writer for the host audience

## Goal

Make `skill-writer` work for the people who install readev-tools, then actually ship it. Today the
agent writes new skills to `templates/agents/` and `templates/commands/` — this repo's source layout,
which does not exist in a host project — so the installer excludes it from placement entirely. The
result is a shipped command with no agent behind it: `rea-write-skill` is placed into every host,
calls `skill-writer`, and `skill-writer` is not there.

The fix is to make the agent derive its destination from the project it is running in, refuse names
that would be destroyed by a later `setup`, and drop the placement exclusion so it ships.

## Context

Gathered via `explorer` and direct verification, 2026-07-24.

**The gap, exactly:**

- `src/place.js:45-58` — `LAYOUT.claude.dirs` copies `templates/agents` → `.claude/agents` with
  `exclude: ['skill-writer.md', 'README.md']`. `skill-writer.md` is deliberately not placed.
- `.rea/.rea-manifest.json` `ownedFiles` confirms the asymmetry in this repo's own install:
  `.claude/commands/rea-write-skill.md` **is** owned/placed; `.claude/agents/skill-writer.md` is not.
- `templates/commands/rea-write-skill.md:9,48,50` — the command hands the work to the `skill-writer`
  agent by bare name. In a host, that agent file is absent.
- `templates/agents/skill-writer.md:62` — "Full path: Agent → `templates/agents/<name>.md`, Command →
  `templates/commands/rea-<name>.md`"; `:142` — "Every generated file's source lives under the
  neutral `templates/` tree — never write into a specific host tool's own folder; per-tool placement
  is a later, separate concern this agent does not handle."
  `templates/commands/rea-write-skill.md:79-80` repeats it. Correct for this repo, meaningless for a
  host.
- This repo currently has a stale, **unowned** `.claude/agents/skill-writer.md` — a v0.7.1-era
  leftover, which is why the flow appears to work here.

**What the host layout can be read from, rather than guessed:**

- The manifest is `{version, ownedFiles[], shimRegions[]}`; `ownedFiles` holds host-relative paths
  (`.claude/commands/…`, `.claude/agents/…`). The host's real layout is therefore recorded data.
- `templates/agents/skill-writer-patterns.md` **is** placed (`.claude/agents/skill-writer-patterns.md`),
  so the reference the agent depends on is already present in a host.

**Deletion rules that constrain where a user's skill may be written:**

- `src/prune.js:141-155` — prune deletes only (a) paths in the pre-run manifest's owned set and
  (b) on the one-time legacy bridge, the hard-coded `RETIRED_FILES`. A file that is never recorded as
  owned is never pruned.
- `src/retired-list.js:23-29` — the seven retired names: `.claude/commands/rea-brainstorm.md`,
  `rea-commit.md`, `rea-update.md`, `rea-verify.md`, `rea-worktree.md`, `.claude/agents/rea-router.md`,
  `.claude/skill-writer-patterns.md`.

**What can and cannot be verified here:**

- `test/templates.test.js` asserts two things about placed templates: every intra-repo relative link
  resolves at the **host** layout, and no file carries an unmatched closing tag. Nothing asserts
  length, required sections, or conformance.
- There is no prompt-eval harness — plan 0008 chose documentation-style structural acceptance checks
  and deferred a real one (`docs/rea-roadmap.md:324-326`). Placement is code and testable; the prompt
  edit is content and gets a structural check plus a live run.

## Decisions resolved

1. **The prompt-length trim is not in this plan.** Deferred with a trigger in
   `.rea/decisions/0007-defer-agent-prompt-trim.md`: trim an agent when its own behaviour shows it is
   over-instructed, citing the observation — not on line count. Rationale: eight agents exceed the
   ~100-line guideline, the guideline is unmeasured against this codebase, there is no eval to tell a
   good trim from a bad one, and Phase 2 already declined it once to avoid losing battle-tested
   content (`.rea/plans/0007-faz2-agents/plan.md` Decision 6). This closes half of the parked "4e";
   this plan is the other half.

2. **Dual audience by detection (option A).** `skill-writer` picks its destination from the project
   it runs in:
   - **Source mode** — `templates/agents/` and `templates/commands/` both exist at the project root
     (this repo or a fork): write there, tool-agnostic, exactly as today.
   - **Host mode** — otherwise: derive the destination from `.rea/.rea-manifest.json`'s `ownedFiles`
     paths, so the new skill lands in the host tool's own folder and is live immediately.
   Rejected: host-only (breaks this repo's own authoring path, used throughout Phases 2–3) and asking
   the user per call (asks for something the project already records).

3. **Refuse both classes of name collision (option A).** `skill-writer` returns BLOCKED, naming the
   reason, when the requested name resolves to:
   - a path in the manifest's `ownedFiles` — the next `setup` would overwrite the user's file, or
   - a name in `retired-list.js` — the one-time bridge would delete it.
   Rejected: warn-and-continue. A warning the user skips costs them their work weeks later, and the
   check is mechanical against two readable sources. Picking another name is cheap; losing a skill is
   not.

4. **Ship the agent.** Remove `'skill-writer.md'` from the `exclude` list in `src/place.js` once the
   agent is host-correct, so `rea-write-skill` has its agent in every host.

## Open questions

Deferred to planning, not lost:

- **How host mode reads the layout.** Infer the agents/commands directories from `ownedFiles`
  (e.g. the dirname of any `*/agents/*` entry), or add an explicit layout hint to the manifest that
  `place.js` writes? The second is more direct but changes the manifest schema and its version.
- **Host with no manifest** (hand-copied install, or a deleted manifest): ask the user for a
  destination, fall back to `.claude/`, or return BLOCKED? Needs a decision before implementation.
- **The stale unowned `.claude/agents/skill-writer.md` in this repo.** Does removing the exclusion
  simply overwrite it and record it as owned, or is an explicit cleanup unit needed? Verify against
  `place.js`/`manifest.js` rather than assuming.
- **Bridge interaction.** `skill-writer.md` was never in `RETIRED_FILES`; confirm that a legacy host
  which already has an old `.claude/agents/skill-writer.md` ends up with the new one, owned, on the
  next `setup`.
- **Test shape for the content half.** The `place.js` change gets a real unit test; the prompt edit
  gets a structural acceptance check plus one live run in a scratch host. Planning should state the
  exact assertions.

## Scope

### In

- `templates/agents/skill-writer.md` — two-mode path derivation (source vs host), collision refusal
  against `ownedFiles` + `retired-list`, and the rules text that currently forbids writing into a
  host tool's folder.
- `templates/commands/rea-write-skill.md` — matching update; its closing text ("the new file lives at
  its neutral `templates/` path … placing it into a host tool's folder is a separate concern",
  lines 79-80) is wrong in host mode.
- `src/place.js` — drop the `skill-writer.md` exclusion, plus a test asserting the agent is placed.
- Verification: `node --test` green, `templates.test.js` link resolution still clean, and one live
  run in a scratch host project — skill lands in the host tool's folder, `readev-tools verify` stays
  clean, and a following `setup` does not delete it.
- Doc sync for the 4e line in `docs/rea-roadmap.md` (trim → ADR 0007, remainder → this plan).

### Out

- The agent prompt-length trim — ADR 0007.
- Any prompt-eval harness.
- Layouts for tools other than what the manifest records (`LAYOUT` has only `claude` today); the
  manifest-derived approach should extend for free, but no new tool is added here.
- Changes to `prune.js` / `retired-list.js` behaviour — this plan reads them, it does not alter them.
- The unrelated em-dash in `src/cli.js:223` (mojibake on legacy Windows consoles), noted separately.
