# BirKare AI — RevenueCat entegrasyonu

## Kapsam ve canlıya geçiş sınırı

Bu entegrasyon mobil SDK ile backend doğrulamasını birlikte kapsar: mevcut BirKare hesap girişi ve **Krediler > BirKare Pro** kartı; RevenueCat satın alma, müşteri bilgileri, entitlement kontrolü, geri yükleme, Paywall ve Customer Center ile bağlanır. Backend aynı kullanıcı kimliğini RevenueCat REST API üzerinden doğrular, webhook olaylarını kimlik doğrulamalı ve idempotent işler, Pro özelliklerini sunucuda korur ve plan kredilerini yalnız bir kez verir. `react-native-purchases` ve `react-native-purchases-ui` birlikte **10.9.1** sürümüne sabitlenmiştir.

Tam entitlement kimliği:

```text
create_an_app_called_birkare_pro
```

iOS development ve App Store Sandbox derlemeleri, RevenueCat'teki iOS uygulamasının `appl_` public SDK anahtarını kullanır. Android development henüz `test_` Test Store anahtarını kullanabilir. Bu anahtarların hiçbiri gizli sunucu anahtarı değildir. Production/staging ve mevcut release bayrakları `test_` anahtarını reddeder.

`eas.json` içindeki `staging` profili `distribution: "store"` kullandığı için
iOS çıktısı App Store Connect/TestFlight hattına gider. Bu bir production tahsilatı
anlamına gelmez: TestFlight üzerinden yapılan uygulama içi satın almalar Apple
sandbox ortamında çalışır ve gerçek ücret çekmez. TestFlight kullanmadan cihazda
denemek için `development` veya `preview` profiliyle development/ad hoc build
kurun; iOS 18 ve sonrasında cihazda **Ayarlar > Geliştirici > Sandbox Apple
Account** bölümünden App Store Connect sandbox test kullanıcısıyla oturum açın.
Apple sandbox testi yine `appl_` public SDK anahtarını kullanır. RevenueCat'in
`test_` anahtarıyla açılan Test Store ise Apple sandbox'tan ayrı, yalnız
RevenueCat'e ait sahte mağaza akışıdır.

Telefonda kredi eklenmez. Satın alma veya restore sonrasında mobil uygulama `/v1/billing/revenuecat/sync` çağırır; API entitlement'ı RevenueCat'ten tekrar okuyup krediyi veri tabanında idempotent verir. Webhook aynı doğrulamayı bağımsız olarak tetikler. Ömür boyu plan sınırsız AI üretimi anlamına gelmez; yalnız yapılandırılmış tek seferlik kredi hakkını verir.

**Gerçek ücretli ürünleri ancak backend secret ve webhook ayarları tamamlandıktan sonra açın.** Public `test_` SDK anahtarı sunucunun satın almayı doğrulaması için yeterli değildir.

## 1. Bağımlılıkları kurma

Bu depo `pnpm@10.18.0` kullanan bir monorepodur. Mevcut kilit dosyasını koruyun; proje köküne ayrıca npm kilit dosyası üretmeyin.

Değişiklik dalını aldıktan veya PR'ı birleştirdikten sonra, depo kökünde:

```bash
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @birkare/mobile typecheck
corepack pnpm --filter @birkare/mobile test
```

RevenueCat sihirbazının istediği npm karşılığı, **bağımsız bir React Native projesinde**, şudur:

```bash
npm install --save react-native-purchases@10.9.1 react-native-purchases-ui@10.9.1
```

Bu monorepoyu npm'e taşımak gerekmez. Burada bağımlılıklar mobil workspace'e ve `pnpm-lock.yaml` dosyasına eklenir.

## 2. Yeni native uygulama derlemesi

Xcode veya Android geliştirme araçları kurulu bilgisayarda, depo kökünden:

```bash
corepack pnpm --filter @birkare/mobile ios
# veya
corepack pnpm --filter @birkare/mobile android
```

