# OpenCode Wrapper Inventory (Exhaustive)

_Research date: 2026-04-26_
_Scope: every UI/wrapper/client/frontend/dashboard/bridge built around `sst/opencode` (a.k.a. `anomalyco/opencode`, the canonical org has been renamed). Inventory only — no comparison or recommendation._
_Predecessors: [opencode-ecosystem.md](opencode-ecosystem.md), [opencode-wrapper-comparison.md](opencode-wrapper-comparison.md)._

## Discovery methods used

1. **awesome-opencode list** — fetched `awesome-opencode/awesome-opencode` README; surfaced ~16-20 distinct UI/dashboard/bridge entries that the predecessor research had collapsed into "9 wrappers." Major adds: kcrommett/oc-web, kcrommett/oc-manager, agent-of-empires, kimaki, hcom, open-dispatch, opencode-telegram-bot, vibe-kanban, golembot, mcp-voice-interface, octto, opencode-obsidian, codenomad.
2. **OpenCode official ecosystem page** — `opencode.ai/docs/ecosystem/` exists and lists Portal, OpenChamber, OpenWork, CodeNomad, opencode-obsidian, plus Neovim variants and several developer tools (kimaki, ocx, ai-sdk-provider, agentic, opencode-agents, opencode-plugin-template, micode, octto). New vs predecessor: CodeNomad, opencode-obsidian, octto, micode.
3. **GitHub topic `opencode`** — mostly noise (multi-agent tools that mention OpenCode alongside Claude Code/Codex). Real OpenCode-specific wrappers surfaced: cmux, paseo, plannotator, hapi (Chinese), tokscale, hcom.
4. **GitHub topic `opencode-ai`** — real adds: openchamber (already known), Codeman (Ark0N), conduit (dibstern), pk-opencode-webui (prokube), code-on-incus (mensfeld), code-container (kevinMEH), opencode-multiplexer-rs, leapmux.
5. **GitHub topic `opencode-client`** / **`opencode-wrapper`** — both topics empty. No usable signal.
6. **GitHub topic `opencode-ui`** — only 3 repos: openchamber, code-xhyun/disunday (Discord), milisp/opencode-gui (Tauri).
7. **GitHub code search for `'@opencode-ai/sdk'` imports** — 30+ repos, mostly plugins. New genuine wrappers: HexaField/opencode-web-ui, marmotz-dev/opencode-ui, HNGM-HP/opencode-bridge, opencode-multiplexer (millerjes37 — fork that adds multi-client server support).
8. **HN + Reddit + keyword search** — surfaced Gigacode (`rivet-dev/sandbox-agent`), opencode-vibe (joelhooks), opensync (waynesutton), oh-my-opencode-dashboard (WilliamJudge94), Wil363666/OpenCode-Session-Manager, GNITOAHC/opencode-session, icysaintdx/OpenCode-Config-Manager, AGTX, dzackgarza/opencode-manager, multiple Telegram bots (grinev, Tommertom, vineetkishore01, huynle, ajoslin), ominiverdi/opencode-chat-bridge, georgi/opencode-mobile, Shahfarzane/opencode-mobile, doza62/opencode-mobile, thalesgelinger/opencode-mobile, jonbeckman/opencode-mobile, grapeot/opencode_ios_client, easychen/openMode, chriswritescode-dev/opencode-manager. npm dependents page (`npmjs.com/browse/depended/@opencode-ai/sdk`) returned 403 — could not enumerate via that channel; mitigated by exhaustive code search instead.

**Note on `sst/opencode` vs `anomalyco/opencode`:** GitHub now redirects `sst/opencode` to `anomalyco/opencode` (verified — same repo, 149,793 stars, dev branch active). The canonical home of active development is `anomalyco/opencode`. The Go-language `opencode-ai/opencode` is a separate, **archived** (last push 2025-09-18) earlier project — not the same product. Wrappers that target `opencode-ai/opencode` (the Go one) are excluded from this inventory.

## Inventory table

Sorted by category, then stars descending. All metadata verified via `gh api` on 2026-04-26 unless marked "(unverified)".

