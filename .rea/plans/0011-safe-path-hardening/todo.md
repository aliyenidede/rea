# Todo — Path-safety hardening: shared `src/safe-path.js` + symlink-escape fix

Old-format (`NEXT:` markers, `[ ]`/`[x]`), one commit per unit (1–3 files). Order:
U1 (safe-path primitive) → U2 (SECURITY-CRITICAL: shims+verify) → U3 (SECURITY-CRITICAL: place) →
U4 (prune de-dup) → U5 (doc/ADR). U2/U3/U4 depend on U1; U5 last. **U1+U2+U3 are the
must-land-before-npm-publish spine** (two live arbitrary-write vulns: shims writes AND place content
placement). See `plan.md` for the full fix design — especially the non-throwing
`isRealpathInsideRoot` boolean + nearest-existing-ancestor algorithm (dest-only is INCOMPLETE), the
prune skip-not-throw contract (never call the throwing `resolveInsideRoot` in prune), and the
ASYMMETRIC symlink-test skip rule (win32 skip-loud / every other platform assert.fail).

- [x] 11-1 — safe-path module + security regression tests
      Files: `src/safe-path.js`, `test/safe-path.test.js`
      RED: (a) `isInsideRoot` rejects `../x`, absolute-elsewhere, root-equal; accepts a normal nested
      path. (b) `toCanonicalRel` collapses `x/../y`, redundant `./`, and an absolute in-root path to the
      same forward-slash rel. (c) `isSamePath(a, a-different-case)` true on case-insensitive FS, false
      for genuinely different paths. SECURITY: (d) `resolveInsideRoot` THROWS when `dest` is a symlink
      escaping root; (e) THROWS when `dest` is a new file whose existing PARENT is an escaping junction;
      (f) RETURNS dest for a legit new file under a real in-root dir (no throw); (g) allows a symlink
      resolving INSIDE root; (h) `isRealpathInsideRoot` returns the matching booleans for (d)–(g)
      WITHOUT throwing (never throws — realpath failure → false). Skip rule: win32 `t.skip(...)` LOUD on
      EPERM/ENOSYS; every OTHER platform `assert.fail` on EPERM/ENOSYS.
      GREEN: `src/safe-path.js` exports `toCanonicalRel(root,rel)`, `isInsideRoot(root,rel)` (strict
      lexical boolean, root-equal refused), `isRealpathInsideRoot(root,rel)` (non-throwing realpath
      containment, nearest-existing-ancestor, new-file-tolerant), `resolveInsideRoot(root,rel)` (lexical
      + realpath guarded; THROWS on escape or unconfirmable containment), `isSamePath(a,b)` (case-folded
      on case-insensitive FS). Node built-ins only. Hoist prune's `toCanonicalRel`/`isInsideRoot`
      verbatim as the lexical base; build `resolveInsideRoot` on top of `isRealpathInsideRoot`.
      REFACTOR: one internal `nearestExistingAncestor(dest)` helper; `resolveInsideRoot` = lexical +
      `!isRealpathInsideRoot → throw`.
      Test: (a)–(h) pass; escape cases (d)/(e) genuinely throw, legit new-file (f) returns, (h) proves
      the boolean never throws; symlink-unavailable win32 host logs a visible skip, non-win32 fails hard.

