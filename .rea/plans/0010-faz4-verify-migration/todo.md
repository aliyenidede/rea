# Todo — Faz 4 (part 2): `rea verify` + v0.7.1→redesign migration

Old-format (`NEXT:` markers, `[ ]`/`[x]`), one commit per item (1–5 files). Order: 4c (verify) → 4d
(migration). 4c is independent; 4d builds on the 0009 modules (`manifest`/`shims`/`prune`/`setup`) —
within 4d the three helper modules (4d-1/4d-2/4d-3) precede the orchestrator (4d-4) that wires them.

## 4c — npx rea-tools verify

- [x] 4c-1 — verify module
      Files: `src/verify.js`, `test/verify.test.js`
      RED: (a) a healthy install fixture (manifest + all owned files + core/ trio + typed .rea/ dirs +
      a CLAUDE.md marker shim + .gemini/settings.json) → every check `pass`, `ok:true`; (b) a deleted
      owned file → that check `fail`, `ok:false`; (c) a CLAUDE.md with its markers stripped → shim check
      `fail`; (d) a `.gemini/settings.json` missing `AGENTS.md` in context.fileName → `fail`; (e) no CI
      workflow → a `skip` (not fail); (f) no manifest → single `fail` "not installed".
      GREEN: `verify(targetRoot)` returns `{checks:[{name,status,detail}], ok}`, read-only; drive checks
      from `manifest.load`/`listOwned` + a `\r?\n`-tolerant marker-presence check using the exported
      `shims.MARKER_START`/`MARKER_END` constants + `shims.resolveInsideRoot`; pick the markdown-marker vs
      `context.fileName` check per the recorded `shimRegions[].marker` value, never a hardcoded path.
      REFACTOR: one check-runner helper collecting {name,status,detail}.
      Test: cases (a)–(f) pass; verify writes nothing (fixture byte-unchanged after a run).

- [x] 4c-2 — wire the verify verb
      Files: `src/cli.js`, `test/cli.test.js`
      RED: `cli(["verify", fixtureHealthy])` → exit 0; `cli(["verify", fixtureBroken])` → exit 1;
      with `src/verify.js` absent → graceful placeholder + exit 0 (degrade like setup).
      GREEN: `handleVerify(target)` lazy-loads `./verify` (require.resolve graceful-degrade like
      `loadSetup`), prints the per-check PASS/FAIL/SKIP report, returns 0 when `ok` else 1; `DISPATCH.verify`
      passes `target`; update the usage string.
      REFACTOR: share the lazy-load helper shape with `loadSetup`.
      Test: the three dispatch cases pass; report lines render per check.

- [x] 4c-3 — doc-sync verify
      Files: `docs/rea-target-state.md`, `templates/commands/rea-tidy.md`
      1. target-state Terms line + §5.9: state the concrete `npx rea-tools verify`.
      2. rea-tidy.md's two "the dumb `rea verify` CLI verb (Phase 4)" references (≈lines 19, 160) →
         `npx rea-tools verify` (built, not future).
      Test: both docs name `npx rea-tools verify`; no "(Phase 4)" future-tense left on the verify refs.

## 4d — v0.7.1→redesign migration (one-time bridge)

- [x] 4d-1 — settings.json hook surgery
      Files: `src/settings-surgery.js`, `test/settings-surgery.test.js`
      RED: (a) a `.claude/settings.json` with the rea-router SessionStart hook + a PostToolUse lint hook +
      an unrelated key → after `removeDeadRouterHook(target)`, the router hook is gone, the lint hook + key
      survive, `changed:true`, `removed` names it; (b) a now-empty SessionStart array is dropped; (c)
      settings without the router hook → `changed:false`, no write; (d) missing settings.json → no-op; (e)
      `removeDeadRouterHook(target,{dryRun:true})` → same `{changed,removed}` result but the file is
      byte-unchanged.
      GREEN: `removeDeadRouterHook(targetRoot, {dryRun=false}={})`; structured JSON read-modify-write; match
      SessionStart inner-hook `command` containing `.claude/agents/rea-router.md`; preserve all else;
      containment-checked; stable formatting; write only if changed AND not dryRun.
      REFACTOR: a small "filter hooks by predicate" helper.
      Test: cases (a)–(d) pass; a byte-diff shows only the router hook removed.

