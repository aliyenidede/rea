# Spec: REA v0.5.0 — Composable Agent Architecture

## Task

REA'ya 4 yeni capability eklemek: parallel dispatch, adversarial plan review, self-evolving skills, automatic activation. Her capability bağımsız bir agent olarak tasarlanır. Mevcut komutlar (rea-plan, rea-execute) bu agent'ları orkestrasyon sırasında çağırır — logic komutlara gömülmez.

Mimari prensip: agent'lar building block, komutlar orkestratör. Her agent hem komutlar tarafından otomatik çağrılabilir, hem kullanıcı tarafından doğrudan (standalone) kullanılabilir.

## Scope

### In

- `plan-reviewer` agent — planı challenge eder, gap'leri ve karar eksiklerini bulur, seçenek sunar
- `dispatcher` agent — todo item'ları analiz eder, dosya bağımlılıklarından dependency graph çıkarır, paralel gruplar oluşturur
- `skill-writer` agent — mevcut pattern'lere uygun yeni agent veya komut dosyası yazar
- `rea-router` meta-prompt — SessionStart hook ile kullanıcı intent'ini doğru komut/agenta yönlendirir
- `/rea-write-skill` komutu — kullanıcının explicit olarak yeni skill yaratmasını sağlar (skill-writer agent'ı çağırır)
- `rea-plan.md` güncellemesi — plan-reviewer agent çağrısı (Step 7.5)
- `rea-execute.md` güncellemesi — dispatcher ile paralel gruplar + cycle sonu skill-writer pattern önerisi
- `rea-init.md` güncellemesi — SessionStart hook kurulumu
- `rea-verify.md` güncellemesi — yeni dosyaların varlık kontrolü
- Version bump: 0.4.0 → 0.5.0

### Out

- CLI'a yeni Python komutu eklenmez (CLI hala sadece `init` ve `version`)
- Mevcut agent'lar (implementer, spec-reviewer, code-reviewer, debugger, explorer) değişmez
- CI/CD pipeline değişikliği yok
- Yeni Python dependency yok

## Key Constraints

- Her agent tek sorumluluk — birden fazla iş yapmamalı
- Komutlar orkestratör — logic agent'larda yaşar
- Agent'lar birbirini doğrudan çağırmaz, sadece komutlar agent çağırır
- `dispatcher` conflict-aware olmalı — aynı dosyaya dokunan item'ları aynı gruba koymalı (sıralı), farklı dosyalar paralel
- `plan-reviewer` karar eksiklerini bulduğunda seçenek sunmalı, sadece "eksik var" demek yetmez
- `skill-writer` mevcut agent/komut format ve convention'larına uygun dosya üretmeli
- `rea-router` sadece `rea init` yapılmış projelerde aktif olmalı (settings.json SessionStart hook)
- `rea-router` tüm REA ekosistemini bilir — komut ve agent listesini dinamik tarar
- Tüm template'ler `rea/templates/` altında yaşar
- Tüm agent'lar standalone kullanılabilir olmalı — komut context'ine bağımlı olmamalı
