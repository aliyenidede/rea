# Plan — Path-safety hardening: shared `src/safe-path.js` + symlink-escape fix

Standalone hardening plan for the rea-tools npx installer. Closes the roadmap §9 carry-forward
`safe-path.js` debt AND **two live, high-severity security bugs** found during the 4c review +
adversarial plan-review (2026-07-23): symlink containment bypasses that allow arbitrary-file-write via
the shipped `npx rea-tools setup`, in BOTH `src/shims.js` (shim writes) and `src/place.js` (content
placement — the larger surface). Old bootstrap format (`NEXT:` markers, `[ ]`/`[x]`), one commit per
unit (1–3 files). No new runtime deps — Node built-ins + `node:test`.

**Scheduling:** independent of plan 0010's 4d (migration) — either order. But this plan **MUST land
before any `npm publish`**: U1→U2→U3 are the security-critical spine (both live write vulns). U4
(prune de-dup) is behaviour-preserving; U5 is doc/ADR.

---

## Why — the live vulnerabilities

**Mechanism (common to both):** a lexical-only containment check (`path.resolve()` +
`startsWith(resolvedRoot + path.sep)`) never touches the filesystem, so it cannot detect that a path
component *inside* `targetRoot` is a symlink pointing outside it. `fs.writeFileSync`/`copyFileSync`/
`mkdirSync`/`readFileSync`/`existsSync` all follow symlinks by default. `git clone` checks out POSIX
symlinks as real symlinks by default, so a malicious repo/starter-template can plant one; `npx
rea-tools setup` then writes/copies **through** it to an arbitrary location outside the project root
(persistence / RCE-adjacent). No prior victim access needed.

**Instance A — `src/shims.js` `resolveInsideRoot` (lexical only).** Used by `writeMarkdownShim`/
`writeGeminiShim` (writes) and reused by `src/verify.js` (reads). A symlink named `AGENTS.md`,
`CLAUDE.md`, or `.gemini/settings.json` under the target root gets written through. verify's reuse is
a lower-severity read oracle / content leak.

**Instance B — `src/place.js` (NO containment check at all).** `copyFlatDir` (src/place.js:66-87) does
`fs.mkdirSync(path.dirname(destPath), {recursive:true})` then `fs.copyFileSync(srcPath, destPath)` with
ONLY an identity/self-copy comparison — no containment, no realpath. `placeReaScaffold`
(src/place.js:96-123) has the same pattern for `.rea/<type>/README.md`. `setup.js` runs `place()`
unconditionally, BEFORE `writeShims()`, every run (src/setup.js:122). A single planted **directory**
symlink (e.g. `.claude`, `core`, `.rea/knowledge`) redirects EVERY file placed under it at once — a
larger surface than shims (dozens of placed files vs. 3 shims). **This plan's original draft wrongly
scoped place.js out** ("dests are fixed LAYOUT literals → nothing to contain"); a fixed dest *name*
does not prevent symlink escape of a *directory component*. Corrected here (adversarial plan-review G1).

**Contrast — `src/prune.js` is the only currently-safe caller.** Before every `rmSync` it does
`fs.realpathSync` and re-checks containment against the real root (CWE-59), and it SKIPS (continue) a
violating candidate rather than throwing. The root cause of A+B is duplication: containment /
canonicalization / self-copy / realpath logic was reimplemented independently across the modules, and
each shipped a different subtle bug historically (`.rea/lessons.md` 2026-07-23). The fix is one shared,
tested primitive every module calls.

---

## Context (what exists today — reuse, replace, or leave)

