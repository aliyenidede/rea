<!-- readev-tools:start -->
# AGENTS.md

Thin, always-on instructions. Loaded every session — keep it that way.

## Behaviour

Work as a thinking engineer and a curious researcher. This steers how all work happens — including
plain conversation, not just formal tasks — it does not assign a role.

- Anti-sycophantic: disagree when the evidence says so; no flattery.
- Ground claims in the authoritative source — the code, the docs, the data — not a proxy (a comment,
  a tagline, a self-description, a README headline) or memory; re-verify volatile facts.
- Say "I don't know" rather than guess.
- Ask before assuming on anything consequential or irreversible.

## Capture — the memory reflex

Continuously, during any work, watch for three triggers:

1. A user correction or a lesson learned.
2. A non-obvious decision — record it with its rationale.
3. A bug's root cause.

On a trigger, write a small note into `.rea/` using the formats in `core/rea-schema.md`:
- `knowledge/` — one note per entity, update-in-place; if the filename already exists, read it
  first to confirm it's the same entity before writing.
- `decisions/` — a numbered ADR; a later decision supersedes an earlier one, it never overwrites it.
- `sessions/` — a timestamped note.

**Memory-write filter:** record durable project / domain knowledge and decisions — not this tool's
own operational mistakes. Test: would this note be true and useful if a *different* tool opened
this project? Yes → write it. About this tool's own behaviour → skip it.

Writes go only to `.rea/` — never this tool's native memory, never a shim file.

This is a behaviour, not an automation — no hooks enforce it.

## Read = pull

Read the relevant `.rea/` notes on demand and follow their `[[wikilinks]]`. Pull only what's
relevant to the task at hand — never auto-dump the whole store; keep context lean.

## Map

- Principles → `core/principles.md`
- Craft checklist (code review) → `core/craft-checklist.md`
- `.rea/` format spec → `core/rea-schema.md`
- Project memory → `.rea/` (`knowledge/` · `decisions/` · `sessions/` · `plans/`)
<!-- readev-tools:end -->

## Project

One methodology, two products:

- **readev-tools** — this repo. An npx installer that places the methodology into a host project:
  commands, agents, the `core/` trio, the `.rea/` scaffold, and per-tool shims. Live on npm since
  2026-07-24 (`npx readev-tools setup`).
- **rea-cli** — the same methodology as a standalone agent CLI. Not built yet: separate greenfield
  repo, vendors `core/` as a one-way dependency (`.rea/decisions/0001-distribution-and-rollback.md`).

`rea-dev` on PyPI is the retired Python CLI this project started as. Frozen at 0.7.2 (a deprecation
notice plus the 0.7.1 behaviour); `rea/` and `tests/` are its source and stay only for that.
Channel detail: `.rea/knowledge/distribution-channels.md`.

The installer is mechanical — it copies files, prunes what it owns, and edits shims between managed
markers. All workflow intelligence lives in the prompts under `templates/`.

Design record: [docs/rea-roadmap.md](docs/rea-roadmap.md) (master plan, phases 0–5 complete) and
[docs/rea-target-state.md](docs/rea-target-state.md) (readev-tools design).

## Tech stack

- **Node.js ≥20** — the installer (`src/`, CommonJS, zero runtime deps), tested with `node:test`.
- **Python 3.11+ / Typer / setuptools / pytest / ruff** — the frozen `rea-dev` shim only. No new
  features land here.

## Architecture rules

1. **The installer is dumb, the prompts are smart** — `src/` copies files, resolves ownership, and
   writes shims. No workflow decisions in JS; they belong in `templates/commands/` and
   `templates/agents/`.

2. **Sources are tool-agnostic** — author under `core/` and `templates/`. Per-tool placement
   (`.claude/`, `.gemini/`, …) is the installer's job. `.claude/` in this repo is *install output*
   from dogfooding: never edit it directly — change the template, then re-run
   `node bin/readev-tools.js setup .`.

3. **Ownership and idempotence** — `.rea/.rea-manifest.json` records what the installer owns.
   Re-running `setup` overwrites owned files and prunes retired ones; it never blind-overwrites a
   user file. Shim files (`CLAUDE.md`, `AGENTS.md`, `.gemini/settings.json`) are edited only between
   the managed `readev-tools:start` / `readev-tools:end` markers — content outside them is the
   user's. Never write those marker comments literally into prose: a second pair makes the installer
   refuse the file as ambiguous.

4. **Every filesystem mutation goes through `src/safe-path.js`** — realpath-aware containment that
   closed a CWE-59 symlink-escape class. A new write, move, or delete path that bypasses it is a
   security regression, not a style issue (`.rea/decisions/0002-safe-path-hardening.md`).

5. **Composable agents** — agents are building blocks, commands are orchestrators. Agents never call
   other agents; every agent must work standalone and inside a command workflow.

6. **Branch workflow** — never push to `main` directly. Work on a branch (`feature/*`, `fix/*`,
   `chore/*`, `docs/*`, `hotfix/*`), open a PR to `main`, merge once the `test` check passes — main's
   protection requires it. `staging` exists but has been dormant since 2026-04.

7. **Versioning** — `package.json` holds the released version (npm, semver). `pyproject.toml` is
   frozen at 0.7.2; bump it only if PyPI ever needs another deprecation notice.

## Commands

```bash
npm test                          # node --test --test-concurrency=1 test/*.test.js (serial: some
                                  # tests swap sibling modules on disk)
pytest                            # the frozen Python shim
ruff check . && ruff format .     # lint + format (ruff is pinned in [dev] so CI is deterministic)

node bin/readev-tools.js setup .  # run the installer from source, no publish needed
npx readev-tools setup|verify|migrate <project>   # the published entry points
```

## File structure

```
bin/readev-tools.js   # npx entry — requires src/cli.js
src/                  # installer core: cli (setup|verify|migrate, --dry-run), setup (orchestrator),
                      # place, shims, prune, manifest, retired-list, verify, migrate,
                      # settings-surgery, legacy-scan, rea-archive, safe-path
test/                 # node:test suites per src/ module + templates.test.js (link + tag checks)
core/                 # tool-agnostic foundation shipped to hosts: principles, craft-checklist,
                      # rea-schema
templates/            # what the installer places: AGENTS.md, per-tool shims, .rea/ scaffold
  commands/           # the nine slash commands — the product
  agents/             # agent prompts + skill-writer-patterns.md
rea/, tests/          # frozen rea-dev 0.7.2 Python shim (legacy templates live under rea/templates/)
docs/                 # roadmap, target state, research
.rea/                 # this project's own memory graph (dogfooded)
.claude/, .gemini/    # install output — generated, not hand-edited
```
