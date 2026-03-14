# REA — Architecture Plan

> Date: 2026-03-14
> Status: Architecture + technical decisions finalized — ready to build

---

## What is REA?

REA is a **portable development toolkit**. Not a separate application.

Install once → `rea init` in any project → full system is installed. Works on Mailwave, mailwave-leads, any future project.

**Core insight:** REA = Boris Cherny's system, bootstrapped automatically, with plan pipeline on top.

**Problem it solves:**
- Current workflow doesn't scale to large projects (Mailwave)
- No structured dev workflow → context lost, mistakes repeated
- Decisions and tasks made during conversations disappear after session ends

---

## Distribution

Private Python package hosted on GitHub Packages.

```bash
pip install rea --index-url https://pip.pkg.github.com/readev
```

Only you can install it. Free via GitHub Packages.

---

## How REA Works

```
pip install rea          ← one time
rea init                 ← copies .claude/commands/ and templates into project
                            (mechanical, no intelligence — just file copy)
    ↓
Claude Code open
    ↓
/rea-init                ← scans project, completes setup intelligently
/rea-verify              ← checks everything is correct
    ↓
ready to work
```

**The CLI (`rea`) has no intelligence.** It only copies files.
**All intelligence is Claude** — through slash commands.

---

## Dependencies

`/rea-init` and `/rea-verify` require:
- `gh` CLI — installed and authenticated (`gh auth login`)
- `git` — initialized repo with GitHub remote

`/rea-verify` checks these first and fails clearly if missing.

---

## What `rea init` (CLI) Does

Copies the base `.claude/commands/` templates into the project. That's it.

```bash
rea init              # current directory
rea init <path>       # specific project
```

Creates:
- `.claude/commands/rea-init.md`
- `.claude/commands/rea-plan.md`
- `.claude/commands/rea-commit.md`
- `.claude/commands/rea-verify.md`
- `.rea/log/`
- `.rea/plans/`

Skips files that already exist. Never overwrites.

Then you open Claude Code and run `/rea-init`.

---

## What `/rea-init` (Slash Command) Does

### Greenfield (no CLAUDE.md)
Asks questions → generates CLAUDE.md → installs full system.

### Brownfield (CLAUDE.md exists)
Scans existing structure → installs only what's missing → never overwrites existing files.

```
/rea-init (on mailwave/)
    ↓
checks: gh CLI installed and authenticated?
    ↓
detects: CLAUDE.md ✅, .claude/settings.local.json ✅, .github/ ❌
detects tech stack: package.json → pnpm, turborepo, vitest, TypeScript
    ↓
installs missing:
  .claude/settings.json             ← allowed commands for this stack
  .claude/hooks/post-tool-use.sh    ← pnpm lint --fix
  .github/workflows/ci.yml
  .github/workflows/claude-review.yml
  .rea/log/
  .rea/plans/
    ↓
creates staging branch if not exists
sets up GitHub branch protection (main + staging)
    ↓
reports:
  ✅ installed
  ⚠️  add these secrets:
      OPENROUTER_API_KEY
      COOLIFY_STAGING_WEBHOOK_URL
      COOLIFY_PRODUCTION_WEBHOOK_URL
```

### File structure after init

```
project/
├── CLAUDE.md
├── .claude/
│   ├── settings.json
│   ├── commands/
│   │   ├── rea-init.md
│   │   ├── rea-plan.md
│   │   ├── rea-commit.md
│   │   └── rea-verify.md
│   └── hooks/
│       └── post-tool-use.sh
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── claude-review.yml
└── .rea/
    ├── log/       ← session logs, git tracked
    └── plans/     ← spec/plan/todo files, git tracked
```

---

## What `/rea-verify` Does

Checks every component and reports status:

```
✅ gh CLI — installed and authenticated
✅ .claude/settings.json — OK
✅ .claude/commands/ — all rea-* present
✅ .claude/hooks/post-tool-use.sh — OK
✅ .github/workflows/ci.yml — OK
✅ .github/workflows/claude-review.yml — OK
✅ CLAUDE.md — present and non-empty
✅ staging branch — exists
⚠️  branch protection — staging rule missing
❌ COOLIFY_STAGING_WEBHOOK_URL secret — missing
❌ COOLIFY_PRODUCTION_WEBHOOK_URL secret — missing

2 issues found:
  1. gh secret set COOLIFY_STAGING_WEBHOOK_URL
  2. gh secret set COOLIFY_PRODUCTION_WEBHOOK_URL
```

Always run `/rea-verify` after `/rea-init`.

---

## Plan Pipeline

You only use two things day-to-day:
```
/rea-plan    → tell Claude what you want, everything else follows
/rea-commit  → commit, push, open PR to correct branch
```

Claude decides: is this a feature, bugfix, or refactor? Creates the right structure.

### Two strict modes — never mixed

**Plan mode** — interrogation loop until plan is bulletproof:

```
/rea-plan "add stripe billing"
    ↓
draft plan
    ↓
"are you 100% sure?" → no → find real problems
    ↓
"sure about the problems?" → no → find root problems
    ↓
"sure now?" → yes
    ↓
solutions:
  - obvious ones → Claude handles
  - real decisions → human decides (with trade-offs explained)
    ↓
plan locked → .rea/plans/<task-name>/spec.md
                              plan.md
                              todo.md
           → .rea/log/<date-task-name>.md
           → project CLAUDE.md updated
    ↓
feature CLAUDE.md?
  - opens new domain (billing, auth, webhook)? → yes, create it
  - has feature-specific rules? → yes, create it
  - multi-session task? → yes, create it
  - simple bugfix / small change? → no, skip it
```

**Execute mode** — todo is law, no questions, no discussion.

Every todo item must be explicit:
```
✅ "src/webhooks/handler.ts oluştur.
    input: POST /webhooks body
    output: 200 veya 400
    test: invalid payload → 400 dönmeli"

❌ "webhook handler yaz"
```

Soldier-level clarity. No interpretation needed.

---

## `/rea-commit` Behavior

Detects current branch → opens PR to correct target:

```
feature/*  → PR to staging
hotfix/*   → PR to main
```

Commit message follows convention from CLAUDE.md:
```
feat(vX.Y.Z): short description   ← new feature
fix(vX.Y.Z): short description    ← bug fix
chore: short description          ← maintenance
```

---

## Log & Plans Structure

Everything git tracked. Nothing is lost between sessions.

```
.rea/
├── log/
│   ├── 2026-03-14-0001-stripe-billing.md
│   ├── 2026-03-15-0002-auth-refactor.md
│   └── ...
└── plans/
    ├── 0001-stripe-billing/
    │   ├── spec.md
    │   ├── plan.md
    │   └── todo.md
    ├── 0002-auth-refactor/
    │   ├── spec.md
    │   ├── plan.md
    │   └── todo.md
    └── ...
```

**Naming:** Claude picks the folder name from the task description.
Format: `<next-number>-<kebab-case-task-name>`
Claude reads existing `.rea/plans/` to determine the next number.

Same feature can have multiple entries (e.g. `0001-stripe-billing`, `0004-stripe-billing-fix`) — each is a separate planning session.

Log entry contains: what was discussed, decisions made, todo produced, status (in progress / done).

---

## CLAUDE.md Hierarchy

```
~/.claude/CLAUDE.md                   ← global, applies to every project
project/CLAUDE.md                     ← project architecture, stack, general rules
project/features/auth/CLAUDE.md       ← auth-specific rules, isolated context
project/features/billing/CLAUDE.md    ← billing-specific rules
```

**Three reasons for feature-level CLAUDE.md:**
1. **Context isolation** — Claude loads only what's relevant, no noise from other features
2. **Feature-specific rules** — constraints that only apply here
3. **Cross-project reuse** — can be copied to other projects

