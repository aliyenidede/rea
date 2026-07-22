# Todo — Faz 1: AGENTS.md + shims + `.rea/` structure

## Todo

- [x] Create the `templates/` scaffold — README + `.rea/` typed dirs
      Files: `templates/README.md`, `templates/.rea/knowledge/README.md`,
      `templates/.rea/decisions/README.md`, `templates/.rea/sessions/README.md`,
      `templates/.rea/plans/README.md`
      1. `templates/README.md`: what `templates/` is — install-artifacts the future npx installer
         places into a host project; distinct from the legacy `rea/templates/`; pointer to roadmap §4.
      2. Each `.rea/` subdir README (2–4 lines): purpose + naming rule + pointer to `core/rea-schema.md`.
         - knowledge = entity-name, update-in-place
         - decisions = `NNNN-slug`, append-only (supersede, never overwrite)
         - sessions = `YYYY-MM-DD-HHMM-slug`, timestamped
         - plans = `NNNN-slug/` dirs holding brief/spec/plan/todo
      Test: all 5 files exist; each `.rea/` README states its naming rule and links `core/rea-schema.md`;
      `templates/README.md` distinguishes itself from `rea/templates/`.

- [x] Create `templates/AGENTS.md` — the thin behaviour file
      Files: `templates/AGENTS.md`
      1. Wrap ALL content in managed markers `<!-- rea-tools:start -->` … `<!-- rea-tools:end -->`.
      2. Section 1 — Behaviour (`talk`): thinking engineer + curious researcher; anti-sycophantic
         (disagree when warranted, no flattery, ground claims); steer behaviour, don't assign a role.
      3. Section 2 — `capture` reflex: 3 triggers (correction/lesson; non-obvious decision; bug
         root-cause) → write a small `.rea/` note per `core/rea-schema.md` formats; one-line
         memory-write filter (durable project knowledge, not the tool's own mistakes — "true & useful
         if another tool opened the project?"); writes only to `.rea/`; knowledge update-in-place +
         collision guard; no hooks.
      4. Section 3 — read = pull: read relevant `.rea/` notes on demand, follow `[[links]]`, never
         auto-dump.
      5. Section 4 — map: principles → `core/principles.md`; craft → `core/craft-checklist.md`;
         schema → `core/rea-schema.md`; memory → `.rea/`.
      Test: file has all 4 sections; contains the managed markers; the body carries NO host-tool names
      or command names (grep for these absent from the behaviour/reflex prose: `Claude`, `.claude`,
      `/rea-`, `Codex`, `Gemini`, `Cursor`, `OpenCode`, `oh-my-pi`, `omp` — the `rea-tools:` marker is
      allowed); explicitly states "writes only to `.rea/`".

- [x] Create the per-tool shims
      Files: `templates/shims/CLAUDE.md`, `templates/shims/gemini-settings.json`,
      `templates/shims/README.md`
      1. `shims/CLAUDE.md`: managed-marker block whose managed region is exactly `@AGENTS.md`.
      2. `shims/gemini-settings.json`: the settled nested shape
         `{"context": {"fileName": ["AGENTS.md", "GEMINI.md"]}}` (per roadmap §4 +
         `docs/researches/cross-cli-instruction-command-discovery.md`) — NOT a flat `contextFileName`
         string. Must be valid JSON. Only re-verify if that research doc reads stale; do not re-open the
         key name.
      3. `shims/README.md`: which tool each shim targets — needs a shim: CLAUDE.md → Claude Code,
         gemini-settings.json → Gemini CLI; reads AGENTS.md natively (no shim): Codex, OpenCode, Cursor,
         oh-my-pi. The G6b never-blind-overwrite rule (markers vs JSON merge); pointer to
         `core/rea-schema.md` "Shim write semantics".
      Test: `CLAUDE.md` contains the markers + exactly `@AGENTS.md` in the managed region;
      `gemini-settings.json` parses as JSON AND has the nested `context.fileName` as an array containing
      `"AGENTS.md"` (not a flat scalar key); `README.md` names each shim's target tool, lists oh-my-pi
      among the native-read tools, and states the G6b rule.

- [x] Doc-sync: repo README + project CLAUDE.md + roadmap status
      Files: `README.md`, `CLAUDE.md`, `docs/rea-roadmap.md`
      1. `README.md`: short note that `templates/` holds the Phase-1 `AGENTS.md` + shims + `.rea/`
         scaffold; pointer to roadmap §4 (place near the existing `core/` note).
      2. `CLAUDE.md`: one line under File Structure for the new top-level `templates/` (redesign-era
         install artifacts); note the legacy `rea/templates/` is unchanged.
      3. `docs/rea-roadmap.md`: flip Phase 1 `🔵 → ✅` (done) with a pointer to
         `.rea/plans/0006-faz1-agents-shims/`.
      4. `docs/rea-roadmap.md` §10 (or Phase 4 bullet): add a one-line forward note that the `core/`
         host-project placement is a **provisional Phase-1 assumption Phase 4 must honour** (installer
         vendors the full `core/` trio into every host so `AGENTS.md`'s map pointers resolve) — so the
         assumption isn't lost between now and Phase 4. (plan-reviewer's non-blocking suggestion.)
      Test: `README.md` + `CLAUDE.md` both reference `templates/`; roadmap Phase 1 status = ✅; roadmap
      records the `core/`-placement forward note; no other roadmap phase status changed.
