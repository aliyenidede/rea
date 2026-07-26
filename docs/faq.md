# FAQ

Answers grounded in the actual installer code (`src/`) and the shipped templates (`templates/`),
not aspirational behavior. If something here ever drifts from the code, the code wins — file an
issue.

## What does `setup` write?

`npx readev-tools setup <project>` runs a fixed, mechanical pipeline (`src/setup.js`):

1. **Place** — copies `templates/commands/` and `templates/agents/` into `.claude/commands/` and
   `.claude/agents/`, copies the `core/` reference trio (`principles.md`, `craft-checklist.md`,
   `rea-schema.md`) into `core/`, and creates the `.rea/` typed-memory scaffold
   (`knowledge/`, `decisions/`, `sessions/`, `plans/`, each with a placeholder `README.md` — only
   added where the dir is missing or empty, never overwriting real notes already there).
2. **Shims** — writes `AGENTS.md`, `CLAUDE.md`, and merges `.gemini/settings.json`, all inside
   managed regions (see the next question).
3. **Prune** — deletes files a *previous* `setup` run placed that the *current* run no longer owns
   (e.g. a retired command or agent file).
4. **Manifest** — records every file/region it owns in `.rea/.rea-manifest.json`, which the next
   `setup`, `verify`, or `prune` run reads back.

Every write goes through `src/safe-path.js`'s containment guard, so a symlink/junction planted
under the target project can't redirect a write outside it.

## Does it overwrite my files?

Two different answers depending on which file:

- **Owned files** — everything under `.claude/commands/`, `.claude/agents/`, and `core/` — are
  fully replaced with the current shipped version on every `setup` run, and pruned outright if
  retired. Don't hand-edit these; edit the source template and re-run `setup` instead, or your
  edits will be silently overwritten on the next run.
- **The `.rea/` scaffold's placeholder `README.md`s** behave differently from the files above:
  each is written *once*, only when its typed dir (`knowledge/`, `decisions/`, `sessions/`,
  `plans/`) is first created — missing or empty. Once that dir holds anything (even just the
  placeholder), later `setup` runs never re-copy or touch it again, so a template update to that
  README never reaches an already-set-up project. These dirs are also permanently protected from
  pruning — `src/prune.js`'s deny-list blocks them outright, "no matter what the manifest or
  retired list says."
