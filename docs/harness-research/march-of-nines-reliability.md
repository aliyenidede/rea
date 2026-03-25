# The March of Nines: Reliability Engineering for AI Agent Systems

> Research compiled: 2026-03-25
> Sources: Andrej Karpathy, SkillsBench (arXiv:2602.12670), O'Reilly Radar, Anthropic, VentureBeat, and others

---

## 1. Karpathy's March of Nines

### Origin

Andrej Karpathy coined the term "March of Nines" during a podcast with Dwarkesh Patel, drawing from his five years leading Autopilot at Tesla. The core observation: early self-driving demos appeared nearly flawless, yet the path to a production-ready system consumed years and was still incomplete.

> "Every single nine is the same amount of work. When you get a demo and something works 90% of the time, that's just the first nine. Then you need the second nine, a third nine, a fourth nine."
> — Andrej Karpathy

### The Core Insight

Each additional "nine" of reliability requires roughly the same engineering effort as all previous nines combined:

| Level | Reliability | Effort (relative) | Description |
|-------|------------|-------------------|-------------|
| 1 nine | 90% | 1x | Demo works. Impressive but fragile. |
| 2 nines | 99% | 2x | Handles common cases. Still breaks daily. |
| 3 nines | 99.9% | 4x | Professional-grade. Breaks every ~10 days. |
| 4 nines | 99.99% | 8x | Enterprise-grade. Breaks every ~3 months. |
| 5 nines | 99.999% | 16x | Mission-critical. Breaks every ~3 years. |

Karpathy's experience at Tesla: after five years of iteration, the self-driving system had achieved "maybe two or three nines" with "still more nines to go."

### Why This Matters for AI Agents

The gap between a demo and a product is measured in nines. A developer builds a prototype agent in a weekend that works 90% of the time. Getting to 99% takes months. Getting to 99.9% takes a different kind of engineering entirely — systems engineering, not prompt engineering.

---

## 2. Compounding Failure in Agentic Workflows

### The Math

If a workflow has **n** sequential steps and each step succeeds with probability **p**, the end-to-end success probability is:

```
P(success) = p^n
```

This assumes independence between steps. In practice, failures often correlate (shared auth, rate limits, context drift), making the real number worse.

### Compounding Failure Tables

#### By Step Count (at fixed reliability levels)

| Per-Step Reliability | 5 steps | 10 steps | 20 steps | 50 steps |
|---------------------|---------|----------|----------|----------|
| 90% (1 nine) | 59.0% | 34.9% | 12.2% | 0.5% |
| 95% | 77.4% | 59.9% | 35.8% | 7.7% |
| 99% (2 nines) | 95.1% | 90.4% | 81.8% | 60.5% |
| 99.5% | 97.5% | 95.1% | 90.5% | 77.8% |
| 99.9% (3 nines) | 99.5% | 99.0% | 98.0% | 95.1% |
| 99.99% (4 nines) | 99.95% | 99.9% | 99.8% | 99.5% |

#### Failure Frequency (10-step workflow, run 10 times/day)

| Per-Step Reliability | End-to-End Success | Daily Failures | Time Between Failures |
|---------------------|-------------------|----------------|----------------------|
| 90% | 34.9% | ~6.5 | Every ~2.2 runs |
| 95% | 59.9% | ~4.0 | Every ~2.5 runs |
| 99% | 90.4% | ~1.0 | Every ~10 runs |
| 99.9% | 99.0% | ~0.1 | Every ~100 runs |
| 99.99% | 99.9% | ~0.01 | Every ~1,000 runs |

### What a 10-Step Agent Workflow Looks Like

A typical agentic flow involves steps like:

1. Intent parsing / instruction understanding
2. Context retrieval (RAG, file reads)
3. Planning / task decomposition
4. Tool selection
5. Tool execution (API call, code run)
6. Output validation
7. State update
8. Next-step decision
9. Output formatting
10. Audit logging / handoff

