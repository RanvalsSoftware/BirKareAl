# BirKare AI — test ortamını canlı sunucuya alma yol haritası

> 8 Eylül güncellemesi: Rıdvan'ın istediği **Cloud SQL + Portainer Redis + GHCR API/worker** kurulumu için [somut teslim rehberini](portainer-cloud-sql-deployment.md) kullan. Aşağıdaki sağlayıcı seçenekleri genel rehberdir; yerel Compose dosyası üretim için kullanılmaz.

Son kontrol: **8 Eylül 2026**. Amaç gerçek cihazların ulaşabildiği, **üretimden tamamen ayrı staging** backend’idir. Bu belge uzaktaki bir hizmeti açmaz, ödeme başlatmaz veya deployment yapmaz. Alan adı, sağlayıcı, bölge ve harcama sınırı işletme sahibi tarafından onaylanmalıdır.

## 1. Bu projede çalışması gereken parçalar

```text
Mobil test build → HTTPS API → PostgreSQL
                         ├─ Redis / BullMQ → sürekli çalışan worker → AI sağlayıcı
                         └─ private R2 ← kaynak fotoğraf ve AI çıktısı
```

- API: `apps/api`, Node 22, `infra/docker/api.Dockerfile`, port 4000.
- Worker: `apps/worker`, `infra/docker/worker.Dockerfile`; HTTP sitesi değil, kuyruk tüketen sürekli süreç.
- Migration: API imajından `pnpm --filter @birkare/database prisma:deploy`.
- PostgreSQL kalıcı hesap/proje/kredi/iş kayıtları; Redis BullMQ iş kuyruğu.
- R2 private bucket: staging/production config doğrulaması `STORAGE_DRIVER=r2` zorunlu tutar. Lokal disk iki servisin farklı makinede koşmasına uygun değildir.
- SMTP/transactional e-posta: henüz gerçek göndericiye bağlanmış değil; ayrıca tamamlanacak.

`docker-compose.yml` **yerel geliştirme dosyasıdır**: basit ortak DB şifresi, dışarı açılmış 5432/6379 portları, Mailpit ve local volume bulunur. Dosyayı aynen internete açma.

## 2. Sağlayıcı ve hesap düzeni

