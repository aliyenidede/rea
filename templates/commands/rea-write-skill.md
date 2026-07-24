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
- **BLOCKED** → show the reason to the user, with the concrete next step for that reason:
  - No or unreadable manifest (host mode) — the mechanical layer is missing or damaged; run
    `npx readev-tools setup`, then retry.
  - The resolved destination is already an installer-owned file — the next `setup` would overwrite
    it; choose a different name.
  - The requested name collides with a retired legacy skill name — a manifest-less checkout of the
    project could delete it as a legacy leftover; choose a different name.
  - A file already exists at that path, or an input was missing or conflicting — resolve it with the
    user (a new name, a fuller description) and retry.
  Stop here instead if the user prefers to abandon.

## Step 4 — Show generated file for review

Display the target file path and the full content of the generated file to the user.

Ask: "Does this look right? Any changes needed?"

If the user requests changes, delete the previously generated file, then call `skill-writer` again
with the updated description. Repeat until the user approves.

## Step 5 — Confirm write

Once the user approves the file:

Confirm the file has been written — show the exact path `skill-writer` resolved (the project's own
tool folder in host mode, this repository's template source in source mode).

## Step 6 — Report where the file lives

Tell the user what actually happened, mode-dependent:

- **Host mode** — the skill is already live in this project's own tool folder; `skill-writer` wrote
  it directly into the manifest-derived agents or commands directory. It is usable in this project
  immediately — no separate placement step is needed.
- **Source mode** — the file is repository source under this repository's template tree. It ships to
  host projects on the next readev-tools release; it does not become live in any host project until
  that release is installed.

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
