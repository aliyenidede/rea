# Todo

## Phase 1 — rea-init hardening

- [x] Update `rea/templates/.claude/commands/rea-init.md` — add Step 4.5 additionalDirectories guard
      1. After Step 4, add new section: "Step 4.5 — Check global settings for skill leakage"
      2. Read ~/.claude/settings.json, extract additionalDirectories
      3. Check if any entry points to/inside current project directory
      4. If match: warn user with exact paths, explain skill leakage risk, suggest removal
      Test: read the file back, verify new step is between Step 4 and Step 5

- [x] Update `rea/templates/.claude/commands/rea-init.md` — change enforce_admins to true
      1. In Step 6, change `"enforce_admins": false` to `"enforce_admins": true`
      2. Add a comment explaining: "Prevents admin bypass of branch protection"
      Test: grep for enforce_admins, confirm value is true

## Phase 2 — rea-commit release flow

- [x] Update `rea/templates/.claude/commands/rea-commit.md` — add branch safety checks
      1. In Step 0, after branch detection, add safety logic:
         - If `main`: STOP with message, do not proceed
         - If `staging` with changes: ask if conflict resolution, proceed normal flow (Steps 2-6), then print reminder
         - If `staging` without changes: exit Step 0 directly to Step 7 (skip Steps 2-6), create release PR to main
         - If `feature/*` or `hotfix/*`: proceed normally
      2. Add release PR format for staging → main (title: `release(vX.Y.Z): summary`, body via `$(git log staging --oneline --not main)`)
      3. Add post-PR reminder in Step 8 for feature → staging PRs and conflict resolution commits
      Test: read file back, verify main/staging handling, verify Steps 2-6 bypass for staging release path

## Phase 3 — Skill-writer modernization

- [x] Rewrite `rea/templates/.claude/agents/skill-writer.md` — core process with modern patterns
      1. Keep 6-step process, update Step 2 (add complexity type classification)
      2. Update Step 4: type-aware agent template (Strict/Review/Exploratory/Mechanical)
      3. Fix model selection: Haiku=simple read-only, Sonnet=complex reasoning
      4. Add tool selection matrix
      5. Add Architecture Rule #6
      6. Update return status guidance per type
      7. Update command template (add frontmatter, substeps)
      8. Move Agent Complexity Guide + Quality Principles to patterns reference
      9. Keep core under ~90 lines
      10. Update Step 1: after reading reference files, also read `.claude/skill-writer-patterns.md` (root, not agents/) and select relevant patterns based on complexity type
      11. Step 2: if skill type is command, skip complexity classification entirely
      11. Rewrite Step 6 (Verify) as mandatory post-generation check:
          - Check generated file against patterns for its complexity type
          - Fix missing patterns (rationalization table, confidence scoring, etc.)
          - Report all decisions made: type choice, patterns included/omitted, reasoning
          - Non-skippable: cannot return DONE without verification + decision report
      Test: line count < 100, all new patterns referenced, Step 1 reads patterns file, Step 6 is mandatory

- [x] Create `rea/templates/.claude/skill-writer-patterns.md` — patterns reference (in .claude/ root, NOT agents/)
      1. Type-Aware Agent Templates: full template per complexity type (Strict/Review/Exploratory/Mechanical)
      2. Agent Catalog: canonical examples per type
      3. Anti-Rationalization Tables pattern
      4. Confidence Scoring pattern
      5. False-Positive Filtering pattern
      6. Hard Exclusions pattern
      7. Escalation Rules pattern
      8. Evidence Requirements pattern
      9. Phased Methodology pattern
      Test: file exists, all 9 sections present, lives in .claude/ root not agents/

- [x] Update `rea/templates/.claude/commands/rea-write-skill.md` — add complexity type step
      1. Add Step 1.5: ask agent complexity type (Strict/Review/Exploratory/Mechanical)
      2. Update Step 3: pass type + complexity + description to skill-writer agent
      Test: read file back, verify Step 1.5 exists

## Phase 4 — Packaging

- [x] Bump version to 0.7.0 + CLI fix
      1. `pyproject.toml`: version "0.6.6" → "0.7.0"
      2. `rea/cli.py`: add .claude/ root file copying (~5 lines) — copy any files directly in templates/.claude/ to target/.claude/
      Note: `rea/__init__.py` uses importlib.metadata — no edit needed
      Test: run `rea init /tmp/test` and verify skill-writer-patterns.md is copied to .claude/ root

- [x] Update CLAUDE.md file structure diagram
      1. Add `skill-writer-patterns.md` under `.claude/` root (reference file, not agent)
      2. Add `rea-router.md` to agents listing (pre-existing gap)
      3. Update agent/file counts to match reality
      4. No version reference exists in CLAUDE.md — no-op per spec audit

- [x] Run tests + lint
      1. pytest — all pass
      2. ruff check . — clean
      3. ruff format . — clean

- [x] Run `rea init .` and verify sync
      1. Verify all templates copied
      2. Check agent count: 12 files (unchanged — patterns file is NOT in agents/)
      3. Check .claude/ root for skill-writer-patterns.md
      4. Check command count: 10 files (unchanged)