Each of these can fail independently. At 95% per step, only 60% of workflows complete successfully. Two out of five runs break.

### The 50-Step Problem

Complex agents — autonomous coding agents, multi-document analysis pipelines, research agents — routinely hit 50+ steps. At 99% per-step reliability (which feels very good), a 50-step workflow fails **39.5% of the time**. This is why complex agents feel brittle despite each individual step appearing reliable.

---

## 3. Strategies to Improve Per-Step Reliability

### 3.1 Structured Outputs / Schema Validation

**Problem:** LLMs produce free-form text. Downstream steps expect structured data. Format mismatches cause silent cascading failures.

**Solution:** Enforce output schemas at every step boundary.

- **JSON Schema enforcement**: Both OpenAI and Anthropic support constrained decoding that guarantees valid JSON matching a schema
- **Protobuf / typed contracts**: Define interfaces between agent steps as typed contracts
- **Enum constraints**: Limit option fields to predefined values
- **Type enforcement**: Numbers stay numbers, booleans stay booleans

**Impact:** Eliminates an entire class of errors (malformed output). Moves from probabilistic format compliance to deterministic.

### 3.2 Retry with Backoff

**Problem:** Transient failures (API timeouts, rate limits, model overload) cause permanent workflow failures.

**Solution:** Implement retry logic with exponential backoff and jitter.

```
retry_delay = base_delay * (2 ^ attempt) + random_jitter
```

**Best practices:**
- Set maximum retry count (typically 3-5)
- Use exponential backoff (1s, 2s, 4s, 8s...)
- Add random jitter to prevent thundering herd
- Implement circuit breakers for sustained failures
- Distinguish retryable errors (timeout, 429, 503) from permanent errors (400, invalid input)

**Impact:** Converts transient failures into delays rather than workflow termination. Typically recovers 80-90% of transient failures.

### 3.3 Validation Loops (LLM-as-Judge + Programmatic Checks)

**Problem:** LLM outputs can be syntactically valid but semantically wrong. Schema validation catches format errors but not logic errors.

**Solution:** Layer multiple validation approaches:

1. **Programmatic checks** (deterministic):
   - Regex pattern matching
   - Range/bounds checking
   - Cross-reference validation
   - Business rule assertions

2. **LLM-as-judge** (probabilistic but cheap):
   - Use a second, smaller model to verify the output
   - Ask specific yes/no questions about correctness
   - Compare output against known constraints

3. **Self-verification loops**:
   - Ask the model to check its own work
   - Re-derive the answer and compare
   - "Show your work" chain-of-thought verification

**Impact:** Each validation layer catches a different class of error. Stacking 3 independent validators with 90% detection each yields 99.9% combined detection.

### 3.4 Checkpoint and Restart

**Problem:** Long workflows that fail at step 47 of 50 must restart from scratch, wasting time and tokens.

**Solution:** Persist state at defined checkpoints.

- **State serialization**: Save intermediate results after each successful step
- **Idempotent steps**: Design steps so re-execution produces the same result
- **Resume from last checkpoint**: On failure, reload state and retry from the failed step
- **DAG-based orchestration**: Model workflow as a directed acyclic graph; replay only the failed branch

**Impact:** Reduces the cost of failure from O(n) to O(1) per retry. A 50-step workflow that fails at step 47 retries 3 steps, not 50.

### 3.5 Deterministic Rails vs. Probabilistic Steps

This is the single highest-leverage strategy, as demonstrated by Andrew Stellman's O'Reilly research.

**Core principle:** "If you can write a short function that does the job, don't give it to the LLM."

**The Stellman Blackjack Case Study:**

