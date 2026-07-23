---
name: rea-init
description: "Intelligent bootstrap ritual for a project — quick tier (default, ~1-2 min) classifies the project and authors `AGENTS.md`'s project-specific sections (description, tech stack, architecture rules, file structure, commands); `--full` adds GitHub prerequisites, a staging branch, branch protection, CI workflows, and a secrets checklist. Requires the mechanical layer to already be installed via `npx readev-tools setup`. Use once per project, right after that."
---

Principles: D, K, L (`core/principles.md`)

Bootstrap this project's content — the intelligent layer only. Detect what already exists before
writing anything — never assume a greenfield project or overwrite content that is already there.
This is the L habit in practice: every check below either finds a concrete fact on disk or asks
the human; nothing is guessed. Work through the steps in order.

## Step 0 — Preflight: confirm the mechanical layer, then pick a tier

**Preflight.** `/rea-init` never runs against a project the installer hasn't touched yet — it only
ever adds content on top of a scaffold that is already there. Check for the mechanical layer the
installer (`npx readev-tools setup`) is responsible for:

- Does `.rea/.rea-manifest.json` exist?
- Does `.rea/` exist, with its `knowledge/`, `decisions/`, `sessions/`, `plans/` scaffold?
- Does `core/` exist, with `principles.md`, `craft-checklist.md`, `rea-schema.md`?

If any of the three is missing, print:

```
The mechanical layer is not installed yet. Run `npx readev-tools setup` first, then re-run /rea-init.
```

and **stop — do not proceed to Step 1.** Writing project-specific content on top of a
half-installed project (no `.rea/plans/` to hold anything, dangling `core/` pointers inside
`AGENTS.md`) produces a broken, half-configured project; refusing to start is the safer failure.

Once the preflight passes, pick a tier:

- **Quick (default, ~1-2 min):** the minimum to start working on this project — classify it and
  author `AGENTS.md`'s project-specific sections. No GitHub, no CI, no branch protection.
- **Full (opt-in via a `--full` flag, or an explicit request):** everything quick tier does, plus
  GitHub prerequisites, a staging branch, branch protection, CI workflows, and a secrets checklist.

If the human did not request `--full`, run Steps 1 through 3 and stop at the quick-tier report
(Step 4). Only run Step 5 onward when `--full` was explicitly requested.

**Boundary:** this command is the *intelligent* layer of setup — classification, codebase
analysis, and content decisions, all made fresh for this project. Placing files into each host
tool's own folder, creating the `.rea/` scaffold, writing the per-tool shims, and authoring
`AGENTS.md`'s fixed always-on block (behaviour steering, the `capture` reflex, the read-pull
instruction, the map of pointers) is mechanical work the installer already did, once, before this
command ever runs — this command adds only `AGENTS.md`'s **project-specific** content, and only
**outside** the `<!-- readev-tools:start -->` … `<!-- readev-tools:end -->` markers the installer owns.
If a shim later drifts from what the installer wrote, `rea-tidy` reconciles it — this command does
not touch shims at all.

## Step 1 — Classify project state

Check what already exists:
- Is there an `AGENTS.md` at the project root?
- Is there a `.rea/` directory?
- What is the tech stack? Look for the project's own manifest/config files (package manager
  files, build config, language-specific project files).

Classify into one of three states:

| State | Condition | Action |
|---|---|---|
| **Brownfield** | `AGENTS.md` exists | Audit it — Step 1B |
| **Undocumented** | No `AGENTS.md`, but code files exist | Auto-generate via `explorer` — Step 1C |
| **Greenfield** | No `AGENTS.md`, and the project is empty or holds only config files (`.git`, `.gitignore`, `README.md`) | Ask the human — Step 2 |

To detect code files, look for source files across the common language extensions; if any exist,
the project is not greenfield.

## Step 1B — Brownfield: audit AGENTS.md

