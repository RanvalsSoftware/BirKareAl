# BirKare AI — Google ile giriş kurulumu

Bu belge yalnızca BirKare AI mobil uygulamasındaki **Google ile devam et** akışı içindir.
Mevcut proje OpenAI, Cloudflare R2, PostgreSQL ve Redis kullanır; Google Cloud'a OpenAI anahtarı,
service-account JSON'u, Android keystore'u veya kart/billing bilgisi girilmez.

## Önce sabit kalacak uygulama kimlikleri

Bu değerler halihazırda `apps/mobile/app.config.ts` içindedir. Uygulama mağazaya çıktıktan sonra
değiştirmek yeni bir uygulama kimliği oluşturmak anlamına gelir; bu nedenle Google OAuth istemcilerini
bu değerlerle açın.

| Alan                 | Girilecek değer                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| Uygulama adı         | `BirKare AI`                                                                                      |
| iOS Bundle ID        | `com.birkareai.mobile`                                                                            |
| Android package name | `com.birkareai.mobile`                                                                            |
| EAS/upload SHA-1     | `6C:73:69:5D:32:C6:91:32:40:64:19:E4:36:98:56:E3:DA:B7:C1:B0`                                     |
| Play signing SHA-1   | `5C:50:AB:58:B9:06:B4:D1:D1:0A:A5:84:D0:B6:3B:B0:33:F8:6F:9B`                                     |
| Play hybrid SHA-1    | `EC:2A:2C:AB:2A:BB:72:44:CC:F2:5D:3D:01:F4:56:2F:96:C4:23:33`                                     |
| Play hybrid SHA-256  | `74:4B:1C:E3:82:A2:69:A6:75:20:87:C3:A3:9D:EC:EE:AA:2B:22:97:AB:59:77:59:36:3B:C4:67:13:EC:A8:5D` |
| Uygulama URL şeması  | `birkareai`                                                                                       |

> Eski taslaklardaki `com.birkare.ai` değerini kullanmayın. Bu projedeki gerçek değer
> `com.birkareai.mobile`.

## Google Cloud Console'da adımlar

1. [Google Cloud Console](https://console.cloud.google.com/) içinde doğru Google hesabıyla oturum açın
   ve **New project** seçin.
   - Project name: `BirKare AI`
   - Organization/Location: kişisel hesabınız için varsayılan seçimi bırakabilirsiniz.
   - Oluşan Project ID'yi bir yere not edin; parolanızı veya hesap erişiminizi paylaşmayın.

2. Sol menüden **Google Auth Platform** açın ve **Branding** bölümünü doldurun.
   - App name: `BirKare AI`
   - User support email: aktif olarak takip ettiğiniz destek e-postası
   - Developer contact information: sizin veya ekibinizin aktif e-postası
   - Logo: BirKare AI'nin gerçek altın/siyah logosu (isteğe bağlı; yanlış marka veya Google logosu
     kullanmayın)
   - Homepage, Privacy policy ve Terms of service: gerçek, herkese açık HTTPS adresleri olduğunda
     ekleyin. Henüz yoksa sahte URL girmeyin.
   - Authorized domains: alan adını ancak size aitse ve Google Search Console ile doğrulayabiliyorsanız
     ekleyin (ör. `birkare.ai`).

3. **Audience** bölümünde şimdilik şunları seçin.
   - User type: `External`
   - Publishing status: `Testing`
   - Test users: kendi Gmail adresiniz ve test edecek ekip üyeleriniz

   Yayın öncesi test modunda kullanıcı sınırı vardır ve kullanıcı izinleri kısa ömürlü olabilir; herkese
   açmadan önce uygulamayı Production'a geçirip marka/doğrulama gereksinimlerini tamamlarız.