| Iteration | Accuracy | Key Change |
|-----------|----------|-----------|
| Baseline | 31% | Initial LLM-only approach |
| + Data restructuring | 37% | Removed bookkeeping from LLM |
| + Chain-of-thought | 48% | Forced arithmetic show-work |
| + Deterministic validator | 79% | **Replaced LLM validator with lookup table** |
| + Rigid output format | 81% | Mechanical format enforcement |
| + Explicit rule warnings | 84% | Overrode training priors |
| + Model switch (Haiku) | 94% | Better model for the task |

The single largest improvement (+31 percentage points) came from **removing an LLM step entirely** and replacing it with deterministic code.

**Decision framework for each step:**

| Question | If Yes | If No |
|----------|--------|-------|
| Can this be a lookup table? | Use code | Continue |
| Is the logic fully specifiable? | Use code | Continue |
| Does this require judgment? | Use LLM with constraints | Use code |
| Is the output format fixed? | Enforce schema | Add format constraints |

### 3.6 Guardrails and Constraint Systems

**Layered defense model:**

1. **Input guardrails**: Reject malformed, adversarial, or out-of-scope inputs before they reach the LLM
2. **Output guardrails**: Validate LLM responses against safety policies, business rules, and format requirements
3. **Behavioral guardrails**: Monitor agent actions for policy violations (unauthorized data access, excessive API calls)
4. **Autonomy constraints**: Define explicit boundaries for what the agent can and cannot do

**Nine operational levers** (synthesized from enterprise practices):

1. **Constrain autonomy** — explicit workflow graphs with bounded states
2. **Enforce contracts** — JSON Schema, protobuf validation at every interface
3. **Layer validators** — syntax, semantic, and business-rule checks
4. **Route by risk** — uncertainty signals trigger human escalation
5. **Engineer tool calls** — timeouts, circuit breakers, retries (treat as distributed systems)
6. **Make retrieval predictable** — versioned data products with coverage metrics
7. **Build evaluation pipelines** — golden test sets, regression detection
8. **Invest in observability** — trace every decision, log every intermediate result
9. **Ship an autonomy slider** — deterministic fallbacks when confidence is low

---

## 4. SkillsBench Evaluation

### What It Is

SkillsBench (arXiv:2602.12670) is the first benchmark that treats Agent Skills as first-class evaluation artifacts. It consists of 86 tasks across 11 domains, paired with curated Skills and deterministic verifiers. Each task is evaluated under three conditions:

1. **No Skills** — baseline model performance
2. **Curated Skills** — expert-written procedural knowledge
3. **Self-generated Skills** — model-authored skills

The benchmark evaluated 7 agent-model configurations across 7,308 trajectories.

### Key Findings

| Finding | Detail |
|---------|--------|
| Curated Skills improvement | +16.2 percentage points average pass rate |
| Best domain improvement | Healthcare: +51.9pp |
| Worst domain improvement | Software Engineering: +4.5pp |
| Tasks where Skills hurt | 16 of 84 tasks showed negative deltas |
| Self-generated Skills | **No benefit on average** |
| Optimal Skill size | 2-3 focused modules outperform comprehensive docs |
| Model scaling vs. Skills | Smaller models + Skills match larger models without them |

### Critical Insight

Models cannot reliably author the procedural knowledge they benefit from consuming. Self-generated Skills provide no net benefit, meaning:

- Skills must be human-curated to be effective
- The quality of procedural documentation matters enormously
- Focused, concise Skills (2-3 modules) outperform comprehensive documentation
- Skills are not a universal solution — they hurt performance on 19% of tasks tested

### Implications for Reliability

Skills improve the *average* case but do not guarantee reliability. Even with curated Skills, the overall success rate "still fell short of what businesses need to reliably run workflows without human intervention." Skills define *what should happen*; a deterministic harness guarantees *what actually does happen*.

---

## 5. Real-World Approaches

### 5.1 Claude Code

Claude Code achieves reliability through tight feedback loops rather than single-shot accuracy:

