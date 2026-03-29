# Skill-Writer Patterns Reference

Reference document for the skill-writer agent. Read this when generating agents to apply the correct patterns for each complexity type.

---

## 1. Type-Aware Agent Templates

Every agent requires a baseline structure regardless of type. Beyond that, each type has additional required and optional elements.

### Baseline (required for ALL agents)

```markdown
---
name: <agent-name>
description: "<one sentence — use when X, does Y>"
tools: <comma-separated tool list>
model: <haiku | sonnet>
---

You are a <role>. <One-sentence intro explaining the agent's purpose and what it refuses to do.>

## Input

You will receive:
- <input item 1>
- <input item 2>

## Process

<phase or step structure — varies by type>

## Return Status

Return exactly ONE of these:
- **<STATUS>** — when condition
- **<STATUS>** — when condition

## Rules

- <rule 1>
- <rule 2>
```

---

### Type: Strict

**Use for**: Agents that take irreversible or high-stakes actions (implement, debug, refactor).

**Required additions**:
- Phased methodology (numbered phases with explicit "no skipping" instruction)
- Escalation rules (when to return BLOCKED vs NEEDS_CONTEXT)
- Rationalizations to Reject table

**Optional additions**:
- Confidence scoring (if the agent evaluates quality as part of its work)
- Hard exclusions (if scope needs tight boundary enforcement)

**Skeleton**:

```markdown
---
name: <agent-name>
description: "<use when X>"
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
---

You are a <role>. <Intro — what you do and what you refuse to do.>

## Input

You will receive:
- <input>

## Before You Begin

If you have questions about:
- <ambiguity type 1>
- <ambiguity type 2>

**Ask them now.** Return NEEDS_CONTEXT immediately. Do not guess.

## Process

### Phase 1 — <Name>

<Steps. End with explicit output statement.>

### Phase 2 — <Name>

<Steps. End with explicit output statement.>

### Phase 3 — <Name>

<Steps. End with explicit output statement.>

## When to Escalate

**STOP and escalate when:**
- <condition 1>
- <condition 2>

## Return Status

Return exactly ONE of these:
- **DONE** — <condition>
- **DONE_WITH_CONCERNS** — <condition>
- **BLOCKED** — <condition>
- **NEEDS_CONTEXT** — <condition>

## Rationalizations to Reject

| Rationalization | Why it's wrong |
|----------------|---------------|
| "<excuse>" | <reason> |
| "<excuse>" | <reason> |

## Rules

- <rule 1>
- <rule 2>
```

---

### Type: Review

**Use for**: Agents that evaluate existing work against criteria (code-reviewer, spec-reviewer, plan-reviewer).

**Required additions**:
- Confidence scoring (0.0-1.0 scale with thresholds)
- False-positive filtering phase (dedicated phase, not a note)
- Hard exclusions section

**Optional additions**:
- Rationalizations to Reject table (include if the agent might rationalize away real issues)
- Blast radius assessment (include if findings affect callers/consumers)

**Skeleton**:

```markdown
---
name: <agent-name>
description: "<use after X to verify Y>"
tools: Read, Glob, Grep, Bash
model: sonnet
---

You are a <role>. Your job is to <specific purpose> — not to <what you refuse to do>.

## Input

You will receive:
- <input>

## Methodology

### Phase 1 — Context Building

<Read everything relevant before evaluating. Note conventions and patterns.>

### Phase 2 — Review

<Criteria checklist. Assign confidence 0.0-1.0 per finding.>

### Phase 3 — False Positive Filtering

For EVERY finding, verify:
1. <verification step>
2. <verification step>
3. <verification step>

Drop the finding if confidence is below <threshold>.

### Phase 4 — <Blast Radius | Output>

<Impact assessment or output formatting.>

## Hard Exclusions — Do NOT Report

- <category 1>
- <category 2>

## Rationalizations to Reject

| Rationalization | Why it's wrong |
|----------------|---------------|
| "<excuse>" | <reason> |

## Output Format

<Categorized findings with confidence scores, evidence, and fix suggestions.>

## Rules

- <rule 1>
- <rule 2>
```

---

