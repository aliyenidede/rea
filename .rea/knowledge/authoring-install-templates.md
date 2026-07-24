---
name: authoring-install-templates
description: How to author files under templates/ so they survive the dumb-copy installer and actually ship.
type: reference
links: []
---

# Authoring install templates

The installer copies `templates/` into a host project **verbatim** — no path rewriting, no
glob magic ("CLI is dumb, Claude is smart"). So author every file for where it **lands** in a
host, not for where it lives in this repo. Three traps, each already learned the hard way:

## 1. Relative links resolve at the host, not the source tree

A template's `[text](../x.md)` is followed from its host-destination depth. An agent placed at
`.claude/agents/x.md` reaches the shared trio via `../../core/rea-schema.md` — a *different*
number of `..` than its source position (`templates/agents/x.md`) would suggest. Count the `..`
for the destination. Exception: meta-READMEs that document the source tree itself (e.g.
`templates/README.md`) are never copied out, so they correctly stay source-relative.
(lesson 2026-07-22 04:48)

**Guarded** by `test/templates.test.js` (TEST 1): it places the real template set into a temp
host and asserts every intra-repo relative link resolves at the host layout. It also backstops
stray unmatched closing tags. Run `npm test` after touching any link or tag.

## 2. Packaging globs silently skip dotted/asset dirs

A file that isn't in the package manifest simply never ships — no error. Dotted dirs
(`.claude/`, `.rea/`, `.github/`) are the historic blind spot: pyproject `package-data`
wildcards dropped `.claude`/`.github` outright (lesson 2026-03-15), and npm `files` carries the
same trap. Verify against `package.json` `files`, and confirm every dotted/asset dir actually
appears in `npm pack --dry-run` output — add an explicit glob when a wildcard can't be trusted
to include it. Re-check whenever you add a new top-level template dir.

## 3. A source edit goes stale in its synced copies

Editing a `templates/` file does **not** update copies already placed on disk (a project's own
`.claude/…`, any host's placed tree). After any `templates/` edit, re-run the installer to
re-sync consumers, then verify the copy actually changed — don't assume the edit propagated.
(lesson 2026-04-25 08:15)

## 4. Never write the managed-marker comments literally into prose

A managed file (`AGENTS.md`, `CLAUDE.md`, any shim) must contain **exactly one** marker pair.
Documenting the mechanism by pasting the literal `<!-- readev-tools:… -->` comments into body text
creates a second pair, and `shims.js` then refuses the whole file — "Ambiguous readev-tools managed
markers … refusing to write" — which blocks every later `setup`. Refer to them without the comment
syntax (backticked `readev-tools:start` / `readev-tools:end`) instead. Note `verify` does **not**
catch this state: its shim check is a lenient first-pair probe and still reports "shims intact".
(2026-07-24, hit while moving this repo's project rules into `AGENTS.md`)

---

Authoring lives only under the neutral `templates/` tree — never a host tool's own folder
(`.claude/`, `.omp/`); per-tool placement is the installer's job. See `templates/agents/skill-writer.md`.
