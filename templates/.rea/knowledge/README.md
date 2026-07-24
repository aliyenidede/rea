# knowledge/

Semantic notes — what we know. One note per entity (a module, a gotcha, a concept); filename is
the entity's stable name.

Naming rule: entity-name, **update-in-place** — writing to an existing entity overwrites/extends
that same file (no versioning or append), guarded by a collision check if a different concept
would collide on the same name.

See [`core/rea-schema.md`](../../core/rea-schema.md) for the full naming and collision rules.
