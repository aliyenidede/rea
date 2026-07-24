# Plan: REA v0.5.0 — Composable Agent Architecture

REA'nın mevcut sequential execution modelini composable agent mimarisine dönüştürmek. 4 yeni agent, 1 yeni komut, 4 mevcut komut güncellemesi, 1 hook template.

---

## Phase 1 — New Agents

### 1.1 — `plan-reviewer` agent

**File:** `rea/templates/.claude/agents/plan-reviewer.md`

**Frontmatter:**
- name: plan-reviewer
- description: "Use to review a plan for gaps, inconsistencies, and missing decisions. Challenges the plan adversarially and surfaces choices that need human judgment."
- tools: Read, Glob, Grep
- model: sonnet

**Behavior:**
1. Read plan.md and todo.md
2. Build a checklist of claims the plan makes (files to create, behaviors to implement, constraints to respect)
3. For each claim, verify:
   - Is there a matching todo item?
   - Does the approach make sense given the codebase? (grep/glob to verify assumptions)
   - Are edge cases addressed?
4. Identify "decision gaps" — places where the plan assumes a choice but doesn't justify it
5. For each gap, formulate options with trade-offs
6. Return status:
   - **PASS** — plan is solid, no gaps found
   - **REVISE** — with list of:
     - **Gaps**: what's missing
     - **Inconsistencies**: contradictions within the plan
     - **Decisions needed**: options A/B with trade-offs for user to pick

**Standalone usage:** User can call directly with any plan path or even a raw idea to get adversarial feedback.

### 1.2 — `dispatcher` agent

**File:** `rea/templates/.claude/agents/dispatcher.md`

**Frontmatter:**
- name: dispatcher
- description: "Use to analyze todo items and create parallel execution groups. Identifies file dependencies and groups non-conflicting items for parallel dispatch."
- tools: Read, Glob, Grep
- model: sonnet

**Behavior:**
1. Read todo.md — get all `- [ ]` items
2. Read plan.md — extract file paths mentioned for each item
3. For items without explicit file paths, grep codebase to infer which files would be touched
4. Build dependency graph: item → set of files it touches
5. Group items:
   - Items touching the same file(s) → same group (sequential within group)
   - Items touching completely different files → different groups (parallel between groups)
   - Items with unknown file impact → "safe-sequential" group (never parallelized)
6. Return groups:
   ```
   GROUP-1 (parallel): [item 1, item 4] — touches: src/auth/
   GROUP-2 (parallel): [item 2, item 5] — touches: src/billing/
   GROUP-3 (sequential): [item 3] — unknown scope, safe-sequential
   Execution order: GROUP-1 || GROUP-2 → GROUP-3
   ```

**Standalone usage:** User can call with any todo.md to get a parallel execution plan without actually executing.

### 1.3 — `skill-writer` agent

**File:** `rea/templates/.claude/agents/skill-writer.md`

**Frontmatter:**
- name: skill-writer
- description: "Use to create new agent or command files. Reads existing patterns and produces files that match REA conventions (frontmatter, sections, rules)."
- tools: Read, Write, Edit, Glob, Grep
- model: sonnet

**Behavior:**
1. Determine type: agent or command?
2. Read 2-3 existing files of that type as reference patterns:
   - Agents: read `.claude/agents/implementer.md`, `.claude/agents/explorer.md`
   - Commands: read `.claude/commands/rea-plan.md`, `.claude/commands/rea-execute.md`
3. Extract conventions:
   - Agents: frontmatter format (name, description, tools, model), Input/Process/Return Status/Rules sections
   - Commands: Step-based structure, Rules section at bottom
4. Ask user (or receive from caller):
   - What should this skill do?
   - What tools does it need?
   - What model? (haiku for read-only, sonnet for write)
5. Generate the file following extracted conventions
6. Write to `.claude/agents/<name>.md` or `.claude/commands/<name>.md`
7. Return: file path + summary of what was created

**Standalone usage:** User calls directly to create a new project-specific agent or command.

### 1.4 — `rea-router` meta-prompt

**File:** `rea/templates/.claude/agents/rea-router.md`

**Frontmatter:**
- name: rea-router
- description: "SessionStart meta-prompt. Scans available commands and agents, matches user intent to the right skill automatically."
- tools: Read, Glob
- model: haiku

**Behavior:**
1. On session start, scan:
   - `.claude/commands/*.md` — read name and first line (description)
   - `.claude/agents/*.md` — read frontmatter (name, description)
2. Build a routing table: skill name → what it does
3. For any user message, match intent:
   - Planning intent → suggest `/rea-plan`
   - Implementation/coding intent → suggest `/rea-execute`
   - Bug/error → suggest `debugger` agent
   - Design/brainstorm → suggest `/rea-brainstorm`
   - Commit/PR → suggest `/rea-commit`
   - Health check → suggest `/rea-verify`
   - "Create a new agent/command" → suggest `/rea-write-skill`
   - Codebase question → suggest `explorer` agent
   - Plan review → suggest `plan-reviewer` agent
