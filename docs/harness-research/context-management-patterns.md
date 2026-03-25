# Context Management & Context Engineering Patterns for AI Agent Harnesses

> Research compiled: 2026-03-25
> Scope: Context rot, compaction strategies, sub-agent isolation, file-based memory, token budgets, memory architectures, and practical patterns for building AI agent harnesses.

---

## Table of Contents

1. [Context Rot / Context Degradation](#1-context-rot--context-degradation)
2. [Context Compaction & Summarization Strategies](#2-context-compaction--summarization-strategies)
3. [Context Isolation via Sub-Agents](#3-context-isolation-via-sub-agents)
4. [File-Based Context Management](#4-file-based-context-management)
5. [Prompt Engineering for Sub-Agents](#5-prompt-engineering-for-sub-agents)
6. [Token Budget Management](#6-token-budget-management)
7. [The "Context Engineering" Discipline](#7-the-context-engineering-discipline)
8. [Memory Architectures](#8-memory-architectures)
9. [Practical Patterns](#9-practical-patterns)
10. [Sources](#10-sources)

---

## 1. Context Rot / Context Degradation

### What It Is

Context rot is the degradation in LLM output quality that occurs as input context grows longer. More tokens in = worse output out — even when the model's context window is far from full. This is not a theoretical concern: Chroma's research tested **18 frontier models** and found that **every single one** gets worse as input length increases.

### Why It Happens

Three compounding mechanisms drive context rot:

1. **Lost-in-the-Middle Effect**: Models attend well to the start and end of context but poorly to the middle. The seminal "Lost in the Middle" paper (Liu et al., 2023) showed **30%+ accuracy drops** when relevant information was placed in positions 5-15 of a 20-document set, compared to position 1 or 20.

2. **Attention Dilution**: Transformer attention is quadratic. As input length grows, attention weight per token decreases, making it harder for the model to focus on relevant information.

3. **Distractor Interference**: Semantically similar but irrelevant content actively misleads the model. Chroma's research found that adding just 4 distractors compounded performance degradation significantly.

### Key Research Findings

**Chroma Context Rot Study (2025)**:
- Tested 18 models across Anthropic, OpenAI, Google, and Alibaba families
- Lower semantic similarity between questions and answers accelerated performance decline
- Counterintuitive finding: models perform **worse** when haystack preserves logical flow — shuffling the haystack and removing local coherence consistently **improves** performance
- Even trivial replication tasks (repeating words) showed consistent degradation across all 18 models
- Claude models showed lowest hallucination rates; GPT models demonstrated highest

**"Context Length Alone Hurts" (2025, arXiv 2510.05381)**:
- Even when a model can perfectly retrieve all evidence (100% exact match token recitation), performance **still degrades** as input length increases
- This proves the problem is not retrieval failure but reasoning degradation under load

**Production Impact**:
- 65% of enterprise AI failures in 2025 were attributed to context drift or memory loss during multi-step reasoning — not raw context exhaustion
- Per-step accuracy of 95% compounds to only 36% success over 20 steps (0.95^20)

### Implications for Harness Design

- Do not assume "bigger context window = better results"
- Performance degradation begins well before the context window is full
- Proactive compaction at **70% utilization** is safer than waiting for limits
- Position-aware context placement matters: put critical information at the start and end

---

## 2. Context Compaction & Summarization Strategies

### 2.1 Claude Code's Automatic Compression

Claude Code implements a two-tier compaction system:

**Auto-Compaction**:
- Triggers at approximately **83.5% of context window** (~167K tokens on a 200K window)
- Analyzes conversation to identify key information worth preserving
- Creates a concise summary replacing old messages
- Continues seamlessly with preserved context
- Example: 122,392 tokens saved (58.6% reduction) through 2 compaction events

**Manual Compaction (`/compact`)**:
- User-invoked, runs while there's still context headroom
- Produces **better summaries** because the model still has clear recall of the full conversation
- Recommended over waiting for auto-compaction, which fires when the model is already in a degraded state

**Anthropic Compaction API** (beta `compact-2026-01-12`):
- Server-side compaction for the Messages API
- Configurable trigger threshold via `compaction_config.trigger_token_count`
- Generates `compaction` blocks containing summaries transparently inserted into conversation
- Supported on Claude Opus 4.6 and Sonnet 4.6
- Compatible with AWS Bedrock, Google Vertex AI, Microsoft Foundry

```javascript
const response = await client.messages.create({
  model: "claude-opus-4-6",
  betas: ["compact-2026-01-12"],
  compaction_config: { trigger_token_count: 50000 },
  messages: conversationHistory
});
```

### 2.2 Cursor's Approach

Cursor has evolved from static to **dynamic context discovery**:

- **Workspace indexing**: Creates a semantic understanding of the entire codebase at startup
- **Surgical context with @-symbols**: `@code`, `@file`, `@folder` for precise context injection rather than relying on automatic gathering
- **Dynamic context discovery**: As models improved as agents, Cursor found success by providing **fewer details up front**, making it easier for the agent to pull relevant context on its own
- **Tool output files**: Writes large results to `tool_outputs/<session_id>/` — an "evidence locker" the agent inspects on demand rather than loading into context
- **Project Rules**: `.cursor/rules` files act as a persistent "constitution" for behavior without consuming dynamic context budget

### 2.3 Anchored Iterative Summarization (Factory)

The most effective compression technique identified in research:

1. Identify only the **newly-evicted message span** (not the full history)
2. Summarize that span alone
3. **Merge** the new summary into a persisted anchor state

Anchors are structured around: **intent, changes made, decisions taken, and next steps**.

Factory's evaluation across **36,000 real engineering session messages** showed anchored iterative summarization consistently outperforms full-reconstruction summarization:
- Factory: 4.04 accuracy score
- Anthropic (full reconstruction): 3.74
- OpenAI (full reconstruction): 3.43

### 2.4 ACON: Failure-Driven Guideline Optimization

A gradient-free optimization framework (arXiv, Oct 2025):

1. Run tasks with both full context and compressed context
2. Identify cases where full context succeeded but compressed context failed
3. Analyze what information compression lost
4. Iteratively revise compression prompts
5. Distill optimized prompts into smaller models

**Results**: 26-54% memory reduction while preserving 95%+ task accuracy.

### 2.5 Progressive Compaction Stages (OpenDev)

Graduated approach to prevent abrupt quality loss:

| Stage | Action | Impact |
|-------|--------|--------|
| 1 | Summarize older tool results | Low risk |
| 2 | Compact reasoning traces | Moderate risk |
| 3 | Merge similar observations | Moderate risk |
| 4 | Aggressive truncation of oldest messages | Higher risk |
| 5 | Request user permission to archive/purge | Last resort |

### 2.6 Compression Ratio Targets

| Content Type | Target Ratio | Rationale |
|---|---|---|
| Old conversation history | 3:1 to 5:1 | Prioritize decisions/outcomes |
| Tool outputs & observations | 10:1 to 20:1 | Typically verbose; keep conclusions |
| Recent messages (5-7 turns) | No compression | Recency is critical |
| System prompt | No compression | Behavioral anchor |

---

## 3. Context Isolation via Sub-Agents

### The Core Problem

Operations like codebase searching can generate 5,000+ lines of output. Loading this directly into a parent agent's context would:
- Push utilization from 50% to 95%
- Drown relevant signal in noise
- Degrade reasoning quality
- Eliminate room for actual implementation work

### How Sub-Agent Isolation Works

Each sub-agent receives:
- **Fresh context window** (no inherited conversation history)
- **Specialized instructions** for its specific task
- **Filtered tool set** (only tools appropriate to its role)
- **Independent model selection** (cheaper model for simpler tasks)

The sub-agent performs its task and returns only a **condensed output** (50-200 lines vs. 5,000+ raw) to the main agent.

### Isolation Mechanisms

**Schema filtering at build time**: The sub-agent never sees tools outside its allowlist. Tools literally don't exist in the model's view, so it cannot invoke them.

**Message history reset at execution time**: Each invocation starts with `message_history=None`, preventing context leakage across calls.

**Lightweight dependency injection**: Sub-agents receive only essential dependencies (mode manager, approval manager), not the full session infrastructure.

### When to Deploy Sub-Agents

Deploy proactively when operations risk exceeding 40-60% context utilization:

| Operation | Typical Output | Deploy Sub-Agent When |
|-----------|----------------|----------------------|
| Glob pattern matching | 100-500 lines | >20 files matched |
| Grep code search | 500-2,000 lines | Always |
| Multiple file reads | 1,000-5,000 lines | >5 files |
| Code flow analysis | 2,000-10,000 lines | Always |

### Phase-Specific Applications

**Research Phase**: Isolates 10,000+ lines of codebase exploration, returning 200-300 line summaries documenting relevant files, information flow, and key dependencies.

**Planning Phase**: Uses already-compacted research (300 lines) as input, generating 200-400 line implementation plans without re-entering search noise.

**Implementation Phase**: Compacts progress status during multi-step tasks, enabling execution of 10+ step plans without overflow.

### The "Ralph Wiggum" Pattern (Extreme Isolation)

Infinite context reset loops: the entire agent resets after each task, reads a static `PROMPT.md`, executes fresh. Sacrifices state persistence for maximum context freshness. Effective for tasks where clean context matters more than continuity.

### Anti-Patterns

- Using sub-agents for persona-based roleplay rather than technical isolation
- Creating sub-agents that spawn additional sub-agents (deep nesting)
- Allowing sub-agent context pollution of main workflow
- Synchronous blocking instead of parallel execution

---

## 4. File-Based Context Management

### 4.1 Scratch Files as Working Memory

Working memory is a temporary scratchpad for intermediate reasoning steps during a single task — analogous to a mental whiteboard. The key insight: information persisted to files survives context compaction.

**Pattern**: Write intermediate results to `scratch/<task_id>/` directory, reference by path in conversation, read back selectively when needed.

### 4.2 "Save to File, Provide Summary" Pattern

When tool outputs are large:
1. Write full output to a temporary file
2. Return only a summary + file path to the conversation
3. Agent reads the file on-demand if it needs details

**Implementation**: `ToolResultCompactor` truncates long tool outputs, stores full results in `tool_result/`, and keeps only file references in messages.

Cursor's approach: `tool_outputs/<session_id>/` acts as an "evidence locker" for everything the agent did. The conversation holds summaries; the filesystem holds evidence.

### 4.3 File System as Extended Context (Manus)

Manus treats the sandbox file system as **unlimited, persistent, restorable memory**:

- **Compression principle**: "Drop content if metadata persists" — a URL enables reconstruction, a file path prevents information loss even when file contents are omitted from context
- The file system acts as an extension of the context window, bounded only by disk space

### 4.4 The todo.md Pattern (Manus)

Manus creates and continuously updates a `todo.md` file throughout task execution:
- Pushes the global plan into the model's **recent attention span**
- Combats the "lost-in-the-middle" problem by keeping objectives in the most-attended position
- Maintains task focus across ~50 average tool calls per task
- Acts as a form of "deliberate task recitation"

### 4.5 Context Repositories (Letta)

Letta Code implements git-backed memory filesystems (MemFS):
- Agent memory organized as folders of markdown files
- **Every change** to memory is automatically versioned with informative commit messages
- File tree structure is always in the system prompt — folder hierarchy and file names act as navigational signals
- **Progressive disclosure**: Files load on demand, not upfront
- **Concurrent sub-agent writes**: Each sub-agent gets an isolated worktree, merging changes through git conflict resolution
- **Sleep-time reflection**: Background sub-agents periodically reflect on recent interactions and edit memory files

### 4.6 Four-Layer File-Based Architecture

A production pattern for structured file memory:

| Layer | Purpose | Persistence |
|-------|---------|------------|
| Scratchpad | Current task reasoning | Session only |
| Working Memory | Active task state | Task duration |
| Project Memory | Accumulated knowledge | Cross-session |
| Archive | Historical reference | Permanent |

---

## 5. Prompt Engineering for Sub-Agents

### Minimal Context Injection

The goal is to provide **just enough context** for the sub-agent to complete its task without wasting tokens on irrelevant information.

**Effective sub-agent prompt structure**:
1. **Role**: What the sub-agent is (e.g., "You are a code explorer")
2. **Task**: Clear, bounded scope with expected output format
3. **Context**: Only the specific files, decisions, or constraints relevant to this task
4. **Constraints**: Tool allowlist, output size limits, behavioral boundaries
5. **Output format**: Structured template the parent agent can parse efficiently

### Claude Code Agent Template Pattern

```markdown
# Agent: [Role Name]

## Model
[Model selection — Haiku for research, Sonnet for implementation]

## Tools
[Explicit tool allowlist]

## Instructions
[Focused task description]

## Output Format
[Structured output template]
```

### Dynamic Prompt Assembly

OpenDev assembles prompts from **priority-ordered, conditional sections**:
- **Mode-specific variants**: Different prompt sections load based on execution context
- **Variable substitution**: Runtime values interpolate into templates
- **Provider-conditional sections**: Model-specific guidance loads only for relevant models
- **Cacheable vs. dynamic separation**: Static sections use prefix caching; dynamic sections append after

### Key Principles

- **Stateless design**: Sub-agents should have no dependencies on previous executions
- **Bounded scope**: Clear input/output contract prevents scope creep
- **Structured output**: Predictable format enables efficient parent consumption
- **Single responsibility**: One task per sub-agent invocation

---

## 6. Token Budget Management

### The Cost Accumulation Problem

LLMs charge for every input token on every turn. Costs compound:
- A Reflexion loop running for 10 cycles can consume **50x** the tokens of a single linear pass
- An unconstrained agent can cost $5-8 per software engineering task
- For an orchestrator spawning 50 workers sharing the same context, redundancy costs dominate

### Strategies

**1. Prompt Caching**
- Cache stable prompt prefixes (system instructions, knowledge bases)
- Cached tokens: **$0.30/MTok** vs. uncached: **$3.00/MTok** (10x savings for Claude Sonnet)
- Key: maintain stable prefixes — even one token difference invalidates downstream cache
- Avoid timestamps in system prompts (destroy cache effectiveness)
- Use deterministic serialization (stable JSON key ordering)

**2. Model Routing**
- Route simple tasks (classification, extraction, formatting) to smaller, cheaper models
- Reserve frontier models for complex reasoning and synthesis
- Implement complexity classification to assign the right tier

**3. Memory Layer Caching**
- Store past successful plans in a vector store
- Before asking the orchestrator to plan, check if a similar problem has been solved
- Cache hit: latency drops from 30s to 300ms, cost drops to near zero

**4. Context Budget Monitoring**

```
Incoming message
    |
[Context budget check]
  < 70% -> append normally
  > 70% -> [identify evictable span]
              |
           [summarize span]
              |
           [merge into anchor state]
              |
  [append anchor + recent messages]
    |
LLM call
```

**5. Token Budget Allocation**

| Component | Budget Allocation |
|-----------|-------------------|
| System prompt | 5-10% (fixed) |
| Recent conversation | 30-40% (protected) |
| Tool schemas | 5-10% (lazy-loaded) |
| Historical context | 20-30% (compactable) |
| Response headroom | 15-20% (reserved) |

**6. Lazy Tool Discovery**
- Load only tool name + description at startup (~80 tokens per tool)
- Full instruction body loads only when the model determines relevance (275-8,000 tokens)
- Supporting scripts load only during execution

---

## 7. The "Context Engineering" Discipline

### Definition

Context engineering is the discipline of curating and maintaining the optimal set of tokens during LLM inference. It encompasses all information that may land in the context window — not just prompts, but tool results, conversation history, retrieved documents, and injected state.

The guiding principle: **find the smallest set of high-signal tokens that maximize the likelihood of the desired outcome**.

### Evolution from Prompt Engineering

Context engineering is a natural progression from prompt engineering:
- **Prompt engineering**: Finding the right words for a single prompt
- **Context engineering**: Answering "what configuration of context is most likely to generate our model's desired behavior?" across an entire system

### Key Dimensions

**1. Write (Crafting Context)**
- System prompt design with conditional sections
- Tool description optimization
- Memory formatting and structure
- State serialization

**2. Select (Choosing What to Include)**
- RAG and retrieval strategies
- Tool result filtering
- History selection and compaction
- Progressive disclosure

**3. Compress (Reducing Token Volume)**
- Summarization strategies
- Tool output truncation
- History compaction
- Embedding-based compression (80-90% token reduction)

**4. Isolate (Preventing Cross-Contamination)**
- Sub-agent spawning
- Tool schema filtering
- Memory partitioning
- Session boundaries

### Manus Philosophy

Manus rebuilt their agent framework **four times**, calling their approach "Stochastic Gradient Descent" — iterative, empirical optimization of context. Their key principle: "If model progress is the rising tide, we want Manus to be the boat, not the pillar stuck to the seabed" — context engineering enables product independence from underlying model improvements through in-context learning rather than fine-tuning.

### Error Preservation as Context Engineering

Counterintuitive finding from Manus: **leaving failed actions and stack traces in context improves agent adaptation**. Removing failure cases removes evidence and prevents the system from learning. The model implicitly updates beliefs upon seeing errors, reducing repeated mistakes.

### Diversity Injection

Uniform context patterns cause the model to mimic repetitive patterns during extended tasks. Solutions: controlled serialization variation, alternate phrasing, and formatting noise to maintain output diversity.

---

## 8. Memory Architectures

### 8.1 Short-Term (Within Session) vs. Long-Term (Across Sessions)

| Aspect | Short-Term (In-Context) | Long-Term (Out-of-Context) |
|--------|------------------------|---------------------------|
| Storage | Conversation history in context window | External database or filesystem |
| Capacity | Limited by context window | Bounded only by storage |
| Latency | Zero (already loaded) | Retrieval overhead |
| Fidelity | Full (recent), degrading (older) | Depends on storage format |
| Persistence | Session only | Cross-session |

**Memory Types**:
- **Episodic**: Stores interaction-specific events with temporal markers
- **Semantic**: Extracted knowledge without event context, generalized across interactions
- **Procedural**: Behavioral patterns that guide execution logic

### 8.2 Markdown-Based Memory (Claude Code, REA)

The simplest and most effective pattern for many use cases:

**Claude Code**: `CLAUDE.md` files at project root contain persistent instructions. User-level `~/.claude/CLAUDE.md` provides global rules. Memory files persist across sessions via filesystem.

**REA Pattern**: Separation of concerns between:
- `CLAUDE.md`: Architecture, structure, stable instructions
- `MEMORY.md`: Credentials, bug history, lessons learned, technical gotchas

**Advantages**:
- No vendor lock-in — standard text files
- Searchable with standard tools (grep, ripgrep)
- Version-controlled with git
- Human-readable and editable
- A simple "filesystem" memory (raw text files indexed by timestamp) **surpassed several specialized systems** in benchmarks

**Benchmark result** (Letta): File-based memory achieved competitive performance with vector databases for many agent memory tasks, raising the question "Is a Filesystem All You Need?"

### 8.3 Knowledge Graphs (Graphiti/Zep)

**Graphiti** (by Zep) builds temporal knowledge graphs from unstructured data:

- **Temporal awareness**: Each fact has a validity window (when true, when superseded)
- **Entity evolution**: Entities get updated summaries as new information arrives
- **Multi-source integration**: Chat histories, structured JSON, and unstructured text feed into a single graph
- **MCP integration**: Available as an MCP server for Claude Code, Cursor, and other tools

**Architecture**:
- Extraction phase: Entities become nodes, relations become labeled edges
- Update phase: Conflict detection and resolution when integrating new information
- Multi-tenancy: `group_id` namespacing isolates tenant graphs

**Performance** (DMR benchmark):
- Zep: 94.8% accuracy vs. MemGPT baseline: 93.4%
- Up to 18.5% accuracy improvement over baselines
- 90% response latency reduction

### 8.4 Vector Databases for Semantic Retrieval

Store memories as dense embeddings, retrieve via similarity search:

- **Mem0**: Production-ready memory layer achieving 26% accuracy boost for LLMs
- **Hybrid approaches**: Combine vector search with graph traversal — vector precision + graph relational understanding
- **Embedding compression**: 80-90% token reduction, with tradeoffs in retrieval latency and verbatim detail

**When to use vector DBs over files**:
- Large-scale memory (>1000 memories)
- Semantic similarity queries are primary access pattern
- Multi-user/multi-tenant systems
- Need for fuzzy matching and discovery

### 8.5 Dual-Memory Architecture (OpenDev)

Parallel memory streams within a session:

- **Episodic memory**: Full conversation history with complete fidelity for recent interactions
- **Working memory**: Compressed summary of earlier observations optimized for token efficiency

At injection time, both combine: episodic provides recent detail; working provides historical continuity without excessive token consumption.

---

## 9. Practical Patterns

### 9.1 Tool Output Redirection

**Problem**: Tool results (grep output, API responses, file reads) can be thousands of lines.

**Pattern**:
1. Execute tool
2. If output > threshold (e.g., 500 lines), write to `tool_results/<timestamp>.md`
3. Return summary + file path to conversation
4. Agent reads file on-demand if details needed

**Implementation detail**: Per-tool-type summarization rules:
- File search results → list of paths + match counts
- API responses → key fields + status
- Build output → errors/warnings only
- Test results → pass/fail summary + failure details

### 9.2 Hierarchical Context (Orchestrator-Worker)

**Orchestrator sees summaries; workers see details**:

```
User Request
    |
[Orchestrator Agent - frontier model]
  Sees: task description, worker summaries, high-level state
  Budget: 40-60% utilization target
    |
    +---> [Worker 1 - smaller model]
    |     Sees: specific sub-task, relevant files only
    |     Returns: 100-200 line summary
    |
    +---> [Worker 2 - smaller model]
    |     Sees: different sub-task, different files
    |     Returns: 100-200 line summary
    |
    +---> [Worker 3 - smaller model]
          Sees: yet another sub-task
          Returns: 100-200 line summary
    |
[Orchestrator synthesizes results]
```

**Key benefit**: The orchestrator's context never exceeds its budget because it only sees condensed worker outputs. For tasks producing >50 intermediate results, this prevents context window exhaustion even on 128K token models.

### 9.3 Context Windowing for Large Documents

When processing documents larger than the context window:

**Sliding Window**:
- Process document in overlapping chunks
- Each chunk includes overlap with previous for continuity
- Merge results across windows

**Map-Reduce**:
- Split document into chunks (map phase)
- Process each chunk independently
- Combine results into final output (reduce phase)

**Hierarchical Summarization**:
- Level 0: Raw document chunks
- Level 1: Per-chunk summaries
- Level 2: Section summaries (groups of chunk summaries)
- Level 3: Document summary

### 9.4 Context-Aware System Reminders

Rather than relying solely on initial instructions (which fade with conversation length):

- **Event detectors** identify conditions (repeated failures, high iteration count, tool misuse)
- **Template resolution** adapts reminder text based on current context
- **Guardrail counters** track safety violations to adjust escalation
- **Role positioning** delivers reminders as user guidance rather than system admonition

This counteracts **instruction fade-out** — the natural tendency for early instructions to lose influence over model behavior as conversation grows.

### 9.5 KV-Cache Optimization (Manus)

The single most important metric for production agents:

- **Append-only context**: Never modify earlier messages — only append
- **Stable prompt prefixes**: Even one token difference invalidates downstream cache
- **No timestamps in system prompts**: Timestamps destroy cache on every turn
- **Deterministic serialization**: Stable JSON key ordering
- **Tool management via logit masking**: Instead of adding/removing tools (which breaks cache), use a state machine with logit masking to constrain which tools can be called

**Cost impact**: Cached tokens cost **10x less** than uncached ($0.30 vs. $3.00/MTok for Claude Sonnet).

### 9.6 Cognitive Degradation Resilience (CDR)

Formalized framework (Cloud Security Alliance, late 2025):

1. **Monitor**: Track planner recursion depth, context density, memory saturation in real time
2. **Detect**: Catch early-stage drift before compounding (2% misalignment can cascade to 40% failure)
3. **Mitigate**: Fallback routing, episodic consolidation, adaptive behavioral anchoring
4. **Recover**: Return to known-good state without full session restart

---

## 10. Sources

### Research Papers
- [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172) — Liu et al., 2023
- [Context Length Alone Hurts LLM Performance Despite Perfect Retrieval](https://arxiv.org/html/2510.05381v1) — arXiv, 2025
- [Agentic Context Engineering: Evolving Contexts for Self-Improving Language Models](https://arxiv.org/abs/2510.04618) — arXiv, 2025
- [Context Discipline and Performance Correlation](https://arxiv.org/html/2601.11564v1) — arXiv, 2026
- [Building AI Coding Agents for the Terminal](https://arxiv.org/html/2603.05344v1) — arXiv, 2026
- [Zep: A Temporal Knowledge Graph Architecture for Agent Memory](https://arxiv.org/abs/2501.13956) — arXiv, 2025
- [Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory](https://arxiv.org/pdf/2504.19413) — arXiv, 2025
- [A-Mem: Agentic Memory for LLM Agents](https://arxiv.org/pdf/2502.12110) — arXiv, 2025
- [Everything is Context: Agentic File System Abstraction for Context Engineering](https://arxiv.org/pdf/2512.05470) — arXiv, 2025

### Industry Blog Posts
- [Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — Anthropic
- [Context Engineering for AI Agents: Lessons from Building Manus](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus) — Manus
- [Context Rot: How Increasing Input Tokens Impacts LLM Performance](https://www.trychroma.com/research/context-rot) — Chroma Research
- [Compaction API Documentation](https://platform.claude.com/docs/en/build-with-claude/compaction) — Anthropic
- [How Claude Code Works](https://code.claude.com/docs/en/how-claude-code-works) — Anthropic
- [State of Context Engineering in 2026](https://www.newsletter.swirlai.com/p/state-of-context-engineering-in-2026) — Aurimas Griciūnas
- [Context Engineering](https://blog.langchain.com/context-engineering-for-agents/) — LangChain
- [Introducing Context Repositories: Git-based Memory for Coding Agents](https://www.letta.com/blog/context-repositories) — Letta
- [Benchmarking AI Agent Memory: Is a Filesystem All You Need?](https://www.letta.com/blog/benchmarking-ai-agent-memory) — Letta
- [Evaluating Context Compression for AI Agents](https://factory.ai/news/evaluating-compression) — Factory
- [Dynamic Context Discovery](https://cursor.com/blog/dynamic-context-discovery) — Cursor
- [AI Agent Context Compression: Strategies for Long-Running Sessions](https://zylos.ai/research/2026-02-28-ai-agent-context-compression-strategies) — Zylos Research
- [Making Sense of Memory in AI Agents](https://www.leoniemonigatti.com/blog/memory-in-ai-agents.html) — Leonie Monigatti

### Architecture References
- [Sub-Agents and Context Isolation](https://deepwiki.com/humanlayer/advanced-context-engineering-for-coding-agents/4.3-sub-agents-and-context-isolation) — HumanLayer / DeepWiki
- [Architecting Efficient Context-Aware Multi-Agent Framework](https://developers.googleblog.com/architecting-efficient-context-aware-multi-agent-framework-for-production/) — Google Developers
- [AI Agent Orchestration Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns) — Microsoft Azure
- [Agent Design Patterns](https://rlancemartin.github.io/2026/01/09/agent_design/) — Lance Martin
- [Sub-Agent Spawning Pattern](https://www.agentic-patterns.com/patterns/sub-agent-spawning/) — Agentic Patterns

### Tools and Frameworks
- [Graphiti: Build Real-Time Knowledge Graphs for AI Agents](https://github.com/getzep/graphiti) — Zep
- [Letta Code: The Memory-First Coding Agent](https://github.com/letta-ai/letta-code) — Letta
- [ReMe: Memory Management Kit for Agents](https://github.com/agentscope-ai/ReMe) — AgentScope
