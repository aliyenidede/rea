# Todo

- [x] Rewrite `rea/templates/.claude/commands/rea-wrap.md` Step 3 — user-correction detection block
      1. Preserve Steps 1, 2, 4, 5, 6, 7 byte-identical to current disk version
      2. Update Step 3 opener from "Scan the entire conversation for lessons." to "Scan the visible conversation for lessons." — keep "Look for BOTH categories with equal priority:" and the dual-category framing
      3. Replace the five-bullet "User corrections and redirections" list with a numbered paragraph covering:
         - Enumerate user messages; skip tool_result, system wrappers (`<task-notification>`, `<command-message>`, `<ide_...>`), empty messages
         - Per-message judgment: did the user push back, correct, redirect, reject, or disagree with what I just did?
         - Behavior-change gate: only log if I actually changed approach/output/plan after the message; skepticism without behavior change is not a lesson
         - Gate-unverifiable case: if the pushback turn is visible but the confirming follow-up turns are outside current context, log as provisional with inline `(behavior-change unverifiable — context truncated)` note
         - When logging: verbatim user quote in original language (no translation), one-line context of what assistant had just done, what changed afterwards (or provisional marker if unverifiable)
         - Long-session coverage note: if early turns are out of context, report scanned range in Step 7
      4. Keep "Internal mistakes and surprises" block unchanged (byte-identical)
      5. Keep output format block unchanged (byte-identical):
         `## YYYY-MM-DD HH:MM:SS / **Source:** user-correction | internal-mistake | discovery / **Lesson:** / **Rule:**`
      6. Keep architectural-escalation rule unchanged
      7. Keep "If no lessons, skip." trailing line
      **Structural invariants to verify after edit:**
      - Steps 1, 2, 4, 5, 6, 7 bytes match disk pre-change version (diff only inside Step 3)
      - Step 3 opener says "visible conversation" not "entire conversation"
      - No bullet list under the "User corrections and redirections" heading; replaced with numbered paragraph
      - Step 3 contains an explicit "Behavior-change gate" instruction (phrased however, but present as an explicit gate, not a hint)
      - Step 3 contains the provisional-entry instruction with the exact string `(behavior-change unverifiable — context truncated)` as the inline note format
      - Output format block (the fenced triple-backtick block with `**Source:**`) is byte-identical to disk pre-change version
      - Non-English verbatim instruction present
      - Long-session coverage disclosure instruction present

- [x] Align `rea/templates/.claude/commands/rea-init.md` Self-Improvement Loop lesson template with rea-wrap schema
      1. Locate the Self-Improvement Loop section (currently around lines 125–130)
      2. Replace the embedded lesson template block:
         ```
         ## YYYY-MM-DD
         **Mistake:** what went wrong
         **Rule:** what to do instead
         ```
         with:
         ```
         ## YYYY-MM-DD HH:MM:SS
         **Source:** user-correction
         **Lesson:** what was learned
         **Rule:** what to do in the future
         ```
      3. No other rea-init.md lines modified (net file size grows by 1 line; all non-template content is byte-identical before and after the replaced block)
      **Invariants to verify:**
      - The 3-line lesson template is replaced with the 4-line unified schema
      - The surrounding "Self-Improvement Loop —" sentence and the trailing "If the lesson is architectural …" sentence are untouched
      - All Steps 1–7 and non-template content of rea-init.md are untouched

- [x] Bump `pyproject.toml` version to `0.7.1`
      1. Change line 7 from `version = "0.7.0"` to `version = "0.7.1"`
      2. No other edits in the file
      **Invariant:** `grep '^version' pyproject.toml` returns exactly `version = "0.7.1"` (single line).

- [x] Sync templates to project-local `.claude/` directory
      1. Run `rea setup .` from the repo root
      2. Verify `.claude/commands/rea-wrap.md` contains the new Step 3 (semantic, behavior-change gate)
      3. Verify `.claude/commands/rea-init.md` Self-Improvement Loop template matches the new unified schema
      **Invariant:** `diff rea/templates/.claude/commands/rea-wrap.md .claude/commands/rea-wrap.md` returns no differences; same for rea-init.md
