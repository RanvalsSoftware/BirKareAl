# BirKare Backend Güvenlik Denetimi — 21 Eylül 2026

## Sonuç

Backend; kimlik doğrulama, e-posta doğrulama, kredi, RevenueCat, dosya yükleme,
görsel üretim, hesap silme ve container sınırları açısından incelendi. Yüksek
etkili iki uygulama açığı giderildi:

1. Doğrulanmamış veya aynı Gmail kimliğinin alias'larıyla açılan hesapların
   tekrar tekrar hoş geldin kredisi alabilmesi engellendi.
2. Tamamlanmış bir yükleme için eski presigned PUT adresinin yeniden kullanılıp
   kaynak dosyanın değiştirilmesi engellendi.

Denetim sonunda API testlerinin 153/153'ü, mobil testlerin 366/366'sı, tüm
TypeScript typecheck ve lint kontrolleri geçti. PostgreSQL + Redis ile gerçek
migration, readiness, CORS, yetkisiz erişim ve alias suistimali smoke testleri
başarılı oldu.

Bu rapor “hiç açık yoktur” garantisi değildir. Aşağıda kalan operasyonel ve
bağımlılık riskleri ayrıca belirtilmiştir.

## E-posta ve sahte hesap koruması

- Doğrulama kodu 6 rakam, 10 dakika geçerli ve en fazla 5 yanlış denemelidir.
- Kod ve token değerleri veri tabanında düz metin tutulmaz.
- Kayıt, giriş, kurtarma, doğrulama ve yeniden gönderme limitleri e-posta, IP ve
  uygun akışlarda cihaz kimliği bazında Redis üzerinde paylaşılır.
- Yeniden gönderimde 60 saniye bekleme uygulanır.
- `validator` ile biçim, bilinen alan adı yazım hataları, disposable alan adı,
  yerel allow/block listesi ve MX kaydı kontrol edilir.
- DNS geçici olarak yanıt vermiyorsa sahte “geçersiz e-posta” kararı verilmez;
  güvenli biçimde geçici servis hatası dönülür.
- Kurumsal alan adları yalnız büyük sağlayıcı listesinde olmadığı için
  engellenmez. Apple Private Relay desteklenir.
- Ücretsiz kredi kayıt anında değil, e-posta doğrulaması tamamlandığında atomik
  olarak verilir.
- Gmail nokta ve `+etiket` alias'ları yalnız suistimal parmak izi için
  kanonikleştirilir; kullanıcının gerçek adresi değiştirilmez.
- Kalıcı `WelcomeCreditClaim` kaydı hesap silinse bile aynı doğrulanmış e-posta
  kimliğinin tekrar hoş geldin kredisi almasını engeller.

## Oturum ve auth sınırları

- Erişim tokenındaki session kimliği her istekte doğrudan veri tabanından
  doğrulanır; iptal edilmiş, süresi geçmiş veya kullanıcı durumu değişmiş
  oturum kabul edilmez.
- Yetki/rol kararı yalnız JWT içindeki eski role bırakılmaz, güncel hesap kaydı
  kullanılır.
- Google ve Apple kimlik tokenları sunucuda issuer, audience, süre ve imza
  kontrollerinden geçer.
- Şifre pepper'ı ve JWT secret'ı production/staging'de zorunlu, en az 32
  karakter ve birbirinden farklıdır.
- Hata cevapları secret, stack veya upstream kimlik bilgisi sızdırmaz.

## Dosya yükleme ve görsel üretim

- Mobil istemci yalnız süreli presigned URL ile `pending` nesnesine yükler.
- API boyut, MIME, magic byte ve SHA-256 bütünlük kontrolünden sonra nesneyi
  sunucu tarafından kalıcı ve istemcinin yazamayacağı `original` anahtarına
  kopyalar; pending nesnesini siler.
- Eski PUT adresinin tekrar kullanılması doğrulanmış kaynak dosyayı artık
  değiştiremez.
- Depolama okumaları üst boyut sınırıyla akar; aşırı büyük cevap belleği
  tüketmeden kesilir.
- Hazır asset okunurken saklanan hash doğrulanır. Daha eski oluşturulmuş asset
  kayıtları ilk güvenli okumada hash ile bağlanır.
- Kredi rezervasyonu ve iade işlemleri idempotenttir; üretim güvenlik veya
  sağlayıcı hatasıyla tamamlanmazsa aynı iş için çift iade/çift harcama olmaz.
- Moderasyon ve sağlayıcı belirsizliği fail-closed davranır.

## RevenueCat ve kredi güvenliği

- Mobil uygulamadaki entitlement yalnız arayüz bilgisidir; Pro korumalı üretim
  sunucuda RevenueCat üzerinden tekrar doğrulanır.
- Webhook Authorization ve HMAC imzası doğrulanır; eski imza ve aynı event
  kimliğiyle farklı içerik reddedilir.
- Aylık/yıllık/ömür boyu plan kredileri ile 20/60/150 kredi paketleri işlem ve
  dönem bazında idempotent verilir.
