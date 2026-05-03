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

## 2026-03-28 21:45:00
**Lesson:** Applied REA's full plan/execute/review pipeline to a 2-file personal tool (pulse). The pipeline (dispatcher, implementer, spec-reviewer, code-reviewer) is designed for multi-file features with real complexity — using it on simple tools adds friction without adding value.
**Rule:** Before starting REA pipeline, check: is this ≤3 files, no architecture decisions, clear scope? If yes, build it directly in conversation. REA pipeline is for real complexity, not for ceremony.

## 2026-03-28 21:45:00
**Lesson:** Committed .rea/ and .claude/ scaffold files into the pulse repo by running rea-init on it. These directories belong to REA-managed projects, not to simple personal tools.
**Rule:** Never run rea setup on personal/single-purpose tools. rea setup is for projects that will be developed iteratively with the full REA workflow.

## 2026-03-30 02:25:47
**Source:** user-correction
**Lesson:** Global additionalDirectories in ~/.claude/settings.json caused REA skills to leak across all projects. caw/.claude was added as additionalDirectory, making all REA commands visible in non-REA projects like aliyenidede.
**Rule:** Never add project-specific .claude/ paths to global additionalDirectories. Each project's .claude/ is auto-loaded by Claude Code when that project is open. additionalDirectories is only for truly global resources.

## 2026-03-30 02:25:47
**Source:** user-correction
**Lesson:** User asked to investigate before dismissing — I initially said "no project needs changes, just remove from global" without deeply verifying why entries were added. User pushed back with "emin misin?" and was right to do so.
**Rule:** When user questions your conclusion, re-investigate with fresh eyes. Don't defend the first answer — verify it. The "Emin misin?" rule applies to self as much as to external claims.

## 2026-03-30 02:25:47
**Source:** user-correction
**Lesson:** Attempted to run `twine upload` when user only asked for the pip install command. User said "ben sana upload et demedim" — I overstepped by assuming the next step.
**Rule:** Only do what is explicitly asked. Don't auto-escalate from "give me the command" to "run the command." Especially for irreversible operations like PyPI uploads.

## 2026-03-30 02:25:47
**Source:** discovery
**Lesson:** `rea init` and `/rea-init` naming collision confused users — they're two different things (CLI file copy vs Claude Code project setup). Renamed CLI command to `rea setup` to eliminate confusion.
**Rule:** CLI commands and slash commands must have distinct names. If both need "init"-like behavior, differentiate clearly (setup vs init, install vs configure).

## 2026-03-30 02:25:47
**Source:** user-correction
**Lesson:** CLI output showed only command names with no explanation of what REA is, how it works, or what to do first. User said "nasıl kullanılacağını yönlendiren birşey yok." Added onboarding guide with "What is REA?", setup steps, and daily workflow.
**Rule:** First-run output must answer three questions: what is this, how do I start, what's the daily workflow. Don't assume the user read the README.

## 2026-04-25 08:15:30
**Source:** user-correction
**Lesson:** When user said "tüm sessionlarımı okuyup reayı kullanımımda neler olmuş" I scoped to the rea project directory only. User had to clarify: "kısmen yanlış anladın sanırım. rea projesinde değil benim tüm projelerimde." After: I expanded the glob from `~/.claude/projects/d--work-v0-6-readevb-rea/` to `~/.claude/projects/*/` and indexed all 15 project folders.
**Rule:** "Tüm sessionlarım" = all `~/.claude/projects/*` folders, not just the current project's session folder. Default to global scope when the user uses words like "tüm", "bütün", "hepsi" without a qualifier.

## 2026-04-25 08:15:30
**Source:** user-correction
**Lesson:** I proposed delegating session-reading to subagents. User pushed back hard: "sen okuyacaksın mesajımdan varsayım yapamazsın. SEN OKUYACAKSIN HİÇ BİR ŞEYİ ATLAMAYACAKSIN." I rebuilt approach: I personally read every extract file, no subagent delegation for content scanning.
**Rule:** When user explicitly says "sen okuyacaksın" or names me as the actor, sub-agent delegation for that work is forbidden. Sub-agents are for parallel work the user *didn't* assign personally.

## 2026-04-25 08:15:30
**Source:** user-correction
**Lesson:** I started writing extraction notes to `memory/` files for persistence. User: "memory kullanmanı da istemiyorum projeyi kirletme lütfen sadece söylediğim şeyi yap çok daha kolay olacak git ve herşeyi oku." After: stopped writing memory files mid-task; only used `/tmp/` for ephemeral extraction artifacts.
**Rule:** Default to `/tmp/` (or `%TEMP%`) for working files during analysis tasks. Reserve memory writes for facts the user explicitly asks to persist, or for end-of-session memory updates during /rea-wrap.

