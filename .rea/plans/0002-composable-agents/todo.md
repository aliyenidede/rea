# Todo

## Phase 1 — New Agents

- [x] Create `rea/templates/.claude/agents/plan-reviewer.md`
      1. Frontmatter: name, description, tools (Read/Glob/Grep), model: sonnet
      2. Input section: plan.md path + todo.md path (or raw idea for standalone)
      3. Process: build claim checklist → verify each claim → find gaps → formulate decisions with options
      4. Return: PASS | REVISE (gaps + inconsistencies + decisions needed with A/B options)
      5. Rules: be specific, always present options for decision gaps, never approve a plan with unresolved decisions
      Test: agent prompt is self-contained, readable without command context

- [x] Create `rea/templates/.claude/agents/dispatcher.md`
      1. Frontmatter: name, description, tools (Read/Glob/Grep), model: sonnet
      2. Input section: todo.md path + plan.md path
      3. Process: extract file paths per item → grep for unknown items → build dependency graph → group items
      4. Grouping rules: same file = same group (sequential), different files = parallel, unknown = safe-sequential
      5. Return: ordered groups with file annotations and execution order
      Test: agent prompt is self-contained, readable without command context

- [x] Create `rea/templates/.claude/agents/skill-writer.md`
      1. Frontmatter: name, description, tools (Read/Write/Edit/Glob/Grep), model: sonnet
      2. Input section: skill type (agent/command) + description of what it should do
      3. Process: read 2-3 existing files as reference → extract conventions → generate file → write to disk
      4. Return: file path + summary
      5. Rules: match existing format exactly, include all standard sections
      Test: agent prompt is self-contained, readable without command context

- [x] Create `rea/templates/.claude/agents/rea-router.md`
      1. Frontmatter: name, description, tools (Read/Glob), model: haiku
      2. Process: scan .claude/commands/ and .claude/agents/ → build routing table → match user intent
      3. Intent matching: planning→rea-plan, coding→rea-execute, bug→debugger, design→rea-brainstorm, commit→rea-commit, health→rea-verify, new skill→rea-write-skill, explore→explorer, review plan→plan-reviewer
      4. Output: "This looks like a [X] task. Want me to run [skill]?"
      5. Rules: dynamic discovery (no hardcoded list), suggest don't force, if no match proceed normally
      Test: agent prompt is self-contained, readable without command context

## Phase 2 — New Command

- [x] Create `rea/templates/.claude/commands/rea-write-skill.md`
      1. Step 1: ask agent or command?
      2. Step 2: ask what it should do
      3. Step 3: call skill-writer agent
      4. Step 4: show generated file for review
      5. Step 5: confirm write, remind about `rea init .` for REA project
      Test: command is self-contained, follows existing command format (Step-based, Rules section)

## Phase 3 — Updates to Existing Commands

- [x] Update `rea/templates/.claude/commands/rea-plan.md` — add Step 8 adversarial review (renumbered 8→9, 9→10, 10→11, 11→12)
      After Step 7 (Write plan files), before Step 8 (Update CLAUDE.md):
      1. Call plan-reviewer agent with plan.md and todo.md paths
      2. If PASS → proceed
      3. If REVISE → show gaps + decisions to user, revise, re-run (max 2 cycles)
      4. Renumber subsequent steps (8→9, 9→10, 10→11, 11→12)

- [x] Update `rea/templates/.claude/commands/rea-execute.md` — dispatcher + parallel + skill suggestion
      1. Add Step 1.5: call dispatcher agent, receive groups
      2. Update Step 2: execute groups — parallel between groups, sequential within
      3. Add Step 3.5: pattern detection, suggest /rea-write-skill if patterns found
      4. Update Rules: remove "One item at a time" rule, add dispatcher-based parallel rules

- [x] Update `rea/templates/.claude/commands/rea-init.md` — SessionStart hook
      In Step 4 (Install missing files), add subsection:
      ### SessionStart hook
      If settings.json has no SessionStart hook, add one that cats rea-router.md
      Merge with existing hooks, do not overwrite PostToolUse

- [x] Update `rea/templates/.claude/commands/rea-verify.md` — new file checks
      Add checks for: plan-reviewer.md, dispatcher.md, skill-writer.md, rea-router.md, rea-write-skill.md
      Add check for: SessionStart hook in settings.json

## Phase 4 — Packaging

- [x] Update `CLAUDE.md` file structure diagram + composable agents architecture rule
      Add new agents (plan-reviewer, dispatcher, skill-writer, rea-router) and command (rea-write-skill)

- [x] Bump version to 0.5.0 in `pyproject.toml` and `rea/__init__.py`

- [x] Run `pytest` — 2/2 passed ✓

- [x] Run `rea init .` — 5 new files copied, 12 updated
      Check: 9 agents in .claude/agents/ ✓
      Check: 8 commands in .claude/commands/ ✓
