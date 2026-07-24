# OpenChamber vs. opencode-manager — Fork Decision

_Research date: 2026-04-26_
_Method: Both repos cloned shallow, code structure inspected, dependencies read, GitHub issues fetched via `gh` CLI. No agents — direct verification only._
_Goal: Pick which to fork as the foundation for a self-hosted, mobile-first web UI for OpenCode that pairs with code-server on a separate subdomain._

---

## TL;DR Recommendation

**Fork `chriswritescode-dev/opencode-manager`.**

Three deciding facts:

1. **Issue health is on a different planet.** OpenChamber has **214 open issues** (most of them concrete bugs from very recent dates: stale message rendering, lost connections, blank assistant bubbles, white-screen on mobile + Cloudflare tunnel, file preview not refreshing after LLM edits). opencode-manager has **18 open issues** and most of them are feature requests, not bugs. Resolution patterns also differ: opencode-manager closes real bugs quickly; OpenChamber's recently-closed issues are mostly Android packaging refactors, not bug fixes.
2. **Architecture is much closer to "production-grade self-hosted web app".** opencode-manager has a proper backend/frontend split, modern auth (`better-auth` + passkey + GitHub/Google/Discord OAuth + VAPID push), SQLite persistence, Docker healthchecks, env-driven config, AUTH_TRUSTED_ORIGINS for reverse-proxy deployment. OpenChamber bundles its server inside the web package, ships a single password (UI_PASSWORD) for auth, and is wired around an opt-in Cloudflare tunnel paradigm.
3. **Fork cleanup cost is much lower.** OpenChamber is a 6-package monorepo (web, ui, desktop, electron, vscode, docs). For a web-only target you'd delete 5 packages and rewire the UI package which is currently designed as multi-target. opencode-manager is a 3-package monorepo (backend, frontend, shared) — already shaped for the deployment you want.

The popular framing — "OpenChamber has 7x more stars, must be better" — does not survive a code-level inspection. Stars reflect TUI users adopting a familiar PWA + tunnel setup. They don't reflect "this is the cleanest base to fork into a custom web product."

---

## What was actually verified

- Cloned both repos shallow into `docs/researches/temp/{openchamber,opencode-manager}/`
- Read root-level package.json, docker-compose.yml, Caddyfile, workspace config
- Inspected `packages/web/`, `packages/ui/` for OpenChamber; `frontend/`, `backend/`, `shared/` for opencode-manager
- Confirmed the dependency lists (Monaco vs. CodeMirror, better-auth, etc.)
- Listed `components/`, `pages/`, `routes/`, `services/` directories on both sides
- Pulled open and recently-closed issues via `gh issue list` for both repos
- Pulled repo metadata (stars, forks, contributors, license, push date) via `gh api`

---

## OpenChamber — facts on the ground

### Repo metadata
- Stars: 3,470 — Forks: 349 — Subscribers: 19 — License: MIT
- Last push: 2026-04-26 (active)
- Repo size: 40 MB
- **Open issues: 214**

### Architecture
- Bun-based monorepo with 6 packages: `web`, `ui`, `desktop` (Tauri + Rust), `electron`, `vscode`, `docs`
- The UI package (`packages/ui/`) is shared across all four runtimes — multi-target by design
- The web package contains an Express server inside it; deployment target is a single port (3000)
- Caddyfile sets up self-signed TLS on port 3443 reverse-proxying to `[::1]:3001`
- docker-compose.yml runs a single `openchamber` container with a workspace volume

### Key dependencies (root package.json)
- React 19 + Vite 7 + Bun
- `@opencode-ai/sdk` (official)
- **CodeMirror 6** with full language packs (JS/TS, Python, Rust, Go, C++, SQL, XML, YAML, etc.) — real editor inside the app
- `bun-pty`, `node-pty`, `ghostty-web` — terminal emulator stack
- `simple-git`, `@octokit/rest` — git + GitHub API
- `express`, `http-proxy-middleware` — server side
- `react-syntax-highlighter`, `react-markdown`, `remark-gfm`
- `zod`, `zustand` — validation + state
- HeroUI + Radix UI for components

### UI components present
`components/{auth, chat, comments, desktop, layout, mcp, multirun, onboarding, providers, sections, session, terminal, ui, views, voice}` plus `lib/{codemirror, diff, git, i18n}`

