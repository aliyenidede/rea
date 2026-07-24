# plan: superpowers-parity

REA'ya Superpowers'ın temel execution methodology'sini ekle. Tüm değişiklikler `rea/templates/` altında — CLI'ya dokunulmaz.

---

## Files to create

### `rea/templates/.claude/commands/rea-brainstorm.md`
Tasarım doğrulama command'ı. Adımlar:
1. Mevcut codebase'i tara (explorer agent kullan)
2. Kullanıcıya bir soru sor, cevabını bekle — bunu 3-5 kez tekrarla
3. 2-3 mimari alternatif sun, her birinin trade-off'larını açıkla
4. Tercih edilen yaklaşımı spec olarak yaz (ne yapılacak, ne yapılmayacak, kısıtlar)
5. Spec'i kullanıcıya göster, onay al
6. Onay gelince: "Ready to plan. Run /rea-plan to create the implementation plan."
7. KURAL: Onay olmadan `/rea-plan` çağırma, kod yazma, dosya oluşturma.

### `rea/templates/.claude/commands/rea-execute.md`
Subagent-driven execution command'ı. Adımlar:
1. Aktif plan'ı bul: `.rea/plans/` altında NEXT: marker'ı olan todo.md'yi tara
2. Bulunamazsa: "No active plan found. Run /rea-plan first." diyip dur
3. `plan.md`'yi oku — gereksinimler referans olarak tutulur
4. NEXT: marker'lı item'ı al
5. Her item için üçlü döngü:
   a. `implementer` agent'ı çağır: item text + plan.md içeriği ver
      - Agent: uygula, test yaz (high-risk ise RED-GREEN-REFACTOR), commit at, durum döndür
      - Durum: DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT
      - BLOCKED veya NEEDS_CONTEXT → kullanıcıya sor, devam etme
   b. `spec-reviewer` agent'ı çağır: implementation diff + orijinal item gereksinimi ver
      - Agent: eksik feature var mı? fazla/gereksiz bir şey yapıldı mı? PASS / FAIL + açıklama
      - FAIL → implementer düzeltir → spec-reviewer tekrar bakar (max 3 iterasyon)
   c. `code-reviewer` agent'ı çağır: implementation diff ver
      - Agent: Critical / Important / Minor kategorilerinde sorunları listeler
      - Critical veya Important varsa → implementer düzeltir → code-reviewer tekrar bakar
6. Tüm review'lar PASS olunca: todo.md'de item'ı [x] yap, NEXT: sonraki item'a taşı
7. Tüm item'lar bitince: "All tasks complete. Run /rea-commit to open a PR."

### `rea/templates/.claude/commands/rea-worktree.md`
Git worktree command'ı. Adımlar:
1. Branch adı iste (varsayılan: `feature/<task-name>`)
2. Worktree dizinini belirle: proje root'unun bir üstünde `../worktrees/<branch-name>`
3. `.gitignore`'da `../worktrees/` veya `worktrees/` var mı kontrol et — yoksa ekle
4. `git worktree add ../worktrees/<branch-name> -b <branch-name>` çalıştır
5. Worktree dizininde stack'e göre setup çalıştır:
   - Node/pnpm: `pnpm install`
   - Node/npm: `npm install`
   - Python: `pip install -e ".[dev]"`
6. Test suite'i çalıştır — baseline'ı kaydet
7. Rapor: "Worktree created at ../worktrees/<branch-name>. Tests: X passed. Ready to work."

---

## Files to create (agents)

### `rea/templates/.claude/agents/implementer.md`
Frontmatter: tools: Read, Write, Edit, Glob, Grep, Bash — model: sonnet
Görevi: Verilen todo item'ı uygula.
Davranış:
- Item'ı oku, belirsiz bir şey varsa NEEDS_CONTEXT döndür
- High-risk item ise TDD: önce failing test yaz, test'in fail ettiğini doğrula, sonra implement et, test'in pass ettiğini doğrula
- Low-risk item ise direkt implement et
- Her logical chunk için commit at (küçük, sık commit)
- Tamamlanınca: DONE veya DONE_WITH_CONCERNS (ne endişe verdiğini açıkla)

### `rea/templates/.claude/agents/spec-reviewer.md`
Frontmatter: tools: Read, Glob, Grep, Bash — model: sonnet
Görevi: Implementation'ın plan gereksinimiyle örtüştüğünü doğrula.
Davranış:
- Verilen gereksinimi oku
- Yapılan değişikliklere bak (git diff veya belirtilen dosyalar)
- Kontrol et: eksik feature var mı? Gereksinimde olmayan bir şey eklendi mi?
- PASS: gereksinim karşılandı
- FAIL: ne eksik veya fazla olduğunu açıkla, implementer'a net talimat ver

### `rea/templates/.claude/agents/code-reviewer.md`
Frontmatter: tools: Read, Glob, Grep, Bash — model: sonnet
Görevi: Kod kalitesini değerlendir.
Değerlendirme kriterleri:
- Her dosyanın tek sorumluluğu var mı?
- Test edilebilir mi? Birimler izole çalışabilir mi?
- Çok büyük dosya oluşturuldu mu? (200+ satır yeni dosya dikkat çeker)
- DRY ihlali var mı?
Çıktı: Critical / Important / Minor listesi. Her item için: ne sorun, nerede, nasıl düzeltilir.

### `rea/templates/.claude/agents/debugger.md`
Frontmatter: tools: Read, Glob, Grep, Bash — model: sonnet
Görevi: Bug'ı root cause'a kadar izle, sadece sonra düzelt.
4 zorunlu aşama:
1. Root cause araştırma: hata mesajını tam oku, reproduce et, son değişikliklere bak
2. Pattern analizi: benzer çalışan kod var mı? Kırık vs. çalışan karşılaştır
3. Hipotez ve test: tek değişken, bir seferde bir şey dene
4. Implementation: önce failing test yaz, sonra fix uygula
KURAL: Root cause bulunmadan fix yazma. "Sanırım X'tir" yeterli değil — kanıtla.

---

## Files to modify

### `rea/templates/.claude/commands/rea-plan.md`
Todo item format bölümüne ekle (high-risk item için):
```
- [ ] NEXT: Implement X
      RED: Write test for X — must watch it FAIL before coding
      GREEN: Minimal implementation to make test pass
      REFACTOR: Clean up, keep tests green
      Commit: one commit per RED-GREEN cycle
      Test: what proves this is correct
```
Low-risk item formatı değişmez.
"Todo item detail level by risk" bölümüne ekle: High-risk → TDD format zorunlu.

### `rea/templates/.claude/commands/rea-init.md` (Workflow Behavior section)
Greenfield CLAUDE.md template'ine verification iron rule ekle:
```
**Verification Iron Rule** — NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.
Before saying "done": run the command that proves it, read the full output, check exit code. "Should work" is not evidence.
```

---

## Architecture decisions
- TDD opsiyonel (high-risk zorunlu, low-risk opsiyonel) — geriye dönük uyumluluk için
- `rea-execute` todo'yu parse etmez, item'ı olduğu gibi implementer'a verir — format bağımsızlığı
- Agents Sonnet model kullanır — Haiku yalnızca explorer (read-only, ucuz görev) için
- Parallel agents bu iterasyonda yok — tek sıralı akış daha güvenli başlangıç noktası
