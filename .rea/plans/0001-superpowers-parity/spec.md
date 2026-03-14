# spec: superpowers-parity

## Task
REA'yı Superpowers ile rekabet edecek seviyeye getir. Eksik olan sistemler: subagent-driven execution (implementer + spec-reviewer + code-quality-reviewer), TDD enforcement, verification before completion iron rule, git worktrees, systematic debugging, brainstorming, parallel agents.

## Scope

### In
- `rea-brainstorm` command — tasarım doğrulama, onay olmadan kod yok
- `rea-execute` command — subagent-driven execution: implementer → spec-reviewer → code-reviewer döngüsü
- `rea-worktree` command — git worktree oluşturma ve izole çalışma
- `implementer` agent — todo item'ı uygular, test yazar, commit atar
- `spec-reviewer` agent — implementation vs. plan gereksinim karşılaştırması
- `code-reviewer` agent — kod kalitesi değerlendirmesi
- `debugger` agent — root cause analizi, 4 aşamalı debugging
- TDD enforcement — opsiyonel (high-risk item'larda zorunlu, low-risk'te opsiyonel)
- Verification iron rule — CLAUDE.md Workflow Behavior'a eklenir
- rea-plan todo format güncellemesi — TDD adımları için high-risk item formatı

### Out
- Parallel agents dispatching (sonraki iterasyon)
- Skill discovery / self-improvement (sonraki iterasyon)
- CLI değişikliği — tüm değişiklikler template dosyaları

## Key constraints
- CLI is dumb, Claude is smart — hiçbir logic CLI'ya girmez
- Geriye dönük uyumluluk — eski todo formatı bozulmamalı
- pyproject.toml package-data glob'ları her yeni template klasöründe güncellenmeli
- TDD opsiyonel: high-risk → zorunlu, low-risk → opsiyonel
