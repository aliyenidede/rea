---
name: scaffold-readme-ownership-drops-on-resetup
description: A second `setup` drops the four .rea/<type>/README.md scaffold files from manifest ownership; they survive on disk because prune's deny-list protects .rea/ memory. Benign manifest cosmetic, not data loss.
type: reference
links:
  - installer-testing-and-tooling
---

# Scaffold READMEs drop out of `ownedFiles` on a second `setup`

Observed during plan 0012 U5's live host run: a host's manifest `ownedFiles` count went **28 → 24**
across two consecutive `node bin/readev-tools.js setup <host>` runs, with `pruned 0` both times and
every file still present on disk. The four lost entries are the typed-scaffold READMEs
(`.rea/knowledge/README.md`, `.rea/decisions/README.md`, `.rea/sessions/README.md`,
`.rea/plans/README.md`).

## Mechanism (all code-grounded)

1. `setup.run()` builds a **fresh** manifest every run — `manifest.createEmptyManifest()` at
   `src/setup.js:123`, not a load-and-merge. `currentOwned` is only what *this* run placed/shimmed.
2. `placeReaScaffold` (`src/place.js`) copies a typed dir's `README.md` **only when that dir is
   missing or empty** ("add-only-if-missing"). On run 1 the dirs are empty → the four READMEs are
   placed and recorded. On run 2 the dirs are non-empty → `placeReaScaffold` skips them → they are
   never recorded into the fresh manifest → they leave `ownedFiles`.
3. They therefore become prune candidates: `prune()` diffs `previouslyOwned` (28, from run 1's saved
   manifest) minus `currentOwned` (24) → the four READMEs (`src/prune.js:141-150`).
4. But `isProtected()` (`src/prune.js:114`) returns true for anything under the `DENY_PREFIXES`
   `.rea/knowledge/`, `.rea/decisions/`, `.rea/sessions/`, `.rea/plans/` (`src/prune.js:87-93`), so
   prune skips all four → `pruned 0`, files untouched.

Net effect: the files are physically safe forever (the deny-list protects `.rea/` memory
unconditionally — the whole point of that guard), but their **ownership record** is lost after the
first re-setup.

## Why it is benign, and the one edge it forecloses

No data loss and no wrong deletion — the deny-list would protect these paths from prune whether or
not the manifest owns them. The only thing lost is manifest-driven cleanup: if the tool ever
*retired* a scaffold README (removed it from the shipped set), the manifest could not drive its
deletion after the first re-setup — but the deny-list would refuse to delete it anyway, so this is
already impossible by design. So the ownership drop is a cosmetic manifest inconsistency, not a bug
to fix.

Practical consequence for anyone auditing a host: **do not treat a shrinking `ownedFiles` count
across re-setups as evidence of loss.** The always-overwritten copies (commands, agents, core trio,
shims) stay owned every run; only the once-placed scaffold READMEs churn out. Related install
mechanics: [[installer-testing-and-tooling]].
