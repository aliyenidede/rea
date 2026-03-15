The user wants to create a new skill (agent or command) for this project.

## Step 1 — Agent or command?

Ask the user: "Should this be an **agent** or a **command**?"

- **Agent** — a reusable sub-agent invoked by other commands or agents (has frontmatter, model, tools, returns a status)
- **Command** — a slash command the user invokes directly (no frontmatter, step-by-step instructions, ends with Rules)

Wait for the answer before proceeding.

## Step 2 — What should it do?

Ask the user: "Briefly describe what this skill should do — its purpose, inputs, and expected outputs."

Encourage a 2-4 sentence description. If the user gives a single vague word, ask one follow-up to clarify behavior or outputs before proceeding.

Wait for a clear description before proceeding.

## Step 3 — Call skill-writer agent

Invoke the `skill-writer` agent with:
- **Skill type**: the answer from Step 1
- **Description**: the answer from Step 2

Pass both as the full input to the agent. Do not proceed until the agent returns.

## Step 4 — Show generated file for review

Display the target file path and the full content of the generated file to the user.

Ask: "Does this look right? Any changes needed?"

If the user requests changes, delete the previously generated file, then call `skill-writer` agent again with updated description. Repeat until the user approves.

## Step 5 — Confirm write

Once the user approves the file:

Confirm the file has been written (show the exact path).

## Step 6 — REA sync reminder

Check if the current project is the REA project itself (i.e., `pyproject.toml` exists and contains `name = "rea"`).

If yes, remind the user: "Since this is the REA project, run `rea init .` to sync the new skill into your local `.claude/` directory."

## Rules

- **Never write the file without user approval.** Always show the generated content first.
- Do not skip Step 1 or Step 2. Both type and description are required inputs for the skill-writer agent.
- If the user provides both type and description upfront (e.g., in the command invocation), you may skip the corresponding question — but confirm what you understood before calling the agent.
- Do not invent content. The skill-writer agent generates the file — your job is to gather inputs and present the result.
- Keep each step focused. Ask one thing at a time.
