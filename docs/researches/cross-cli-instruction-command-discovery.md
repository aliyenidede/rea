# Cross-CLI Instruction & Command Discovery

_Research accessed 2026-07-16. All claims sourced from official docs/repos; fast-moving area — re-verify before relying. Feeds REA's cross-tool (multi-CLI) design._

Question: how do the major AI coding CLIs discover **project instructions** and **custom
commands**, so REA can carry its methodology across all of them?

## Comparison table

| Tool | Instruction file(s) | Reads AGENTS.md? | Custom-command mechanism | Command scope | Subagents? | Hooks? |
|---|---|---|---|---|---|---|
| **Claude Code** | `CLAUDE.md` (root→cwd walk, `@import`) | No — needs `@AGENTS.md` import or symlink | `.claude/skills/*/SKILL.md` (legacy `.claude/commands/*.md`), MD+YAML | Project + personal | Yes — `.claude/agents/*.md` | Yes — `settings.json` |
| **Codex CLI** | `AGENTS.md`/`AGENTS.override.md` (global + root→cwd) | **Yes, native** (co-author of the format) | `.agents/skills/*/SKILL.md` (legacy `~/.codex/prompts/*.md`, deprecated) | Project (skills) / personal (legacy) | Yes — TOML `.codex/agents/` | Yes — `hooks.json`/`config.toml` |
| **OpenCode** | `AGENTS.md` native, `CLAUDE.md` fallback | **Yes, native** (pre-dates the standard) | `.opencode/commands/*.md`, MD+YAML | Project + global | Yes — `.opencode/agents/*.md` | Yes — JS/TS plugins |
| **Gemini CLI** | `GEMINI.md` (default), `@import` | No by default — needs `context.fileName` config | `.gemini/commands/*.toml`, **TOML only** | Project + global | Yes (since Apr 2026) — `.gemini/agents/*.md` | Yes — `settings.json` |
| **Cursor CLI** | `.cursor/rules/*.mdc` + native `AGENTS.md` + native `CLAUDE.md` | **Yes, native** | Skills (`SKILL.md`) | Project + global | Yes — `.cursor/agents/` (+ reads `.claude/agents/`, `.codex/agents/`) | Partial (mostly IDE-only) |

## Key sources
- Claude Code: code.claude.com/docs/en/{memory, skills, sub-agents, hooks}
- Codex CLI: learn.chatgpt.com/docs/agent-configuration/agents-md, /docs/build-skills, /docs/agent-configuration/subagents
- OpenCode (repo moved `sst/opencode` → `anomalyco/opencode`): opencode.ai/docs/{rules, config, commands, agents, plugins}
- Gemini CLI: github.com/google-gemini/gemini-cli/blob/main/docs/{cli/gemini-md.md, cli/custom-commands.md, core/subagents.md, hooks/index.md}
- Cursor CLI: cursor.com/docs/{cli/using, rules, skills, subagents, hooks}

## Portability verdict

1. **AGENTS.md is the closest thing to a universal instruction carrier — but not zero-config
   everywhere.** Codex, OpenCode, Cursor read it natively. Claude Code needs a one-line
   `@AGENTS.md` import inside a `CLAUDE.md` stub (or a symlink; Windows → use the import). Gemini
   CLI needs `{"context": {"fileName": ["AGENTS.md", "GEMINI.md"]}}` in `settings.json`.
   → **Practical path: one `AGENTS.md` + two tiny per-tool shims** = single-source instructions
   across all five with minimal glue.

2. **Commands do not port.** Different formats (MD+YAML for Claude Code/OpenCode; TOML-only for
   Gemini) and different micro-syntax for args (`$ARGUMENTS`/`$1` vs `{{args}}`), shell
   (`` !`cmd` `` vs `!{cmd}`), file injection (`@file` vs `@{file}`). No single literal file
   satisfies all parsers.

3. **Subagents don't port either** — MD+YAML (Claude Code, OpenCode, Gemini, Cursor) vs TOML
   (Codex). Exception: Cursor CLI also reads `.claude/agents/` and `.codex/agents/` for
   compatibility — the one documented cross-tool bridge.

4. **Convergence toward folder-based `SKILL.md`** — Claude Code, Codex, and Cursor have all
   folded "custom commands" into a `SKILL.md` system in the last ~6 months; OpenCode and Gemini
   haven't yet. Worth re-checking before committing to a command-layer design.

5. **Realistic path for one shared command library:** not one file, not full per-tool rewrite.
   Either **(a) codegen** native files per tool at `rea setup` time (tool-native arg/shell
   semantics), or **(b) thin per-tool shim** files whose only job is to point at a shared
   plain-markdown prompt library. (b) fits REA's "CLI copies files, templates are source of
   truth" philosophy better and degrades gracefully as each tool's syntax evolves.

**Not portable yet:** hooks — every tool's event taxonomy/config/trust model is tool-specific;
no shared abstraction to design toward.

**Unverified (do not treat as confirmed):** exact Codex version that first parsed AGENTS.md;
whether Codex's trust gate blocks AGENTS.md reading; Cursor's AGENTS.md rollout date; whether
Gemini's old flat `contextFileName` key still works alongside `context.fileName`; the full
Claude Code hook event list beyond the ~9 core events.
