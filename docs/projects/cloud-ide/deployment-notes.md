# readev — Deployment Notes (Archon + Pi)

> Operational runbook deltas for self-hosting Archon + Pi on a Hetzner VPS.
> Separated from `north-star.md` (which is values/architecture only, not a runbook).
> **Last live-verified: 2026-06-30** against `coleam00/Archon` branch `dev` (release v0.5.0).
> Architectural commitments live in [`north-star.md`](north-star.md); this file is the "how to actually deploy" layer.

---

## Pin / version targets

- **Archon:** clone from the **`dev`** branch (now the default branch, not `main`). Pin to **≥ v0.5.0** (2026-06-26).
- **Pi:** new scope **`@earendil-works/pi-coding-agent`** (old `@mariozechner/*` is deprecated, frozen at 0.73.1). Archon's Pi provider pins `@earendil-works/pi-ai` + `@earendil-works/pi-coding-agent` at **`^0.79.1`**. Live Pi line is **0.80.x** (2026-06-23).
- **Node.js:** minimum **22.19.0** (raised by Pi v0.75.0).
- **Pi install (if installing standalone):** `npm i -g --ignore-scripts @earendil-works/pi-coding-agent`.
- **pi-ai API note:** the global API (`stream`/`complete`/`getModel`) moved to `@earendil-works/pi-ai/compat` in v0.80.0 — relevant only if writing custom code against pi-ai directly.

---

## Deployment facts — BYTE-VERIFIED 2026-06-30

Confirmed by fetching the actual files on branch `dev`:

| Fact | Reality | Action |
|---|---|---|
| **Default port** | **3000**, NOT 3090. `docker-compose.yml` → `${PORT:-3000}`; `Caddyfile.example` → `reverse_proxy app:{$PORT:3000}`. The `.env.example` "Default: 3090" comment is **misleading** (it's a commented-out override). | Set `PORT=3090` explicitly in `.env` only if you actually want 3090; otherwise expect 3000. Match firewall / health-check / Vite proxy to whatever you pick. |
| **`--profile cloud`** | Exists and works as planned. `caddy:2-alpine` service, profile `cloud`, ports 80/443 (+443/udp), automatic HTTPS via Let's Encrypt reading `{$DOMAIN}`. | `docker compose --profile cloud up -d`. Set `DOMAIN=agent.readev.co` in `.env`. |
| **`WEBHOOK_SECRET`** | **Required** env var (active, no default in `.env.example`), needed for both PAT and GitHub-App auth modes. | Generate: `openssl rand -hex 32`. |
| **`DEFAULT_AI_ASSISTANT`** | Defaults to **`claude`**. Valid values include `claude, codex, copilot, pi`. | **Must explicitly set `DEFAULT_AI_ASSISTANT=pi`** + provide a Pi backend key. |
| **`Caddyfile`** | `Caddyfile.example` exists on `dev`. | `cp Caddyfile.example Caddyfile` before bringing up the cloud profile. |

---

## Deployment facts — DOC-SOURCED (not byte-verified this pass)

From the first status-check research; reliable but not re-confirmed file-by-file. Verify at build time:

- **`DATABASE_URL` is optional** — Archon defaults to **SQLite** (`~/.archon/archon.db`), schema auto-converges. You can likely drop `--profile with-db` if SQLite is acceptable for single-user.
- **`deploy/cloud-init.yml`** — official VPS bootstrap (Docker + ufw + 2GB swap + clone + up). Worth adopting for a clean Hetzner provision.
- **Binary install path** — `curl -fsSL https://archon.diy/install | bash` + `archon serve` now exists alongside Docker. (Docker/compose is still the recommended self-host path; the binary path is the one affected by bug #1731 below.)
- **GitHub auth modes** — PAT (`GH_TOKEN`) for solo use, or a newer GitHub App mode for multi-user.

---

## Pi configuration gotcha

- **CLI setup wizard only offers Claude / Codex (#1607).** Pi (and OpenCode / Copilot) must be configured **manually** in `.archon/config.yaml` after running setup. Provide the Pi backend key(s) and `PI_CODING_AGENT_DIR` / `PI_PACKAGE_DIR` as needed.

---

## Open upstream bugs to watch (as of 2026-06-30)

- **#1731 (OPEN, byte-verified):** Archon's bundled Pi **binary** embeds a stale model catalog (frozen since v0.3.12), so newer models (e.g. `openai-codex/gpt-5.5`) fail to resolve. **Not fixed in v0.5.0.** Mostly affects the standalone-binary path; the docker-compose path floats `@earendil-works/pi-ai ^0.79.1` and is likely less affected. Verify before relying on the newest models.
- **#1558:** Archon's Pi provider may ignore Pi's `settings.json` (in-memory settings bypass).
- **#1452:** Pi Docker registration can fail on a hardcoded `~/.archon/workspaces` path.
- **#1607:** CLI setup wizard still only lists Claude/Codex (see Pi config gotcha above).
- Standalone **Ollama / LM Studio** providers were requested (#1597) but rejected/unmerged — for local models, route through Pi's custom-provider mechanism.

---

## Resolved since the May snapshot

- **Pi `PI_PACKAGE_DIR` compiled-binary crash** — fixed upstream in Archon **v0.5.0**. No manual shim needed anymore.

---

## Verified provisioning runbook (apply at build time)

1. Provision Hetzner **CX22** (2 vCPU / 4 GB — exceeds Archon's documented min of 1–2 vCPU / 2 GB / 20 GB SSD), Ubuntu 24.04 LTS, SSH key. Optionally use `deploy/cloud-init.yml`.
2. DNS: `agent.readev.co` A record → VPS IP. (`code.readev.co` later, only when code-server is needed.)
3. `git clone -b dev https://github.com/coleam00/Archon` (pin to ≥ v0.5.0).
4. `cp .env.example .env` → set `DOMAIN=agent.readev.co`, `WEBHOOK_SECRET=$(openssl rand -hex 32)`, `DEFAULT_AI_ASSISTANT=pi`, (optional) `PORT=3090`, plus your OpenRouter / Pi backend key.
5. `cp Caddyfile.example Caddyfile`.
6. `docker compose --profile cloud up -d` (drop `--profile with-db` if using SQLite default).
7. First-run: create admin account → Settings → configure **Pi** assistant manually in `.archon/config.yaml` (wizard won't list it) → add OpenRouter API key.
8. First end-to-end test: run a workflow from chat, confirm Pi + OpenRouter actually executes a tool call. (Watch for #1731 if using a brand-new model.)
9. First real workflow: **don't start from a blank canvas.** Options (verified 2026-07-01):
   - Copy one of the **~19 default workflows** shipped in `.archon/workflows/defaults/` (e.g. `archon-idea-to-pr`, `archon-plan-to-pr`, `archon-refactor-safely`) and customize.
   - Or install from the **Archon workflow marketplace** ([archon.diy/workflows](https://archon.diy/workflows/), ~9 community workflows): `archon workflow install <slug>` (e.g. `archon-piv-loop`). NOTE: the `install` CLI command is not yet in the CLI docs/README (v0.5.0 doc lag) — medium confidence it works end-to-end; the shipped defaults are the reliable fallback.
   - Or scaffold a new one with `archon-workflow-builder` (a workflow that generates workflow YAML) — a natural fit for encoding Principle A (grilling, codebase-aware).

---

## Sources (live-fetched 2026-06-30)

- Pi provider source: `https://github.com/coleam00/Archon/blob/dev/packages/providers/src/community/pi/provider.ts`
- docker-compose: `https://github.com/coleam00/Archon/blob/dev/docker-compose.yml`
- Cloud deploy doc: `https://archon.diy/deployment/cloud/`
- AI assistants doc: `https://archon.diy/getting-started/ai-assistants/`
- OpenCode PR (merged): `https://github.com/coleam00/Archon/pull/1384`
- Stale-catalog bug: `https://github.com/coleam00/Archon/issues/1731`
- Pi npm: `https://registry.npmjs.org/@earendil-works/pi-coding-agent`
- Pi repo: `https://github.com/earendil-works/pi`