Bunlar mevcut `expo run:ios` / `expo run:android` komutlarını çalıştırır; EAS bulut hizmeti zorunlu değildir. Yeni native SDK'lar için uygulamayı yeniden derleyin. Expo Go, tarayıcı, eski kurulu uygulama veya yalnız JavaScript güncellemesi gerçek mağaza satın alma testi değildir. Desteklenmeyen ortamda kart açıklama gösterir; satın alma modülü uygulama açılışını çökertmez.

Android plugin'i banka uygulamasından ödeme doğrulamasına dönüş için MainActivity `launchMode` değerini `singleTop` yapar; BILLING izni Expo yapılandırmasındadır. Android deep link ve banka uygulamasından dönüşü cihazda kontrol edin. iOS mağaza hazırlığında Xcode > Target > Capabilities > In-App Purchase yeteneğini doğrulayın.

## 3. RevenueCat paneli: Test Store ürünleri

Mevcut projeyi kullanın; aynı isimde ikinci proje açmayın. Aşağıdaki ürünleri **varsa yeniden oluşturmak yerine kontrol edin**:

| Product ID | Ürün türü                          | Offering paket türü       |
| ---------- | ---------------------------------- | ------------------------- |
| `monthly`  | Otomatik yenilenen aylık abonelik  | Monthly / `$rc_monthly`   |
| `yearly`   | Otomatik yenilenen yıllık abonelik | Annual / `$rc_annual`     |
| `lifetime` | Tek ödemeli, tüketilmeyen ürün     | Lifetime / `$rc_lifetime` |

Üç ürünü de `create_an_app_called_birkare_pro` entitlement'ına bağlayın. Bir offering oluşturun veya mevcut olanı kullanın (örneğin `default`); üç paket türünü ekleyip geçerli/current offering olarak belirleyin. Uygulama `getOfferings().current` içindeki `monthly`, `annual`, `lifetime` alanlarını kullanır. Ürün kimliği `yearly` ile RevenueCat paket kimliği `$rc_annual` aynı kavram değildir. Gerçek Android mağazası ve base plan kimlikleri farklı olabilir.

Fiyatlar `product.priceString` üzerinden yerelleştirilmiş mağaza fiyatlarıdır; telefonda sabit TL fiyatı veya sahte indirim hesaplanmaz.

BirKare'nin kabul edilen Türkiye fiyat ve kredi politikası:

| Plan          | Mağaza hedef fiyatı |            Sunucu kredi hakkı |
| ------------- | ------------------: | ----------------------------: |
| Aylık Pro     |        ₺299,99 / ay |               Her ay 80 kredi |
| Yıllık Pro    |     ₺2.499,99 / yıl |     Her ay 80 kredi (960/yıl) |
| Ömür Boyu Pro | ₺4.999,99 tek ödeme | Bir kez 200 başlangıç kredisi |

Bu TL fiyatlarını App Store Connect, Google Play Console ve RevenueCat ürün eşlemesinde operatör ayarlar; uygulama kodu mağazanın döndürdüğü yerelleştirilmiş fiyatı gösterir. Ömür boyu ürün aylık kredi yenilemez ve sınırsız üretim vermez.

Ek kredi tüketilebilir ürünleri mağazalarda ayrıca oluşturulacaksa hedef set `20 / ₺99,99`, `60 / ₺249,99`, `150 / ₺499,99` şeklindedir. Krediler yalnız doğrulanmış mağaza işlemi veya webhook sonrası backend tarafından idempotent verilmelidir; mevcut mobil kartlardaki butonlar gerçek ürün eşlemesi tamamlanana kadar ödeme başlatmaz.

Bu offering'e bağlı bir Paywall oluşturup yayımlayın. **Pro teklifini aç**, exact entitlement için `presentPaywallIfNeeded` çağırır. Kartlardaki planlar ayrıca orijinal offering paketiyle `purchasePackage` kullanır; bunun için RevenueCat tasarımı bir Paywall şart değildir.