4. **Data Access** bölümünde yalnızca temel kimlik kapsamlarını kullanın:
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`

   Drive, Gmail, Calendar, YouTube vb. ek kapsamları eklemeyin. BirKare AI'nin Google hesabından
   fotoğraf, dosya veya posta okumasına ihtiyacı yok.

5. **Clients** bölümünde en az aşağıdaki beş OAuth istemcisini kullanın. Hybrid/PQC etkinse her ek
   Play sertifikası için ayrıca Android istemcisi gerekir.

   | Client type          | Name                        | Girilecek değer                                   | Client ID / kullanım                                    |
   | -------------------- | --------------------------- | ------------------------------------------------- | ------------------------------------------------------- |
   | iOS                  | `BirKare AI iOS`            | Bundle ID: `com.birkareai.mobile`                 | `197394599682-vnlj…`; iOS Client ID + URL şeması        |
   | Android (EAS/upload) | `BirKare AI Android EAS`    | Package + `6C:73:…:C1:B0`                         | `197394599682-0nmn…`; EAS APK/upload anahtarlı kurulum  |
   | Android (Play)       | `BirKare AI Android Play`   | Package + Play Console'daki `5C:50:…:6F:9B`       | `197394599682-cubv…`; Play'in dağıttığı üretim kurulumu |
   | Android (Hybrid)     | `BirKare AI Android Hybrid` | Package + Play Console'daki `EC:2A:…:23:33`       | `197394599682-08st…`; hybrid Play kurulumu              |
   | Web application      | `BirKare AI API`            | Native ID-token akışı için redirect URI eklemeyin | `197394599682-a789…`; backend ID-token audience         |

   Android istemci adları yalnızca Console etiketidir; doğru eşleme package + SHA-1 ile yapılır.
   Play istemcisinin SHA-1 değeri, Play Console **App integrity / Play app signing** ekranındaki
   **App signing key certificate** ile tekrar karşılaştırılmalıdır. Upload key certificate ile
   karıştırılmamalıdır.

   Play Console quantum-ready/hybrid imzalama için birden fazla etkin app-signing sertifikası
   gösteriyorsa her etkin SHA-1 için aynı package ile ayrı bir Android OAuth istemcisi oluşturun ve
   yeni Client ID'yi backend listesinin sonuna ekleyin. API en fazla altı Android Client ID kabul eder.

6. EAS/upload Android sertifikasının **yalnızca SHA-1 parmak izini** alın:

   ```bash
   cd apps/mobile
   npx eas-cli@latest credentials -p android
   ```

   Ekrandaki SHA-1'i Android OAuth istemcisine yapıştırın. Keystore dosyasını, keystore parolasını veya
   Google hesabı parolasını göndermeyin.

## EAS ve Portainer eşlemesi

- `preview` APK profili EAS/upload istemcisini (`0nmn…`) kullanır.
- `staging` ve `production` AAB profilleri iki etkin Play signing istemcisini
  (`cubv…` ve hybrid `08st…`) build kanıtı olarak taşır.
- Üç profil de repoda tutulan, Git tarafından yok sayılan aynı upload keystore'u kullanır;
  `credentialsSource` değeri `local`dır. EAS'taki başka bir remote keystore ile karıştırılmamalıdır.
- Google native SDK sunucu audience değeri her profilde Web Client ID'dir (`a789…`).
- Portainer'da backend EAS, Play production ve Play hybrid istemcilerinden gelen tokenları kabul
  etmelidir. Play Console başka bir PQC SHA-1 gösteriyorsa onun istemcisi de aynı satıra eklenmelidir:

  ```text
  GOOGLE_ANDROID_CLIENT_ID=197394599682-0nmn4oppa3v23p9dv4ovdneh4fpq2sbv.apps.googleusercontent.com,197394599682-cubvb4e2ajh6621djsrkv3dhbgo6j15p.apps.googleusercontent.com,197394599682-08sti8uhplpeb1svj51salr07ovoci9r.apps.googleusercontent.com
  ```

Mobil production değişkeninde etkin Play signing istemcileri bulunur. Bu alan çalışma zamanında
Google SDK'ya verilmez; store build'in doğru package/SHA istemcilerinin oluşturulduğunu doğrular:

```text
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=197394599682-cubvb4e2ajh6621djsrkv3dhbgo6j15p.apps.googleusercontent.com,197394599682-08sti8uhplpeb1svj51salr07ovoci9r.apps.googleusercontent.com
```

## Bize iletebileceğiniz güvenli bilgiler

Kurulumdan sonra aşağıdakileri sohbet içinde metin veya ekran görüntüsü olarak gönderebilirsiniz:

```text
Google Cloud project ID (isteğe bağlı)
Google iOS Client ID
Google Web Client ID
Android development SHA-1
Google Play'de görünen tüm app-signing/hybrid SHA-1 değerleri
Bu SHA-1 değerleri için oluşturulan Android OAuth Client ID'leri
```

Şunları kesinlikle paylaşmayın: Google parolası/2FA kodu, OAuth client secret, Android keystore,
Apple private key, Resend API key veya service-account JSON. Bunlar gerekiyorsa sizin kendi `.env` veya
deployment secret ayarınıza yazdırırız.

## Kod tarafındaki akış

```text
Mobil uygulama
  → Google'ın yerel giriş ekranı
  → Google ID token
  → `POST /v1/auth/google` (BirKare Express API)
  → Google imza + iss + aud + exp doğrulaması
  → Bağlı hesap: BirKare access token (bellek) + refresh token (Expo SecureStore)
  → Yeni hesap: 10 dk. geçerli, tek kullanımlık opaque `pendingToken`
  → `POST /v1/auth/social/complete` ile ad, soyad, doğum tarihi ve zorunlu onaylar
  → BirKare hesabı + oturumu
```

Backend kullanıcı kimliği olarak e-posta değil Google'ın değişmeyen `sub` değerini kullanır. OAuth
client secret mobil uygulamaya hiç girmez ve backend de native ID-token doğrulamasında buna ihtiyaç
duymaz. Yeni bir sosyal hesap için onaylar tamamlanmadan oturum açılmaz; önceden aynı e-posta ile
oluşturulmuş şifre hesabı varsa Google hesabı otomatik bağlanmaz. Kullanıcı önce kendi hesabıyla giriş
yapıp `POST /v1/auth/google/link` aracılığıyla açıkça bağlamalıdır.

## Apple ve e-posta için sonraki ayar

- Apple: Apple Developer hesabında aynı Bundle ID için **Sign in with Apple** yeteneğini açacağız.
  `ios.usesAppleSignIn` proje yapılandırmasına eklendi; bunun çalışması için yeni bir EAS iOS build gerekir.
- E-posta kodu: Resend + mevcut BullMQ kuyruğunu kullanacağız. Önce gönderici alan adını doğrular,
  ardından API anahtarını yalnızca sunucunun secret ayarına koyarız.
