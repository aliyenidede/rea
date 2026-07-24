# rea-dev — deprecated, installs nothing

This Python CLI is no longer developed, and as of 0.7.3 it no longer installs anything: `rea setup` prints where to go and exits non-zero. It is replaced by **[readev-tools](https://www.npmjs.com/package/readev-tools)**, an npx installer that does the same job — and works with any AI coding tool that reads `AGENTS.md`, not only Claude Code.

```bash
npx readev-tools setup <project>
```

Needs Node.js 20 or later. No Python, no `pip install`.

## Migrating from rea-dev

```bash
npx readev-tools migrate <project>   # one-time: archives the 0.7.x layout, never deletes
npx readev-tools setup <project>     # place the current commands, agents, core/, .rea/, shims
npx readev-tools verify <project>    # read-only check: files, shims, CI
```

`migrate` moves the old `.rea/log/` and retired command files into `.rea/_archive/` instead of removing them, and it refuses to run twice. Run it once, then use `setup` for every update.

Command mapping:

| rea-dev 0.7.x | readev-tools |
|---|---|
| `/rea-brainstorm` | `/rea-grill` — codebase-aware interrogation, one question at a time |
| `/rea-commit` | `/rea-ship` — detects repo state first, then commits / opens a PR / deploys |
| `/rea-verify` | `npx readev-tools verify` — moved to the CLI |
| `/rea-update` | `npx readev-tools setup` — re-run to update |
| `/rea-worktree` | dropped |
| `/rea-init` `/rea-plan` `/rea-execute` `/rea-wrap` `/rea-write-skill` | same names, rewritten |
| — | new: `/rea-fix` (short path for a small fix), `/rea-tidy` (reconcile memory, shims, rules) |

## What 0.7.3 does

Nothing to your project. `rea setup <path>` prints the notice above and exits 1 — it does not create directories or copy templates, and the wheel no longer carries them. A script that still calls it fails loudly instead of quietly installing a command set retired back in Phase 3.

- 0.7.2 and earlier: copied the old Claude Code command and agent templates.
- 0.7.3: signpost only.

## Staying on the old version

```bash
pip install rea-dev==0.7.1
```

0.7.1 still installs the old templates and stays available as the frozen fallback. The matching source tree is tagged `pre-redesign-v0.7.1` in the repository.

## Why the move

- **Any tool, not just Claude Code** — instructions live in `AGENTS.md`; per-tool pointers (`CLAUDE.md` import, Gemini `settings.json`) are generated and merged between managed markers, never blind-overwritten.
- **Typed project memory** — `.rea/` holds `knowledge/`, `decisions/` (numbered ADRs), `sessions/`, and `plans/` as plain markdown with wikilinks; it survives a session restart and moves between tools.
- **`npx`, not `pip`** — no interpreter to match, no virtualenv, and the installer prunes the files it owns when they are removed upstream.

Source and issues: <https://github.com/aliyenidede/rea>

## License

MIT