**Aboneliği yönet** için aynı projede Customer Center'ı yapılandırın. Bu kod, RevenueCat panelindeki ürün/offering/Paywall/Customer Center nesnelerini uzaktan oluşturmaz. Panel ayarları ayrıca doğrulanmalıdır.

## 4. Tam uygulama kodunun konumları

- `apps/mobile/config/revenuecat.cjs`: public anahtar seçimi, release koruması; `.d.cts`: TypeScript tipleri.
- `apps/mobile/src/features/billing/revenuecat-client.ts`: configure-once, hesap eşleştirme, login/logout, müşteri bilgileri, offering, satın alma, geri yükleme, Paywall, Customer Center ve hata yönetimi.
- `apps/mobile/src/features/billing/revenuecat.tsx`: kök bağlantı, native modülleri gerektiğinde yükleme, auth/foreground takibi, React hook'u ve sunucudan bakiye yenileme.
- `apps/mobile/src/features/billing/SubscriptionCard.tsx`: mevcut tema ile plan kartları, fiyat, aktif Pro, yenileme/bitiş, yönetim ve koşullar bağlantıları.
- `apps/mobile/app/_layout.tsx`: QueryClientProvider altında tek RevenueCatBootstrap.
- `apps/mobile/app/(tabs)/credits.tsx`: eski Pro uyarısının yerine SubscriptionCard.

Başka bir ekranda kullanım:

```tsx
import { useRevenueCat } from '@/features/billing/revenuecat';

const {
  isPro,
  customerInfo,
  entitlement,
  ready,
  busy,
  purchase,
  restore,
  presentPaywall,
  presentCustomerCenter,
  refresh,
} = useRevenueCat();

// isPro, customerInfo.entitlements.active[
//   'create_an_app_called_birkare_pro'
// ] üzerinden türetilir. UI durumudur; backend yetkilendirmesi değildir.
```

Ayrı bir kalıcı `isPro=true` değeri tutmayın. App User ID olarak mevcut, giriş yapılmış BirKare `user.id` kullanılır; e-posta kullanılmaz. Giriş yapmamış kullanıcı satın alamaz veya geri yükleyemez.

## 5. Hata, hesap ve abonelik yönetimi

Kullanıcının ödeme ekranını kapatması sessiz iptaldir. Bekleyen ödeme yeni Pro erişimi açmaz. Ağ ve yapılandırma hataları açıklama ve elle yeniden deneme sunar; otomatik tekrar satın alma yapılmaz. Satın alma, geri yükleme veya Paywall sonucu tek başına erişim kanıtı değildir: CustomerInfo içindeki **tam entitlement** kontrol edilir.

Hesap değiştiği anda eski müşteri ve offering ekrandan temizlenir. Native hesap ve ödeme işlemleri sırayla yürütülür. Eski hesaba ait geç gelen okuma/satın alma sonuçları yeni hesaba yazılmaz. SDK bir kez kurulur ve tek müşteri-bilgisi listener'ı kullanılır. Uygulama öne geldiğinde veya kredi ekranına dönüldüğünde durum yenilenir. Listener bir backend webhook yerine geçmez.

Restore/transfer davranışını RevenueCat panelinde hesap sahipliği politikanıza göre belirleyin. Aynı Apple/Google mağaza hesabını kullanan iki BirKare hesabını mutlaka test edin. BirKare hesabını silmek mağaza aboneliğini otomatik iptal etmez. Customer Center kapandıktan sonra müşteri bilgileri yeniden okunur.

## 6. Canlı anahtarlar ve backend doğrulaması

Mağaza derlemesinde gerçek platform **public SDK** anahtarları kullanılır:

```env
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_YOUR_IOS_PUBLIC_KEY
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_YOUR_ANDROID_PUBLIC_KEY
```

