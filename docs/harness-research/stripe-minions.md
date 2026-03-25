# Stripe Minions: Comprehensive Research

> Research compiled: 2026-03-25
> Sources: Stripe Engineering Blog (stripe.dev), ByteByteGo, MindStudio, InfoQ, Hacker News, various analyses

---

## 1. What Stripe Minions Is

Minions are Stripe's internally-built, **fully unattended coding agents** that produce complete pull requests from a single instruction — no human intervention between task initiation and PR creation. Every week, Stripe merges **over 1,300 pull requests that contain zero human-written code**, all produced by Minions.

The system was built by Stripe's **Leverage team**, which "builds surprisingly delightful internal products that Stripes can leverage to supercharge their productivity." The blog posts were authored by **Alistair Gray** (software engineer) with **Steve Kaliski** (head of AI platform) driving the broader initiative.

### Attended vs. Unattended: The Core Distinction

Stripe draws a sharp line between two categories of AI coding tools:

- **Attended agents** (Cursor, Claude Code, Copilot): Work alongside developers who watch, steer, and approve each step. They make a developer faster while actively engaged.
- **Unattended agents** (Minions): No one is watching. The agent receives a task, works through it alone, and delivers a finished result. They keep moving while the developer does something else.

> "In a world where one of our most constrained resources is developer attention, unattended agents allow for parallelization of tasks."

This is the key insight: Stripe is not trying to make individual developers faster — they are trying to buy back **attention**, something rarer than time inside a large engineering organization.

### What Minions Handle

Minions are scoped to predictable, well-defined tasks:

- Fixing flaky tests
- Applying straightforward migrations
- Building well-specified features
- Configuration adjustments
- Dependency upgrades
- Minor refactoring operations

This is not replacing engineering teams — it is automating the repetitive slice of work. Stripe employs thousands of engineers and is actively hiring more.

---

## 2. Architecture

### 2.1 The 5-Layer Pipeline

**Layer 1 — Invocation**
Engineers trigger Minions from multiple entry points:
- **Slack threads** — "directly from the thread discussing a change, and it'll be able to access the entire thread and any links included as context"
- CLI and web interfaces
- Internal documentation platform
- Feature flag platform
- Internal ticketing system (automated triggers, e.g., flaky test detection)

**Layer 2 — Devboxes (Execution Environment)**
Every Minion gets its own isolated virtual machine — the same infrastructure Stripe engineers use daily:
- **AWS EC2 instances** pre-loaded with Stripe's full source tree
- Pre-warmed Bazel and type-checking caches
- Code generation services pre-loaded
- Spin up in **~10 seconds** via proactive warm pooling
- Philosophy: **"cattle, not pets"** — standardized, replaceable, disposable
- Engineers typically run half a dozen simultaneously

Critical security properties:
- **Isolated from production resources and the internet**
- Run in QA environment, separated from real user data
- No human permission checks needed — isolation IS the permission system
- Agents run with full permissions, no confirmation prompts

> "What's good for humans is good for agents as well" — this infrastructure predates LLMs by years.

**Layer 3 — Agent Core (Modified Goose)**
The underlying engine is **"a fork of Block's coding agent Goose,"** identified as "one of the first widely used coding agents." Stripe's customizations:
- Stripped interactive features (interruptibility, confirmation dialogs)
- Optimized for completely autonomous, unattended operation
- Customized orchestration to interleave agent loops with deterministic code
- Adapted for Stripe's LLM infrastructure

Trade-off: Maintaining a custom fork means abandoning the open-source upgrade path — a burden only justified at Stripe's scale.

**Layer 4 — Blueprints (Orchestration)**
See Section 4 below for detailed breakdown.

**Layer 5 — Toolshed (MCP Server)**
A centralized internal server hosting **~500 MCP tools** (Model Context Protocol) spanning internal systems and SaaS platforms. Agents access:
- Internal documentation
- Ticket details
- Build statuses
- Code intelligence via Sourcegraph search
- And more

Agents receive a **curated subset** of tools relevant to their specific task, not the full catalog:

> "Agents perform best when given a 'smaller box' with a tastefully curated set of tools."