## 2026-04-25 08:15:30
**Source:** user-correction
**Lesson:** My first extraction script captured user messages + assistant text + tool calls but excluded assistant thinking blocks. User: "tool cıktılarını görmen mantıksız olur ancak thinking kısmını okumanı istiyorum kendi düşüncelerini de görmelisin." Added thinking blocks to extraction; rebuilt all 109 extracts.
**Rule:** Conversation reconstruction for analysis must include assistant thinking blocks alongside text and tool calls. Thinking is the reasoning trail; without it, the conversation is missing context. Tool *outputs* can be omitted (noise), tool *calls* must be included (signal).

## 2026-04-25 08:15:30
**Source:** user-correction
**Lesson:** I delivered a REA usage report that allocated only 20-30% of friction to user-side patterns. User: "ben neyi yanlış yapıyorum. sadece toolu suçlayamayız bunu söyleyebilir misin." I rewrote the analysis with concrete user-pattern examples (session hygiene, 15 parallel projects, no success criteria, plan-skip tendency, frustration cycle, LLM-memory expectation, etc.) and revised the split to 60% user / 40% tool.
**Rule:** Diagnostic reports must apportion blame honestly. Default to balanced or user-leaning attribution unless evidence clearly points elsewhere. Tool-leaning attribution is a sycophancy tell — it spares the user from uncomfortable truths.

## 2026-04-25 08:15:30
**Source:** user-correction
**Lesson:** I proposed solving the wrap-correction-detection bug with a hardcoded keyword list. User: "kelimelerden seçerek yapsın tamam ama kelime listesi vermeyelim çok kişisel olur başka bir yolu var mı." Switched to per-message semantic judgment; let the agent itself decide if a message is a correction.
**Rule:** When detecting user-style signals (corrections, sentiment, intent), prefer semantic agent-judgment over hardcoded keyword/regex lists. Keyword lists encode the prompt-author's vocabulary, not the user's. Adapt to the user; don't force the user to adapt to a list.

## 2026-04-25 08:15:30
**Source:** internal-mistake
**Lesson:** First extraction attempt used `Read` directly on raw JSONL files. Single 30-line read returned 34000+ tokens (over 25000 limit). Tool results in JSONL include large embedded file contents and command outputs that bloat each line.
**Rule:** Never `Read` raw Claude Code session JSONL files directly — they are dense and exceed token limits even at low line counts. Always pre-process with a script that strips tool_result bodies and keeps only signal (user/assistant text + tool_use names + thinking).

## 2026-04-25 08:15:30
**Source:** discovery
**Lesson:** Stat across 109 sessions: `/rea-wrap` was used in only 17 of 109 sessions; `/rea-execute` 27, `/rea-commit` 15, `/rea-plan` 12. `/rea-brainstorm`, `/rea-worktree`, `/rea-write-skill` had **zero** invocations across 5 weeks of usage. Conversely, `subagent=implementer` ran 310 times, `subagent=Explore` 153 times (vs custom `subagent=explorer` only 38 times — 4× usage of generic over the REA-specific agent).
**Rule:** Periodically count actual command/agent usage across user's session corpus. Dead commands warrant either deletion or repositioning; over-used generic agents (Explore vs explorer) signal that the specialized version isn't discoverable or differentiated enough.

## 2026-04-25 08:15:30
**Source:** discovery
**Lesson:** Code-reviewer flagged a stale local `.claude/commands/rea-init.md` after template edit — the project-local synced copy stays out of date until `rea setup .` is run. Plan dispatcher correctly identified this dependency without explicit file overlap (template file write → local file consumed by `rea setup`), placed sync as separate Batch 2.
**Rule:** Any plan editing files under `rea/templates/.claude/` must include a final `rea setup .` todo to sync the project-local working copy. Dispatcher will infer the dependency, but the todo item must exist for it to dispatch on.

## 2026-04-30 02:37:37
**Source:** user-correction
**Lesson:** During an opencode-manager smoke test, the browser showed a "Next.js 16.2.4 Turbopack" CSP error. I attributed it to Archon's frontend without verification, even fabricating reasons (production-vs-dev mode, CSP misconfig). User: "götünden element uyduruyorsun gene amk 2 tane container aktif o yüzden olabilir mi bi bak bakim 2 archon var". Verified — Archon was on port 3001, the error came from a separate Next.js dev server (vosvos project) on port 3000. Apologized and gave correct URL.
**Rule:** When an in-browser error appears during multi-process testing, **verify the source process before interpreting**. Check `docker ps`, `netstat`, framework signature in error UI. Never explain an error from a tool whose process you haven't confirmed is the one serving the affected page.