- **Test-driven verification**: Write tests first, implement, run tests, iterate until passing. The loop is the reliability mechanism.
- **Lint and type checking**: Every code change runs through linters and type checkers. Failures trigger automatic correction.
- **Hooks system**: Pre- and post-action hooks enable automatic code review on all AI-generated code.
- **Context engineering**: Rolling compaction of conversation history to maintain coherence over long sessions.
- **Dev server feedback**: The agent sees compiler output, test runner results, and linter output — then responds to errors.

**Boris Cherny's rule** (creator of Claude Code): "Always give Claude a way to verify its work." Verification-first development is the foundation of reliable autonomous coding.

**Ralph Wiggum technique**: Run Claude Code autonomously overnight by giving it:
1. A clear objective
2. Test suite to validate against
3. Linter configuration
4. Permission to iterate

The agent loops: write code, run tests, see failures, fix, repeat — until all tests pass.

### 5.2 Cursor

Cursor achieves reliability through architectural isolation:

- **Git worktree isolation**: Each agent operates in a separate worktree, preventing file conflicts
- **Multi-model comparison**: Run the same task through multiple models, compare outputs, pick the best
- **Granular apply system**: Accept/reject changes at fine granularity per agent
- **Per-agent undo**: Revert one agent's work without affecting others
- **Agent-first architecture** (Cursor 2.0): Built around agent loops that plan, execute, and verify

### 5.3 GitHub Copilot

- **Agent Mode**: Autonomously plans and executes multi-step coding tasks
- **Error detection loop**: Detects errors, suggests fixes, executes terminal commands, iterates
- **Workspace awareness**: Indexes project files for context-aware suggestions
- **Terminal integration**: Runs commands and reads output to self-correct

### 5.4 Production AI Systems — Common Patterns

| Pattern | Description | Impact |
|---------|-------------|--------|
| **Harness engineering** | Deterministic orchestrator wraps probabilistic LLM calls | Guarantees workflow structure |
| **Stage gating** | Validate outputs before advancing to next phase | Prevents error propagation |
| **State management** | Track progress; enable safe restart from any point | Reduces retry cost |
| **Context isolation** | Sub-agents run with dedicated context windows | Prevents context contamination |
| **Task stratification** | Strong model for orchestration, cheap model for sub-tasks | Cost efficiency without reliability loss |
| **Chunking** | Process large inputs in segments | Prevents context overflow failures |
| **Canary deployment** | Gradual rollout with monitoring | Catches issues before full exposure |
| **Parallel verification** | Multiple independent validators check each output | Catches different error classes |

**Case study** from The AI Automators: A contract review system processed 34 clauses using parallel sub-agents, with a strong model orchestrating (7,000 tokens) and cheaper models analyzing clauses (323,000 tokens total). Reliability was maintained where critical, costs controlled elsewhere.

---

## 6. The Reliability Spectrum

Not all tasks require the same reliability level. The cost of additional nines must be justified by the cost of failure.

### When 90% Is Fine

| Use Case | Why 90% Works | Cost of Failure |
|----------|---------------|-----------------|
| Creative writing drafts | Human reviews and edits anyway | Wasted generation, minor delay |
| Brainstorming / ideation | Bad ideas get filtered out | No downstream impact |
| Code suggestions (inline) | Developer accepts/rejects each one | Wrong suggestion ignored |
| Exploratory data analysis | Analyst validates results | Insight missed, not harm caused |
| Internal documentation drafts | Reviewed before publishing | Minor rework |

### When You Need 99%+

| Use Case | Required Level | Why | Cost of Failure |
|----------|---------------|-----|-----------------|
| Customer-facing chatbot | 99%+ | Brand reputation, user trust | Customer churn, complaints |
| Code generation (committed) | 99%+ | Bugs in production | Incidents, downtime |
| Automated email responses | 99%+ | Sent without review | Embarrassment, legal risk |
| Data pipeline transforms | 99.9%+ | Silent corruption propagates | Incorrect business decisions |

### When You Need 99.9%+