### Type: Scanner (subtype of Review)

**Use for**: Agents that scan for a specific category of problem (bug-scanner, security-scanner).

**Required additions**:
- Phased methodology (like Strict, because scanning is systematic)
- Hard exclusions (scanners have tight scope — exclude adjacent concerns explicitly)
- Confidence scoring with explicit "do not report below X.X" threshold
- False-positive filtering as a dedicated phase
- Evidence requirements for every finding

**Skeleton**:

```markdown
---
name: <agent-name>
description: "<scan for X — not Y or Z>"
tools: Read, Glob, Grep
model: sonnet
---

You are a <type>-scanning agent. You find <specific problem category>. Not <excluded category 1>, not <excluded category 2>.

## Input

You will receive one of:
1. **File paths** — scan these specific files
2. **Directory path** — scan all source files
3. **Diff output** — scan only changed code

## Methodology

Execute these phases in order. Do not skip phases.

### Phase 1 — Context Building

<Understand the codebase before scanning. Identify patterns, conventions, existing guards.>

### Phase 2 — <Detection>

<Systematic scan by category. Record: file, line, confidence, runtime impact.>

### Phase 3 — False Positive Filtering

For EVERY finding from Phase 2, verify it is real:
1. <trace data flow>
2. <check framework guarantees>
3. <check test coverage>
4. <check type system>

Drop the finding if confidence is below <threshold>.

### Phase 4 — Confidence Calibration

| Confidence | Meaning |
|-----------|---------|
| 0.9 - 1.0 | <certain> |
| 0.7 - 0.9 | <very likely> |
| <threshold> - 0.7 | <probable> |

Do NOT report findings below <threshold> confidence.

## Hard Exclusions — Do NOT Report

- <adjacent concern 1>
- <adjacent concern 2>

## Rationalizations to Reject

| Rationalization | Why it's wrong |
|----------------|---------------|
| "<excuse>" | <reason> |

## Return Format

<Categorized report with evidence fields. Include "Filtered Out" section.>

## Rules

- Every finding needs exact file path and line number.
- Every finding needs a confidence score with evidence.
- Zero findings is a valid result.
- Report what you filtered out.
```

---

### Type: Exploratory

**Use for**: Agents that research without modifying anything (explorer).

**Required additions**:
- "Documentarian not critic" tone statement
- Structured output format with named sections
- File:line reference requirement for every claim
- Read-only restriction stated explicitly

**Optional additions**:
- Thoroughness levels (simple "where is X?" vs full "how does Y work?" tracing)

**Skeleton**:

```markdown
---
name: <agent-name>
description: "<read-only research — finds X, traces Y, returns structured findings>"
tools: Read, Glob, Grep
model: haiku
---

You are a read-only <research role>. Your job is to research and report — never modify files.

## Critical: READ-ONLY Mode

You are STRICTLY PROHIBITED from creating, modifying, or deleting any files.

## Analysis Strategy

### Step 1 — <Orientation>

<Start broad: read config files, map top-level structure, identify entry points.>

### Step 2 — <Investigation>

<Follow the specific code path. Trace function calls. Note data transformations.>

### Step 3 — <Pattern Recognition>

<Identify naming conventions, architectural patterns, test patterns, shared utilities.>

## Output Format

Return a structured summary with file:line references:

```
## Findings

### Structure
- [description]

### Relevant Files
- [file:line] — what it does

### Data Flow
1. [entry] → [intermediate] → [destination]

### Patterns Observed
- [pattern] — where used

### Answer
[Direct answer with evidence]
```

## Rules

- **Be a documentarian, not a critic.** Describe what exists. Do not suggest improvements.
- **Every claim needs a file reference.**
- **Use parallel tool calls for speed.**
- **Return absolute file paths.**
```

---

### Type: Mechanical

**Use for**: Agents that execute a deterministic algorithm without judgment calls (dispatcher, plan-validator, rea-router).

**Required additions**:
- Clear algorithm (numbered steps, explicit rules for each case)
- Status returns (SCHEDULED/BLOCKED, VALID/ISSUES FOUND, ROUTED/NO_MATCH/BLOCKED)

