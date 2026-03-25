# Validation Loop Patterns in AI Agent Harnesses

> Research document covering generate-test-fix cycles, retry strategies, phase-gate validation,
> and anti-patterns observed in production AI agent systems.

---

## 1. What Validation Loops Are

A validation loop is a feedback control cycle where an AI agent generates output, evaluates it against
defined criteria, and iterates on failures until the output meets acceptance standards or a termination
condition is reached.

The fundamental pattern:

```
generate → validate → pass? → done
                ↓ fail
          feed error back → re-generate → validate → ...
```

This differs from traditional software retry logic in a critical way: the agent does not simply repeat
the same operation. It receives structured feedback about *why* the output failed and uses that
information to produce a different, hopefully better, result on the next attempt.

Validation loops appear in two primary contexts:

- **Code validation**: generate code → run tests → fix failures → iterate until tests pass
- **Content validation**: generate text/data → evaluate quality → refine → iterate until criteria met

The AWS Prescriptive Guidance defines this as the **Evaluator-Reflect-Refine Loop**: an event-driven
feedback control loop where a generator agent produces output, an evaluator agent reviews it against
criteria, and a refiner agent revises based on feedback. The loop repeats until convergence, approval,
or retry limit.

---

## 2. Code Validation Loops

### 2.1 Claude Code's Approach

Claude Code implements a tool-driven agent loop: `while(tool_call) → execute tool → feed results → repeat`.
The loop terminates naturally when the model generates plain text without tool usage.

A typical code fix cycle:

1. Claude receives a request to fix a bug
2. Uses `Grep`/`Read` to search and understand the code
3. Applies `Edit` to modify code
4. Runs `Bash` to execute tests
5. Reads test output, identifies remaining failures
6. Repeats steps 3-5 until tests pass

