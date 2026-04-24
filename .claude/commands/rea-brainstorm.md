---
name: rea-brainstorm
description: "Structured feature design — explore codebase, ask clarifying questions one at a time, present 2-3 alternatives with pros/cons, write spec, hand off to /rea-plan. Use when starting a new feature and the scope/approach is not yet clear."
---

The user wants to brainstorm and design a feature before planning. Run the full brainstorming pipeline.

## Step 0 — Explore the codebase

Use the `explorer` agent to understand the current project structure, existing patterns, and relevant code. This context is essential for making informed design decisions.

## Step 1 — Clarifying questions

Ask the user ONE question at a time. Wait for their answer before asking the next.

Repeat for 3-5 rounds until you have a clear picture of:
- What problem they are solving
- Who the users/consumers are
- What constraints exist (performance, compatibility, deadlines)
- What they have already tried or considered

Do NOT ask all questions at once. One question, one answer, next question.

## Step 2 — Present alternatives

Based on the exploration and answers, present 2-3 architectural alternatives.

For each alternative:
- **Approach**: one-sentence summary
- **How it works**: brief technical description
- **Pros**: concrete advantages
- **Cons**: concrete disadvantages
- **Best when**: scenarios where this approach wins

## Step 3 — Write spec

After the user picks an approach (or asks you to recommend one), write a spec:

```markdown
# Spec: <feature-name>

## Task
<what we're building and why>

## Scope

### In
- <what's included>

### Out
- <what's explicitly excluded>

## Key Constraints
- <technical, business, or timeline constraints>
```

## Step 4 — Show spec and wait for approval

Show the complete spec to the user. Ask: "Does this capture what you want? Any changes?"

If the user wants changes, update the spec and show it again.

## Step 5 — Hand off

Once the user explicitly approves:

```
Spec approved. Run /rea-plan to create the implementation plan.
```

## Rules

- **NEVER proceed to planning or coding without explicit user approval of the spec.**
- Do not write code, create files, or run /rea-plan automatically.
- Do not skip the clarifying questions — even if the request seems clear.
- Keep alternatives practical, not theoretical. Each must be implementable with the current stack.
- If the user says "just do it" or "skip the questions", explain that brainstorming ensures we build the right thing and ask at least 2 questions.
