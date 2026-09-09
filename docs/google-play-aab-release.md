# BirKare AI — Google Play Console formu ve imzalı AAB rehberi

Kontrol tarihi: **8 Eylül 2026**. Bu dosya form hazırlığı ve yayın kontrol listesidir. AAB'nin üretildiği, imzasının doğrulandığı, Console'a yüklendiği veya yayına alındığı anlamına gelmez. Derleme sonucu ayrıca dosya yolu, sürüm kodu ve imza bilgisiyle doğrulanmalıdır. Aşağıdaki uygunluk beyanlarını uygulama sahibi incelemeden onaylamayın.

## 1. “Uygulama oluştur” ekranında ne girilecek?

| Form alanı                                    | Bu uygulama için değer                       | Açıklama                                                                                            |
| --------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Uygulama adı                                  | `BirKare AI: Fotoğraf Stüdyosu`              | Boşluk ve noktalama dahil **29/30 karakter**. Cihazdaki kısa ad `BirKare AI` kalabilir.             |
| Varsayılan dil                                | **Türkçe — tr-TR**                           | Uygulama ve hazırlanmış mağaza metinleri Türkçe. İngilizce çeviri daha sonra eklenebilir.           |
| Uygulama veya oyun                            | **Uygulama / App**                           | Fotoğraf düzenleme ve AI üretim aracı; oyun değil.                                                  |
| Ücretsiz veya ücretli                         | **Ücretsiz / Free**                          | İndirme ücretsiz. Bu seçim, gelecekte uygulama içi kredi satışı yapılmasını tek başına engellemez.  |
| İletişim e-postası sorulursa                  | `birkareal@ranvals.com`                     | Kullanıcı tarafından sağlandı; sahiplik ve gelen/giden e-posta teslimatı yayın öncesinde doğrulanmalı. |
| Geliştirici Programı Politikaları             | **İncelemeden işaretleme**                   | Bu, gerçek uygulama için uygunluk beyanıdır; bölüm 3'te açık yayın engelleri var.                   |
| ABD ihracat yasaları                          | **Yetkili kişi değerlendirmeden işaretleme** | TLS/kimlik doğrulama kullanmak otomatik uygunluk veya muafiyet kanıtı değildir.                     |
| Play App Signing hizmet şartları gösterilirse | **Yetkili kişi okuyup karar verir**          | Teknik olarak imzalama önerilir; hizmet şartlarını kabul etme işlemi bu belgeyle yapılmış sayılmaz. |

Alanlar ve beyanlar Google'ın güncel oluşturma akışıyla uyumludur. Ekran dili ve hesap türüne göre etiketler değişebilir. [Google: uygulama oluşturma](https://support.google.com/googleplay/android-developer/answer/9859152/create-and-set-up-your-app?hl=en-GB)

Ücretsiz sunulmuş uygulama sonradan ücretli indirmeye çevrilemez; ücretli indirme için yeni paketle yeni uygulama gerekir. BirKare'nin kredi modeli ile **indirme fiyatı** farklı konulardır. Mevcut uygulamada gerçek Play Billing ve makbuz doğrulaması tamamlanmadığından kredi/PRO satın alma özelliği hazırmış gibi beyan edilmemelidir. [Google: ücretsiz/ücretli seçimi](https://support.google.com/googleplay/android-developer/answer/6334373?hl=en), [dijital ürün ödeme politikası](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en)

İhracat beyanı için uygulama sahibi kullandığı şifreleme ve dağıtım ülkelerini değerlendirmeli; gerektiğinde uzman desteği almalıdır. “Türkiye'deyim, bana uygulanmaz” varsayımı doğru değildir. [Google: ihracat uygunluğu](https://support.google.com/googleplay/android-developer/answer/113770?hl=en)

## 2. Sabit teknik kimlikler — bunları karıştırma

Depodaki `apps/mobile/app.config.ts` üzerinden doğrulanan değerler:

