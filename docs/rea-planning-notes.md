# REA — AI Workflow & Agent Platform — Planning Notes

> Date: 2026-03-14
> Status: Initial brainstorming — needs detailed planning
> Scope: Personal AI operations platform, project-agnostic

---

## 1. What is REA?

REA is a personal AI agent orchestration platform. It creates a self-improving AI team that:
- Develops software (team of agents with different roles)
- Generates content from daily work (X/Twitter, LinkedIn, blog)
- Learns from every task and improves itself over time
- Works across ALL projects (Mailwave, mailwave-leads, mailwave-content, future projects)

**This is NOT a Mailwave-specific tool.** It's a general-purpose AI operations platform.

---

## 2. Agent Team — Development Workflow

### Roles

| Role | Responsibility | What it does |
|------|---------------|-------------|
| **Team Lead** | Plan, delegate, review | Breaks tasks into subtasks, assigns to agents, evaluates results |
| **Developer** | Write code | Feature implementation, refactoring, new modules |
| **Reviewer** | Code review | Quality, security, best practices, style consistency |
| **Tester** | Write & run tests | Unit tests, integration tests, edge cases |
| **Bug Fixer** | Find & fix errors | Error analysis, root cause, fix implementation |
| **Researcher** | Research & recommend | Library selection, best practices, architecture options |
| **Content Writer** | Generate content | Docs, blog posts, marketing content, X posts |
| **QA / Validator** | Final check | Validates all output, proposes self-improvement |

### Development Loop

```
Human → gives task
    ↓
Team Lead → analyzes task, breaks into subtasks
    ↓
Researcher → investigates approach if needed
    ↓
Developer → writes code
    ↓
Reviewer → reviews code, gives feedback
    ↓
Developer → applies feedback
    ↓
Tester → writes tests, runs them
    ↓
Bug Fixer → fixes any failures
    ↓
QA/Validator → final quality check + lesson learned
    ↓
Team Lead → presents result to human
```