Standout: **`multirun/` is real** — `MultiRunLauncher.tsx`, `AgentSelector.tsx`, `BranchSelector.tsx`, `ModelMultiSelect.tsx`. Genuine multi-agent launcher UI.

The session UI is rich: `BranchPickerDialog`, `DirectoryExplorerDialog`, `GitHubIssuePickerDialog`, `GitHubPrPickerDialog`, `NewWorktreeDialog`, `ScheduledTasksDialog`, `SaveProjectPlanDialog`, `SessionFolderItem`, `SessionSidebar`, `TodoSendDialog`, `ProjectNotesTodoPanel`.

### Authentication
- Single `UI_PASSWORD` env var (HTTP basic-style)
- No multi-user, no OAuth, no passkey

### Deployment
- Cloudflare tunnel is opt-in (env vars are commented out in docker-compose.yml — verified). So self-hosted-VPS-without-tunnel is _possible_, but the project's primary deployment story is "tunnel + QR code".
- Single Docker container, 3000 port
- Workspace volume mounts: `~/.config/openchamber`, `~/.local/share/opencode`, ssh keys, workspaces dir

### Issue health (this is where it falls apart)

214 open issues. Recent open bug titles include:
- "GitHub MCP works for opencode TUI but not openchamber"
- "Fresh worktree sessions can drop the first slash-command message"
- "During the conversation, new messages do not appear; they only load normally after refreshing with Ctrl+F5"
- "Openchamber loses connection to local opencode"
- "After creating a worktree, it doesn't show in the sidebar unless you reload"
- "Assistant message renders blank bubble — content only appears after sending next message"
- "File preview displays stale content and fails to refresh after LLM modification"
- "The cf tunnel mobile browser has always been stuck on a white screen"
- "Connection link is invalid or expired"
- "Question tool answers are not clickable after OpenChamber restart"

These are not edge cases. These are **core flow bugs** — message rendering, session connection, file preview, mobile + tunnel, worktree state sync. If you fork this, you inherit them all, plus the work to keep up with whatever upstream patches do or do not land.

Recently-closed issues are mostly Android TWA packaging refactors (`build-apk.mjs`, `cli-output.mjs`, `init-twa.mjs`). Maintainer bandwidth is focused on shipping mobile builds, not stabilizing the core.

### Pros / cons for the user's stated needs

| | |
|---|---|
| ✅ Multirun (multi-agent paralel) UI is genuinely built | Critical for the user's "aynı projede 2 session açayım" pain point |
| ✅ Built-in terminal (ghostty-web + node-pty) | Bonus, not a requirement |
| ✅ Real code editor (CodeMirror with all languages) | But code-server is already going on the editor subdomain |
| ✅ GitHub PR picker, worktree dialog, branch picker | Workflow-rich |
| ❌ 214 open bugs, many in core flows | Inherits all of them |
| ❌ 6-package monorepo, 5 packages are dead weight for web-only target | Significant cleanup |
| ❌ Single-password auth, no multi-user bones | "SaaS-able someday" much harder |
| ❌ Cloudflare tunnel is the marketed path | VPS-direct deployment is possible but secondary |
| ❌ UI is multi-target (web/Tauri/Electron/VSCode) | Forces abstractions you don't need |

---

## opencode-manager — facts on the ground

### Repo metadata
- Stars: 525 — Forks: 65 — Subscribers: 5 — License: MIT
- Last push: 2026-04-26 (active)
- Repo size: 13 MB
- **Open issues: 18**

### Architecture
- pnpm workspace with 3 packages: `frontend`, `backend`, `shared`
- Backend is a separate Bun-based package (clean separation, not bundled into the frontend)
- Frontend is web-only (Vite + React 19), no desktop/electron/vscode targets
- docker-compose.yml runs a single `opencode-manager` container with persisted volumes for workspace + SQLite database
- Healthcheck on `/api/health`

### Key dependencies

**Frontend:**
- React 19 + Vite 7
- **`@monaco-editor/react`** — real VS Code editor in browser
- **`better-auth` + `@better-auth/passkey`** — modern auth library, multi-user-ready
- `@tanstack/react-query` — proper data layer
- `react-router-dom` v7
- `mermaid`, `highlight.js`, `react-markdown`, `rehype-highlight`, `remark-gfm`
- `@dnd-kit/*` — drag and drop
- `cronstrue` (cron expression rendering — for the schedules feature)
- `zod`, `zustand` — validation + state

