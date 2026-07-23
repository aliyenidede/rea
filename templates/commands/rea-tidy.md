---
name: rea-tidy
description: "Reconciles the persistent artifacts — memory notes, tool shims, and the project rules file — for drift, duplication, and staleness. Runs a dry-run report (`--check`), waits for human approval, then applies only the approved fixes. Use periodically as housekeeping, not as part of the main grill → plan → execute → ship pipeline."
---

Principles: F, J, K (`core/principles.md`)

The persistent artifacts drift over time: the same concept ends up with two names in
`.rea/knowledge/`, a tool shim's managed region falls out of sync with `AGENTS.md`, a rule goes
stale or starts contradicting another. This command is the occasional housekeeping pass that finds
and fixes that drift. All three jobs below — memory, shims, rules — run inline, in this command's
own reasoning; none of them is delegated to a dedicated sub-agent. That is principle F in practice:
one deep, self-contained reconciliation pass over the same small set of files beats three shallow
agents each re-reading the same files for a fraction of the job. This command is user-invoked
only — nothing else in the pipeline calls it automatically.

**Boundary:** this command's checks are the *intelligent* half of the legacy verify ritual. The
*mechanical* half — file-presence checks, GitHub configuration, branch-protection status — is a
separate, dumb `rea verify` CLI verb (Phase 4); this command never runs those checks.

## Step 0 — Choose the run mode

Two ways to run this command:

- **`rea-tidy --check`** — scan and report only. Runs every job below, prints the findings, and
  stops. No approval prompt, no writes.
- **`rea-tidy`** (no flag) — runs the identical scan and report, then walks the human through
  approval (Step 6) before applying anything (Step 7).

Either way, the scan (Steps 1-4) and the report (Step 5) are identical — `--check` only stops short
of the approval and fix steps.

## Step 1 — Scan: memory (orphans / conflicts / dedup)

Read every note under `.rea/knowledge/`, `.rea/decisions/`, and `.rea/sessions/`. Look for:

- **Orphans** — a `[[wikilink]]` in one note pointing at a filename that does not exist anywhere
  under the three directories.
- **Conflicts / same concept under different names** — two notes describing the same entity or
  decision under different filenames, the natural result of two sessions independently writing
  about the same thing without checking first.
- **Stale duplicates** — a note whose content only restates another, more current note.

For every finding, propose a fix that respects the per-note-type rules in `core/rea-schema.md`:
`knowledge/` is update-in-place, so a duplicate folds into whichever file is more complete or more
recent, and every wikilink pointing at the losing filename is repointed to the winner.
`decisions/` is append-only — never merge or delete a decision; a conflicting or outdated one is
superseded by a new numbered entry that says so, and the old entry stays on disk marked superseded.

## Step 2 — Scan: shims (managed-marker drift)

For every shim file present at the project root — `CLAUDE.md` and Gemini's `settings.json` — compare
what is on disk against `core/rea-schema.md`'s shim write semantics:

- **Markdown shims:** read the region between `<!-- rea-tools:start -->` and
  `<!-- rea-tools:end -->`. Flag missing or malformed markers, or managed content that no longer
  matches the current shim template — for example, the `@AGENTS.md` reference gone missing, altered,
  or repointed elsewhere. The managed region is a fixed reference to `AGENTS.md`, not a copy of its
  rules, so the check is against the template shape, never against `AGENTS.md`'s prose.
- **`settings.json`:** read the file and diff only the keys `rea-tools` owns against what's
  actually there — flag a missing key, a changed value, or a naming collision with a key the user
  added independently. This is a field-by-field check, not a whole-file compare (G6b).

Content outside the markers, or a JSON key `rea-tools` does not own, is never this job's
concern — by definition it belongs to the human, untouched.

## Step 3 — Scan: rules (stale / conflicting)

Read the project's rules file (`AGENTS.md`) together with `.rea/knowledge/` and `.rea/decisions/`.
This job salvages the one intelligent check the legacy verify ritual used to run over its old
`lessons.md`, retargeted at the current memory store:

- **A memory note that is actually an architecture rule** — its wording starts with something like
  "never import…", "always put…", "X must live in…", "X cannot call…". A note like this is a
  project-wide constraint, not a one-off fact; it belongs promoted into `AGENTS.md`, not sitting in
  `.rea/knowledge/` or `.rea/decisions/` where nothing enforces it. Propose the promotion and name
  the source note.
- **A rules-file entry that has gone stale, or now conflicts with another rule** in `AGENTS.md`, or
  a memory note that merely restates a rule `AGENTS.md` already states — flag both for removal or
  consolidation.

Never write to `AGENTS.md` in this step — only propose (principle J: an architecture-rule change is
a human call, never one this scan makes on its own). Whether a project rule actually changes is
decided by the human at Step 6.

## Step 4 — Scan: numbering (occasional)

List `.rea/decisions/` and each `.rea/plans/` directory and look for two entries sharing the same
leading `NNNN` but different slugs — a normal, non-error side effect of parallel work landing at
the same time (`core/rea-schema.md`'s Numbering section, G6a). If none exist, skip this job
silently — most runs have nothing to report here. If duplicates exist, propose renumbering the
newer of the pair to the next unused number and repointing every wikilink that names its old path.

## Step 5 — Report

Print every finding from Steps 1-4, grouped by job, each with: what was found, where, and the
proposed fix. A job with nothing to report says so plainly ("Shims: clean") rather than being
left out.

```
rea-tidy report

Memory:
  1. <finding> -> proposed: <fix>
  ... (or "clean")

Shims:
  1. <finding> -> proposed: <fix>
  ... (or "clean")

Rules:
  1. <finding> -> proposed: <fix>
  ... (or "clean")

Numbering:
  1. <finding> -> proposed: <fix>
  ... (or "nothing to renumber")
```

If this run was `rea-tidy --check`, stop here — the report is the entire point of that flag.

## Step 6 — Human approval

Otherwise, walk the human through the report and ask which proposed fixes to apply: all, some, or
none. Wait for an explicit answer before writing anything — this approval is the human QA moment
(principle K); nothing is written without it.

If the human approves none of the findings, stop here and report that nothing changed.

## Step 7 — Apply the approved fixes

Apply only what was approved, one job at a time, writing only what that job's scan step already
scoped:

- **Memory** — fold the losing note into the winning one (update-in-place) or write the
  superseding decision entry; repoint every wikilink that referenced anything moved or superseded.
- **Shims** — edit only inside the managed markers for markdown shims; for `settings.json`, write
  only the merged keys, leaving every other key exactly as found.
- **Rules** — add the approved promotion to `AGENTS.md`, then remove or consolidate the memory
  note it came from so the same rule doesn't end up living in two places at once.
- **Numbering** — rename the approved directory or file, and update every wikilink that referenced
  its old path.

Report what actually changed, file by file, once the approved fixes are applied.

## Rules

- **User-invoked only.** No other command or agent calls `rea-tidy` automatically.
- **Never blind-overwrite a shim.** Markdown shims are edited only inside the managed markers;
  `settings.json` is a field-by-field merge, never a whole-file rewrite (`core/rea-schema.md`).
- **`decisions/` is append-only.** A conflicting or stale decision is superseded by a new numbered
  entry, never edited or deleted.
- **The three jobs run inline, in this command's own reasoning.** No dedicated sub-agent is called
  for memory, shims, or rules reconciliation.
- **Never write anything without the human's explicit approval** (Step 6) — `--check` never writes
  at all, and a full run only applies what was approved.
- **Numbering fixes are cosmetic housekeeping, not a correctness fix.** Skip Step 4 silently when
  there is nothing to renumber; never treat a duplicate `NNNN-` as data loss.
- **Out of scope: mechanical checks.** File-presence, GitHub configuration, and branch-protection
  status are the dumb `rea verify` CLI verb (Phase 4) — this command never runs those checks.
