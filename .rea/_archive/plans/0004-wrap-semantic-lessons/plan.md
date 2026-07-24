# Plan: wrap-semantic-lessons

## Brief

`/rea-wrap` Step 3's user-correction detection is keyword-based today. Replace the keyword list with a per-message semantic judgment instruction, with a behavior-change evidence requirement to avoid false positives. Align `/rea-init`'s Self-Improvement Loop template lesson format with `/rea-wrap`'s schema so `.rea/lessons.md` entries share one format. Bump patch version.

## Files

### 1. `rea/templates/.claude/commands/rea-wrap.md`

Modify Step 3 ("Save lessons") only. Steps 1, 2, 4, 5, 6, 7 untouched.

**Current Step 3 structure:**
```
Scan the entire conversation for lessons. Look for BOTH categories with equal priority:

**User corrections and redirections:**
- User said "no", "don't", "that's wrong", "not like that", or similar
- User rejected a tool call or approach
- User redirected you to a different path ("do X instead", "use Y")
- User repeated an instruction you missed or ignored
- User expressed frustration or had to re-explain something

**Internal mistakes and surprises:**
- Approaches that failed or had to be abandoned
- Unexpected behaviors, gotchas, or edge cases discovered
- Assumptions that turned out to be wrong

For each lesson found, append to `.rea/lessons.md`:

```
## YYYY-MM-DD HH:MM:SS
**Source:** user-correction | internal-mistake | discovery
**Lesson:** what was learned
**Rule:** what to do in the future
```

If a lesson is architectural (affects how code is structured or deployed), add it directly to the relevant section in `CLAUDE.md` instead.

If no lessons, skip.
```

**New Step 3 structure:**

Keep overall three-part shape: (a) user-correction detection (semantic, behavior-change gated), (b) internal-mistakes detection (unchanged), (c) output format + architectural-escalation rule (unchanged).

Rewrite block (a) only — replace the five keyword bullets with a numbered paragraph that instructs:

1. Enumerate every user message in the session, in conversation order. Skip:
   - `tool_result` blocks
   - System wrappers: `<task-notification>`, `<command-message>`, `<ide_opened_file>` and similar
   - Empty / whitespace-only messages
2. For each remaining message, make a per-message judgment:
   *"Did the user push back, correct, redirect, reject, or disagree with what I just did?"*
3. **Behavior-change gate (must pass to log):** *"Did I actually change my approach, output, or plan after this message?"* If no concrete change happened, do not log — skepticism without behavior change is not a lesson. This gate applies uniformly to direct refusals, short pushbacks, ironic tone, and questions that imply disagreement.
4. **Gate-unverifiable case (partial context):** if the pushback turn is visible but the assistant's subsequent turn(s) needed to verify the gate are outside the current context, log the entry as provisional with an inline note `(behavior-change unverifiable — context truncated)` in the Lesson line. This preserves the user's original complaint (missing corrections in long sessions) while marking unconfirmed entries so future agents treat them cautiously.
5. When (2) is yes AND ((3) is yes OR (4) applies), record:
   - Verbatim user quote in its original language (do not translate; preserve harsh / profane / ironic wording as-is)
   - One-line context: what the assistant had just done (tool call, decision, answer)
   - The correction: what the user changed or demanded, and what the assistant did differently afterwards (or the provisional marker if (4) applies)
6. **Context-coverage note:** if the session is long and early turns are no longer accessible in the current context, explicitly state in Step 7 report which portion of the session was scanned (e.g. "Lessons captured from turns 80–200; earlier turns not in context").

Block (b) internal-mistakes and block (c) output-format/escalation stay exactly as on disk.

### 2. `rea/templates/.claude/commands/rea-init.md`

Align the Self-Improvement Loop template (lines 125–130) with the rea-wrap schema. Replace:

```
**Self-Improvement Loop** — After any correction from the user, append the lesson to `.rea/lessons.md`:
```
## YYYY-MM-DD
**Mistake:** what went wrong
**Rule:** what to do instead
```
```

