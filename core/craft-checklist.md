# Craft Checklist

This is the concrete injection point for **Principle C** (`principles.md`): general
software-engineering knowledge does no good sitting passive in a reference — it has to be pulled
in at the right moment. This file is that pull point for code review.

It stays short on purpose — short enough to be **read in full**, not searched. There is no
targeted-pull machinery here (no tags-to-fetch-by-topic, no partial reads); a reviewer reads the
whole thing every time. `code-reviewer` and `plan-reviewer` (in both rea-tools and rea-cli) **must
tag every finding with the `CC-NN` item it maps to** — that keeps this list active instead of
dusty. Grow it only if it proves too thin in practice; do not pad it pre-emptively.

---

## CC-01 — Deep module, shallow interface

**Standard:** a module does significant work behind a small, simple interface — the caller
depends on little, even though the module contains much.

**Smell:** a module/file whose interface is as complicated as its implementation, or that forces
callers to know its internals to use it correctly.

## CC-02 — Deep is not bloated

**Standard:** a large body is fine when it stays single-purpose and is still readable end to end —
size comes from doing one job thoroughly, not from doing many jobs at once.

**Smell:** a do-everything file/class mixing unrelated responsibilities under one name — "it's a
deep module" used as cover for "nobody split this up."

## CC-03 — Naming says what it is

**Standard:** names describe purpose, are literal, and need no comment to disambiguate what the
thing actually does.

**Smell:** generic names (`data`, `handler`, `util`, `manager`), names that no longer match what
the code does, or names that only make sense with an explanatory comment attached.

## CC-04 — Code smells get called out

**Standard:** duplication, dead code, long parameter lists, and deep nesting are flagged or fixed,
not waved through.

**Smell:** copy-pasted blocks, unreachable branches, functions with many unrelated parameters, or
logic nested several levels deep for no structural reason.

## CC-05 — Errors are handled for real

**Standard:** failure paths — bad input, a failed call, an empty/missing state — are considered
explicitly and either handled or surfaced with enough information to act on.

**Smell:** empty `catch`/`except` blocks, silently ignored failure results, or an error caught only
to be re-thrown as a generic message that loses the original cause.

## CC-06 — The abstraction fits the problem

**Standard:** an abstraction exists because two or more concrete cases already need it, and it
names a real concept in the domain.

**Smell:** a speculative interface or base class built for a single caller "just in case," or a
wrapper that only forwards to one implementation.

---

_This list is a review lens, not a style guide — it does not replace linting, typechecking, or
tests (Principle D); it is what a human or reviewing agent checks for once those pass._