- **Shimmed files** — `AGENTS.md`, `CLAUDE.md`, `.gemini/settings.json` — are never overwritten
  wholesale. The two markdown files are only touched *inside* the
  `<!-- readev-tools:start -->` … `<!-- readev-tools:end -->` markers; everything you write outside
  that block (e.g. `AGENTS.md`'s project-specific sections from `/rea-init`) is left alone forever.
  If a file has no markers yet, the managed block is appended, not merged into existing prose. If
  the markers are ambiguous (one missing, or duplicated), `setup` refuses to touch that file and
  throws, rather than guessing which content to keep. `.gemini/settings.json` gets a structured
  merge — only the `context.fileName` key is set; every other key you have is preserved.
- Anything else in your project `setup` never looks at.

## What is `.rea/`, and should I commit it?

`.rea/` is the plain-file memory graph: `knowledge/` (one note per module/concept, updated in
place), `decisions/` (numbered ADRs, append-only), `sessions/` (timestamped work notes), `plans/`
(active `/rea-plan` output), plus `.rea-manifest.json` (the installer's own ownership record — not
memory content). The format is tool-agnostic (`core/rea-schema.md`); any AI tool reading
`AGENTS.md` can read and write these same notes.

Whether to commit it is your project's call, not something the installer decides. Some teams treat
it like ADRs — durable, reviewable, checked in. This repository treats its *own* `.rea/` as local
runtime memory and gitignores it (see the root `.gitignore`) — that's this project's own choice,
documented for context, not a rule the installer enforces on the projects it's installed into.

## How do I update, or re-run setup?

`npx readev-tools setup <project>` again. It's the same command for the first install and every
later update — safe and idempotent. It re-places owned files at the current version, prunes
anything retired since your last run, and leaves shimmed content outside the managed markers
untouched.

## How do I uninstall or roll back?

There's no dedicated `uninstall` verb. `.rea/.rea-manifest.json` is the authoritative list of
everything `setup` currently owns (`npx readev-tools verify <project>` is a quick read-only way to
see the same thing), so removing it by hand means:

- delete `.claude/commands/`, `.claude/agents/`, `core/`, and `.rea/` (scaffold + manifest);
- remove the `<!-- readev-tools:start -->` … `<!-- readev-tools:end -->` block from `AGENTS.md` and
  `CLAUDE.md` (or delete those files outright if nothing else in them is yours);
- drop `context.fileName` from `.gemini/settings.json` if present.

To roll back to an older *version* of the toolkit rather than removing it, pin the package version
npm-style, e.g. `npx readev-tools@0.1.1 setup <project>` — there's no separate rollback command.

## Does it work outside Claude Code?

Partially, and precisely:

- `AGENTS.md` and `.rea/` are tool-agnostic plain files. Any AI tool that reads `AGENTS.md` — or
  that you point at it — gets the same steering and the same memory graph.
- `.gemini/settings.json` gets `context.fileName` merged to include `AGENTS.md`, so Gemini picks
  it up automatically without you doing anything extra.
- The nine slash commands (`/rea-grill`, `/rea-plan`, …) and every agent in `templates/agents/`
  (eleven today) are placed only into `.claude/commands/` and `.claude/agents/` — `src/place.js`'s
  layout table has one entry, `claude`. A Cursor/Codex/other-tool user gets the `AGENTS.md`
  steering and `.rea/` memory, but not the ready-made slash commands; per-tool command placement
  for other tools isn't built yet.

## `setup` vs `migrate` — which do I run?

`setup` is what almost everyone runs, always: it places and updates the current toolkit.

`migrate` is a one-time bridge for a project that was previously set up with the old, pre-redesign
`rea-dev` Python CLI (0.7.x). It: removes the dead `SessionStart` router hook from
`.claude/settings.json`, moves legacy `.rea/log/` and `.rea/lessons.md` under `.rea/_archive/`
(archives, never deletes), and prints a read-only report of any other legacy artifacts left to
review (an old CLAUDE.md, the legacy CI workflow, the legacy lint hook). It supports `--dry-run`
(`setup` does not — `setup` always writes). If you never used `rea-dev`, you'll never need
`migrate` — running it against a project with nothing legacy left just reports "nothing to
migrate".

## Is any code or data sent anywhere?

The installer itself (`bin/`, `src/`) has zero runtime dependencies and does pure local file I/O —
no network calls, no telemetry, nothing phoned home. Once installed, the *workflow* — the slash
commands and agent prompts under `.claude/commands/` and `.claude/agents/` — runs inside your own
AI coding tool (Claude Code today). That tool's own model calls and data handling apply exactly as
they would for any other prompt you run in it; readev-tools adds no additional network surface of
its own.

## Why do I need to run `/rea-init` after `setup`?

`setup` is the mechanical layer only — it places files but writes no content specific to *your*
project. `/rea-init` is the intelligent layer, run inside your AI tool: it classifies the project
(brownfield / undocumented / greenfield) and authors `AGENTS.md`'s project-specific sections
(description, tech stack, architecture rules, file structure, commands) — always outside the
managed markers, never touching what `setup` owns. It refuses to run at all until the mechanical
layer is in place (`.rea/.rea-manifest.json`, the `.rea/` scaffold, `core/`'s trio all exist) — so
the order is always `setup` first, `/rea-init` second.

## What are the requirements?

Node.js 20 or later (`engines.node` in `package.json`). `npx readev-tools setup <project>` fetches
and runs it on demand — no separate install step needed.

## `verify` reports `SKIP` for CI — is that a problem?

No. `npx readev-tools verify <project>` is a read-only health check (`src/verify.js`) with five
checks; the `CI` check *always* reports `skip`, whether or not `.github/workflows/*.yml` exists in
the project — it's informational only, since GitHub Actions CI is optional and only ever added via
`/rea-init --full`, never by the installer itself. Seeing `SKIP CI — …` in `verify`'s output is
expected on every run, not a failure.