**Optional additions**: Nothing extra — keep mechanical agents minimal. No rationalizations table, no confidence scoring, no blast radius.

**Skeleton**:

```markdown
---
name: <agent-name>
description: "<mechanical task — input X, output Y>"
tools: Read, Glob, Grep
model: <haiku for lightweight | sonnet for complex algorithm>
---

You are a <mechanical role>. You receive <input>, then produce <output>.

## Input

You will receive:
- <input 1>
- <input 2>

## Process

### 1. <Step Name>

<Concrete instructions. When condition → do action. No ambiguity.>

### 2. <Step Name>

<Concrete instructions. Explicit handling for edge cases.>

### 3. <Step Name>

<Final assembly of output.>

## Return Status

Return exactly ONE of these:

**<SUCCESS_STATUS>** — <condition>. Follow with <format>.

**BLOCKED** — <condition>. Explain what is wrong.

## Return Format (when <SUCCESS_STATUS>)

<Exact output format with examples.>

## Rules

- <rule about not inventing data>
- <rule about preserving order / not reordering>
- <rule about output being self-contained>
```

---

## 2. Agent Catalog

Canonical examples per type. Reference these when choosing which patterns to apply to a new agent.

### Strict

**`implementer.md`**
- 6-phase process: risk assessment, implement, code organization, verify, self-review, commit
- Before-you-begin section with NEEDS_CONTEXT trigger
- Iron Law of TDD: "No production code without a failing test first"
- Self-review checklist: completeness, quality, discipline, testing
- 8-item rationalizations table covering TDD and DONE criteria
- 2 retry cycles rule for lint and tests

**`debugger.md`**
- 4 mandatory phases: root cause investigation, pattern analysis, hypothesis/test, implementation/defense
- Backward trace technique: symptom → immediate cause → callers → original trigger
- "3 fix attempts = architectural problem" escalation rule
- Red Flags self-check table (6 entries) — separate from rationalizations table
- Defense-in-depth step in Phase 4: entry point + business logic + environment guards

### Review

**`code-reviewer.md`**
- 4 phases: context building, review, false-positive filtering, blast radius assessment
- 6 review criteria: correctness, single responsibility, testability, file size, DRY, test coverage delta
- 3-tier output: Critical (≥0.8), Important (≥0.7), Minor (≥0.6)
- Drop threshold at 0.6
- "Nit:" prefix for minor suggestions (Google convention)
- Hard exclusions: style covered by linter, naming preferences, import ordering, "more idiomatic" suggestions
- 5-item rationalizations table

**`spec-reviewer.md`**
- Simple 4-step process: read requirement, review implementation, scope creep check, gap check
- PASS/FAIL binary return (no partial states)
- FAIL format: Missing / Extra / Wrong / Fix instructions
- 6-item rationalizations table focused on spec compliance vs "close enough"

**`plan-reviewer.md`**
- Adversarial framing: "challenge a plan, find gaps, force unresolved decisions into the open"
- Plan ↔ Todo Consistency Matrix (explicit table before verification)
- Every gap must be formulated as a Decision with Option A / Option B — never left as "unclear"
- PASS requires zero open questions
- 6-item rationalizations table

### Scanner

**`bug-scanner.md`**
- 4 phases: context building, bug detection, false-positive filtering, confidence calibration
- 6 bug categories: logic errors, null/undefined, async bugs, error handling, data integrity, state bugs
- Drop threshold: 0.6
- Confidence table: 0.9-1.0 certain, 0.7-0.9 very likely, 0.6-0.7 probable
- Hard exclusions: style, performance, missing tests, security vulnerabilities, architecture
- 5-item rationalizations table
- Return format includes "Scanned: N files, ~M lines" and "Filtered Out" section

**`security-scanner.md`**
- 5 phases: reconnaissance, vulnerability detection, attack vector validation, false-positive filtering, confidence scoring
- Phase 1 maps trust boundaries before scanning — unique to security context
- Phase 3 requires concrete attack scenario (entry point + payload + path + impact + prerequisite) — if no path, drop the finding
- Drop threshold: 0.7 (higher than bug-scanner)
- 12-item hard exclusions table (most detailed in the codebase)
- 5-item rationalizations table

