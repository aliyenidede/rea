# Feature: superpowers-parity

## Scope
REA'ya Superpowers'ın execution methodology'sini eklemek. CLI değişmiyor, tüm değişiklikler `rea/templates/` altında.

## What's in
- 4 yeni agent: implementer, spec-reviewer, code-reviewer, debugger
- 3 yeni command: rea-brainstorm, rea-execute, rea-worktree
- rea-plan TDD format güncellemesi (high-risk için zorunlu)
- Verification iron rule (CLAUDE.md Workflow Behavior'a eklenir)

## What's out
- Parallel agents dispatching
- Skill discovery / self-improvement
- CLI değişikliği

## Key rules
- TDD opsiyonel: high-risk item → RED-GREEN-REFACTOR zorunlu, low-risk → opsiyonel
- rea-execute todo'yu parse etmez — item'ı olduğu gibi implementer'a verir
- Agents: Sonnet model (Haiku sadece explorer için)
- Geriye dönük uyumluluk: eski todo formatı bozulmamalı

## Key decisions
- Option B seçildi: TDD zorunlu değil, risk-based — eski planlar bozulmaz
