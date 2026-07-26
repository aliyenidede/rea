## What does this change?

<!-- One or two sentences: what changed and why. -->

## Checklist

- [ ] `npm test` passes locally (`node --test --test-concurrency=1 test/*.test.js`)
- [ ] If this touches the frozen Python shim (`rea/`, `tests/`): `ruff check .`, `ruff format --check .`,
      and `pytest` all pass
- [ ] If this changes workflow behavior, I edited `templates/`/`core/` — not the generated
      `.claude/`/`.gemini/` output
- [ ] This branch is off `main` (not `staging`), and the PR targets `main`
- [ ] `docs/` and/or `CHANGELOG.md` are updated if this change is user-visible