| # | Name | Repo URL | Stars | Last commit | License | Type | Stack | Web/Desktop/TUI/Mobile | Status | One-line purpose |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | OpenWork | https://github.com/different-ai/openwork | 14,356 | 2026-04-26 | NOASSERTION (README says MIT) | UI wrapper (desktop+web) | TS/Rust, Tauri+pnpm+Turbo+Bun, `apps/{desktop,app,orchestrator}`, `/ee` | Desktop primary, web secondary | Active | Open-source alternative to Claude Cowork built for teams, powered by opencode |
| 2 | OpenChamber | https://github.com/openchamber/openchamber | 3,466 | 2026-04-26 | MIT | UI wrapper (multi-platform) | TS, Tauri+Vite/React, packages: web/desktop/electron/ui/vscode/docs | Desktop+Web+VS Code | Active | Desktop and web interface for OpenCode AI agent |
| 3 | nickjvandyke/opencode.nvim | https://github.com/nickjvandyke/opencode.nvim | 3,268 | 2026-04-24 | MIT | TUI/editor plugin | Lua, Neovim | TUI/editor | Active | Editor-aware Neovim plugin for OpenCode prompts |
| 4 | Agent of Empires (njbrake) | https://github.com/njbrake/agent-of-empires | 1,688 | 2026-04-25 | MIT | UI wrapper (TUI+web) | Rust+TS, tmux+git worktrees+Docker | Web+TUI (mobile-friendly) | Active | TUI/web manager for multiple OpenCode/Claude/Codex agents in tmux |
| 5 | CodeNomad | https://github.com/NeuralNomadsAI/CodeNomad | 1,338 | 2026-04-26 | MIT | UI wrapper (multi-platform) | TS | Desktop+Web+Mobile+Remote | Active | "Command center" multi-platform client billed for desktop/web/mobile |
| 6 | sudo-tee/opencode.nvim | https://github.com/sudo-tee/opencode.nvim | 775 | 2026-04-24 | Apache-2.0 | TUI/editor frontend | Lua, Neovim | TUI/editor | Active | Neovim frontend chat UI for OpenCode (different author from #3) |
| 7 | opencode-obsidian | https://github.com/mtymek/opencode-obsidian | 764 | 2026-02-23 | MIT | UI wrapper (editor) | TS, Obsidian plugin | Desktop (inside Obsidian) | Slow | Embeds OpenCode AI assistant in Obsidian's sidebar |
| 8 | opencode-manager (chriswritescode) | https://github.com/chriswritescode-dev/opencode-manager | 524 | 2026-04-25 | MIT | UI wrapper (web/PWA) | TS, PWA, Docker | Web (mobile-first) | Active | Mobile-first PWA for managing multiple OpenCode agents |
| 9 | Portal (hosenur) | https://github.com/hosenur/portal | 596 | 2026-04-04 | MIT | UI wrapper (web) | TS, React Router+Nitro+Tailwind+IntentUI, Bun | Web (mobile-first) | Active | Mobile-first batteries-included web UI for sst/opencode |
| 10 | opencode-telegram-bot (grinev) | https://github.com/grinev/opencode-telegram-bot | 532 | 2026-04-26 | MIT | Mobile client (Telegram) | TS | Mobile (Telegram) | Active | Run/monitor OpenCode tasks from Telegram on the phone |
| 11 | opencode-studio (Microck) | https://github.com/Microck/opencode-studio | 320 | 2026-04-07 | none | UI wrapper (config GUI) | TS, Next.js 16 + Express | Web (local) | Active | GUI for managing OpenCode config (MCP, skills, plugins, auth) — not a chat shell |
| 12 | OCCM (icysaintdx) | https://github.com/icysaintdx/OpenCode-Config-Manager | 357 | 2026-03-28 | none | UI wrapper (config GUI) | Python | Desktop | Active | Visual config manager for OpenCode + Oh My OpenCode |
| 13 | Codeman (Ark0N) | https://github.com/Ark0N/Codeman | 337 | 2026-04-23 | MIT | UI wrapper (web) | TS, tmux + WebUI | Web | Active | Manage Claude Code & OpenCode tmux sessions in a web UI |
| 14 | OpenSync (waynesutton) | https://github.com/waynesutton/opensync | 354 | 2026-02-23 | MIT | Dashboard (cloud-sync) | TS | Web | Slow | Cloud-synced dashboards tracking OpenCode + Claude Code sessions |
| 15 | OC Monitor Share | https://github.com/Shlomob/ocmonitor-share | 290 | 2026-04-12 | MIT | Dashboard (CLI) | Python | TUI | Active | CLI tool for monitoring/analyzing OpenCode usage |
| 16 | oh-my-opencode-dashboard | https://github.com/WilliamJudge94/oh-my-opencode-dashboard | 258 | 2026-03-14 | none | Dashboard (web) | TS | Web | Slow | Local read-only dashboard tracking OpenCode + Oh-My-OpenCode agents |
| 17 | golembot (0xranx) | https://github.com/0xranx/golembot | 261 | 2026-04-12 | MIT | Communication bridge | TS | Multi-channel (Slack/Discord/Telegram/Feishu/etc.) | Active | Bridge OpenCode/Cursor/Claude/Codex to chat platforms with skills |
| 18 | hcom (aannoo) | https://github.com/aannoo/hcom | 239 | 2026-04-24 | MIT | TUI dashboard | Rust | TUI | Active | Multi-agent terminal coordination — agents message each other |
| 19 | opencode-vibe (joelhooks) | https://github.com/joelhooks/opencode-vibe | 174 | 2026-01-16 | none | UI wrapper (web) | TS, Next.js 16 + RSC + SSE | Web | Slow | Next.js 16 web UI for OpenCode with streaming + RSC |
| 20 | opencode_ios_client (grapeot) | https://github.com/grapeot/opencode_ios_client | 139 | 2026-04-24 | none | Mobile client (iOS native) | Swift | Mobile (iOS) | Active | Native iOS client for OpenCode |
| 21 | openMode (easychen) | https://github.com/easychen/openMode | 133 | 2025-11-05 | MIT | Mobile client (cross-platform) | Dart, Flutter | Mobile | Stale | Flutter mobile app for OpenCode |
| 22 | opencode-bridge (HNGM-HP) | https://github.com/HNGM-HP/opencode-bridge | 125 | 2026-04-25 | GPL-3.0 | Communication bridge | TS | Multi-channel | Active | Enterprise OpenCode wrapper integrating into IM platforms (Chinese-language) |
| 23 | guard22/opencode-multi-auth-codex | https://github.com/guard22/opencode-multi-auth-codex | 122 | 2026-04-23 | none | Plugin/utility | TS | n/a | Active | Multi-account auth plugin for OpenCode/Codex — rotates keys |
| 24 | opencode-web (chris-tse) | https://github.com/chris-tse/opencode-web | 120 | 2025-07-15 | AGPL-3.0 | UI wrapper (web) | TS, React 19+Vite | Web | Stale | Web-based UI for the OpenCode API (AGPL-3.0 + commercial dual) |
| 25 | doza62/opencode-mobile | https://github.com/doza62/opencode-mobile | 99 | 2026-02-25 | MIT | Mobile client | TS, React Native | Mobile (iOS/Android/Web) | Slow | RN client for OpenCode across iOS/Android/Web |
| 26 | ai-sdk-provider-opencode-sdk | https://github.com/ben-vargas/ai-sdk-provider-opencode-sdk | 89 | 2026-04-14 | MIT | SDK/library | TS | n/a | Active | Vercel AI SDK community provider for OpenCode |
| 27 | Palot (ItsWendell) | https://github.com/ItsWendell/palot | 70 | 2026-04-20 | MIT | Desktop app | TS, Electron 40+React 19+Bun+Hono | Desktop | Active | Electron multi-agent desktop GUI for OpenCode (alpha) |
| 28 | ominiverdi/opencode-chat-bridge | https://github.com/ominiverdi/opencode-chat-bridge | 69 | 2026-04-14 | MIT | Communication bridge | TS | Multi-channel (Matrix/Slack/Mattermost/WhatsApp/Discord) | Active | Bridge OpenCode to many chat platforms with permissions |
| 29 | shuv1337/oc-web (orig. kcrommett) | https://github.com/shuv1337/oc-web | 63 | 2025-12-19 | MIT | UI wrapper (web) | TS, TanStack Start+React+Bun | Web | Stale | The original community-built web UI for OpenCode |
| 30 | Shahfarzane/opencode-mobile | https://github.com/Shahfarzane/opencode-mobile | 42 | 2026-01-15 | MIT | Mobile client (iOS native) | TS, Expo+React Native | Mobile (iOS) | Slow | Native iOS app — QR pairing, Face ID, terminal, git ops |
| 31 | Tommertom/opencode-telegram | https://github.com/Tommertom/opencode-telegram | 38 | 2026-01-07 | MIT | Mobile client (Telegram) | TS | Mobile (Telegram) | Slow | AI Telegram bot wrapping CLI coding assistants |
| 32 | leapmux | https://github.com/leapmux/leapmux | 37 | 2026-04-26 | NOASSERTION | UI wrapper (web/multiplexer) | HTML | Web | Active | AI coding agent multiplexer (web entrypoint) |
| 33 | felixAnhalt/opencode-worktree-session | https://github.com/felixAnhalt/opencode-worktree-session | 30 | 2026-01-09 | Apache-2.0 | Plugin/utility | TS | n/a | Stale | Auto git worktree manager per OpenCode session |
| 34 | shuv1337/oc-manager (orig. kcrommett) | https://github.com/shuv1337/oc-manager | 29 | 2026-02-05 | MIT | TUI dashboard | TS, Bun + @opentui/react | TUI | Slow | TUI for inspecting/pruning OpenCode metadata on disk |
| 35 | Tommertom/opencoder-telegram-plugin | https://github.com/Tommertom/opencoder-telegram-plugin | 29 | 2026-02-05 | none | Plugin/utility | JS | n/a | Slow | OpenCode plugin for Telegram notifications |
| 36 | OpenGUI (akemmanuel) | https://github.com/akemmanuel/OpenGUI | 26 | 2026-04-20 | MIT | Desktop app | TS, Electron+React+Bun | Desktop | Active | Electron command center with multi-project workspaces, prompt queue, voice |
| 37 | occtx (hungthai1401) | https://github.com/hungthai1401/occtx | 24 | 2025-09-19 | MIT | CLI utility | Go | TUI | Stale | Switch between multiple opencode.json contexts |
| 38 | Davasny/opencode-telegram-notification-plugin | https://github.com/Davasny/opencode-telegram-notification-plugin | 22 | 2025-12-27 | none | Plugin/utility | TS | n/a | Stale | Notify on Telegram when OpenCode sessions complete |
| 39 | bjesus/opencode-web | https://github.com/bjesus/opencode-web | 20 | 2025-10-21 | none | UI wrapper (web) | TS, SolidJS | Web (mobile-friendly) | Stale | Modern responsive SolidJS web UI for OpenCode |
| 40 | bobum/open-dispatch | https://github.com/bobum/open-dispatch | 20 | 2026-02-08 | none | Communication bridge | JS, Node | Multi-channel (Slack/Teams/Discord) | Slow | Local Node bridge from chat platforms to local agent CLIs |
| 41 | prokube/pk-opencode-webui | https://github.com/prokube/pk-opencode-webui | 19 | 2026-04-24 | MIT | UI wrapper (web) | TS | Web | Active | Prefix-aware Web UI for OpenCode (works behind reverse proxies, Kubeflow) |
| 42 | agentserver | https://github.com/agentserver/agentserver | 18 | 2026-04-17 | MIT | Server wrapper / orchestrator | Go + React, Helm/Compose, gVisor | Web | Active | Self-hosted multi-user OpenClaw/OpenCode in browser sandboxes |
| 43 | opencode-sandbox (fabianlema) | https://github.com/fabianlema/opencode-sandbox | 16 | 2026-02-25 | none | Server wrapper / sandbox | Shell, Docker | Container | Slow | Daily-updated Docker image with OpenCode CLI + dev tools |
| 44 | nigel-dev/opencode-mission-control | https://github.com/nigel-dev/opencode-mission-control | 14 | 2026-04-20 | MIT | Plugin/utility | TS | n/a | Active | OpenCode plugin for parallel sessions in isolated git worktrees |
| 45 | code-xhyun/disunday | https://github.com/code-xhyun/disunday | 13 | 2026-02-23 | MIT | Communication bridge (Discord) | TS | Multi-channel (Discord) | Slow | Control OpenCode from Discord channels |
| 46 | JUVOJustin/opencode-ddev | https://github.com/JUVOJustin/opencode-ddev | 12 | 2026-03-01 | none | Plugin/utility | TS | n/a | Slow | OpenCode plugin to run shell commands inside DDEV containers |
| 47 | huynle/opencode-telegram | https://github.com/huynle/opencode-telegram | 11 | 2026-01-04 | MIT | Mobile client (Telegram) | TS | Mobile (Telegram) | Stale | Telegram bot orchestrating multiple OpenCode instances via forum topics |
| 48 | georgi/opencode-mobile | https://github.com/georgi/opencode-mobile | 9 | 2026-04-02 | none | Mobile client | TS | Mobile | Active | Mobile app for OpenCode |
| 49 | GNITOAHC/opencode-session | https://github.com/GNITOAHC/opencode-session | 9 | 2026-01-18 | MIT | UI wrapper (session viewer) | TS | Web | Stale | View & manage OpenCode sessions, detect orphans |
| 50 | marmotz-dev/opencode-ui | https://github.com/marmotz-dev/opencode-ui | 8 | 2025-11-12 | NOASSERTION | Desktop app | TS | Desktop (Linux/Win/macOS via AppImage/exe/dmg) | Stale | Cross-platform desktop client for OpenCode |
| 51 | conduit (dibstern) | https://github.com/dibstern/conduit | 7 | 2026-04-23 | MIT | UI wrapper (web/PWA) | TS | Web (any device, push notifications) | Active | Web UI for OpenCode with push notifications, zero-install |
| 52 | milisp/opencode-gui | https://github.com/milisp/opencode-gui | 6 | 2025-10-01 | MIT | Desktop app | TS, Tauri | Desktop | Stale | Tauri GUI for OpenCode |
| 53 | Keeeeeeeks/opencode-dashboard | https://github.com/Keeeeeeeks/opencode-dashboard | 6 | 2026-03-10 | none | Dashboard (web) | TS, Next.js | Web | Slow | Mini-kanban board for AI agents (OpenClaw + OpenCode + others) |
| 54 | ajoslin/opencode-telegram-mirror | https://github.com/ajoslin/opencode-telegram-mirror | 6 | 2026-02-04 | none | Mobile client (Telegram) | TS | Mobile (Telegram) | Slow | Mirror OpenCode sessions to Telegram topics |
| 55 | cozuXI/opencode_webui_cli | https://github.com/cozuXI/opencode_webui_cli | 5 | 2026-04-26 | Apache-2.0 | UI wrapper (web/CLI) | TS | Web | Active | Web UI wrapper around the OpenCode CLI |
| 56 | HexaField/opencode-web-ui | https://github.com/HexaField/opencode-web-ui | 4 | 2026-02-11 | MIT | UI wrapper (web) | TS | Web | Slow | Minimal web UI for OpenCode |
| 57 | Wil363666/OpenCode-Session-Manager | https://github.com/WillyWillsMedia/OpenCode-Session-Manager | 2 | 2026-01-06 | none | UI wrapper (web/session GUI) | Python | Web | Stale | Manage and delete OpenCode sessions |
| 58 | thalesgelinger/opencode-mobile | https://github.com/thalesgelinger/opencode-mobile | 1 | 2026-01-28 | none | Mobile client | TS | Mobile | Stale | OpenCode mobile client (very early) |
| 59 | vineetkishore01/Opencode-Telegram | https://github.com/vineetkishore01/Opencode-Telegram | 1 | 2026-04-01 | none | Mobile client (Telegram) | TS | Mobile (Telegram) | Active | Telegram bot to control OpenCode |
| 60 | jonbeckman/opencode-mobile | https://github.com/jonbeckman/opencode-mobile | 2 | 2025-12-29 | none | Mobile client | TS | Mobile | Stale | Early mobile client (no description) |
| 61 | dzackgarza/opencode-manager | https://github.com/dzackgarza/opencode-manager | 0 | 2026-04-03 | none | CLI utility | Python | TUI | Active | Bun-based CLI automation for OpenCode sessions |
| 62 | thereal4th/AGTX | https://github.com/thereal4th/AGTX | 0 | 2026-03-21 | Apache-2.0 | UI wrapper (TUI) | n/a | TUI | Slow | Multi-session AI coding terminal manager (OpenCode + others) |
| 63 | millerjes37/opencode-multiplexer | https://github.com/millerjes37/opencode-multiplexer | 0 | 2026-04-26 | MIT | Server wrapper (fork) | TS | TUI/server | Active | OpenCode fork: multi-client server, several TUI clients to one server |

