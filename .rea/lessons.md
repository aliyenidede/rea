# Lessons

> **Phase-5 distillation (2026-07-24):** the durable, cross-tool-useful facts in this log were
> distilled into the typed graph — see `knowledge/` (`installer-testing-and-tooling`,
> `authoring-install-templates`, `cross-tool-portability-model`, `rea-repo-layout`,
> `plan-as-knowledge-capsule`) and `decisions/0004-rea-cli-runtime-and-auth`. **Most lessons below
> deliberately stayed here** — per REA's own memory-write filter (`AGENTS.md`), behavioural reflexes,
> already-shipped methodology, one-off operational mistakes, and readev-project-context facts do **not**
> belong in `knowledge/`. This file remains the raw chronological capture log; the graph holds only what
> a *different tool* opening this repo would need.

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

## 2026-07-01 13:13:00
**Source:** user-correction
**Lesson:** In my project recap I listed OpenCode as a "secondary runtime" in the same table as the settled Pi decision, giving a deferred/optional roadmap note equal visual weight to a committed decision. User pushed back: "İkincil runtime diye bişi yok sadece pi kullanmıyor muyuz? ben mi yanlış hatırlıyorum." — their mental model (just Pi) was more accurate than my recap. I then reframed OpenCode as an optional deferred note, and the user later locked Pi-only.
**Rule:** When recapping project state, structurally separate committed/active decisions from deferred/optional/"maybe later" notes. Never present a deferred item in the same table or with the same weight as a settled decision — it inflates its apparent status and misrepresents the plan.

## 2026-07-01 13:13:00
**Source:** user-correction
**Lesson:** After a ~2-month gap I presented the readev stack from stale memory as if current, without flagging staleness or verifying. User had to prompt: "Archonun son durumu kontrol edilmeli, çok zaman geçti." Live verification then found major drift: Pi renamed (`badlogic/pi-mono`→`earendil-works/pi`, `@mariozechner/*`→`@earendil-works/*`), OpenCode PR merged, Archon at v0.5.0, default branch changed to `dev`.
**Rule:** When resuming a project after a significant time gap (weeks+), proactively flag that cached state may be stale AND verify fast-moving external dependencies (repo versions, PR/issue states, package names, default branches) BEFORE presenting them as current fact — don't wait to be told. The memory system-reminders already warn about this ("point-in-time observations, not live state").