**Backend (`backend/src/services/`):**
- `archive`, `assistant-mode`, `auth`, `file-operations`, `files`, `git`, `git-auth`, `mcp-oauth-state`, `notification`, `opencode-import`, `opencode-models`, `opencode-single-server`, `opencode-supervisor`, `plugin-memory`, `project-id-resolver`, `prompt-templates`, `proxy`, `repo`, `schedule-config`, `schedules`, `settings`, `skills`, `sse-aggregator`

**Backend routes:**
- `auth`, `files`, `health`, `mcp-oauth-proxy`, `memory`, `notifications`, `oauth`, `prompt-templates`, `providers`, `repo-git`, `repos`, `schedules`, `settings`, `sse`, `ssh`, `stt`, `tts`

### UI structure
- `pages/`: `AssistantRedirect`, `GlobalSchedules`, `Login`, `Memories`, `Register`, `RepoDetail`, `Repos`, `Schedules`, `SessionDetail`, `Setup`, `Workspace`
- `components/`: `agent`, `command`, `file-browser`, `memory`, `message`, `modals`, `model`, `navigation`, `notifications`, `repo`, `schedules`, `session`, `settings`, `source-control`, `ssh`, `ui`
- `file-browser/`: `FileBrowser`, `FileBrowserSheet`, `FileDiffView`, `FileOperations`, `FilePreview`, `FilePreviewDialog`, `FileTree`, `MarkdownRenderer`, `MobileFilePreviewModal`
- `session/`: `ContextUsageIndicator`, `DeleteSessionDialog`, `EditSessionTitleDialog`, `MinimizedQuestionIndicator`, `PermissionRequestDialog`, `QuestionPrompt`, `SessionCard`, `SessionList`

The session UI is simpler than OpenChamber's — list + cards + dialogs, no folder grouping, no PR picker, no scheduled-tasks dialog from this surface (schedules has its own page).

### Authentication
- `better-auth` + passkey/WebAuthn
- AUTH_SECRET env var (proper secret rotation)
- Optional `ADMIN_EMAIL` / `ADMIN_PASSWORD` for first-run admin
- Optional GitHub / Google / Discord OAuth (env-configured)
- AUTH_TRUSTED_ORIGINS for reverse-proxy CORS
- AUTH_SECURE_COOKIES toggle for HTTPS
- VAPID keys for web push notifications

This is materially closer to "real product auth." Multi-user becomes a feature toggle, not a rewrite.

### Deployment
- `docker-compose up -d` — entire stack runs
- 5 ports exposed: 5003 (main), 5100-5103 (auxiliary services — likely embedded `opencode serve` instances per repo, given the `opencode-supervisor` service name)
- Persisted volumes: `/workspace` and `/app/data`
- `OPENCODE_SERVER_PORT=5551` — its own opencode server inside the container
- Healthcheck wired

### Issue health

18 open issues. Sample titles:
- "OpenAI provider unable to connect"
- "Can't complete Create Model form"
- "SSH credential host matching fails for git@host format"
- "Feature Request: Auto-Upgrade Option for opencode CLI"
- "Team management" (feature request)
- "Opencode Skills UI Management" (feature request)
- "Quick Session Switcher - Keyboard Shortcut and UI" (feature request)
- "Feature: Git Worktree Support for Multi-Branch Workflows" (feature request)
- "Auto-Compact Based on Model Context Window"

The mix is mostly feature requests + a few specific bugs (provider connection, form completion, SSH cred matching). Recently-closed issues are real bug closes ("not able to select providers added by API Key", "can not create a session", "Does not seem to support opencode beyond version 1.3.3" — closed when version compatibility was fixed).

### Pros / cons for the user's stated needs