**Adjacent — included but explicitly different category (NOT chat-shell wrappers):**

| # | Name | Repo URL | Stars | Last commit | License | Type | Web/Desktop/TUI | Status | One-line purpose |
|---|---|---|---|---|---|---|---|---|---|
| 64 | sandboxed.sh (Th0rgal) | https://github.com/Th0rgal/sandboxed.sh | 397 | 2026-04-25 | none | Server wrapper / orchestrator | Web (Next.js) + iOS native + Rust backend | Active | Self-hosted orchestrator for AI agents in isolated systemd-nspawn workspaces |
| 65 | Sandbox Agent / Gigacode | https://github.com/rivet-dev/sandbox-agent | 1,327 | 2026-03-30 | Apache-2.0 | Server wrapper / SDK | Web/CLI | Active | Run coding agents in sandboxes, control over HTTP — Gigacode reuses opencode UI |
| 66 | code-on-incus (mensfeld) | https://github.com/mensfeld/code-on-incus | 445 | 2026-04-24 | MIT | Server wrapper / sandbox | Python, Incus | Container | Active | Per-agent isolated VMs with root, Docker, systemd |
| 67 | tokscale (junhoyeo) | https://github.com/junhoyeo/tokscale | 2,224 | 2026-04-26 | MIT | Dashboard (CLI+leaderboard) | Rust, CLI+web | TUI/Web | Active | Token-usage tracker across OpenCode/Claude/Codex/many |
| 68 | kimaki (remorses) | https://github.com/remorses/kimaki | 1,059 | 2026-04-24 | MIT | Communication bridge | TS, Discord | Multi-channel (Discord) | Active | Discord-native OpenCode controller, project=channel, session=thread |
| 69 | ocx (kdcokenny) | https://github.com/kdcokenny/ocx | 637 | 2026-04-19 | MIT | CLI/extension manager | TS | CLI | Active | OpenCode extension manager with portable, isolated profiles |
| 70 | mcp-voice-interface (shantur) | https://github.com/shantur/jarvis-mcp | 77 | 2025-09-28 | none | Voice interface | JS | Web | Stale | Voice control for AI assistants compatible with OpenCode |