## 2026-04-30 02:37:37
**Source:** user-correction
**Lesson:** While distilling principles for a new project, I kept asking "how does this surface in the UI / workflow steps?" instead of staying at principle level. User: "şuan hala prensip kümesinden konuşuyorum ui veya workflow konularına geçme lütfen". I refocused on principle-only formulation; UI/workflow application deferred to a later session.
**Rule:** During principle distillation, hold a strict line between "what is the principle?" and "how is it implemented?". When user is in principle-mode, my proposals must be principle-level reformulations only. Application questions belong in a later phase, not interleaved.

## 2026-04-30 02:37:37
**Source:** user-correction
**Lesson:** When project-naming and architecture pivoted from REA-style CLI to a workflow platform (readev), I kept framing every decision through REA's primitives (slash command, skill, execute). User: "hala rea mantığıyla düşünüyoruz... yaklaşımımızı değiştirelim mi sence". I dropped REA-specific vocabulary and switched to UX-first / scene-based framing.
**Rule:** When discussing a new product, audit my own vocabulary. If the current project's name keeps appearing as a metaphor for the new project, that's a paradigm-import warning. New product = new mental model = new vocabulary.

## 2026-04-30 02:37:37
**Source:** user-correction
**Lesson:** I generated a "go use Archon for 2-3 days" recommendation as the next step. User: "bunu kullan dedin de öğrenmem lazım sanki :D çok detaylı ve ihtiyacımızı karşılar bence sen benim isteklerimi tamamen karşılıyor mu ona bakar mısın". I produced a concrete 11-criterion needs-vs-Archon comparison table instead of deferring analysis to "use it and find out".
**Rule:** "Go use it for X days" is a stalling pattern when concrete analysis is possible right now. If the user has already supplied their needs and the tool's surface area is documented, do the comparison directly — don't defer analysis to user labor.

## 2026-04-30 02:37:37
**Source:** user-correction
**Lesson:** User asked "videodakiler hariç not almamız gereken bişi var mı" — I returned three items, all from the video. User: "bunlar videodakiler, ben video hariç olanı sormak istedim". I re-scanned the session-internal events (mobile UX failure, missing Claude binary in Docker, document still saying opencode-manager fork) and gave those.
**Rule:** When user explicitly excludes a source ("X hariç"), re-scan only the residual scope before answering. Don't pattern-match on adjacent topics — the exclusion is the constraint.

## 2026-04-30 02:37:37
**Source:** internal-mistake
**Lesson:** A research sub-agent reported "anomalyco/opencode-multiplexer" as the wrapper that solves multi-client server support. I relayed this to the user. Verification with `gh api` returned 404 — the repo doesn't exist at that URL. The actual repo is `millerjes37/opencode-multiplexer`. The agent had hallucinated the org name in its summary while listing the correct name in the inventory body.
**Rule:** Never relay sub-agent claims about specific repo URLs / star counts / commit dates without spot-verifying at least the most-trusted-sounding ones via `gh api`. Sub-agent narrative summaries can carry hallucinated identifiers even when the underlying inventory is correct.

## 2026-04-30 02:37:37
**Source:** internal-mistake
**Lesson:** Twice in one session, user said "ee?" / "alolo bi sorun var çok sürdü" — they thought a tool call was hanging. Reality: I had requested an interactive Bash command, the harness presented a permission prompt, user clicked "no" without realizing what they were rejecting, and I waited silently. The user perceived stalling.
**Rule:** When a long-running shell command is needed, prefer `run_in_background=true` from the outset. Tell the user "running in background, I'll get a completion notification" so silence reads as expected, not stalled. If a tool gets rejected, I must say so plainly — "permission was denied, here's the same command again, please approve" — instead of silently waiting.

## 2026-04-30 02:37:37
**Source:** discovery
**Lesson:** opencode-manager (525★) and OpenChamber (3,470★) both vibe-coded; Archon (19,800★) disciplined. The strong predictors of "vibe-coded" are not star count but: (a) largest single component file size — OpenChamber ChatInput.tsx 3,871 lines, opencode-manager PromptInput 1,272 lines, Archon NodeInspector 793 lines; (b) test/code ratio; (c) direct-URL navigation breaking in SPA (opencode-manager `/settings` returned 404 ErrorBoundary); (d) console error count on landing page.
**Rule:** When evaluating a candidate tool to fork or build on, run a discipline-metrics audit: clone, find largest component, count tests, test direct-URL nav, count console errors. These signals dominate star count for predicting whether the codebase will be pleasant to live in.

