# Todo

## Phase 1 — Agents

- [x] Create `rea/templates/.claude/agents/implementer.md`
      1. Frontmatter: name, description, tools (Read/Write/Edit/Glob/Grep/Bash), model: sonnet
      2. Description: "Use when you need to implement a todo item from a plan. Receives item text and plan context."
      3. Body: high-risk item → TDD (RED must fail before GREEN), low-risk → direct implement, commit per cycle, return DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT

- [x] Create `rea/templates/.claude/agents/spec-reviewer.md`
      1. Frontmatter: name, description, tools (Read/Glob/Grep/Bash), model: sonnet
      2. Description: "Use after implementation to verify the work matches the original requirement."
      3. Body: read requirement → check diff → PASS or FAIL with specific gap description and fix instructions

- [x] Create `rea/templates/.claude/agents/code-reviewer.md`
      1. Frontmatter: name, description, tools (Read/Glob/Grep/Bash), model: sonnet
      2. Description: "Use after implementation to assess code quality."
      3. Body: check single-responsibility, testability, file size, DRY → output Critical/Important/Minor list

- [x] Create `rea/templates/.claude/agents/debugger.md`
      1. Frontmatter: name, description, tools (Read/Glob/Grep/Bash), model: sonnet
      2. Description: "Use when debugging. Enforces root cause investigation before any fix."
      3. Body: 4 mandatory phases (root cause → pattern analysis → hypothesis test → implement), no fix without root cause

## Phase 2 — Commands

- [x] Create `rea/templates/.claude/commands/rea-brainstorm.md`
      1. Step 0: explore codebase (explorer agent)
      2. Step 1: clarifying questions one at a time (3-5 rounds)
      3. Step 2: present 2-3 alternatives with trade-offs
      4. Step 3: write spec (scope in/out, constraints)
      5. Step 4: show spec, wait for explicit approval
      6. Step 5: "Approved. Run /rea-plan." — NEVER proceed to planning or coding without approval

- [x] Create `rea/templates/.claude/commands/rea-execute.md`
      1. Step 0: scan .rea/plans/*/todo.md for NEXT: marker — if none, stop
      2. Step 1: read plan.md for context
      3. Step 2: for each NEXT: item, run triple loop:
         a. implementer agent → DONE/BLOCKED/NEEDS_CONTEXT
         b. spec-reviewer agent → PASS/FAIL (max 3 fix cycles)
         c. code-reviewer agent → Critical/Important/Minor (fix Critical+Important)
      4. Step 3: mark item [x], move NEXT: to next item
      5. Step 4: when all done, "Run /rea-commit"

- [x] Create `rea/templates/.claude/commands/rea-worktree.md`
      1. Step 1: ask branch name (suggest feature/<task-name>)
      2. Step 2: verify .gitignore has worktrees/ — add if missing
      3. Step 3: git worktree add ../worktrees/<branch> -b <branch>
      4. Step 4: run stack setup in worktree dir
      5. Step 5: run test suite, report baseline
      6. Step 6: report worktree path and baseline status

## Phase 3 — Updates to existing files

- [x] Update `rea/templates/.claude/commands/rea-plan.md` — TDD format for high-risk items
      In "Todo item detail level by risk" section:
      Add to high-risk format: RED/GREEN/REFACTOR steps, "must watch test FAIL before coding"
      Low-risk format unchanged.

- [x] Update `rea/templates/.claude/commands/rea-init.md` — Verification iron rule
      In the Workflow Behavior verbatim block (greenfield CLAUDE.md template):
      Add: **Verification Iron Rule** — NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.

- [x] Update `rea/CLAUDE.md` — File structure section
      Add agents and new commands to the file structure diagram.

## Phase 4 — Packaging

- [x] Verify `pyproject.toml` package-data globs cover new agent files
      Check: "templates/**/.claude/agents/*" is present — already there ✓

- [x] Run `pytest` — verify all tests pass (2/2 passed ✓)
- [x] Run `rea init .` — verify new files are copied correctly
      Check: 5 agents in .claude/agents/ ✓
      Check: 7 commands in .claude/commands/ ✓
- [x] Bump version to 0.4.0 in pyproject.toml ✓
