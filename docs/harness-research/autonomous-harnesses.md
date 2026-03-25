# Autonomous AI Agent Harnesses — Research Document

> Research date: 2026-03-25
> Scope: Architecture, design patterns, memory, execution, and autonomy patterns across major AI coding agent harnesses.

---

## Table of Contents

1. [OpenHands (formerly OpenDevin)](#1-openhands-formerly-opendevin)
2. [SWE-agent](#2-swe-agent)
3. [Devin by Cognition](#3-devin-by-cognition)
4. [Aider](#4-aider)
5. [Claude Code Harness (OpenDev Paper)](#5-claude-code-harness-opendev-paper)
6. [Cross-Cutting Concepts](#6-cross-cutting-concepts)
   - [The Agent Loop](#61-the-agent-loop)
   - [Planning Strategies](#62-planning-strategies)
   - [Failure and Recovery](#63-failure-and-recovery)
   - [Autonomous vs Co-Pilot](#64-autonomous-vs-co-pilot)
7. [Comparative Analysis](#7-comparative-analysis)
8. [Key Takeaways for Harness Design](#8-key-takeaways-for-harness-design)
9. [Sources](#9-sources)

---

## 1. OpenHands (formerly OpenDevin)

**Repository**: [github.com/OpenHands/OpenHands](https://github.com/OpenHands/OpenHands) (64k+ stars)
**Paper**: [ICLR 2025](https://arxiv.org/abs/2407.16741)

### 1.1 Architecture Overview

OpenHands uses a **three-part architecture**:

1. **Agent Abstraction Layer** — Defines how agents reason and act
2. **Event Stream** — Chronological log of all actions and observations
3. **Runtime Execution Environment** — Sandboxed Docker containers

The core design principle: agents interact with environments the same way human developers do — writing code, using the command line, and browsing the web.

### 1.2 Event-Driven Design

The foundation is an **event-sourced state model**:

- All interactions are recorded as immutable events in a chronological stream
- The `ConversationState` is the only stateful component — it maintains mutable metadata plus an append-only event log
- Events are type-safe via `LLMConvertibleEvent` subclasses that enable conversion to LLM-compatible formats
- **Deterministic replay**: sessions resume by loading base state and replaying events from the last processed point
- Condensation events (summaries) are stored in the log — forgotten events are removed before sending to LLMs, but the full log is preserved for recovery

### 1.3 Agent Loop

Agents operate as **stateless event processors** through a simple iterative pattern:

```
step(state) → action → execution → observation → state_update → step(...)
```

1. **Step Function**: Receives current state (including event history), uses LLM to decide next action
2. **Action Execution**: Returns one of: `CmdRunAction` (bash), `IPythonRunCellAction` (Python/Jupyter), `BrowserInteractiveAction` (web), `AgentDelegateAction` (subagent), `MessageAction`, or `AgentFinishAction`
3. **Observation**: Environment produces an observation that feeds back into state

This separation enables three critical capabilities:
- **Security interleaving** — actions reviewed/blocked before execution
- **Incremental execution** — pause/resume support
- **Event streaming** — intermediate results emitted in real time

### 1.4 Memory Systems

**Short-term (Condenser System)**:
- Automatically manages context window by dropping events and inserting summaries when history grows too large
- `LLMSummarizingCondenser` (default) reduces API costs by up to 2x with no degradation in performance
- Condensation triggers only when context reaches a specific size, preserving cache efficiency
- Baseline (no condensation) scales quadratically; with condensation, scales linearly
- Summarization preserves: user goals, agent progress, what still needs doing, critical files, failing tests

**Long-term**:
- Full conversation histories persisted as JSON
- Session indexing for resumption
- Cost metadata tracking

### 1.5 Sandbox and Code Execution

Each task session spawns an **isolated Docker container** with:
- REST API server inside the container for action requests
- Bash shell for direct OS access
- Jupyter IPython server for interactive Python with result return
- Chromium browser with Playwright for web automation
- Configurable workspace directory mounted from host
- Supports arbitrary Docker images with auto-installation of the action execution API

The SDK V1 abstracts this through a factory pattern:
- `LocalWorkspace` — in-process, host filesystem
- `RemoteWorkspace` — HTTP delegation to agent server
- Same agent code runs locally or at scale by swapping workspace types

### 1.6 Multi-Agent Coordination

- `AgentDelegateAction` enables agents to delegate subtasks to specialized agents
- Example: CodeAct agent delegates browsing tasks to BrowsingAgent
- Each subagent runs with `message_history=None` (fresh context)

### 1.7 Tool System

Follows a strict **Action → Execution → Observation** pattern:
- `Action` validates inputs against Pydantic schemas
- `ToolExecutor` implements logic
- `Observation` formats outputs for LLMs
- MCP tools treated as first-class citizens — MCP JSON schemas auto-convert to typed Action models
- Tools are lightweight specification objects with registered name and JSON-serializable parameters

### 1.8 AgentSkills Library

A Python toolbox extending capabilities:
- Only includes utilities where LLMs cannot directly write equivalent code
- Functions auto-import into Jupyter environment
- Includes: file editing (adapted from SWE-Agent), scrolling, multi-modal document parsing

---

## 2. SWE-agent

**Repository**: [github.com/SWE-agent/SWE-agent](https://github.com/SWE-agent/SWE-agent)
**Paper**: [NeurIPS 2024](https://arxiv.org/abs/2405.15793)

### 2.1 Core Innovation: Agent-Computer Interface (ACI)

SWE-agent's key insight: **LLMs are a new category of end users** that need purpose-built interfaces, not human UIs. The ACI replaces raw shell commands with specialized, natural action types optimized for LLM consumption.

Key design principles:
- Simple commands with few options and concise documentation
- Efficient operations — critical tasks consolidated into minimal actions
- Guardrails to prevent common mistakes
- Deterministic, formatted feedback at every turn

### 2.2 ACI Components

**File Viewer**:
- Displays ~100 lines per interaction (empirically optimal)
- Built-in scrolling (up/down navigation)
- Line numbers with contextual markers
- Search within files

**File Editor**:
- Constrained editing with automatic linter integration
- Edits rejected if they introduce syntactic errors — prevents cascading failures
- Post-edit feedback shows exact changes applied

**Search/Navigation**:
- Special-built full-directory string searching
- Succinct file-only output (minimalist context to avoid confusing the LLM)
- `find_file` for file discovery

**Context Management**:
- 100-line display window limit
- Empty command outputs get explicit confirmation: "Your command ran successfully and did not produce any output"

### 2.3 Agent Loop (Thought-Action-Observation)

At each step:
1. Agent generates a **thought** (reasoning about what to do)
2. Agent generates a **command** (action to execute)
3. Environment returns **feedback** about command effects
4. Feedback incorporated into context for next step

This is a pure ReAct loop with no explicit planning phase.

### 2.4 Performance Impact of ACI Design

- ACI tailored for LLMs outperforms human-designed UIs (Linux shell) by 3-4x in resolution rates
- GPT-4 Turbo with ACI: 12.47% on SWE-bench (vs 3.8% baseline)
- The ACI's file viewing, searching, editing, and feedback + guardrails enable navigation and modification that RAG cannot achieve

### 2.5 Mini-SWE-Agent

The successor distills the architecture to ~100 lines of Python while achieving >74% on SWE-bench Verified:

**Architecture**:
- Three-layer protocol-based design (LLM provider, execution environment, agent control — independently substitutable)
- No tools other than bash — no tool-calling interface; uses shell to full potential
- Actions executed via `subprocess.run` — every action completely independent (no stateful shell)
- Completely linear message history — the messages list IS the conversation passed to LLM
- Simple loop: prompt → LLM → extract bash command → execute → observe → append to history → repeat

**Key insight**: Simplicity and performance are not mutually exclusive. Most of the original SWE-agent's complexity was unnecessary.

---

## 3. Devin by Cognition

**Website**: [devin.ai](https://devin.ai)
**Status**: Commercial product (closed-source)

### 3.1 Architecture

Devin runs as a **cloud-based autonomous developer** with:
- Full VM environment (not Docker) per session — provides security isolation and ability to run Docker inside
- VS Code-style editor, terminal (bash), and Chrome browser
- Agent-native IDE experience for human collaboration

The architecture is closer to a "cloud laptop" than a container — each Devin instance is a fully isolated virtual machine.

### 3.2 VM Snapshot System (Blockdiff)

Devin's most technically interesting contribution is their custom VM snapshot technology:

**Why custom?**
- Standard approaches (binary diff, OverlayFS, ZFS, qcow2) were too slow or had compatibility issues
- Built `otterlink` — a custom hypervisor with ~10x faster VM startup vs EC2

**Blockdiff file format**:
- Creates incremental block-level diffs of VM disks
- Stores only blocks that changed between snapshots
- Leverages XFS copy-on-write — operates on file metadata, not actual data
- Performance: ~200ms to create a 20GB snapshot, ~6.5s to read/write 20GB
- Reduced snapshot times from 30+ minutes to seconds (200x improvement)

**Use cases**:
1. **Dev environments** — save customer configs without redundant OS copies
2. **Sleep/wake** — 50MB session snapshots vs multi-GB full images
3. **Disk rollback** — stackable incremental snapshots for in-session rollback

### 3.3 Session Management

- **Fork**: Branch off from any session state
- **Rollback**: Revert to earlier checkpoint by scrubbing timeline
- **Machine Snapshots**: Pre-configured "save states" reusable across future runs
- **Async handoffs**: Engineers start task, go offline, return to review

Beneath the workspace: a memory layer storing vectorized codebase snapshots plus full replay timeline of every command, file diff, and browser tab.

### 3.4 Knowledge and Memory

**Automatic codebase indexing**:
- Repositories indexed every couple of hours
- Auto-generated wikis with architecture diagrams, source links, documentation
- "Ask Devin" / "Devin Search" — natural language queries against indexed codebase

**Persistent knowledge base**:
- Teams codify feedback, testing patterns, architectural rules
- Agent learns from each project and adapts to new technologies
- Users prompted to save essential procedures to ongoing memory

### 3.5 Planning

- Proactively researches codebase and develops detailed plan before execution
- Responds within seconds with relevant files and findings
- Works best with "clear, upfront requirements and verifiable outcomes"
- Struggles with mid-task requirement changes (suggesting limited iterative re-planning)

### 3.6 Validation

- Follows: Plan → Implement chunk → Test → Fix → Checkpoint review → Next chunk
- Integrates with static analysis tools (SonarQube, Veracode)
- Submits work as pull requests
- Requires human verification for subjective outcomes (design, code quality)

### 3.7 Limitations

- Best suited for junior-level tasks with clear requirements
- Cannot handle mid-task requirement changes well
- Limited debugging skills for complex issues
- Cannot interpret visual designs or database logs autonomously

---

## 4. Aider

**Repository**: [github.com/Aider-AI/aider](https://github.com/Aider-AI/aider)
**Website**: [aider.chat](https://aider.chat)

### 4.1 Architecture — Co-Pilot Design

Aider is a **terminal-based pair programmer** — not an autonomous agent. It operates in a request-response model where the human drives direction. However, its harness design contains important patterns.

Core loop: Human provides instruction → Aider sends context + instruction to LLM → LLM returns edits → Aider applies edits → Git commit.

### 4.2 Repository Map System

The most sophisticated context engineering in Aider:

**How it works**:
1. Tree-sitter parsers extract code definitions and references from every source file
2. Builds a directed graph: nodes = files, edges = code references between files
3. Ranks files using NetworkX's **PageRank algorithm** with personalization based on chat context
4. Selects most important symbols/files that fit within token budget
5. Sends concise map showing key classes, functions, signatures

**Dynamic adjustment**:
- Default token budget: 1,000 tokens for repo map
- Expands significantly when no files are in active context
- Contracts when many files are explicitly added to chat
- Ensures the LLM always has codebase awareness without overwhelming context

### 4.3 Edit Formats

Aider supports multiple edit formats, each with trade-offs:
- **Whole file**: LLM returns entire file content (simple but token-heavy)
- **Diff format**: LLM returns search/replace blocks (efficient but error-prone)
- **Architect/Editor mode**: Two-pass approach splitting reasoning from editing

### 4.4 Architect/Editor Mode

The most interesting pattern for harness design:

1. **Architect** (stronger model): Reasons about the problem, designs the solution, proposes changes in natural language
2. **Editor** (faster model): Takes the architect's proposal, converts to well-formed code edits

This separation works because:
- Architect focuses entirely on problem-solving without format constraints
- Editor focuses entirely on correct edit formatting without reasoning burden
- Achieves better results than single-pass, especially on large refactors
- Above ~25k tokens of context, models get distracted and conform less to system prompts

### 4.5 Git Integration

Deeply integrated with git for safety and undo:
- Every LLM edit auto-committed with descriptive message
- Pre-existing uncommitted changes committed separately first (never mixed)
- Easy undo via git: `git diff` to review, `git checkout` to revert
- Attribution tracking via `git blame`

### 4.6 Context Management

- Does NOT fill context windows — actively manages what goes in
- Warns users not to add too many files
- Relies on repo map for implicit context rather than explicit file inclusion
- No built-in condensation/summarization — keeps conversations relatively short

### 4.7 Self-Correction

- Linter integration catches syntax errors in edits
- Retry logic for malformed edit formats
- Architect/Editor split reduces format errors
- Git provides mechanical undo (not AI-driven self-correction)

---

## 5. Claude Code Harness (OpenDev Paper)

**Paper**: [arxiv.org/abs/2603.05344](https://arxiv.org/html/2603.05344v3)
**Context**: Technical paper describing the harness architecture behind Claude Code

### 5.1 Scaffolding vs Harness Distinction

**Scaffolding** (pre-conversation, one-time assembly):
- Constructs system prompt, tool schemas, subagent registry
- Three-phase factory: skills registration → subagent compilation → main agent creation
- Single parameterized `MainAgent` class (no class hierarchy — eliminated diamond problem)
- Eager building guarantees agents are complete at construction time

**Harness** (runtime, per-turn orchestration):
- Coordinates tool dispatch, context management, safety enforcement, persistence
- Seven subsystems: prompt composition, tool registry, safety, context engineering, memory, sessions, subagent orchestration

### 5.2 Extended ReAct Loop (6 Phases)

Each iteration:

1. **Pre-check & Compaction** — Drain injected messages, compact context under memory pressure
2. **Thinking** — Optional chain-of-thought deliberation
3. **Self-critique** — Optional self-evaluation before action
4. **Action** — LLM call with full tool schemas
5. **Tool Execution** — Registry dispatch with approval checks
6. **Post-processing** — Iteration decision or completion

Loop terminates when: agent produces final text without tool calls, or hits safety caps.

### 5.3 Adaptive Context Compaction (5 Stages)

Progressive approach to managing context pressure:

| Stage | Technique | What It Does |
|-------|-----------|-------------|
| 1 | Per-tool-type summarization | Condense verbose tool outputs while preserving critical info |
| 2 | Large output offloading | Move outputs outside context window, retain pointers |
| 3 | Agent-aware truncation hints | Signal to agent that data was condensed |
| 4 | Memory strategy interaction | Coordinate with long-term memory |
| 5 | Full conversation compaction | When token budget nears exhaustion |

### 5.4 Five-Layer Safety Architecture

1. **Prompt-Level** — Security policy, action safety, read-before-edit, git workflow
2. **Schema-Level** — Plan-mode whitelist, per-subagent allowed_tools, MCP discovery gating
3. **Runtime Approval** — Manual/Semi-Auto/Auto levels with pattern/command/prefix/danger rules
4. **Tool-Level** — DANGEROUS_PATTERNS blocklist, stale-read detection, output truncation, timeouts
5. **Lifecycle Hooks** — User-defined pre-tool blocking, argument mutation

### 5.5 Subagent Architecture

- Each subagent is a `MainAgent` parameterized by `allowed_tools`
- Schema filtering at build time ensures subagents never see tools they can't use
- Fresh context per subagent invocation (`message_history=None`)
- Built-in subagents: Planner (read-only), CodeExplorer (LSP-powered), WebAgent, SecurityReviewer
- Parallel execution supported for exploratory tasks

### 5.6 Multi-Model Architecture

Five model roles with fallback chains:
1. **Normal Provider** — Main reasoning
2. **Thinking Provider** — Extended reasoning (ReAct deliberation)
3. **Critique Provider** — Self-evaluation
4. **VLM Provider** — Visual analysis
5. **Fallback Chain** — Each role delegates to next if unavailable

### 5.7 Doom-Loop Detection

- Tracks repeated tool failures or identical tool sequences
- Iteration caps prevent infinite loops
- Explicit `task_complete` signal required for completion

---

## 6. Cross-Cutting Concepts

### 6.1 The Agent Loop

The fundamental pattern across all autonomous agents is the **Perceive → Reason → Plan → Act → Observe** cycle:

```
while not (task_complete or stop_condition):
    perception  = observe(environment, last_result)
    reasoning   = llm(context + perception)
    action      = select_action(reasoning)
    result      = execute(action)
    context     = update(context, action, result)
```

**Key variations**:

| System | Loop Type | Planning | Self-Critique |
|--------|-----------|----------|---------------|
| OpenHands | Event-sourced ReAct | Via delegation to planner subagent | No built-in |
| SWE-agent | Pure ReAct (thought + command) | No explicit planning | No |
| Devin | Plan → Execute → Verify | Proactive upfront planning | Checkpoint review |
| Aider | Request-Response | No (human plans) | Architect/Editor split |
| Claude Code | Extended ReAct (6 phases) | Plan mode with tool filtering | Built-in critique phase |

**Termination conditions** (critical for preventing runaway agents):
- Task completion signal (explicit action like `task_complete` or `AgentFinishAction`)
- Maximum iteration cap (typically 10-50 depending on complexity)
- Repetition/doom-loop detection
- Resource limits (tokens, cost, time)
- Human interrupt

### 6.2 Planning Strategies

**Chain-of-Thought (CoT)**: Linear reasoning — agent thinks step by step before acting. Used as the baseline in most systems.

**ReAct**: Interleaves reasoning and action. The agent reasons about what to do, does it, observes the result, then reasons again. Foundation for OpenHands, SWE-agent, and Claude Code.

**Tree-of-Thought (ToT)**: Generates and evaluates multiple possible next steps at each stage, organizing into a tree structure. Powerful when initial steps heavily influence outcomes. Not commonly used in current coding agents due to cost.

**Reflexion**: Self-critique after execution. Agent reflects on entire execution trace after task completion or failure, stores reflections in memory. Used in Claude Code's critique phase.

**Hierarchical Planning**: Separates Global Planner (high-level strategy) from Local Executor (low-level ReAct actions). Addresses single-agent reasoning limits on long-horizon tasks. Used by Devin (plan then execute) and Claude Code (plan mode → normal mode).

**Plan-Execute-Verify**: Devin's approach — plan upfront, execute in chunks, verify each chunk, checkpoint, continue. Works well for well-specified tasks, struggles with ambiguous requirements.

### 6.3 Failure and Recovery

**Levels of failure handling across systems**:

**Level 1 — Feedback loops (all systems)**:
- Command output tells agent what happened
- Error messages fed back into context
- Agent adjusts next action based on feedback

**Level 2 — Guardrails (SWE-agent, Claude Code)**:
- Linter rejects syntactically invalid edits before they land
- Stale-read detection prevents using outdated file contents
- Dangerous command patterns blocked before execution

**Level 3 — Mechanical undo (Aider, Devin)**:
- Git auto-commits enable instant rollback
- VM snapshots enable full environment rollback (Devin)
- Checkpoint system for partial rollback

**Level 4 — Self-correction loops (Claude Code, Devin)**:
- Self-critique phase evaluates proposed action before execution
- Doom-loop detection catches repetitive failures
- Iteration caps force strategy changes

**Level 5 — Session recovery (OpenHands, Devin)**:
- Event-sourced state enables deterministic replay
- VM snapshots enable environment recovery
- Progress files and logs enable continuation across sessions

**Anthropic's harness guidance** for long-running agents:
- Use a feature list (JSON, not Markdown) to prevent premature completion
- Maintain progress documentation (`claude-progress.txt`)
- Write setup scripts (`init.sh`) for session initialization
- Test as a human would (browser automation, not just curl/unit tests)
- Each session must leave codebase in merge-ready state

### 6.4 Autonomous vs Co-Pilot

The fundamental distinction:

| Dimension | Co-Pilot (Aider) | Autonomous (Devin, OpenHands) |
|-----------|-------------------|-------------------------------|
| **Who drives** | Human decides, AI suggests | AI decides and acts, human reviews |
| **Scope** | Current file/function | Entire repository, multiple files |
| **Execution** | Human applies changes | Agent executes changes directly |
| **Planning** | Human plans | Agent plans and decomposes |
| **Verification** | Human verifies | Agent self-verifies (tests, linting) |
| **Session length** | Minutes (conversational) | Hours (long-running tasks) |
| **Context challenge** | Minimal (short sessions) | Critical (must manage over long runs) |
| **Error model** | Human catches errors immediately | Agent must self-correct or escalate |
| **Trust model** | Low risk (human in the loop) | High risk (sandboxing essential) |

**When to use which**:
- Co-pilot: When human judgment drives outcomes, subjective decisions, exploratory work
- Autonomous: Clear requirements, verifiable outcomes, parallelizable tasks, well-defined scope

**The spectrum is blurring**: Claude Code operates as a co-pilot with autonomous capabilities (plan mode, subagents). Devin 2.0 added IDE-style collaboration for human intervention. The trend is toward **adjustable autonomy** — same tool, different levels of human involvement.

---

## 7. Comparative Analysis

### Architecture Comparison

| Feature | OpenHands | SWE-agent | Devin | Aider | Claude Code |
|---------|-----------|-----------|-------|-------|-------------|
| **Execution Model** | Event-sourced | ReAct loop | VM-based | Request-response | Extended ReAct |
| **Sandbox** | Docker container | Docker container | Full VM | None (local) | Configurable |
| **Context Strategy** | Condenser (LLM summary) | 100-line window | VM snapshots + indexing | Repo map (PageRank) | 5-stage compaction |
| **Memory** | Event log + condenser | Conversation history | VM snapshots + knowledge base | Git history | Event log + playbook |
| **Multi-Agent** | AgentDelegateAction | No | Parallel Devins | Architect/Editor | Subagent registry |
| **Planning** | Delegated to planner | None (implicit) | Upfront plan | Human-driven | Plan mode |
| **Self-Correction** | Via feedback | Linter guardrails | Checkpoint review | Git undo | Critique phase + doom-loop |
| **Tool Integration** | MCP first-class | Custom ACI | Shell + editor + browser | LLM-native | Registry + MCP |
| **Open Source** | Yes | Yes | No | Yes | Partially |

### What Makes Each System Unique

| System | Unique Strength |
|--------|----------------|
| **OpenHands** | Event-sourced architecture with deterministic replay and composable SDK |
| **SWE-agent** | ACI concept — purpose-built interface for LLMs, not humans |
| **Devin** | VM snapshots with blockdiff (200ms snapshots of 20GB disks) |
| **Aider** | PageRank-based repo map for intelligent context selection |
| **Claude Code** | 5-stage adaptive context compaction + 5-layer safety architecture |

---

## 8. Key Takeaways for Harness Design

### 8.1 Architecture Patterns That Work

1. **Event-sourced state** is superior to mutable state for long-running agents. Enables replay, recovery, debugging, and condensation. (OpenHands, Claude Code)

2. **Purpose-built interfaces beat raw shell**. LLMs need different affordances than humans — constrained actions, formatted feedback, guardrails. (SWE-agent ACI)

3. **Separate planning from execution**. Whether via plan mode (Claude Code), architect/editor (Aider), or upfront planning (Devin) — splitting reasoning from action improves results.

4. **Progressive context management** is essential. Single strategy doesn't work — need multiple stages from tool-output summarization to full conversation compaction. (Claude Code 5-stage, OpenHands condenser)

5. **Single parameterized agent > class hierarchy**. OpenDev paper explicitly documented abandoning class hierarchies in favor of a single `MainAgent` parameterized by allowed tools.

### 8.2 Memory Design

- **Short-term**: Conversation/event history with progressive compaction
- **Long-term**: Git history, progress files, knowledge bases, session logs
- **Context**: Repo maps, codebase indexing, file summaries
- **Key insight**: JSON for structured state > Markdown (LLMs less likely to corrupt JSON)

### 8.3 Safety Essentials

- Defense-in-depth (multiple independent layers)
- Sandbox isolation (Docker minimum, VM for untrusted code)
- Stale-read detection (prevent edits based on outdated file content)
- Doom-loop detection (catch repetitive failures)
- Iteration caps (hard limits on agent turns)
- Human approval gates (configurable autonomy levels)

### 8.4 The Simplicity Principle

Mini-SWE-agent achieves >74% on SWE-bench Verified with ~100 lines. Most complexity in agent frameworks is accidental, not essential. The core loop — prompt LLM, extract action, execute bash, observe result, repeat — is sufficient for high performance. Build complexity only where it demonstrably improves outcomes.

---

## 9. Sources

### Papers
- [OpenHands: An Open Platform for AI Software Developers as Generalist Agents (ICLR 2025)](https://arxiv.org/abs/2407.16741)
- [The OpenHands Software Agent SDK: A Composable and Extensible Foundation for Production Agents](https://arxiv.org/html/2511.03690v1)
- [SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering (NeurIPS 2024)](https://arxiv.org/abs/2405.15793)
- [Building Effective AI Coding Agents for the Terminal: Scaffolding, Harness, Context Engineering, and Lessons Learned](https://arxiv.org/html/2603.05344v3)

### Documentation
- [OpenHands Condenser Documentation](https://docs.openhands.dev/sdk/arch/condenser)
- [OpenHands Context Condensation Blog Post](https://openhands.dev/blog/openhands-context-condensensation-for-more-efficient-ai-agents)
- [SWE-agent ACI Documentation](https://swe-agent.com/0.7/background/aci/)
- [Mini-SWE-Agent Repository](https://github.com/SWE-agent/mini-swe-agent)
- [Aider Repository Map Documentation](https://aider.chat/docs/repomap.html)
- [Aider Architect/Editor Mode](https://aider.chat/2024/09/26/architect.html)
- [Aider Git Integration](https://aider.chat/docs/git.html)

### Devin / Cognition
- [Devin 2.0 Announcement](https://cognition.ai/blog/devin-2)
- [Devin 2025 Performance Review](https://cognition.ai/blog/devin-annual-performance-review-2025)
- [Blockdiff: Custom VM Snapshot File Format](https://cognition.ai/blog/blockdiff)
- [Coding Agents 101](https://devin.ai/agents101)

### Agent Architecture Concepts
- [Anthropic: Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Hugging Face: Understanding AI Agents through the Thought-Action-Observation Cycle](https://huggingface.co/learn/agents-course/en/unit1/agent-steps-and-structure)
- [ReAct vs Tree-of-Thought: Reasoning Frameworks Behind Autonomous AI Agents](https://www.coforge.com/what-we-know/blog/react-tree-of-thought-and-beyond-the-reasoning-frameworks-behind-autonomous-ai-agents)
- [Self-Corrective Agent Architecture (Emergent Mind)](https://www.emergentmind.com/topics/self-corrective-agent-architecture)
- [Mini-SWE-Agent Architecture Overview (DeepWiki)](https://deepwiki.com/SWE-agent/mini-swe-agent/1.1-architecture-overview)
