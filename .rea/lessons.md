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