- `src/shims.js` — `resolveInsideRoot(targetRoot, relFile)` **LEXICAL ONLY (Instance A)**. **THREE**
  external consumers (re-confirmed by grep 2026-07-23): `src/verify.js` (3 read call sites),
  **`src/settings-surgery.js`** (line 55 `require('./shims')` → line 139 `resolveInsideRoot(targetRoot,
  '.claude/settings.json')` before an `fs.writeFileSync` — a **write** site added by plan 0010's 4d-1
  AFTER this plan's original grep, so it silently inherits Instance A), and `test/shims.test.js` (a direct
  test block). The original "exactly two consumers" claim was stale — settings-surgery is a real third
  importer; U2 must repoint it too or removing the shims export both breaks `migrate` at runtime AND
  leaves its `.claude/settings.json` write vulnerable. Marker/JSON shim logic is out of scope — keep.
- `src/manifest.js` — `save()` (lines 177-179) writes `.rea/.rea-manifest.json` via
  `mkdirSync(dirname)` + `writeFileSync` + `renameSync` with **no containment guard**. An escaping `.rea`
  directory symlink would redirect this write. **Low severity** (fixed filename `.rea-manifest.json` +
  rea-tools-generated JSON content — not attacker-chosen path or content), but same class. See Decision 8.
- `src/place.js` — `copyFlatDir` + `placeReaScaffold` write with **no containment guard (Instance B)**;
  self-copy guarded only by an inline `path.resolve(srcPath) !== path.resolve(destPath)`. Dests are
  fixed `LAYOUT` literals, but the dest *directory components* can be attacker-controlled symlinks.
- `src/prune.js` — exports `toCanonicalRel(root, rel)`, `isInsideRoot(root, rel)` (STRICT — root-equal
  refused), an internal realpath symlink-escape re-check that **SKIPS (continue), never throws**
  (src/prune.js:205-213, contract at :30-33), plus the deny-list (`DENY_PREFIXES`/`DENY_FILES`/
  `isProtected`). The realpath/containment/canonicalization pieces are the reference to hoist; the
  **deny-list stays in prune** (delete-policy, not a generic primitive).
- `src/verify.js` — imports `shims.resolveInsideRoot` in `checkOwnedFilesPresent`,
  `checkMarkdownShimRegion`, `checkGeminiShimRegion`. Repoint at `safe-path` directly.
