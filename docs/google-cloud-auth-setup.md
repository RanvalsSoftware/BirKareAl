# BirKare AI — Google ile giriş kurulumu

Bu belge yalnızca BirKare AI mobil uygulamasındaki **Google ile devam et** akışı içindir.
Mevcut proje OpenAI, Cloudflare R2, PostgreSQL ve Redis kullanır; Google Cloud'a OpenAI anahtarı,
service-account JSON'u, Android keystore'u veya kart/billing bilgisi girilmez.

## Önce sabit kalacak uygulama kimlikleri

Bu değerler halihazırda `apps/mobile/app.config.ts` içindedir. Uygulama mağazaya çıktıktan sonra
değiştirmek yeni bir uygulama kimliği oluşturmak anlamına gelir; bu nedenle Google OAuth istemcilerini
bu değerlerle açın.

| Alan                 | Girilecek değer                                               |
| -------------------- | ------------------------------------------------------------- |
| Uygulama adı         | `BirKare AI`                                                  |
| iOS Bundle ID        | `com.birkareai.mobile`                                        |
| Android package name | `com.birkareai.mobile`                                        |
| Android dev SHA-1    | `6C:73:69:5D:32:C6:91:32:40:64:19:E4:36:98:56:E3:DA:B7:C1:B0` |
| Uygulama URL şeması  | `birkareai`                                                   |

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

5. **Clients** bölümünde üç OAuth istemcisi oluşturun.

   | Client type           | Name                     | Girilecek değer                                       | Uygulamadaki kullanım                              |
   | --------------------- | ------------------------ | ----------------------------------------------------- | -------------------------------------------------- |
   | iOS                   | `BirKare AI iOS`         | Bundle ID: `com.birkareai.mobile`                     | iOS Client ID + URL şeması                         |
   | Android (development) | `BirKare AI Android Dev` | Package: `com.birkareai.mobile`; yukarıdaki EAS SHA-1 | Console kaydı yeterli; native SDK ID'yi koda almaz |
   | Web application       | `BirKare AI API`         | Native ID-token akışı için redirect URI eklemeyin     | Sunucu ID-token audience Client ID'si              |

   Production Android paketi için Google Play App Signing etkinleştirildiğinde, Play Console'daki
   **App signing key certificate SHA-1** ile ayrıca bir Android istemcisi açarız. Development ve
   production sertifikalarının SHA-1 değerleri farklı olabilir.

6. EAS ile development Android sertifikasının **yalnızca SHA-1 parmak izini** alın:

   ```bash
   cd apps/mobile
   npx eas-cli@latest credentials -p android
   ```

   Ekrandaki SHA-1'i Android OAuth istemcisine yapıştırın. Keystore dosyasını, keystore parolasını veya
   Google hesabı parolasını göndermeyin.

## Bize iletebileceğiniz güvenli bilgiler

Kurulumdan sonra aşağıdakileri sohbet içinde metin veya ekran görüntüsü olarak gönderebilirsiniz:

```text
Google Cloud project ID (isteğe bağlı)
Google iOS Client ID
Google Web Client ID
Android development SHA-1
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