### Key Principles
- Human is always the final decision maker
- Agents can disagree with each other (Reviewer can reject Developer's code)
- Every task generates a "lesson learned" entry
- Agent prompts evolve based on accumulated lessons

---

## 3. Content Generator

### Content from Daily Work

REA watches what you do across all projects and generates content:

| Input | Output | Platform |
|-------|--------|----------|
| Planning session decisions | "Today I decided X because Y..." thread | X/Twitter |
| Code changes / new features | Technical breakdown post | X/Twitter, LinkedIn |
| Bug fixes with interesting root causes | "Here's a bug that taught me..." post | X/Twitter |
| Architecture decisions | Thought leadership thread | LinkedIn |
| Tool/library evaluations | "I compared X vs Y, here's what I found" | X/Twitter, Blog |
| Milestones | Progress update post | X/Twitter, LinkedIn |
| Conversation insights | Extracted wisdom posts | X/Twitter |

### Content Generation Flow

```
Daily work / conversations / git commits
    ↓
Context Engine → extracts interesting decisions, learnings, insights
    ↓
Content Writer agent → drafts content per platform
    ↓
Human → reviews, approves, posts (or auto-posts if trusted)
```

### Personalization
- Learns your voice/tone from approved posts over time
- Adapts content style per platform (X = concise, LinkedIn = professional, Blog = detailed)
- Tracks which posts perform well → generates more of that type

---

## 4. Context Engine

The brain that connects everything:

| Function | What it does |
|----------|-------------|
| **Conversation tracker** | Extracts key decisions from Claude sessions |
| **Work summarizer** | "Today I did X, Y, Z" daily digest |
| **Cross-project awareness** | Knows state of all projects simultaneously |
| **Decision logger** | Why was X chosen over Y? Searchable history |
| **Insight extractor** | Finds patterns across projects |

### Data Sources
- Claude Code conversation history
- Git commit history across all repos
- Task/todo completion data
- Content performance metrics (X analytics, blog views)

---

## 5. Self-Improvement Loop

This is what makes REA different from just using Claude:

```
Task completed
    ↓
QA Validator asks: "What went well? What didn't?"
    ↓
Analysis:
  - Developer wrote correct code on first try ✅
  - Reviewer caught 2 security issues ✅
  - Tester missed an edge case ❌
  - Content Writer's tone was too formal ❌
    ↓
Lessons saved:
  - "Add edge case checklist to Tester's prompt"
  - "Reviewer's security checks are working — keep"
  - "Content Writer: more casual tone for X posts"
    ↓
Agent prompts updated automatically
    ↓
Next task performs better
```

### Improvement Metrics
- Code review pass rate (first attempt)
- Test coverage per task
- Bug fix success rate
- Content approval rate (human accepted vs rejected)
- Time per task (trending down = improving)

---

## 6. Technical Architecture Options

### Option A: Claude Code Sub-agents (Quick Start)
- Use Claude Code's built-in Agent tool
- Each sub-agent gets a role-specific system prompt
- Orchestration via main Claude Code session
- **Pros:** Works immediately, no infra needed
- **Cons:** Limited self-improvement, no persistent agent memory across sessions

### Option B: Custom Agent Framework (Full Control)
- Build with Claude API (Python)
- Each agent is a class with role, memory, prompt history
- Message passing between agents
- Persistent lesson storage (JSONL or SQLite)
- **Pros:** Full control, true self-improvement, cross-session memory
- **Cons:** Takes time to build

### Option C: Hybrid (Recommended)
- Start with Option A for development agents (already available)
- Build Option B incrementally for content generation + self-improvement
- Migrate development agents to Option B once framework is stable
- **Pros:** Get value immediately while building toward the full vision

---

## 7. Project Scope Across Repos

REA works with ALL projects:

```
d:\work_v0.6\readevb\
├── mailwave/            ← TypeScript monorepo (email validation SaaS)
├── mailwave-leads/      ← Python (lead gen tool)
├── mailwave-content/    ← Python (content engine + audience validator) [planned]
├── rea/                 ← Python (THIS — AI workflow platform)
├── caw/                 ← Existing project
├── caw-v4/              ← Existing project
├── daily-github-repos/  ← Existing project
└── ...future projects
```

REA is project-agnostic. It can:
- Develop features for Mailwave (TypeScript)
- Build scrapers for mailwave-leads (Python)
- Generate content for mailwave-content
- Work on any future project in any language

---

## 8. Content Engine vs REA — Clarification

| | mailwave-content | REA Content Generator |
|---|---|---|
| **Purpose** | Marketing content for Mailwave specifically | Personal brand content from all projects |
| **Content type** | Blog, cold email, landing page, email sequences | X posts, LinkedIn, personal blog |
| **Audience** | Mailwave customers (agency, ecommerce, saas) | Developer community, personal followers |
| **Input** | Segment data, product features | Daily work, conversations, decisions |
| **Can be sold?** | Yes (standalone product) | No (personal tool) |

They are complementary — REA can call mailwave-content as a module when Mailwave-specific content is needed.

---

## 9. Open Questions (for next session)

- [ ] Tech stack decision: Pure Python? Or mix with Claude Code sub-agents?
- [ ] Start with which component? Agent team? Content generator? Context engine?
- [ ] AI provider: Claude API only? Or multi-model (Claude + GPT-4)?
- [ ] Agent communication: Direct function calls? Message queue? File-based?
- [ ] Lesson storage format: JSONL? SQLite? Markdown files?
- [ ] Content approval flow: CLI-based? Web UI? Notification?
- [ ] X/Twitter integration: API posting? Or just generate drafts?
- [ ] How to handle multi-language projects (TypeScript + Python)?
- [ ] Cost estimation: Claude API usage per month?
- [ ] MVP scope: What's the minimum to get value from day 1?
- [ ] Name: "REA" final mi, yoksa başka isim?
