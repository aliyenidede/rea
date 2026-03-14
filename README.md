# REA

A portable development toolkit that bootstraps a structured Claude Code workflow into any project.

![CI](https://github.com/aliyenidede/rea/actions/workflows/ci.yml/badge.svg)
![Python](https://img.shields.io/badge/python-3.11%2B-blue)

```bash
pip install git+https://github.com/aliyenidede/rea.git
rea init <project>          # copies slash commands + creates .rea/ dirs
# open Claude Code → /rea-init
```

---

## The problem

Claude Code is powerful but stateless. Each session starts cold: no memory of past decisions, no consistent workflow, no plan files, no branch discipline. You rebuild context every time.

REA solves this by giving Claude a fixed structure to operate inside — the same commands, the same plan format, the same branch rules — across every project and every session.

---

## What it does

REA installs four slash commands into your project and a structured plan/log system. The CLI is mechanical — it copies files. All intelligence runs through Claude.

```
rea init             → copies .claude/commands/ + creates .rea/
/rea-init            → scans project, installs missing config, sets up GitHub
/rea-plan            → full planning pipeline with interrogation loop
/rea-commit          → detects branch, opens PR to correct target
/rea-verify          → health check, reports missing pieces with fix commands
```

---

## Quickstart

**Requirements:** Python 3.11+, `gh` CLI authenticated (with `workflow` scope), git repo with GitHub remote.

```bash
# 1. Install
pip install git+https://github.com/aliyenidede/rea.git

# 2. Add REA to your project
rea init /path/to/project

# 3. Open Claude Code in that project and run
/rea-init
```

`/rea-init` detects your stack (Node/pnpm, Python, etc.) and installs:
- `.claude/settings.json` — allowed commands
- `.claude/hooks/post-tool-use.sh` — auto-lint on every file write
- `.github/workflows/ci.yml` — test + lint on every PR
- `.github/workflows/claude-review.yml` — `@claude` PR review via Anthropic API
- `.gitattributes` — consistent line endings across platforms
- `staging` branch + GitHub branch protection

Required GitHub secrets after setup:
```bash
gh secret set ANTHROPIC_API_KEY
gh secret set COOLIFY_STAGING_WEBHOOK_URL    # if using Coolify
gh secret set COOLIFY_PRODUCTION_WEBHOOK_URL # if using Coolify
```

---

## Plan pipeline

The most important part of REA. Before writing any code, you run:

```
/rea-plan "add stripe billing"
```

Claude doesn't immediately start coding. It:

1. Researches the relevant files and functions in your project
2. Drafts a technical requirements doc — no code, no PM sections
3. Runs an interrogation loop: *"100% sure this plan is right?"* — finds real problems before they hit production
4. Surfaces decisions with trade-offs and waits for your input
5. Writes three files to `.rea/plans/0001-stripe-billing/`:
   - `spec.md` — what and why
   - `plan.md` — technical requirements
   - `todo.md` — step-by-step execution with a `NEXT:` marker
6. Creates a log entry in `.rea/log/`

The `NEXT:` marker in `todo.md` marks the first incomplete step. Next session, `/rea-plan` finds it and asks to resume — no re-reading the full plan.

---

## Plan file structure

```
.rea/
├── log/
│   └── 2026-03-14-0001-stripe-billing.md
└── plans/
    └── 0001-stripe-billing/
        ├── spec.md    ← what and why
        ├── plan.md    ← technical requirements
        └── todo.md    ← step-by-step with NEXT: marker
```

---

## Branch strategy

```
main      → production
staging   → pre-production
feature/* → PR to staging
hotfix/*  → PR to main
```

`/rea-commit` detects the current branch and opens the PR to the right target automatically.

---

## CLAUDE.md hierarchy

```
~/.claude/CLAUDE.md           ← global rules (all projects)
project/CLAUDE.md             ← project architecture + stack
project/features/x/CLAUDE.md ← feature-specific rules (created by /rea-plan when needed)
```

`/rea-plan` creates a feature-level `CLAUDE.md` when the task opens a new domain (auth, billing, webhooks) or spans multiple sessions.

---

## Flowchart

```mermaid
flowchart TD
    A([Developer]) --> B["pip install rea (one time)"]
    B --> C["rea init — copies commands + creates .rea/"]
    C --> D["Open Claude Code"]
    D --> E["/rea-init"]

    %% INIT
    E --> F{"gh CLI auth OK?"}
    F -->|No| G["Run gh auth login, then retry"]
    F -->|Yes| H{CLAUDE.md exists?}
    H -->|"No — Greenfield"| I["Ask questions, generate CLAUDE.md"]
    H -->|"Yes — Brownfield"| J["Scan existing structure, detect missing"]
    I --> K[Install missing files]
    J --> K
    K --> L[".claude/settings.json + hooks + .github/workflows/"]
    L --> M["Create staging branch"]
    M --> N["Set up GitHub branch protection"]
    N --> O["/rea-verify"]
    O --> P{Issues found?}
    P -->|Yes| Q["Report issues with fix commands"]
    Q --> O
    P -->|No| R([Project ready])

    %% PLAN PIPELINE
    R --> S["/rea-plan — describe task"]
    S --> S0{"NEXT: marker found?"}
    S0 -->|Yes| S1["Ask: resume or new plan?"]
    S1 -->|Resume| AG
    S1 -->|New| T
    S0 -->|No| T
    T[Draft plan]
    T --> U{"100% sure?"}
    U -->|No| V[Find real problems]
    V --> W{"Sure about the problems?"}
    W -->|No| X[Find root problems]
    X --> Y{"Sure now?"}
    Y -->|No| X
    Y -->|Yes| Z[List solutions]
    U -->|Yes| Z
    W -->|Yes| Z
    Z --> AA{Decision needed?}
    AA -->|Yes| AB["Explain trade-offs, you decide"]
    AB --> AC[Lock plan]
    AA -->|No| AC
    AC --> AD[".rea/plans/NNNN-task/ spec+plan+todo, update log"]
    AD --> AE{"New domain? Complex? Multi-session?"}
    AE -->|Yes| AF["Create features/x/CLAUDE.md"]
    AE -->|No| AG
    AF --> AG[Execute]

    %% EXECUTE PIPELINE
    AG --> AH["Follow todo step by step — no questions, no discussion"]
    AH --> AI["/rea-commit"]
    AI --> AJ{Current branch?}
    AJ -->|"feature/*"| AK["Open PR → staging"]
    AJ -->|"hotfix/*"| AL["Open PR → main"]

    %% CI/CD
    AK --> AM["CI: test + lint"]
    AL --> AM
    AM --> AN{CI passed?}
    AN -->|No| AO["@claude why did CI fail, fix it"]
    AO --> AM
    AN -->|Yes| AP["@claude review"]
    AP --> AQ{Review passed?}
    AQ -->|No| AR[Apply feedback]
    AR --> AH
    AQ -->|Yes| AS{Target branch?}
    AS -->|staging| AT["Merge to staging — deploy to staging"]
    AS -->|main| AU["Merge to main — deploy to production"]
    AT --> AV["Test on staging"]
    AV --> AW{OK?}
    AW -->|No| AX[Bug fix]
    AX --> AH
    AW -->|Yes| AY["Open PR → main"]
    AY --> AU

    %% SELF IMPROVEMENT
    AU --> AZ{Lesson learned?}
    AZ -->|Universal| BA["Update ~/.claude/CLAUDE.md — you approve"]
    AZ -->|Project-specific| BB["Update project/CLAUDE.md"]
    BA --> BC([Next project starts smarter])
    BB --> BC
```

---

## License

MIT
