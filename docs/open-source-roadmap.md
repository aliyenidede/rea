# REA → Genuine Open Source — Working Notes

_Last updated: 2026-07-15 03:17:21 (TST)_

Working plan for turning REA from a technically-public repo into a *genuine* open-source
project. Not a finished public doc — trim the "Context & decisions" section before promoting
any of this to a committed `ROADMAP.md`, since some framing is candid/internal.

---

## Goal

Make REA **genuinely** open source: a stranger can **find it, understand why it matters, and
run it in ~10 minutes**. It is already *technically* open (public repo + PyPI `rea-dev` v0.7.1 +
MIT), but the recent history is only "session lessons" chores — public, yet personal and dormant.

**Not** a commercial play. No SaaS, no pricing. This is a reputation / dogfooding / community
move. One-liner to keep honest:

> **Don't sell REA. Use REA to build readev's (your) credibility.**

---

## Context & decisions (internal — trim before publishing)

- **Cross-tool: yes — but via standards, not per-tool ports.** The engine (plan → execute →
  review → memory + discipline) is domain- and tool-agnostic already. Slash commands, subagent
  orchestration, and hooks are Claude-Code-bound and do **not** port cleanly; forcing them onto
  every tool collapses REA to the lowest common denominator.
- **Don't rebuild Archon.** A full MCP-server + UI + RAG + task backend is a new product;
  Archon already exists, is resourced and mature. Cloning it discards the one asset only we have.
- **The moat is the methodology, not the plumbing** — battle-tested rules from running a live
  trading system (CAW). That is content/credibility, not infrastructure.
- **Architecture: lean core + installable domain "packs."** Core stays domain-agnostic
  (`.rea/` structure, memory, lessons, generic agents like explorer/plan-reviewer/dispatcher).
  Domain flavor ships as packs: coding (today), research/marketing, content/writing, n8n, api.
  A pack is built **only as the byproduct of a real task that week** — never abstract infra.
  This is the guardrail against REA becoming an unfinished side project.
- **Focus reality:** the actual revenue engine is CAW. REA competes for the same scarce
  resource — time. Keep REA's scope disciplined so it *accelerates* other work, not distracts.

---

## What "genuine" actually requires

Genuine ≠ star count. It comes from three things, and most of them are **not code**:

1. **Findable** — discoverable where the audience already looks.
2. **Understandable-why** — the reader gets the value proposition in one screen.
3. **Runnable fast** — working in ~5 minutes from a cold start.

---

## Action plan (priority order)

### Tier 1 — Legibility: the front door (~1 weekend)

- [ ] **Rewrite the README.** Lead with the hook ("the disciplined workflow that shipped a live
      crypto trading system — now for any project"), then a **60-second quickstart**, then **one**
      concrete end-to-end example (a real `/rea-plan` → `/rea-execute` on a small feature, with
      actual output). The current README reads like a *spec*, not an *invitation*.
- [ ] **Fix the broken project links.** `pyproject.toml` sets
      `Homepage`/`Repository = https://github.com/readevb/rea`, but the real remote is
      `github.com/aliyenidede/rea` (and the README CI badge points at `aliyenidede`). Pick the
      canonical org and make pyproject + README + PyPI consistent.
- [ ] **Add a 2-minute demo** (asciinema or gif) embedded near the top of the README. For a
      workflow tool, showing beats telling.
- [ ] **Repo hygiene pass.** `dist/`, `.playwright-mcp/`, and the caches are already in
      `.gitignore` — verify none are actually tracked. Tidy commit-message noise going forward
      (the "session lessons" chores read messy for a public project).

### Tier 2 — The single highest-leverage move: publish the lessons

The accumulated rules in CAW's `CLAUDE.md` are the strongest OSS asset there is — a competitor
cannot copy them because they came from real production pain. Publishing them is simultaneously
the **marketing, the proof, the docs, and the differentiator.** If only one thing gets done, this.

- [ ] **Extract 8–10 of the best rules** and generalize them away from CAW specifics. Candidates:
      Transaction-Scope Verification, Frozen Dataclass Mutation, Parallel Implementer Commit
      Hygiene, Kill-Switch Fork Fallback Contract, Legacy-Replacement Side-Effect Parity,
      Scale-up Napkin-Math, Real-Backend Smoke Test, Numbered-Registry Test-Count, SELECT-Filter
      Caller-State Verification.
- [ ] **Write them up** as a blog post / X thread: *"Field notes from running Claude Code on a
      live trading system."*
- [ ] **Link the writeup from the README** as the "why this is different" anchor.

### Tier 3 — Widen + open to contribution (only after a soft launch shows real signal)

- [ ] **AGENTS.md generation.** Emit it alongside `CLAUDE.md` from the REA template. Covers ~80%
      of "works in every CLI" overnight — Codex, Cursor, and Gemini CLI all read it. This is the
      cheap cross-tool win; do it before any per-tool porting.
- [ ] **Obsidian-native brain (near-zero cost, distinctive).** `.rea/` is already markdown and the
      memory system already uses `[[wikilinks]]`. Point an Obsidian vault at it and graph +
      backlinks work out of the box. Document it as a first-class feature.
- [ ] **Thin MCP server (optional, only if a real cross-tool need appears).** Expose REA's value —
      plan, review, memory, lessons — as MCP tools. This is the "Archon-like" idea at the *right*
      scale: one surface, every MCP-capable CLI, no N ports. Stop short of UI + RAG + DB.
      (`hex-graph` being an MCP server is proof this direction is right.)
- [ ] **Contribution surface.** `CONTRIBUTING.md`, a short `ROADMAP.md`, and a few
      `good first issue`s so others *can* contribute.
- [ ] **Distribution.** Submit to `awesome-claude-code` lists; post to r/ClaudeAI and X.

---

## Guardrails

- **Not a big-bang launch.** Ship Tier 1 + the lessons writeup → soft launch → watch for real
  usage → invest in Tier 2/3 based on signal. Genuine OSS is demand-driven iteration, not a
  polish marathon.
- **Set the bar correctly:** "others can trust it and use it" — not "10k stars." Keeps the project
  healthy and anxiety-free, and keeps it from becoming an unfinished side project.
- **Maintenance is a decision.** "Best-effort maintained" is legitimate, but choose the engagement
  level up front — genuine OSS means issues, PRs, and questions will arrive.
- **Keep dogfooding.** "I use this every day to run a live trading system" is the strongest
  credibility signal that exists. No README line beats it — keep using it and make it visible.
- **Every future pack = byproduct of a real task that week.** Never build a pack in the abstract.

---

## Suggested first step

Start with the **README rewrite** — it is the door everything else references — then the
**lessons writeup** immediately after. Those two are the highest-leverage first moves.
