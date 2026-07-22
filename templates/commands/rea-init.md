---
name: rea-init
description: "Tiered bootstrap ritual for a project — quick tier (default, ~1-2 min) classifies the project and generates `AGENTS.md`, the `.rea/` structure, the craft-checklist reference, and per-tool shims; `--full` adds GitHub prerequisites, a staging branch, branch protection, CI workflows, and a secrets checklist. Use once, when setting up a project."
---

Principles: D, L (`core/principles.md`)

Bootstrap this project. Detect what already exists before writing anything — never assume a
greenfield project or overwrite content that is already there. This is the L habit in practice:
every check below either finds a concrete fact on disk or asks the human; nothing is guessed. Work
through the steps in order.

## Step 0 — Determine the tier

Two tiers:

- **Quick (default, ~1-2 min):** the minimum to start working — `AGENTS.md`, the `.rea/`
  structure, the craft-checklist reference, and the per-tool shims. No GitHub, no CI, no branch
  protection.
- **Full (opt-in via a `--full` flag, or an explicit request):** everything quick tier does, plus
  GitHub prerequisites, a staging branch, branch protection, CI workflows, and a secrets checklist.

If the human did not request `--full`, run Steps 1 through 6 and stop at the quick-tier report.
Only run Step 7 onward when `--full` was explicitly requested.

**Boundary:** this command is the *intelligent* layer of setup — classification, codebase
analysis, and content decisions, all made fresh for this project. Placing files into each host
tool's own folder, tracking a per-project ownership manifest, and pruning files this tool no
longer owns is mechanical work that belongs to a later, dumb installer layer — this command writes
the root files and the `.rea/` directories directly and does not own that manifest or its prune. If
a shim later drifts from what this command wrote, `rea-tidy` reconciles it — this command does not
re-run that reconciliation itself.

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

Read the existing `AGENTS.md` and check for two kinds of sections:

- **This command's own always-on sections** — behaviour steering, the `capture` reflex, a
  read-pull instruction, and a map of pointers (the content Step 3 below describes in full). These
  are well-known, safe content — if any is missing, add it immediately without asking.
- **Project-specific sections** — project description, tech stack, architecture rules, file
  structure, and commands (build/test/lint). For each one that is missing, report it and ask:
  "Should I add the missing sections? I'll ask a question for each one, or generate a draft from
  the codebase via `explorer` if you'd rather review than answer."

Append only the missing sections. **Never modify existing content** — an audit only fills gaps, it
never rewrites what a human already wrote. Once the audit's additions (if any) are settled,
continue to Step 3.

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

## Step 3 — Finalize AGENTS.md

Write (or, on brownfield, extend) `AGENTS.md` as the project's single, canonical rules file — never
a tool-specific file as the primary source. It holds:

- **Always-on content** (this command's own, from Step 1B's checklist if brownfield, written fresh
  otherwise): behaviour steering (a thinking-engineer, anti-sycophantic default — disagree when the
  evidence says so, ground claims, ask before assuming on anything consequential); the `capture`
  reflex (its three triggers — a correction/lesson, a non-obvious decision, a bug's root cause —
  and the memory-write filter); a read-pull instruction (pull relevant `.rea/` notes on demand,
  never auto-dump the store); and a map of pointers to `core/principles.md`, **`core/craft-checklist.md`**,
  `core/rea-schema.md`, and `.rea/`.
- **Project-specific content**, from Step 1B / 1C / 2: project description, tech stack,
  architecture rules, file structure, and commands.

On brownfield, this step only adds what Step 1B found missing — it never rewrites existing
content. On undocumented or greenfield, this is the first write of the file.

## Step 4 — Create the `.rea/` structure

Create, if missing: `.rea/knowledge/`, `.rea/decisions/`, `.rea/sessions/`, `.rea/plans/` — the
typed graph per `core/rea-schema.md`. Never touch the contents of a directory that already exists;
only create what's missing.

## Step 5 — Write per-tool shims (never blind-overwrite — G6b)

Per `core/rea-schema.md`'s shim write semantics:

- **`CLAUDE.md`** — write inside managed markers: `<!-- rea-tools:start -->` … `@AGENTS.md` …
  `<!-- rea-tools:end -->`. If the file already exists with content outside the markers, preserve
  it untouched; only the managed region is written or replaced.
- **Gemini's `settings.json`** — a structured read-modify-write merge: read the existing file (if
  any), add or update the `context.fileName` key so it includes `AGENTS.md`, and leave every other
  key exactly as found.

Only write a shim for a tool that does not already read `AGENTS.md` on its own — do not invent
extra shim files for a tool that reads it natively.

## Step 6 — Quick-tier report

If `--full` was not requested, stop here and report:

```
AGENTS.md — <created / audited, N sections added>
.rea/     — <created / already present>
Shims     — CLAUDE.md, Gemini settings.json
GitHub / CI / branch protection — skipped (quick tier). Re-run with --full to add them.
```

## Step 7 — Full tier: GitHub prerequisites

Check that the following are in place before doing anything GitHub-specific:

- **Authenticated:** run `gh auth status`. If not authenticated (or the CLI isn't installed), stop
  and tell the human to authenticate first.
- **`workflow` scope:** check the token scopes reported by `gh auth status`. If `workflow` is
  missing, stop and tell the human to refresh the token with that scope.
- **A GitHub remote exists:** run `git remote -v`. If none exists, stop and tell the human to push
  the repo to GitHub first.

A failed check stops the rest of the full tier (Steps 8 onward) — do not proceed to the staging
branch, branch-protection, or CI steps without it. It does not undo the quick-tier work already
completed; that stands regardless.

## Step 8 — Full tier: create the staging branch

```
git checkout -b staging 2>/dev/null || true && git push origin staging 2>/dev/null || true && git checkout -
```

Idempotent — if `staging` already exists locally or on the remote, this is a no-op.

## Step 9 — Full tier: branch protection

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

## Step 10 — Full tier: CI workflows

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

## Step 11 — Full tier: leakage check

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

## Step 12 — Full tier: secrets checklist and report

Print the final summary:

```
AGENTS.md          — <created / audited, N sections added>
.rea/               — <created / already present>
Shims               — CLAUDE.md, Gemini settings.json
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

- **Quick tier is the default.** Full-tier steps (7-12) run only when the human explicitly
  requested `--full`.
- **`AGENTS.md` is the canonical rules file this command authors** — never write project rules or
  steering content into a tool-specific file as the primary source; per-tool shims exist only to
  point back to it.
- **Never destroy existing content.** A brownfield audit (Step 1B) only appends missing sections;
  it never rewrites what a human already wrote.
- **Never blind-overwrite a shim (G6b).** `CLAUDE.md` is edited only inside
  `<!-- rea-tools:start -->` … `<!-- rea-tools:end -->`; Gemini's `settings.json` is a
  field-by-field merge, never a whole-file rewrite.
- **Mechanical, cross-tool file placement is out of scope.** Placing files into each host tool's
  own folder, tracking an ownership manifest, and pruning files this tool no longer owns belong to
  a later installer layer, not this command. `rea-tidy` reconciles any drift a shim develops
  later — this command does not repeat that reconciliation itself.
- **Degrade gracefully on the full tier.** Missing `gh` auth, a missing `workflow` scope, no
  GitHub remote, or a private repo (branch protection needs a paid tier) each stop only the
  affected step with a clear message — never crash the whole run.
- **Never proceed past a human question silently.** The greenfield questions (Step 2) and the
  brownfield missing-section prompt (Step 1B) both wait for an answer before writing.