## Per-project notes

Only including notes where there's something distinctive to say. For a row not appearing here, the table description is sufficient.

**OpenWork (different-ai/openwork) — 14,356 stars.** Tauri desktop is the headline product but the monorepo includes `apps/web`, `apps/orchestrator`, an `openwork-server`, a separate `opencode-router`, an `/ee` enterprise directory, permissions-audit flow, SSO mention for the enterprise plan, and i18n in 5 languages (EN/JA/ZH/VI/PT-BR). Backed by a startup, not solo. By far the most-starred OpenCode-built product and the main miss in the predecessor research.

**OpenChamber (openchamber/openchamber) — 3,466 stars.** Multi-package monorepo: web, desktop (Tauri), electron, ui, vscode, docs. Real packages/web (full-stack Vite+Node, not static SPA). Self-update from UI, Cloudflare tunnel + QR onboarding, integrated terminal with per-directory sessions, branchable timeline, multi-agent worktrees, voice mode, 18+ themes. Single UI password, no per-user model. Linux/Windows desktop on roadmap.

**nickjvandyke/opencode.nvim — 3,268 stars.** The dominant Neovim integration (note: `NickvanDyke/opencode.nvim` is the same repo, redirected). Uses `:diffpatch` for proposed changes side-by-side. Distinct from sudo-tee/opencode.nvim — the latter is a chat-frontend, this one is an "in-flow" prompt enhancer.