4. Present suggestion: "This looks like a [X] task. Want me to run [skill]?"
5. If no match, proceed normally without suggestion

**Key:** List is dynamic — new skills added by `skill-writer` are automatically discovered on next session.

---

## Phase 2 — New Command

### 2.1 — `/rea-write-skill` command

**File:** `rea/templates/.claude/commands/rea-write-skill.md`

**Steps:**
1. Ask user: agent or command?
2. Ask: what should it do? (brief description)
3. Call `skill-writer` agent with the description + type
4. Show generated file to user for review
5. If approved, confirm file was written
6. Remind user: "Run `rea init .` to sync templates if this is in the REA project itself"

---

## Phase 3 — Updates to Existing Commands

### 3.1 — Update `rea-plan.md`

Add between current Step 7 (Write plan files) and Step 8 (Update CLAUDE.md):

**New Step 7.5 — Adversarial Review:**
1. Call `plan-reviewer` agent with the just-written plan.md and todo.md
2. If PASS → proceed to Step 8
3. If REVISE:
   - Show gaps and inconsistencies to user
   - For each "decision needed": present options, ask user to choose
   - Revise plan.md and todo.md based on feedback
   - Re-run plan-reviewer (max 2 cycles)
   - If still REVISE after 2 cycles → show remaining issues, ask user: "Proceed anyway or keep revising?"

### 3.2 — Update `rea-execute.md`

**Replace Step 2 with dispatcher-aware execution:**

New Step 1.5 — Dispatch Planning:
1. Call `dispatcher` agent with todo.md and plan.md
2. Receive parallel groups
3. Show groups to user (informational, no approval needed)

Update Step 2 — Execute items:
- For each group: launch implementer agents in parallel (multiple Agent tool calls in one message)
- Within a group: items run sequentially
- Between groups: items run in parallel
- Each item still goes through the full triple loop (implementer → spec-reviewer → code-reviewer)

Add Step 3.5 — Pattern Detection (after all items done):
1. Ask: "Did you notice any recurring patterns during this execution that would benefit from a dedicated agent or command?"
2. If yes: suggest running `/rea-write-skill`
3. If no: skip

**Update Rules section:**
- Remove: "One item at a time. Do not parallelize items (parallel execution is a future iteration)."
- Add: "Use dispatcher agent for parallel grouping. Items in the same group run sequentially. Groups run in parallel."

### 3.3 — Update `rea-init.md`

**Add to Step 4 (Install missing files):**

New subsection: `### SessionStart hook`
If `.claude/settings.json` exists but has no `SessionStart` hook:
- Add to settings.json:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "cat .claude/agents/rea-router.md"
          }
        ]
      }
    ]
  }
}
```
Merge with existing hooks — do not overwrite PostToolUse.

### 3.4 — Update `rea-verify.md`

**Add new checks:**
- `.claude/agents/plan-reviewer.md` exists?
- `.claude/agents/dispatcher.md` exists?
- `.claude/agents/skill-writer.md` exists?
- `.claude/agents/rea-router.md` exists?
- `.claude/commands/rea-write-skill.md` exists?
- `.claude/settings.json` has `SessionStart` hook?

---

## Phase 4 — Packaging

### 4.1 — Verify pyproject.toml

Check that `templates/**/.claude/agents/*` glob covers new agent files (already present from v0.4.0).

### 4.2 — Update CLAUDE.md

Add new agents and command to file structure diagram.

### 4.3 — Bump version

`pyproject.toml` and `rea/__init__.py`: 0.4.0 → 0.5.0

### 4.4 — Run tests and verify

- `pytest` — all tests pass
- `rea init .` — new files copied correctly
- Verify: 9 agents in `.claude/agents/`, 8 commands in `.claude/commands/`

---

## Architecture Decisions

1. **Agent'lar birbirini çağırmaz** — sadece komutlar orkestrasyon yapar. Bu, circular dependency'leri önler ve her agent'ı bağımsız test edilebilir kılar.

2. **`rea-router` dinamik tarar** — hardcoded skill listesi yerine `.claude/commands/` ve `.claude/agents/` dizinlerini okur. `skill-writer` yeni skill eklediğinde router otomatik fark eder.

3. **`dispatcher` dosya bazlı gruplama yapar** — aynı dosyaya dokunan item'lar aynı gruba girer (sıralı), farklı dosyalar paralel. Belirsiz item'lar "safe-sequential" olarak işlenir.

4. **`plan-reviewer` karar-odaklı** — sadece "eksik var" demek yerine, karar gerektiren noktalarda seçenek sunar. Bu, planın olgunlaşma sürecini hızlandırır.

5. **SessionStart hook inline** — ayrı shell script yerine settings.json'da direkt command olarak tanımlanır. `rea init` yapılmış projelerde otomatik aktif.
