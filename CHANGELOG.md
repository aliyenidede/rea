# Changelog

All notable changes to `readev-tools` are documented in this file. The format follows
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), and this project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.3] - 2026-07-26

### Added

- `readev-tools --help` / `-h` and `readev-tools --version` — print the usage and the package
  version to stdout and exit 0. Both short-circuit before the unknown-option check and verb dispatch.
- Contributor and transparency scaffolding: `CONTRIBUTING.md`, `SECURITY.md` (private vulnerability
  reporting), `CODE_OF_CONDUCT.md`, GitHub issue/PR templates, `.editorconfig`, and a user-facing
  `docs/` entry point (`docs/README.md` index + `docs/faq.md`).

### Removed

- `setup --full` — the flag looked like it mirrored the `/rea-init --full` slash command but never
  did CI/branch-protection work; it only changed what `setup` printed. The CLI now rejects `--full`
  with usage plus a one-line pointer to `/rea-init --full` inside the AI tool.

### Security

- The `claude-review` GitHub Actions workflow now runs only when the comment author is trusted
  (`OWNER`/`MEMBER`/`COLLABORATOR`), so an arbitrary public commenter can no longer trigger the paid,
  write-scoped action.

### Changed

- README front door: the command and agent tables now match the shipped set (nine commands, eleven
  agents), badges are dynamic and clickable, and a name-map plus learn-more links were added.
  `package.json` and `pyproject.toml` `keywords` were aligned to one discovery vocabulary.

## [0.1.2] - 2026-07-25

### Fixed

- `/rea-write-skill` was installed into host projects but its `skill-writer` agent was never
  shipped with it, leaving the command dead for every user of the published package. `src/place.js`
  no longer excludes `skill-writer.md`, so it ships and becomes manifest-owned like every other
  agent.

### Added

- `skill-writer` now detects source vs. host mode. In host mode it derives the agent/command
  directories from `.rea/.rea-manifest.json`'s `ownedFiles` instead of a hardcoded tool folder, so
  it works for any installed tool, not just `.claude/`.
- Three refusal gates on `skill-writer`: a missing or unreadable manifest, a name a later `setup`
  would overwrite (manifest-owned), and a name the one-time legacy bridge would delete (retired
  stem+type collision). Each refusal names `npx readev-tools setup` as the fix.

### Changed

- `rea-write-skill` orchestration aligned to the two-mode (source/host) agent.

## [0.1.1] - 2026-07-24

### Fixed

- `setup <target> --dry-run` performed a full, silent install instead of a preview — `--dry-run` is
  `migrate`'s flag, but the CLI's flag table was global and the `setup` handler ignored it. The CLI
  now refuses `--dry-run` for every verb except `migrate`, before any handler runs.
- `setup` printed nothing on success or failure. It now reports placed/pruned/failed counts and
  names every pruned path, so a run's outcome is visible without re-running `verify`.
- `verify` reported a shim as intact even when it had two marker pairs — a state the installer
  itself treats as ambiguous and refuses to write to. `verify` now counts markers the same way
  `shims.js` does and fails, reporting both counts, when a shim is ambiguous.

### Changed

- CLI usage text is now per-verb, so a flag's scope (e.g. `--dry-run` belonging only to `migrate`)
  is visible without reading the source.

## [0.1.0] - 2026-07-24

### Added

- `npx readev-tools setup <project>` — installs the nine slash commands, review agents, the
  `core/` trio (`principles.md`, `craft-checklist.md`, `rea-schema.md`), the `.rea/` memory scaffold,
  and per-tool shims (`AGENTS.md`, `CLAUDE.md`, `.gemini/settings.json`) into a host project.
- `verify` and `migrate` verbs alongside `setup`, plus an ownership manifest
  (`.rea/.rea-manifest.json`) that tracks installer-owned files for safe re-run and pruning.

### Changed

- Supersedes the `rea-dev` PyPI Python CLI as the project's distribution channel; `rea-dev` is now
  frozen at 0.7.2 as a deprecation notice.

[Unreleased]: https://github.com/aliyenidede/rea/compare/readev-tools-v0.1.3...HEAD
[0.1.3]: https://github.com/aliyenidede/rea/compare/readev-tools-v0.1.2...readev-tools-v0.1.3
[0.1.2]: https://github.com/aliyenidede/rea/compare/readev-tools-v0.1.1...readev-tools-v0.1.2
[0.1.1]: https://github.com/aliyenidede/rea/compare/readev-tools-v0.1.0...readev-tools-v0.1.1
[0.1.0]: https://github.com/aliyenidede/rea/releases/tag/readev-tools-v0.1.0