### 2.2 Typical Execution Flow

1. Engineer sends a Slack message describing the task
2. Minion spins up on a pre-warmed devbox (~10 seconds)
3. Agent reads context, plans approach, writes code
4. Local linting runs on each git push (<5 seconds)
5. Selective CI testing from 3+ million tests
6. Auto-fixes applied for known patterns
7. If failures remain, agent gets one retry
8. Creates feature branch, pushes to CI, generates PR following Stripe's template
9. Engineer reviews completed PR — walks away and comes back to a finished result

### 2.3 Visibility and Recovery

Engineers observe "the decisions and actions the minion took in a web UI" during and after execution. When a Minion doesn't complete a task perfectly:
- View the agent's decision trail in the web UI
- Provide additional instructions for the Minion to continue
- Manually iterate on completed runs by editing code directly

> "A minion run that's not entirely correct is often still an excellent starting point for an engineer's focused work."

---

## 3. Test Validation Against the 3-Million-Test Suite

Stripe's codebase has **over 3 million tests**. Running all of them for every agent change would be prohibitively expensive. Their solution is a tiered feedback system designed around the principle of **"shifting feedback left"**:

### Tier 1: Local Linting (< 5 seconds)

- Runs heuristic-based lint selection on every `git push`
- Pre-computed, cached rules enable sub-5-second execution
- Pre-push hooks fix common lint issues in under one second
- Catches typos, formatting issues, and basic errors cheaply and immediately
- Any lint step that would fail in CI is enforced locally first

> "Shift feedback left" — ensure "any lint step that would fail in CI is enforced in the IDE or on a git push, and presented to the engineer immediately."

### Tier 2: Selective CI (First Round)

- Runs only tests **relevant to the changed files**, not all 3 million
- Many tests have **autofixes for failures**, which are automatically applied
- Known failure patterns are handled programmatically without LLM involvement

### Tier 3: Agent Retry (Second Round — Hard Cap)

- If non-autofixable failures remain, the Minion gets **exactly one more chance**
- Agent reads the CI logs, fixes the bug locally, and pushes again
- **After two CI rounds: hard stop** — the branch escalates to a human

> "There are diminishing marginal returns if an LLM is running against indefinitely many rounds of a full CI loop."

### Why Two Rounds Maximum

This is a deliberate engineering decision, not a limitation:
- LLMs exhibit diminishing returns on repeated problem-solving
- Each CI round costs tokens, compute, and time
- A third attempt is unlikely to succeed if two failed
- Prevents the expensive trap of "letting an agent blindly push broken code to CI, read the error, and try again in an infinite token-burning loop"

### Partial Success as a Win

> "A partially correct PR that an engineer can polish in twenty minutes is still a significant win."

---

## 4. The Scaffold Design: Blueprints

Blueprints are Stripe's core architectural innovation — a **hybrid orchestration model** that is neither a pure deterministic workflow nor a free-form agentic loop.

> "Blueprints combine the determinism of workflows with agents' flexibility in dealing with the unknown."

### Deterministic Nodes (Rectangles in Stripe's Diagrams)

Fixed, predictable operations that always produce identical outputs:
- Code parsing and AST extraction
- Running configured linters
- Test execution (pass/fail)
- File operations (read, write, copy, delete)
- System queries (databases, APIs, internal tools)
- Validation checks (compilation, dependency resolution)
- Git operations (clone, branch, push)
- Formatting code per style rules
- Submitting pull requests

These nodes eliminate hallucination and create **unambiguous failure signals**. They execute code without LLM invocation.

### Agentic Nodes (Cloud Shapes in Stripe's Diagrams)

LLM-powered reasoning steps handling non-deterministic tasks:
- Interpreting natural-language task descriptions
- Planning code change sequences
- Handling edge cases
- Generating implementation code
- Interpreting test failures and reasoning about fixes
- Summarizing changes in PR descriptions

### How They Interleave: Dependency Update Example