- [x] 11-2 — (SECURITY-CRITICAL) migrate shims + verify + settings-surgery to safe-path
      Files: `src/shims.js`, `src/verify.js`, `src/settings-surgery.js`, `test/shims.test.js`,
      `test/settings-surgery.test.js`
      (5 files, ONE commit — approved exception to the 1–3 rule: removing the shims export + repointing
      every importer are inseparable; any intermediate commit breaks the build / crashes migrate.)
      RED: (1) a shims-level test that `writeShims`/`writeMarkdownShim`/`writeGeminiShim` REFUSES to write
      when the target's `AGENTS.md` (or `CLAUDE.md`, or `.gemini/settings.json`) is a symlink escaping
      the target root — the outside file the symlink points at is left UNTOUCHED and the write throws
      (skip-asymmetric). Confirm verify's owned/shim reads still resolve via the shared guard. (2) a
      settings-surgery test: `removeDeadRouterHook` REFUSES to write when `.claude` (or
      `.claude/settings.json`) is a symlink/junction escaping the target root (outside file untouched;
      throws) — closes settings-surgery's inherited Instance A.
      GREEN: replace shims' local lexical `resolveInsideRoot` with `require('./safe-path')`'s
      realpath-aware one. **Remove `resolveInsideRoot` from `shims.js`'s exports entirely** (no
      re-export alias). Repoint ALL THREE importers at `safePath.resolveInsideRoot` directly:
      `src/verify.js` (3 read sites) AND `src/settings-surgery.js` (line 55 `require('./shims')` → line
      139 `.claude/settings.json` write — leaving this on the removed shims export would (a) throw
      TypeError and break `migrate`, and (b) keep the lexical write vuln). Move `test/shims.test.js`'s
      `resolveInsideRoot` block into `test/safe-path.test.js` (or drop it if U1 covers it), since it tests
      the primitive, not shims behaviour. No change to shim marker/JSON logic.
      REFACTOR: single import site per module; drop the dead local implementation + its stale export.
      Test: both symlink-escape writes refused (Instance A closed for shims AND settings-surgery); all
      shims + verify + settings-surgery + templates tests green; full
      `node --test --test-concurrency=1 test/*.test.js` passes.

- [x] 11-3 — (SECURITY-CRITICAL) add containment to place writes + migrate self-copy guard
      Files: `src/place.js`, `test/place.test.js`
      RED: a **directory-symlink** regression — replace a placed dest dir (e.g. `.claude`) with a
      junction escaping the target root, run `place()`, assert NO file is written through it (the
      outside target is untouched; place throws/refuses). Skip-asymmetric. The dogfood `core→core`
      self-copy test (content preserved, not truncated, still recorded owned) stays green.
      GREEN: guard every place write with containment BEFORE the fs op — in `copyFlatDir`, call
      `safePath.resolveInsideRoot(targetRoot, <relDest>)` before `fs.mkdirSync`/`fs.copyFileSync`
      (throw → setup aborts, the safe response to a malicious symlink at install time); same for
      `placeReaScaffold`'s `hostTypeDir`/`destReadme`. Replace the inline
      `path.resolve(srcPath) !== path.resolve(destPath)` self-copy comparison with
      `!safePath.isSamePath(srcPath, destPath)`. Composes with the dogfood case (destPath resolves to a
      real in-root file → containment passes, self-copy still skipped).
      REFACTOR: single import; no inline resolve/containment logic left in place.js.
      Test: Instance B closed (dir-symlink write refused); place.test.js green (esp. self-copy); full
      suite green.

