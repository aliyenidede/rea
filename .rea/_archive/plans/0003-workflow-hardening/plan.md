# Plan: Workflow Hardening + Skill-Writer Modernization

Release v0.7.0 — three improvements to REA templates: init hardening, commit release flow, skill-writer modernization.

## Phase 1 — rea-init hardening

**File:** `rea/templates/.claude/commands/rea-init.md`

### 1A: additionalDirectories guard (new Step 4.5)

After Step 4 (Install missing files), before Step 5 (Create staging branch):

1. Read global settings file at `~/.claude/settings.json`
2. Extract `permissions.additionalDirectories` array
3. Get the current project root path
4. **Normalize both paths before comparison:** convert backslashes to forward slashes, lowercase, strip trailing slash. Then prefix-check: is the project root a prefix of the entry, or equal to it? This catches both exact matches and "entry points inside project" cases.
5. If any match found: warn the user with the exact paths and explain that project-specific `.claude` paths in global settings cause skill leakage across projects
6. Suggest removal: show the exact command or manual edit needed

### 1B: enforce_admins in branch protection (Step 6 change)

In the existing Step 6 (branch protection JSON):
- Change `"enforce_admins": false` to `"enforce_admins": true`
- This prevents admin bypass of branch protection rules

No other changes to rea-init.

## Phase 2 — rea-commit release flow

**File:** `rea/templates/.claude/commands/rea-commit.md`

### 2A: Branch safety checks (update Step 0)

After detecting current branch, add safety logic:

1. If current branch is `main`:
   - STOP. Print: "You're on the main branch. Direct commits to main are not allowed. Create a feature/* or hotfix/* branch first."
   - Do not proceed.

2. If current branch is `staging`:
   - Run `git status` to check for uncommitted changes.
   - **If changes exist**: Ask "You have changes on staging. Is this a conflict resolution or merge cleanup?" If yes: proceed with normal commit + push flow (Steps 2-6). After Step 8 (report), print the same reminder as 2C: "When staging is tested and ready, run `/rea-commit` from staging to create a release PR to main."
   - **If no changes**: Ask "You're on staging. Do you want to create a release PR from staging to main?" If yes: the staging release path exits Step 0 directly to Step 7 — Steps 2-6 are skipped (the git status check in Step 0 is sufficient). Format as release PR with `--base main`. If no: stop.

3. If current branch is `feature/*` or `hotfix/*`: proceed as normal (existing behavior).

4. Any other branch: ask user for target (existing behavior).

### 2B: Release PR format (new substep in Step 7)

When creating a staging → main release PR:
- Title format: `release(vX.Y.Z): <summary>`
- Body: list all commits on staging since last main merge. Use inline command substitution: `gh pr create --body "$(git log staging --oneline --not main)"`. Bash environment is confirmed.
- Base: `main`

### 2C: Post-PR reminder (update Step 8)

After any feature → staging PR is created, append a reminder:
"When staging is tested and ready for production, run `/rea-commit` from the `staging` branch to create a release PR to main."

## Phase 3 — Skill-writer modernization

### Decision: Prompt splitting strategy

The current skill-writer is 161 lines. With modernization it would exceed 250 lines. Per lesson: split at ~100 lines.

**Strategy:** Keep `skill-writer.md` as core process (~90 lines). Create `skill-writer-patterns.md` as a patterns reference file that the skill-writer reads on demand based on agent type.

### 3A: Rewrite skill-writer.md (core)

**File:** `rea/templates/.claude/agents/skill-writer.md`

Keep the existing 6-step process but update:

1. **Step 2 (Extract conventions):** Add "identify agent complexity type" — classify the requested agent as Strict, Review, Exploratory, or Mechanical. **If skill type is command: skip complexity classification entirely.** Complexity typing is agent-only.

2. **Step 4 (Generate content):** For agents, reference the type-aware template from `skill-writer-patterns.md` (the full per-type breakdown lives there, not in the core file). One-line instruction: "Generate content for the identified complexity type — use the template and required elements from the patterns file." For commands, use the command template (defined in core).