| | |
|---|---|
| ✅ Mobile-first PWA explicitly iOS-optimized | Matches "telefonumdan girip kullanayım" |
| ✅ Multi-repo with sidebar | Standard multi-project workflow |
| ✅ Plan/Build modes baked in | Closest existing paradigm to REA-style workflow |
| ✅ Schedules + Memory plugin + Skills + MCP | Workflow tool feature surface area |
| ✅ Monaco editor in-app | Optional fallback if you don't always want to switch to code-server |
| ✅ 18 open issues, mostly enhancement requests | Healthy maintenance |
| ✅ Modern auth foundation (better-auth + passkey + OAuth) | Multi-user is a feature flag away |
| ✅ Healthcheck, persisted volumes, env-driven config | Production deployment shape |
| ✅ Web-only frontend, no desktop/electron deadweight | Less to delete |
| ⚠️ Multirun / multi-agent UI not as developed as OpenChamber | But "Quick Session Switcher" issue exists — invitation to build it your way |
| ⚠️ No git worktree support yet (open feature request #69) | You'd add it; that's a fork advantage anyway |

---

## Side-by-side matrix

| Dimension | OpenChamber | opencode-manager | Notes |
|---|---|---|---|
| Stars | 3,470 | 525 | OpenChamber leads on visibility |
| Forks | 349 | 65 | |
| Open issues | **214** | **18** | The single most decisive metric here |
| Issue:star ratio | 6.2% | 3.4% | opencode-manager is healthier per user |
| License | MIT | MIT | tied |
| Last push | 2026-04-26 | 2026-04-26 | Both active today |
| Mobile-first | PWA, but white-screen bugs in tunnel mode | PWA, iOS-optimized, swipe nav | opencode-manager works |
| Web-only target | No, multi-target (web/Tauri/Electron/VSCode) | Yes | opencode-manager fits cleaner |
| File editor | CodeMirror 6 | Monaco | Both real, Monaco closer to VS Code |
| Multi-session UI | Rich (multirun, worktree, branch picker, GH integrations) | Standard (list + cards) | OpenChamber wins this dimension only |
| Terminal | ghostty-web + node-pty embedded | None embedded | Bonus on OpenChamber, not required |
| Auth | UI_PASSWORD only | better-auth + passkey + OAuth | opencode-manager is multi-user-ready |
| Reverse proxy compatible | Possible but secondary | First-class (AUTH_TRUSTED_ORIGINS, secure cookies toggle) | opencode-manager fits the user's two-subdomain plan |
| Backend isolation | Inside web package | Separate package | opencode-manager production-shaped |
| Database | Filesystem/state dirs | SQLite | opencode-manager survives restarts cleanly |
| Healthchecks | None visible | `/api/health` wired in compose | opencode-manager VPS-deploy-ready |
| Workflow features | multirun, plan view, scheduled tasks, GitHub flows | Plan/Build modes, Schedules page, Memory plugin, MCP | Different shapes — both relevant |
| Fork cleanup effort | High (5 unwanted packages, multi-target UI) | Low (web-only already) | |
| Bug inheritance risk | High (214 open bugs, core flow issues) | Low (18 issues, mostly features) | |

---

## What you give up if you pick opencode-manager

This is where I want to be honest. opencode-manager is the right choice, but not without trade-offs.

1. **Multirun / multi-agent paralel launcher** — OpenChamber has `MultiRunLauncher.tsx` that fires the same prompt at multiple agents in isolated worktrees side-by-side. opencode-manager doesn't ship this. The user's pain point ("aynı projede 2 session açarsam workflow'um yetmiyor") may be better served by OpenChamber's existing multirun than by opencode-manager's plain session list. You'd build it.

2. **Worktree-based session isolation** — open feature request #69 in opencode-manager. OpenChamber has it. If you fork opencode-manager you're betting you'd rather build worktree integration cleanly than untangle OpenChamber's existing implementation.

3. **GitHub-native workflows from issues/PRs** — OpenChamber lets you start a session from a GitHub issue or PR with context attached. opencode-manager has `repo-git.ts` route but no UI flow that does this end-to-end (verified from component layout).

4. **Voice mode** — OpenChamber ships speech-to-text + read-aloud. opencode-manager has TTS/STT routes but no UI. Neither is a stated requirement, but if you ever wanted voice control, OpenChamber is closer.

5. **Star-count community signal** — 3,470 vs. 525. If "I want a project where Issues get answered fast and a community looks for problems for me" is a value, OpenChamber is bigger. The 214 open issues argue the other way: more eyes finding more breaks, fewer hands fixing them.

If any of those five are dealbreakers, the conversation reopens. None of them seemed dealbreaking for the user's stated profile (solo, web-first, self-hosted, REA-flavored workflow gradually grafted in).

---

## Recommended fork plan

Once you fork `chriswritescode-dev/opencode-manager`:

1. **Don't track upstream long-term.** Your goal is to specialize, not to keep merging conflicts. Tag the fork-point and move on.
2. **Strip what you won't use immediately:** Telegram-related discussions in issues, schedule defaults you won't use, SSO providers you won't enable. Leave the bones (better-auth, AUTH_TRUSTED_ORIGINS, etc.) — that's what makes it production-shaped.
3. **First customizations to land:**
   - OpenRouter-first provider config UI (defaults, key storage)
   - REA-flavored slash commands as `prompt-templates`
   - Multi-session quick-switcher (issue #89 in upstream — you can build it your way without waiting)
   - Sidebar status badges so you can see at a glance which paralel session needs you
4. **Two-subdomain deployment** as discussed:
   - `agent.aliyenidede.com` → forked opencode-manager
   - `code.aliyenidede.com` → code-server, separate container
   - Caddy reverse-proxy in front, both Let's Encrypt certs
   - Both containers share the same workspace volume so AI changes show up in code-server immediately

---

## Risks and open questions before forking

1. **opencode-manager has only 5 contributors and 65 forks.** If `chriswritescode-dev` walks away, you're alone with your fork. (You'd be alone anyway after forking, but fewer eyes upstream means less likelihood of an emergency security fix landing for you to merge.)
2. **The multi-port deployment (5003 + 5100-5103) is not documented in the README.** You'll want to read `docker-compose.yml` and `backend/src/services/opencode-supervisor.ts` to understand what each port is. Plausible: it manages multiple opencode server instances (one per repo). Verify before committing to the architecture.
3. **`OPENCODE_SERVER_PORT=5551` is set but ports 5100-5103 are exposed.** Possible inconsistency. Inspect before deploying.
4. **iOS PWA install path** — claimed to work, but the `frontend/public/` directory and the service worker (`sw.ts`) should be inspected before relying on it for "install on home screen" UX.
5. **Database migration story** — SQLite at `/app/data/opencode.db`. There's no obvious migrations directory listed yet; check `backend/src/db/` (was listed in the directory dump; did not deep-dive). If schema changes between upstream releases, you'll need a strategy.
6. **Better-auth maturity** — modern but young library. If it gets abandoned or breaks compatibility, auth refactor falls on you. Upside: actively developed and well-shaped; downside: less battle-tested than NextAuth or Lucia.
7. **OpenRouter integration depth** — verified providers route exists, but the actual UX (model picker, key storage, provider-specific config) was not opened at file level. Likely fine; assumption to verify before fork.

---

## What I did NOT do (so you can decide whether it matters)

- Did not run hex-graph indexing for dependency-graph analysis. The architectural picture from filesystem inspection + dependency lists was already decisive; deeper graph analysis would refine but not change the recommendation.
- Did not read individual route handlers or session components line-by-line. The directory structure + component names + dependency stack told a consistent story; line-level inspection happens during fork.
- Did not benchmark performance, cold-start times, or memory footprints. Not relevant for solo single-user deployment on a personal VPS.
- Did not validate the README claims about iOS optimization on a real device. The dependency choices (`@monaco-editor/react`, `react-router-dom` v7, mobile-specific FilePreviewModal component) suggest the optimization work was real, but verify on a phone before going production.

---

## Cleanup

The shallow clones used for this research live in:
- `docs/researches/temp/openchamber/`
- `docs/researches/temp/opencode-manager/`

Total ~57 MB. Either keep them around for further inspection during fork planning, or delete the `temp/` directory once the fork lands in its own repo.

---

## Sources

- [github.com/openchamber/openchamber](https://github.com/openchamber/openchamber)
- [github.com/chriswritescode-dev/opencode-manager](https://github.com/chriswritescode-dev/opencode-manager)
- Predecessor research: [opencode-ecosystem.md](opencode-ecosystem.md), [opencode-wrapper-comparison.md](opencode-wrapper-comparison.md), [opencode-wrapper-inventory.md](opencode-wrapper-inventory.md)