- Ürün kimlikleri `com.birkareai.*`, entitlement
  `create_an_app_called_birkare_pro`, offering `birkare_pro` olarak kod ve test
  tarafında eşleşir.
- Politika fiyatları aylık ₺299,99, yıllık ₺2.499,99, ömür boyu ₺4.999,99 ve ek
  kredi için ₺99,99 / ₺249,99 / ₺499,99 olarak eşitlendi. Kullanıcıya gösterilen
  gerçek fiyat her zaman App Store/RevenueCat `priceString` değeridir.
- Yerel backend ortamında `REVENUECAT_SECRET_API_KEY` alanının public `appl_`
  anahtar türünde olduğu tespit edildi. Bu değer backend doğrulaması için
  geçersizdir ve kod güvenli biçimde RevenueCat'i yapılandırılmamış sayar.
  Backend secret alanına RevenueCat'ten kısıtlı yetkili `sk_` anahtar konmalıdır.

## Ağ, servis ve container sınırları

- Helmet güvenlik başlıkları, explicit HTTPS CORS allowlist ve body boyut
  sınırları uygulanır.
- `/ready`; PostgreSQL, Redis auth store ve üretim kuyruğunu kontrol eder.
- Yerel Docker Compose PostgreSQL, Redis, Mailpit ve API portları yalnız
  `127.0.0.1` üzerinde yayınlanır.
- Production container non-root, read-only filesystem ve capability-drop ile
  çalışacak şekilde test edilir.
- `.env`, özel anahtar, credential, keystore ve yerel secret dosyaları Git ve
  Docker build context dışında tutulur.

## Doğrulama kanıtları

- API: 153/153 test geçti.
- Mobil: 366/366 test geçti.
- Monorepo TypeScript typecheck: geçti.
- Lint: 0 hata; mobil tarafta işlevi engellemeyen 12 mevcut uyarı raporlandı.
- Prisma schema validation ve 16 migration: geçti.
- Gerçek PostgreSQL + Redis alias suistimali testi: iki Gmail alias hesabından
  yalnız ilki 21 kredi aldı (`[21, 0]`). Test hesapları silindi; suistimal claim
  kayıtları tasarım gereği bırakıldı.
- API smoke: health 200, ready 200, yetkisiz `/v1/me` 401, izin verilmeyen Origin
  403 ve güvenlik başlıkları doğrulandı.
- API Docker image yerel `linux/amd64` build: geçti. Registry'ye push yapılmadı.
- iOS native development build: temiz CocoaPods kurulumu sonrasında Xcode ile
  derlendi, imzalandı, iPhone 17e simülatörüne kuruldu ve açıldı (0 hata,
  1 yinelenen `-lc++` uyarısı). Metro geliştirme sunucusu çalışır durumda.

## Kalan riskler ve canlı öncesi işler

### Yüksek öncelik

1. Sohbet veya başka bir açık kanalda daha önce paylaşılmış API, SMTP, GitHub ve
   hesap parolaları sızmış kabul edilerek döndürülmelidir. Yeni değerler yalnız
   secret manager/Portainer environment içine girilmelidir.
2. RevenueCat backend `sk_` secret, webhook Authorization ve HMAC signing secret
   tamamlanmadan gerçek kredi verme hattı canlıya açılmamalıdır.
3. RevenueCat paneline App Store Connect In-App Purchase `.p8`, Key ID ve Issuer
   ID doğrudan yüklenmeli; bu dosya repo veya mobil bundle'a konmamalıdır.
4. Staging üzerinde gerçek imzalı iOS cihazıyla aylık, yıllık, lifetime,
   20/60/150 kredi, iptal, pending, restore ve hesap değiştirme testleri
   yapılmalıdır.

### Orta öncelik

- E-posta dışındaki bazı Express rate limiter'lar process-local çalışır. Birden
  fazla API replica kullanılacaksa üretim/billing/support limitleri de Redis
  tabanlı ortak limitere taşınmalıdır.
- Runtime Docker image source, `tsx` ve Prisma CLI içerdiği için saldırı yüzeyi
  ideal minimumdan büyüktür. Ayrı derleme/runtime stage ve yalnız üretim
  bağımlılıklarıyla daraltılmalıdır.

### Bağımlılık advisories

Son production dependency taramasında 0 critical, 3 high, 3 moderate advisory
raporlandı:

- Prisma CLI/config zincirindeki `deepmerge-ts` high; güvenilir olmayan recursive
  JS config nesnesi gerektiriyor ve mevcut HTTP runtime yolunda kullanılmıyor.
  Çözüm Prisma major upgrade değerlendirmesi gerektiriyor.
- MinIO zincirindeki `stream-json` moderate; uygulama advisory'deki kullanıcı
  kontrollü JSON path filter API'sini kullanmıyor.
- Metro `image-size` high ve Expo/xcode/route build zincirindeki `uuid` ile
  `decode-uri-component` moderate advisories mobil build-time zincirindedir;
  güncel uyumlu upstream sürümleri takip edilmelidir.

Bu advisories gizlenmemeli; Expo/React Native ve Prisma yükseltme denemeleri ayrı
bir branch'te regresyon testleriyle ele alınmalıdır.