1. **[Deterministic]** Identify import files across codebase
2. **[Deterministic]** Extract code context around imports
3. **[Agentic]** Analyze usage patterns for new library version
4. **[Agentic]** Generate updated code per file
5. **[Deterministic]** Write changes to disk
6. **[Deterministic]** Run test suite
7. **[Agentic]** Interpret errors; generate fixes if needed
8. **[Deterministic]** Verify compilation and test passage
9. **[Deterministic]** Format code per style rules
10. **[Agentic]** Draft PR summary
11. **[Deterministic]** Submit pull request

### Why This Design Matters

> "Writing code to deterministically accomplish small decisions we can anticipate...saves tokens (and CI costs) at scale and gives the agent a little less opportunity to get things wrong."

Key benefits:
- **Reduces token consumption** — no LLM calls for predictable operations
- **Reduces error rates** — deterministic steps can't hallucinate
- **Creates clear failure attribution** — you know exactly which node failed
- **Enables independent optimization** — improve deterministic and agentic components separately
- **Auditable, debuggable workflows** — clear execution trace

> "Putting LLMs into contained boxes compounds into system-wide reliability upside."

---

## 5. Context Management

### Scoped Rule Files

Rather than dumping global coding conventions into the context window, Stripe provides **directory-scoped rule files** that attach automatically as the agent traverses the filesystem:

> "Files that are scoped to specific subdirectories or file patterns, automatically attached as the agent traverses the filesystem."

Stripe adopted **Cursor's rule file format** and synchronized it across three agent systems — Minions, Cursor, and Claude Code — so any guidance written for one works with all three. This provides **triple ROI** on rule maintenance effort.

### Task Specification Design

Task specs are the most load-bearing architectural component:

> "The quality of the output is bounded by the quality of the input structure."

Good spec characteristics:
- Precise, objective-specific language with concrete file references
- **Explicit negative constraints** ("do not modify anything in `/migrations`")
- Verification criteria definable as test assertions
- Relevant code context provided (not requiring agent discovery)
- Ambiguity-handling instructions for edge cases

Stripe treats frequently-recurring task patterns as **versioned, reusable artifacts** (spec templates).

---

## 6. How They Achieve 1,300 PRs Per Week

### Growth Trajectory

- Part 1 blog post (Feb 9, 2026): **1,000+ PRs/week**
- Part 2 blog post (~2 weeks later): **1,300+ PRs/week**
- That is approximately **30% growth in under two weeks**

### Enabling Factors

**1. Decade of Infrastructure Investment**
The devbox system, CI infrastructure, internal tooling, and 3M+ test suite were built for humans over many years. Agents inherited all of it.

> "Start with your developer environment, your test infrastructure, and your feedback loops. If those are solid, agents will benefit from them. If they're not, no model will save you."

> "Investments in human developer productivity over time have returned to pay dividends in the world of agents."

**2. Massive Parallelization**
Each Minion runs in an isolated devbox. There is no coordination overhead between agents. Engineers spin up multiple Minions simultaneously — particularly useful during on-call rotations to resolve many small issues at once.

**3. Non-Overlapping File Scopes**
Independent task assignment prevents merge conflicts. Stateless agent design enables distributed workers without coordination.

**4. Automated Entry Points**
Not all Minions are manually triggered. Automated systems (flaky test detectors, migration trackers) kick off Minions without human initiation.

**5. The "Submission Authority" Model**
Minions don't have merge authority — they have **submission authority**. The quality bar for an AI PR doesn't need to be perfect; it needs to be good enough for a human reviewer to evaluate and catch remaining issues.

---

## 7. Key Engineering Decisions and Trade-offs

### Decision: Fork Goose vs. Build From Scratch vs. Use Off-the-Shelf

**Choice:** Fork Block's open-source Goose and heavily modify it.

**Rationale:** Goose was already a working coding agent. Modifying it for unattended operation was faster than building from scratch. But generic tools couldn't handle Stripe's scale.

**Trade-off:** Maintaining a custom fork means abandoning the open-source upgrade path. This burden is only justified at Stripe's scale (hundreds of millions LOC, uncommon Ruby+Sorbet stack, proprietary libraries).

### Decision: Two CI Rounds Maximum

**Choice:** Hard cap at 2 CI iterations, then escalate to human.