| Kimlik                           | Değer                                  | Nerede kullanılır?                                         |
| -------------------------------- | -------------------------------------- | ---------------------------------------------------------- |
| Android package / application ID | `com.birkareai.mobile`                 | AAB, Play kaydı, Android Google OAuth istemcisi            |
| Expo slug                        | `birkare-ai`                           | Expo projesi; Android paket adı değildir                   |
| EAS project ID                   | `1a82d36d-7d54-46ef-b63b-919e195e832d` | Mevcut Expo/EAS projesi; yeni proje oluşturma              |
| Deep-link scheme                 | `birkareai`                            | Uygulama içi bağlantılar; paket adı değildir               |
| Kullanıcıya görünen sürüm        | `0.1.0`                                | Android `versionName`; `versionCode` değildir              |
| İlk yükleme sürüm kodu           | `1`                                    | `app.config.ts` içindeki açık `android.versionCode` değeri |
| iOS Bundle ID                    | `com.birkareai.mobile`                 | Yalnız iOS tarafı; Play'e ayrıca girilmez                  |

Play'de paket adı kalıcıdır. İlk AAB bu kimliği taşımalıdır; daha sonra adı değiştirmek aynı uygulamayı güncellemek anlamına gelmez. Ad alanına `com.birkareai.mobile` veya Expo proje UUID'sini yazma. [Google: paket kimliği](https://support.google.com/googleplay/android-developer/answer/9859152/create-and-set-up-your-app?hl=en-GB)

Bu projede `cli.appVersionSource: local`, staging/production için `autoIncrement: false` seçildi; uzak sürüm sayacı yoktur. İlk yükleme hedefi `android.versionCode: 1` olarak açıkça tanımlandı. **Her sonraki yeni AAB yüklemesinde** `app.config.ts` sürüm kodunu Console'da kullanılmış en yüksek değerden daha büyük yap ve prebuild ile native Gradle değerini eşitle. Native proje varsa onun sürümü önceliklidir; app config ile farklı kalmamalı. Aynı AAB'yi test kanalından production'a terfi ettirmek yeniden build değildir, bu işlem için yeni sürüm kodu üretme. `0.1.0` görünür sürümü bu sayaçtan ayrıdır. [Expo: sürüm yönetimi](https://docs.expo.dev/build-reference/app-versions/)

### Son hazırlık durumu

- **Hazır:** Kullanıcının onayladığı ilk upload key; public ortam doğrulama wrapper'ı; yerel release imzalama ve doğrulama scripti.
- **Destek adresi sağlandı:** `birkareal@ranvals.com`. Mobil örnek config ve destek alanları güncellendi; posta kutusu sahipliği/teslimatı henüz test edilmedi. Destek formu yalnız kullanıcının e-posta uygulamasında taslak açar.
- **Eksik:** Gerçek public HTTPS API adresi ve destek posta kutusunun teslimat kontrolü. API alan adı tahmin edilmedi; release koruması geçerli API değeri olmadan durur.
- **AAB:** Henüz üretilmedi. Gradle bağımlılık kontrolleri tamamlanmış bir release veya imzalı dosya kanıtı değildir.
- **Test kaydı:** Ortam/config için 30, wrapper için 4, imzalama için 8 olmak üzere **42 hedefli test geçti**. Bunlar cihaz testi veya başarılı AAB derlemesi yerine geçmez.
- **Son genel kontrol:** Mobil testlerin tamamı **264/264**, TypeScript ve değişen dosyaların lint/biçim kontrolleri geçti. İmzasız `bundleRelease --dry-run` native imza korumasında beklenen şekilde durdu; AAB üretmedi.
- **Toolchain gözlemi:** Gradle `:app:tasks` kontrolü başarılı; yapılandırmada target SDK 36, minimum SDK 24, Build Tools 36 ve NDK 27.1 görüldü. Tam release bağımlılıkları henüz önbellekte değil; ilk derleme internet gerektirir. Son AAB manifesti ve native uyumluluk ayrıca doğrulanmalı; bu gözlem mağaza kabul garantisi değildir.
- **Native görünüm uyarısı:** Prebuild, Android `userInterfaceStyle` desteği için `expo-system-ui` paketinin eksik olduğunu bildiriyor. Bu bir imza hatası değildir; Android sistem teması davranışı final cihaz kontrolünde ayrıca ele alınmalı.

## 3. Derlemeden ve test dağıtımından önce eksik bilgiler

İmzalı dosya oluşturmak ile çalışır bir release oluşturmak ayrı doğrulamalardır. Bu bilgiler olmadan sahte/localhost API içeren dosyayı mağaza sürümü olarak hazırlama:

- [ ] Test için **gerçek HTTPS staging API adresi**; production için ayrı gerçek API adresi. Fiziksel telefonda `localhost:4000` kullanıcının kendi telefonudur; bilgisayardaki backend değildir. LAN veya geçici geliştirici URL'si kalıcı mağaza altyapısı değildir.
- [ ] EAS hesabında yukarıdaki projeye erişim; varsa mevcut Android upload keystore'una erişim. Yeni anahtar gerekiyorsa sahibi bu kararı onaylar. Mevcut anahtarı silme/sıfırlama.
- [ ] `birkareal@ranvals.com` gelen/giden teslimat kontrolü; erişilebilir gizlilik, kullanım koşulları, destek ve hesap silme sayfaları.
- [ ] Google Android OAuth için doğru paket + kurulan build'in imza sertifikası; sunucu tarafında doğru Google Web client ID doğrulaması.
- [ ] Cihazda uçtan uca kayıt/giriş ve profil tamamlama; kaynak fotoğraf yükleme; gerçek AI üretimi; sonuç/projeler; kaydet/paylaş.

**Üretim yayınını engelleyen mevcut ürün işleri:**

| Alan                                 | Depoda görülen durum                                                 | Yayından önce gereken                                                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| E-posta doğrulama / parola sıfırlama | Token oluşturma var; gerçek üretim e-posta teslimatı bağlı değil     | E-posta sağlayıcısı, çalışan teslimat ve süre/aşım testleri; `AUTH_DEV_MODE=true` ile geçiştirme                                                   |
| Kredi / PRO ödemesi                  | Ürün listeleme var; gerçek mağaza satın alımı/makbuz doğrulaması yok | Play Billing, sunucu doğrulama, iade ve yinelenen bildirim testleri; hazır değilse satın alma iddialarını ve çalışmayan satın alma yollarını kapat |
| AI sonucu raporlama                  | Sonuç ekranı yerel “Rapor talebin hazır” durumu gösteriyor           | Sunucuda rapor kaydı, inceleme sorumlusu ve çalışan uygulama içi gönderim; hazır mesajı gönderim kanıtı değil                                      |
| Yasal / destek adresleri             | Varsayılan e-posta ve taslak içerikler var                           | İşletmenin gerçek alanında çalışan sayfalar ve onaylı veri işleme açıklaması                                                                       |
| Hesap ve veri silme                  | Akış kodu var; dışarıdan silme talebi URL'si doğrulanmadı            | Şifreli ve sosyal hesapla uçtan uca test; dosya/oturum temizliği ve tutulan sınırlı kayıtların açıklaması                                          |

Google üretken AI uygulamalarında uygulama içi raporlama ister; mevcut yerel form bu gerekliliği tek başına karşılamaz. [Google: AI içerik politikası](https://support.google.com/googleplay/android-developer/answer/13985936?hl=en)

Ayrıntılı backend hazırlığı için [staging yol haritasını](backend-staging-roadmap.md), mağaza ön koşulları için [ortak yayın yol haritasını](app-store-google-play-roadmap.md) kullan. Bunlar çözülmeden politika kutularına “uygun” diyerek üretime geçme.

## 4. İmzalı AAB — doğru anahtar ve doğru ortam

### Anahtarların farkı

| Anahtar / belge                                | Görevi                                                | Google girişi açısından                                                                               |
| ---------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Upload key** — `.jks` / `.keystore`          | Yerel/EAS üretimi AAB'yi Play'e yüklemek için imzalar | Bu anahtarla doğrudan kurulan APK'nin SHA-1'i debug'dan farklı olabilir                               |
| **App signing key** — Google'ın dağıtım imzası | Play'in kullanıcıya ulaştırdığı APK'leri imzalar      | **Play üzerinden kurulumun SHA-1'i budur**; yalnız upload SHA-1'i eklemek yetmez                      |
| Google service-account JSON                    | Otomatik EAS Submit için Play API yetkisi             | Ne imza anahtarı ne kullanıcı Google OAuth client ID'sidir; manuel Console yüklemesinde zorunlu değil |

Yeni uygulamalarda güncel Play App Signing akışı Google tarafından yönetilen anahtarlarla kayıt yapar. Console ek anahtar/modern imza sertifikaları gösterirse aktif dağıtım sertifikalarının tümünü dikkate al; Google'ın varsayılanını özel ihtiyaç olmadan değiştirme. Upload key'i ayrı ve güvenli tut. [Google: Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en)

Keystore, parolası, service-account JSON veya API sırlarını Git'e, mağaza açıklamasına ya da bu dosyaya koyma. Anahtar dosyasını şifreli yedekle; ekip erişimini sınırlı tut. İlk release daha önce yüklenmişse mevcut upload certificate ile aynı anahtarı kullan. Yanlış anahtar hatasında gelişigüzel yeni key üretme.

### Bu projede oluşturulan upload key

Kullanıcının ilk yükleme için verdiği onayla upload key oluşturuldu. **AAB henüz oluşturulmuş kabul edilmez.** Anahtarın özel dosyaları repo kökündeki `.local-credentials/android/` altında, klasör izinleri `700`, özel dosya izinleri `600` olacak şekilde yereldir. `upload-keystore.jks` ve `credentials.json` birlikte güvenli, şifreli yedeğe alınmalı; dosya içeriği paylaşılmamalıdır. `upload-certificate.pem` yalnız genel sertifikadır.

Genel upload certificate parmak izleri:

```text
SHA-1: 09:B9:E6:E1:4C:71:33:D1:90:FF:83:87:A3:21:B2:E7:88:74:26:EB
SHA-256: EF:70:E4:58:81:88:4C:59:BF:E6:5B:16:D7:08:0F:03:20:A5:F2:33:04:DD:EA:16:E9:4A:12:D2:83:7F:4D:DD
```

Bunlar **Play app-signing** sertifikaları değildir. Özel `credentials.json` EAS biçimindedir; ancak EAS bu özel kök dizini otomatik bulmaz. `eas.json` içindeki staging/production profilleri `credentialsSource: local` kullanır ve EAS proje kökü olan `apps/mobile/credentials.json` dosyasını bekler. Bulut build'den önce aynı key'e yönelen credentials dosyasının güvenli, Git dışı hazırlığı gerekir. “Generate new keystore” seçilerek ikinci bir upload kimliği oluşturulmamalıdır.

### Derleme adımları

1. Hedefi belirle: sınırlı test için **staging**, gerçek yayın için **production**. Staging paketi production AAB'siymiş gibi herkese açılmamalı; kullanılan API adresini test notunda belirt.
2. Seçilen EAS environment'a gerçek `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_SUPPORT_EMAIL=birkareal@ranvals.com`, `EXPO_PUBLIC_APP_ENV` ve public Google client ID'lerini tanımla. `EXPO_PUBLIC_*` gizli değildir; posta kutusu parolası, OpenAI anahtarı, veritabanı, OAuth Web client secret, JWT veya depolama sırları yalnız backend'de kalır.
3. `eas.json` build profilinin **store dağıtımı + app-bundle** ürettiğini kontrol et. Bu projedeki `staging` profili EAS `preview` environment'ını kullanır ve AAB üretir; `production` profili `production` environment'ını kullanır ve AAB üretir. Adı `preview` olan build profili ise internal-distribution APK'sıdır. Play **Internal testing** kanalı ile EAS **internal distribution** aynı şey değildir. [Expo: APK/AAB ayrımı](https://docs.expo.dev/build-reference/apk/)
4. `apps/mobile` içinde test ve TypeScript kontrolünü çalıştır. Derlemeyi yapan makinede seçilen ortam değerlerinin gerçekten uygulandığını doğrula.

```bash
cd apps/mobile
npm run typecheck
npm test
```

5. Aşağıdaki komutlar **repo kökünden** çalıştırılır. Ortam dosyası açıkça seçilir; wrapper alt komutu `apps/mobile` klasöründe başlatır. `.env` içindeki backend sırlarını Expo'ya taşımaz; yalnız izin verilen public mobil değerleri ve gereken build araç değişkenlerini geçirir. Mevcut `.env` dosyasını kendiliğinden değiştirmez, değerleri ekrana dökmez. API veya destek adresi eksik/örnek/yerelse release preflight bilinçli olarak durur.

```bash
node apps/mobile/scripts/mobile-env.mjs --env-file .env --app-env staging --release --check
```

Staging için ayrı bir dosya tercih edilirse `--env-file /guvenli/gercek/yol/mobile-staging.env` ver. `apps/mobile/.env.release.example` doldurulacak alanları gösterir; API ve destek boş bırakılmıştır, olduğu gibi çalışan release yapılandırması değildir. Public URL biçimi doğrulanması DNS, alan sahipliği veya API erişiminin doğrulandığı anlamına gelmez.

Ortamın yanında mevcut upload key'i de **derleme yapmadan** doğrulamak için:

```bash
node apps/mobile/scripts/mobile-env.mjs --env-file .env --app-env staging --release -- node scripts/android-release.mjs --check
```

Yerel imzalı AAB için, preflight geçtikten ve JDK/Android SDK hazır olduktan sonra:

```bash
node apps/mobile/scripts/mobile-env.mjs --env-file .env --app-env staging --release -- node scripts/android-release.mjs
```

Bu komut mevcut yerel upload key ile release akışını başlatır. Script önce native değişiklikleri silmeden prebuild senkronizasyonu yapar, ardından Gradle `bundleRelease` çalıştırır; `jarsigner` doğrulaması ve AAB sertifikası ile mevcut upload key sertifikasının eşleşmesi başarılı olmalıdır. Debug keystore'u store kimliği olarak kullanma. [Expo: yerel release build](https://docs.expo.dev/guides/local-app-production/)

Yalnız başarılı imza doğrulamasından sonra repo kökünde aşağıdaki çıktılar oluşturulur:

```text
artifacts/android/<zaman-damgasi>/birkare-release.aab
artifacts/android/<zaman-damgasi>/release.json
```

`release.json`, AAB dosya SHA-256 değerini, upload certificate SHA-256 değerini, seçilen ortamı ve public API adresini kaydeder; `uploaded: false` kalır. Script **Play'e yükleme veya dağıtım yapmaz**. Paket adı, sürüm kodu ve target SDK bu kayıtla otomatik doğrulanmış olmaz; gerçek AAB manifestini bundletool/Console ile ayrıca kontrol et.

EAS bulut build tercih edilirse **önce yerel credentials hazırlığını tamamla**: mevcut private key'i kullanan `apps/mobile/credentials.json`, keystore yolu ve sınırlı dosya izinleri doğrulanmalı; hiçbir özel dosya Git'e eklenmemelidir. Alternatif olarak yetkili kişi mevcut key'i EAS'e aktarabilir, fakat bu yöntemde `credentialsSource` da bilinçli olarak remote seçilmelidir. Hazırlık yokken aşağıdaki EAS komutunu çalıştırma. Seçilen EAS environment'ta gerekli public değerler de bulunmalıdır; yerel `.env` dosyasının sunucuya otomatik bir sır paketi olarak taşındığını varsayma. Aşağıdaki koşullu komut **yalnız build** başlatır, otomatik gönderim/yayınlama bayrağı yoktur:

```bash
node apps/mobile/scripts/mobile-env.mjs --env-file .env --app-env staging --release -- npx eas-cli build --platform android --profile staging
```

Bulut build kaynakları EAS'e gönderir ve hesabın build kotasını kullanabilir; yalnız yetkili kararından sonra çalıştırılır. Production için hem `--app-env production` hem `--profile production` kullan, `.env`/EAS environment değerlerinin gerçek production servislerine ait olduğunu doğrula. Staging adresini yalnız bayrak değiştirerek production'a çevirmiş olmazsın.

6. Başarılı işten AAB'yi indir. Dosya yolunu, SHA-256 özetini, `com.birkareai.mobile` paketini, `versionName/versionCode` ve upload certificate SHA-1/SHA-256 değerlerini kayıt altına al. Java araçları varsa yerel dosya sertifikasını okuyabilirsin:

```bash
keytool -printcert -jarfile /gercek/dosya/yolu/birkare-release.aab
```

AAB sertifikası upload kimliğidir; Play'in dağıtım sertifikasıyla aynı olması beklenmez. `expo export` başarılı olması veya JavaScript bundle üretilmesi, AAB imzasının doğrulandığı anlamına gelmez. [Google: binary sertifikasını okuma](https://developers.google.com/android/guides/client-auth)

## 5. Google girişinin Play sürümünde bozulmaması

1. Google Cloud → Google Auth Platform → Clients altında **Android** istemcisi kullan: package `com.birkareai.mobile`.
2. Play Console'da **Play App Signing / App integrity** sertifikalarından **app signing certificate SHA-1** değerini al. Yeni arayüzde bu bölüm `Protected with Play → Play Store distribution` altında da bulunabilir; Console aramasında “app signing” kullan.
3. Android istemcisini bu paket + SHA-1 çiftiyle kaydet. Debug ve doğrudan yüklenen release APK testleri için ilgili farklı SHA-1'lere ayrı Android istemcileri gerekir. Play birden fazla aktif dağıtım sertifikası gösteriyorsa desteklenen cihazlara uygulanan her sertifikayı kaydet. Sertifikalar herkese açık kimlik bilgileridir; özel key'i Google OAuth formuna yükleme.
4. Mobil `googleWebClientId`, sunucudaki `GOOGLE_WEB_CLIENT_ID` ve kullanılan Cloud projesi eşleşsin. Bu depoda `GoogleSignin.configure()` Web/iOS client ID alır; `googleAndroidClientId` yalnız tanılama bilgisidir. Android client ID'yi Web client ID alanına kopyalama.
5. Internal testing linkinden Play'in kurduğu uygulamada giriş yap. Debug APK'de girişin çalışması bu testi yerine geçmez; profil tamamlamada yazma ve yeniden giriş de denenmeli.

Paket/imza çifti ve Web istemcisinin ayrı görevleri Google tarafından açıklanır. [Google: OAuth Android kurulumu](https://codelabs.developers.google.com/sign-in-with-google-android), [Expo: Google authentication](https://docs.expo.dev/guides/google-authentication/)

## 6. İlk AAB yüklemesi — önce Internal testing

Önerilen kontrollü ilk yol:

1. Play Console → uygulama → **Test and release → Testing → Internal testing**.
2. Testers alanına onaylı test e-postalarını/grubunu ekle; kişisel kullanıcı listesini bu depoya yazma.
3. **Create new release** → doğru paket ve imzalı AAB'yi yükle; Play App Signing ekranını yetkili kişi inceler.
4. Console'un bulduğu paket adı, sürüm kodu, target SDK, native uyumluluk ve imza sonuçlarını kontrol et. Bloklayan hata varsa dağıtma.
5. İç release adı önerisi `0.1.0-internal-01`; kullanıcıya görünen sürüm notunu aşağıdan kullan.
6. **Review release** aşamasında yalnız internal kanal hedefini kontrol et. Test kullanıcılarına dağıtma düğmesi dağıtım işlemidir; operatör son kez onaylar. Bu rehber dağıtımı kendiliğinden yapmaz.

Manuel yüklemenin ekran akışı ve release durumları: [Expo: manuel Play yüklemesi](https://docs.expo.dev/submit/android-manual/), [Google: release hazırlama](https://support.google.com/googleplay/android-developer/answer/9859348?hl=en-GB)

**Güncel not:** İlk yüklemenin mutlaka manuel yapılması gerektiği eski bir varsayımdır. Güncel EAS Submit, gerekli Play app kaydı ve service-account yetkileriyle ilk internal release'i de oluşturabilir. Burada ilk yüklemeyi operatörün Console'da gözden geçirmesi önerildiği için manuel akış seçildi; otomatik submit yapılmadı. İleride otomasyon açılırsa `track: internal` ve `releaseStatus: draft` açıkça seçilmeli, yetkiler sınırlanmalıdır. [Expo: Android gönderimi](https://docs.expo.dev/submit/android/)

Internal testing, uygun kişisel hesapların üretim öncesi **closed testing** şartını karşılamaz. 13 Kasım 2023 sonrası açılan kişisel hesaplarda en az **12 test kullanıcısının kesintisiz 14 gün** kapalı teste katılımı ve ardından üretim erişimi başvurusu gerekir. Gerçek kullanıcı geri bildirimlerini ve yapılan düzeltmeleri kaydet; sahte test beyanı üretme. Hesabındaki güncel gereklilikleri esas al. [Google: yeni kişisel hesap testleri](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)

## 7. Dashboard / App content alanları

| Alan                                    | BirKare için hazırlanacak yanıt                                                                                                                                       |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Birincil kategori                       | **Fotoğrafçılık / Photography** önerisi; oyun kategorisi değil                                                                                                        |
| Etiketler                               | Console'da gerçekten sunulan fotoğraf düzenleme/filtre/AI ile ilgili uygun etiketler; olmayan etiketi yazmaya çalışma                                                 |
| App access / Uygulama erişimi           | **Erişimin tamamı veya bir kısmı kısıtlı**: hesap gerekir. İncelemeye özel doğrulanmış hesap, yeterli kredi ve tam adımlar ver; kişinin özel Google hesabını paylaşma |
| Reklam içeriyor mu?                     | Mevcut sürümde reklam ağı gösterimi tespit edilmedi; ancak son AAB/SDK envanteri doğrulandıktan sonra yanıtla. Kredi satışı reklam SDK'sı değildir                    |
| Hedef kitle                             | Ürünün mevcut 18+ konumlandırmasına göre **18 yaş ve üzeri**; çocuk yaş gruplarını sırf erişimi artırmak için seçme                                                   |
| İçerik derecelendirmesi                 | IARC anketini gerçek AI üretimi, içerik ve paylaşım işlevleriyle doldur; “18+ hedefliyoruz” diye tüm cevapları otomatik Hayır yapma                                   |
| Veri güvenliği                          | **Veri toplanmıyor** seçme: hesap, yüklenen fotoğraf ve üretilen içerik işleniyor. Veri türü, amaç, saklama ve sağlayıcı aktarımı tek tek incelenmeli                 |
| Gizlilik politikası                     | `[Gerçek HTTPS gizlilik URL'si]`; uygulama/işletme adı ve gerçek sağlayıcılarla uyumlu                                                                                |
| Hesap silme URL'si                      | `[Çalışan uygulama dışı silme talebi sayfası]`; yalnız destek ana sayfası veya uygulamayı yeniden kurma talimatı yeterli değil                                        |
| Sağlık / finans / haber gibi ek sorular | Fotoğraf aracı kapsamına göre, gerçek işlev ve açıklama ile cevapla; güzellik aracı için tedavi vaadi verme                                                           |

Veri güvenliği yanıtları üçüncü taraf SDK'lar/AI sağlayıcısı dahil gerçek işleme envanterine dayanır; hizmet sağlayıcıya aktarımda “paylaşım” sınıflamasını Google'ın tanım ve istisnalarıyla değerlendir. Backend'in fotoğraf görmesi nedeniyle “tüm veri cihazda kalır” deneme. [Google: Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)

Detaylı mağaza açıklaması, App Store karşılıkları ve veri envanteri: [ortak yol haritası, bölümler 3 ve 7](app-store-google-play-roadmap.md).

## 8. Hazır Türkçe metinler

### Ad — 29/30 karakter

```text
BirKare AI: Fotoğraf Stüdyosu
```

### Kısa açıklama — 77/80 karakter

```text
Fotoğrafını AI sahneler, güzellik dokunuşları ve filtrelerle yeniden yorumla.
```

Tam açıklama [ortak metin dosyasında](app-store-google-play-roadmap.md#iki-mağaza-için-tam-açıklama): **2.207/4.000 karakter**. Açıklamalar yalnız yayınlanan build'de gerçekten çalışan özellikleri anlatmalıdır. [Google: mağaza metni sınırları](https://support.google.com/googleplay/android-developer/answer/13393723?hl=en)

### Internal test sürüm notu

```text
BirKare AI test sürümü. Google girişi, profil tamamlama, fotoğraf yükleme, sahne ve filtre seçimi, AI üretimi ve sonuç paylaşımını test edebilirsiniz.
```

Not yalnız bu akışlar test backend'inde çalışır duruma getirildikten sonra kullanılmalı. Store metnine test hesabı parolası veya API adresi ekleme; bunlar yalnız Console'un uygun inceleme erişimi alanına yazılır.

## 9. “Hazır” diyebilmek için teslim kaydı

- [ ] Gerçek AAB dosya yolu/indirme adresi ve SHA-256 kayıtlı.
- [ ] Upload certificate doğrulandı; paket `com.birkareai.mobile`, doğru sürüm kodu ve ortam doğrulandı.
- [ ] Play'in oluşturduğu uygulama fiziksel Android cihazda açıldı; Google girişi ve form yazımı denendi.
- [ ] İzinli fotoğrafla gerçek üretim tamamlandı; hata/iptalde kredi davranışı, Projeler ve paylaşım test edildi.
- [ ] Bölüm 3'teki yayın engelleri çözüldü veya çalışmayan işlevler release kapsamından gerçekten çıkarıldı.
- [ ] Politika/ihracat/imzalama beyanları işletme sahibi tarafından incelendi.
- [ ] Hedef kanal internal; üretime terfi ayrı onay ve son kontrole bağlı.

**Build başarı ≠ test dağıtımı ≠ mağaza onayı ≠ production yayını.** Bu aşamaların her biri ayrı sonuçla doğrulanır.
