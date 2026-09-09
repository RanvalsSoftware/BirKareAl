# Üretimin bitmesine rağmen ekranda takılması — 8 Eylül 2026

## 17:27 denemesi: sonuçlandırma hatası değil, sağlayıcı çıktı reddi

8 Eylül 2026 17:27:37 Türkiye saatindeki `0724771f-b99c-41b2-a0ea-53e9e71cbb41`
işi ayrıca incelendi. Bu yeni olay, aşağıdaki 16:03 olayından farklıdır:

- Worker 17:28:12'de HTTP **400**, `moderation_blocked`, `image_generation_user_error`
  aldı. Sağlayıcının bildirdiği aşama **output**, kategori listesi **boş**.
- Sağlayıcı istek kimliği: `req_38508be730974bbc87ea6a02195074fd`.
- Veritabanı durumu doğru biçimde `BLOCKED / OUTPUT_MODERATION`. Sıfır çıktı,
  2 kredi rezervi, 0 tahsilat ve 2 kredi iadesi var. Takılı iş, yeniden render veya
  ikinci iade yapılmadı; bu incelemede veritabanı kayıtları değiştirilmedi.
- Seçim: gece stadyumu + drip-art, yoğunluk 60, `FULL_SCENE`, yakın selfie.
  Bu işin tarifinde güzellik, cinsiyet görünümü veya akım katmanı yok.
- Model `gpt-image-1-mini`, kalite `PREVIEW`, oran `4:5`. Bunlar cuma günkü
  başarılı örneklerle aynı; prompt sürümü ve kullanıcı kaynak fotoğrafı farklı.
  Cuma PNG kaynağı 2.134.980 bayt, bu işin JPEG kaynağı 63.326 bayt.
  Dosya boyutu veya prompt farkının ret nedeni olduğu **kanıtlanmadı**.
- Çalışan worker içindeki yeni ücretsiz kontrol: model erişimi HTTP 200,
  kişisel veri içermeyen sabit metin moderasyonu `flagged=false`.
  Bu kontrol fotoğraflı üretimin başarılı olduğunu kanıtlamaz.
- Gerçek SDK, ağsız testlerle ayrıca doğrulandı: JPEG/PNG kaynak baytları,
  MIME türü ve tek dosya `/v1/images/edits` isteğine aynen gidiyor;
  `moderation=auto` korunuyor; çıktı reddi yeniden denenmiyor, istek kimliği
  ve ret aşaması doğru okunuyor. Toplam API testleri **87/87** geçti.

Kesin ret nedeni sağlayıcı yanıtında bulunmadığından, yalnız ayar değişikliğiyle
üretimin düzeldiği iddia edilemez. Çalışma dizininde `.git`/cuma kaynak sürümü
olmadığı için tam sürüm geri dönüşü de yapılmadı. Güvenlik kontrolleri kapatılmadı,
model değiştirilmedi ve reddedilen istek başka biçimde yeniden gönderilmedi.
Kişisel fotoğraf içermeyen ayrı bir tek düzenleme testi için yeni onay istendi;
bu incelemede yeni ücretli çağrı yapılmadı.

Gerekirse sağlayıcı desteğine iletilebilecek teknik özet (henüz gönderilmedi):

> Please investigate image-edit request `req_38508be730974bbc87ea6a02195074fd`,
> at 2026-09-08 14:28:12 UTC. It returned HTTP 400 / `moderation_blocked`,
> `moderation_stage: output`, with no categories. Model: `gpt-image-1-mini`;
> quality: low; one JPEG source; one requested output; moderation: auto.
> The app received no output image and did not retry. Can you review whether
> this was a false positive and provide any available diagnostic context?

