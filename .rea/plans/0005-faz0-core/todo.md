# Todo — Faz 0: rea-tools shared foundation (`core/`)

## Todo

- [ ] NEXT: Create `core/README.md`
      1. State: `core/` is the shared, tool-agnostic foundation used by BOTH rea-tools and rea-cli.
      2. List the three files and what each is (principles, craft-checklist, rea-schema).
      3. Note: npm/publishing wrapper + version pinning come in a later phase.
      Test: README names all three files and states the "shared by both, one source of truth" purpose.

- [ ] Create `core/principles.md` + truncate `docs/principles.md` to a pointer
      1. Copy the 12 principles (A–L) as **pure principle statements** — strip the stale `→ REA:`
         skill-mapping lines and the now-false "Gap" note (tool-agnostic, no dropped-command refs).
      2. Truncate `docs/principles.md` to a short pointer note ("Canonical: core/principles.md;
         full history in git") — do not keep the full text duplicated on disk.
      Test: A–L all present in `core/principles.md`, no `→ REA:`/Gap lines; `docs/principles.md` is
      just the pointer.

- [ ] Create `core/craft-checklist.md`
      1. Short curated checklist: deep-vs-shallow module, code smells, naming, real error handling,
         right abstraction.
      2. Each item gets a stable tag id `CC-01`, `CC-02`, … so review agents cite it.
      3. Keep it short (grow later if too thin).
      Test: every item has a unique `CC-NN` tag; ≤ ~12 items.

- [ ] Create `core/rea-schema.md` part 1 — layout, notes, plan/todo, status
      1. Directory layout (knowledge / decisions / sessions / plans).
      2. Per-note-type naming/collision (§4): knowledge update-in-place + collision-guard; decisions
         numbered append-only; sessions timestamped.
      3. plan.md dependency-graph table (Depends-on only here).
      4. todo.md unit format: `### U<n> — <title>` heading + fields Files/Done-when/Size/Status (only
         here); unit-id = join key.
      5. Status lifecycle todo→in-progress→done|blocked; frontier = todo ∧ deps done; no scalar NEXT;
         resume re-verifies in-progress.
      6. Stamp `schema-version: 0.1` at the top.
      Test: contains layout + plan.md template + todo.md unit template + status list + frontier rule +
      schema-version.

- [ ] Create `core/rea-schema.md` part 2 — numbering, shims, capture, wikilinks, versioning
      1. Numbering (G6a): NNNN-slug, slug-unique, no central index, duplicates cosmetic.
      2. Shim write semantics (G6b): markdown managed-markers; JSON structured merge; never blind-overwrite.
         (Note in the doc's intro that it also covers this root-file shim contract, not just `.rea/`.)
      3. Capture note FORMAT only (§4): minimal *provisional* fields per type (knowledge:
         name/description/type/links · decisions: number/date/status/superseded-by · sessions:
         date/summary/links). The write-FILTER behavior is deferred to `AGENTS.md` — one-line
         forward-pointer only, not the full rule.
      4. Wikilinks: bare names; path-qualified in `plans/*/`.
      5. Version bump policy: minor on field/rule additions, major on breaking rename/removal.
      Test: all sections present; capture shows fields but forward-points the filter; bump policy stated.

- [ ] Doc-sync: repo `README.md` + `CLAUDE.md`
      1. `README.md`: short note that `core/` is the shared foundation; pointer to `rea-target-state.md` §9.
      2. `CLAUDE.md`: one line under File Structure noting `core/` holds the tool-agnostic foundation
         (full rewrite later).
      Test: both files reference `core/`.