Önerilen ilk mimari: Docker çalıştıran bir PaaS üzerinde API web service + worker background service, aynı bölgede yönetilen PostgreSQL/Redis, ayrı Cloudflare R2 bucket. Render bu servis ayrımını destekleyen bir örnektir; sağlayıcı seçimi ve fiyatlandırma bu çalışmada satın alınmadı. Worker’ın sürekliliği, bölge ve verinin aktarım koşulları bütçe/mahremiyet gereksinimleriyle doğrulanmalıdır. [Render background workers](https://render.com/docs/background-workers)

İşletme sahibinin seçmesi gerekenler:

- `[staging API domain]`: örneğin `api-staging.[sahip-olunan-alan]`.
- `[bölge]`: API, worker ve DB mümkünse aynı; veri aktarımını gizlilik metniyle eşleştir.
- `[aylık altyapı bütçesi]`, `[AI test bütçesi]`, `[yetkili test kullanıcıları]`.
- `[günlük yedek ve saklama süresi]`, `[beklenen kurtarma süresi]`, `[operasyon sorumlusu]`.

Staging için ayrı DB, Redis, R2 bucket, AI proje/anahtarı ve OAuth test düzeni kullan. Production veritabanını staging’e bağlama, gerçek kullanıcı fotoğraflarını test verisi olarak kopyalama.

## 3. İlk dış testten önce kapanacak engeller

1. **E-posta teslimatı:** `AuthService.register`, `resendVerification`, `forgotPassword` tokenı kaydediyor ama gerçek mail sağlayıcısına göndermiyor. `AUTH_DEV_MODE=false` ile debug token da dönmez. Transactional mail servisi, retry, rate limit, SPF/DKIM/DMARC ve HTTPS verify/reset bağlantıları tamamlanmalı. Mailpit sadece lokal inbox’tır.
2. **Satış:** Ürün kataloğu var; gerçek IAP/makbuz doğrulama yoksa satışları staging’de gerçek para ile açma. PRO işlevinde istemci rozetini ödeme yetkisi sayma.
3. **AI güvenliği:** Moderasyon gerçek sağlayıcıyla etkin olmalı; UI’daki rapor formu gerçek kayıt/iş akışına bağlanmalı. AI maliyet ve başarısız iş politikası test edilmeli.
4. **İş sürekliliği:** Worker kapalıyken API’nin “ready” olması işin tamamlanacağını kanıtlamaz. Redis kuyruğunu, en eski bekleyen işi ve worker yaşam sinyalini ayrıca izle.
5. **Google:** Sunucu audience ile mobil Web client ID aynı olmalı; iOS scheme/Bundle ID, Android package ve Play-signing SHA-1’i ayrı doğrula. [Proje Google kurulum rehberi](google-cloud-auth-setup.md)
6. **Silme ve retention:** Hesap silme işlemi veritabanı ve R2 temizliğiyle sonlanmalı; en erken temizlik zamanı ve sınırlı HMAC kötüye kullanım kayıtları politikada açıklanmalı. `PASSWORD_PEPPER` değişimini plansız yapma: parola ve HMAC eşleşmelerini etkiler.

## 4. Ortam değişkenleri

Değerleri platform secret manager’dan gir. Aşağıdaki köşeli parantezleri gerçek değerlerle **platformda** değiştir; dolu `.env` dosyasını image’a/Git’e koyma. Kayıtlarda JWT, signed URL, kaynak görsel, provider API key ve ham parola yazdırma.

| Değişken                                                             | Staging değeri / gerekçe                                                                                               |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                                           | `staging`                                                                                                              |
| `API_HOST` / `API_PORT`                                              | `0.0.0.0` / `4000`; platform port yönlendirmesiyle aynı                                                                |
| `DATABASE_PROVIDER`                                                  | `prisma`                                                                                                               |
| `DATABASE_URL`                                                       | Ayrı staging PostgreSQL URL; TLS, sınırlı DB kullanıcı yetkileri                                                       |
| `QUEUE_DRIVER`                                                       | `bullmq`                                                                                                               |
| `REDIS_URL`                                                          | Ayrı kalıcı Redis; özel ağ/TLS, dışarı açık port yok                                                                   |
| `ENABLE_INLINE_WORKER`                                               | `false`; yalnız background worker işleri alır                                                                          |
| `GENERATION_WORKER_CONCURRENCY`                                      | İlk testte `1`; ölçümlerle kontrollü artır                                                                             |
| `OPENAI_MAX_JOBS_PER_WINDOW`                                         | Başlangıç örneği `2`; hesap limitine/bütçeye göre belirle                                                              |
| `OPENAI_RATE_WINDOW_MS`                                              | `60000`                                                                                                                |
| `STORAGE_DRIVER`                                                     | `r2`                                                                                                                   |
| `R2_ENDPOINT`                                                        | Hesaba ait S3 API endpoint, `https://[account-id].r2.cloudflarestorage.com`                                            |
| `R2_BUCKET`                                                          | Yalnız staging için oluşturulan private bucket                                                                         |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`                           | Sadece bu bucket’ta gerekli read/write/delete yetkileri                                                                |
| `JWT_ISSUER`                                                         | `https://[staging-api]`                                                                                                |
| `JWT_USER_AUDIENCE`                                                  | `birkare-mobile`                                                                                                       |
| `JWT_ACCESS_SECRET`                                                  | Yüksek entropili, en az 32 karakter; development varsayılanı değil                                                     |
| `PASSWORD_PEPPER`                                                    | Yüksek entropili ayrı gizli değer; config minimumu 16, güçlü rastgele üret; yedekle                                    |
| `JWT_ACCESS_TTL_SECONDS`                                             | `900` mevcut varsayılan; güvenlik gereğine göre                                                                        |
| `REFRESH_TOKEN_TTL_DAYS`                                             | `30` mevcut varsayılan                                                                                                 |
| `AUTH_DEV_MODE`                                                      | **`false`**                                                                                                            |
| `AI_PROVIDER`                                                        | Kısıtlı altyapı smoke testinde `fake`; gerçek AI testinde `openai`                                                     |
| `OPENAI_API_KEY`                                                     | Yalnız staging AI projesinin sunucu anahtarı                                                                           |
| `OPENAI_IMAGE_MODEL`, `OPENAI_TEXT_MODEL`, `OPENAI_MODERATION_MODEL` | Test edilip hesapta erişimi doğrulanan mevcut model ID’leri; deployment sırasında kendiliğinden model/fiyat değiştirme |
| `DISABLE_ALL_GENERATION`                                             | İlk kurulumda `true`; test kapıları sonrası `false`                                                                    |
| `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`                       | Mobil test build ile aynı OAuth düzeni; public ID’ler                                                                  |
| `GOOGLE_ANDROID_CLIENT_ID`                                           | Android client varsa ona ait ID; server audience için Web ID ile karıştırma                                            |
| `APPLE_BUNDLE_ID`                                                    | Test build’in gerçek Bundle ID’si                                                                                      |
| `CORS_ORIGINS`                                                       | Kullanılan web/operasyon origin’lerinin dar listesi; `*` değil                                                         |
| `TRUST_PROXY`                                                        | Yalnız platformun güvenilir reverse proxy topolojisi doğrulandıysa `true`                                              |
| `LOG_LEVEL`                                                          | `info`; kişisel/gizli değerleri redakte et                                                                             |

`loadConfig` staging’de in-memory repo, memory queue, local storage ve `AUTH_DEV_MODE=true` kullanımını reddeder. Bununla birlikte development görünümlü bir sırrın uzunluk kontrolünden geçmesi mümkündür; gerçek rastgele sır üretme sorumluluğu devam eder. `.env.example` içinde `API_BASE_URL` bulunsa da mevcut server config bu alanı okumuyor; mobil adresi `EXPO_PUBLIC_API_BASE_URL`, token issuer’ı `JWT_ISSUER` ile ayarla.

Mobil EAS **preview** ortamı yalnız public bilgiler alır:

```text
EXPO_PUBLIC_APP_ENV=staging
EXPO_PUBLIC_API_BASE_URL=https://[staging-api]
EXPO_PUBLIC_SUPPORT_EMAIL=[destek-adresi]
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=[public-web-client-id]
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=[public-ios-client-id]
```

Mobil bundle içindeki `EXPO_PUBLIC_*` değerler gizli değildir. EAS build profiline `environment: "preview"` ekleyip environment’ı doğrula. Staging’i production uygulamasıyla aynı cihazda tutmak istersen ayrı Bundle ID/package/scheme kararını önce ver; buna göre yeni OAuth kayıtları ve Apple capability gerekir. Bu repo otomatik staging suffix eklemiyor. [Expo ortam değişkenleri](https://docs.expo.dev/eas/environment-variables/)

## 5. Altyapıyı oluşturma sırası

1. Yönetilen PostgreSQL ve Redis’i oluştur. Uygulama servisleri özel ağdan ulaşsın; servislerin internete açık yönetici portları olmasın. Yedekleme ve TLS’yi etkinleştir.
2. Redis için eviction politikasını **noeviction**, kalıcılığı uygun şekilde ayarla. Job kayıtlarını cache gibi kaybetme. Bağlantı ve yeniden bağlanma stratejilerini yük altında test et. [BullMQ production rehberi](https://docs.bullmq.io/guide/going-to-production)
3. Private R2 bucket oluştur. Public bucket URL/custom public domain açma. İmzalı URL’ler kısa ömürlüdür; uygulama çıktı paylaşımında URL’yi yeniden alır, dış uygulamalara bearer token veya depolama anahtarı göndermez.
4. Web’den yükleme/test yapılacaksa R2 CORS: yalnız onaylı origin’ler, gerekli `PUT/GET/HEAD`, `Content-Type`; gereksiz `*` açma. Native mobil ile browser CORS farklıdır. Sunucunun presigned istek ayarları ve gerçek tarayıcı upload testi eşleşmeli. [R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/)
5. API web service: repo root Docker context, `infra/docker/api.Dockerfile`, tüm gerekli server env, port 4000. Domain/TLS bağla. Otomatik deploy’u ilk doğrulama bitene kadar kapalı tut.
6. Aynı release artifact ile tek sefer migration çalıştır. Yeni migration’ı local test DB ve staging yedeği üzerinde önce doğrula. **`prisma migrate reset`**, `db push --accept-data-loss`, production seed veya volume silme kullanma.
7. Migration başarılıysa API’yi başlat. Worker background service: repo root context, `infra/docker/worker.Dockerfile`, aynı DB/Redis/R2/model env. API’nin container’ında ayrıca inline worker çalıştırma.
8. API/worker commit veya image digest’i aynı sürüm olmalı. Birine yeni payload, diğerine eski prompt/contract kodu bırakma.
9. `/health`, `/ready`, DB, Redis, R2 erişimi ve worker startup loglarını doğrula. HTTP 200 ile yetinme; bir sentetik kuyruk işi uçtan uca tamamlanmalı.
10. İlk izinli fotoğraf testi için üretim kilidini kontrollü aç; harcama limitiyle tek iş. Sonuç ve kredi muhasebesi doğruysa kapalı test kullanıcılarına dağıt.

## 6. Yerel doğrulama / staging release komutları

Yerelde bağımlılıklar için Node 22 ve proje `packageManager` değerindeki pnpm kullan:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm db:generate
pnpm typecheck
pnpm test
pnpm lint
docker compose build api worker migrate
docker compose run --rm migrate
docker compose up -d api worker
docker compose ps
curl --fail http://localhost:4000/health
curl --fail http://localhost:4000/ready
```

Yukarıdaki Compose komutları **yerel** yapı içindir. Staging’de platformun migration/release job’unda yalnız şu komutu çalıştır:

```bash
pnpm --filter @birkare/database prisma:deploy
```

Ardından platform API ve worker süreçlerini kendi Dockerfile CMD’leriyle başlatır. `NODE_ENV=staging` ayarlıyken runtime `tsx` ve workspace bağımlılıkları mevcut Dockerfile install’ında hazırdır; dependency pruning yaparsan start komutunun ihtiyaçlarını ayrıca koru.

Staging sağlık kontrolü:

```bash
curl --fail https://[staging-api]/health
curl --fail https://[staging-api]/ready
```

`/ready` sonucu veri tabanı hazırlığını gösterebilir; AI hesabının model erişimini, mail teslimatını veya worker’ın kuyruk işlediğini garanti etmez. Sahte sağlayıcıyla tamamlanan smoke test de gerçek AI entegrasyon testi değildir.

## 7. Zorunlu kabul senaryoları

| Senaryo                        | Beklenen sonuç                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| JPEG/PNG/HEIC kamera ve galeri | Geçerli dosya tek kez yüklenir; reddedilen izin/bozuk dosya anlaşılır hata verir              |
| Çift create / ağ yanıtı kaybı  | Aynı idempotency ile tek iş ve tek kredi rezervi                                              |
| Worker geçici kapanır          | Kalıcı kuyruk işi kaybetmez; kullanıcı sonsuz sahte %100 görmez                               |
| Sağlayıcı timeout / 429 / 5xx  | Güvenli terminal/retry politikası; çift ücretlendirme yok; kullanıcı mesajı açıklayıcı        |
| Filtre/beauty yoğunluğu        | Seçim gerçek backend promptuna gider, değişiklikler ölçülebilir şekilde ayrışır               |
| A hesabı → B hesabı            | A’nın eski ağ sonucu, fotoğrafı veya üretim ID’si B’ye taşınmaz                               |
| Başka kullanıcı asset/job ID   | 403/404; sahiplik ve hazır olma kontrolleri atlanamaz                                         |
| Google release login           | iOS URL scheme ve Android Play signing kimliğiyle başarılı; iptal hata gibi kaydedilmez       |
| E-posta doğrulama/reset        | Mail gerçekten teslim olur; token tek kullanımlık, süreli; gelişim tokenı dışarı çıkmaz       |
| Hesap silme                    | Yeni işleri durdurur, session erişimini kapatır, R2 dosyalarını ve hesap kayıtlarını temizler |
| R2 silme hatası                | Silme talebi kalıcı ve retry edilebilir; sessizce “silindi” denmez                            |
| Aynı kimlikle tekrar kayıt     | Kararlaştırılan welcome-credit kötüye kullanım koruması server’da çalışır                     |
| Paylaşım/kaydetme              | Gerçek tamamlanmış çıktı paylaşılır; izin reddi, offline, uygulama yokluğu kontrollü          |
| Rapor gönderimi                | Sunucu kaydı ve inceleme kuyruğu gerçekten oluşur; erişim/rate limit denetlenir               |

Test verilerini açıkça sentetik/izinli etiketle. Gerçek kullanıcının tamamlanmış işini veya kredi geçmişini silerek test yapma. Eski “QUEUED” kayıtlarını otomatik tekrar üretmek maliyet doğurabilir; operatör kararına bırak.

## 8. İzleme, yedek ve geri dönüş

- API 5xx/latency, auth başarısızlık oranı, upload hataları; sadece güvenli error code/request ID kaydet.
- Worker aktiflik, kuyruk bekleme yaşı, running süreleri, completed/failed oranı, sağlayıcı 429 ve timeout.
- Her işte reserved/charged/refunded tutarlılığı; duplicate generation/credit alarmı.
- AI harcama ve hız limitleri, R2 depolama büyümesi, DB bağlantı sınırı, Redis bellek kullanımı.
- Hesap silme pending yaşı ve tekrar eden obje silme hataları; cron/background temizlik döngüsünün çalıştığını izle.
- PostgreSQL otomatik yedek + periyodik **ayrı restore DB’de** geri yükleme tatbikatı. R2 retention/lifecycle, yedeklerde silme gecikmesi ve HMAC kayıtlarının saklama kararını gizlilik politikasıyla uyumlu yap.
- Deploy’dan önce DB yedeği ve önceki API/worker image digest’ini kaydet. Geri dönüşte API/worker birlikte önceki uyumlu sürüme alınır. Migration geri almak tablo silmek demek değildir; uyumlu ileri düzeltme veya planlı restore gerekir.
- Kritik hatada `DISABLE_ALL_GENERATION=false` ile yeni işleri durdur; devam eden/sağlayıcıya gönderilmiş işlerin otomatik duracağını varsayma. Operatör tek tek doğrular; kredi iadesi muhasebeleştirilir.
- Sır sızarsa ilgili anahtarı sağlayıcıda iptal/rotate et; production kullanıcı oturumlarını ve pepper etkisini planlayarak yönet. Logdan değeri silmek tek başına yeterli değildir.

## 9. Testten production’a geçiş kapısı

- [ ] Staging kabul senaryolarının sonuçları ve açık hataları kayıtlı.
- [ ] Production **ayrı** altyapı/anahtarlar/domain ile açılır; staging DB’si ad değiştirerek production yapılmaz.
- [ ] Gizlilik/yasal metinler ve store formları gerçek retention, veri işleyenler ve ödeme modeline göre onaylanmış.
- [ ] E-posta, raporlama, ödeme varsa IAP, silme, Google/Apple ve ücretlendirme kontrolleri tamam.
- [ ] Destek sorumlusu, incident planı, bütçe alarmları ve yedekten dönüş tatbikatı hazır.
- [ ] Mobil production build gerçek production API’ye bağlı; `localhost`, Mailpit, fake provider veya development tokenı yok.
- [ ] Yetkili kişi son yayın onayını verir; ardından [mağaza yol haritası](app-store-google-play-roadmap.md) uygulanır.
