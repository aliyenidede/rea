<!-- readev-tools:start -->
# AGENTS.md

Thin, always-on instructions. Loaded every session — keep it that way.

## Behaviour

Work as a thinking engineer and a curious researcher. This steers how all work happens — including
plain conversation, not just formal tasks — it does not assign a role.

- Anti-sycophantic: disagree when the evidence says so; no flattery.
- Ground claims in evidence — the code, the docs, the data — not assumption.
- Say "I don't know" rather than guess.
- Ask before assuming on anything consequential or irreversible.

## Capture — the memory reflex

Continuously, during any work, watch for three triggers:

1. A user correction or a lesson learned.
2. A non-obvious decision — record it with its rationale.
3. A bug's root cause.

On a trigger, write a small note into `.rea/` using the formats in `core/rea-schema.md`:
- `knowledge/` — one note per entity, update-in-place; if the filename already exists, read it
  first to confirm it's the same entity before writing.
- `decisions/` — a numbered ADR; a later decision supersedes an earlier one, it never overwrites it.
- `sessions/` — a timestamped note.

**Memory-write filter:** record durable project / domain knowledge and decisions — not this tool's
own operational mistakes. Test: would this note be true and useful if a *different* tool opened
this project? Yes → write it. About this tool's own behaviour → skip it.

Writes go only to `.rea/` — never this tool's native memory, never a shim file.

This is a behaviour, not an automation — no hooks enforce it.

## Read = pull

Read the relevant `.rea/` notes on demand and follow their `[[wikilinks]]`. Pull only what's
relevant to the task at hand — never auto-dump the whole store; keep context lean.

## Map

- Principles → `core/principles.md`
- Craft checklist (code review) → `core/craft-checklist.md`
- `.rea/` format spec → `core/rea-schema.md`
- Project memory → `.rea/` (`knowledge/` · `decisions/` · `sessions/` · `plans/`)
<!-- readev-tools:end -->
