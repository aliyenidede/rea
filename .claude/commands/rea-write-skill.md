---
name: rea-write-skill
description: "Create a new agent or command file matching REA's conventions, authored via the skill-writer agent."
---

Principles: C, K, L (`core/principles.md`)

A user wants to add a new skill — an agent or a command — to the project. This command gathers
the required inputs, then hands them to the `skill-writer` agent, which is the one that actually
derives conventions and writes the file: this command's job is orchestration and human review, not
authoring.

## Step 1 — Agent or command?

Ask the user: "Should this be an **agent** or a **command**?"

- **Agent** — a reusable building block invoked by a command (has frontmatter with `tools:` and
  `model:`, returns a status, is callable standalone)
- **Command** — a skill the user invokes directly (minimal `name`/`description` frontmatter,
  step-by-step instructions, ends with a Rules section)

Wait for the answer before proceeding.

## Step 1.5 — Agent complexity type (agents only)

If the user chose "agent" in Step 1, ask:

"What type of agent is this?"
- **Strict** — must follow an exact methodology, a phased process (like `implementer`, `debugger`)
- **Review** — evaluates quality with confidence scoring (like `code-reviewer`, `spec-reviewer`)
- **Exploratory** — open-ended research with structured output (like `explorer`)
- **Mechanical** — simple algorithm, fast, minimal overhead (like `dispatcher`, `plan-validator`)

Wait for the answer before proceeding.

If the user chose "command" in Step 1, skip this step entirely.

## Step 2 — What should it do?

Ask the user: "Briefly describe what this skill should do — its purpose, inputs, and expected
outputs."

Encourage a 2-4 sentence description. If the user gives a single vague word, ask one follow-up to
clarify behavior or outputs before proceeding.

Wait for a clear description before proceeding.

## Step 3 — Call skill-writer

Invoke `skill-writer` with:
- **Skill type**: the answer from Step 1
- **Complexity type**: the answer from Step 1.5 (omit for commands)
- **Description**: the answer from Step 2

Pass all inputs. Do not proceed until it returns.

- **DONE** → continue to Step 4.
- **BLOCKED** → show the reason to the user (a file already exists at that path, a missing input, a
  conflicting requirement). Resolve it with the user (a new name, a fuller description) and retry,
  or stop here if the user prefers to abandon.

## Step 4 — Show generated file for review

Display the target file path and the full content of the generated file to the user.

Ask: "Does this look right? Any changes needed?"

If the user requests changes, delete the previously generated file, then call `skill-writer` again
with the updated description. Repeat until the user approves.

## Step 5 — Confirm write

Once the user approves the file:

Confirm the file has been written (show the exact path).

## Step 6 — Note the placement boundary

The new file now lives at its neutral `templates/` path — that is the source of truth. Placing it
into a specific host tool's own command/agent folder so it becomes live in a session is a separate,
later concern this command does not handle; mention that boundary to the user rather than
performing or promising that placement here.

## Rules

- **Never write the file without user approval** (principle K — the human QA gate). Always show the
  generated content first.
- Do not skip Step 1 or Step 2 — both the type and the description are required inputs for
  `skill-writer`.
- If the user provides both type and description upfront (e.g. in the initial request), you may
  skip the corresponding question — but confirm what was understood before calling `skill-writer`.
- Do not invent content yourself. `skill-writer` derives conventions and generates the file; this
  command only gathers inputs and presents the result.
- Keep each step focused — ask one thing at a time.
- `skill-writer` stays a standalone agent, callable on its own — this command orchestrates it, it
  does not absorb or duplicate its logic.
