# Spec: wrap-semantic-lessons

## Task

`/rea-wrap` Step 3 captures lessons at session end. Today it detects user corrections via a fixed keyword list ("no", "don't", "that's wrong", "not like that", "rejected a tool call", redirect, frustration). Keyword matching misses:

- Short and ironic pushbacks ("emin misin?", "hmm", "gerçekten mi")
- Harsh/profane corrections ("siktirgit", "saçmalama")
- Non-English corrections in any language
- Implicit redirections phrased as questions ("başka bir yolu var mı?")

User explicitly flagged this as the top bug in REA usage (rea session `38394174`, 2026-03-24): *"benim düzeltmelerim falan dikkat edilmiyor yani sadece kendi iç sesindeki bulduğu hataları yazıyor"*.

Replace keyword-based detection with per-message semantic judgment, gated on behavior-change evidence to prevent false positives (a user expressing skepticism when the assistant was correct is not a lesson).

Also align `/rea-init`'s Self-Improvement Loop template lesson schema with `/rea-wrap`'s schema — both commands now write `.rea/lessons.md` entries in the same format.

## Scope

### In
- Rewrite `rea/templates/.claude/commands/rea-wrap.md` Step 3 user-correction block only
- Keep dual-category structure (user-correction + internal-mistake)
- Keep Source taxonomy: `user-correction | internal-mistake | discovery`
- Keep output format (timestamp / Source / Lesson / Rule)
- Keep architectural-escalation rule (add to CLAUDE.md instead of lessons.md)
- Add explicit non-English verbatim instruction
- Add behavior-change gate to suppress false-positive corrections
- Add long-session coverage disclosure (Step 7 reports scanned range when early turns are unreachable)
- Align `rea/templates/.claude/commands/rea-init.md` Self-Improvement Loop template (lines 125–130) to the rea-wrap schema — no other rea-init changes
- Bump `pyproject.toml` version `0.7.0` → `0.7.1` (patch)

### Out
- Internal-mistakes block in rea-wrap (self-identified, not keyword-based)
- Other Steps of `rea-wrap.md` (1 commit, 2 session log, 4 CLAUDE.md update, 5 memory, 6 remaining work, 7 report)
- Lessons deduplication or ranking (future concern)
- Automatic lesson pruning (future concern)
- Migrating pre-existing `.rea/lessons.md` entries in old init-schema format (kept as-written)
- Changes to consumers of `.rea/lessons.md` (rea-plan, rea-execute, rea-verify — they only read the file; schema unification benefits them but requires no code change)

## Key Constraints

- Backward compatibility: new entries follow the unified schema; old init-format entries remain valid as-is (readable)
- After this patch, both `/rea-init` and `/rea-wrap` write the same lesson schema — eliminating the pre-existing format divergence
- Three-file template change (plus version bump) — no CLI code, no agent, no new files
- Semver: patch bump per CLAUDE.md rule 5 (template fix)
- `rea setup <path>` must still copy all updated commands correctly (idempotent, overwrite)

## Rollback

If the new detection proves worse in practice: `pip install rea-dev==0.7.0` then `rea setup .` in each affected project. Templates are overwritten from the installed package; no lessons.md migration needed.