**Agent of Empires (njbrake/agent-of-empires) — 1,688 stars.** Rust+TS implementation of "many agents in tmux with worktrees, accessible from web for mobile." Supports OpenCode but also Claude Code, Codex CLI, Gemini CLI, Pi.dev, Copilot CLI, Mistral Vibe, Factory Droid. Closest TUI competitor to a "phone-driven" workflow.

**CodeNomad (NeuralNomadsAI/CodeNomad) — 1,338 stars.** Marketed as desktop+web+mobile+remote command center. Recent (Apr 2026) but rapid growth; corporate-org-shaped (NeuralNomadsAI). Surfaces only on the official ecosystem page — not on awesome-opencode at time of research, which is itself notable.

**sudo-tee/opencode.nvim — 775 stars.** Different from #3 — this one is a full chat frontend inside Neovim that captures editor context, maintains persistent sessions tied to the workspace.

**Portal (hosenur/portal) — 596 stars.** React Router + Nitro + IntentUI + Tailwind, Bun-pinned. Mobile-first explicit. Uses `@opencode-ai/sdk`. Single solo author; clean monorepo `apps/web` + `packages/cli`. Predecessor research treated this as the most fork-friendly seed.

**opencode-manager (chriswritescode-dev) — 524 stars.** Mobile-first PWA with Docker deployment, slash commands, @file mentions, Plan/Build modes, Mermaid rendering. Not the same as `dzackgarza/opencode-manager` (Python CLI, 0 stars).