with:

```
**Self-Improvement Loop** — After any correction from the user, append the lesson to `.rea/lessons.md`:
```
## YYYY-MM-DD HH:MM:SS
**Source:** user-correction
**Lesson:** what was learned
**Rule:** what to do in the future
```
```

All other lines of rea-init.md untouched.

### 3. `pyproject.toml`

- Line 7: `version = "0.7.0"` → `version = "0.7.1"`
- No other edits.

## Decisions table

| # | Decision | Choice | Rejected | Rationale |
|---|---|---|---|---|
| 1 | Correction detection method | Per-message semantic judgment | (a) Keyword list — misses personal style, sarcasm, non-English; (b) Regex — brittle | Zero maintenance; adapts to style |
| 2 | False-positive control | Behavior-change evidence gate — only log if assistant actually changed course | Log all surface-form pushback regardless | Prevents phantom lessons that degrade future sessions |
| 3 | Source taxonomy | Keep (`user-correction`, `internal-mistake`, `discovery`) | Collapse | Filtering value retained |
| 4 | Output format | Identical to current wrap format | New structured format | Backward compatibility with existing lessons.md |
| 5 | Internal-mistakes block | Unchanged | Apply same semantic rewrite | Self-identification, no keyword-list flaw |
| 6 | Version bump | Patch `0.7.0 → 0.7.1` | Minor `0.8.0` | CLAUDE.md rule 5: template fix = patch |
| 7 | Non-English handling | Explicit verbatim-in-original-language instruction | Implicit | Prevents agent from helpfully translating Turkish quotes |
| 8 | rea-init schema alignment | Include in this patch (Option B from reviewer) | Declare out of scope | Backward-compat claim requires it; 4-line change, zero extra risk |
| 9 | Long-session coverage | Require Step 7 coverage-disclosure when early turns unreachable | Silent incomplete scan | The original complaint is about silent miss; surfacing it is the minimum fix |
| 10 | Gate-unverifiable case | Log provisional with `(behavior-change unverifiable — context truncated)` inline note | (a) Skip — loses real corrections; (b) Log as confirmed — reintroduces false positives | Preserves bug-fix intent (don't miss corrections) while marking uncertainty for downstream consumers |
| 11 | Opener phrasing | "Scan the visible conversation" | "Scan the entire conversation" (misleading under truncation) | Aligns opener with the gate's actual reach |

## Rollback procedure

If semantic detection produces worse lessons than the keyword version in practice:

1. `pip install rea-dev==0.7.0` on the developer machine
2. In each affected project: `rea setup .` — this re-syncs templates from the installed (now 0.7.0) package, restoring the keyword-based Step 3 in `.claude/commands/rea-wrap.md`
3. No lessons.md migration needed — both formats are preserved as-written; future wraps simply revert to keyword detection

The `rea setup` command is idempotent and always overwrites templates from the package, so downgrade propagation is a single command per project.

## Algorithm (Step 3 execution at wrap time)

1. Enumerate user messages in order; filter out tool_result, system wrappers, empty messages.
2. For each remaining message: judge per (2) above.
3. Apply behavior-change gate per (3). Skip if no concrete change.
4. If both passed, write a `user-correction` lesson entry with verbatim quote, context, and what changed.
5. Separately, reflect on assistant's own mistakes/surprises (block b, unchanged) → `internal-mistake` / `discovery` lessons.
6. If any lesson is architectural → append to CLAUDE.md instead of lessons.md.
7. If any part of the session is outside the current context, note scanned-range in the Step 7 final report.
8. If zero lessons survive all gates, skip.

## Non-goals

- Lessons deduplication
- Lesson ranking / priority scoring
- Auto-pruning of old lessons
- Migrating pre-existing `.rea/lessons.md` entries (old formats stay as written; new entries follow unified schema)
- Changes to how `.rea/lessons.md` is consumed by rea-plan / rea-execute