The key insight from [claudefa.st](https://claudefa.st/blog/guide/development/feedback-loops):
"Claude writes the code, runs your test suite, sees the failures, fixes them, and repeats until green."

**Best practices for Claude Code feedback loops:**

- Break large tasks into validatable chunks with clear success criteria
- Start with failing tests, then implement features — tests become concrete success definitions
- When Claude circles on the same error, redirect with specificity: "the test still fails because X, try a different approach"
- Use `--max-iterations` as a safety net when running autonomously

**Known convergence issues:** The "apology-repeat loop" — Claude apologizes for an error, attempts a
fix that introduces a new deviation, apologizes again, and can continue 5-10+ iterations without
converging. Sub-agents cannot spawn their own sub-agents, preventing recursive explosion.

### 2.2 Stripe's Minions Approach

Stripe's Minions system merges 1,000+ AI-generated pull requests per week using a **two-round CI
validation** approach with a 3-million-test suite:

**Round 1 — Local + CI:**
- Run a subset of linters as a deterministic node within the agent dev-loop blueprint
- Loop on lint locally before pushing (background daemons precompute lint heuristics for sub-second feedback)
- Push to CI and run the full test suite
- Apply auto-fixes for any failures that have automated remediation

**Round 2 — Agent Fix + Final CI:**
- If failures lack auto-fixes, send failure output back to a blueprint agent node
- Give the minion one more chance to fix the failing test locally
- Push again and run CI a final time
- After second push, the branch goes to humans for review

Stripe explicitly caps at two CI rounds: "CI runs cost tokens, compute, and time, and we think there
are diminishing marginal returns if an LLM is running against indefinitely many rounds of a full CI loop."

The architecture is a **blueprint state machine** — alternating deterministic code nodes (linting,
pushing) with free-flowing agent nodes (fixing failures). Human review remains mandatory before merge.

### 2.3 SWE-agent's Approach

SWE-agent implements a `DefaultAgent` with a setup/step/completion lifecycle:

1. Agent queries the language model with current context
2. Model output is parsed to extract actions
3. Actions are validated against tool constraints (`should_block_action()` checks)
4. Commands execute in a SWE-ReX sandboxed environment (Docker/Modal/AWS)
5. Observations from execution are added to history
6. Loop continues until exit conditions are met

**Multi-attempt orchestration** via `RetryAgent`:
- Wraps the core agent and enables multiple solution attempts on the same problem
- Each attempt is evaluated via `AbstractRetryLoop` implementations
- The best solution across all attempts is selected

**Convergence controls:**
- Per-instance cost limits (default: $3.00)
- Per-instance API call limits
- Token counting prevents context window overflow (`ContextWindowExceededError`)
- `RetryConfig` with max retry attempts (default: 20) and exponential backoff (10-120 second waits)

**Known issues:** Claude can get stuck in a loop with SWE-agent's windowed edit tool. Existing linter
errors in a file can trap SWE-agent in a lint-retry-loop where it cannot edit because each edit
re-triggers the same pre-existing lint failures.

### 2.4 Typical Iteration Counts

| System | Max Iterations | Typical Convergence | Notes |
|--------|---------------|---------------------|-------|
| Claude Code | Configurable (`--max-iterations`) | 2-5 for straightforward fixes | Can hit 10+ on apology-repeat loops |
| Stripe Minions | Hard cap at 2 CI rounds | 1-2 | Explicit design decision for diminishing returns |
| SWE-agent | Default 20 retries | Varies widely | Cost-bounded, not iteration-bounded |
| SWE-bench top solvers | pass@1 to pass@3 | 76% → 81% (Verdent) | ~5% improvement from 1 to 3 attempts |

---

## 3. Non-Code Validation Loops

### 3.1 LLM-as-Judge

LLM-as-Judge uses a separate LLM to evaluate the quality of output produced by another LLM. Research
shows sophisticated judge models align with human judgment up to **85%** — higher than human-to-human
agreement (81%).

**Two primary patterns:**

| Pattern | How It Works | Best For |
|---------|-------------|----------|
| Direct Assessment (Point-wise) | Judge evaluates individual responses on a rubric | Absolute quality scoring |
| Pairwise Comparison | Judge selects the better of two candidate responses | Relative ranking, A/B testing |

**Quality dimensions evaluated:** relevance, factual accuracy, faithfulness to sources, instruction
adherence, coherence, clarity, tone.

**Implementation pattern:**

```python
# Generator produces output
draft = generator_llm.generate(prompt)

# Judge evaluates with structured rubric
evaluation = judge_llm.evaluate(
    output=draft,
    criteria=["accuracy", "completeness", "tone"],
    rubric="Score 1-5 on each dimension. Explain reasoning."
)

# If below threshold, feed feedback back to generator
if evaluation.score < threshold:
    refined = generator_llm.generate(
        prompt,
        feedback=evaluation.reasoning
    )
```

**Best practices:**
- Use yes/no questions over open-ended scales for consistency
- Break complex criteria into separate evaluations
- Ask for reasoning before the score (improves calibration)
- Creating LLM judges is iterative — adjust standards as you see real-world patterns
- Dedicated judge models consistently outperform general-purpose models

### 3.2 Schema Validation (Pydantic, Zod)

Schema validation enforces structural correctness on LLM outputs using type systems. Pydantic and
Zod treat every output as a **contract** defined by schemas — the schemas become guardrails.

**Retry-with-feedback pattern:**

```python
from pydantic import BaseModel, ValidationError

class AnalysisResult(BaseModel):
    summary: str
    confidence: float  # 0.0 to 1.0
    categories: list[str]
    sources: list[str]

MAX_RETRIES = 3

for attempt in range(MAX_RETRIES):
    raw_output = llm.generate(prompt)
    try:
        result = AnalysisResult.model_validate_json(raw_output)
        break  # Valid output
    except ValidationError as e:
        # Feed validation error back into prompt
        prompt = f"""Previous output failed validation:
        {e.errors()}

        Fix these issues and respond with valid JSON matching the schema:
        {AnalysisResult.model_json_schema()}"""
```

**PydanticAI integration:** The `Agent` class takes an `output_type` argument supporting Pydantic
models, dataclasses, scalar types, and type unions. Output function arguments are validated using
Pydantic and can raise `ModelRetry` to ask the model to try again with modified arguments.

**Key principle:** "Use Pydantic as your LLM contract — prompt with the actual schema, validate every
boundary, and turn ValidationErrors into structured retries rather than brittle prompt hacks."

### 3.3 Fact-Checking Loops

Fact-checking validation verifies the factual accuracy of AI-generated content against trusted sources.

**Common patterns:**

- **Citation verification**: Ask the model for sources, then programmatically verify those sources exist
  and support the claims made
- **RAG grounding checks**: Google's Check Grounding API returns a support score (0-1) indicating how
  much the answer agrees with given reference texts
- **Cross-source validation**: Compare claims against multiple independent knowledge bases
- **Temporal validation**: Verify that cited statistics and facts are current, not outdated

**Impact:** A human-in-the-loop RAG approach cut hallucinations by **59%** across a 1,200-article
benchmark compared with fully autonomous models.

### 3.4 Cross-Reference Validation

Cross-reference validation compares AI output against source documents to detect hallucinations,
misattributions, and unsupported claims.

**Implementation approaches:**

```
Source Documents → Embeddings → Vector Store
                                     ↓
AI Output → Claim Extraction → Similarity Search → Support Score
                                                        ↓
                                              Below threshold? → Reject/Revise
```

- Extract individual claims from the output
- Search source documents for supporting evidence
- Score each claim on a grounded/ungrounded scale
- Flag or reject claims below the support threshold
- Feed ungrounded claims back to the generator with source context

### 3.5 Consistency Checks

Self-consistency validation detects internal contradictions in AI output.

**Patterns:**

- **Multi-sample voting**: Generate the same output N times, select the majority answer
- **Contradiction detection**: Use an NLI (Natural Language Inference) model to check if any part of
  the output contradicts another part
- **Ensemble validation**: Compare outputs from multiple models or prompts — flag divergences
- **Temporal consistency**: Verify that facts referenced in different parts of the output agree on
  dates, numbers, and relationships

AI can create content with conflicting statements — a piece might present a claim in one section that
contradicts itself later. These must be detected and corrected before downstream consumption.

---

## 4. Phase-Gate Validation

Phase-gate validation ensures each step's output meets quality criteria before the next phase begins.
This prevents corrupted intermediate results from poisoning downstream processing.

### 4.1 Architecture

```
Phase 1: Plan          Phase 2: Implement       Phase 3: Verify
┌──────────┐          ┌──────────────┐          ┌────────────┐
│ Generate │──gate──→ │   Generate   │──gate──→ │  Generate  │
│   Plan   │          │     Code     │          │   Report   │
└──────────┘          └──────────────┘          └────────────┘
     ↑                      ↑                        ↑
     │ fail                 │ fail                    │ fail
┌──────────┐          ┌──────────────┐          ┌────────────┐
│ Validate │          │   Validate   │          │  Validate  │
│   Plan   │          │     Code     │          │   Report   │
└──────────┘          └──────────────┘          └────────────┘
```

Each phase follows the same lifecycle:
1. **Deterministic pre-events** set up context
2. **Agent does creative work** (generation)
3. **Deterministic post-events** validate the output (fast structural checks first)
4. **Critic agent** handles judgment calls that require semantic understanding

### 4.2 Dual Quality Gates

The [Agentic Engineering](https://www.sagarmandal.com/2026/03/15/agentic-engineering-part-7-dual-quality-gates-why-validation-and-testing-must-be-separate-processes/)
framework separates validation from testing:

| Gate | Question | Method |
|------|----------|--------|
| **Validation** (spec check) | "Did we build the right thing?" | Acceptance criteria, test suites, linting, SLO checks |
| **Testing** (experience check) | "Does this work for the user?" | Browser automation (Playwright), real user journeys, screenshots |

**Why separate them:**
1. Different context requirements — validation needs test infra, testing needs browser capabilities
2. Independent failure diagnostics — spec violation vs. UX friction have different root causes
3. Faster feedback loops — code changes trigger either gate independently

### 4.3 Checkpoint Pattern

For durable multi-agent workflows, each step acts as a persistence boundary:

- **Automatic state saving** after each activity completes
- **Resume from last checkpoint** on infrastructure failure (lose 1-8 minutes, not 45 minutes)
- **Hybrid validation** at checkpoints: deterministic checks first (fast), AI-powered validation only
  when necessary (semantic)
- **Fail-fast**: stop immediately if validation fails, preventing downstream work on corrupted data
- **Independent step retries**: failed steps retry individually, not the entire workflow
- **Differentiated timeouts**: longer for analysis (2 min), shorter for validation (30 sec)

---

## 5. Retry Strategies

### 5.1 Simple Retry (Same Prompt)

The simplest strategy — re-run the same generation with the same prompt. Useful only for transient
errors (network timeouts, rate limits). For stable validation failures, simple retries usually make
things worse.

```python
@retry(wait=wait_exponential(), stop=stop_after_attempt(3))
def run_tool(tool_name, input_args):
    validate(input_args)
    return tool_registry[tool_name](**input_args)
```

### 5.2 Retry with Error Feedback

Feed the validation error back into the prompt so the model can self-correct. This is the most common
and effective pattern for LLM output validation.

```python
for attempt in range(max_retries):
    output = llm.generate(prompt)
    errors = validate(output)
    if not errors:
        return output
    prompt = f"""{original_prompt}

    Your previous output had these errors:
    {format_errors(errors)}

    Fix these issues in your next response."""
```

**Key insight:** If the validator cannot clearly articulate *why* it failed, the generator will spin
in circles until `max_iterations` kicks in.

### 5.3 Retry with Different Model

Maintain multiple prompt templates or model configurations for the same task. On validation failure,
try a different approach:

```python
models = [
    ("claude-sonnet", template_concise),
    ("claude-opus", template_detailed),
    ("gpt-4", template_structured),
]

for model, template in models:
    output = generate(model, template, task)
    if validate(output):
        return output

# All models failed → escalate
escalate_to_human(task, all_outputs)
```

Stripe's architecture demonstrates this with "configurable retry mechanisms: trying multiple agent
configurations, models, parameters, etc., then choosing the best one."

### 5.4 Escalation Patterns

Progressive response to failure:

```
Level 1: Self-correct     → Retry with error feedback (automated)
Level 2: Alternative path → Try different model/prompt/approach (automated)
Level 3: Graceful degrade → Return partial results with caveats (automated)
Level 4: Human escalation → Surface to human with full context (manual)
```

**Human escalation triggers:**
- Confidence score below threshold (e.g., <85%)
- Same error repeating 3+ times
- Business logic or compliance violations
- Cost/time budget exceeded
- Customer explicitly requests human assistance

**Error classification for retry decisions:**

| Error Type | Retry? | Strategy |
|-----------|--------|----------|
| 429 / timeout | Yes | Exponential backoff with jitter |
| Auth / permissions | No | Will not improve — escalate |
| Validation error | Yes | Retry with error feedback |
| Same tool + same error 3x | No | Stop — different approach needed |
| Unknown / unclear | Escalate | Human review |

**Context preservation:** Seamless handoffs require comprehensive context packaging — conversation
history, customer intent, AI-generated insights — so humans receive full situational awareness
without requiring information to be repeated.

---

## 6. Programmatic vs. AI-Driven Validation

### When to Use Each

| Dimension | Programmatic (Deterministic) | AI-Driven (LLM-as-Judge) |
|-----------|------------------------------|--------------------------|
| **Speed** | Milliseconds | Seconds |
| **Cost** | Zero per execution | Token cost per evaluation |
| **Reproducibility** | Perfect — same input always same result | Non-deterministic |
| **Best for** | Format, structure, schema, syntax, types | Meaning, relevance, quality, tone |
| **Limitation** | Cannot assess semantic quality | Cannot guarantee factual accuracy |

### Decision Framework

**Use programmatic validation when:**
- Each input has a single correct answer (date extraction, format conversion)
- Output must follow a specific structure (JSON schema, required fields, character limits)
- Checking generated code syntax, SQL validity, API response format
- Safety/compliance rules that are binary (contains PII? exceeds length limit?)

**Use AI-driven validation when:**
- Multiple valid outputs exist (translation, summarization, creative writing)
- Assessing subjective qualities (tone, relevance, coherence, helpfulness)
- Evaluating semantic correctness (does this answer actually address the question?)
- Detecting subtle issues (logical contradictions, misleading implications)

### Recommended Architecture

Layer both approaches — programmatic first, AI second:

```
Output → Schema Validation (fast, free)
              ↓ pass
         Safety Checks (fast, free)
              ↓ pass
         LLM-as-Judge (slow, costs tokens)
              ↓ pass
         Accept
```

"Start with programmatic rules — they are free, fast, and deterministic — and build a foundation of
structural and safety checks before adding more sophisticated evaluations."

---

## 7. Anti-Patterns

### 7.1 Infinite Loops

The most expensive anti-pattern. Actions exist, but progress does not. A task costing $0.08 can
spiral to $12 in 15 minutes.

**Four loop types** (from [agentpatterns.tech](https://www.agentpatterns.tech/en/failures/infinite-loop)):

| Type | Behavior | Root Cause |
|------|----------|------------|
| **Hard Loop** | Identical tool call with same arguments | Missing deduplication |
| **Soft Loop** | Minimal argument variations (adding one word) | No validation that new information appeared |
| **Retry Storm** | Tool failures trigger retries at multiple layers | Retry logic scattered without unified policy |
| **Semantic Loop** | Agent rephrases plans, re-summarizes data | Missing progress criteria in runtime |

**Detection signals:**
- Sharp growth in `steps_per_task` without completion
- High `repeated_tool_signature_rate` within a single run
- Multiple steps yielding no new facts/artifacts
- Frequent `timeout` and `max_steps_reached` stop reasons
- Rising cost with flat quality

**Prevention:**
- Set hard limits: `max_steps`, `timeout`, `max_tool_calls`, `max_tokens`
- Implement deduplication with repeat limits
- Stop runs lacking progress for N consecutive steps
- Return clear stop reasons with partial results (never fail silently)
- Loop control belongs in the **agent runtime**, not in the agent itself

### 7.2 Validation Weaker Than Generation

When the validator cannot reliably detect the errors the generator produces, the loop provides false
confidence. The output "passes" validation but is still wrong.

**Common manifestations:**
- Using a smaller/cheaper model as judge for a more capable generator
- Vague acceptance criteria that the checker cannot consistently evaluate
- **Validation hallucination**: the agent "verifies" its fix by running a command it thinks passes,
  but the command actually fails silently
- Schema-only validation when semantic validation is needed (output has correct JSON structure but
  wrong content)

**Mitigation:**
- Judge model should be at least as capable as the generator for the evaluation dimension
- Acceptance criteria must be specific and binary where possible
- Use programmatic checks for everything that can be checked programmatically
- Test the validator itself — does it catch known-bad outputs?

### 7.3 Over-Validation That Kills Performance

Every validation step adds latency and cost. Without boundaries, agents can "research forever,
burning tokens while producing nothing."

**Symptoms:**
- Total validation cost exceeds generation cost
- Validation adds 10x+ latency to the pipeline
- Multiple redundant validators checking the same dimension
- Validation gates blocking progress on minor, non-critical issues

**Mitigation:**
- Tier validation by criticality: critical checks always, expensive checks sampled
- Set time/cost budgets for validation steps independent of generation
- Use fast programmatic checks as first-pass filters before expensive AI validation
- Accept "good enough" for non-critical outputs — not everything needs 5 validation layers

### 7.4 Silent Validation Failures

The validator runs but its results are not actually used to gate the pipeline. Output proceeds
regardless of validation outcome.

### 7.5 Validator-Generator Collusion

When the same model (or highly similar models) both generates and validates, systematic blind spots
are shared. The validator fails to catch the same classes of errors the generator produces.

---

## 8. Real-World Examples and Metrics

### 8.1 Stripe Minions

- **Volume**: 1,300+ weekly AI pull requests merged
- **Validation**: 2 CI rounds max against 3 million+ test suite
- **Human review**: mandatory before merge
- **Architecture**: Blueprint state machine (deterministic nodes + agent nodes)
- **Key metric**: Merge rate, review cycle time, test pass rate, revert rate
- **Design insight**: Diminishing returns after 2 CI rounds — more iterations burn tokens without
  meaningful improvement

### 8.2 SWE-bench Performance

| Metric | Value | System |
|--------|-------|--------|
| pass@1 | 76.1% | Verdent (top solver, 2025) |
| pass@3 | 81.2% | Verdent |
| pass@1 | 33.2% | GPT-4o baseline |
| Improvement 1→3 attempts | ~5 percentage points | Multi-attempt gains |

The ~5% improvement from pass@1 to pass@3 suggests validation loops provide meaningful but bounded
returns. Most gains come from the first retry.

### 8.3 Google DORA Report (2025)

90% AI adoption increase correlates with:
- 9% increase in bug rates
- 91% increase in code review time
- 154% increase in PR size

This data argues strongly for validation loops — AI generates more code faster, but without
validation gates, quality degrades.

### 8.4 RAG Fact-Checking

- Human-in-the-loop RAG cut hallucinations by **59%** across 1,200 articles vs. fully autonomous
- Grounding scores (0-1) from reference document comparison provide quantitative validation

### 8.5 LLM-as-Judge Reliability

- Sophisticated judge models align with human judgment up to **85%**
- Human-to-human agreement baseline: **81%**
- LLM judges can exceed human inter-rater reliability on structured evaluation tasks

### 8.6 Key Takeaways

1. **Two iterations is the sweet spot for code validation** — Stripe's data shows diminishing returns
   beyond 2 CI rounds. SWE-bench shows ~5% improvement from 1 to 3 attempts.

2. **Programmatic checks first, AI validation second** — layer fast/free checks before expensive
   semantic evaluation.

3. **The validator must be at least as strong as the generator** — weak validation provides false
   confidence.

4. **Hard limits are non-negotiable** — every loop needs `max_iterations`, `max_cost`, `timeout`.
   Without them, a $0.08 task becomes a $12 runaway.

5. **Separate validation from testing** — spec compliance and user experience are different quality
   dimensions requiring different tools.

6. **Feed errors back, do not just retry** — retry with error context is dramatically more effective
   than simple retry.

---

## Sources

- [Claude Code Feedback Loops](https://claudefa.st/blog/guide/development/feedback-loops)
- [Claude Code Agent Loop Internals](https://blog.promptlayer.com/claude-code-behind-the-scenes-of-the-master-agent-loop/)
- [How Claude Code Works](https://code.claude.com/docs/en/how-claude-code-works)
- [Stripe Minions Part 2](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents-part-2)
- [How Stripe Built Secure Unattended AI Agents](https://medium.com/@oracle_43885/how-stripe-built-secure-unattended-ai-agents-merging-1-000-pull-requests-weekly-1ff42f3fe550)
- [What Is an AI Agent Harness — MindStudio on Stripe](https://www.mindstudio.ai/blog/what-is-ai-agent-harness-stripe-minions)
- [SWE-agent Architecture — DeepWiki](https://deepwiki.com/SWE-agent/SWE-agent)
- [SWE-bench Verified — Epoch AI](https://epoch.ai/benchmarks/swe-bench-verified)
- [LLM-as-a-Judge — Evidently AI](https://www.evidentlyai.com/llm-guide/llm-as-a-judge)
- [LLM-as-Judge Best Practices — Monte Carlo Data](https://www.montecarlodata.com/blog-llm-as-judge/)
- [Survey on LLM-as-a-Judge — arXiv](https://arxiv.org/html/2411.15594v6)
- [Pydantic for LLMs](https://pydantic.dev/articles/llm-intro)
- [Pydantic Validation for LLM Outputs — freeCodeCamp](https://www.freecodecamp.org/news/how-to-keep-llm-outputs-predictable-using-pydantic-validation/)
- [PydanticAI Output Validation](https://ai.pydantic.dev/output/)
- [Infinite Agent Loop — Agent Patterns](https://www.agentpatterns.tech/en/failures/infinite-loop)
- [Agent Loop Prevention — MatrixTrak](https://matrixtrak.com/blog/agents-loop-forever-how-to-stop)
- [Evaluator Reflect-Refine Loops — AWS](https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/evaluator-reflect-refine-loop-patterns.html)
- [Dual Quality Gates — Sagar Mandal](https://www.sagarmandal.com/2026/03/15/agentic-engineering-part-7-dual-quality-gates-why-validation-and-testing-must-be-separate-processes/)
- [Durable Agentic Workflows with Validation Gates](https://www.yess.ai/post/durable-agentic-workflows)
- [Error Recovery and Fallback Strategies](https://www.gocodeo.com/post/error-recovery-and-fallback-strategies-in-ai-agent-development)
- [Agentic AI Patterns and Anti-Patterns](https://glaforge.dev/talks/2025/12/02/ai-agentic-patterns-and-anti-patterns/)
- [When to Use Different LLM Evaluations — Latitude](https://latitude.so/blog/how-to-choose-the-right-evaluation)
- [LLM Evaluation Framework — Evidently AI](https://www.evidentlyai.com/blog/llm-evaluation-framework)
- [RAG Evaluation Best Practices — Evidently AI](https://www.evidentlyai.com/llm-guide/rag-evaluation)
- [Ralph Wiggum Autonomous Loops for Claude Code](https://paddo.dev/blog/ralph-wiggum-autonomous-loops/)
- [AI Coding Agents 2026 — Mike Mason](https://mikemason.ca/writing/ai-coding-agents-jan-2026/)