## 2026-07-01 13:13:00
**Source:** internal-mistake
**Lesson:** My first status briefing asserted "default port 3000 → 3090" as the new default. Byte-verification against `docker-compose.yml` + `Caddyfile.example` refuted it: the actual default is **3000**; the `.env.example` `# Default: 3090` comment is misleading (it's a commented-out override). I had propagated a first-pass research-agent claim — itself derived from that misleading in-repo comment — as fact.
**Rule:** Separate first-pass research claims (which may rest on search snippets or misleading in-repo comments) from byte-verified facts. Before asserting a config value (port, env default) as fact, confirm against the authoritative file (docker-compose / Caddyfile), not a code comment — comments can lie. When a later verification pass contradicts an earlier claim, correct it explicitly to the user.

## 2026-07-01 13:13:00
**Source:** internal-mistake
**Lesson:** Memory/docs carried stale PR/issue provenance: claimed Pi was "merged into Archon (#965)" and OpenCode was "deferred pending #1372/#1384." Verification showed #965 was a closed proposal *issue* (not the implementing PR), and #1384 had already merged. Both provenance claims were carried forward incorrectly from prior sessions.
**Rule:** Treat PR/issue numbers stored in memory/docs as unverified pointers, not facts. Re-check their real state (open/closed/merged, issue vs PR) before repeating them as provenance in new docs. Prefer a verifiable source (e.g. the actual provider source dir) over a bare PR number when documenting how a feature landed.

## 2026-07-03 22:03:39
**Source:** user-correction
**Lesson:** User strongly rejected the AskUserQuestion tool after I used it to present an auth-method choice: "AskUserQuestion bi daha kullanılmasın git en global memorye not al ben nefret ediyorum o tooldan her projede anlatmaktan yoruldum." Changed: added a permanent rule to global CLAUDE.md and never used it again — plain-text numbered options instead.
**Rule:** NEVER use AskUserQuestion (global, all projects). Ask via plain-text numbered options + a clear recommendation. See global CLAUDE.md "Tool Preferences".

## 2026-07-03 22:03:39
**Source:** user-correction
**Lesson:** After I asked two low-stakes confirm questions (Sonnet 5 vs 4.6 — newer AND cheaper = obvious; qwen-plus vs qwen3-coder — trivial, UI-changeable), user pushed back: "niye böyle bir ek soru sordun ki". Changed: stopped asking, proceeded with sensible defaults and stated the pick.
**Rule:** Don't ask to confirm low-stakes, reversible choices with an obvious default — pick it, state it in one line, proceed. Reserve questions for genuine, non-obvious, hard-to-reverse forks. (See memory `feedback_dont_over_ask`.)

## 2026-07-03 22:03:39
**Source:** discovery
**Lesson:** Docker `env_file` changes do NOT take effect on `docker compose restart` OR plain `docker compose up -d` (container kept old env — GH_TOKEN stayed empty, verified). Only `docker compose up -d --force-recreate <svc>` reloads env vars. (Runtime FILES mounted in — config.yaml, models.json — DO update on a plain restart.)
**Rule:** After editing `.env`/env_file: `docker compose up -d --force-recreate <svc>`, then verify the var is actually in the container (`docker compose exec svc sh -c 'env | grep -c VAR'`). Don't assume restart loaded it.

## 2026-07-03 22:03:39
**Source:** internal-mistake
**Lesson:** Writing a file into a container via `docker compose exec -T app sh -c 'cat > file' <<'EOF'` INSIDE an outer `ssh 'bash -s' <<'REMOTE'` heredoc FAILS SILENTLY — `docker exec -T` grabs stdin and competes with the outer heredoc, nothing gets written, no error. Only caught by `cat`-ing the file back.
**Rule:** Write files into a container via `docker compose cp <hostfile> svc:/path` or the volume mountpoint (`docker volume inspect <vol> -f '{{.Mountpoint}}'`) + chown. Avoid nested heredoc + `docker exec -T`. Always read the file back to confirm the write landed.

## 2026-07-03 22:03:39
**Source:** internal-mistake
**Lesson:** A syntactically VALID JSON config can be silently rejected as a whole. Pi's `models.json` with a partial `cost` object (only input/output, missing cacheRead/cacheWrite) made the ENTIRE custom provider fail to load — `json.tool` said valid, no error logged, models just didn't appear. ~5 rounds to isolate by removing fields.
**Rule:** JSON-valid ≠ accepted. When a config "loads" but has no effect, bisect fields against the tool's real schema and verify the OBSERVED effect (does the thing actually appear/work?), not just that the file parses.

## 2026-07-03 22:03:39
**Source:** discovery
**Lesson:** The AI agent overclaims capabilities it lacks. Archon/Pi's agent told the user "Evet, web araştırması yapabilirim" but base Pi has NO web-search tool — only bash+curl a given URL. LLMs assert tool capabilities from training priors, not their actual runtime tool list.
**Rule:** Verify an agent's ACTUAL tools (installed extensions/MCP, runtime tool list) before trusting a capability claim. For "can it do X", check the tools, not the model's self-description.

## 2026-07-22 01:31:24
**Source:** user-correction
**Lesson:** I invented extra product/package names (`rea-core`, `@readev/core`, `packages/` scope) and kept surfacing them as decisions; the user was confused and frustrated — verbatim: "arkadaşım ne dediğin anlaşılmıyor ben isimleri sana söyledim. rea-tools ve rea-cli, sen şuan bunun çekirdeğini mi yapıyosun bilmiyorum. benim kafamı yorma". Afterwards I stopped inventing names, used only rea-tools + rea-cli, and demoted `core/` to a plain folder handled silently.
**Rule:** Use the names the user set. Don't invent product/package names or surface premature structural naming as user decisions — decide mechanical details silently and keep the user on substance.

## 2026-07-22 01:31:24
**Source:** user-correction
**Lesson:** I proposed a hook-based capture-reliability mechanism (G4); user rejected it — verbatim: "yok bu olduğu gibi kalsın bu kararı hatırlıyorum, hook vb ekleyince mesela ai durmadan senin planını reaplan ile yapalım diyor yada sormadan plana geçiyor falan gibi sorunlar yaşattı". I reverted; capture stays a pure prompt reflex, no hooks.
**Rule:** Don't propose loop-injecting hooks (SessionStart/Stop reminders) as a reliability mechanism here — they cause intrusive over-triggering. Prefer prompt reflexes + command-embedded steps.

## 2026-07-22 01:31:24
**Source:** user-correction
**Lesson:** Mid gap-closure pass I spun off a broad 2-subagent prior-art research fan-out; the user felt it was a drift — "sorun bu dedin ama biz şuan farklı bir yere yöneldik? neden peki" and "sonrakine geçelim ... kafamız dağılmasın". I stopped the research and returned to the disciplined one-gap-at-a-time present→recommend→confirm rhythm.
**Rule:** In a structured step-by-step pass, don't spin off tangential research mid-step. Keep the crisp rhythm; research only when the user asks or the step genuinely requires it.

## 2026-07-22 01:31:24
**Source:** user-correction
**Lesson:** I reintroduced the superseded "Claude adapter" (Layer-2 Claude-only) framing; user corrected — "claude adapter diye bişi olmayacak diye konuştuk tüm cli lara entegra olsun dedik o konuştuklarımız kayıp mı oldu". I corrected the framing (command content is shared markdown; only placement is tool-specific) and fixed rea-target-state §2.
**Rule:** Don't reintroduce framings that a later finding superseded. Per the oh-my-pi finding, commands port ~1:1 as shared markdown; there is no fat per-tool adapter, only thin placement. Keep design docs consistent with the latest decisions.

## 2026-07-22 01:31:24
**Source:** discovery
**Lesson:** oh-my-pi (can1357/oh-my-pi, MIT Pi fork) already ships web search (25-provider), parallel schema-validated subagents, multi-subagent workflows, AND reads markdown slash-commands (`.omp/commands/*.md`, same model as Claude Code) + config-inheritance for AGENTS.md-class files + a TS plugin system + Node SDK. Detail in docs/rea-roadmap.md §7.
**Rule:** rea-cli = oh-my-pi as a plugin/config LAYER, not a hard fork. Don't rebuild what omp already provides; the parked command-portability is near-free for omp.

## 2026-07-22 01:31:24
**Source:** discovery
**Lesson:** Claude subscription auth for third-party agents is volatile: raw subscription OAuth was ToS-restricted (Feb-Apr 2026); the Agent SDK is the sanctioned path; personal use is fine; a metered credit pool (2026-06-15) was announced then paused. Detail in reference memory + roadmap §7.
**Rule:** For rea-cli's Claude-subscription support use the Agent SDK, not raw OAuth. Re-verify before relying; keep the provider layer flexible.

## 2026-07-22 03:40:33
**Source:** user-correction
**Lesson:** After the user said "sanırım planı exec edebiliriz" I started hand-authoring the Faz 0 `core/` files directly. The user interrupted, reverted my files, and invoked the `/rea-execute` slash command: verbatim — "sana yap demedim kodu geri aldım şimdi rea execute ile yapacaksın." I switched from manual authoring to the `/rea-execute` command flow (dispatcher → implementer → spec/code review → CI gate) and completed all 6 items that way.
**Rule:** In a REA project that has an approved plan AND a `/rea-execute` command, "exec/execute the plan" means run `/rea-execute` — do NOT substitute hand-authoring the files yourself. The pipeline (parallel dispatch + fresh-context review) is the point; my authoring the artifacts inline bypasses it.

## 2026-07-22 03:40:33
**Source:** discovery
**Lesson:** During `/rea-execute` a parallel batch, the `implementer` agent's own prompt ends with a "Commit" step — but launching several implementers concurrently would race on the single `.git/index`, and the rea-execute command itself defers version control to Step 4 (`/rea-commit`). I instructed each implementer explicitly NOT to run git / commit; the orchestrator handled commits later.
**Rule:** When fanning out parallel `implementer` sub-agents in one working tree, tell them not to commit (defer all version control to the orchestrator / `/rea-commit`). Concurrent sub-agent commits corrupt/interleave the git index.

## 2026-07-22 03:40:33
**Source:** discovery
**Lesson:** Faz 0 was pure content authoring (markdown docs), but `rea-execute` is code-oriented: `implementer` is TDD-framed and the CI gate runs `pytest`+`ruff`, which are irrelevant to markdown changes (they only confirmed the Python CLI still passed). The implementer's low-risk path handled docs fine, but I had to repeat the same guardrails ("this is content, no TDD, don't commit, tool-agnostic, don't invent names") to every sub-agent.
**Rule:** The redesign is mostly prose/prompt content, and `rea-execute`'s TDD+pytest/ruff assumptions don't fit it — this is the roadmap's deferred "prompt-level testing/eval strategy" gap. Until a content-authoring execute mode / doc-review lens exists, pass content-authoring implementers explicit "docs, no TDD/code-tests" framing and treat the CI gate as a "didn't break the repo" safety net, not a content check.

## 2026-07-22 04:48:00
**Source:** discovery
**Lesson:** During Faz 1, implementers authored install-template files (`templates/shims/CLAUDE.md`, `templates/.rea/*/README.md`) with links relative to their SOURCE position in the repo (`../AGENTS.md`, `../../../core/rea-schema.md`). Because the Phase-4 installer does a mechanical dumb copy into a host project (no path rewriting — "CLI is dumb"), those links would be DEAD in every install; the correct host-destination depths are `AGENTS.md` (sibling) and `../../core/rea-schema.md` (two `..`). `AGENTS.md`'s own map was already correct. Caught by code-reviewer, not spec-reviewer.
**Rule:** Author relative links inside install-template files for their HOST DESTINATION depth, not their source-tree location — template files are written for where they land, not where they live. Re-check in Phase 4 and any template authoring; a code-review link-resolution pass should assume the installed layout. (The two meta-README files that document the source tree itself, e.g. `templates/README.md`, correctly stay source-relative — they are not copied out.)

## 2026-07-22 04:48:00
**Source:** discovery
**Lesson:** `.gitignore` ignores `.rea/log/` (line 16), so session/plan log files are LOCAL-only — never committed. Historical logs (pre-rule) stay tracked, which masks the rule. `.rea/lessons.md` and `.rea/plans/` ARE tracked. During wrap I spent two tool calls diagnosing why a freshly-written log file wasn't in `git status`.
**Rule:** In this repo `.rea/log/*` is intentionally local (gitignored) — don't expect session/plan logs in commits or `git status`. The tracked, shareable session artifacts are `.rea/lessons.md` + `.rea/plans/`; the wrap commit carries lessons/plans, not logs.

## 2026-07-22 04:48:00
**Source:** discovery
**Lesson:** The content-vs-code `rea-execute` mismatch (first logged 2026-07-22 03:40:33 during Faz 0) RECURRED in Faz 1 — the same repeated per-implementer guardrail boilerplate ("content/docs, no TDD, no code-tests, don't commit, tool-agnostic, don't invent names"). Two confirmed occurrences; the guardrail set is now stable.
**Rule:** Confirmed recurring: until a content-authoring execute mode exists, every redesign content phase reuses the SAME implementer framing block — pass it verbatim. This is a concrete candidate for the roadmap's deferred "prompt-level testing/eval strategy" gap; worth a dedicated content-execute path when Phase 3 rewrites the commands.

## 2026-07-22 06:33:20
**Source:** user-correction
**Lesson:** Planning Faz 2, I recommended writing the redesigned agents to `templates/.claude/agents/`. The user pushed back, frustrated at repeating themselves — verbatim: "niye claude agents yazıyoruz? cross platform olucak dedik ben niye kendimi tekrarlıyorum sana durmadan?". I reversed to a neutral `templates/agents/` source and captured a memory.
**Rule:** In the REA redesign, agent/command SOURCE files are tool-agnostic content under `core/`/`templates/`; per-tool placement (`.claude/`, `.omp/`) is the Phase-4 installer's job. Never recommend a `.claude/` path as a source location — it conflates content with placement, the exact anti-pattern the redesign corrects. (See memory `feedback_cross_platform_placement`.)

## 2026-07-22 06:33:20
**Source:** user-correction
**Lesson:** I described the redesign as "full uyumlu / cross-platform" flatly; the user challenged it — "gemini ve codex ile ilgili olan sorun ne tam olarak? hani full uyumluydu herşey?". I had to scope the claim: the METHODOLOGY layer (AGENTS.md + `.rea/`) is genuinely cross-tool, but the executable skill-files are not — Gemini commands are TOML-only, Codex subagents are TOML, and per-tool skill-file porting is parked (roadmap §6).
**Rule:** Don't claim "full cross-platform" flatly. State it per layer: methodology/instructions port to every tool now; command/agent skill-FILES are first-class only on the markdown tools (Claude + oh-my-pi) and parked for TOML tools (Gemini/Codex). Precision here is anti-sycophantic, not pedantic.

## 2026-07-22 06:33:20
**Source:** internal-mistake
**Lesson:** In the Faz 2 plan I used `NNNN-slug` as the per-unit plan↔todo join key. plan-validator caught it: `core/rea-schema.md` defines the per-unit join key as `U<n>` (heading `### U<n> — <title>`); `NNNN-slug` is the `plans/`/`decisions/` DIRECTORY numbering (G6a), a different level. I verified against the schema and fixed all six occurrences.
**Rule:** Two distinct ids in `core/rea-schema.md`: `U<n>` = the per-unit join key between one plan's `plan.md` and `todo.md`; `NNNN-slug` = the plan/decision DIRECTORY name. Don't conflate them when writing anything that references the schema.

## 2026-07-22 06:33:20
**Source:** discovery
**Lesson:** plan-reviewer found that under the new schema `plan.md` is dependency-graph only (`Unit | Title | Depends on`) — it carries NO file paths; every unit's `Files:` lives in `todo.md`. The legacy `plan-validator` and `dispatcher` both extract their file inventory "from plan.md", which is now permanently empty. Two schema-critical agents would have been authored against a dead source.
**Rule:** When redesigning agents for the new `.rea/` schema, file paths come from `todo.md`'s `Files:` field, not `plan.md`. Any agent that needs a per-unit file list (placement checks, file-conflict grouping) must read `todo.md`, and grep only as a fallback.

## 2026-07-22 06:33:20
**Source:** discovery
**Lesson:** The user's question about Decision 9 ("bu bir ihtimalde olsa bazı şeylerde test yazılmayacağı anlamına mı geliyor") surfaced a real tension: making implementer TDD unconditional collides with code-reviewer's new no-tautological-test check — a genuinely untestable change (pure type/rename/comment) would be forced to grow a fake test. I refined Decision 9 to a "default-on with a stated-reason escape" (mirroring debugger's "(if testable)").
**Rule:** "Always write a test" and "no tautological tests" must be reconciled: default is a real test; skipping is allowed ONLY when genuinely untestable AND with an explicit stated reason (never silently, never a fake test). A user's clarifying question can expose a plan inconsistency the review agents missed — treat it as a review signal.

## 2026-07-22 07:16:52
**Source:** user-correction
**Lesson:** After I reported Faz 2 as complete (11 files spec-reviewed PASS, CI green), the user challenged the quality basis — verbatim: "yeni promptların daha iyi olduğunu nereden biliyoruz? sen skill yazma kurallarına uydun mu yaparken mesela bunları?". I had conflated three different things: plan-acceptance conformance (spec-review PASS), convention-conformance (`skill-writer-patterns.md`), and efficacy ("better"). I had run only the first, skipped the second entirely, and had zero evidence for the third. After the pushback I read `skill-writer-patterns.md`, ran a type-by-type conformance sweep (found + fixed 1 defect: a bold `Principles` tag), and stated plainly that efficacy is unproven (roadmap §9 deferred prompt-eval gap).
**Rule:** When authoring/redesigning agents or skills, run the project's OWN skill-writing conformance check (`skill-writer-patterns.md` required-patterns per type) as a DISTINCT gate — spec-review against plan acceptance criteria does not cover it. And never present "meets the plan" as "is good/better": conformance ≠ preservation ≠ efficacy. Efficacy needs an eval; if none exists, say so instead of implying the reviews proved quality.

## 2026-07-22 07:16:52
**Source:** discovery
**Lesson:** The content-vs-code `/rea-execute` mismatch (logged 2026-07-22 03:40 Faz 0, 04:48 Faz 1) RECURRED in Faz 2 — now 3/3 redesign content phases. New wrinkle: the mismatch is not only on the implement side (TDD/pytest/ruff irrelevant to markdown) but ALSO on the review side — the `code-reviewer` agent has no code to assess for a prose prompt file, so I did the objective "code-level" checks myself via a mechanical grep sweep (tool-agnostic body, root-relative `core/` refs, models, CC-NN wiring) and folded code-review into the spec-review (acceptance criteria + a legacy-preservation diff).
**Rule:** For redesign content phases, budget for BOTH pipeline sides being code-shaped: pass implementers the standard "docs, no TDD/commit, tool-agnostic, no invented names" framing AND replace the code-review stage with (a) an orchestrator-run mechanical grep sweep for the objective constraints + (b) a spec-review that also diffs against the carried-forward source for content-preservation. pytest/ruff = repo-safety net only. Still the roadmap's deferred "content-authoring execute mode" (Phase 3 candidate).

## 2026-07-22 07:16:52
**Source:** discovery
**Lesson:** During the Faz 2 `skill-writer-patterns.md` conformance pass, two nuances surfaced: (1) the patterns doc is internally inconsistent — its "Review type required additions" (confidence scoring + FP filtering + hard exclusions) contradicts its own §2 catalog, which documents `spec-reviewer` (simple PASS/FAIL, no confidence) and `plan-reviewer` (adversarial PASS/REVISE, no confidence) as legitimate exceptions; carrying legacy forward faithfully "fails" the literal rule but matches the catalog. (2) "Keep Mechanical agents minimal" means ABSENCE of forbidden machinery (no rationalizations/confidence/blast-radius), NOT a raw line-count cap — `dispatcher`/`plan-validator` grew +26 lines with schema content yet still conform because they added none of the forbidden patterns.
**Rule:** Treat the `skill-writer-patterns.md` §2 catalog as the tie-breaker when its type-level "required additions" contradict a documented per-agent shape (spec-reviewer/plan-reviewer are confidence-free by design). Judge Mechanical-minimal by forbidden-pattern-absence, not line count. Flag the Review-type inconsistency for a future patterns-doc cleanup (not a Faz-2 regression).

## 2026-07-22 21:02:20
**Source:** user-correction
**Lesson:** For prompt/command design, the user rejected treating "author docs, not code" as something needing a special mode-switch in rea-execute. Verbatim: "execute ile arasıra da olsa kod yazdırmıyoruz ve buna çözüm arıyorsun demi? b biraz yakın ama zaten anlaşılıyor neyin ne olduğu bilmiyorum yani özellikle bunu yaparken kod yazmıcaksın demeye gerek olan bir sorun yok gibi, planda ne anlatılıyorsa onu yapıcak işte." Context: I had framed content-vs-code as a two-option design decision (edit implementer.md vs command wrapper); after this I reframed it to "no mode imposed" and, on a later self-check, simplified twice — first to a Files: classification, then down to "run bug/security scanners only when the batch diff includes code files," letting the implementer's own documentation-only carve-out handle prose.
**Rule:** Don't add an explicit mode-switch/flag where the artifact's own description (the plan unit / `Done when:`) already conveys intent. Treat the plan as the source of truth (Principle B/H) and pick the leanest mechanism that works (L) — the orchestrator keys behaviour off what actually changed, not off a label the plan must carry.

## 2026-07-22 21:02:20
**Source:** user-correction
**Lesson:** In a large multi-phase plan the user cannot hold every earlier decision in memory and finds overly detailed questions hard to track. Verbatim: "plan büyük aldığım kararları hafızamda tutamayabiliyorum, bazen çok detaylı olabiliyor sordukların. o yüzden önerilerin genel vizyon ile çelişmemeli bunu kontrol etmek gerekebilir." And later: "planı kendin son kez kontrol eder misin bi uyumsuzluk var mı bizim istediğimizden farklı mı diye." Context: after this I added an explicit vision-alignment check (recs vs the 12 principles + §9 locked decisions), kept subsequent checkpoints compact/vision-level, and did a final self-read of spec/plan/todo that caught + corrected a Decision-4 intent drift.
**Rule:** In big multi-phase efforts I own the vision-consistency check — cross-check every recommendation against the north-star docs myself and present a compact vision-level verdict; reserve explicit questions for genuine taste/scope calls; don't push retainable-detail decisions onto the user. (Also saved as memory feedback_check_recs_against_vision.)

## 2026-07-22 21:02:20
**Source:** internal-mistake
**Lesson:** When I revised the content-authoring decision, I updated the rea-execute per-command bullet + the todo step but forgot the Decisions-table row (Decision 4) — leaving the plan self-contradictory (the table still listed the mechanism the body had adopted as "rejected"). The plan-reviewer's re-review caught it.
**Rule:** A decision expressed in multiple places (Decisions table + per-component section + todo step + Test line) must be updated in ALL of them in one pass — after editing a decision, re-scan spec/plan/todo for every occurrence, never edit only the narrative bullet.

## 2026-07-22 21:47:10
**Source:** discovery
**Lesson:** During `/rea-execute` on Faz 3, all 11 units were physically file-disjoint (one command file each), so the `dispatcher` correctly returned a single flat "all parallel" batch — but plan.md's own "Dependency graph" section carries a CONTRACT dependency the file-conflict view cannot see: `rea-execute` is the reference unit whose frontier/review/diff contracts later units (`rea-fix`, `rea-ship`) cite, and `rea-grill`→`rea-plan` share a fixed `brief.md` section list. A naive orchestrator following only the dispatcher's file-conflict output would author them in the wrong order. The dispatcher agent itself flagged this (it surfaced the contract overlay), mirroring plan Decision 3 (dispatcher does physical file-conflict grouping ONLY; the orchestrator combines it with `Depends on`/contract logic).
**Rule:** When executing a plan whose units are all file-disjoint, do NOT treat the dispatcher's flat "all parallel" result as the authoring order. Read the plan's "Dependency graph" / contract section and layer the stated contract-ordering (reference units first, contract-consumers after) on top of the file-conflict grouping. File-disjointness answers "can they touch the tree concurrently?", not "in what order must they be authored?"

## 2026-07-22 21:47:10
**Source:** discovery
**Lesson:** The content-vs-code `/rea-execute` mismatch (logged 03:40 Faz 0, 04:48 Faz 1, 07:16 Faz 2) recurred a 4th time in Faz 3 — with a twist: the file being authored (`templates/commands/rea-execute.md`) IS the content-aware fix (no imposed authoring mode; `bug-scanner`/`security-scanner` only when the batch diff includes code files; prose gates on `Done when:` via the implementer's documentation-only carve-out). Yet the ACTIVE command running the session was still the legacy code-oriented `/rea-execute`, so the same manual guardrail block ("prose content, no TDD/commit, tool-agnostic, no invented names" + grep-sweep-instead-of-code-review) was still required. The fix exists as a template SOURCE but is not the installed/active command.
**Rule:** Authoring the redesigned content-aware execute does NOT retire the manual content-authoring guardrails — they stay necessary until the redesign command set is actually installed/active (Phase 4/5). Until then, every redesign content phase reuses the SAME implementer framing block + orchestrator grep sweep; treat pytest/ruff as a repo-safety net only.

## 2026-07-22 22:45:30
**Source:** discovery
**Lesson:** On the Faz-3 command batch (rea-plan, rea-fix, rea-wrap), the fresh-context `code-reviewer` found real Important craft defects in 2 of 3 files that the `spec-reviewer` had already PASSed — spec-review ("does it meet the requirement?") and code-review ("is it well-crafted?") genuinely catch different classes, even on markdown prompt content. The recurring command-prompt defects: (a) the frontmatter principle-tag listed only the "primary" letter while the body cited others inline (rea-fix tagged `G` but invoked H/J/K) — an incomplete traceability index; (b) a new command re-listed a sibling's mechanics verbatim instead of referencing them (rea-fix re-copied rea-execute's Step-4b review-agent selection + 3-cycle cap → DRY/drift risk); (c) a terminal decision branch lacked an explicit stop and fell through (rea-plan Step 0 "leave the existing plan as is" could silently overwrite an approved plan); (d) a diff-anchor sha (`pre-fix-sha`) was referenced but never recorded before the first tree-mutating agent (debugger may apply a candidate fix).
**Rule:** Run BOTH spec-reviewer (intent) AND code-reviewer (craft) on every command-prompt unit — a spec PASS is not a craft pass. When authoring a redesign command, self-check these four before review: the principle-tag lists EVERY principle cited anywhere in the body; reused sibling mechanics are referenced, not re-listed; every terminal branch has an explicit stop; any diff-anchor sha is recorded before the first agent touches the tree.

## 2026-07-23 01:24:03
**Source:** internal-mistake
**Lesson:** During the Faz-3 leftover-notes audit, a `Grep` with the brace-expansion glob `000{6,7,8}-*/todo.md` (and `000{6,7,8}-*/*.md`) on path `.rea/plans` returned "No matches found" — a false negative. The identical searches with a `**/todo.md` glob, or pointed directly at one plan dir, matched fine. I only caught it because I knew plan 0008 contained a "Boundary notes (do NOT solve here)" section, so an empty result was obviously wrong; taken at face value it would have led me to report "no deferred notes / nothing half-finished" — the opposite of the truth.
**Rule:** Don't trust a suspiciously-empty `Grep` result when the glob uses brace-expansion (`{a,b,c}`) combined with a path prefix — it can silently match zero files. Re-run with a `**/`-anchored glob or the `Glob` tool to confirm the file set before concluding "no matches," especially on audit/absence questions where the answer hinges on coverage.

## 2026-07-23 01:24:03
**Source:** discovery
**Lesson:** The principle-tag-completeness defect (frontmatter `Principles:` lists only the plan's "headline" letter(s) while the body invokes more) recurred on ALL THREE Faz-3 Batch-1 command files, each caught by the fresh-context `code-reviewer`, not spec-review: rea-tidy `F`→`F, J, K` (Step-3 propose-only rule promotion = J like rea-wrap; Step-6 approval gate = K like rea-ship/rea-fix), rea-init `L`→`D, L` (body literally says "principle D's feedback loop"), rea-write-skill `C, L`→`C, K, L` (Step-4 human-approval QA gate = K). This is the 2nd session running (rea-fix `G`→`G,H,J,K` last session) — now 4/4 command files that cite extra principles shipped an incomplete tag on first authoring. Separately re-confirmed: `code-reviewer` catches real Important craft defects on prose command/doc files that `spec-reviewer` PASSes (rea-tidy's shim-drift check compared the managed `@AGENTS.md` include against AGENTS.md prose = a logic error; rea-init Step-7 stop-scope was ambiguous; doc-sync claimed "9 commands" while the roadmap list named 8).
**Rule:** Treat principle-tag under-fill as a systematic implementer/skill-writer failure mode, not a one-off. Leanest fix is a mechanical self-check in `skill-writer` (and a `code-reviewer` check): "the `Principles:` tag must list every principle letter A–L the body invokes anywhere; roadmap decision ids (G1/G2/G6a…) are NOT principle letters" — not a new dedicated agent (Decision-8 style: don't add an agent where an inline check suffices). And always run BOTH spec- and code-review on prompt/doc content — a spec PASS is not a craft pass.

## 2026-07-23 06:48:21
**Source:** user-correction
**Lesson:** After I proposed fixing a "stale" GEMINI.md reference in `docs/rea-target-state.md`, the user approved but added a working-style directive — verbatim: "düzelt evet belgeler güncel olsun sonra onun kararı neydi bu neden böyle diye soruyoruz hep." I changed approach: instead of silently overwriting, I first read the section, established what the ORIGINAL decision was and WHY the doc said it that way (an early symmetric "write markdown shims to AGENTS.md/CLAUDE.md/GEMINI.md" assumption, later superseded by the Gemini-via-settings.json decision), articulated that rationale to the user, THEN edited to match the finalized decision — and swept sibling docs (rea-schema, rea-tidy, §357) for the same stale pattern.
**Rule:** When fixing a "stale/wrong" statement in a doc — even when the user explicitly tells you to fix it — first establish and state the original decision and why it was written that way ("kararı neydi, neden böyle"), confirm the current correct decision, then edit. Never blind-overwrite a doc statement; a stale line usually encodes a superseded decision, and understanding the supersession is what keeps the edit correct and consistent across sibling docs.

## 2026-07-23 06:48:21
**Source:** discovery
**Lesson:** During `/rea-execute` on the mixed prose+JS Faz-4 plan, the highest-severity defects were INTEGRATION-SEAM bugs invisible when reviewing each unit in isolation — they only surfaced when a consumer unit wired the siblings: `cli` returned `run()`'s object where `bin` assigned it to `process.exitCode` (installer could never signal failure); `shims` recorded `.gemini/settings.json` as owned while `prune`'s deny-list didn't protect it (prune would blind-DELETE a user file); `place`'s `core→core` layout self-copies+truncates when `sourceRoot===targetRoot` (the dogfood scenario); `setup` never folded `prune`'s `failed` list back into the saved manifest (a locked file is orphaned forever). Per-unit spec-review + implementer self-report passed all of these; the fresh-context `bug-scanner`/`security-scanner` on the code units caught them.
**Rule:** For a plan that builds mutually-`require`ing modules, budget an explicit integration lens: (1) run bug-scanner AND security-scanner on every code unit (not just spec+code review), and (2) when reviewing the unit that WIRES the siblings, scrutinize the seams — return-value/exit-code contracts between caller and callee, ownership/lifecycle a producer records vs. a consumer acts on, and self-referential inputs (src===dest, empty/`.` paths). File-disjoint units passing individually does not mean the wiring is correct.

## 2026-07-23 06:48:21
**Source:** discovery
**Lesson:** `test/cli.test.js` exercised cli.js's lazy-load "setup absent" / "setup throws" paths by physically deleting/rewriting the REAL `src/setup.js` on disk; `test/setup.test.js` does `require('../src/setup.js')` at load. `node --test` runs each test FILE in a separate OS process, concurrently by default — so the two raced: setup.test.js intermittently failed with `Cannot find module` or loaded cli.test.js's fake stub. Worse, once the real `setup.js` existed (4b-6), the pre-existing `cli(['setup','.'])` test would have run the real orchestrator against the live repo cwd, deleting real files. The implementer caught it by TRACING (not triggering) and made the helpers restore-not-delete + never-run-real-run-against-cwd.
**Rule:** A test that mutates a real production file on disk is a landmine under separate-process test runners (races other files that load it) and becomes destructive the moment that file gains real side effects. Prefer injecting/mocking over on-disk swaps; if an on-disk swap is unavoidable, (a) restore the original content in `finally` (never blind-delete), (b) never let a real side-effecting entry point run against the process cwd, and (c) run test files SERIALLY (`node --test --test-concurrency=1`) so a file that swaps a shared module fully completes before another file loads it.

## 2026-07-23 06:48:21
**Source:** discovery
**Lesson:** The same path-safety logic (root-containment, forward-slash canonicalization, `..`/absolute collapsing, case-folding, self-copy guard) was reimplemented independently in `prune.js`, `shims.js`, and `place.js` — and EACH shipped a different subtle bug (prune: deny-list checked the raw string while delete resolved `..`; shims: containment fine but Gemini ownership wrong; place: no self-copy guard). Duplicated safety primitives drift into divergent defects.
**Rule:** When ≥2 modules each need the same security-critical path handling, factor it into ONE shared utility (e.g. `src/safe-path.js`: `toCanonicalRel`, `isInsideRoot`, `isProtected`, `isSamePath`) with its own tests, and have every module call it — don't let each module re-derive containment/normalization. A shared, tested primitive is the fix for "same bug class, three slightly different holes."

## 2026-07-23 06:48:21
**Source:** discovery
**Lesson:** Node's built-in test runner has two invocation gotchas on this repo/machine (Windows, Node 22): `node --test test/` (bare directory arg) treats the directory itself as a single failing test rather than recursing; and bare `node --test` (no path) auto-discovers `*.test.js` REPO-WIDE, sweeping vendored clones under `docs/researches/temp/` (openchamber/archon) into 27 unrelated failures. The reliable, scoped form is `node --test --test-concurrency=1 test/*.test.js` — Node's own glob engine resolves the literal pattern on Windows cmd, and `/bin/sh` pre-expands it on Linux CI, converging on the same file set. Caveat: a glob that matches zero files exits 0 (silent green), so keep the pattern scoped and stable.
**Rule:** Wire the JS suite as `node --test --test-concurrency=1 test/*.test.js` (scoped glob + serial), not a bare directory or bare auto-discovery. Verify it actually runs the expected file COUNT (a zero-match glob passes silently). Pin `engines.node` to a version you actually test the glob-self-resolution on (>=20 here), not an aspirational lower bound.

## 2026-07-23 20:05:01
**Source:** user-correction
**Lesson:** After I surfaced a live symlink security finding at the end of 4c and offered options (fix now / defer as a memory note / plan later), the user redirected: "ama planını şimdi yapalım sen yap diye düşünüyorum ne diyorsun? sadece not alırsan senin bildiklerini tekrar öğrenmesi gerekir sonraki session." They wanted the fix captured NOW as an executable plan, not a memory note — because a note forces the next session to re-derive everything I currently know. I authored plan `0011-safe-path-hardening/` (spec-level plan + todo) with the exact bug/exploit/fix + the incomplete-fix trap, then ran it through plan-validator + plan-reviewer (2 cycles → PASS).
**Rule:** When deep, session-specific knowledge (an exact bug, its exploit, the correct fix, and the subtle failure modes) would otherwise be lost, capture it as an EXECUTABLE plan (`.rea/plans/NNNN-*/`), not just a memory note. A plan is directly runnable by a future session with no rediscovery; a note is a pointer that still requires re-learning. Memory notes point AT the plan; the plan is the source of truth.

## 2026-07-23 20:05:01
**Source:** discovery
**Lesson:** When hardening a path operation against symlink escape (CWE-59), fixing ONE side leaves the mirror open. In `rea-archive.js` I first fixed only the SOURCE read (`statSync`→`lstatSync`, so a planted `.rea/log → ../knowledge` junction isn't followed) — the security re-scan then found the DESTINATION write was still exploitable (a planted `.rea/_archive → /outside` symlink made the move write the victim's memory out of the project). Separately, while planning the shared fix I scoped `place.js` out with an unsound argument ("dests are fixed LAYOUT literals → safe") — the plan-reviewer caught that a fixed dest NAME does not stop symlink escape of a directory COMPONENT (`.claude` itself being a junction redirects every placed file), a LARGER surface than the shims bug I started from.
**Rule:** Harden BOTH sides of a path operation symmetrically — the source you read AND the destination you write — and treat "the relative path string is a fixed literal" as NOT equal to "the filesystem entity at that path is trustworthy" (any component can be an attacker-planted symlink/junction). When you fix a symlink-escape on one operation, immediately audit its mirror.

## 2026-07-23 20:05:01
**Source:** discovery
**Lesson:** `rea-archive.js`'s "NEVER deletes" guarantee did NOT cover "never OVERWRITES archived history": `renameSync`/`copyFileSync` silently clobber an existing destination. `.rea/lessons.md` is a single ACCUMULATING file (legacy rea-wrap keeps appending), so archive-once → user appends more → migrate re-run would rename the new lessons.md straight over the previously-archived copy, destroying it while reporting success. Also learned: the naive realpath symlink fix (realpath only the `dest`) is FALSE-SAFE — a new file whose PARENT dir is an escaping symlink has a non-existent `dest` (realpath throws ENOENT → returned unchecked); the correct guard realpaths the nearest EXISTING ancestor.
**Rule:** "Never delete" ≠ "never lose data" — a move/archive must also refuse to OVERWRITE an existing destination (skip + report, leave source in place). And a realpath containment check must walk to the nearest-existing-ancestor (not just stat the not-yet-existent dest) so a symlinked parent can't smuggle a new-file write outside root.

## 2026-07-23 20:05:01
**Source:** discovery
**Lesson:** Wiring a new CLI verb (`migrate`) into `cli.js` left a test-coverage hole that BOTH code-reviewer and bug-scanner independently flagged: `migrate()`'s own logic was thoroughly tested in `test/migrate.test.js`, and `parseArgs(['migrate',...])` was tested, but NOTHING exercised `cli(['migrate', target])` end-to-end through `handleMigrate` — the exact wiring seam (DISPATCH arg-order, `--dry-run` threading, exit-code mapping, absent-module degrade) most likely to silently break on a refactor. The parallel `verify` verb had the full cli-dispatch tier; `migrate` had none. Separately, adding `dryRun` to `parseArgs`'s return broke 3 existing `deepEqual(parsed, {verb,target,full})` assertions — a return-shape change rippling to every exact-shape assertion.
**Rule:** When adding a CLI verb, mirror the sibling verb's FULL cli-dispatch test tier (module-absent→graceful-degrade, real dispatch prints report + returns 0, failure→non-zero exit, and flag-threading through the real `cli()` path — not just `parseArgs`). And when a pure parser's return shape gains a field, budget for updating every exact-shape (`deepEqual`) assertion that consumes it.

## 2026-07-23 23:47:16
**Source:** user-correction
**Lesson:** I surfaced a `.claude/settings.json` hook-cleanup micro-choice (which working hook to remove during v0.7.1→redesign migration) to the user as a decision. User, visibly tired: "dediğini aladım da biz bunları cross platform kullanıyor muyuz çok claude spesifik konuşuyorsun ben bunu hatırlatmaktan yoruluyorum artık". After it I decided #3 myself with the safe default (remove only the broken rea-router hook), reframed the whole migration at the cross-tool level, and updated the feedback memory.
**Rule:** Discuss the REA redesign at the cross-tool level. Hooks are Claude-only and the redesign uses ZERO (G4); `.claude/`/settings.json/hooks appear only because migration's SOURCE (v0.7.1) was Claude-only — frame them as contained mechanical legacy cleanup, and DECIDE such Claude-only plumbing micro-details silently (safe default), never offload them to the user as decisions. Ask: "cross-tool product decision, or Claude-legacy plumbing detail?" — only the former reaches the user.

## 2026-07-23 23:47:16
**Source:** discovery
**Lesson:** The 0011 plan (2 review cycles) asserted "shims `resolveInsideRoot` has exactly two consumers (verify + test)". A verification pass against the CURRENT tree found a THIRD: `src/settings-surgery.js` (added by 0010's 4d-1 AFTER 0011's grep). Removing the export while repointing only the two known importers would have crashed `migrate` (TypeError) AND left a live symlink write vuln. The consumer inventory went stale between plan phases.
**Rule:** When a plan removes/renames a SHARED export, re-grep the current tree for ALL importers at execution/verification time — a consumer list captured in an earlier phase goes stale as later phases add importers. An export removal + every importer repoint must land in ONE atomic commit (any intermediate commit breaks the build).

## 2026-07-23 23:47:16
**Source:** discovery
**Lesson:** plan-validator's reuse-accuracy check repeatedly caught functions the plan claimed to reuse that were DEFINED but not EXPORTED in the target modules (`setup.detectLegacyPresent`, `shims.detectEol`/`buildBlockCore`/`parseTemplate`, `manifest.manifestPathFor`). A plan built on `require('./x').fn` for a private `fn` breaks at runtime, not at author time.
**Rule:** When planning to reuse a function from an existing module, verify it is in that module's `module.exports`, not merely defined in the file. Cite the exact export line. This is the single highest-value mechanical check when a plan builds on prior code.
