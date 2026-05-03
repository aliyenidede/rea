# OpenCode Wrapper Comparison — Fork Decision

_Research date: 2026-04-26_
_Predecessor: [opencode-ecosystem.md](opencode-ecosystem.md)_
_Purpose: pick which existing wrapper to fork as a permanent base, given the user's plan to consume `sst/opencode` upstream and build a custom AI workflow UI on top._

---

## TL;DR Recommendation

**Fork Portal (`hosenur/portal`).** It is the only candidate that is web-first by architecture (React Router + Nitro on Bun), explicitly mobile-first, MIT-licensed, in active solo-dev hands (small enough to redirect, recent enough to not be rotten), and built directly against the official `@opencode-ai/sdk` with a clean monorepo. Every other candidate is either Tauri/Electron desktop-first (OpenChamber, Palot, OpenGUI, OpenWork), a config manager rather than a chat shell (opencode-studio), AGPL-encumbered (opencode-web), or a different category entirely (sandboxed.sh is an orchestrator, not a UI).

**Runner-up: opencode-web (`chris-tse/opencode-web`)** — same web-first DNA, even simpler React 19 + Vite SPA, but the AGPL-3.0 dual-license is a real friction for the SaaS goal. Only fork it if you accept that license trap or relicense the fork (which AGPL allows but constrains you on upstream merges — and the user already plans to never merge upstream, so this is actually viable).

**Major surprise:** **OpenWork (`different-ai/openwork`) is at 14.4k stars and v0.11.212**, dwarfing every other wrapper including OpenChamber. It is "powered by OpenCode" with team/enterprise framing (SSO mentioned, permissions audit flow), and is MIT-licensed. Despite being Tauri-desktop-first, its monorepo has explicit `apps/web` + `apps/orchestrator` + `/ee` (enterprise) folders — which is the closest thing to SaaS-shaped bones in the entire ecosystem. If the user is willing to fork a more opinionated codebase, OpenWork should be a serious third option.

---

## Decision matrix

Legend: ✅ strong / ⚠️ partial-or-needs-work / ❌ wrong-shape

| Wrapper | Web-ready (browser-served) | Multi-device (responsive) | SaaS-ready bones | Fork-friendliness (code quality) | Customization extension points | License | Activity |
|---|---|---|---|---|---|---|---|
| **Portal** (hosenur) | ✅ Vite+Nitro SPA | ✅ mobile-first | ⚠️ single-user but Nitro can host multi-tenant | ✅ TS strict, Turbo monorepo, IntentUI | ⚠️ no plugin system, but clean React Router | ✅ MIT | ⚠️ solo, 596★, v0.1.30 |
| **opencode-web** (chris-tse) | ✅ React 19 SPA on Vite | ✅ "responsive design" stated | ❌ session auto-creation, no auth | ✅ TS, ESLint, CSS Modules — minimal | ❌ no slash UI, no plugin model | ⚠️ AGPL-3.0 + commercial | ⚠️ solo, 120★, 19 commits |
| **OpenChamber** | ⚠️ Tauri primary, web is a packages/web sub-app with its own server+CLI | ✅ PWA, "Desktop. Browser. Phone." | ⚠️ single UI password, no per-user | ✅ MIT, monorepo, ESLint, 81% TS, Caddyfile + docker-compose included | ✅ 18+ themes, slash cmds (`/undo /redo /share`), shell mode | ✅ MIT | ✅ 3.5k★, v1.9.8 (4 days ago) |
| **OpenWork** (different-ai) | ⚠️ Tauri desktop primary, has `apps/web` and `apps/orchestrator` | ⚠️ Tauri-shaped, web app exists | ✅ `/ee` enterprise dir, permissions audit, SSO mention, "local-first cloud-ready" | ✅ pnpm monorepo, Turbo, Bun, Rust + TS, e2e tests | ✅ skills manager, plugin format = OpenCode native, templates | ✅ MIT | ✅✅ 14.4k★, v0.11.212 |
| **Palot** (itswendell) | ❌ Electron-only (browser-mode is dev-only) | ❌ desktop-shaped | ❌ explicitly single-user, safeStorage is per-machine | ✅ Turborepo, Bun, shadcn/ui, Biome, Jotai, Changesets — best-organized of the bunch | ✅ slash cmds, AGENTS.md rules, MCP, automations | ✅ MIT | ⚠️ alpha, 70★ |
| **OpenGUI** (akemmanuel) | ❌ Electron-only | ❌ desktop-shaped | ❌ single-user | ⚠️ monolithic structure, no tests, IPC bridge .mjs files | ⚠️ slash cmds in prompt box, no plugins | ✅ MIT | ⚠️ 26★, early |
| **opencode-studio** (Microck) | ✅ browser-accessible local | ❌ "not explicitly stated" | ❌ explicitly single-user config manager | ⚠️ Next.js 16 + Express, no tests visible | ⚠️ different category — config UI, not chat | ✅ MIT | ⚠️ 320★, no releases |
| **sandboxed.sh** (Th0rgal/openagent) | ✅ Next.js dashboard at :3000 | ⚠️ web + iOS native | ✅ sandbox orchestrator, systemd-nspawn isolation | ⚠️ Rust-heavy backend (60%) — friction if user is TS-only | ✅ skills, MCP, model routing, automations | ✅ MIT | ⚠️ 397★, WIP |