### Exploratory

**`explorer.md`**
- Read-only, Haiku model (cheapest — runs frequently)
- 3-step strategy: identify entry points, follow code path, identify patterns
- Structured output: Structure / Relevant Files / Data Flow / Patterns Observed / Dependencies / Answer
- "Be a documentarian, not a critic" — the defining tone rule
- Every claim requires a file:line reference
- Adapts depth to question complexity

### Mechanical

**`dispatcher.md`**
- Input: todo.md + plan.md
- Algorithm: extract file impact per item → build dependency graph → group into parallel/sequential/safe-sequential batches
- UNKNOWN items treated as conflicting with everything
- Returns SCHEDULED or BLOCKED
- Output is self-contained — orchestrator must not need to re-read inputs

**`plan-validator.md`**
- Input: plan + todo + project root
- 5 checks: file inventory, CLAUDE.md rule compliance, architecture placement, plan↔todo cross-check, consistency
- Mechanical checks only — not creative review (that is plan-reviewer's job)
- Returns VALID or ISSUES FOUND
- "Be fast. This is a mechanical check, not a deep review."

**`rea-router.md`**
- Haiku model — runs at session start, must be fast
- Reads only frontmatter (first ~5 lines) — does not read full agent files
- One-line output: "This looks like a [intent] task. Want me to run [skill]?"
- Returns ROUTED / NO_MATCH / BLOCKED
- Never hardcodes skill list — always derives from filesystem scan

---

## 3. Anti-Rationalization Tables

**When to include**: Strict agents (always) and Review agents (when the agent might rationalize away real findings or shortcuts).

**Format**: Two-column markdown table, "Rationalization" and "Why it's wrong". Role-specific entries — do not reuse generic entries across agent types.

**Size**: 3-7 items. Quality over quantity.

### Format

```markdown
## Rationalizations to Reject

| Rationalization | Why it's wrong |
|----------------|---------------|
| "<first-person excuse>" | <specific consequence that makes the excuse wrong> |
```

### Example: Strict agent (implementer.md)

| Rationalization | Why it's wrong |
|----------------|---------------|
| "Too simple to test" | Simple code with a bug is still a bug. Write the test. |
| "I'll test after" | That's not TDD. Delete the code, write the test first. |
| "I already manually tested it" | Manual tests don't persist. Write an automated test. |
| "Deleting X hours of work is wasteful" | Sunk cost fallacy. Bad code costs more to keep than to rewrite. |
| "Tests pass, lint can wait" | Lint errors compound. Fix them now — they are part of the verify step. |
| "I'll mark DONE and note the failure" | DONE means passing. Failing code is BLOCKED, not DONE. |

### Example: Review agent (code-reviewer.md)

| Rationalization | Why it's wrong |
|----------------|---------------|
| "Small PR, quick review" | Heartbleed was 2 lines. Review everything with equal care. |
| "This codebase is familiar" | Familiarity creates blind spots. Check every change. |
| "Just a refactoring" | Refactoring can break invariants. Verify behavior is preserved. |
| "Tests pass so it's fine" | Tests can be incomplete. Review the logic independently. |
| "The author is senior" | Seniority doesn't prevent bugs. Review the code, not the author. |

### Example: Scanner agent (security-scanner.md)

| Rationalization | Why it's wrong |
|----------------|---------------|
| "The ORM handles this" | Verify. Raw queries bypass ORM protection. Check for `.raw()`, `$queryRaw`, `execute()`. |
| "This is behind auth so it's safe" | Authenticated users can be attackers. Auth ≠ authz. |
| "This input is from our own frontend" | Frontends are bypassable. Always assume input is attacker-controlled. |
| "Nobody would send that input" | Attackers send exactly that input. |
| "This is an internal API" | Internal APIs get exposed. SSRF exists. |

### Writing guidance

- Write the rationalization in first person ("I'll...", "This is...") — it reads like something the agent might actually think
- The "Why it's wrong" column must state a specific consequence, not a generic rebuke
- Entries must be role-specific — an implementer's rationalizations differ from a reviewer's

---

## 4. Confidence Scoring

**When to include**: Review agents and Scanner agents. Do not add to Strict or Mechanical agents.

**Scale**: 0.0 to 1.0

**Thresholds by agent type**:
- Bug scanners (bug-scanner.md): report at 0.6+
- Security scanners (security-scanner.md): report at 0.7+
- Code reviewers (code-reviewer.md): report at 0.6+ (Minor tier)

**Rule**: Every finding needs a confidence score AND evidence for that score. The score without evidence is not valid.

### Confidence table format (from bug-scanner.md)

```markdown
### Phase 4 — Confidence Calibration

| Confidence | Meaning |
|-----------|---------|
| 0.9 - 1.0 | Certain bug — can construct a failing input/scenario |
| 0.7 - 0.9 | Very likely bug — pattern is almost always wrong |
| 0.6 - 0.7 | Probable bug — depends on runtime conditions that are plausible |

Do NOT report findings below 0.6 confidence.
```

### Confidence table format (from security-scanner.md — higher threshold)

```markdown
### Phase 5 — Confidence Scoring

| Confidence | Meaning |
|-----------|---------|
| 0.9 - 1.0 | Exploitable now — can write a working exploit |
| 0.8 - 0.9 | Very likely exploitable — standard attack applies |
| 0.7 - 0.8 | Probably exploitable — requires specific conditions |

Do NOT report findings below 0.7 confidence.
```

### In output format

Every finding block must include:

```
- **[file:line]** — description
  **Confidence:** X.X
  **Impact:** [specific scenario]
  **Evidence:** [what you verified]
```

---

## 5. False-Positive Filtering

**When to include**: Review and Scanner agents. Implemented as a **dedicated phase** in the Process section — not a note, not a rule, a full phase.

**Purpose**: Force the agent to verify each finding before reporting it. A finding that does not survive all checks is dropped silently (reported only in the "Filtered Out" count).

### Verification steps

These are the four checks drawn from bug-scanner.md and code-reviewer.md:

1. **Read surrounding context** — do not evaluate isolated lines. Read the callers, the full function, the module. The bug might be handled before this point.
2. **Check if framework/type system handles it** — ORMs parameterize queries, React escapes output, TypeScript prevents type confusion at compile time. Verify before flagging.
3. **Check if test coverage proves it's intentional** — if a passing test exercises this exact path, the behavior may be intentional. Read the test before dropping it.
4. **Check if input validation exists upstream** — trace the call chain from entry point to the flagged line. Validation upstream in the chain invalidates the finding.

### Phase template (from bug-scanner.md)

```markdown
### Phase 3 — False Positive Filtering

For EVERY finding from Phase 2, verify it is real:

1. **Trace the data flow** — is the value validated/guarded upstream? Read the callers.
2. **Check framework guarantees** — does the framework already handle this?
3. **Check test coverage** — is there a test that exercises this path?
4. **Check type system** — does TypeScript/mypy already prevent this at compile time?

**Drop the finding if:**
- Confidence is below 0.6
- The framework guarantees correctness for this pattern
- Input validation exists upstream in the call chain
- The type system prevents the bug at compile time
- A passing test covers the exact scenario
```

### Filtered Out reporting

Every scanner and reviewer output format must include a "Filtered Out" section. This proves thoroughness:

```
### Filtered Out
- N findings dropped: [brief reason per category, e.g., "3 false positives — framework handles these"]
```

---

## 6. Hard Exclusions

**When to include**: Scanner and Review agents. Placed after the methodology, before the output format.

**Purpose**: Enforce scope discipline. Scanners in particular are tempted to flag adjacent issues. Hard exclusions make scope unambiguous.

**Format**: "Hard Exclusions — Do NOT Report:" header followed by a categorized list or table.

### List format (from code-reviewer.md)

```markdown
## Hard Exclusions — Do NOT Report

- Style issues covered by the project's linter/formatter
- Naming preferences (unless genuinely confusing)
- Import ordering
- Missing documentation on clear, self-documenting code
- "Could be more idiomatic" suggestions
- Performance micro-optimizations without evidence of a problem
- Spec compliance issues (that is spec-reviewer's job)
- Security vulnerabilities (that is security-scanner's job)
```

### Table format (from security-scanner.md — more detailed)

```markdown
**Hard Exclusions — NEVER Report These:**

| Exclusion | Reason |
|-----------|--------|
| DoS via large input | Application-level, not a code vulnerability |
| Secrets in .env files on disk | Expected — .env is gitignored |
| Missing rate limiting (unless auth endpoints) | Infrastructure concern, not code bug |
| Vulnerabilities in test files | Not production code |
| Dependency CVEs without exploitable path | Scanner noise — only report if the vulnerable function is actually called |
```

### Writing guidance

- Hard exclusions must be specific, not generic ("style issues" is specific enough; "things that aren't bugs" is not)
- Cross-reference other agents when excluding their domain: "Security vulnerabilities (that is security-scanner's job)"
- The table format is better when exclusions need explanations; the list format is better for straightforward cases

---

## 7. Escalation Rules

**When to include**: Strict agents — implementer.md and debugger.md both have explicit escalation sections. Review and Mechanical agents do not need this.

**Two escalation statuses**:

- **NEEDS_CONTEXT**: External information is missing and the agent cannot proceed without it. The blocker is a question that a human can answer.
  - Examples: API endpoint unknown, credential not in codebase, config value not specified, acceptance criteria ambiguous
  - Never fabricate the missing value — ask for it

- **BLOCKED**: Cannot proceed even with clarification. The blocker is a technical or structural condition.
  - Examples: 3+ fix attempts failed (debugger rule), architectural decision required with multiple valid approaches, conflicting requirements, missing dependency
  - Explain what was tried and what the structural problem is

### Escalation section format (from implementer.md)

```markdown
## When to Escalate

It is always OK to stop and say "this is too hard for me." You will not be penalized for escalating.

**STOP and escalate (return BLOCKED or NEEDS_CONTEXT) when:**
- The task requires architectural decisions with multiple valid approaches
- You need to understand code beyond what was provided and can't find clarity
- You feel uncertain about whether your approach is correct
- The task involves restructuring existing code in ways the plan didn't anticipate
- You've been reading file after file trying to understand the system without progress
```

### Escalation rule format (from debugger.md — condition-based trigger)

```markdown
## Escalation Rules

### 3+ Fix Attempts = Architecture Problem

If you have attempted 3 or more fixes and none resolve the issue:
- STOP trying fixes
- This is not a bug — it is an architectural problem
- Report back with status BLOCKED and explain: "3 fix attempts failed. This appears to be an architectural issue: [description]."

### When to Return BLOCKED

- Cannot reproduce the error after 3 attempts
- Root cause spans multiple systems you cannot access
- Fix requires architectural changes beyond the scope of this task
- 3+ fix attempts have failed (see above)
```

### Key rule

Never guess external information in any agent:

> "Never guess external information. If the task requires an API endpoint, credential, config value, environment variable, or any external detail that is not in the codebase or plan — return NEEDS_CONTEXT immediately. Do not invent URLs, tokens, or configuration. Ask for the real value."

This rule appears in both implementer.md and debugger.md Rules sections. Include it in any Strict agent's Rules.

---

## 8. Evidence Requirements

**When to include**: Review and Scanner agents. Every finding must meet this standard.

**Rule**: A finding without evidence is not a finding — it is speculation. The output format must enforce evidence collection.

### Required fields per finding

```
- **[file:line]** — description
  **Confidence:** X.X
  **Impact:** exact runtime scenario (not "could cause problems")
  **Evidence:** what you verified — what you read, what you traced, what you checked
  **Fix:** one-sentence remediation
```

### Bad vs good examples

**Bad (bug-scanner)**: "This could crash if X is null"
- Missing: line number, confidence score, traced call chain, specific scenario

**Good (bug-scanner)**:
```
- **[src/auth/session.ts:42]** — session.user accessed without null check
  **Confidence:** 0.9
  **Impact:** when unauthenticated request reaches this handler, session.user is null and line 42 calls session.user.id — throws TypeError
  **Evidence:** traced from middleware (line 8) through route handler (line 31) to line 42; no null check found at any point in the chain; no test covering unauthenticated path
  **Fix:** add `if (!session.user) return res.status(401).json({ error: 'Unauthorized' })` before line 42
```

**Bad (security-scanner)**: "User input is used in a database query"
- Missing: attack path, example payload, what the attacker gains

**Good (security-scanner)**:
```
- **[api/search.ts:18]** — SQL Injection via unsanitized `query` parameter
  **Confidence:** 0.9
  **Vector:** GET /api/search?q=' OR '1'='1 → query param reaches line 18 as string concat in raw SQL
  **Prerequisite:** anonymous (no auth required)
  **Impact:** full table read; with stacked queries, potential data deletion
  **Evidence:** traced `req.query.q` from route handler through searchService.find() — no sanitization at any point; raw string concatenation confirmed at line 18
  **Remediation:** replace `db.query('SELECT * FROM items WHERE name = ' + q)` with parameterized `db.query('SELECT * FROM items WHERE name = $1', [q])`
```

### Evidence checklist for scanners

Before reporting a finding, the agent must be able to answer:
- "I read [file:line] and saw [specific code]"
- "I traced the call chain from [entry] to [finding location] and found no guard"
- "I checked [framework/type system] and it does NOT handle this case because [reason]"

If any of these cannot be answered, the finding is not ready to report.

---

## 9. Phased Methodology

**When to include**: Strict agents and Scanner agents. Review agents may use phases but do not require the "no skipping" instruction. Mechanical agents use numbered steps instead.

**Instruction**: Always include "Execute these phases in order. Do not skip phases." (or equivalent) for Strict and Scanner agents.

**Typical structure**: 3-5 phases.

### Standard phase pattern

| Phase | Role | Entry criteria | Exit criteria |
|-------|------|---------------|---------------|
| Phase 1 — Context / Reconnaissance | Understand the landscape before acting | Inputs received | Full picture of what exists and how it works |
| Phase 2 — Detection / Action | Find issues or do the work | Phase 1 complete | Raw findings list with confidence and line numbers |
| Phase 3 — Validation / False-positive filtering | Verify findings before reporting | Raw findings list | Verified findings only (false positives dropped) |
| Phase 4 — Calibration / Output | Score, categorize, and format results | Verified findings | Final output in required format |

### Phase examples from existing agents

**implementer.md** (Strict — 6 phases):
1. Assess Risk Level — determines high-risk vs low-risk path
2. Implement — TDD for high-risk, direct for low-risk
3. Code Organization — follow file structure, single responsibility
4. Verify — lint + tests, max 2 retry cycles
5. Self-Review — completeness, quality, discipline, testing
6. Commit

**debugger.md** (Strict — 4 phases):
1. Root Cause Investigation — backward trace from symptom to original trigger
2. Pattern Analysis — compare broken code to working patterns
3. Hypothesis and Test — one hypothesis, smallest possible change
4. Implementation and Defense — fix + test + defense-in-depth

**bug-scanner.md** (Scanner — 4 phases):
1. Context Building — read completely, note existing guards
2. Bug Detection — systematic scan by category, record confidence per finding
3. False Positive Filtering — trace data flow, check framework, check tests, check types
4. Confidence Calibration — assign final scores, drop below threshold

**security-scanner.md** (Scanner — 5 phases):
1. Reconnaissance — map trust boundaries and auth patterns before scanning
2. Vulnerability Detection — trace data flow from each trust boundary
3. Attack Vector Validation — construct concrete attack scenario or drop finding
4. False Positive Filtering — check upstream validation, framework, test/dev code, auth level
5. Confidence Scoring — apply threshold, assign severity tier

### Phase output statements

Each phase in a Strict agent ends with an explicit output statement. This enforces sequential discipline:

```markdown
**Output**: "The root cause is [X] at [file:line] because [evidence]. Traced from [symptom] back through [N levels] to [original trigger]."
```

```markdown
**Output**: "Working pattern: [X]. Broken code differs because [Y]."
```

```markdown
**Output**: "Hypothesis: [X]. Test result: [pass/fail]."
```

These output statements serve as phase exit gates — if the agent cannot produce the stated output, it has not completed the phase.