- `src/rea-archive.js` (added later by plan 0010's 4d-3) — a FIFTH consumer: it reuses
  `prune.isInsideRoot`/`toCanonicalRel` for lexical destination containment AND carries its OWN bespoke
  nearest-existing-ancestor realpath guard (added as 4d-3 "FIX E" to close a destination-side symlink
  escape before `migrate` went live). When safe-path lands, replace that bespoke guard + the lexical
  reuse with `safePath.resolveInsideRoot`/`isRealpathInsideRoot` — a sixth migration site so the
  realpath logic is truly single-source. (Its `lstatSync` source-side guard, 4d-3 FIX B, is a separate
  concern and stays.)
- Test suites that must stay green: `test/{shims,prune,place,setup,verify,cli,templates,manifest}.test.js`.
  Canonical runner: `node --test --test-concurrency=1 test/*.test.js`. CI runs `npm test` on
  `ubuntu-latest` (`.github/workflows/ci.yml`) — Linux exercises the real symlink path.

---

## The fix design (the non-obvious parts — capture these so no session re-derives them)

### The realpath guard, as a NON-THROWING boolean that both callers share

The plan already establishes a boolean/throwing sibling pair for the LEXICAL layer (`isInsideRoot`
boolean vs. `resolveInsideRoot` throws). Extend the SAME pattern to the realpath layer so prune (which
must SKIP a violating candidate) and shims/place/verify (which must REFUSE = throw) share one
implementation with opposite reactions to the same boolean (adversarial plan-review G2 / Decision 2):

`isRealpathInsideRoot(root, rel)` → boolean, NEVER throws:
1. `resolvedRoot = fs.realpathSync(path.resolve(root))` (root must exist — caller error otherwise).
2. `dest = path.resolve(resolvedRoot, rel)`.
3. Find the nearest EXISTING ancestor of `dest`: try `dest`; if it does not exist, walk up parent by
   parent until one exists (it will — `resolvedRoot` exists and lexically contains `dest`).
4. `try { real = fs.realpathSync(nearestExisting) } catch { return false }` — a realpath failure
   (permission, race) means "cannot confirm inside" → false (the safe default for BOTH callers).
5. return `real === resolvedRoot || real.startsWith(resolvedRoot + path.sep)`.

Why nearest-existing-ancestor (not realpath `dest` only): the naive dest-only fix is **INCOMPLETE and
false-safe** — a brand-new file whose *parent directory* is an escaping symlink has a non-existent
`dest`, so `realpathSync(dest)` throws ENOENT and a dest-only guard returns "ok" unchecked; the write
still escapes. Walking to the nearest existing ancestor catches both a dest-that-is-a-symlink and a
dest-whose-existing-parent-chain-escapes, while still allowing legitimate new-file creation under a
real in-root dir.

`resolveInsideRoot(root, rel)` → absolute dest, THROWS on escape (for shims/place/verify writes+reads):
1. Lexical guard: `dest === resolvedRoot || dest.startsWith(resolvedRoot + path.sep)` else throw.
2. `if (!isRealpathInsideRoot(root, rel)) throw` — refuse to write/read through an escaping symlink,
   or when containment cannot be confirmed (safe default = refuse).
3. return `dest`.

prune calls `isRealpathInsideRoot` directly and `continue`s on false (its skip-not-throw contract is
preserved by construction — it never calls the throwing `resolveInsideRoot`).

### Exported surface (single source of truth)
- `toCanonicalRel(root, rel)` — forward-slash, `..`-collapsed, absolute-resolved rel (from prune).
- `isInsideRoot(root, rel)` — strict LEXICAL boolean containment, root-equal refused (from prune).
- `isRealpathInsideRoot(root, rel)` — non-throwing realpath containment, new-file-tolerant (above).
- `resolveInsideRoot(root, rel)` — absolute dest, lexical + realpath guarded, THROWS on escape (the
  security fix; used by shims/place writes and verify reads).
- `isSamePath(a, b)` — `path.resolve` equality, case-folded on a case-insensitive FS (place self-copy).
- (Deny-list `isProtected` stays in `prune.js` — consciously overriding the `.rea/lessons.md` 2026-07-23
  suggestion to fold it in: it is delete-policy, not a generic containment primitive.)

### Known residual limits (state them, don't pretend they're closed)
- **TOCTOU:** the realpath check and the later write are not atomic; a symlink swapped in between still
  races. Out of scope (would need `O_NOFOLLOW`/`openat` semantics Node doesn't expose portably) —
  document in the ADR as a residual, matching prune's existing same-window limitation.
- **Mid-path symlink to an in-root location** is allowed (case g) — a symlink that resolves back INSIDE
  root is not an escape; refusing it would break legitimate symlinked project layouts.

### Cross-platform symlink testing (the test trap — asymmetric skip)
Creating a symlink on Windows needs admin/Developer Mode → `fs.symlinkSync` may throw `EPERM`/`ENOSYS`.
Rule (adversarial plan-review G3 / Decision 4): attempt creation; **on `win32`, `t.skip(...)` LOUDLY**
on EPERM/ENOSYS; **on any OTHER platform (incl. CI-Linux), an EPERM/ENOSYS is `assert.fail`, NOT a
skip** — so the security regression can never silently stop running on the one platform that is the
real coverage backstop. A silently-skipped security test reads as "covered" when it isn't
(`.rea/lessons.md` 2026-07-23 zero-match-glob). Prefer a file-symlink for the file-escape case and a
directory **junction** (`fs.symlinkSync(target, link, 'junction')` — no elevation needed on Windows)
for the dir-parent-escape and place.js dir-symlink cases.

---

## Units

### U1 — `safe-path` module + security regression tests
- Files: `src/safe-path.js`, `test/safe-path.test.js`.
- Author the consolidated primitive per "Exported surface", incl. the non-throwing
  `isRealpathInsideRoot` (nearest-existing-ancestor) and the throwing `resolveInsideRoot` built on it.
  Hoist prune's `toCanonicalRel`/`isInsideRoot` logic verbatim as the lexical base.
- Tests: lexical rejects (`../x`, absolute-elsewhere, root-equal for `isInsideRoot`); canonicalization;
  `isSamePath` incl. case-insensitive FS; **security regressions** — (d) `resolveInsideRoot` throws
  when `dest` is an escaping symlink; (e) throws when `dest` is a new file whose existing parent is an
  escaping junction; (f) returns dest for a legit new file under a real in-root dir; (g) allows a
  symlink resolving INSIDE root; (h) `isRealpathInsideRoot` returns the matching booleans for (d)–(g)
  WITHOUT throwing. Asymmetric skip rule (win32 skip-loud / else assert.fail).

### U2 (SECURITY-CRITICAL) — migrate shims + verify + settings-surgery to `safe-path`
- Files: `src/shims.js`, `src/verify.js`, `src/settings-surgery.js`, `test/shims.test.js`,
  `test/settings-surgery.test.js`.
- **Approved exception to the 1–3-files/unit convention (5 files, ONE commit):** removing
  `resolveInsideRoot` from `shims.js`'s exports and repointing every importer are inseparable — any
  intermediate commit leaves an importer calling a removed export (broken build / crashed `migrate`). So
  the export removal + the verify + settings-surgery repoints + both regression tests land atomically.
- Replace shims' local lexical `resolveInsideRoot` with `require('./safe-path')`. **Remove
  `resolveInsideRoot` from `shims.js`'s public exports entirely** (no thin re-export — avoids the
  two-homes ambiguity; Decision 3/Option B). **Repoint ALL THREE importers** at
  `safePath.resolveInsideRoot`: `src/verify.js` (3 read sites) AND **`src/settings-surgery.js`** (its
  `.claude/settings.json` write — leaving it on the removed export throws TypeError and breaks `migrate`;
  repointing also closes its inherited Instance A write vuln). This removal + all repoints must land in
  **one commit** (atomic — the export and its importers can't be split). Move `test/shims.test.js`'s
  `resolveInsideRoot` block into `test/safe-path.test.js` (it tests the primitive, not shims behaviour) —
  or delete it there if U1 already covers it.
- RED: (1) `writeShims`/`writeMarkdownShim`/`writeGeminiShim` REFUSES to write when the target's
  `AGENTS.md`/`CLAUDE.md`/`.gemini/settings.json` is a symlink escaping the target root (outside file
  untouched; write throws). (2) `removeDeadRouterHook` REFUSES to write when `.claude`/`.claude/settings.json`
  is an escaping symlink/junction (outside untouched; throws). Both skip-asymmetric.
- Test: both symlink-escape writes refused (Instance A closed for shims AND settings-surgery); shims +
  verify + settings-surgery + templates tests green; full suite green.

### U3 (SECURITY-CRITICAL) — add containment to `place` writes + migrate self-copy guard
- Files: `src/place.js`, `test/place.test.js`.
- Guard every place write with containment BEFORE the fs op: in `copyFlatDir`, call
  `safePath.resolveInsideRoot(targetRoot, <relDest>)` before `fs.mkdirSync`/`fs.copyFileSync` (throws →
  setup aborts, the safe response to a malicious symlink at install time); same for
  `placeReaScaffold`'s `destReadme`/`hostTypeDir`. Replace the inline self-copy comparison with
  `!safePath.isSamePath(srcPath, destPath)`. Compose cleanly with the dogfood `core→core` self-copy
  (destPath resolves to a real in-root file there → containment passes, self-copy still skipped).
- RED: a **directory-symlink** regression — replace a placed dest dir (e.g. `.claude`) with a junction
  escaping the target root, run `place()`, assert NO file is written through it (throws/refuses; the
  outside target is untouched). Skip-asymmetric. Keep the dogfood self-copy test green.
- Test: Instance B closed; place.test.js (esp. self-copy) green; full suite green.

### U4 — migrate prune to safe-path (de-dup) + guard `manifest.save` (behaviour-preserving, keep deny-list)
- Files: `src/prune.js`, `src/manifest.js`, `test/prune.test.js`, `test/manifest.test.js` (4 files — a
  behaviour-preserving prune de-dup plus a one-line manifest guard and their tests).
- Replace prune's local `toCanonicalRel`/`isInsideRoot` and its inline realpath re-check with the
  shared equivalents — prune calls the **non-throwing** `safePath.isRealpathInsideRoot` and `continue`s
  on false (NEVER the throwing `resolveInsideRoot` — that would convert prune's skip-one-candidate
  contract into an abort-the-whole-prune crash; adversarial plan-review G2). KEEP `DENY_PREFIXES`/
  `DENY_FILES`/`isProtected` in prune. Behaviour-preserving; existing prune guard tests are the contract.
- **Guard `manifest.save` (Decision 8):** wrap `.rea/.rea-manifest.json` in
  `safePath.resolveInsideRoot(targetRoot, MANIFEST_REL_PATH)` before the `mkdirSync`/`writeFileSync`, so
  an escaping `.rea/` symlink is refused. Low-severity same-class closure — folded here rather than the
  security spine because it can't be weaponised for arbitrary content/filename.
- Also update `test/prune.test.js`'s EXISTING "FIX5" symlink/junction-escape test (~lines 528-573),
  which currently `t.skip(...)`s on ANY platform where `fs.symlinkSync` throws — the exact G3 anti-pattern,
  and the one pre-existing security regression in the suite — to the asymmetric rule (win32 skip-loud /
  every other platform assert.fail). Test-only change; does not affect prune()'s behaviour or the
  "behaviour-preserving" claim (adversarial plan-review, re-review Decision).
- Test: prune.test.js green incl. the (now asymmetric-skip) symlink/junction-escape skip and
  root-equal/deny-list/EBUSY→failed guards; no observable behaviour change. **manifest.test.js:** a new
  case asserts `manifest.save` refuses (throws) when `.rea` is an escaping symlink/junction, and the
  existing save round-trip tests stay green (skip-asymmetric).

### U5 — doc-sync + ADR
- Files: `docs/rea-roadmap.md`, `.rea/decisions/0002-safe-path-hardening.md`.
- roadmap §9 "Carry-forward debt": **ADD a new closed-item entry** naming the shared `safe-path.js` +
  symlink-escape fix (the roadmap did NOT previously list safe-path debt — that framing lived only in
  the assistant's memory; plan-validator defect). Falsifiable acceptance: §9 names the safe-path.js
  symlink-escape fix as a closed item.
- ADR `0002-safe-path-hardening.md`: record the vulnerabilities — Instance A (lexical-only
  `resolveInsideRoot` in shims, inherited by **`verify` reads** and **`settings-surgery` writes**) +
  Instance B (`place` no-containment) → arbitrary write via `setup`/`migrate`; the low-severity
  `manifest.save` same-class site — the fix (one shared realpath-aware primitive,
  nearest-existing-ancestor tolerance, non-throwing boolean for prune), the modules converged
  (shims/verify/settings-surgery/place/prune/rea-archive/manifest), the residual TOCTOU limit, and the
  "must precede npm publish" gate. Note the stale "two consumers" inventory correction (settings-surgery
  found 2026-07-23). Next ADR number after `.rea/decisions/0001-distribution-and-rollback.md` → `0002`.

---

## Architecture decisions
- **One shared path primitive, every module calls it.** The recurring "same bug class, N slightly
  different holes" is only closed by a single tested source of truth — not by patching each site.
- **Realpath layer has a non-throwing boolean + a throwing sibling** (mirrors the lexical layer), so
  prune keeps skip-not-throw while shims/place/verify refuse — one implementation, opposite reactions.
- **Realpath re-check tolerant of new files via nearest-existing-ancestor** — closes dest-is-symlink
  AND parent-is-symlink without breaking legitimate new-file creation. Dest-only is rejected as
  false-safe.
- **place.js is security-critical, not de-dup.** It has the larger write surface; excluding it would
  make the U5 ADR's "class closed" claim false.
- **Deny-list stays in prune.** `isProtected` is delete-policy; hoisting it blurs responsibility
  (consciously overrides the lessons.md fold-in suggestion).
- **No new runtime deps; Windows first-class; asymmetric skip** so CI-Linux can never lose the security
  coverage silently.

## Decisions table
| # | Decision | Choice | Alternatives rejected | Rationale |
|---|----------|--------|-----------------------|-----------|
| 1 | Fix location | One shared `src/safe-path.js` used by shims/place/prune/verify | Patch each site | Duplication is root cause; per-site patches re-invite divergent bugs. |
| 2 | place.js scope | In the security-critical spine (U3), guarded + dir-symlink test | Defer as low-urgency de-dup / fast-follow | Same vuln class, LARGER surface; "class closed" ADR is false otherwise (plan-review G1). |
| 3 | Realpath primitive shape | Non-throwing `isRealpathInsideRoot` boolean + throwing `resolveInsideRoot` on top | One throwing primitive, prune wraps in try/catch | Prune's contract is skip-not-throw over many candidates; exceptions-as-control-flow is wrong + easy to get wrong (plan-review G2). |
| 4 | New-file realpath tolerance | Nearest-EXISTING-ancestor | realpath `dest` only | Dest-only lets a new file under a symlinked parent escape — false-safe. |
| 5 | shims `resolveInsideRoot` export | Remove entirely; repoint all **3** known importers (verify, settings-surgery, test) atomically | Keep a thin re-export alias | Re-export recreates the two-homes ambiguity the consolidation exists to kill. NOTE: the original "2 importers" count was stale — `settings-surgery.js` (0010/4d-1) is a third, security-relevant write consumer (verification 2026-07-23). |
| 8 | `manifest.js` `save()` unguarded write | Fold a one-line `safePath.resolveInsideRoot` guard into U4 (or U2) + note the residual in the U5 ADR | Leave unguarded / ignore | Same symlink-escape class via an escaping `.rea/` dir; low severity (fixed `.rea-manifest.json` name + generated JSON content), but guarding it makes U5's "class closed" claim fully true. |
| 6 | Deny-list home | Stays in `prune.js` | Move `isProtected` into safe-path | Delete-policy, not a path primitive; crisp module responsibility. |
| 7 | Windows symlink tests | Attempt; win32 → skip-LOUD, else → assert.fail | Uniform skip-loud on all platforms | A symmetric skip lets CI-Linux (the real backstop) drop the security test silently (plan-review G3). |

## Pre-mortem (filled against plan-reviewer output — the 3 most likely ways execution ships a wrong/incomplete fix, now mitigated)
1. **place.js ships an equivalent live vuln while the ADR claims the class is closed** (plan-review G1,
   HIGH). *Mitigated:* place.js is now U3 in the security spine with a dir-symlink regression test and a
   before-publish gate; the false "fixed literals → safe" premise is corrected in §Why/§Context.
2. **U4 makes prune throw-and-crash on an escape candidate instead of skipping** (plan-review G2,
   MED-HIGH). *Mitigated:* the shared realpath primitive is a non-throwing boolean (`isRealpathInsideRoot`);
   U4 explicitly forbids calling the throwing `resolveInsideRoot`; prune's skip test is the contract.
3. **Security regression reports green without ever running** — locally (win32 no Developer Mode) or on
   CI (a symmetric skip) (plan-review G3, MED). *Mitigated:* asymmetric skip — win32 skip-loud, every
   other platform (incl. CI-Linux) `assert.fail` on EPERM/ENOSYS; junctions used where they avoid
   elevation.