**Trade-off:** Some fixable issues won't get resolved automatically. But preventing infinite token-burning loops is worth the trade-off, as LLM fix quality degrades after repeated attempts.

### Decision: Curated Tool Subsets vs. Full Access

**Choice:** Each Minion gets a small, relevant subset of the ~500 MCP tools.

**Trade-off:** Agents may occasionally need a tool they weren't given. But smaller tool sets produce better agent behavior — less confusion, fewer hallucinated tool calls.

### Decision: Specialization Over Generalization

**Choice:** Handle narrow, well-defined tasks rather than pursuing open-ended autonomous coding.

**Trade-off:** Sacrifices ambition-per-task for reliability and throughput. Minions won't attempt complex architectural changes or ambiguous feature requests.

### Decision: Sandboxing Over Open Access

**Choice:** Agents operate in isolated QA containers with no internet or production access.

**Trade-off:** Agents can't access production logs or real-world data for debugging. But isolation-as-permission eliminates entire categories of security risk.

### Decision: Structured Specs Over Natural Language

**Choice:** Tasks use schema-defined specifications with explicit constraints, not plain English.

**Trade-off:** Higher friction to create tasks. But consistent, reproducible behavior across runs.

### Decision: Human Review as Non-Negotiable Gate

**Choice:** Every AI PR goes through standard code review. No exceptions.

**Trade-off:** Creates a review bottleneck (see criticism below). But preserves code quality and knowledge transfer.

---

## 8. Why Stripe Couldn't Use Generic Agents

Stripe's codebase presents challenges that generic agents struggle with:

- **Hundreds of millions of lines of code** across a few large repositories
- **Ruby with Sorbet typing** — a relatively uncommon stack with less training data
- **Extensive homegrown libraries** unique to Stripe, unfamiliar to any LLM
- Processes **well over $1 trillion per year** in payment volume
- Complex dependencies with **financial institutions, regulatory frameworks, and compliance obligations**

> "LLM agents are incredibly good at building software from scratch when there are relatively few constraints on a system. However, iterating on any codebase of the scale, complexity, and maturity of Stripe's is inherently much harder."

---

## 9. Security Model

The security approach relies on **isolation-as-permission**:

- Devboxes run in QA environments, completely separated from production
- No internet access, no production data access
- No real user information accessible
- Agents run with full permissions within the sandbox — no confirmation prompts needed
- The isolation itself IS the permission system
- Minions have **submission authority only** — they can create PRs but cannot merge them
- Human review is mandatory before any code reaches production

This repurposes infrastructure originally built for human developer safety.

---

## 10. Lessons Learned and Failure Modes Solved

### Lesson 1: Infrastructure > Model

> "The primary insight in Stripe's approach is that investments in developer productivity over the years can provide unexpected dividends when agents are included in the workflow."

> "Start with your developer environment, your test infrastructure, and your feedback loops. If those are solid, agents will benefit from them. If they're not, no model will save you."

The devboxes, CI, tooling, and test suite were all built for humans. Agents inherited the entire ecosystem without modification.

### Lesson 2: Walls Matter More Than the Model

The deterministic rails, CI caps, curated tool access, and mandatory review do more reliability work than the model itself. CodeRabbit analysis shows AI-authored code introduces **1.75x more logic errors** and **2.74x more XSS vulnerabilities** than human-written code. Stripe's architecture doesn't ignore this — it builds defensive walls around it.

> "Putting LLMs into contained boxes compounds into system-wide reliability upside."

### Lesson 3: Kill Infinite Loops Early

One of the most expensive failure modes is letting an agent blindly push broken code to CI, read the error, and try again in an infinite token-burning loop. Stripe's two-round cap eliminates this entirely.

### Lesson 4: Partial Success is Still Success

Not every Minion run produces a perfect PR. But a partially correct PR that an engineer can polish in twenty minutes is still a major productivity win. The system is designed to maximize the value of imperfect outputs.

### Lesson 5: Context Window Overflow is Real

Global coding conventions dumped into context cause failures at scale. Directory-scoped rules that load dynamically as the agent traverses files solve this.

