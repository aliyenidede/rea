# OpenCode Ecosystem Research

_Research date: 2026-04-26_
_Purpose: inform a design decision for a self-hosted, web-accessible AI coding environment_

## TL;DR

- **OpenCode is TypeScript first, not Go.** The core server/CLI is TypeScript (Bun runtime, ~58% TS in repo). Only the TUI is Go (Bubble Tea). Multiple verified sources confirm this — the user's assumption that "OpenCode is Go" is the most common misconception about the project.
- **It already has a real headless mode.** `opencode serve` exposes an OpenAPI 3.1 HTTP server with sessions, messages, files, tools, and event streams. There are official auto-generated SDKs (Go and TypeScript) and the architecture is explicitly client/server. Building a custom shell on top is the supported path, not a hack.
- **The wrapper ecosystem is real and growing.** OpenChamber (3.5k stars, Tauri+web+VS Code), Palot (Electron desktop, alpha), Portal (mobile-first PWA, 596 stars), OpenGUI, opencode-web, and opencode-studio all already exist. Almost all of them follow the same pattern: connect to a separately-run `opencode serve`, do not fork the core.
- **Multi-user / SaaS is not a solved problem.** OpenCode does NOT sandbox the agent. There was an unauthenticated RCE in 2025 (fixed in 1.1.10/1.1.15). For a multi-user server you need extra layers: agentserver (Helm + gVisor), Docker sandbox templates, or a Netclode-style Kata-microVM design.
- **License is MIT.** SaaS-able later — no AGPL friction.

---

## 1. OpenCode core

