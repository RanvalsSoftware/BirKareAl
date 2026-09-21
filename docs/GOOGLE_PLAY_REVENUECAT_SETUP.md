# BirKare AI — Google Play + RevenueCat kurulum rehberi

## Hazır olan uygulama tarafı

- Android paket adı: `com.birkareai.mobile`
- RevenueCat entitlement: `create_an_app_called_birkare_pro`
- RevenueCat offering: `birkare_pro`
- `react-native-purchases` ve `react-native-purchases-ui`: `10.9.1`
- Android Billing izni Expo yapılandırmasında mevcut.
- Mobil uygulama yalnız `goog_` ile başlayan Android public SDK key kabul eder.
- Staging/production derlemesi `test_` veya `sk_` anahtarıyla alınamaz.
- Backend App Store ve Google Play'i aynı RevenueCat proje secret'ı, webhook'u
  ve BirKare kullanıcı kimliği üzerinden doğrular.

## 1. İlk imzalı AAB'yi Play Console'a yükle

Play Console'da paket adı tam olarak `com.birkareai.mobile` olmalıdır. Ürün
menüleri açılmıyorsa önce imzalı AAB'yi **Test > Kapalı test** kanalına yükleyip
taslak sürümü kaydet. Staging profili AAB üretir:

```bash
cd apps/mobile
eas build --platform android --profile staging
```

`EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` tanımlanmadan store build güvenli
biçimde durur. İlk Play yüklemesinde kullanılan upload key bundan sonraki bütün
sürümlerde korunmalıdır. Her yeni yüklemede Android `versionCode` artırılmalıdır.

## 2. Play Console ürünlerini oluştur

### Abonelikler

Play Console > Para kazanma > Ürünler > Abonelikler altında iki ayrı abonelik
oluştur. Bu ayrım mevcut iOS kimlikleri ve backend plan politikasıyla birebir
eşleşir.

| Plan | Subscription ID | Base plan ID | Tür | Hedef fiyat |
| --- | --- | --- | --- | ---: |
| Aylık Pro | `com.birkareai.pro.monthly` | `monthly-autorenewing` | Otomatik yenilenen, 1 ay | ₺299,99 |
| Yıllık Pro | `com.birkareai.pro.yearly` | `yearly-autorenewing` | Otomatik yenilenen, 1 yıl | ₺2.499,99 |

Her base plan için Türkiye fiyatını, satış bölgelerini ve vergi ayarlarını
tamamlayıp base planı **Etkin** yap. İlk doğrulamada deneme/intro offer eklememek
hata ayıklamayı kolaylaştırır; temel satın alma geçtikten sonra offer eklenebilir.

RevenueCat bu yeni Google ürünlerini aşağıdaki tam kimliklerle görür:

```text
com.birkareai.pro.monthly:monthly-autorenewing
com.birkareai.pro.yearly:yearly-autorenewing
```

### Tek seferlik ürünler

Play Console > Para kazanma > Ürünler > Uygulama içi ürünler bölümünde:

| Ürün | Product ID | RevenueCat davranışı | Hedef fiyat |
| --- | --- | --- | ---: |
| Ömür Boyu Pro | `com.birkareai.pro.lifetime` | Non-consumable | ₺4.999,99 |
| 20 kredi | `com.birkareai.credits.20` | Consumable | ₺99,99 |
| 60 kredi | `com.birkareai.credits.60` | Consumable | ₺249,99 |
| 150 kredi | `com.birkareai.credits.150` | Consumable | ₺499,99 |

Ömür boyu ürün RevenueCat'te mutlaka **non-consumable** olarak işaretlenmelidir;
aksi halde Google tekrar satın almaya izin verir. Kredi paketleri consumable
kalmalıdır. Backend her mağaza transaction kimliğini idempotent işler; aynı
satın alma ikinci kez kredi vermez.

## 3. Google Cloud service account oluştur

RevenueCat'in Google satın almalarını doğrulaması için uygulamayla ilişkili
Google Cloud projesinde şunları etkinleştir:

1. Google Play Android Developer API
2. Google Play Developer Reporting API
3. Cloud Pub/Sub API

`revenuecat-service-account` adlı service account oluştur. Cloud IAM tarafında:

- Pub/Sub Editor
- Monitoring Viewer

rollerini ver. Service account için JSON key üret. Bu JSON dosyasını Git'e,
mobil `.env` dosyasına, backend image'ına veya sohbete koyma.

## 4. Service account'u Play Console'a davet et

Play Console > Kullanıcılar ve izinler > Yeni kullanıcı davet et bölümünde JSON
içindeki `client_email` adresini ekle ve yalnız BirKare uygulamasına erişim ver.
RevenueCat'in güncel gereksinimlerine göre şu izinleri aç:

- Uygulama bilgilerini görüntüleme ve toplu rapor indirme
- Finansal verileri, siparişleri ve iptal yanıtlarını görüntüleme
- Siparişleri ve abonelikleri yönetme
- Mağaza varlığını yönetme

Son izin RevenueCat Product Editor kullanılmayacaksa geniş görünebilir; ancak
RevenueCat'in resmi credential doğrulaması bunu bekler. Organizasyon politikanız
daha dar yetki gerektiriyorsa Product Editor kullanmadan önce ayrı doğrulama
yapılmalıdır.

## 5. RevenueCat'e Android uygulamasını bağla

Mevcut BirKare RevenueCat projesinde ikinci proje açma. Project Settings > Apps
altında Google Play uygulaması ekle:

```text
Package name: com.birkareai.mobile
```

Service Account Credentials JSON alanına Google Cloud'dan indirilen JSON'u
doğrudan yükle. RevenueCat credential doğrulamasının etkinleşmesi 36 saate kadar
sürebilir.

RevenueCat Project Settings > API Keys içindeki Android public SDK key'i kopyala:

```env
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_...
```

Bu public anahtar EAS `preview`/`production` environment'ına eklenebilir. JSON
service-account key ve backend `sk_` secret mobil uygulamaya konamaz.

## 6. Ürünleri RevenueCat'e aktar ve bağla

RevenueCat > Product catalog > Products > Import Products ile Google Play
ürünlerini aktar. Ardından:

- Aylık ve yıllık Google ürünlerini
  `create_an_app_called_birkare_pro` entitlement'ına bağla.
- `com.birkareai.pro.lifetime` ürününü aynı entitlement'a bağla ve
  non-consumable olarak işaretle.
- Kredi ürünlerini Pro entitlement'a bağlama; bunlar backend tarafından adet
  bazında krediye çevrilir.
- `birkare_pro` offering içinde Android ürünlerini mevcut paketlere ekle:
  - aylık → `$rc_monthly`
  - yıllık → `$rc_annual`
  - ömür boyu → `$rc_lifetime`
- `birkare_pro` offering'ini current yap.
- Paywall ve Customer Center'ın aynı entitlement/offering'i kullandığını kontrol et.

## 7. Google Real-Time Developer Notifications

RevenueCat > Google Play App Settings altında **Connect to Google** ile bir
Pub/Sub topic oluştur veya seç. Üretilen topic adını Play Console > Para kazanma
kurulumu > Real-time developer notifications alanına yapıştır.

Notification content olarak **Subscriptions, voided purchases, and all
one-time products** seç. Test notification gönder ve RevenueCat'te `Last
received` zamanının güncellendiğini doğrula. Gerekirse şu Google sistem hesabına
topic üzerinde Pub/Sub Publisher rolü ver:

```text
google-play-developer-notifications@system.gserviceaccount.com
```

## 8. Backend ve webhook

iOS ve Android aynı RevenueCat projesindeyse ayrı backend secret gerekmez:

```env
REVENUECAT_ENABLED=true
REVENUECAT_SECRET_API_KEY=sk_...
REVENUECAT_WEBHOOK_AUTH_TOKEN=uzun-rastgele-deger
REVENUECAT_WEBHOOK_SIGNING_SECRET=uzun-hmac-secret
REVENUECAT_ENTITLEMENT_ID=create_an_app_called_birkare_pro
REVENUECAT_OFFERING_ID=birkare_pro
REVENUECAT_MONTHLY_PRODUCT_IDS=monthly,com.birkareai.pro.monthly
REVENUECAT_ANNUAL_PRODUCT_IDS=yearly,com.birkareai.pro.yearly
REVENUECAT_LIFETIME_PRODUCT_IDS=lifetime,com.birkareai.pro.lifetime
```

Backend Google'ın `subscription-id:base-plan-id` biçimini güvenli biçimde
subscription kimliğine indirger. Webhook URL:

```text
POST https://birkare-api.ranvals.com/v1/billing/revenuecat/webhook
```

Authorization ve HMAC değerleri yalnız backend/RevenueCat secret alanlarında
kalmalıdır.

## 9. Kapalı test ve sandbox satın alma

1. Play Console > Ayarlar > Lisans testi bölümüne test Gmail hesabını ekle.
2. Aynı hesabı Kapalı test tester listesine de ekle.
3. Test cihazında mümkünse yalnız bu Google hesabıyla Play Store'a giriş yap.
4. Kapalı test opt-in bağlantısını cihazda açıp **Test kullanıcısı ol** işlemini
   tamamla.
5. Test kanalına en az Türkiye bölgesini ekle ve sürümü yayınla.
6. Uygulamayı doğrudan Play Store test bağlantısından yükle.
7. Aylık, yıllık, lifetime ve üç kredi paketini ayrı ayrı dene.
8. Google ödeme penceresinde **Test card** yazdığını doğrula; gerçek kart
   istenirse test hesabı/opt-in/lisans adımlarından biri eksiktir.
9. Satın alma sonrasında RevenueCat'te Sandbox Data görünümünde işlemi, BirKare
   API'de entitlement/kredi durumunu ve hesap hareketlerindeki tek kaydı kontrol et.
10. Restore, iptal, yenileme, grace period, ödeme reddi ve hesap değiştirme
    senaryolarını ayrıca test et.

## Kullanıcıdan gerekenler

Secret değerleri sohbete göndermeden aşağıdaki panel alanlarını tamamlamak yeterlidir:

- RevenueCat Android public SDK key (`goog_...`) → EAS environment
- Google service account JSON → doğrudan RevenueCat Android app settings
- Play Console license tester Gmail adresi
- Kapalı test opt-in bağlantısı
- RevenueCat credential ekranında bütün kontrollerin yeşil olduğuna dair durum
- RTDN `Last received` zamanının güncellendiğine dair durum

## Resmî kaynaklar

- https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials
- https://www.revenuecat.com/docs/getting-started/entitlements/android-products
- https://www.revenuecat.com/docs/platform-resources/server-notifications/google-server-notifications
- https://www.revenuecat.com/docs/test-and-launch/sandbox/google-play-store
- https://support.google.com/googleplay/android-developer/answer/140504
- https://support.google.com/googleplay/android-developer/answer/6062777