**Lifecycle:** Created by `/rea-plan` only when the task warrants it. Notes added during development. Claude Code loads it automatically when working inside that directory.

---

## Memory vs CLAUDE.md

| | CLAUDE.md | Memory |
|---|---|---|
| **What** | How to work on this project | What we learned while working |
| **Content** | Rules, architecture, permanent constraints | Bugs, gotchas, history, credentials |
| **If ignored** | Claude breaks things | Context missing, not catastrophic |

**Graduation mechanism:**
```
bug found → memory ("X caused Y")
    ↓
REA surfaces: "should this become a permanent rule?"
    ↓
yes → CLAUDE.md ("never use X because Y")
universal? → promoted to ~/.claude/CLAUDE.md (human approves)
```

---

## Global Self-Improvement

```
lesson learned on any project
    ↓
REA surfaces: "universal rule or project-specific?"
    ↓
universal → ~/.claude/CLAUDE.md (human approves)
project   → project/CLAUDE.md
    ↓
next project starts with accumulated wisdom
```

Not automatic. Human approves every promotion.

---

## Branch Strategy

```
main        → production (Hetzner, always live)
staging     → pre-production testing
feature/*   → development, PR opens to staging
hotfix/*    → emergency production fix, PR opens to main
```

**Protection rules:**
- `main` — no direct push, PR from staging only, CI must pass
- `staging` — no direct push, PR from feature/* only, CI must pass
- `feature/*` — free, commit as needed
- `hotfix/*` — direct PR to main, CI must pass, then sync main → staging

**Daily flow:**
```
feature/* → PR → staging → CI + @claude review → merge → Coolify staging deploy
staging → PR → main → merge → Coolify production deploy
```

**REA sets up automatically:** staging branch, branch protection rules, CI/CD workflows, Coolify webhooks
**You do once:** add GitHub secrets, create staging + production environments in Coolify

---

## Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| REA CLI language | Python | Simple file copy tool, no logic needed |
| Distribution | pip + GitHub Packages (private) | Free, private, only you can install |
| Plan pipeline | `/rea-plan` slash command | No extra cost, runs inside Claude Code session |
| Plan files location | `.rea/plans/<task>/` | Isolated per task, no conflicts, git tracked |
| Log location | `.rea/log/` | Git tracked, survives sessions |
| GitHub Actions — CI | `anthropics/claude-code-action` | test, lint, typecheck on every PR |
| GitHub Actions — PR review | `anthropics/claude-code-action` + OpenRouter | `ANTHROPIC_BASE_URL: https://openrouter.ai/api/v1` |
| PR review cost | ~$4–10/month (50 PRs) | Same price on Anthropic and OpenRouter |
| Feature-level CLAUDE.md | Created by `/rea-plan` when warranted | Not always — only for complex/domain-specific tasks |
| Slash command naming | `rea-*` prefix | Avoids conflicts with Claude Code built-ins |
| Coolify webhooks | Two separate URLs | Staging and production deploy independently |

---

## GitHub Actions — claude-review.yml

```yaml
- uses: anthropics/claude-code-action@v1
  with:
    anthropic_api_key: ${{ secrets.OPENROUTER_API_KEY }}
    claude_args: --allowedTools "Bash(pnpm:*),Bash(git:*),Bash(npm:*)"
  env:
    ANTHROPIC_BASE_URL: "https://openrouter.ai/api/v1"
```

Triggered by `@claude` mention in PR comments/reviews.

**Bash allowed:** `pnpm:*`, `git:*`, `npm:*` — Claude can run tests, lint, git diff.
**Bash blocked:** `rm`, `curl`, `sh` and everything else — no destructive commands.

**Key use case:** CI fails → `@claude CI neden kırıldı, düzelt` → Claude runs tests, finds issue, commits fix, pushes.

PR #841 on claude-code-action will make `base_url` a native parameter — update when merged.