- [x] 4d-2 — legacy scan (detect + report, never mutate)
      Files: `src/legacy-scan.js`, `src/shims.js`, `test/legacy-scan.test.js`
      RED: (i) a full-legacy fixture (real old CLAUDE.md body + markers appended, `claude-review.yml`,
      `post-tool-use.sh`) → three `{kind,path,advice}` findings; (ii) a clean redesign host → `[]`; (iii) a
      FRESHLY-SHIMMED CLAUDE.md (the canonical preamble note + markers, nothing else) → NO CLAUDE.md finding
      (false-positive closed); mutating nothing (fixture byte-unchanged).
      GREEN: read-only detection. CLAUDE.md check = content BEFORE the start-marker is non-empty AND not an
      EOL/whitespace-tolerant exact match to the shim's canonical preamble; export that preamble as a named
      constant (e.g. `CLAUDE_SHIM_PREFIX`) from `src/shims.js` and compare against it (single source of
      truth). The other two = file presence.
      REFACTOR: findings as a typed list.
      Test: cases (i)–(iii) pass; freshly-shimmed host yields no CLAUDE.md finding; no writes.

- [x] 4d-3 — legacy .rea/ archive (move, never delete)
      Files: `src/rea-archive.js`, `test/rea-archive.test.js`
      RED: a host with a NESTED `.rea/log/2026-01/x.md` + `.rea/lessons.md` + a typed `.rea/knowledge/k.md`
      → after `archiveLegacyRea(target)`, `.rea/_archive/log/2026-01/x.md` + `.rea/_archive/lessons.md`
      exist (relative structure preserved), the typed note is untouched, nothing deleted, `moved` names
      them; a second run → no-op; a host with no legacy memory → no-op; `archiveLegacyRea(target,
      {dryRun:true})` → same `{moved}` AND the full recursive tree listing is identical before/after (no
      stray `.rea/_archive/` dir created).
      GREEN: `archiveLegacyRea(targetRoot, {dryRun=false}={})`; move (rename, or copy+unlink) `.rea/log/` +
      `.rea/lessons.md` under `.rea/_archive/` preserving nested structure; never delete; create
      `.rea/_archive/` + subdirs ONLY when `!dryRun` AND there is something to move.
      REFACTOR: never-archive set = ONLY the typed dirs (`.rea/{knowledge,decisions,sessions,plans}`) + the
      manifest — do NOT use `prune.isProtected` (it protects `.rea/log/`+`lessons.md`, the very paths this
      moves); use `prune.isInsideRoot`/`toCanonicalRel` for containment.
      Test: legacy archived + typed untouched + nothing deleted; idempotent; dry-run moves nothing.

- [x] 4d-4 — migrate orchestrator + verb
      Files: `src/migrate.js`, `src/cli.js`, `src/setup.js`, `test/migrate.test.js`
      RED: (1) END-TO-END on a GENUINE legacy fixture — run `setup.run()` FIRST, THEN `migrate()` → migrate
      still does real work (dead router hook gone, lint hook + keys survive, `.rea/log`+`lessons.md`
      archived, typed dirs untouched, report lists the scanned artifacts + reminders) — proves migrate is
      NOT gated on `detectLegacyPresent` (which setup's prune would have falsified). (2)
      `migrate(target,{dryRun:true})` → identical report but the full recursive fixture tree is unchanged.
      (3) a clean redesign host (nothing to do) → "nothing to migrate". (4) running migrate twice → second
      run reports "nothing to migrate".
      GREEN: `migrate` SELF-GATES (no `detectLegacyPresent`): order `removeDeadRouterHook(t,{dryRun})`→
      `archiveLegacyRea(t,{dryRun})`→`scanLegacy(t)`→aggregate; "nothing to migrate" only if all three found
      nothing. Update `src/setup.js`'s legacy `PIP_UNINSTALL_NOTICE` to also say "run `npx rea-tools
      migrate`". Add `migrate` to `DISPATCH` + `handleMigrate`→exit code; add `--dry-run` to `KNOWN_FLAGS` +
      thread through `parseArgs`; usage → `<setup|verify|migrate> [target] [--full] [--dry-run]`.
      REFACTOR: sub-modules take a `{dryRun}` so the orchestrator stays thin.
      Test: both real + dry-run integration cases pass; non-legacy host short-circuits.

- [x] 4d-5 — doc-sync migration
      Files: `docs/rea-roadmap.md`, `docs/rea-target-state.md`
      1. roadmap §10: mark the v0.7.1→redesign migration UX resolved — name `npx rea-tools migrate`,
         its flag-and-guide + archive-not-delete behaviour, one-time Claude-legacy bridge.
      2. target-state §5.10: note the public path = archive-and-start-fresh (distiller stays private
         Phase-5).
      Test: roadmap §10 no longer lists the migration UX as open/undecided and names the `migrate` verb;
      §5.10 states the public archive path.
