# BirKare AI — RevenueCat entegrasyonu

## Kapsam ve canlıya geçiş sınırı

Bu değişiklik **mobil SDK entegrasyonudur**: mevcut BirKare hesap girişi ve **Krediler > BirKare Pro** kartı; RevenueCat satın alma, müşteri bilgileri, entitlement kontrolü, geri yükleme, Paywall ve Customer Center ile bağlanır. `react-native-purchases` ve `react-native-purchases-ui` birlikte **10.9.1** sürümüne sabitlenmiştir.

Tam entitlement kimliği:

```text
create_an_app_called_birkare_pro
```

Kullanıcının verdiği public `test_` SDK anahtarı yalnızca development ortamının varsayılanıdır. Gizli bir sunucu anahtarı değildir. Production/staging ve mevcut release bayrakları test anahtarını reddeder.

**Bu PR tamamlanmış backend ödeme/kredi ekonomisi değildir.** Telefonda kredi eklenmez; mevcut API/worker kredi ayırma, harcama ve iade akışı değiştirilmez. Webhook, yenileme başına kredi, yıllık/ömür boyu kredi takvimi ve sunucuda Pro yetkilendirmesi bu aşamada eklenmemiştir. Backend'in mevcut premium güzellik koruması bir istemci `isPro` değeriyle atlatılmaz. Mevcut tek seferlik kredi paketi düğmeleri ve örnek hesap hareketleri bu değişikliğin dışındadır.

**Gerçek ücretli ürünleri henüz yayına açmayın.** Önce sunucuda doğrulanmış Pro erişimiyle gerçek özellikler açılmalı, kredi hakları ve yenileme kuralları netleşmelidir. Ömür boyu plan sınırsız AI üretimi anlamına gelmez. Eski kartın “aylık 80 kredi, öncelikli sıra” vaadi kaldırılmıştır; bu yararlar SDK bağlantısıyla kendiliğinden gerçekleşmez.

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

| Product ID | Ürün türü | Offering paket türü |
| --- | --- | --- |
| `monthly` | Otomatik yenilenen aylık abonelik | Monthly / `$rc_monthly` |
| `yearly` | Otomatik yenilenen yıllık abonelik | Annual / `$rc_annual` |
| `lifetime` | Tek ödemeli, tüketilmeyen ürün | Lifetime / `$rc_lifetime` |

Üç ürünü de `create_an_app_called_birkare_pro` entitlement'ına bağlayın. Bir offering oluşturun veya mevcut olanı kullanın (örneğin `default`); üç paket türünü ekleyip geçerli/current offering olarak belirleyin. Uygulama `getOfferings().current` içindeki `monthly`, `annual`, `lifetime` alanlarını kullanır. Ürün kimliği `yearly` ile RevenueCat paket kimliği `$rc_annual` aynı kavram değildir. Gerçek Android mağazası ve base plan kimlikleri farklı olabilir.

Fiyatlar `product.priceString` üzerinden yerelleştirilmiş mağaza fiyatlarıdır; telefonda sabit TL fiyatı veya sahte indirim hesaplanmaz.

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
  isPro, customerInfo, entitlement, ready, busy,
  purchase, restore, presentPaywall, presentCustomerCenter, refresh,
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

## 6. Canlı anahtarlar ve kalan backend işleri

Mağaza derlemesinde gerçek platform **public SDK** anahtarları kullanılır:

```env
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_YOUR_IOS_PUBLIC_KEY
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_YOUR_ANDROID_PUBLIC_KEY
```

Mevcut public HTTPS API ve destek e-postası release kontrolleri devam eder. Bu koruma iki platform anahtarını da ister; `test_`, `sk_` veya yanlış platform anahtarıyla release oluşturulamaz. Apple/Google sandbox, RevenueCat Test Store'dan farklıdır: mağaza sandbox testlerinde platform public anahtarları kullanılır.

Gerçek ödemeden önce: mağaza ürünlerini bağlama; premium API işlemlerinde sunucuda entitlement doğrulama; webhook kimlik doğrulama ve kalıcı olay kaydı; aynı işlem/yenilemede yalnız bir kez kredi; sandbox/canlı ayrımı; iptal-bitiş ayrımı; iade, transfer, yıllık ve ömür boyu kredi kuralları. Secret API ve webhook anahtarları yalnızca sunucu ortamına eklenir; mobil, sohbet veya Git'e konulmaz.

## 7. Testler

Controller testleri: exact entitlement, tek kurulum, desteklenmeyen ortam, hesap değiştirme, geç dönen yanıt/satın alma, çıkış, çift tıklama, paket doğrulama, iptal, bekleyen ödeme, ağ hatası, geri yükleme, offering hatası, Paywall sonuçları, Customer Center dönüşü, listener güvenliği ve süre bitimi.

Config testleri: development varsayılanları, platform anahtar ayrımı, release bayrakları, test ve secret anahtarının reddedilmesi.

Cihazda ayrıca her üç Test Store paketi, ödeme iptali, restore, Customer Center, arka plan/ön plan, yeniden açma, hesap değiştirme, ağ kesintisi ve entitlement bitimini test edin. Sonra gerçek Apple/Google sandbox testlerini yapın. CI tip/birim testleri ve native proje üretimi, imzalı cihaz derlemesi veya gerçek satın alma testiyle aynı değildir.

İlk kaynak kontrolünde RevenueCat değişikliklerinden önce mevcut API typecheck'i `apps/api/src/modules/support/support.routes.test.ts:138` içindeki `PASSWORD_RESET` / `EmailTokenType` uyumsuzluğunda durdu. Bu mobil PR, ilgisiz backend testi hatasını değiştirmez; bütün monorepo testlerinin geçtiği iddia edilmemelidir.

## Resmî kaynaklar

- https://www.revenuecat.com/docs/getting-started/installation/reactnative
- https://www.revenuecat.com/docs/getting-started/installation/expo
- https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store
- https://www.revenuecat.com/docs/customers/identifying-customers
- https://www.revenuecat.com/docs/customers/customer-info
- https://www.revenuecat.com/docs/offerings/overview
- https://www.revenuecat.com/docs/tools/paywalls/displaying-paywalls
- https://www.revenuecat.com/docs/tools/customer-center/customer-center-react-native