Mevcut public HTTPS API ve destek e-postası release kontrolleri devam eder. Bu koruma iki platform anahtarını da ister; `test_`, `sk_` veya yanlış platform anahtarıyla release oluşturulamaz. Apple/Google sandbox, RevenueCat Test Store'dan farklıdır: mağaza sandbox testlerinde platform public anahtarları kullanılır.

API/worker runtime ortamına, RevenueCat panelinden alınan **secret REST API key** ve panelde webhook Authorization alanına da yazacağınız en az 24 karakterlik rastgele token eklenir:

```env
REVENUECAT_ENABLED=true
REVENUECAT_SECRET_API_KEY=sk_YOUR_REVENUECAT_SECRET_KEY
REVENUECAT_WEBHOOK_AUTH_TOKEN=GENERATE_A_LONG_RANDOM_VALUE
REVENUECAT_WEBHOOK_SIGNING_SECRET=REVENUECAT_WEBHOOK_HMAC_SIGNING_SECRET
REVENUECAT_ENTITLEMENT_ID=create_an_app_called_birkare_pro
REVENUECAT_OFFERING_ID=birkare_pro
REVENUECAT_MONTHLY_PRODUCT_IDS=monthly,com.birkareai.pro.monthly
REVENUECAT_ANNUAL_PRODUCT_IDS=yearly,com.birkareai.pro.yearly
REVENUECAT_LIFETIME_PRODUCT_IDS=lifetime,com.birkareai.pro.lifetime
```

Webhook URL'i public API adresinizde `POST /v1/billing/revenuecat/webhook` olur. RevenueCat panelindeki Authorization header değeri `REVENUECAT_WEBHOOK_AUTH_TOKEN` ile aynı olmalıdır. Webhook ayarındaki HMAC imzalamayı açın ve oluşan signing secret'ı `REVENUECAT_WEBHOOK_SIGNING_SECRET` olarak yalnız backend ortamına koyun. Backend imzayı tam ham JSON gövdesi üzerinde doğrular, beş dakikadan eski imzayı reddeder ve aynı event kimliğinin farklı içerikle tekrar kullanılmasını engeller. Mobil kullanıcı kimliği e-posta değil BirKare `user.id` değeridir. Sunucu durum/senkronizasyon uçları sırasıyla `GET /v1/billing/revenuecat/status` ve `POST /v1/billing/revenuecat/sync`tir; ikisi mobil JWT ister ve zorunlu senkronizasyon kullanıcı bazında hız sınırlıdır.

## 7. Entegrasyonu tamamlamak için sağlanacak bilgiler

Değerleri sohbet mesajına yapıştırmayın. Public SDK anahtarlarını mobil environment'a; `.p8`, `sk_` ve webhook sırlarını parola yöneticisine veya sunucunun secret/environment alanına koyun.

### RevenueCat'ten

- Mevcut projenin **Project ID** değeri (`proj_...`); yalnız yönetim ve doğrulama için.
- iOS uygulamasının **Public SDK key** değeri (`appl_...`); mobil derlemeye girebilir.
- Backend için izinleri yalnız gerekli okuma kapsamıyla sınırlandırılmış **Secret API key** (`sk_...`); telefona ve Git'e giremez.
- Webhook ayarında seçtiğiniz en az 32 bayt rastgele **Authorization header** değeri.
- Webhook HMAC etkinleştirildikten sonra gösterilen **signing secret**.
- Dashboard ekranından app, entitlement, current offering ve package eşleşmelerinin görüntüsü veya kimlikleri: iOS app, `create_an_app_called_birkare_pro`, `birkare_pro`, `$rc_monthly`, `$rc_annual`, `$rc_lifetime`.

### App Store Connect'ten