**opencode-telegram-bot (grinev) — 532 stars.** The dominant Telegram client. Scheduled tasks support, "lightweight OpenClaw alternative" framing.

**opencode-studio (Microck) — 320 stars.** Confirmed config GUI, NOT a chat shell. Toggles MCP servers, edits skills, manages plugins, handles auth. `opencodestudio://` deep-link install protocol.

**OCCM (icysaintdx) — 357 stars.** Python visual config manager specifically targeting OpenCode + Oh My OpenCode. Bilingual EN/ZH UI. Same category as opencode-studio but different stack.

**Codeman (Ark0N) — 337 stars.** Web UI on top of tmux sessions running Claude Code & OpenCode. Different from "just a wrapper" — manages the underlying tmux multiplexing.

**OpenSync (waynesutton) — 354 stars.** Cloud-synced (not local-only) dashboards for OpenCode + Claude Code with semantic search and eval-dataset export. Distinct value proposition: cross-machine persistence.

**OC Monitor Share (Shlomob) — 290 stars.** CLI-only usage monitoring/analysis. Not a wrapper, but lives in the same orbit.

**oh-my-opencode-dashboard (WilliamJudge94) — 258 stars.** Tied specifically to Oh-My-OpenCode (`code-yeongyu/oh-my-openagent`, formerly oh-my-opencode). Reads `.sisyphus/boulder.json` plan files.