| Use Case | Required Level | Why | Cost of Failure |
|----------|---------------|-----|-----------------|
| Financial transactions | 99.99%+ | Money moves, auditable | Financial loss, regulatory penalties |
| Medical diagnosis assist | 99.99%+ | Patient safety | Misdiagnosis, harm, liability |
| Legal document analysis | 99.9%+ | Binding commitments | Contract errors, lawsuits |
| Autonomous vehicle decisions | 99.999%+ | Physical safety | Injury, death |
| Infrastructure management | 99.99%+ | System availability | Outages, data loss |

### The Confidence Threshold Effect

Research on clinician acceptance of AI diagnostics found:

- **90-99% confidence predictions**: Override rate of only 1.7%
- **70-79% confidence predictions**: Override rate of 99.3%

This shows that reliability is not just about accuracy — it is about *calibrated confidence*. A system that knows when it does not know is more valuable than a system that is slightly more accurate but overconfident.

### Regulatory Requirements by Domain

| Domain | Standard | Requirement |
|--------|----------|-------------|
| Healthcare (US) | FDA, HIPAA | Clinical validation, privacy compliance |
| Finance (US) | CFPB, FINRA | Fair lending, audit trails |
| EU (all high-risk) | AI Act | Risk assessment, human oversight mandate |
| Automotive | NHTSA, ISO 26262 | Functional safety, fail-safe design |

---

## 7. Human-in-the-Loop as a Reliability Mechanism

### Where to Place Checkpoints

Human review is the ultimate reliability mechanism, but it does not scale. The key is placing checkpoints at high-leverage points.

**Checkpoint placement framework:**

```
                    High
                     |
    Cost of    [MANDATORY]     [MANDATORY]
    Failure    Human Review     Human Review
                     |              |
                     |   [OPTIONAL]  |
                     |   Confidence  |
                     |   Threshold   |
                     |              |
               [AUTOMATED]    [AUTOMATED]
                     |              |
                    Low ─────────────────── High
                         Reversibility
```

**Decision matrix:**

| Reversible? | Low Stakes | High Stakes |
|-------------|-----------|-------------|
| **Yes** (can undo) | Automate fully | Automate with async review |
| **No** (permanent) | Automate with approval gate | Mandatory human approval |

### Effective Checkpoint Patterns

1. **Pre-action approval**: Human approves before irreversible actions (deploy, send, delete, pay)
2. **Confidence-based escalation**: Route to human only when model confidence is below threshold
3. **Sampling-based audit**: Review a random subset of automated decisions for drift detection
4. **Batch review**: Accumulate low-risk decisions, present as batch for periodic human review
5. **Exception handling**: Automate the happy path, escalate exceptions to humans

### Autonomy Levels

| Level | Description | Human Role | Example |
|-------|-------------|------------|---------|
| 0 | Human does everything | Executor | Manual data entry |
| 1 | AI suggests, human decides | Decision maker | Code review suggestions |
| 2 | AI acts, human supervises | Supervisor | Auto-merge with approval |
| 3 | AI acts within bounds | Exception handler | Chatbot with escalation |
| 4 | AI acts, human audits | Auditor | Automated reports with spot checks |
| 5 | Full autonomy | Not involved | Background data processing |

### Anti-Patterns

- **Rubber-stamp review**: Human approves everything without reading — worse than no checkpoint because it creates false confidence
- **Alert fatigue**: Too many checkpoints degrade review quality; override rate approaches 100%
- **Untrained reviewers**: A poorly trained reviewer approving flawed agent outputs is worse than no checkpoint at all
- **Checkpoint at wrong granularity**: Reviewing every line vs. reviewing the final result — match granularity to risk

### The Autonomy Slider

Ship a configurable autonomy level that users can adjust:

- **Conservative**: Human approves every action (Level 1)
- **Balanced**: Human approves high-risk actions only (Level 3)
- **Aggressive**: Full autonomy with async audit (Level 4-5)

