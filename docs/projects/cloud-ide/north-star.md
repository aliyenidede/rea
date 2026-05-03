# readev — North Star

_Project name: readev (chosen 2026-04-27)_
_Started: 2026-04-26_
_Status: pre-build, learning phase — Archon (`coleam00/Archon`) selected as the harness platform; **Pi** (`badlogic/pi-mono` / `@mariozechner/pi-coding-agent`) selected as primary AI runtime under Archon. OpenCode kept as optional secondary runtime once upstream PRs (#1372, #1384) merge._

This is **not a plan**. This is the document of values and architectural commitments that every later decision must align with. When uncertain, return here.

---

## 1. Project identity

_To be filled in once real-world OpenCode usage clarifies the product shape._

---

## 2. Architectural commitments (decided)

These are settled; revisit only with strong reason.

- **Harness platform:** **Archon** (`coleam00/Archon`). Chosen 2026-04-27 after evaluating opencode-manager (vibe-coded, 214 open issues, paradigm mismatch) and OpenChamber (3,800-line components, vibe-coded). Archon paradigma (workflow-engine, harness-builder) senin 12 prensiple birebir örtüşüyor. Cole Medin'in canlı yayınında doğrulanan vizyon: prompt → context → harness engineering evrimi.
- **Primary AI runtime under Archon:** **Pi** (`badlogic/pi-mono`, npm `@mariozechner/pi-coding-agent`). Chosen 2026-05-04. Already merged into Archon as a community provider (#965). Native multi-provider via `@mariozechner/pi-ai` package (OpenAI, Anthropic, Google, OpenRouter, Vercel AI Gateway, ZAI, Azure, DeepSeek, Mistral, Groq, Cerebras, Cloudflare). MIT licensed. Maintained by Mario Zechner; production-adopted by OpenClaw, BasedHardware/omi, Bitterbot-AI, Rivet, ~14 other projects.
- **Pi extension story:** Pi ships minimal — no MCP, no hooks, no built-in sub-agents. **Extension via 4 mechanisms:** Skills (markdown), Extensions (TypeScript), Prompt Templates, Themes. Distributed as **Pi Packages** via npm/git. A live marketplace exists: `pi-resource-center` for browsing third-party packages, with examples like `pi-docparser` (PDF/Office/spreadsheet parsing), `pi-show-diffs` (diff approval), `@ahkohd/pi-yagami-search` (web search), `@eko24ive/pi-ask` (interactive ask_user), `@codersbrew/pi-tools`, `@tungthedev/pi-extensions`, etc. Missing capabilities are added by installing or writing a Pi Package — aligns with Principle L (own your stack, no magic).
- **Secondary AI runtime (optional, later):** **OpenCode** (`anomalyco/opencode`). To be added when upstream PRs #1372 / #1384 merge. Reason to keep on the radar: native MCP, hooks, sub-agents (richer for nodes that need them). Archon multi-provider design lets Pi and OpenCode coexist node-by-node in the same workflow.
- **Editor:** code-server (Coder), self-hosted at **`code.readev.co`**. Archon Web UI lives at **`agent.readev.co`**. Two reverse-proxy entries, same VPS, shared workspace volume.
- **Hosting provider:** **Hetzner Cloud** (decided 2026-05-04). CX22 or similar small instance sufficient for single-user scope.
- **AI provider preference:** OpenRouter as the default model gateway via Pi's `~/.pi/agent/models.json` custom-provider mechanism (Pi speaks OpenAI-compatible APIs, OpenRouter included). Other providers remain selectable per workflow node.
- **Deployment target:** A single personal VPS, browser-accessible from any device.
- **Hosting model:** Self-hosted, single user. Multi-tenant is **not** built; the architecture must not preclude it later.
- **Workflow definitions:** YAML in `.archon/workflows/` (versioned in repo). Per Cole's pattern: workflow YAML = structure, prompts → `commands/` markdown, references → `skills/` markdown, generated outputs → artifacts directory. This mapping is Principle B (layered plan) realized in Archon primitives.

### Decisions explicitly retired

- **opencode-manager fork** — abandoned 2026-04-27. Reasons: vibe-coded codebase (1,272-line components, 18 open feature-request issues mostly waiting), settings page direct URL returns 404, mobile UX functional but unpolished, paradigm mismatch (chat-shell vs. workflow-engine).
- **OpenChamber fork** — abandoned 2026-04-27. Reasons: 3,800-line single ChatInput component (vibe-coded), 214 open core-flow bugs, Cloudflare-tunnel-first deployment paradigm.
- **Sıfırdan yazma** — explored briefly, retired. Archon already does the workflow-engine layer with 19,800+ stars and active development. Wheel re-invention risk too high relative to value.
- **OpenCode as primary runtime** — moved to secondary 2026-05-04. Reasons: PR merge timing uncertain (days-to-weeks), Pi ships today and matches the "OpenRouter primary, no Anthropic lock-in" stance natively. OpenCode kept on the roadmap for nodes that need MCP/hooks/sub-agents.
- **Claude Code as runtime bridge** — abandoned 2026-05-04. Was planned as the temporary runtime while waiting for OpenCode merge. Pi makes the bridge unnecessary: no Anthropic dependency, no compiled-binary friction, runs in dev mode out of the box.

---

## 3. Principles

Distilled from Matt Pocock's 20 AI coding principles (`docs/researches/ai-coding-principles.md`), REA's architecture rules (`CLAUDE.md`), and the wrapper-research process. Each principle below is owned — kept because it earned its place in conversation, not copied from a source.

### A — Grilling, planlamanın başlangıç noktasıdır ve codebase-aware'dir.
Planlama AI'a brief atmak değil, AI'la beraber düşünmektir. AI sorgular, sen cevaplarsın. Sorular boş değil, **kodu gezmiş bir AI'dan** somut sorular olur. AI önerir, insan karar verir.

### B — Plan tek belge değildir; katmanlıdır.
"Nereye gidiyoruz" (destination) + "Nasıl gidiyoruz" (journey) + "Detayda ne var" (spec, todo) — üç farklı detay seviyesi, ayrı belgelerde. Tek dosyada her şey yığılmaz.

### C — Yazılım mühendisliği bilgisi pasif kütüphane olmaz; doğru anlarda enjekte edilir.
Genel prensipler (deep modules, vertical slices / tracer bullets, TDD, pragmatic programmer ilkeleri vb.) AI'ın bakabileceği bir referansta durur **ama otomatik kullanılmaz**. Doğru anlarda — bir hook, plan skill adımı, review aşaması — açıkça çağrılır. Yoksa tozlanır, kullanılmaz.

### D — Feedback loops zorunlu altyapıdır.
Lint, typecheck, test — bunlar olmadan AI **kör kodlar**. Hem bu projenin kendi codebase'inde zorunlu, hem de bu tool kullanıcının projesinde feedback loop yokluğunu algılar/uyarır. Bunlar olmadan üretilen kodun tavanı çok düşüktür.

### E — Test önce, kod sonra (TDD).
AI önce kod sonra test yazarsa testi koda göre uydurur. Önce test → fail görmek → kod → pass görmek sırası AI'ın "geçen testi yazma" eğilimini kırar.

### F — Deep modules tercih edilir; deep ≠ şişkin.
Shallow modüller (küçük, çok bağımlı, dağınık) AI'ı karıştırır. Deep modüller (büyük + sade interface) hem test edilebilir hem AI tarafından anlaşılır. Ama "deep" "şişkin" değildir — 3,800 satırlık tek-her-şey component **disiplin kaybıdır**, deep modül değil. Deep modülün ölçütü: az şey export eder, çok şey içerir, **içeriği hala okunabilir**.

### G — İş, "insan-in-the-loop" ve "AFK" olarak ayrılır.
Alignment, taste, mimari karar = insan zorunlu. Implementation, refactor, test yazma = AI'a bırakılabilir. UI bu ayrımı destekler.

### H — Plan smart-zone'a göre bölünür; agent runtime'da kendi başına bölmez.
AFK iş için todo/plan en başta öyle parçalanır ki her birim ~100K token'ı aşmadan bitebilsin. Agent çalıştığında bu plana sadık kalır, kendi yetkisiyle plan değiştirip yeni session spawn etmez. **Plan bölme insan + plan skill'inin işidir, runtime agent'ın değil.**

### I — Paralel oturumlar birinci sınıftır.
Tek session yerine birden fazla bağımsız oturum aynı anda açılabilir. Aralarında geçiş hızlı, durumları görünür. Sequential düşünme dayatılmaz.

### J — Mimari farkındalık delege edilemez.
Agent kod yazsın, ama "bu modül nereye oturuyor, neyle konuşuyor" sorusu insanın. Prensip C (kitap) bu kararı **destekler**, ama yerine geçmez.

### K — Otomasyon taste'in önüne geçmez; QA insan momentidir.
Üretim otomatize edilebilir, "iyi mi?" sorusu otomatize edilmez. Tool, QA'yı atlamayı kolaylaştırmaz; tersine, QA'yı görünür bir aşama olarak korur.

### L — Anladığın stack'e bağımlı ol; magic'e değil.
Hazır araçları (opencode-manager, code-server, opencode core, better-auth) kullanırız ama **anladığımız yerde**. Bir şey kırıldığında debugger'a inebiliriz; black-box dependency'lerden kaçınırız. "Sıfırdan yaz" takıntısı yok, ama "ne kullandığımı bilmiyorum" da yok.

---

## 4. Out of scope (for the foreseeable phase)

Not in scope today, regardless of merit:

- Multi-tenant / multi-user UI
- Full sandboxing / per-session container isolation
- GitHub OAuth UI for end users (AI uses GitHub via OpenCode shell)
- Free-form web terminal in chat UI (code-server has terminal)
- Kanban / grilling / vertical-slice as first-class UI panels (deferred until usage proves the need)
- Automatic plan/spec/todo retention/cleanup as a forced lifecycle (REA's experience shows this hasn't caused problems in practice; revisit if it does)

---

## 5. Open questions (deferred)

Decisions intentionally not yet made. Each requires real-world Archon usage before answering.

- **Mobile UX** — Archon Web UI mobile'da functional değil (doğrulandı 2026-04-27). Çözüm: Telegram adapter'ı kur ve mobile'da onu kullan? Yoksa fork edip CSS düzeltmeleri mi yap? Yoksa "mobile = bildirim + onay only" diye scope düşür mü?
- **Custom Dockerfile** — default Archon Docker image'ında Claude Code yok, README "ships pre-installed" yanıltmış. Pi runtime kararıyla bu sorun **artık geçerli değil** — Pi npm üzerinden install ediliyor, Claude binary gerekmiyor. Yine de container'da `@mariozechner/pi-coding-agent`'ın hazır olduğunu doğrulamak gerek (image build sırasında install edilmesi veya `Dockerfile.user.example` benzeri kullanım).
- **Pi compiled-binary edge case** — Archon'un Pi provider kodu (`packages/providers/src/community/pi/provider.ts`) compiled-binary modunda startup crash yaşıyormuş; `PI_PACKAGE_DIR` shim ile çalışıyor. Dev mode (`bun run dev`) güvenli. Self-hosted dev-mode deployment plan ile uyumlu, ama compiled binary yoluna gidersek bu friction'ı bilelim.
- **Pi → Gemini ve diğer SDK'sız modeller** — Pi'nin `~/.pi/agent/models.json` custom-provider mekanizması veya extension'la SDK'sız modellere erişim mümkün. Gemini, OpenRouter, Vercel AI Gateway, ZAI hepsi Pi tarafında konuşuluyor.
- **REA prensiplerinin Archon workflow'a port edilmesi** — Cole'un canlı demosunda gördüğümüz gibi 5-10 dakikalık iş ama hangi prensiplerle başlanacak? A (grilling), B (layered plan) açık adaylar.
- **OpenCode PR merge timing** — #1384 MERGEABLE, son commit 3 saat önce (2026-04-27). Cole'un öncelik sırası: Pi → AMP/OpenCode/Copilot. OpenCode merge'i Pi'den sonra muhtemel — günler/haftalar.
- **Plan/spec/todo lifecycle** — in-place update mu, archive mu, in-conversation mu? Cole "git log as long-term memory" diyor; bu yaklaşım denenebilir.
- **AFK iş'in (Prensip G + H) somut UI ve runtime karşılığı** — Archon'un `interactive: true` + `fresh_context: true` + DAG ile karşılanıyor görünüyor. Gerçek kullanımda netleşecek.
- **"Yazılımsal dilin basitleştirilmiş hali"** adlı kitabın gerçek adı (Matt Pocock workshop'unda bahsedildi). Cole'un live'ında geçmedi, ayrı araştırma gerek.

---

## 6. Living changelog

Significant decisions and pivots, dated, one line each.

- 2026-04-26 — Project scoping started.
- 2026-04-26 — Initial architectural commitments: opencode-manager fork + code-server on separate subdomain + opencode core + OpenRouter primary.
- 2026-04-26 — 12 principles distilled (A–L) from Matt Pocock's 20, in conversation, owned not copied.
- 2026-04-27 — Project named **readev**.
- 2026-04-27 — opencode-manager evaluation: built locally, gezildi, vibe-coded olduğu doğrulandı (Settings 404, console errors, paradigm mismatch).
- 2026-04-27 — OpenChamber evaluation: 3,800-line ChatInput, 214 open issues, abandoned.
- 2026-04-27 — Archon discovered (`coleam00/Archon`, 19,800★). Workflow Builder, Mission Control, principle alignment confirmed. "Holly shit" kalibre hissi.
- 2026-04-27 — **Pivot:** opencode-manager / OpenChamber fork plan retired; Archon yön kararı verildi. OpenCode adapter PR'larının (#1372, #1384) merge'ini bekliyoruz; arada Claude Code SDK ile Archon'u öğreniyoruz.
- 2026-04-27 — Cole Medin live stream notes ingested (`docs/researches/video-text.md`). Boris Cherny via Anthropic: Claude Agent SDK + personal use OK. YAML inceltme pattern (workflow / commands / skills ayrı dosyalar) Prensip B'nin doğal karşılığı olarak işaretlendi.
- 2026-05-04 — **AI runtime pivot:** Pi (`badlogic/pi-mono`) chosen as primary AI runtime under Archon, replacing the OpenCode-merge-wait + Claude-Code-bridge plan. Reasons: Pi already merged in Archon (#965), native multi-provider including OpenRouter, no Anthropic lock-in, MIT license, live marketplace via npm Pi Packages. OpenCode demoted to optional secondary runtime for nodes needing MCP/hooks/sub-agents.
- 2026-05-04 — Hosting decisions fixed: **Hetzner Cloud** as VPS provider; subdomains **`agent.readev.co`** (Archon) + **`code.readev.co`** (code-server). Mobile UX deprioritized — desktop is primary, mobile postponed indefinitely.

---

## References

- [Matt Pocock AI coding principles](../../researches/ai-coding-principles.md)
- [OpenCode ecosystem research](../../researches/opencode-ecosystem.md)
- [Wrapper inventory](../../researches/opencode-wrapper-inventory.md)
- [OpenChamber vs opencode-manager fork decision](../../researches/openchamber-vs-opencode-manager.md)
- REA's CLAUDE.md (root of this repo)