3. **Update model selection rule:**
   - Haiku: simple read-only (routing, file listing)
   - Sonnet: complex reasoning (all reviewers, scanners, implementers, debuggers) — even if read-only

4. **Add tool selection matrix:**

   | Agent type | Read | Write | Edit | Glob | Grep | Bash |
   |-----------|------|-------|------|------|------|------|
   | Explorer/Router | Yes | | | Yes | Yes | |
   | Implementer | Yes | Yes | Yes | Yes | Yes | Yes |
   | Reviewer/Scanner | Yes | | | Yes | Yes | Yes (read-only ops) |
   | Debugger | Yes | | | Yes | Yes | Yes |
   | Mechanical | Yes | | | Yes | Yes | |

5. **Add Architecture Rule #6:** "Agents never call other agents directly. Only commands orchestrate agent calls. Every agent must work standalone."

6. **Update return status guidance:**
   - Base: DONE | BLOCKED
   - Implementer-type: + DONE_WITH_CONCERNS, NEEDS_CONTEXT
   - Review-type: PASS | FAIL (or PASS | REVISE)

7. **Move Agent Complexity Guide and Quality Principles** to the patterns reference file

8. **Update command template:** Add substep support (1a, 1b), Step 0 convention, frontmatter with name+description

9. **Mandatory post-generation verification (Step 6 rewrite):** After writing the file, skill-writer MUST:
   - Read `skill-writer-patterns.md` and check the generated file against the relevant patterns for its complexity type
   - Strict agent missing rationalization table? Fix it.
   - Review agent missing confidence scoring? Fix it.
   - Report all decisions made during generation: "Chose [type] because X", "Added [pattern] because Y", "Omitted [pattern] because Z"
   - This step is non-skippable — cannot return DONE without completing verification and reporting decisions

### 3B: Create skill-writer-patterns.md (new reference file)

**File:** `rea/templates/.claude/skill-writer-patterns.md`

Placed in `.claude/` root, NOT in `agents/` — this is a reference document, not an agent. Prevents accidental agent discovery by Claude Code. Contents:

1. **Type-Aware Agent Templates** — full template for each complexity type with required/optional elements:
   - All agents: frontmatter, one-sentence intro, Input, Process, Return Status, Rules
   - Strict: + phased methodology, escalation rules, rationalizations to reject table
   - Review: + confidence scoring, false-positive filtering, hard exclusions, evidence requirements
   - Exploratory: + structured output format, thoroughness levels
   - Mechanical: keep simple (clear algorithm, status returns)

2. **Agent Catalog** — canonical examples per type with file names and key features:
   - Strict: implementer.md, debugger.md
   - Review: code-reviewer.md, spec-reviewer.md, plan-reviewer.md
   - Scanner: bug-scanner.md, security-scanner.md
   - Exploratory: explorer.md
   - Mechanical: dispatcher.md, plan-validator.md, rea-router.md

3. **Anti-Rationalization Tables pattern** — format, when to include (Strict + Review agents), 3-5 items per table

4. **Confidence Scoring pattern** — 0.0-1.0 scale, thresholds (0.6+ for bugs, 0.7+ for security), evidence requirements

5. **False-Positive Filtering pattern** — phase structure (read context, check framework, check tests, check upstream validation)

6. **Hard Exclusions pattern** — format, when to include (Scanner + Review agents), example categories

7. **Escalation Rules pattern** — when to stop and escalate vs. when to proceed, NEEDS_CONTEXT vs BLOCKED

8. **Evidence Requirements pattern** — every finding needs: file+line, confidence, impact, evidence of verification

9. **Phased Methodology pattern** — typical 3-5 phase structure for strict/scanner agents

### 3C: Update rea-write-skill command

**File:** `rea/templates/.claude/commands/rea-write-skill.md`

Between Step 1 (type) and Step 2 (description), add:

**Step 1.5 — Agent complexity type (agents only):**
If the user chose "agent" in Step 1, ask:
"What type of agent is this?"
- **Strict** — must follow exact methodology (like debugger, implementer)
- **Review** — evaluates quality with confidence scoring (like code-reviewer, bug-scanner)
- **Exploratory** — open-ended research with structured output (like explorer)
- **Mechanical** — simple algorithm, fast (like dispatcher, router)

Pass the complexity type to the skill-writer agent along with type and description.

Update Step 3: pass all three inputs (type, complexity, description) to skill-writer agent.

### 3D: Update skill-writer process for patterns reference

In Step 1 (Locate reference files):
- After reading 2-3 reference files from the target directory
- Also read `.claude/skill-writer-patterns.md` (in `.claude/` root, not agents/)
- Select the relevant patterns section based on the agent complexity type

## Phase 4 — Packaging

### 4A: Version bump + CLI fix
- `pyproject.toml`: version `0.6.6` → `0.7.0`
- Note: `rea/__init__.py` reads version from `importlib.metadata` — no edit needed there.
- `rea/cli.py`: Add `.claude/` root file copying. Currently only `commands/` and `agents/` subdirs are copied. Add a loop that copies any files directly in `rea/templates/.claude/` (not subdirs) to `target/.claude/`. This enables `skill-writer-patterns.md` (and future reference files) to be synced by `rea init`. Change is ~5 lines, still purely mechanical file copying — compliant with Rule #1 "CLI is dumb."

### 4D: Update CLAUDE.md
- Add `skill-writer-patterns.md` to the file structure diagram under `.claude/` root (it's a reference file, not an agent)
- Add `rea-router.md` to the agents listing (currently missing — pre-existing gap)
- Update agent count to match actual file count
- Note: spec.md mentions "update version reference if present" — CLAUDE.md has no version string, this is a no-op

### 4B: Tests
- Run `pytest` — verify existing tests pass
- Run `ruff check .` and `ruff format .`

### 4C: Sync and verify
- Run `rea init .` to sync templates
- Verify file counts match expectations

## Decisions Table

| # | Decision | Choice | Alternatives Rejected | Rationale |
|---|----------|--------|-----------------------|-----------|
| 1 | Skill-writer splitting | Core (~90 lines) + patterns reference file (type templates + all patterns) | (A) Single file >250 lines, (B) Multiple files per pattern | Lesson: split at 100 lines. Type-aware templates move to patterns file to keep core under limit. |
| 2 | Version bump | 0.7.0 (minor) | 0.6.7 (patch) | Multiple features (init guard, commit flow, skill-writer rewrite). CLAUDE.md says minor for new features. |
| 3 | Branch safety | Main: hard stop. Staging: guided flow (conflict resolution → commit + reminder, no changes → release PR) | (A) Hard stop on both, (B) Warning only | Main forbidden per Rule #4. Staging needs flexibility but still guides toward proper flow. Post-conflict reminder, not auto PR creation. |
| 4 | Command frontmatter | Add name+description to command template | Keep commands without frontmatter | Current commands already use frontmatter. Skill-writer template was outdated. |
| 5 | Patterns file location | `.claude/skill-writer-patterns.md` (root, not agents/) | `.claude/agents/` | File is NOT an agent — placing in agents/ risks accidental discovery/invocation. |
| 6 | Path comparison algorithm | Prefix-check with normalization (forward slashes, lowercase, trim) | Exact string match | Windows uses backslashes, settings.json mixed. Prefix catches "inside project" cases. |
| 7 | Staging release path | Exits Step 0 directly to Step 7, skipping Steps 2-6 | Run full flow | No changes to commit, Steps 2-6 would halt at "nothing to commit." Explicit bypass. |
| 8 | Commands + complexity type | Commands skip complexity classification | Extend taxonomy to commands | Complexity is agent-pattern-specific. Commands don't need Strict/Review/etc typing. |