Bu özete anahtar, kullanıcı fotoğrafı veya tam kullanıcı promptu eklenmedi.
OpenAI Docs kılavuzu ve [resmi hata açıklaması](https://developers.openai.com/api/docs/guides/image-generation#handling-blocked-requests-and-other-errors)
izlendi: çıktı reddi, teknik hata ve uygulama sonuçlandırması birbirinden ayrıldı.

## Kesin neden

`af0af411-9e0f-4731-8c92-4ede67dad7bd` işi 13:03:19 UTC / 16:03:19 Türkiye saati ile başladı. Sağlayıcı yaklaşık 20 saniye sonra HTTP 400 `moderation_blocked`, aşama `input`, boş kategori listesi döndürdü. Sağlayıcı istek kimliği: `req_e143559f955346729ccc0be164013d67`.

Kredi rezervi **başarıyla iade edildi**; ardından sonuç kaydı başarısız oldu. Worker, `PROVIDER_SAFETY_CHECK` adındaki aşamayı yazmaya çalışıyordu; bu değer Prisma `GenerationStage` enum'unda bulunmuyor. Bu nedenle iş veritabanında `GENERATING / OPENAI_IMAGE_GENERATION` kaldı. Catch bloğu sonuçlandırma hatasını yuttuğundan BullMQ işi de `completed` olarak görüyordu. İlerleme ekranının takılmasının doğrulanmış sebebi budur; bu olayda kredi iadesi başarısız değildir.

Sağlayıcının gerçek giriş reddi, uygulamadaki sonuç kaydetme hatasından ayrıdır. Güvenlik kontrolleri kapatılmadı; kaynak görsel veya prompt aynı isteği kabul ettirmek için değiştirilmedi.

## Kanıt ve dar kapsamlı onarım

- BullMQ durum okuması: iş `completed`; `active`, `wait`, `delayed` sayıları sıfır.
- Ledger: `GENERATION_RESERVATION / REVERSED / -1`; `GENERATION_RELEASE / COMPLETED / +1`, 13:03:39.269 UTC.
- Guard koşullu tek UPDATE, yalnız bu işin durumunu `BLOCKED / INPUT_MODERATION`, `refundedCredits=1`, `chargedCredits=0`, `progress=100` olarak düzeltti. Ön koşullar: aynı eski durum, aynı rezerv tutarı, doğrulanmış tamamlanmış iade ve sıfır çıktı.
- Etkilenen kayıt: **1**. Cüzdan/ledger hareketi eklenmedi, ikinci iade yapılmadı, eski iş kuyruğa alınmadı ve yeni sağlayıcı çağrısı bu onarım tarafından yapılmadı.

## Kod düzeltmesi

- Provider giriş reddi mevcut `INPUT_MODERATION`, çıktı reddi `OUTPUT_MODERATION`, belirsiz aşama `MODERATION_PROVIDER` değerine eşleniyor; yeni DB enum/migration gerekmiyor.
- Başarısız işin terminal kararı iade sonuçlandırmasından önce saklanıyor. İade tamamlanmadan mesaj bunu tamamlanmış gibi sunmuyor.
- Sonuçlandırma hatası BullMQ'ya hata olarak iletiliyor. Aynı iş tekrar teslim edilirse yalnız kalan sonuçlandırma/iade tamamlanıyor; ücretli görsel isteği tekrar gönderilmiyor.
- Önceden başlamış ama sonucu doğrulanamayan iş, yeni bir render denemesi olarak ele alınmıyor.
- API inline worker bu hataları kontrollü olarak yakalıyor.
- Test repository'si artık aşama değerlerini gerçek Prisma schema enum'uyla karşılaştırıyor; yalnız Memory repository testlerinin bu uyumsuzluğu kaçırması önleniyor.

Değişen kod: `packages/ai/src/generation-runner.ts`, `apps/api/src/modules/generations/runtime.test.ts`, `apps/api/src/queues/generation.queue.ts`.

## Doğrulama ve yeniden başlatma

- Tam API test paketi **85/85**; API/worker/AI TypeScript kontrolleri geçti.
- Yeni `linux/amd64` release API image'ı içinde de aynı 85 test ağsız ortamda geçti.
- Yerel API ve worker, mevcut yerel bağımlılıklar/veriler korunarak düzeltilmiş image'larla yeniden başlatıldı. PostgreSQL/Redis volume'ları silinmedi veya yeniden kurulmadı.
- Yeniden başlatmadan sonra API `/health` ve `/ready`: **HTTP 200**.
- Yeniden başlayan worker içinden model erişimi: **HTTP 200**, `gpt-image-1-mini`; kişisel veri içermeyen sabit metin moderasyonu: `flagged=false`.
- Bu yeniden başlatma aşamasında yeni ücretli render yapılmadı; yeni tek nötr test için kullanıcıya onay soruldu. Önceki 16,7 saniyelik başarılı nötr üretim ayrı, daha önceki testtir. Aynı fotoğrafın gelecekte kabul edileceği veya mobil uçtan uca akışın bütünüyle geçtiği iddia edilmiyor.

Bu değişiklikler [GHCR teslimindeki](portainer-cloud-sql-deployment.md) `2026.09.08-1` API/worker image'larına dahildir. Registry yayını uzak Cloud SQL/Portainer ortamının kurulduğu anlamına gelmez.

## Kalan ayrı risk

Kredi tahsilatından sonra `COMPLETED` kaydının başarısız olmasıyla ilgili önceki atomiklik kenar durumu bu dar düzeltmede yeniden tasarlanmadı. Bu olayda tahsilat yoktur ve mevcut ledger iadesi doğrudur. Genel üretim/muhasebe atomikliği için ayrı test ve tasarım çalışması gerekir.
