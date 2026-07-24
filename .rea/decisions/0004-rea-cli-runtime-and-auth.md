---
number: 4
date: 2026-07-24
status: accepted
superseded-by:
---

# 0004 — rea-cli runtime & auth

## Status

Accepted — 2026-07-24. **Forward-looking:** this ADR records two still-live product-architecture
choices for **rea-cli** — the co-equal standalone-agent product (roadmap §7, phases C0–C4), which is
**not yet built or designed in depth**. It exists to **constrain** that future work, not to describe
shipped code.

> ⚠ **RE-VERIFY BEFORE rea-cli WORK BEGINS.** The Claude-subscription auth landscape is volatile
> (see "Volatility" below). Decision 2 rests on a policy that shifted repeatedly through 2026 — its
> source memory note is itself flagged volatile. Re-confirm the sanctioned-bridge status at the start
> of phase C1 before relying on this record.

## Context

rea-cli is a co-equal product but honestly **downstream** of readev-tools: it vendors the shared
`core/` (ADR 0001) and ports readev-tools' commands, so its meaty work follows readev-tools; only the
engine/provider scaffold (C0/C1) can start early. It has not had its own design pass yet — roadmap §7
is an explicit sketch, and §9 lists its component decisions as deferred.

The rationale for the two choices below currently lives **only** in `docs/rea-roadmap.md` §7 (which
marks the engine "locked" and the auth "volatile — re-verify") and in the memory note
[[pi-ohmypi-claude-sub]] (verified 2026-07-21, itself flagged volatile). A memory note is not a
durable commitment. This ADR promotes both choices into the append-only decision record so future
rea-cli work is bound to them by something that outlives a memory rotation.

## Decision

### 1. Runtime: rea-cli is an oh-my-pi plugin/config layer, not a rebuild

rea-cli is built **on oh-my-pi (omp)** — `can1357/oh-my-pi`, MIT, a batteries-included Pi fork — as a
**packaging + config layer, not a bespoke agent and not a hard fork.** omp already ships the substrate
rea-cli would otherwise have to build: web search (25-provider), parallel schema-validated subagents,
deterministic multi-subagent workflows, LSP, debugger (DAP), browser automation, git ops, an
MCP/plugin/package ecosystem, and — critically — **markdown slash-commands** (`.omp/commands/<name>.md`,
the same model as Claude Code's `.claude/commands/`), so readev-tools' commands port ~1:1.

rea-cli therefore = **omp + rea markdown commands/config**, embedded via the Node SDK
`@oh-my-pi/pi-coding-agent` (or as a plugin layer). No hard fork.

- **Single-maintainer upstream risk** (omp is one maintainer, like Orca) is **mitigated, not
  eliminated**, by omp being MIT-licensed and Node-SDK-embeddable. **Fork only if upstream dies** — a
  hard fork is the failure-mode escape hatch, not the plan.

### 2. Auth: Claude-subscription via the sanctioned Agent SDK bridge, not raw OAuth

A Claude Pro/Max **subscription** is used only through the **sanctioned Claude Agent SDK bridge**
(support.claude.com article 15036540). rea-cli **must not** use a raw subscription OAuth token — that
pattern (the OpenClaw case, which omp/Pi's `/login` OAuth path resembles) is the **ToS grey/restricted
case** and was enforced against in 2026.

Alongside the sub-via-SDK path, rea-cli supports **API-key auth and multi-provider config**, and
**keeps the provider layer flexible** — the auth/provider abstraction is a first-class seam, not
hardcoded to one path.

### Volatility (why the re-verify banner exists)

The Claude-sub auth policy moved repeatedly through 2026: a metered per-plan **programmatic credit
pool** ($20 Pro / $100 Max5x / $200 Max20x) was **announced 2026-06-15, then paused**; Agent-SDK usage
currently still draws on normal subscription limits. Decision 2 is correct **as of 2026-07-21** but is
the part of this ADR most likely to have shifted by the time C1 starts. The flexible provider layer
(Decision 2, last paragraph) is the structural hedge against exactly this churn.

## Consequences

- rea-cli's C0 (engine scaffold) and C1 (provider + auth) phases are now **bound to this record**:
  build on omp as a config/plugin layer, and gate Claude-sub auth through the Agent SDK. Reviving a
  from-scratch agent build, a hard fork (absent upstream death), or a raw-OAuth auth path requires a
  **new numbered ADR that supersedes this one** — never an edit to this file (per `core/rea-schema.md`
  decisions rule).
- The rationale is no longer memory-only. `docs/rea-roadmap.md` §7's "locked" engine note and its
  "volatile — re-verify" auth note now have a committed decision behind them; [[pi-ohmypi-claude-sub]]
  remains the underlying source-of-facts (with its own volatility flag).
- **Not decided here:** rea-cli's full design (its own grill→plan pass and `rea-cli-target-state` doc,
  per roadmap §7), the command-surface port (C2), interop/verify (C3), and branding/distribution (C4).
  This ADR fixes only the two engine/auth choices that C0/C1 need up front.