- App'in sayısal **Apple ID** değeri ve Bundle ID doğrulaması: `com.birkareai.mobile`.
- **In-App Purchase Key** için ayrı `.p8` dosyası, Key ID ve Issuer ID. Bu dosya yalnız RevenueCat'e yüklenir; repo/backend/mobil uygulamaya konmaz.
- Ürün içe aktarmayı RevenueCat üzerinden yapmak istersen ayrıca **App Store Connect API key** `.p8`, Key ID, Issuer ID ve Vendor Number. Bu anahtar In-App Purchase Key ile aynı dosya değildir.
- App Store Connect'te ürünlerin durumu ve tam kimlikleri: `com.birkareai.pro.monthly`, `com.birkareai.pro.yearly`, `com.birkareai.pro.lifetime`.
- Paid Apps Agreement, vergi ve banka bilgilerinin tamamlandığına dair durum.

### Canlı backend adresi belli olunca

- Dışarıdan erişilebilir HTTPS API kökü; webhook tam adresi bunun sonuna `/v1/billing/revenuecat/webhook` eklenerek oluşturulur.
- Webhook'un sandbox, production veya ikisini birden kabul edeceği kararı. İlk doğrulamada ayrı sandbox webhook'u önerilir.

Bu bilgiler tamamlanmadan iOS public anahtarıyla ürünleri listelemek mümkün olabilir; ancak satın alma doğrulaması, entitlement senkronizasyonu ve güvenli kredi verme hattı canlıya hazır sayılmaz.

## 8. Testler

Aylık, yıllık ve ömür boyu kredi tutarları environment ile değiştirilebilir. Kredi anahtarı kullanıcı + plan + ürün + dönem bileşimidir; aynı webhook, tekrar açılış veya restore ikinci kez kredi vermez ve başka kullanıcının hakkını engellemez.

Controller testleri: exact entitlement, tek kurulum, desteklenmeyen ortam, hesap değiştirme, geç dönen yanıt/satın alma, çıkış, çift tıklama, paket doğrulama, iptal, bekleyen ödeme, ağ hatası, geri yükleme, offering hatası, Paywall sonuçları, Customer Center dönüşü, listener güvenliği ve süre bitimi.

Config testleri: development varsayılanları, platform anahtar ayrımı, release bayrakları, test ve secret anahtarının reddedilmesi.

Backend testleri: exact entitlement ve ürün-plan eşlemesi, aktif/süresi dolmuş abonelik, aylık/yıllık/ömür boyu idempotent kredi, webhook Authorization doğrulaması ve olay tekrarının engellenmesi.

Cihazda ayrıca her üç Test Store paketi, ödeme iptali, restore, Customer Center, arka plan/ön plan, yeniden açma, hesap değiştirme, ağ kesintisi ve entitlement bitimini test edin. Sonra gerçek Apple/Google sandbox testlerini yapın. CI tip/birim testleri ve native proje üretimi, imzalı cihaz derlemesi veya gerçek satın alma testiyle aynı değildir.

Release öncesi RevenueCat Test Store, Apple sandbox ve Google Play test track ayrı ayrı doğrulanmalıdır. Test Store anahtarıyla oluşturulan bir native development build, App Store/Play Store canlı ödeme doğrulamasının yerine geçmez.

## Resmî kaynaklar

Android Play Console, service-account, ürün/base-plan, RTDN ve kapalı test
adımları ayrıca `docs/GOOGLE_PLAY_REVENUECAT_SETUP.md` içinde tutulur.

- https://www.revenuecat.com/docs/getting-started/installation/reactnative
- https://www.revenuecat.com/docs/getting-started/installation/expo
- https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store
- https://www.revenuecat.com/docs/customers/identifying-customers
- https://www.revenuecat.com/docs/customers/customer-info
- https://www.revenuecat.com/docs/offerings/overview
- https://www.revenuecat.com/docs/tools/paywalls/displaying-paywalls
- https://www.revenuecat.com/docs/tools/customer-center/customer-center-react-native
