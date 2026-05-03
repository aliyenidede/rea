# AI Coding Principles

Source: Matt Pocock workshop on AI-assisted software engineering. Distilled to principles only — stack and implementation details stripped.

## 1. Smart zone vardır, ona göre tasarla
~100K civarında LLM aptallaşmaya başlar. Token miktarı bir "kalite metriği"dir. Görev boyutunu zekanın kapasitesine göre kes, tersini değil.

## 2. Compact bir kayıptır, clear bir feature'dır
Bilgiyi context'te biriktirmek zarar verir. Her iş "fresh start"tan picking up edilebilir olmalı. Artifact'ler (yazılı çıktılar) bu yüzden vardır — context'i değil, dosyayı taşı.

## 3. İki tip iş var: human-in-the-loop ve AFK
Alignment, taste, karar = insan zorunlu. Implementation = delege edilebilir. Bu ayrımı net tutmazsan ya AI'a karar verdirirsin (kötü) ya da kendin kod yazarsın (yavaş).

## 4. Spec değil, shared design concept
AI ile aynı kafada olmak, ona iyi yazılmış spec vermekten daha önemli. Spec sadece o anlaşmanın özetidir. "Specs to code" vibe coding'in maskelenmiş halidir — kodu görmezden gelirsin, sonunda batırırsın.

## 5. AI sana sormalı, sen AI'a anlatmamalısın
Karşılıklı sorgulama (grilling) tek yönlü brief vermekten her zaman daha kaliteli alignment üretir. Çünkü senin kafanda eksik olan şeyleri AI yakalar, AI'ın eksik olduğu şeyleri sen yakalarsın. İyi soru, iyi cevaptan değerlidir.

## 6. Plan = destination + journey, ikisi farklı belgeler
Nereye gittiğin (ne inşa ediliyor) ile nasıl gittiğin (hangi sırayla, hangi parçalar) ayrı şeylerdir. Karıştırırsan ikisi de bozulur.

## 7. Sequential plan tek agent'ı besler, DAG çoklu agent'ı besler
"Phase 1 → Phase 2 → Phase 3" mantığı paralelleştirilemez. Bağımlılık grafiği kurarsan birden fazla iş aynı anda akabilir. Bu da insanın bekleme zamanını düşürür.

## 8. Vertical slice > horizontal slice
AI doğal olarak "önce tüm DB, sonra tüm API, sonra tüm UI" yapar. Bu feedback'i geciktirir. Her parça tüm katmanları kesip uçtan uca çalışan bir şey üretmeli — yoksa entegrasyon hatalarını projenin sonunda yersin.

## 9. Feedback loop kalitesi = AI çıktısının tavanı
Test yoksa, type check yoksa, lint yoksa AI kör kodlar. Codebase'in test edilebilirliği kadar AI üretkendir. Çözüm AI'ı zorlamak değil, codebase'i iyileştirmek.

## 10. TDD AI'ın hile yapmasını engeller
AI önce implementation sonra test yazarsa testi koda göre uydurur. Önce test sonra kod sırası, AI'ın "geçen testi yazma" eğilimini kırar.

## 11. Bad codebase = bad agent
Shallow modüller (küçük, çok bağımlı, dağınık) AI'ı karıştırır. Deep modüller (büyük, tek arayüzlü, içi zengin) hem test edilebilir hem AI tarafından anlaşılabilir. Mimari kararı AI'ın performansını doğrudan belirler.

## 12. Push vs pull — bilgiyi role göre dağıt
Implementer'a opsiyonel referans (pull) ver, çünkü smart zone'u koruman lazım. Reviewer'a zorunlu kurallar (push) ver, çünkü onun işi karşılaştırmak. Aynı bilgiyi her agent'a aynı şekilde vermek kötü tasarımdır.

## 13. Reviewer fresh context'te olmalı
Implementer dumb zone'a düşmüşken aynı context'te review yaparsa aptal review yapar. Clear → review → smart zone'da kontrol. Aynı sebep: alignment kalitesi context kalitesine bağlı.

## 14. Doc rot gerçek bir tehlike — eski plan yeni AI'ı zehirler
Tamamlanmış spec/PRD repo'da kalırsa, sonraki agent onu "doğru" sanır ve gerçek koddan sapan bir resim üzerinden çalışır. Plan ya yaşamalı ya kapatılmalı; ortası yok.

## 15. Otomasyonun sınırı taste'tir
Üretimi otomatize edebilirsin, ama "iyi mi?" sorusunu otomatize edemezsin. QA insanın taste'ini koda dayatma momentidir. Bu momenti es geçen tool'lar slop üretir.

## 16. Stack'ine sahip ol
Hazır framework'leri (taskmaster, spec-kit vb.) körce kullanırsan, bozulduğunda hata yerini bulamazsın. Observability + ownership = troubleshoot edebilme. Magic'i sevme.

## 17. Plan AI'ın değil insanın işi
Planlamayı da AI'a delege edersen, kararı AI veriyor demektir. Yanlış kararı düzeltemezsin çünkü neye dayandığını bilmiyorsun. AI kararları *önerebilir*, insan *vermeli*.

## 18. Mimari farkındalık delege edilemez
Agent'lar kod yazsın, ama "bu modül nereye oturuyor, neyle konuşuyor" sorusunu sen cevaplamalısın. Bu farkındalık kaybolursa, codebase'in şeklini AI'a vermiş olursun — ki o iyi mimar değildir.

## 19. Eski yazılım kitapları AI çağında daha değerli
Pragmatic Programmer, Philosophy of Software Design, Mythical Man-Month — bunlar zaten "insan ekipler nasıl iyi yazılım üretir"i çözmüş. AI bir takım üyesi gibi davranıyorsa, aynı prensipler işliyor. "AI için yeni bir disiplin lazım" yanılgısına düşme.

## 20. Kalite ucuz değildir, ama yavaş da değildir — sadece doğru yere konulmalı
Hız kazandığın yer: implementation. Kalite koyduğun yer: alignment + review + taste. Bu ikisi karışırsa ya yavaş ya kalitesiz olursun.
