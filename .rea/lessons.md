# Lessons

## 2026-03-15
**Mistake:** pyproject.toml package-data noktalı klasörleri (.claude, .github) kapsamıyordu, `rea init` template'leri kopyalayamıyordu.
**Rule:** Yeni template klasörü eklenince `pyproject.toml` `package-data` glob'larını kontrol et — noktalı klasörler (`.*`) wildcard'a dahil edilmez, explicit yazılması gerekir.

## 2026-03-17 08:24:10
**Lesson:** LLM self-review is unreliable — model rubber-stamps its own output when asked abstract questions like "is this correct?"
**Rule:** Use separate agents or mechanical checklists for verification. Never rely on the same model reviewing its own output in the same context.

## 2026-03-17 08:24:10
**Lesson:** Prompt length inversely correlates with compliance per instruction ("curse of instructions").
**Rule:** Keep agent prompts under 100 lines. If longer, split into core prompt + reference files.

## 2026-03-17 08:24:10
**Lesson:** CLAUDE.md absence does not mean greenfield project.
**Rule:** Detect code files before classifying as greenfield. Code exists → undocumented → auto-generate CLAUDE.md.

## 2026-03-17 08:24:10
**Lesson:** Writing agent prompts from scratch produces mediocre results compared to adapting industry patterns.
**Rule:** Before writing any new agent, research existing open-source prompts for that domain (Trail of Bits, obra/superpowers, Anthropic).

## 2026-03-18 06:04:29
**Lesson:** Session log analysis (21 sessions across mailwave + mailwave-leads) revealed that plan-validator was not checking planned file paths against the actual project filesystem — it only checked internal plan consistency. This caused files to be placed in wrong directories.
**Rule:** Plan-validator must glob the real project structure before checking file placement. Never rely solely on CLAUDE.md descriptions.

## 2026-03-18 06:04:29
**Lesson:** Agents (implementer, debugger) were guessing external information (API endpoints, credentials, config values) instead of asking the user, causing cascading errors (e.g., 5 failed Coolify API calls).
**Rule:** All action-taking agents must return NEEDS_CONTEXT/BLOCKED when external information is missing. Never fabricate URLs, tokens, or config values.

## 2026-03-21 02:55:00
**Lesson:** rea-plan Step 4 "Surface decisions" had "if no decisions: skip this check" — model used this as permission to skip the entire checkpoint, making architectural decisions silently.
**Rule:** Mandatory checkpoints must never have a skip condition. Always show output to the user, even if it's "No decisions needed — proceeding."

## 2026-03-21 02:55:00
**Lesson:** rea-router (SessionStart hook) only ran at session start. When user said "commit yap" mid-session, Claude didn't invoke /rea-commit. The router solved the wrong problem.
**Rule:** Don't build agents for problems the platform should handle. Mid-session intent routing is Claude Code's responsibility, not a custom agent's.

## 2026-03-25 14:00:00
**Lesson:** Implementer agent's Step 4 (Verify) was not enforced — "run the relevant test suite" was too vague and optional-sounding. Implementer could return DONE with failing tests, and the CI gate in rea-execute would catch it, causing an unnecessary round-trip.
**Rule:** Verification must be mandatory and explicit with retry caps. "Run lint + tests, fix failures, max 2 retries, BLOCKED if still failing" — not "run the relevant test suite."

## 2026-03-25 14:00:00
**Lesson:** Harness research showed the single highest-leverage reliability improvement is replacing LLM steps with deterministic code (O'Reilly blackjack study: +31pp from one lookup table). But for REA's co-pilot mode, this complexity isn't justified — the user is watching.
**Rule:** Match reliability investment to the execution mode. Unattended agents need deterministic rails. Co-pilot agents benefit more from better prompts and validation gates than from Python pipeline code.

## 2026-03-28 15:00:00
**Lesson:** Lifeline project analysis showed that each agent benefits from a role-specific "Rationalizations to Reject" table — a short list of common lazy shortcuts that look reasonable but break the agent's primary job. This pattern is more effective than generic rules because it targets the exact failure modes of that role.
**Rule:** Every review/verification agent (plan-reviewer, spec-reviewer, code-reviewer, debugger) should have a Rationalizations to Reject table with 5-7 role-specific items. Generic rules say what to do; rationalization tables say what NOT to tell yourself to avoid doing it.

## 2026-03-28 15:00:00
**Lesson:** Pre-mortem (assume failure, find causes) is more effective than asking "what could go wrong?" because it forces past-tense thinking. Research: prospective hindsight improves failure cause identification by ~30%.
**Rule:** Add a mandatory pre-mortem step to any review phase before rendering a PASS verdict. Format: identify 3 most likely failure causes + probability (low/medium/high) + whether mitigated. Unmitigated high-probability failure = REVISE regardless of reviewer output.