### Language & runtime
- **Primary language:** TypeScript (~58.6% of repo), with MDX docs (~37.6%), CSS, and a small Rust portion. Source: GitHub repo language stats.
- **TUI client:** Go (Bubble Tea). Requires Go 1.24+ to build. This is the source of the "OpenCode is Go" confusion — it's only the terminal UI.
- **Runtime:** Bun (preferred). Node.js works for plugins but has "rough edges" per OpenCode docs. ([Issue #2143](https://github.com/sst/opencode/issues/2143) directly addresses "why TypeScript and npm".)

### Architecture
- **Client/server, by design.** A persistent background server process holds session state in SQLite; clients (TUI, desktop, web, VS Code extension) all connect to it via HTTP / SSE.
- **Sessions survive disconnects** (terminal close, SSH drop, machine sleep). This is a deliberate design choice — not bolted on.
- **LSP integrated out of the box.** Multiple language server diagnostics piped into the agent's context.
- Source: [opencode.ai/docs/server](https://opencode.ai/docs/server/), [DeepWiki: sst/opencode](https://deepwiki.com/sst/opencode).

### Headless mode / library API
- **`opencode serve`** starts a standalone HTTP server. Flags: `--port` (default 4096), `--hostname` (default 127.0.0.1), `--cors`, `--mdns`.
- **OpenAPI 3.1 spec** published at `http://localhost:4096/doc`. Used to auto-generate SDKs via Stainless.
- **Endpoints cover:** projects/sessions (CRUD, fork, nest, share, abort, revert), messages (send prompts, history), files (search/read/browse), tools (with JSON schemas), config, providers/models, LSP/MCP/formatter status, global event stream.
- **Auth:** HTTP basic auth via `OPENCODE_SERVER_PASSWORD` (and optional `OPENCODE_SERVER_USERNAME`, default `opencode`).
- **Concurrency:** Multiple sessions via `POST /session`. No documented hard limit. Forking and parent/child nesting are first-class.
- Source: [opencode.ai/docs/server](https://opencode.ai/docs/server/).

### Plugin / extension system
- **Plugins are JS/TS modules.** Export plugin functions that receive a context (project info, cwd, git worktree, OpenCode SDK client, Bun shell) and return hooks.
- **What plugins can do:**
  - Custom tools (Zod-validated args) — usable by the agent like built-ins
  - Lifecycle hooks: commands, files, sessions (create/compact/delete/error), messages, permissions, LSP, shell, tools, TUI, todos, custom events (~25+ events)
  - Before/after wrap existing tool execution
  - Inject env vars into shell calls
  - Custom session compaction logic
  - Custom auth providers
  - npm dependencies via package.json (Bun installs at startup)
- **Loading order:** global config → project config → `~/.config/opencode/plugins/` → `.opencode/plugins/`.
- **No fork required** for any of the above. This is a meaningful capability — many "agent shells" force forks.
- Sources: [opencode.ai/docs/plugins](https://opencode.ai/docs/plugins/), [opencode.cafe](https://www.opencode.cafe/) (community marketplace), [Lushbinary plugin guide](https://lushbinary.com/blog/opencode-plugin-development-custom-tools-hooks-guide/).

### Multi-provider & OpenRouter specifically
- Built-in support for Claude, OpenAI, Google, OpenRouter, local models (Ollama-style endpoints).
- **OpenRouter setup** has known sharp edges:
  - [Issue #15381](https://github.com/anomalyco/opencode/issues/15381): `/connect` saves API key but does NOT persist provider config to `opencode.json` → "No endpoints found" error. Workaround = manual JSON edit.
  - [Issue #1050](https://github.com/anomalyco/opencode/issues/1050): No clean way to select OpenRouter's free model variants from `/models`.
  - Sub-agent model resolution can fail because `createAgentProvider()` does a hardcoded lookup against `models.SupportedModels`.
- Config and credentials are split: `~/.config/opencode/opencode.jsonc` (config) vs `~/.local/share/opencode/auth.json` (credentials). Editing one without the other is "the most common setup mistake."
- Verdict: OpenRouter works but expect to write JSON by hand and watch for sub-agent gotchas. Not a marketing-only claim — it is wired in, just rough.
- Source: [opencode.ai/docs/providers](https://opencode.ai/docs/providers/), [Kickstart OpenCode with OpenRouter (DEV.to)](https://dev.to/mozes721/kickstart-opencode-with-openrouter-32o7).

### License
- **MIT.** No AGPL constraints. SaaS commercialization is permissible.
- Some wrappers (e.g. opencode-web) use AGPL-3.0 with a commercial dual-license — those are wrapper-level choices and don't affect using OpenCode itself.

### Maintenance signal
- Latest release: **v1.14.25 (April 25, 2026)** — yesterday at time of research.
- 776 releases total, 11,848 commits on dev branch.
- ~150,000 stars (verified on the repo page).
- Active issue triage based on the open issue list. Note: the security disclosure timeline (see Risks) shows the team had no formal security reporting channel as of late 2025 — they have since added one.

### Note on the repo URL
- The original org `sst/opencode` exists. There is also `anomalyco/opencode` which appears to be a heavily-active fork/mirror surfacing in many recent issues. The user should check whether the canonical home of active development is still `sst/opencode` before committing — the fork situation may matter for "what to track upstream."

---

## 2. Existing wrappers

All numbers verified at research date. Pattern is consistent: connect to `opencode serve`, do not fork.

| Project | Stars | Last activity | Approach | Stack | Maturity | Notes |
|---|---|---|---|---|---|---|
| **[OpenChamber](https://github.com/openchamber/openchamber)** | ~3,500 | v1.9.8 (2026-04-22) | Connects to OpenCode CLI server via HTTP/WebSocket | Tauri (macOS), Vite/React web, VS Code ext, Docker | Most production-like wrapper found. 89 releases, systemd examples, reverse-proxy docs, Cloudflare Tunnel. Multi-agent parallel runs in isolated worktrees. Voice mode. PR/Git workflows native. Windows/Linux desktop still on roadmap. |
| **[Portal (hosenur)](https://github.com/hosenur/portal)** | 596 | v0.1.30 (2026-04-04) | Connects to running `opencode serve` via SDK | React Router, Tailwind, Nitro, OpenCode SDK | Personal project, mobile-first PWA. Explicit goal: drive OpenCode from a phone. Bun preferred. This is the "Portal" the user mentioned. |
| **[Palot (itswendell)](https://github.com/itswendell/palot)** | 70 | Active alpha | Spawns + manages `opencode serve` itself, streams via @opencode-ai/sdk | Electron 40, React 19, Bun+Hono, Turborepo, shadcn/ui | Alpha. Multi-project workspaces, undo/redo, diff review panel, scheduled runs, migration wizard from Claude Code/Cursor. Code-signing/notarization incomplete. |
| **[OpenGUI (akemmanuel)](https://github.com/akemmanuel/OpenGUI)** | 26 | v0.4.4 (2026-04-20) | Bridges to OpenCode CLI via IPC (SSE) | Electron + React + Bun | Early but usable. Prompt queue, voice (Whisper), multi-project workspaces. Smaller community. |
| **[opencode-web (chris-tse)](https://github.com/chris-tse/opencode-web)** | 120 | Active | Auto-detects OpenCode API server, SSE streaming | React 19, Vite, CSS Modules, Bun/Node | Experimental. AGPL-3.0 + commercial dual license. Mobile-responsive. |
| **[opencode-studio (Microck)](https://github.com/Microck/opencode-studio)** | 320 | Active (no releases) | Reads/writes `~/.config/opencode/` directly + Express backend | Next.js 16 + Express | Solves the "JSON-editing hell" problem: GUI for MCP servers, skills, plugins, auth profiles, deep-link install. Different category from chat wrappers — this is a config manager. |
| **[agentserver](https://github.com/agentserver/agentserver)** | 18 | v0.40.0 (2026-04-17) | Multi-tenant orchestrator running OpenCode/OpenClaw inside isolated sandboxes | Go backend + React frontend, Docker Compose or Kubernetes+Helm, gVisor | "code-server for OpenCode." Workspaces, role-based access, GitHub OAuth/OIDC, API-key proxy, RPD quotas, sandbox-proxy with subdomain routing. The closest thing to a SaaS-shaped reference architecture. Small but the only one targeting real multi-user. |
| **[opencode-sandbox (fabianlema)](https://github.com/fabianlema/opencode-sandbox)** | n/a | Daily auto-updates | Docker image with OpenCode CLI + dev tools pre-installed | Docker, multi-arch | Building block, not a UI. Useful as a base for self-hosted setup. |
| **[awesome-opencode](https://github.com/awesome-opencode/awesome-opencode)** | n/a | Active | Curated index | n/a | Discovery hub for plugins, themes, agents. Worth a scan before building anything. |

**Pattern analysis:**
- 7 of 9 wrappers connect to a separately-run `opencode serve`. Only Palot and OpenGUI manage the server lifecycle themselves; even they don't fork the core.
- The official OpenCode team is also building a "desktop app (beta)" — competition for the wrapper space is intensifying.
- Mobile and "remote use" is a recurring motivation across multiple wrappers (Portal, OpenChamber, Netclode). This validates the user's premise that browser-accessible AI coding has unmet demand.

---

## 3. Alternative bases

If OpenCode turns out to be the wrong base, these are the realistic alternatives:

| Tool | Could it be a base for "web-accessible AI coding env"? |
|---|---|
| **[code-server (Coder)](https://github.com/coder/code-server)** | **Yes, but inverted model.** It puts VS Code in the browser; you'd then install Cline/Continue inside it. You ship an IDE, not an agent. Heavy on infra, well-trodden. Best if "real VS Code, in browser, with optional AI" is the product. |
| **[Continue.dev](https://continue.dev)** | **Partially.** It's an editor extension (VS Code/JetBrains), not a server. You can pair it with Ollama or any OpenAI-compatible endpoint, but it lives inside an editor — to make it web-accessible you still need code-server underneath. Strong model flexibility. |
| **[Cline](https://github.com/cline/cline)** | **No, alone.** VS Code extension. Same constraint as Continue: needs an editor host. Powerful agent loop, browser tool use, but not a standalone server. |
| **[aider](https://aider.chat)** | **Weak fit.** Terminal-first, diff-based edits, Git-native. No server mode comparable to `opencode serve`. Excellent CLI ergonomics but not architected for being driven by a custom shell. |
| **[Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk-typescript)** | **Strongest "build your own shell" option.** Anthropic packaged Claude Code's loop + tools (Read/Write/Edit/Bash/Glob/Grep/WebSearch/WebFetch/AskUserQuestion) as a TS and Python library. You implement the UI, persistence, multi-session. More work than OpenCode (you build session storage yourself) but maximum control. Locked to Claude as the primary model. |
| **[Tabby](https://tabby.tabbyml.com)** (mentioned in 2026 roundups) | **Different category.** Self-hosted code completion server with OpenAI-compatible API, multi-user admin dashboard, team analytics. Closer to "GitHub Copilot self-hosted" than to "agentic coding." Worth knowing about for the team-server playbook. |

**Useful real-world reference:** [Stanislas's Netclode write-up](https://stanislas.blog/2026/02/netclode-self-hosted-cloud-coding-agent/) describes building exactly this kind of system. He chose to support **multiple agent SDKs** (Claude Agent SDK primary, OpenCode, Copilot SDK, Codex) via an adapter pattern — partly because of the "Claude Code x OpenCode debacle" where Anthropic blocked third-party tools from spoofing Claude Code to use Pro/Max subscriptions. Lesson: do not lock the architecture to one upstream agent.

---

## 4. Risks & unknowns

### Things OpenCode does NOT do well
- **No agent sandboxing.** Confirmed by Docker docs and AgentServer docs: "OpenCode does not sandbox the agent." The agent runs with the same permissions as the server process. For a multi-user web-accessible system, you must wrap it (Docker, gVisor, Kata, firejail, or per-user VMs).
- **OpenRouter setup is fragile.** `/connect` doesn't persist properly, free models are not selectable, sub-agent provider resolution breaks. Workable but expect manual JSONC editing and to write your own validation layer.
- **TypeScript/Bun assumption.** If your custom shell is in Python or Go, you can drive it via the HTTP API just fine — but plugin development requires JS/TS and is happiest on Bun.
- **Single-user assumption baked in.** Config paths (`~/.config/opencode/`, `~/.local/share/opencode/auth.json`) are user-scoped. Multi-tenancy requires either one server-per-user (agentserver model) or a custom config layer.
- **No built-in rate limiting / cost controls** at the server level. AgentServer adds an `llmproxy` service specifically for this. Plan to build this yourself.

### Server / multi-session story
- **Single-user, multi-session: well supported.** Sessions are first-class, can be forked, nested, aborted, reverted, shared (read-only).
- **Multi-user: not native.** Existing pattern is "one `opencode serve` per user, per workspace, in its own container" — see agentserver. There is no built-in user model.
- **State sharing:** sessions are stored in SQLite by the server. Each server has its own DB. No documented horizontal-scale story.

### Authentication / credentials in a server context
- HTTP basic auth via `OPENCODE_SERVER_PASSWORD` — OK for single-user, weak for SaaS.
- **Provider API keys live on the server in `auth.json`.** In a multi-user setup this is dangerous; agentserver and Netclode both use a key-proxy pattern (sandboxes never see the real key, the server injects it). If you build SaaS, copy this pattern from day one.
- Enterprise docs mention SSO/OIDC integration via central config for "AI gateway" credential issuance. Generic OIDC support is real but requires a wrapper layer (Helm chart shows it).

### Working directory / sandboxing per session
- Sessions can run in separate worktrees (OpenChamber leans on this for "multi-agent parallel runs").
- But all of these share the same host filesystem and host process unless you containerize. There is no kernel-level isolation in OpenCode.
- Docker Sandbox templates (`docker/sandbox-templates:opencode`) are the official-ish answer. They explicitly "don't pick up user-level configuration from your host" — only project-level config inside the working directory.

### Security incident worth knowing
- **CVE-class issue, late 2025:** unauthenticated RCE via a silently-running HTTP server. Any visited website could trigger arbitrary command execution. Reported 2025-11-17, initial radio silence (no security email), fixed in **v1.1.10 / properly hardened in v1.1.15**. The team has since acknowledged the lack of a security reporting channel.
- **Implication for the user:** never run `opencode serve` exposed to the network without your own auth in front (reverse proxy with auth, Tailscale, mTLS, etc.). Don't trust the bind-to-localhost default to be secure if anything else on the host is compromised.
- Source: [HN discussion 46581095](https://news.ycombinator.com/item?id=46581095).

### Operational unknowns (genuinely unverified)
- **Concurrency ceiling:** docs do not state max parallel sessions. Anecdotal only.
- **Memory footprint per session:** unverified, depends on context window and tool-output retention.
- **Long-running stability:** the "sessions survive SSH drops" claim is repeated but no public benchmark.
- **Compatibility between sst/opencode and anomalyco/opencode forks:** unverified — the user should check before committing.

---

## 5. Recommendation framing

Not a final recommendation. Frame the decision as:

**If you want a personal, browser-accessible coding agent fast — OpenCode fits.**
The pieces are already there: `opencode serve` is real, the OpenAPI surface is documented, multiple existing wrappers prove the model works, and you can extend behavior with TS plugins without forking. For a single-user setup behind Tailscale or Cloudflare Tunnel, you can be running in a weekend.

**If you want to skip building UI from scratch — OpenChamber or Palot may be enough.**
OpenChamber especially is mature, MIT-ish licensed, and already does Tauri + web + Docker + reverse-proxy + worktrees. Forking it (or even just deploying it) might beat building a custom shell. The honest question is: what does your custom shell do that OpenChamber doesn't?

**If you want production-grade multi-user SaaS later — OpenCode alone is not enough.**
Plan to build (or adopt agentserver-style) the missing layers: per-user sandbox containers, an LLM key-injection proxy, rate limits/quotas, auth, and a routing layer. Budget for this; it's not a weekend.

**If you want maximum control over the agent loop and plan to stay on Claude — Claude Agent SDK is the cleaner base.**
You skip OpenCode's TypeScript/Bun runtime constraints, you implement the loop yourself, and you avoid the "Claude Code spoofing" subscription drama. Cost: more code, no built-in TUI, you build session storage. Best when the product differentiation IS the agent loop.

**If you want the "browser VS Code with optional AI" model — code-server + Continue.dev is the boring, proven path.**
Less interesting architecturally, but well-trodden, lots of docs, supports any OpenAI-compatible provider including OpenRouter without OpenCode's sub-agent edge cases. Worth considering if "make my dev environment portable" is the actual job to be done.

**If you want to avoid vendor lock-in to any single agent — adopt the Netclode adapter pattern.**
Build the shell against an internal adapter interface; have OpenCode, Claude Agent SDK, Codex implementations behind it. More upfront work, much better long-term position.

---

## Appendix — primary sources cited

- [github.com/sst/opencode](https://github.com/sst/opencode) — main repo
- [opencode.ai/docs/server](https://opencode.ai/docs/server/) — server flags, auth, endpoints
- [opencode.ai/docs/plugins](https://opencode.ai/docs/plugins/) — plugin model, hooks, capabilities
- [opencode.ai/docs/providers](https://opencode.ai/docs/providers/) — provider config including OpenRouter
- [DeepWiki: sst/opencode](https://deepwiki.com/sst/opencode) — generated architecture overview
- [pkg.go.dev/github.com/sst/opencode-sdk-go](https://pkg.go.dev/github.com/sst/opencode-sdk-go) — auto-gen Go SDK (Stainless)
- [github.com/openchamber/openchamber](https://github.com/openchamber/openchamber)
- [github.com/hosenur/portal](https://github.com/hosenur/portal)
- [github.com/itswendell/palot](https://github.com/itswendell/palot)
- [github.com/akemmanuel/OpenGUI](https://github.com/akemmanuel/OpenGUI)
- [github.com/chris-tse/opencode-web](https://github.com/chris-tse/opencode-web)
- [github.com/Microck/opencode-studio](https://github.com/Microck/opencode-studio)
- [github.com/agentserver/agentserver](https://github.com/agentserver/agentserver)
- [github.com/awesome-opencode/awesome-opencode](https://github.com/awesome-opencode/awesome-opencode)
- [docs.docker.com/ai/sandboxes/agents/opencode](https://docs.docker.com/ai/sandboxes/agents/opencode/)
- [news.ycombinator.com/item?id=46581095](https://news.ycombinator.com/item?id=46581095) — RCE disclosure
- [stanislas.blog/2026/02/netclode-self-hosted-cloud-coding-agent](https://stanislas.blog/2026/02/netclode-self-hosted-cloud-coding-agent/) — real self-hosted reference
- [OpenCode issue #15381](https://github.com/anomalyco/opencode/issues/15381) — OpenRouter `/connect` persistence bug
- [OpenCode issue #1050](https://github.com/anomalyco/opencode/issues/1050) — OpenRouter free model selection
- [OpenCode issue #2143](https://github.com/sst/opencode/issues/2143) — "why TypeScript and npm"
- [github.com/anthropics/claude-agent-sdk-typescript](https://github.com/anthropics/claude-agent-sdk-typescript)
- [github.com/cline/cline](https://github.com/cline/cline)
- [github.com/coder/code-server](https://github.com/coder/code-server)
- [aider.chat/docs](https://aider.chat/docs/)