Read the existing `AGENTS.md` and check its **project-specific sections** — project description,
tech stack, architecture rules, file structure, and commands (build/test/lint) — all of which live
outside the `<!-- readev-tools:start -->` … `<!-- readev-tools:end -->` markers the installer owns. For
each one that is missing, report it and ask: "Should I add the missing sections? I'll ask a
question for each one, or generate a draft from the codebase via `explorer` if you'd rather review
than answer."

Append only the missing sections, outside the markers. **Never modify existing content** — an
audit only fills gaps, it never rewrites what a human already wrote, and it never touches the
managed block (Step 0's preflight already guarantees that block is in place). Once the audit's
additions (if any) are settled, continue to Step 3.

## Step 1C — Undocumented: auto-generate via explorer

If the project has code but no `AGENTS.md`, do not ask the greenfield questions. Use the
`explorer` agent to investigate: project structure, tech stack, entry points, architecture
patterns, build/test/lint commands, and existing conventions.

Draft the project-specific content from these findings — project description, tech stack,
architecture rules, file structure, commands — and show it to the human:

```
I analyzed the codebase and drafted the project-specific section of AGENTS.md.
Please review — is anything wrong or missing?
```

Apply any corrections the human provides, then continue to Step 3.

## Step 2 — Greenfield: ask and write

If the project is truly empty, ask the human these questions one at a time:
1. What does this project do? (one sentence)
2. What is the tech stack?
3. What are the main architectural rules to always follow?
4. What are the build, test, and lint commands?

Draft the project-specific content from the answers, then continue to Step 3.

## Step 3 — Finalize AGENTS.md's project-specific sections

Write (or, on brownfield, extend) `AGENTS.md`'s **project-specific** content, from Step 1B / 1C /
2's findings: project description, tech stack, architecture rules, file structure, and commands.
This content always lives **outside** the `<!-- readev-tools:start -->` … `<!-- readev-tools:end -->`
markers — append it after `<!-- readev-tools:end -->`, and never edit anything inside the markers.
That block is the installer's fixed always-on content (behaviour steering, the `capture` reflex,
the read-pull instruction, and the map of pointers) — it is already in place, because Step 0's
preflight refuses to run this command until it is.

On brownfield, this step only adds what Step 1B found missing — it never rewrites existing
content. On undocumented or greenfield, this is the first write of the project-specific content;
the always-on block is already there from the installer.

## Step 4 — Quick-tier report

If `--full` was not requested, stop here and report:

```
AGENTS.md — <created / audited, N sections added>
GitHub / CI / branch protection — skipped (quick tier). Re-run with --full to add them.
```

## Step 5 — Full tier: GitHub prerequisites

Check that the following are in place before doing anything GitHub-specific:

- **Authenticated:** run `gh auth status`. If not authenticated (or the CLI isn't installed), stop
  and tell the human to authenticate first.
- **`workflow` scope:** check the token scopes reported by `gh auth status`. If `workflow` is
  missing, stop and tell the human to refresh the token with that scope.
- **A GitHub remote exists:** run `git remote -v`. If none exists, stop and tell the human to push
  the repo to GitHub first.

A failed check stops the rest of the full tier (Steps 6 onward) — do not proceed to the staging
branch, branch-protection, or CI steps without it. It does not undo the quick-tier work already
completed; that stands regardless.

## Step 6 — Full tier: create the staging branch

```
git checkout -b staging 2>/dev/null || true && git push origin staging 2>/dev/null || true && git checkout -
```

Idempotent — if `staging` already exists locally or on the remote, this is a no-op.

## Step 7 — Full tier: branch protection

Check whether the repo is private:

```
gh api repos/{owner}/{repo} --jq '.private'
```

If `true`: warn the human that branch protection requires a paid GitHub tier on private repos, and
skip this step.

If `false`: apply protection to `main` and `staging`:

```
gh api repos/{owner}/{repo}/branches/{branch}/protection --method PUT --input - <<EOF
{"required_status_checks":{"strict":true,"contexts":["test"]},"enforce_admins":true,"required_pull_request_reviews":null,"restrictions":null}
EOF
```

## Step 8 — Full tier: CI workflows

Create, if missing:

- **`ci.yml`** — a workflow that runs the project's own test and lint commands (whatever Step 1's
  classification or Step 2's answers found) on every push and pull request.
- **`claude-review.yml`** — a workflow that lets a human trigger an AI review on a pull request or
  issue comment, using whatever review action the project's host tooling provides. If missing,
  create it with a job that fires on a comment mentioning the assistant and runs that action.
- **`.gitattributes`** — always create if missing, regardless of stack, normalizing line endings:

```
* text=auto eol=lf
*.py text eol=lf
*.ts text eol=lf
*.tsx text eol=lf
*.js text eol=lf
*.json text eol=lf
*.yml text eol=lf
*.toml text eol=lf
*.md text eol=lf
*.sh text eol=lf
```

- **A placeholder test** — if no test files exist anywhere in the project (checked recursively),
  create one appropriate to the detected stack (for example a `test_placeholder` function that
  does nothing but exists, or the language's equivalent), so principle D's feedback loop is never
  empty from day one. Remove-me-once-real-tests-exist is the intent, not a permanent fixture.

## Step 9 — Full tier: leakage check

Some host tools expose a global, cross-project config listing extra directories they always treat
as visible (for example, an "additional directories" permission list). If the running tool exposes
such a config, read it and get this project's root path.

For each entry in that config: normalize both paths (forward slashes, lowercase, no trailing
slash) and check whether the project root is a prefix of, or equal to, the entry. If any match is
found, warn the human:

```
Leakage detected — this project's path appears in the host tool's global extra-directories config:
  <matched entry>

This causes this project's commands and agents to appear in every other project session. Almost
never intentional. Fix: remove the entry from that global config.
```

If no match is found, skip silently.

## Step 10 — Full tier: secrets checklist and report

Print the final summary:

```
AGENTS.md          — <created / audited, N sections added>
staging branch      — <created / already present>
branch protection   — <main + staging / skipped — private repo>
ci.yml              — <created / already present>
claude-review.yml   — <created / already present>
.gitattributes      — <created / already present>
placeholder test    — <created / not needed — tests already exist>

Add the secret(s) claude-review.yml's action requires (commonly an API key for the review
action):
  gh secret set <SECRET_NAME>
```

## Rules

- **Preflight before anything else.** Step 0 stops before Step 1 whenever `.rea/`, `core/`, or the
  ownership manifest is missing — this command never writes project-specific content into a
  project the installer hasn't set up yet.
- **Quick tier is the default.** Full-tier steps (5-10) run only when the human explicitly
  requested `--full`.
- **`AGENTS.md` is the canonical rules file** — this command authors only its
  **project-specific** sections; the installer already wrote the fixed always-on block before this
  command ever runs. Never write project rules or steering content into a tool-specific file as
  the primary source.
- **Never write inside the managed markers.** `<!-- readev-tools:start -->` … `<!-- readev-tools:end -->`
  is the installer's fixed always-on block; this command's project-specific content always goes
  outside it, appended after `<!-- readev-tools:end -->`.
- **Never destroy existing content.** A brownfield audit (Step 1B) only appends missing sections;
  it never rewrites what a human already wrote.
- **Mechanical, cross-tool file placement is out of scope.** Placing files into each host tool's
  own folder, creating the `.rea/` scaffold, writing the per-tool shims, and authoring `AGENTS.md`'s
  always-on block belong to the installer (`npx readev-tools setup`) — Step 0's preflight refuses to
  run this command until that already happened. `rea-tidy` reconciles any drift a shim develops
  later; this command does not touch shims at all.
- **Degrade gracefully on the full tier.** Missing `gh` auth, a missing `workflow` scope, no
  GitHub remote, or a private repo (branch protection needs a paid tier) each stop only the
  affected step with a clear message — never crash the whole run.
- **Never proceed past a human question silently (principle K — the human QA gate).** The
  greenfield questions (Step 2) and the brownfield missing-section prompt (Step 1B) both wait for
  an answer before writing.
