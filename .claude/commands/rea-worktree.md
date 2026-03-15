Create a git worktree for isolated parallel work.

## Step 1 — Determine branch name

Ask the user for a branch name. Suggest a default: `feature/<task-name>`

If working from an active plan (`.rea/plans/*/todo.md` has NEXT: marker), suggest the plan name:
- Example: plan folder `0003-stripe-billing` → suggest `feature/stripe-billing`

## Step 2 — Verify .gitignore

Check if `.gitignore` contains a line for worktrees. Look for:
- `worktrees/`
- `../worktrees/`

If not found, add `worktrees/` to `.gitignore` and commit the change:
```
git add .gitignore
git commit -m "chore: add worktrees to gitignore"
```

## Step 3 — Create worktree

Run:
```bash
git worktree add ../worktrees/<branch-name> -b <branch-name>
```

If the branch already exists:
```bash
git worktree add ../worktrees/<branch-name> <branch-name>
```

If `../worktrees/` directory doesn't exist, it will be created automatically by git.

## Step 4 — Set up the worktree

Change to the worktree directory and run stack-appropriate setup:

**Node/pnpm:**
```bash
cd ../worktrees/<branch-name> && pnpm install
```

**Node/npm:**
```bash
cd ../worktrees/<branch-name> && npm install
```

**Python:**
```bash
cd ../worktrees/<branch-name> && pip install -e ".[dev]"
```

If no recognized stack, skip setup and note it.

## Step 5 — Run baseline tests

Run the test suite in the worktree:

**Python:** `cd ../worktrees/<branch-name> && pytest`
**Node:** `cd ../worktrees/<branch-name> && pnpm test` (or npm test)

Record the result as baseline.

## Step 6 — Report

```
Worktree created:
  Path: ../worktrees/<branch-name>
  Branch: <branch-name>
  Base: <current-branch>
  Tests: X passed, Y failed (baseline)

To work in this worktree, open a new terminal and:
  cd ../worktrees/<branch-name>

When done, clean up with:
  git worktree remove ../worktrees/<branch-name>
```

## Rules

- **Never create a worktree inside the current repo.** Always use `../worktrees/` (sibling directory).
- **Always run tests** to establish a baseline. If tests fail, report it but still create the worktree.
- **Do not start working in the worktree.** This command only sets it up. The user decides when to switch.