---

## Per-wrapper deep dive

### Portal — `hosenur/portal`
- **Identity:** 596 stars · 52 forks · MIT · v0.1.30 (2026-04-04) · solo author. README: _"a web-based UI for OpenCode … mobile-first, responsive interface for interacting with OpenCode instances remotely."_ Cites OpenCode's "official UI is currently under development" with "limited mobile experience" as motivation.
- **Architecture:**
  - **Frontend:** React Router (likely v7 / Remix-style file routes), IntentUI, Tailwind. Dark/light theme.
  - **Backend:** Nitro (Vite + Nitro starter — confirmed by `nitro.config.ts` in `apps/web/`).
  - **Connects via:** `@opencode-ai/sdk` package (the official SDK), so HTTP + SSE, against a separately running `opencode serve`.
  - **Org:** Turbo monorepo with `apps/web` and `packages/cli`.
  - **Build:** Bun preferred (`bun@1.3.5` pinned in root `package.json`), Node ≥18 supported.
- **Web/multi-device:** Web-first by design. Mobile-first explicitly stated. PWA not mentioned but trivial to add to a Vite SPA. Touch-friendly is implied by mobile-first claim.
- **Multi-user/SaaS:** Single-instance focused today, but Nitro is a real production server (it's the engine under Nuxt) and supports edge/Node/Bun deployments — adding auth and multi-tenancy is normal Nitro/H3 work, not a structural rewrite.
- **Fork-friendliness:** Clean. `Use TypeScript for all new code` per contribution guidelines. Small surface area — ~7 stars per week implies active but not crowded. No accumulated cruft. A solo author on a 596-star project is the easiest possible upstream to ignore (you don't need to track their releases).
- **Customization extension points:** No plugin/skill system. Slash commands not advertised. Theming via Tailwind. **This is a feature for forking** — there are no opinionated extension surfaces you'd have to fight or rip out.
- **Pain estimate:** **LOW.** The codebase is small enough that you're not really forking, you're seeding. The biggest unknown is how complete the OpenCode SDK integration is — but since they use the official SDK, the surface area is well-defined.

### opencode-web — `chris-tse/opencode-web`
- **Identity:** 120 stars · 35 forks · **AGPL-3.0 with commercial dual-license** · 19 commits on main · solo author.
- **Architecture:** React 19 + Vite + CSS Modules. Connects to opencode API server via EventSource (SSE). Auto-detects API endpoint. Modular component/hooks/services structure.
- **Web/multi-device:** Browser SPA, "responsive design for desktop and mobile" stated.
- **Multi-user/SaaS:** Auto-creates a session — single-user assumption baked in. No auth.
- **Fork-friendliness:** TypeScript 93.8%, ESLint configured. Smallest codebase of the lot. The AGPL is the main friction: any modified version you serve over a network must be open-sourced under AGPL. Since the user plans to never merge upstream, **relicensing the fork is not legally possible** — but the contractual commercial dual license suggests the author may grant a commercial license individually. Not a casual conversation.
- **Customization extension points:** No slash commands in README, no plugin system, theming via CSS Modules.
- **Pain estimate:** **LOW for code, HIGH for license.** If the SaaS endgame is real, AGPL is a future tax — every customer who self-hosts a derivative gets the source. Skip unless you negotiate the commercial dual-license up front.

### OpenChamber — `openchamber/openchamber`
- **Identity:** 3.5k stars · 348 forks · MIT (verified) · v1.9.8 (2026-04-22) · "Independent project, not affiliated with the OpenCode team." Explicitly fan-made.
- **Architecture:**
  - **Monorepo:** `packages/{desktop, electron, ui, vscode, web, docs}` — confirmed.
  - **`packages/web`** is a full-stack app (Vite-built React frontend + Node.js server + `bin/` CLI). Not a static SPA. Self-update from UI. Cloudflare tunnel + QR onboarding built in.
  - **Tauri** for macOS desktop. Linux/Windows desktop on roadmap.
  - **Connects via:** HTTP API (env vars `OPENCODE_PORT`, `OPENCODE_HOST`, `OPENCODE_SKIP_START`). Can manage or attach to OpenCode.
  - 81% TS, 15% JS, 2% Rust. ESLint, PostCSS, Docker, Caddyfile in repo.
- **Web/multi-device:** PWA, "Desktop. Browser. Phone." marketing is real — packages/web exists. Cross-device session continuity is a stated design pillar.
- **Multi-user/SaaS:** **Single UI password (`--ui-password`)**. No per-user model. Roadmap "conspicuously omits authentication features" per README scan. You'd be adding the entire multi-tenancy story.
- **Fork-friendliness:** Best documentation of any candidate (REVERSE_PROXY.md, DEPLOYMENT.md, systemd unit examples). But — at 3.5k stars and ~89 releases the codebase has accumulated opinions: 18 themes, branchable chat timeline, multi-agent worktrees, voice mode, integrated terminal, diff viewer (stacked + inline), VS Code extension. Forking means inheriting all of this and either keeping it in working order or ripping pieces out.
- **Customization extension points:** Theming is first-class (`~/.config/openchamber/themes/` JSON files, hot-reload). Slash commands exist (`/undo`, `/redo`, `/share`) plus `!shell` mode. **No plugin system today** — roadmap item only.
- **Pain estimate:** **MEDIUM-HIGH.** You are forking a feature-complete product, not a starter. Every existing feature is something you must maintain, replace, or delete. The web/Tauri/VS Code split means three platforms to keep in sync.

### OpenWork — `different-ai/openwork`
- **Identity:** **14.4k stars** (the surprise) · MIT · v0.11.212 (2026-04-21) · backed by "different.ai" (a small startup, not solo). Stated goal: _"open-source alternative to Claude Cowork built for teams, powered by opencode … local-first, cloud-ready."_
- **Architecture:**
  - **Tauri desktop** (`apps/desktop`) is the headline, but the monorepo also contains `apps/app` (React UI), `apps/orchestrator`, an `openwork-server`, and a separate `opencode-router`.
  - **`/ee` enterprise directory** — closest thing to SaaS-shaped bones in the ecosystem. SSO is mentioned for the enterprise plan.
  - **Connects via:** `@opencode-ai/sdk/v2/client`, SSE `/event` subscriptions.
  - **Stack:** TS 84% + JS 7.7% + Rust 4.3%. pnpm + Turbo + Bun 1.3.9+ + Tauri CLI.
  - **i18n:** EN/JA/ZH/VI/PT-BR — only candidate with i18n built in.
  - **Tests:** `pnpm test:e2e` exists.
- **Web/multi-device:** Tauri-first today, but `apps/web` exists in the monorepo. Web is not the headline product — it's a sibling. Mobile responsiveness unclear.
- **Multi-user/SaaS:** Permissions audit flow (allow once / always / deny), enterprise plan, SSO mention. The closest existing wrapper to a real multi-user product. But "local-first by default" — host mode binds to 127.0.0.1.
- **Fork-friendliness:** This is the best-organized monorepo of any candidate, but it's also the most opinionated codebase. You'd be inheriting a startup's product roadmap, including the "Skills Manager," templates, and the entire `/ee` directory you'd need to either keep, fork-and-rebrand, or rip out. Active company-backed upstream → "never merge again" is more painful psychologically (you'll watch features you want land upstream).
- **Customization extension points:** Plugin format = native OpenCode (`opencode.json`). Skills manager. Templates. Slash commands not specifically documented but present in OpenCode core anyway.
- **Pain estimate:** **MEDIUM** for the structure (it's clean), but **HIGH** for the philosophy fit — you'd be forking an active commercial-leaning team product, not a solo project. The web app is a second-class citizen and the desktop Tauri shell would need to be removed or made optional.

### Palot — `itswendell/palot`
- **Identity:** 70 stars · 7 forks · MIT · v0.11.0 (2026-02-28) · alpha. README warns _"Expect breaking changes, missing features, and rough edges."_
- **Architecture:** Best-engineered codebase in the list: Electron 40 + React 19 + Vite 6 + Tailwind v4 + shadcn/ui + Base UI + Jotai + TanStack Router/Virtual + cmdk + Shiki + Biome + Turborepo + Bun workspaces + Changesets + electron-builder. `apps/{desktop, server}` + `packages/{ui, configconv}`.
- **Web/multi-device:** **Electron-only.** A `apps/server` Bun+Hono dev server exists at port 3100 but is "browser-mode for development, not production." So the web bones exist but are explicitly de-emphasized. Mobile-shaped: no.
- **Multi-user/SaaS:** Electron `safeStorage` for API keys = per-user-per-machine. Not portable to a server. mDNS server discovery is local-network only.
- **Fork-friendliness:** Highest code quality per reviewer's eye (Biome, Changesets, configconv migration tooling, shadcn/ui properly used, Jotai for state, TanStack across the board). But all of that engineering is in service of Electron desktop. Repurposing this as a web shell means deleting Electron, replacing safeStorage, recreating the auth story — a lot of work to inherit a small star count and an alpha label.
- **Customization extension points:** Slash commands, `@`-mentions, AGENTS.md custom agents, MCP, RRule scheduled automations with human-in-the-loop, migration wizard from Claude Code/Cursor. The richest feature set per line of code.
- **Pain estimate:** **HIGH if your goal is web.** This is the wrong shape. If you suddenly decided you wanted a desktop app, this would be the answer. For browser-first SaaS-able, no.

### OpenGUI — `akemmanuel/OpenGUI`
- **Identity:** 26 stars · MIT · v0.4.4 (2026-04-20) · solo. Electron desktop with multi-project workspaces, prompt queue, Whisper voice, MCP tools.
- **Architecture:** Monolithic — `main.cjs`, `preload.cjs`, `src/` (React + hooks + components). IPC bridge via `opencode-bridge.mjs` using SSE.
- **Web/multi-device:** **Electron-only**, no web build, not mobile.
- **Multi-user/SaaS:** Single-user.
- **Fork-friendliness:** TS-heavy but no tests, monolithic structure, low star count means no scrutiny on the code.
- **Pain estimate:** **HIGH** — you're forking something with less polish than Palot and the same wrong (desktop) shape, with a smaller community to extract bug fixes from.

### opencode-studio — `Microck/opencode-studio`
- **Identity:** 320 stars · MIT · 338 commits · no releases yet. Explicitly _"a desktop GUI for managing OpenCode configurations locally"_ — toggling MCP servers, editing skills, managing plugins, handling auth credentials. It does NOT wrap chat.
- **Architecture:** Next.js 16 frontend + Express backend, runs locally (frontend :1080+, backend :1920+), browser-accessible at localhost or `opencode.micr.dev`. Reads/writes `~/.config/opencode/` directly. Custom protocol handler `opencodestudio://` for one-click installs.
- **Why it's in this list:** Different category. This is a config/skills/MCP/auth management UI, not a chat shell. **It is not a candidate to fork** for the user's stated needs — but it might be a candidate to absorb (i.e., add a "settings" panel modeled after it inside whichever wrapper you do fork).
- **Pain estimate:** **N/A** — wrong job-to-be-done.

### sandboxed.sh — `Th0rgal/openagent`
- **Identity:** 397 stars · MIT · v0.10.0 (2026-02-23) · _"Self-hosted cloud orchestrator for AI coding agents. Isolated Linux workspaces with Claude Code, OpenCode & Amp runtimes."_
- **Architecture:** Rust 60.6% backend + Next.js 28.7% frontend + SwiftUI iOS app. systemd-nspawn isolation. Web dashboard at :3000. Telegram bot integration. Git-backed Library.
- **Why it's in this list:** It overlaps heavily with the user's "production-grade, eventually SaaS-able" requirement. It is the orchestrator/sandbox layer that the predecessor research said you'd need to build separately. Forking it to add a UI is the wrong cut — but **using it underneath your forked UI** is the right cut.
- **Pain estimate to fork as UI base:** **HIGH** — Rust backend means you'd be maintaining Rust if you change orchestration. Better as a dependency than as a fork target.

---

## The "fork pain" estimate

For the top 2 candidates (Portal, OpenWork), here's what it would take to add the user's planned features. Estimates assume one experienced full-stack TS dev, full-time.

### Portal (hosenur/portal)
| Feature | Effort | Notes |
|---|---|---|
| Multi-device responsive layout | **Already done** | Mobile-first is the existing baseline. Just verify on tablet breakpoints. |
| Kanban panel for tasks | **3-5 days** | Add a route, model session-as-task, persist via Nitro server route, add drag/drop (dnd-kit). Clean addition because no existing kanban opinion to fight. |
| Grilling/interview mode UI | **3-5 days** | New chat sub-mode flag, alternate prompt UI, drives the same OpenCode session via the SDK. Pure frontend work. |
| OpenRouter config UI | **2-3 days** | Form that POSTs to a Nitro route which writes to opencode.jsonc. Worth doing right because the predecessor research flagged the OpenRouter persistence bug — own this layer. |
| GitHub OAuth + PR creation | **5-7 days** | Add auth provider (Auth.js or Lucia on Nitro), persist token, call GitHub API for PR ops. Clean because there's no existing auth to dismantle. |
| **Total greenfield baseline** | **~3 weeks** | Plus another ~1-2 weeks for the "AI workflow UI" core (chat-first + slash command palette + vertical-slice planning view). |

### OpenWork (different-ai/openwork)
| Feature | Effort | Notes |
|---|---|---|
| Multi-device responsive layout | **5-7 days** | `apps/web` exists but is not the headline; needs an audit and likely a layout rework since the desktop Tauri shell is the design center. |
| Kanban panel for tasks | **3-5 days** | Architecturally easy because there's already a Templates concept and a permissions audit flow you can fit kanban next to. |
| Grilling mode UI | **5-7 days** | Have to fit it inside an existing UI vocabulary (Skills Manager, Templates) — more cognitive load than starting clean. |
| OpenRouter config UI | **5-7 days** | Have to navigate `opencode-router` and the existing model selection. The plumbing exists but you're integrating, not building. |
| GitHub OAuth + PR creation | **3-5 days** | Permissions framework already exists, SSO mention in `/ee` suggests auth scaffolding may be partly there. Easier than Portal here. |
| **Inherited maintenance tax** | **Ongoing** | Removing or rebranding `/ee`, removing or rebranding Tauri desktop, deciding the fate of the Skills Manager and Templates — this is real ongoing work that doesn't have a one-time cost. |
| **Total** | **~3-4 weeks of feature work + a multi-week "what to keep, what to delete" phase** | The fork starts with more done, but the cleanup before you can build is real. |

### Honest read
Portal is faster to first useful version (week 1 you have a working web shell with one of your features). OpenWork has more SaaS-shaped scaffolding but you pay rent for it from day one in cleanup.

---

## Risks per candidate

### Portal
- **Bus factor of one.** Solo author. If they abandon, the code is yours and small enough to own — minor risk.
- **No plugin system.** You're building extension points, not adopting them. This is fine if you have a clear extension model, dangerous if you discover later that you needed one.
- **Nitro is a less-mainstream choice than Next.js.** Smaller ecosystem of recipes for auth, multi-tenancy, billing. You'd be doing more bespoke work for SaaS plumbing.
- **OpenCode SDK coupling.** If `@opencode-ai/sdk` v2 lands breaking changes, you absorb them. Mitigation: pin SDK version, wrap it behind your own adapter (the Netclode lesson from the predecessor research).

### opencode-web
- **AGPL is the elephant.** SaaS distribution under AGPL means every paying customer who self-hosts a modified version of your product gets full source under AGPL. Without a CLA-style commercial license from chris-tse, this kills the SaaS endgame.
- **19 commits total.** You are forking a sketch.
- **No slash UI, no themes** — even less inherited than Portal, so even more greenfield.

### OpenChamber
- **3.5k stars + 348 forks + active competitor product.** You will be perpetually behind upstream and people will compare your fork to their latest release. Hard to win that comparison.
- **Tauri-primary.** The web package exists and is real, but the design center is desktop. You'd be maintaining a fork where the upstream's main concern (desktop) is your secondary concern.
- **Feature bloat.** 18 themes, voice mode, branchable timeline, multi-agent worktrees, VS Code extension — you inherit all of it.
- **The official OpenCode team is shipping a desktop app (mentioned in predecessor research).** OpenChamber is partly competing with the upstream's own future plans.

### OpenWork
- **14.4k stars on a v0.11 product means rapid evolution and unstable APIs.** Forking now means choosing a moving target.
- **Backed by a startup (different.ai).** They will keep shipping competitive features. "Never merge upstream" is psychologically hard.
- **`/ee` directory exists** — need to understand the license boundary. Confirm `/ee` is also MIT, not "available source." (README says MIT for the whole repo, but `/ee` directories are conventionally not — verify this on day zero.)
- **Tauri desktop is the design center.** Your web-first endgame fights the existing UX center.

### Palot
- **Alpha label, 70 stars** — almost no community to inherit bug fixes from.
- **Electron is the wrong runtime** for browser-served SaaS. The work to gut Electron and replace with a real web server is more than greenfielding.

### OpenGUI / opencode-studio / sandboxed.sh
- See per-wrapper sections — wrong shape for a fork target. Useful as references or as dependencies.

---

## Final framing

**If you optimize for time-to-first-deploy and minimal inherited opinions → fork Portal.**
You get a clean web-first base, MIT license, mobile-first defaults, and a small enough surface area that the fork is really a seed. You build everything else, but you build it on something coherent.

**If you optimize for inheriting the most SaaS-shaped scaffolding → fork OpenWork.**
You start with `apps/web` + `apps/orchestrator` + `/ee` + permissions + SSO mention + i18n. You pay for it with a much bigger "what to keep, what to delete" phase and a more painful "never merge upstream" because there will always be tempting features landing upstream.

**If you optimize for production-polish features out of the gate (themes, diff viewer, PWA, cross-device session continuity) → fork OpenChamber.**
You skip months of polish work. You inherit a feature-complete product and either become its custodian or aggressively gut it. Best fit if your custom AI workflow UI is small enough to bolt on.

**If you optimize for code quality of the codebase you're inheriting → fork Palot.**
But only if you decide the desktop-first shape is acceptable. Otherwise its quality is wasted on the wrong target.

**If you optimize for license cleanliness on the SaaS endgame → avoid opencode-web.**
The AGPL-3.0 with optional commercial license is a future tax you don't want to pay unless you negotiate the commercial license now.

### Which optimization aligns best with the user's stated goals?

The user's six requirements compress to three constraints:
1. **Web-served from a VPS, accessible on phone/tablet** → rules out Palot, OpenGUI, makes OpenChamber and OpenWork awkward (desktop-primary), favors Portal and opencode-web.
2. **Production-grade and eventually SaaS-able** → rules out opencode-web (AGPL trap), makes OpenWork attractive (`/ee`, permissions framework) and Portal a "build the SaaS layer yourself" choice.
3. **Custom AI workflow UI to be added (chat + slash + kanban + grilling + vertical-slice planning)** → favors a base with **few opinions to fight**: Portal (no plugin system, no themes, minimal scaffolding) is easiest to add custom UI to; OpenWork (Skills Manager, Templates, permissions UI) means you negotiate around existing concepts.

These three constraints jointly point at **Portal**. OpenWork is the alternative if the SaaS-readiness scaffolding (auth, permissions, `/ee`) is worth more to you than the freedom of an empty canvas.

The clearest test: write down the five UI concepts you want to ship in your first version. If they map cleanly to OpenWork's existing concepts (Skills, Templates, Permissions, Sessions), fork OpenWork. If they don't, the existing concepts will be in your way — fork Portal.

---

## Appendix — primary sources

- [github.com/hosenur/portal](https://github.com/hosenur/portal) — Portal: web UI, React Router + Nitro + Tailwind + IntentUI + OpenCode SDK
- [github.com/chris-tse/opencode-web](https://github.com/chris-tse/opencode-web) — React 19 SPA on Vite, AGPL-3.0 dual
- [github.com/openchamber/openchamber](https://github.com/openchamber/openchamber) — multi-package: web/desktop/electron/ui/vscode/docs
- [github.com/different-ai/openwork](https://github.com/different-ai/openwork) — Tauri+web+orchestrator, `/ee`, 14.4k stars
- [github.com/itswendell/palot](https://github.com/itswendell/palot) — Electron + Bun + Hono, alpha, best-engineered
- [github.com/akemmanuel/OpenGUI](https://github.com/akemmanuel/OpenGUI) — Electron, IPC bridge SSE
- [github.com/Microck/opencode-studio](https://github.com/Microck/opencode-studio) — config manager, Next.js + Express
- [github.com/Th0rgal/openagent](https://github.com/Th0rgal/openagent) — sandboxed.sh, Rust + Next.js + SwiftUI orchestrator
- [github.com/awesome-opencode/awesome-opencode](https://github.com/awesome-opencode/awesome-opencode) — discovery hub, used to surface OpenWork and Open Agent
- [opencode-wrapper-comparison.md predecessor: opencode-ecosystem.md](opencode-ecosystem.md) — broader ecosystem context, OpenCode core analysis, alternative bases