### Lesson 6: The Review Bottleneck is Unsolved

This is the most significant gap in Stripe's public disclosures. Multiple Hacker News commenters flagged it:

> "Code review is already hard and under done — the 'velocity' here is only going to make that worse."

> "I would half-ass a review of a PR containing lots of robot code."

> "Code reviews are also an educational moment for seniors teaching juniors...if people slack on reviews with the agent it means these other externalities suffer."

Stripe has not publicly addressed how they handle the review burden of 1,300+ AI-generated PRs per week.

### Lesson 7: Metrics Can Be Misleading

> "The only metric I see is # of pull requests which means nothing."

Critics note that PR count alone doesn't capture quality, maintenance burden, or downstream impact. Stripe has not publicly shared merge rates, revert rates, or post-merge failure rates.

---

## 11. The Harness Pattern: Industry Convergence

Stripe's architecture exemplifies a broader pattern emerging across the industry. Multiple companies (Stripe, Coinbase, Ramp) independently built similar architectures for internal coding agents. The Open SWE project captures this converging pattern.

The seven essential components of an agent harness:

1. **Task Definition Layer** — structured specification of objectives and success metrics
2. **Tool Registry** — catalog of available capabilities
3. **Execution Runtime** — orchestration loop interpreting model outputs
4. **Sandboxed Environment** — isolated operational space
5. **Observation Layer** — structured logging and execution traces
6. **Guardrails** — hard operational limits (iteration caps, resource constraints)
7. **Output Validation** — pre-commit verification

> "The architectural goal is reproducible, auditable AI behavior at scale."

---

## 12. Key People

- **Alistair Gray** — Software engineer on Stripe's Leverage team, author of both blog posts
- **Steve Kaliski** — Head of AI platform at Stripe, promoted Minions publicly

---

## 13. Open Questions

Stripe's disclosures, while more detailed than most companies, leave several questions unanswered:

- **Merge rate**: What percentage of Minion PRs actually get approved and merged?
- **Revert rate**: How often do merged Minion PRs get reverted after deployment?
- **Review process**: How do they handle the review burden of 1,300+ AI PRs/week?
- **LLM provider**: Which specific models power the agentic nodes?
- **Cost economics**: What is the compute cost per successful PR vs. engineering hours saved?
- **Blueprint catalog**: How many blueprint types exist and what tasks do they cover?
- **Failure rate**: What percentage of Minion runs fail to produce a usable PR?

---

## Sources

### Primary (Stripe Engineering)
- [Minions: Stripe's one-shot, end-to-end coding agents — Part 1](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents)
- [Minions: Stripe's one-shot, end-to-end coding agents — Part 2](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents-part-2)
- [Steve Kaliski on X — Minions announcement](https://x.com/stevekaliski/status/2021034048945070360)
- [Steve Kaliski on X — Part 2 announcement](https://x.com/stevekaliski/status/2024578928430764362)

### Analysis & Commentary
- [How Stripe's Minions Ship 1,300 PRs a Week — ByteByteGo](https://blog.bytebytego.com/p/how-stripes-minions-ship-1300-prs)
- [What Is an AI Agent Harness? — MindStudio](https://www.mindstudio.ai/blog/what-is-ai-agent-harness-stripe-minions)
- [Stripe Minions Blueprint Architecture — MindStudio](https://www.mindstudio.ai/blog/stripe-minions-blueprint-architecture-deterministic-agentic-nodes)
- [Stripe's coding agents: the walls matter more than the model — Anup.io](https://www.anup.io/stripes-coding-agents-the-walls-matter-more-than-the-model/)
- [Stripe Engineers Deploy Minions — InfoQ](https://www.infoq.com/news/2026/03/stripe-autonomous-coding-agents/)
- [Stripe's AI 'Minions' Now Ship 1,300 PRs — Awesome Agents](https://awesomeagents.ai/news/stripe-minions-coding-agents-1300-prs/)

### Community Discussion
- [Hacker News — Minions Part 1](https://news.ycombinator.com/item?id=47110495)
- [Hacker News — Minions Part 2](https://news.ycombinator.com/item?id=47086557)
