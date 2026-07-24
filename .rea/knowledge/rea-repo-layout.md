---
name: rea-repo-layout
description: What in .rea/ is git-tracked (shareable) vs local-only (gitignored) in the REA repo.
type: reference
links: []
---

# .rea/ — tracked vs local

`.gitignore` ignores `.rea/sessions/` — session recaps are **local-only** (episodic working
notes, may contain infra specifics), never committed.

Everything else in `.rea/` is **git-tracked and shareable** durable memory: `.rea/lessons.md`,
`.rea/knowledge/` (this note), `.rea/decisions/` (ADRs), `.rea/plans/`.

Layout + per-note-type semantics live in `core/rea-schema.md` — don't restate them here. Rule
origin: `.rea/lessons.md` (2026-07-22 04:48). Phase-5 Session A renamed the old gitignored
`.rea/log/` to `.rea/sessions/`.
</content>
</invoke>