**golembot (0xranx) — 261 stars.** Skills system + IM-channel adapters across Slack/Telegram/Discord/Feishu/DingTalk/WeCom/WeChat for OpenCode + Cursor + Claude Code + Codex. Most channels of any bridge in this list.

**hcom (aannoo) — 239 stars.** Rust-implemented multi-agent coordination layer — agents in separate terminals can message each other, detect file edit collisions, spawn/fork/resume agents. Supports OpenCode + Claude Code + Gemini CLI + Codex.

**opencode-vibe (joelhooks) — 174 stars.** Last commit Jan 2026 — has slowed. Notable as an early Next.js 16 + RSC implementation. Joel Hooks (egghead.io) is a recognizable name.

**opencode_ios_client (grapeot) — 139 stars.** Genuinely native Swift iOS app. Distinct from Expo/RN approaches.

**openMode (easychen) — 133 stars.** Only Flutter/Dart implementation in this list. Last commit Nov 2025 — drifting toward stale.

**HNGM-HP/opencode-bridge — 125 stars.** Chinese-language enterprise wrapper integrating OpenCode into IM platforms. GPL-3.0 (the only GPL license in this list).

**guard22/opencode-multi-auth-codex — 122 stars.** Plugin (not UI) for rotating multiple API keys across OpenCode/Codex sessions. Useful adjacent.

**chris-tse/opencode-web — 120 stars.** AGPL-3.0 + commercial dual license. Last commit 2025-07-15 — effectively stale despite the AGPL framing in predecessor research treating it as alive.

**doza62/opencode-mobile — 99 stars.** React Native targeting iOS/Android/Web. Includes Expo push notifications.

**Palot (ItsWendell) — 70 stars.** Best-engineered codebase per the predecessor's review (Biome, Changesets, Turborepo, shadcn/ui, Jotai, TanStack everywhere). Electron-only (browser-mode is dev only). Alpha.

**ominiverdi/opencode-chat-bridge — 69 stars.** Bridges Matrix + Slack + Mattermost + WhatsApp + Discord with permission-based security. Most enterprise-shaped of the chat bridges.

**shuv1337/oc-web — 63 stars.** "The original community-built web UI for OpenCode" per its own README. Repo was renamed/transferred from `kcrommett/opencode-web` to `shuv1337/oc-web`. Last commit Dec 2025 — stale, but historically significant.

**Shahfarzane/opencode-mobile — 42 stars.** Distinct features: QR pairing for connect, Face ID auth, terminal access, git ops in-app. Expo + React Native.

**Tommertom/opencode-telegram — 38 stars.** The other Tommertom repo (`opencoder-telegram-plugin`) is the OpenCode-side companion plugin — they're a pair, not duplicates.

**leapmux — 37 stars.** "AI Coding Agent Multiplexer" — HTML-language repo. Web-served multiplexer entry point.

**OpenGUI (akemmanuel) — 26 stars.** Electron with Whisper voice input, prompt queue, multi-project workspaces. Less polished than Palot per predecessor review.

**conduit (dibstern) — 7 stars.** Stated explicit advantages: any device, push notifications, zero install. Small but the tagline differs from the others in this category.

**marmotz-dev/opencode-ui — 8 stars.** Distinct in shipping AppImage/.exe/.dmg across all three OS — more cross-platform polish than star count suggests.

**millerjes37/opencode-multiplexer — 0 stars but a fork.** Notable because it's a *fork of OpenCode itself* that adds multi-client server support (multiple TUI clients → one persistent server). Different mechanism than every other entry, which all connect to upstream `opencode serve`.

**Adjacent set (sandboxed.sh, Sandbox Agent/Gigacode, code-on-incus, tokscale, kimaki, ocx, mcp-voice-interface):** These are not "OpenCode wrappers" in the chat-shell sense, but they're orchestrators, sandboxes, dashboards, or bridges that materially extend or wrap OpenCode at a different layer. Including them so the inventory is honest about what surrounds OpenCode without conflating categories.

