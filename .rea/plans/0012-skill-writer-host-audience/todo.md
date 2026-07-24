# Todo: skill-writer for the host audience

Content units (U1, U2) are prompt authoring — no code tests exist for them; their `Done when:` is a
structural checklist read off the authored file, in the style of plans 0007/0008. U3 is code and
carries real assertions. U4 is the observable proof, and it must actually run the agent: the bug this
plan fixes shipped precisely because nobody invoked the thing end-to-end.

### U1 — Two-mode path derivation in `skill-writer` (write path and read path)

Files: `templates/agents/skill-writer.md`
Done when: the mode test is stated once, early, and every later step refers to it — `templates/agents/`
**and** `templates/commands/` both present at the project root ⇒ source mode; otherwise host mode;
in host mode the agent/command directories are derived from `.rea/.rea-manifest.json`'s `ownedFiles`
(the directory of an owned `*/agents/*` entry for agents, `*/commands/*` for commands) and `.claude/`
is never hardcoded; **every** hardcoded `templates/…` reference is resolved through that mode, not
just the output path — the current occurrences are lines 3 (frontmatter description), 24-25 (Step 1
reference-file directories), 34 (Step 1 patterns-reference read), 62 (Step 3 output path), 68 (Step 4
patterns-reference), 110 (Step 6 verification read), 138 (Rules, "derive conventions from"), 142
(Rules, placement boundary); the frontmatter `description` no longer says the file is added to a
`templates/` source tree; the Rules line that forbade writing into a host tool's folder is replaced by
the mode rule and no longer contradicts host mode; the body stays tool-agnostic (no `Claude`, no
`.claude/` literal, sibling skills by bare name); `core/` references stay project-root-relative; the
`Principles:` line is unchanged.
Size: 1 smart-zone
Status: todo

### U2 — Refusal cases in `skill-writer`

Files: `templates/agents/skill-writer.md`
Done when: host mode with no `.rea/.rea-manifest.json`, a manifest that fails to parse, or a manifest
with no owned agent/command entry, returns BLOCKED naming `npx readev-tools setup` as the fix; a
requested name whose resolved destination equals an entry in `ownedFiles` returns BLOCKED stating the
next `setup` would overwrite it; a requested name colliding with a retired file returns BLOCKED, where
the match is by **file stem plus skill type** against `retired-list.js`'s entries — agents:
`rea-router`, `skill-writer-patterns` (retired at `.claude/skill-writer-patterns.md`, so a full-path
match would miss it); commands: `rea-brainstorm`, `rea-commit`, `rea-update`, `rea-verify`,
`rea-worktree` — so a command named `router` is not refused for colliding with a retired *agent*; the
retired-name message states the true risk — a checkout without a manifest treats that filename as
evidence of a legacy install (`detectLegacyPresent`), which makes the one-time bridge delete it — and
does **not** claim the bridge will fire on the current host, where a manifest already exists.
Size: 1 smart-zone
Status: todo

### U3 — `rea-write-skill` orchestration matches the new agent behaviour

Files: `templates/commands/rea-write-skill.md`
Done when: Step 6's placement-boundary paragraph no longer claims the file lives at a neutral
`templates/` path and that becoming live is a separate concern; it states what actually happened — in
host mode the skill is live in the host tool's own folder, in source mode it is repository source that
ships on the next release; Step 3's BLOCKED handling names the refusal reasons from U2 (no or
unreadable manifest, owned-path collision, retired name) and gives the concrete next step for each;
Step 5's "show the exact path" text works for both modes; no `Claude`/`.claude/` literal enters the
body; the `skill-writer` agent is still referenced by bare name.
Size: 1 smart-zone
Status: todo

### U4 — Ship the agent: drop the placement exclusion, invert its tests

Files: `src/place.js`, `test/place.test.js`
Done when: `LAYOUT.claude.dirs` agents entry excludes `README.md` only; `place()` copies
`templates/agents/skill-writer.md` to `.claude/agents/skill-writer.md` and records it in `ownedFiles`;
the two existing assertions in `test/place.test.js` that require the file to be absent and unrecorded
are inverted to require presence and recording; `node --test --test-concurrency=1 test/*.test.js` is
green, including `templates.test.js`'s host-layout link resolution now that a previously unplaced file
participates in it.
Size: 1 smart-zone
Status: todo

### U5 — Live host run: exercise the agent, not just the installer

Files: none (verification unit; records its result in the session note)
Done when: a scratch directory outside this repo is set up with the local installer
(`node bin/readev-tools.js setup <dir>`) and contains `.claude/agents/skill-writer.md`;
`node bin/readev-tools.js verify <dir>` reports all PASS; **`skill-writer` is then actually invoked in
that host** and authors a test skill that lands in the manifest-derived agents directory with correct
conventions (frontmatter, `Principles:` line, required sections for its type); invoking it with a name
that collides with an owned file (e.g. `code-reviewer`) returns BLOCKED naming the overwrite risk;
invoking it for a command named `commit` returns BLOCKED naming the legacy-detection risk; the
manifest-absence gate is exercised too, not just checklisted — with `.rea/.rea-manifest.json` removed
from the scratch host, invoking the agent returns BLOCKED naming `npx readev-tools setup` (this is the
first gate the agent hits, and the one branch that would otherwise ship never having run); a second
`setup` on that host leaves the authored skill in place (it is not manifest-owned); source mode is
confirmed unbroken by authoring a throwaway skill in this repo, seeing it land under `templates/`, then
deleting it.
Size: 1 smart-zone
Status: todo

### U6 — Doc sync

Files: `docs/rea-roadmap.md`
Done when: this repo's own `setup .` run has replaced the stale unowned `.claude/agents/skill-writer.md`
and recorded it as owned in `.rea/.rea-manifest.json`; `docs/rea-roadmap.md`'s 4e line reflects the
split — prompt-length trim deferred to ADR 0007, host-audience half delivered by plan 0012; full suite
green (`npm test`, `pytest`, `ruff check`).
Size: 1 smart-zone
Status: todo
