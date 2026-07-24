---
name: distribution-channels
description: Where REA's products are published and the current state of each channel — npm (maintained) vs PyPI (frozen/deprecated).
type: reference
links:
  - 0001-distribution-and-rollback
  - 0003-npm-package-name-readev-tools
---

# Distribution channels

Two published channels, one maintained.

**npm — `readev-tools` (maintained).** `npx readev-tools setup|verify|migrate <project>`. First
release `0.1.0`, published 2026-07-24. Package name is deliberately *not* the repo name — npm
blocked `rea-tools` as too similar to existing packages, see [[0003-npm-package-name-readev-tools]].
Requires Node ≥20, no runtime deps.

**PyPI — `rea-dev` (frozen, deprecated).** Last release `0.7.2`, published 2026-07-24. Behaviour is
0.7.1 plus a deprecation notice; `PYPI.md` is a deprecation front-door (migration commands, old→new
command mapping) rather than a product pitch, and the package carries
`Development Status :: 7 - Inactive`. `pip install rea-dev==0.7.1` stays available as the frozen
fallback per the rollback plan in [[0001-distribution-and-rollback]]; the matching source tree is
tagged `pre-redesign-v0.7.1`.

No new features land on PyPI. A release there would only ever be another deprecation-notice bump.

**Publishing.** PyPI: `python -m build` → `twine check dist/*` → `twine upload dist/*`, auth from
`~/.pypirc` (`__token__` + a project-scoped token). Verify against
`https://pypi.org/pypi/rea-dev/<version>/json` — the package-level `/json` endpoint is CDN-cached and
can still show the previous version for minutes after a successful upload.
