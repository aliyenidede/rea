# docs

Public, curated documentation for readev-tools. Internal planning notes (roadmap, target state,
research) and this repo's own `.rea/` runtime memory live outside the tracked tree — this
directory is the adopter-facing entry point.

- **[faq.md](faq.md)** — the questions a new adopter actually asks: what `setup` writes, whether it
  overwrites your files, what `.rea/` is and whether to commit it, how to update/uninstall,
  cross-tool support, `setup` vs `migrate`, data handling, and more.
- **[../README.md](../README.md)** — the project front door: what readev-tools installs, the
  `/rea-grill` → `/rea-plan` → `/rea-execute` → `/rea-ship` pipeline, install and update commands.
- **[../CONTRIBUTING.md](../CONTRIBUTING.md)** — how to propose a change, run the test suite, and
  the branch/PR workflow.
- **[decisions/](decisions/)** — promoted architecture decision records:
  - [0001-distribution-and-rollback.md](decisions/0001-distribution-and-rollback.md) — why
    `rea-tools`/`rea-cli` are separate repos, plus the redesign's success metric and rollback plan.
  - [0002-safe-path-hardening.md](decisions/0002-safe-path-hardening.md) — the shared
    `src/safe-path.js` symlink-escape (CWE-59) guard every filesystem write in the installer
    routes through.