- [x] 11-4 — migrate prune to safe-path (de-dup) + guard manifest.save (keep deny-list)
      Files: `src/prune.js`, `src/manifest.js`, `test/prune.test.js`, `test/manifest.test.js`
      RED: existing prune guard tests (root-equal skip, deny-list skip, `../`-escape skip, symlink/
      junction-escape skip BEFORE unlink, EBUSY→failed) all still pass after prune delegates its
      containment/canonicalization/realpath to safe-path. Plus (Decision 8): `manifest.save` REFUSES to
      write when `.rea` is an escaping symlink/junction (guard `.rea/.rea-manifest.json` through
      `safePath.resolveInsideRoot` before the mkdir/write; low-severity same-class closure).
      GREEN: replace prune's local `toCanonicalRel`/`isInsideRoot` and its inline `fs.realpathSync`
      re-check with the shared calls — prune calls the **non-throwing** `safePath.isRealpathInsideRoot`
      and `continue`s on false; it MUST NOT call the throwing `resolveInsideRoot` (that would turn
      skip-one-candidate into abort-the-whole-prune). KEEP `DENY_PREFIXES`/`DENY_FILES`/`isProtected` in
      prune. Behaviour-preserving refactor.
      Also update `test/prune.test.js`'s EXISTING "FIX5" symlink/junction-escape test (~lines 528-573):
      it currently `t.skip(...)`s on ANY platform where `fs.symlinkSync` throws (the G3 anti-pattern) —
      change it to the asymmetric rule (win32 skip-loud / every other platform assert.fail). Test-only;
      prune()'s behaviour is unchanged.
      REFACTOR: prune imports only what it needs from safe-path; no duplicated path logic remains.
      Test: prune.test.js unchanged in intent, fully green (incl. the now-asymmetric FIX5 skip); no
      observable behaviour change (esp. the escape candidate is SKIPPED, not thrown). manifest.test.js: a
      new case asserts `manifest.save` refuses (throws) when `.rea` is an escaping symlink/junction;
      existing save round-trip tests stay green (skip-asymmetric).

- [x] 11-5 — doc-sync + ADR
      Files: `docs/rea-roadmap.md`, `.rea/decisions/0002-safe-path-hardening.md`
      1. roadmap §9 "Carry-forward debt": ADD a new closed-item entry naming the shared `safe-path.js`
         + symlink-escape fix (the roadmap did NOT previously list safe-path debt — that lived only in
         memory; do not "mark existing" — ADD).
      2. ADR `0002-safe-path-hardening.md`: record the vulns — Instance A (lexical-only shims
         `resolveInsideRoot`, inherited by `verify` reads AND `settings-surgery` writes) + Instance B
         (`place` no-containment) → arbitrary write via `setup`/`migrate`; the low-severity
         `manifest.save` same-class site; the fix (one shared realpath-aware primitive, non-throwing
         boolean for prune, nearest-existing-ancestor tolerance); the modules converged
         (shims/verify/settings-surgery/place/prune/rea-archive/manifest); the residual TOCTOU limit; the
         stale "two consumers" inventory correction (settings-surgery found 2026-07-23); and the "must
         precede npm publish" gate.
      Test: roadmap §9 names the safe-path.js symlink-escape fix as a closed item (falsifiable); the ADR
      states both instances + settings-surgery + manifest, the fix, the residual limit, and the publish gate.

## Follow-ups (post-plan, user-requested 2026-07-23)

- [x] 11-6 — migrate rea-archive to safe-path (close its remaining bespoke realpath guard)
      Files: `src/rea-archive.js`, `test/rea-archive.test.js`, `.rea/decisions/0002-safe-path-hardening.md`
      Repoint `prune.toCanonicalRel`/`prune.isInsideRoot` → `safePath`; replace the bespoke
      `isDestinationRealpathInsideRoot` (existsSync-based ancestor walk) with `safePath.isRealpathInsideRoot`
      (lstat-based — closes rea-archive's own dangling-link gap); drop the now-unused `prune` require;
      keep boolean/skip semantics (FIX E pushes to `failed`, never throws). Add a dangling-junction
      destination regression test. Update ADR 0002: rea-archive now converged (was "partial follow-up").
      Behaviour-preserving for existing cases; the dangling case is an improvement (now refused).

- [x] 11-7 — extract shared symlink test helpers to `test/helpers/`
      Files: `test/helpers/symlink-fixtures.js` (new) + every test file that duplicates the helpers.
      De-dup `handleLinkCreationFailure`/`createFileSymlinkOrSkip`/`createDirLinkOrSkip` (byte-identical
      across ~6 test files, flagged 3× as Minor) into one shared module (NOT matching `*.test.js` so the
      runner ignores it). Reconcile any pre-existing variant (rea-archive.test.js was the original). No
      behaviour change; full suite stays green.