## Confidence note

**Confidence that this list is exhaustive: medium-high (~85%).** Justification:

- Every channel that returned a real signal was followed and verified via `gh api`.
- All previously-known wrappers (OpenChamber, Portal, Palot, OpenGUI, opencode-web, opencode-studio, OpenWork, agentserver, sandboxed.sh) confirmed to exist and remain active or have a known recent state.
- The major previous miss (OpenWork) is captured along with its true scale.
- New mobile clients alone went from 0 in predecessor research to 8 distinct projects here.
- Multiple discovery channels cross-validated the same set of projects, which is a positive signal that the field is well-covered.

**What might still be missing (~15% gap):**
- **Private/closed-source wrappers** — anything not on GitHub is invisible to this method (Gigacode itself was found via HN and X, not GitHub topic search; similar projects could exist).
- **Repos using non-obvious names** — projects that don't include "opencode" in name or description and don't tag the topic. The code-search of `'@opencode-ai/sdk'` imports partially mitigates this, but only catches TS/JS users of the SDK; Go SDK consumers (`opencode-sdk-go`) are not enumerated here.
- **npm dependents** — the npmjs.com browse-by-dependent page returned 403; could not enumerate. Mitigated by code search but not 100%.
- **Fresh repos created in the last days/weeks** — rapid growth in this space; the list will date quickly.
- **Asian-language ecosystem (Chinese/Japanese)** — surfaced one (HNGM-HP/opencode-bridge), CodeNomad team is plausibly Asia-based, but search bias toward English-language results means potential undercounting of zh/ja repos.
- **Discord showcase channel** — could not access OpenCode's Discord directly; relied on indexed mentions. Anything posted there but not indexed by search engines is invisible.
- **Forks that are real new products** — `millerjes37/opencode-multiplexer` is one example. Hard to enumerate forks systematically; GitHub's fork API returns thousands and most are not active products.

**Limits of GitHub search:** GitHub topic and code-search rate-limit aggressively, search relevance is fuzzy, and topic adoption is voluntary (GitHub itself notes the `opencode-client` and `opencode-wrapper` topics are unused). Code search caps at 1,000 results per query, so popular imports may have a long tail of unindexed users. For maximum confidence the list should be re-run weekly.

## Removed / dead / misclassified projects

From the predecessor research:

- **opencode-web (chris-tse)** — verified to exist, but **last commit 2025-07-15** (9+ months ago). Predecessor classified as "Active." Reclassified here as **Stale**.
- **opencode-studio (Microck)** — verified, active. Predecessor categorized correctly as "different category" (config GUI, not chat shell). Confirmed.
- **`sst/opencode`** — repo URL still works but **redirects to `anomalyco/opencode`**. The org rename is complete. Anyone with bookmarks should update.
- **`opencode-ai/opencode` (Go-language)** — separate, **archived** project (last push 2025-09-18). NOT the same product as `sst/opencode`/`anomalyco/opencode`. Wrappers around the Go variant (e.g., older "opencode TUI" Go references) are out of scope for this inventory.
- **OpenChamber** — predecessor referenced `btriapitsyn/openchamber` for the URL; that URL **redirects to `openchamber/openchamber`**. Not dead, just renamed/transferred.
- **agentserver** — verified, active (v0.40.0, 2026-04-17). Star count low (18) but the project is real and the only one in its category.
- **opencode-sandbox (fabianlema)** — verified, last commit 2026-02-25 (Slow). Daily auto-update claim no longer accurate.

No previously-listed project was found to be archived or deleted outright.

## Appendix — sources

- [github.com/awesome-opencode/awesome-opencode](https://github.com/awesome-opencode/awesome-opencode) — primary discovery hub
- [opencode.ai/docs/ecosystem/](https://opencode.ai/docs/ecosystem/) — official ecosystem page
- [github.com/topics/opencode](https://github.com/topics/opencode), [opencode-ai](https://github.com/topics/opencode-ai), [opencode-ui](https://github.com/topics/opencode-ui)
- [news.ycombinator.com/item?id=46612494](https://news.ycombinator.com/item?id=46612494) — Show HN: OpenWork
- [news.ycombinator.com/item?id=46912682](https://news.ycombinator.com/item?id=46912682) — Show HN: Gigacode
- [github.com/sst/opencode](https://github.com/sst/opencode) → redirects to [anomalyco/opencode](https://github.com/anomalyco/opencode)
- All individual repos in the inventory above (verified one-by-one via `gh api repos/...`).