## 2026-04-30 02:37:37
**Source:** discovery
**Lesson:** README claims must be runtime-verified. Two surprises this session: (1) Archon README says "The Docker image ships Claude Code pre-installed" — actually does NOT in the default Dockerfile (separate `Dockerfile.user.example` does). (2) Predecessor research described OpenChamber's Cloudflare tunnel deployment as "primary" — actual `docker-compose.yml` shows tunnel env vars as commented-out optional.
**Rule:** When a README claim materially affects setup or evaluation, verify against the actual artifact (Dockerfile, compose file, code). Do not propagate README claims as facts in research synthesis without runtime check.

## 2026-05-04 01:13:22
**Source:** user-correction
**Lesson:** I asked the user to disambiguate between "code.readev.co = Archon" vs "code.readev.co = code-server" even though north-star.md already says `code.<domain>` is code-server and `agent.<domain>` is Archon. User: "isimleri koyduysak tekrar niye soruyon ki biri editör diğeri archon için idi". I dropped the disambiguation question and applied the existing convention directly.
**Rule:** Before asking a clarifying question, scan project documents for an existing decision. If north-star.md or a similar canonical document has already named the convention, do not re-litigate it — apply it. Asking again signals I haven't read my own documents.

## 2026-05-04 01:13:22
**Source:** user-correction
**Lesson:** The user said "yeni proje açıp REA ile planlayarak ilerlemeliyim demi". I almost said "yes". On reflection, I caught that readev's own architectural decision is to be built with Archon workflows (dogfood), not REA. Reframed the question to "Senaryo A/B/C", recommended deferring repo creation until Archon+Pi setup is verified.
**Rule:** When user proposes a next step that contradicts a recent architectural decision, do not rubber-stamp it. Re-read the relevant decision, surface the contradiction, ask which one stands. The user explicitly thanked me for catching this: "doğru diyosun ... unuttum ben onu işte". Their architectural memory is shorter than mine in long-running planning sessions — be the memory.

## 2026-05-04 01:13:22
**Source:** discovery
**Lesson:** Pi's "missing MCP" gap, which earlier looked like a meaningful disadvantage vs. OpenCode, turns out to be addressed by Pi's own extension ecosystem: 4 distribution mechanisms (Skills/Extensions/Prompt Templates/Themes), npm-distributed Pi Packages, a `pi-resource-center` browser package, and real production packages (`pi-docparser`, `pi-show-diffs`, `pi-yagami-search`, `pi-ask`, etc.). Production adoption ~14 projects (OpenClaw, BasedHardware/omi, Bitterbot-AI, rivet-dev/agent-os, etc.).
**Rule:** When evaluating a tool's capability gaps, do not stop at "feature X is missing". Always check (a) the tool's own extension story, (b) whether a third-party ecosystem fills the gap, (c) actual production packages. A feature gap with a healthy extension marketplace is not a real gap; a feature gap with no marketplace is. Star count is not a proxy for either.

## 2026-05-04 01:13:22
**Source:** discovery
**Lesson:** Pi (`badlogic/pi-mono`) is not a "model gateway" — it is a **standalone coding agent CLI** (Claude Code / OpenCode equivalent) with multi-provider abstraction integrated. The monorepo has 5 packages: `pi-ai` (LLM API), `pi-agent-core` (agent runtime + tool calling), `pi-coding-agent` (interactive CLI), `pi-tui` (terminal UI), `pi-web-ui` (web components). Tagline: "There are many agent harnesses, but this one is yours."
**Rule:** Before classifying a tool from its tagline or surface description, find its package list / monorepo structure. Pi looked like "just a multi-provider router" until I read the README's "Packages" table. Misclassifying a tool's category leads to bad evaluations and missed options.

## 2026-05-04 01:13:22
**Source:** internal-mistake
**Lesson:** Initial Pi research summary missed OpenRouter from the explicit "API keys" provider list. I only spotted OpenRouter on second read, in the "Custom providers & models" section ("OpenRouter, Vercel AI Gateway, ZAI") and via `~/.pi/agent/models.json` mechanism. Almost recommended Pi with a caveat that "OpenRouter not directly supported".
**Rule:** When a target capability (here: OpenRouter support) is absent from the headline list of a tool, scan the *full* readme — features often live in "Custom providers", "Extensions", "Advanced configuration" sections. Headline lists are curated for marketing brevity, not completeness.
