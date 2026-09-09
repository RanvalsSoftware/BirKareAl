# BirKare AI — App Store ve Google Play yayın yol haritası

Son kontrol: **8 Eylül 2026**. Bu dosya yayın hazırlığıdır; uygulama mağazalara gönderilmedi. Köşeli parantezli alanlar işletme sahibi tarafından doldurulmalıdır. Konsol sorularında gerçek çalışan sürüm ve gerçek veri işleme uygulamaları esas alınır; aşağıdaki öneriler otomatik hukuki uygunluk beyanı değildir.

Play Console'un ilk formu, paket/imza ayrımı ve kontrollü AAB yüklemesi için [Google Play AAB rehberini](google-play-aab-release.md) kullan. Bu belge form beyanlarını otomatik onaylama veya uygulamayı yayınlama talimatı değildir.

## 1. Önce yayın kapıları

Bu depoda bulunan yapı: Expo 57 / React Native, `com.birkareai.mobile` iOS Bundle ID ve Android package, `birkareai` deep-link scheme, `0.1.0` sürümü. EAS projesi `1a82d36d-7d54-46ef-b63b-919e195e832d`. Yapılandırma: `apps/mobile/app.config.ts`, `apps/mobile/eas.json`.

- [ ] Test backend’i [backend yol haritasına](backend-staging-roadmap.md) göre ayağa kaldır; fiziksel cihazdan HTTPS ile eriş.
- [ ] Gerçek e-posta teslimatını tamamla. Mevcut `AuthService` doğrulama/sıfırlama tokenı oluşturuyor; üretim e-posta gönderimi henüz bağlı değil. `AUTH_DEV_MODE=true` yaparak mağaza sorununu geçiştirme.
- [ ] Google girişini iOS release ve Google Play üzerinden yüklenen Android build ile doğrula; [Google kurulum notlarını](google-cloud-auth-setup.md) uygula.
- [ ] iOS üçüncü taraf girişine karşılık gereken eşdeğer giriş seçeneğini gerçek hesapla test et. `expo-apple-authentication` bağımlılığı veya capability tek başına çalışan Apple girişi kanıtı değildir.
- [ ] Gerçek AI sağlayıcısıyla en az bir izinli kaynak fotoğraf için yükleme → üretim → moderasyon → sonuç → Projeler → paylaşım zincirini tamamla. Sahte sağlayıcı çıktısını gerçek AI sonucu gibi tanıtma.
- [ ] Sonuç ekranındaki **Raporla** formunu gerçek sunucu kaydı ve inceleme sürecine bağla. Mevcut yerel “rapor talebi hazır” mesajı gönderim değildir. Google, üretken AI uygulamalarında kullanıcı uygulamadan çıkmadan raporlama ister. [Google AI içerik politikası](https://support.google.com/googleplay/android-developer/answer/13985936?hl=en-GB)
- [ ] Kredi/PRO satılacaksa StoreKit/Play Billing, sunucuda makbuz doğrulama, yinelenen bildirim koruması, iade/iptal ve satın alımları geri yükleme tamamlanmalı. `billing.routes.ts` içindeki ürün listesi gerçek ödeme entegrasyonu değildir. Entegrasyon yoksa satın alma ve abonelik iddialarını yayın sürümünde kapat; hayali fiyat/avantaj gösterme. Dijital işlevlerin ücretlendirilmesini mağaza kurallarına göre yapılandır. [Apple inceleme kuralları](https://developer.apple.com/app-store/review/guidelines/)
- [ ] Hesap silmeyi hem şifreli hem sosyal hesapta test et. Veriler, depolama dosyaları ve oturumlar için temizliğin gerçekten bittiğini doğrula; tutulması gerekli sınırlı kayıtları ve süreleri politikada açıkla.
- [ ] `https://[alan-adı]/privacy`, `/terms`, `/support`, `/delete-account` adreslerini gerçek ve mobil uyumlu yayınla. Mevcut uygulama içi yasal taslaklar tek başına yeterli değildir.
- [ ] Play için uygulama dışında hesap/veri silme talebi verebilen çalışan sayfa hazırla; yalnız giriş ekranına yönlendiren veya “uygulamayı yeniden yükle” diyen sayfa kullanma. [Google hesap silme gereklilikleri](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en-EN)
- [ ] Referans/mağaza görsellerinde gerçek ünlü yüzleri, takım/turnuva logoları ve üçüncü taraf markalar için hak kontrolü yap. `stadium.png` gibi örneklerde marka benzeri öğeler bulunabilir. “AI ile üretildi” demek kullanım hakkı sağlamaz.

## 2. Konsollardan önce hazırlanacak bilgiler

| Alan                          | Bu proje için hazırlanacak değer                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Satıcı/geliştirici            | `[Resmî kişi veya şirket adı]`; doğrulama belgeleriyle aynı                                                                  |
| Destek e-postası              | `birkareal@ranvals.com` — kullanıcı tarafından sağlandı; posta kutusu sahipliği ve gerçek teslimat henüz doğrulanmadı       |
| Gizlilik ve kullanım şartları | Sahip olunan alanda HTTPS, giriş zorunluluğu olmadan okunabilir                                                              |
| Silme talebi URL              | Gerçek kimlik doğrulama ve talep takibi bulunan `/delete-account`                                                            |
| İnceleme hesabı               | `[review e-posta]` / `[incelemeye özel parola]`; gerçek kişisel hesabı kullanma                                              |
| İnceleme kredisi              | Tüm temel akışları birkaç kez test ettirecek kadar; güvenli test hesabına ver                                                |
| Vergi/banka                   | Ücretli dijital ürün varsa resmî hesap bilgileri ve gerekli sözleşmeler                                                      |
| Bölge                         | İlk yayın için Türkiye önerisi; başka ülkeler eklenirse dil, destek, gizlilik ve tüketici gerekliliklerini ayrıca kontrol et |

Parolaları, Apple `.p8` anahtarlarını, Android service-account JSON dosyasını, keystore’u veya backend sırlarını bu MD’ye ya da Git’e ekleme.

Mobil destek alanı `EXPO_PUBLIC_SUPPORT_EMAIL` değerini kullanır; örnek yapılandırmalarda adres `birkareal@ranvals.com` olarak güncellendi. Destek formu, kullanıcının kendi e-posta uygulamasında taslak açar; otomatik mesaj göndermez ve teslimat teyidi değildir. Bu iletişim adresi, backend doğrulama/sıfırlama e-postalarının SMTP entegrasyonunu tamamlamaz. Yayın öncesi posta kutusuna gelen/giden mesajları ayrıca test et.

## 3. Kopyalanabilir Türkçe mağaza metinleri

Aşağıdaki metinler **özelliklerin release build’de çalıştığı doğrulandıktan sonra** kullanılmalıdır. PRO satışı hazır değilse fiyat, abonelik veya PRO avantajı ekleme. Kullanıcıya “kusursuz yüz”, kesin yaş azaltma, tıbbi tedavi veya garantili benzerlik vaat edilmez.

### Uygulama adı — iki mağaza

```text
BirKare AI: Fotoğraf Stüdyosu
```

### App Store alt başlık

```text
AI portre, sahne ve güzellik
```

App Store ad ve alt başlık alanı en fazla 30 karakterdir. [Apple uygulama bilgileri](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information)

### App Store tanıtım metni

```text
Fotoğrafına yeni bir sahne, ışık ve stil kat. Güzellik dokunuşlarının yoğunluğunu ayarla; oluşturduğun kareleri kaydet ve paylaş.
```

### App Store anahtar kelimeler

```text
yapay zeka,resim,düzenleme,güzellik,makyaj,arka plan,ışık,portre,filtre,görsel
```

### Google Play kısa açıklama

```text
Fotoğrafını AI sahneler, güzellik dokunuşları ve filtrelerle yeniden yorumla.
```

Play kısa açıklaması 80, tam açıklaması 4.000 karakteri aşmamalı. Gereksiz anahtar kelime tekrarı ve “en iyi/#1” gibi doğrulanmamış üstünlük iddiaları ekleme. [Google mağaza metni rehberi](https://support.google.com/googleplay/android-developer/answer/13393723?hl=en-EN)

### İki mağaza için tam açıklama

```text
Fotoğrafınla yeni bir hikâye anlat.

BirKare AI, fotoğraflarını yapay zekâ destekli sahneler, portreler, güzellik dokunuşları ve yaratıcı filtrelerle yeniden yorumlamana yardımcı olan bir fotoğraf stüdyosudur.

SAHNENİ KEŞFET
Gece stadyumundan sahil gününe, şehir ışıklarından neon geleceğe farklı atmosferler dene. Sahne kartları, oluşturmak istediğin ortam için görsel ilham sunar.

GÜZELLİK STÜDYOSU
Doğal görünüm, cilt rötuşu, göz altı ve makyaj seçeneklerini keşfet. Dokunuşların yoğunluğunu ayarla. Doğal cilt dokusunu ve ayırt edici yüz ayrıntılarını korumaya öncelik veren seçimlerle kendi tarzını bul. Bu araçlar tıbbi veya kozmetik tedavi değildir.

FİLTRELER VE AI ARAÇLARI
Portrelerini farklı görsel stillerle yeniden yorumla. Arka planı değiştir, ışığı düzenle veya fotoğrafın çevresini AI ile genişlet. Oluşturmadan önce seçimini, kare oranını ve gösterilen kredi maliyetini kontrol et.

KURGUSAL KARELER
Hayal ürünü karakterlerle yaratıcı sahneler tasarla. Kurgusal içerikler gerçek bir buluşmayı, ünlü onayını, sponsorluk ilişkisini veya yaşanmış bir olayı temsil etmez.

KAYDET VE PAYLAŞ
Tamamlanan görsellerine hesabındaki Projeler alanından geri dön. Seçtiğin sonucu cihazına kaydet veya telefonunun paylaşım menüsüyle Instagram, X, Facebook ve uyumlu diğer uygulamalara aktar. Paylaşım seçenekleri cihazına ve yüklü uygulamalarına göre değişebilir.

NASIL ÇALIŞIR?
1. Kendi fotoğrafını çek veya kullanma iznine sahip olduğun bir görsel seç.
2. Sahne, filtre, güzellik dokunuşu ya da AI aracını belirle.
3. Yoğunluğu, görsel ayarlarını ve kredi maliyetini gözden geçir.
4. Üretimi başlat, sonucu incele ve dilediğin kareyi paylaş.

BİLMEN GEREKENLER
AI üretimi için internet bağlantısı ve hesap gerekir. Üretimler kredi kullanabilir; gereken tutar işlem öncesinde gösterilir. Sonuçlar kaynak fotoğrafa ve seçilen ayarlara göre değişir. Önizlemeler ve örnek görseller sonuç garantisi değildir. Yüz benzerliği ve ayrıntılar her üretimde farklılaşabilir.

Yalnızca kendine ait veya gerekli izinlere sahip olduğun içerikleri kullan. AI görsellerini gerçek bir olayın kanıtı olarak sunma ve paylaşımda AI ile oluşturulduğunu belirt. BirKare AI 18 yaş ve üzeri kullanıcılar için tasarlanmıştır.
```

### Sürüm notu

```text
Güzellik Stüdyosu, ayarlanabilir dokunuş yoğunluğu ve yenilenen sahne seçenekleriyle karelerini kişiselleştir. Oluşturduğun görselleri kaydet ve telefonunun paylaşım menüsüyle paylaş.
```

### İngilizce inceleme notu — gerçek bilgilerle tamamla

```text
BirKare AI is an AI-assisted photo editing app for adults. Users upload their own or authorized photos and choose scenes, visual styles or beauty adjustments. AI results are illustrative and are not evidence of real events or endorsements.

Review login: [REVIEW_EMAIL]
Password: [REVIEW_PASSWORD]
The account is verified and has sufficient credits to test generation.

Test steps: Sign in → select a photo → choose a scene/filter/beauty effect → review the settings and credit quote → generate → open Results → save or open the native share sheet. Generated images are also available under Projects.

Account deletion: Profile → Settings → Delete account. Use the dedicated deletion-test account provided below if testing this irreversible action: [DELETION_TEST_ACCOUNT].

AI content reporting: [EXACT WORKING PATH AFTER BACKEND INTEGRATION].
Purchases: [EXPLAIN ONLY THE IMPLEMENTED STORE BILLING FLOW, OR STATE THAT PURCHASES ARE NOT OFFERED IN THIS BUILD].
Support contact: [WORKING SUPPORT EMAIL].
```

Bu notu köşeli parantezler dururken göndermeyin; incelemeyi tamamlamak için gizli yönetici kapısı, cihaz bağımlı OTP veya kişisel Google hesabı gerektirmeyin.

## 4. Görsel paketi

- App Store için 1–10 gerçek ekran görüntüsü. Önerilen iPhone tuvali: desteklenen 6.9 inç setinden `1320 × 2868`; alfa kanalını kaldır. iPad desteği `supportsTablet: true`, bu yüzden iPad’i gerçekten test et ve ilgili seti hazırla; yalnız telefon tasarımı hazırsa tablet desteği kararını ayrıca ver. Güncel boyutları yükleme anında kontrol et. [Apple ekran görüntüsü ölçüleri](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
- Play ikon: `512 × 512` PNG, en fazla 1 MB. Feature graphic: `1024 × 500`. En az iki ekran görüntüsü; başlangıç için 6 telefon ekranı önerilir. Aynı cihaz çerçevesi ve okunur Türkçe başlıklar kullan. [Google önizleme varlıkları](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en)
- Sıra/başlık önerileri: “Hayalindeki kareye adım at” → “Sahneni seç” → “Güzellik dokunuşu sana ait” → “Yoğunluğu ayarla” → “Karelerini bir arada tut” → “Kaydet, paylaş, ilham ver”. Görüntü gerçek uygulama ekranı olmalı; çalışmayan bir bileşeni reklam görseliyle varmış gibi gösterme.
- Örnek AI üretimlerini açıkça etiketle. Play’de varlık yükleme akışında AI beyanı gösteriliyorsa AI ile üretilmiş ilgili görseller için doğru beyanı seç. [Google AI varlık beyanı](https://support.google.com/googleplay/android-developer/answer/17262077?hl=en)

## 5. App Store Connect — ne seçilecek?

1. Apple Developer üyeliğini, kişi/kuruluş doğrulamasını, sözleşmeleri ve gerekli vergi/banka alanlarını tamamla.
2. Certificates, Identifiers & Profiles’ta `com.birkareai.mobile` App ID’yi kullan. Sign in with Apple capability ve EAS signing profilinin aynı kimliğe ait olduğunu doğrula.
3. App Store Connect → Apps → `+` → New App: **iOS**, **Türkçe**, yukarıdaki ad, bu Bundle ID; iç SKU önerisi `birkare-ai-ios`. SKU kullanıcıya görünmez.
4. App Information: birincil kategori **Photo & Video**, gerekirse ikincil **Graphics & Design**. Çocuk uygulaması olarak işaretleme. Yaş anketini gerçek içerik ve kontrol mekanizmalarıyla doldur; “18+ hedefliyoruz” ifadesi anket cevabı yerine geçmez.
5. App Privacy: aşağıdaki veri envanterini ve sağlayıcıların uygulamalarını doğrulayarak yanıtla. Gizlilik URL’sini ekle. **Data Not Collected** seçme; uygulama hesap ve fotoğraf işliyor. [Apple App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)
6. Pricing and Availability: uygulama indirmesi ücretsiz olacaksa **Free**; bu, uygulama içi dijital ürünlerin bedelsiz olduğu anlamına gelmez. İlk ülke seçimini işletme sahibi onaylasın. Gereksiz platform dağıtımlarını açma.
7. Sürüm alanları: metinler, ekran görüntüleri, destek URL, `[Yıl Resmî hak sahibi]` copyright, review notları. Reklam tanımlayıcısı veya şifreleme sorularını bağımlılık/ağ denetimine göre yanıtla; otomatik “No” verme.
8. Xcode **26+** ve iOS **26+ SDK** ile üretilmiş gerçek store build kullan. Bu asgari şart 28 Nisan 2026’dan beri geçerli; minimum desteklenen iOS sürümüyle karıştırma. [Apple güncel SDK koşulu](https://developer.apple.com/news/upcoming-requirements/?id=02032026a)
9. Önce TestFlight internal, sonra gerekiyorsa external beta incelemesi. Kararlı build’i sürüme bağla → Add for Review → Submit to App Review. İlk yayın için **manuel yayınlama** önerilir; operatör backend ve destek hazırlığını son kez kontrol edebilsin.

Uygulama içi hesap silme kolay bulunmalı ve yalnız devre dışı bırakmamalıdır; gecikmeli temizlik süreci açık anlatılmalıdır. [Apple hesap silme rehberi](https://developer.apple.com/support/offering-account-deletion-in-your-app)

## 6. Google Play Console — ne seçilecek?

1. Geliştirici hesabını gerçek kişi/kuruluş türüyle doğrula. Create app: varsayılan dil **Türkçe (Türkiye)**, tür **App**, indirme fiyatı **Free** önerisi. Politika, ihracat ve imzalama beyanlarını yetkili kişi gerçek uygulama durumuyla değerlendirmeden işaretleme; yukarıdaki açık yayın engellerini önce çöz.
2. Store settings: kategori **Photography**, gerçek işlevi anlatan uygun etiketler; yukarıdaki destek bilgileri.
3. Main store listing: ad/kısa/tam açıklama ve görsel paketi; AI varlık beyanlarını doğru doldur.
4. App content: **App access = All or some functionality is restricted**; test hesabı ve tüm adımları gir. Ads: gerçekten reklam SDK’sı/yerleşimi yoksa **No**. Target audience: ürün politikasına uygun **18 and over**; gerçek içerik anketinde çocuklara yönelikmiş gibi yanıt verme.
5. Content rating anketini gerçek AI çıktısı riski, etkileşim ve moderasyonla yanıtla. News/health/financial/government gibi formlarda ilgisiz kategorileri seçme; güzellik özelliğini tedavi veya tanı olarak sunma.
6. Data safety + account deletion alanlarını aşağıdaki envanterle doldur. Veri aktarımının tamamında HTTPS/TLS kullanıldığını gerçekten doğrulamadan şifreleme beyanı verme.
7. App integrity → **Play App Signing**. Release signing SHA-1/SHA-256 ile yerel upload key’i ayır; Google Android OAuth kaydında **Play app signing** SHA-1 ve `com.birkareai.mobile` doğru olmalı. Dahili yükleme çalışan Google girişi, Play’den kurulan sürümün çalıştığını tek başına kanıtlamaz.
8. Android yeni uygulama/güncellemelerinde 31 Ağustos 2026 itibarıyla **target API 36+** gerekiyor. Üretilen AAB manifestini ve 16 KB native page-size uyumluluğunu Play ön kontrolleriyle doğrula; yalnız Expo sürüm adına güvenme. [Google hedef API şartı](https://support.google.com/googleplay/android-developer/answer/11926878?hl=tr)
9. Önce Internal testing → Create release → imzalı **AAB** yükle, release notunu ekle, test grubuna dağıt. Ardından Closed testing. 13 Kasım 2023 sonrası açılan kişisel hesaplarda üretim erişimi başvurusu için en az **12 test kullanıcısı, kesintisiz 14 gün** kapalı teste katılmış olmalı; konsol hesabının şartları esas. [Google test gereklilikleri](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB)
10. Production access gerekiyorsa gerçek test verileriyle başvur. Üretim kanalında incelemeye gönder; kontrollü ülke/yayın ayarını kullan. İlk yayın ile sonraki sürümlerin kademeli dağıtım seçenekleri farklı olabilir; konsoldaki kullanılabilir seçeneklere göre ilerle. [Google test kanalları](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en)

## 7. Gizlilik formları için başlangıç envanteri

Bu tablo **kesin form cevapları değil, koddan çıkan kontrol listesidir**. Apple ve Google’ın “toplama”, “paylaşma”, “izleme” tanımları farklıdır. Fotoğrafı AI işleyene göndermek, özellikle hizmet sağlayıcı istisnaları açısından ayrıca değerlendirilmelidir; otomatik “paylaşılmıyor” sonucu çıkarma. [Google Data Safety rehberi](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)

| Veri                                 | Kodda kullanım / araştırılacak yer                    | Muhtemel amaç                                                                                          |
| ------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| E-posta, ad, soyad, OAuth kimliği    | Auth, User, AuthProvider                              | Hesap yönetimi, uygulama işlevi                                                                        |
| Doğum tarihi / yetişkinlik           | Kayıt ve kullanıcı profili                            | Yaş uygunluğu; tam tarihin saklanma gereğini ayrıca değerlendir                                        |
| Fotoğraf / üretilen görseller        | Kaynak dosya → private storage → AI sağlayıcı → çıktı | Kullanıcının istediği üretimi gerçekleştirme                                                           |
| Kullanıcı talimatı / seçimler        | Generation recipe, prompt, ayarlar                    | Görsel üretim ve kişiselleştirme                                                                       |
| Kredi işlem geçmişi                  | Wallet ve transaction kayıtları                       | İşlev, finansal mutabakat / sahtekârlık önleme                                                         |
| Cihaz/oturum, IP, güvenlik logları   | Session, rate limit, audit/log yapılandırması         | Hesap güvenliği ve kötüye kullanım önleme                                                              |
| Silme sonrası sınırlı HMAC kayıtları | AccountDeletion tombstone                             | Aynı kimlikle yeniden hoş geldin hakkı alma suistimalini önleme; amaç/süre/yasal dayanak onayı gerekli |
| Crash/analytics/push verileri        | Release binary SDK ve servis envanteri                | Yalnız gerçekten etkinse beyan et                                                                      |

“Yüz tanıma”, “biyometrik kimlik doğrulama” veya “model eğitimi yapılmıyor” gibi beyanları sağlayıcı sözleşmesi ve fiilî teknik işleyiş incelenmeden ekleme. Uygulama işlevi, retention, dış sağlayıcılar, aktarım bölgesi, silme ve destek kanalları gerçek gizlilik metninde yer almalı.

## 8. Build ve submit komutları

Bu komutlar bulut build/yükleme başlatır; **hazırlık ve yetkili hesap erişimi tamamlandıktan sonra işletme sahibi çalıştırmalıdır**. Bu çalışma kapsamında çalıştırılmadı.

```bash
cd apps/mobile
npx eas-cli login
npx eas-cli build:configure
npx expo-doctor
npm run typecheck
npm run lint
npm test
npx eas-cli build --platform ios --profile production
npx eas-cli build --platform android --profile production
```

`production` EAS environment için `EXPO_PUBLIC_APP_ENV=production`, `EXPO_PUBLIC_API_BASE_URL=https://[gerçek-api-alanı]`, Google public client ID’leri ve destek adresini ayarla. `EXPO_PUBLIC_*` uygulamadan okunabilir; backend sırlarını burada tutma. `eas.json` içinde staging build `preview` environment'ını, production build `production` environment'ını açıkça kullanır. Native proje değişikliklerinin app config ile senkronize olduğunu kontrol et; `prebuild --clean` ile mevcut native değişiklikleri habersiz silme. [EAS ortam değişkenleri](https://docs.expo.dev/eas/environment-variables/)

Android ilk yükleme için `android.versionCode: 1`, EAS `appVersionSource: local` ve `autoIncrement: false` kullanılır. Sonraki yeni AAB'lerde sürüm kodunu elle yükseltip native Gradle ile eşitle; otomatik veya uzak sayaç varmış gibi davranma. Mevcut upload key'i koruyan yerel build komutu, imza kontrolü ve `artifacts/android/<zaman-damgasi>/` teslim kaydı [AAB rehberinde](google-play-aab-release.md#derleme-adımları). Gerçek HTTPS API ve destek adresi sağlanmadan release build başlatılmaz.

```bash
npx eas-cli submit --platform ios --profile production
npx eas-cli submit --platform android --profile production
```

iOS submit yalnız binary’yi App Store Connect/TestFlight’a yükler; mağazada yayınlamak ayrıca inceleme gerektirir. `submit.production.ios.ascAppId` alanına App Store Connect’teki sayısal Apple ID girilir, Bundle ID değil. [Expo iOS gönderimi](https://docs.expo.dev/submit/ios/)

Android için service-account yetkilerini güvenli tanımla ve hedefi internal/draft olarak kontrol et. İlk AAB’yi Play Console’dan manuel yüklemek de mümkündür; otomatik gönderimin ilk yayın yetenekleri mevcut EAS belgelerinde açıklanır. `.apk` yerine mağaza `.aab` kullan. [Expo Android gönderimi](https://docs.expo.dev/submit/android/)

## 9. Son kabul testi ve yayın sonrası

- [ ] Temiz kurulum, tekrar açılış, mevcut hesaba giriş, çıkış, hesap değiştirme.
- [ ] E-posta doğrulama/sıfırlama; Google iptal, yanlış config, çevrimdışı, mevcut hesabı bağlama; varsa Apple private relay.
- [ ] JPG/PNG/HEIC kaynak, kamera/galeri izni reddi, büyük dosya, bozuk dosya; uygulama yüklemede donmuyor.
- [ ] Düşük/orta/yüksek yoğunluk farkı; güzellik ayarları ve PRO kısıtı yalnız UI’da değil sunucuda da uygulanıyor.
- [ ] Çift tıklamada bir üretim/kredi rezervi; worker kesintisi, sağlayıcı timeout, tekrar bağlanma, sonuç erişimi.
- [ ] Hesap Projeler’i doğru kullanıcıya ait; tamamlanmamış/başarısız iş yerine kaynak görsel paylaşılmıyor.
- [ ] Instagram/X/Facebook cihazda varken/yokken; paylaşım iptali başarı gibi gösterilmiyor; Fotoğraflar izni reddi ve kaydetme gerçek cihazda deneniyor. Yerel dosyalar Expo Sharing ile native menüye verilir; platforma otomatik post atılmaz. [Expo paylaşım sınırları](https://docs.expo.dev/versions/latest/sdk/sharing/)
- [ ] Uygulama içi rapor sunucuya ulaşır; inceleme sorumlusu ve yanıt süreci atanır.
- [ ] Hesap silme, oturum iptali, dosya temizliği ve varsa abonelik iptali açıklaması.
- [ ] Küçük iPhone, büyük iPhone, iPad açıksa iPad, Android; büyük font, VoiceOver/TalkBack, azaltılmış hareket, koyu mod.
- [ ] Yayın sonrası auth başarı oranı, üretim hata/latency, kuyruk yaşı, kredi tutarlılığı, maliyet ve silme kuyruğu izlenir. Kritik regresyonda yeni üretimi durdur, sürümü incele; kullanıcı işlemlerini körlemesine tekrar çalıştırma.

İlgili mevcut metin taslağı: [store-metadata.tr.json](store-metadata.tr.json). Gönderim öncesinde seçilen son metinle bu JSON’u senkronize et; eski metin ile yeni özellikler çelişmesin.