Include deterministic fallbacks: when confidence drops below threshold, automatically downgrade autonomy level and request human input.

---

## Key Takeaways

1. **90% reliability is the first nine — the easy part.** Each subsequent nine requires equivalent effort. Do not confuse a working demo with a working product.

2. **Compounding failure is the enemy.** A 10-step workflow at 95% per step only succeeds 60% of the time. At 50 steps, even 99% per step fails 40% of the time.

3. **The biggest gains come from removing LLM steps, not improving them.** Replace deterministic work with code. Reserve the LLM for tasks that genuinely require judgment.

4. **Skills help but are not sufficient.** SkillsBench shows +16pp improvement with curated Skills, but 19% of tasks got worse. Skills define intent; harnesses guarantee execution.

5. **Reliability is a system property, not a model property.** Larger models improve accuracy, not reliability. Reliability comes from architecture: retries, validation, checkpoints, deterministic rails, and guardrails.

6. **Match reliability investment to the cost of failure.** 90% is fine for creative drafts. 99.99% is required for financial transactions. Over-engineering reliability for low-stakes tasks wastes resources.

7. **Human-in-the-loop is the ultimate guardrail, but it must be designed carefully.** Place checkpoints at irreversible, high-stakes decision points. Avoid alert fatigue and rubber-stamp anti-patterns.

---

## Sources

- [Karpathy's March of Nines — VentureBeat](https://venturebeat.com/technology/karpathys-march-of-nines-shows-why-90-ai-reliability-isnt-even-close-to)
- [The March of Nines — Superagent](https://www.superagent.sh/blog/the-march-of-nines)
- [The March of Nines — Petar Radosevic](https://petar.dev/notes/the-march-of-nines/)
- [The March of Nines: Enterprise-Grade AI Reliability — Archynewsy](https://www.archynewsy.com/the-march-of-nines-achieving-enterprise-grade-ai-reliability/)
- [From Demos to Dependable: Engineering the March of Nines — TechBuddies](https://www.techbuddies.io/2026/03/08/from-demos-to-dependable-engineering-the-march-of-nines-for-enterprise-ai-agents/)
- [SkillsBench: Benchmarking How Well Agent Skills Work Across Diverse Tasks — arXiv:2602.12670](https://arxiv.org/abs/2602.12670)
- [Anthropic's Agent Skills Are Not Enough — The AI Automators](https://www.theaiautomators.com/anthropics-agent-skills/)
- [Keep Deterministic Work Deterministic — O'Reilly Radar](https://www.oreilly.com/radar/keep-deterministic-work-deterministic/)
- [The Emerging Reliability Layer in the Modern AI Agent Stack — Cleanlab](https://cleanlab.ai/blog/emerging-reliability-layer-agent-stack/)
- [AI Agent Reliability Strategies — Galileo](https://galileo.ai/blog/ai-agent-reliability-strategies)
- [Building Effective Agents — Anthropic](https://www.anthropic.com/research/building-effective-agents)
- [Equipping Agents for the Real World with Agent Skills — Anthropic Engineering](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Claude Code Best Practices — Anthropic](https://code.claude.com/docs/en/best-practices)
- [Auto-Reviewing Claude's Code — O'Reilly Radar](https://www.oreilly.com/radar/auto-reviewing-claudes-code/)
- [Claude Code Feedback Loops — ClaudeFast](https://claudefa.st/blog/guide/development/feedback-loops)
- [Human-in-the-Loop Agentic AI — Elementum AI](https://www.elementum.ai/blog/human-in-the-loop-agentic-ai)
- [Human-in-the-Loop for AI Agents — Permit.io](https://www.permit.io/blog/human-in-the-loop-for-ai-agents-best-practices-frameworks-use-cases-and-demo)
- [Agent vs Human-in-the-Loop 2025 Comparison — Skywork AI](https://skywork.ai/blog/agent-vs-human-in-the-loop-2025-comparison/)
