# Security Policy

## Supported versions

`readev-tools` is distributed on npm and installs itself into a host project on demand — there is
no persistent server or long-running process to patch. The **latest published version on npm**
(`npx readev-tools@latest`) is the only version that receives security fixes. If you've pinned an
older version, upgrade before reporting — the fix may already be out.

The frozen `rea-dev` package on PyPI (0.7.3) installs nothing; it is a deprecation signpost only
and is not in scope for security reports.

## Reporting a vulnerability

**Do not open a public GitHub issue for a security vulnerability.**

Use GitHub's private vulnerability reporting instead:

1. Go to the [Security tab](https://github.com/aliyenidede/rea/security) of this repository.
2. Click "Report a vulnerability" to open a private advisory.

If you cannot use GitHub's private reporting for any reason, email **aliyenidede@gmail.com**
directly with details.

Please include:

- What the vulnerability is and its impact (e.g. arbitrary file write outside the target project,
  a symlink/junction escape, credential exposure).
- Steps to reproduce, ideally a minimal repro project or command sequence.
- The `readev-tools` version and OS you tested against.

## What's in scope

The installer performs real filesystem mutations (`npx readev-tools setup|migrate`) against
whatever directory you point it at. Anything that lets it read, write, move, or delete outside the
intended target root — such as a symlink/junction-escape class bug like the one fixed in
[docs/decisions/0002-safe-path-hardening.md](docs/decisions/0002-safe-path-hardening.md) — is a
security issue, not a regular bug. Report it privately.

## Response

This is a solo-maintained project. There is no formal SLA, but security reports are prioritized
over regular issues and PRs.
