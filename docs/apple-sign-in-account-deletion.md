# Sign in with Apple ve hesap silme kurulumu

BirKare iOS uygulamasında `expo-apple-authentication`, `usesAppleSignIn: true` ve
`com.apple.developer.applesignin` entitlement zaten bulunur. Aşağıdaki sunucu anahtarı, yalnızca
Apple ile bağlı bir hesap silinirken Apple REST API üzerinden kullanıcı tokenını iptal etmek içindir.

## Apple Developer ayarları

1. Apple Developer → Certificates, Identifiers & Profiles → Identifiers içinde
   `com.birkareai.mobile` App ID'sini açın ve **Sign in with Apple** yeteneğinin etkin olduğunu
   doğrulayın.
2. Keys bölümünde yeni bir anahtar oluşturun, **Sign in with Apple** seçeneğini etkinleştirin ve
   primary App ID olarak `com.birkareai.mobile` seçin.
3. Şunları kaydedin:
   - Team ID: Bu projede `8L26XTZX45` (Xcode signing ayarındaki takım).
   - Key ID: oluşturulan anahtarın 10 karakterli kimliği.
   - `.p8` private key: Apple yalnızca bir kez indirmeye izin verir.
4. `.p8` dosyasını Portainer hostunda örneğin
   `/opt/birkare/secrets/AuthKey_XXXXXXXXXX.p8` yoluna koyun. Dosyayı Git'e, mobil uygulamaya,
   Docker image'a veya Portainer environment metnine yapıştırmayın. Host erişimini yalnız deployment
   operatörüyle sınırlandırın.

## Portainer değişkenleri

```env
APPLE_BUNDLE_ID=com.birkareai.mobile
APPLE_TEAM_ID=8L26XTZX45
APPLE_KEY_ID=XXXXXXXXXX
APPLE_PRIVATE_KEY_HOST_FILE=/opt/birkare/secrets/AuthKey_XXXXXXXXXX.p8
```

Güncel `docker-compose.portainer.yml`, private key'i yalnız API containerına
`/run/secrets/apple-signin-private-key` olarak bağlar. Worker ve mobil uygulama anahtarı almaz.

## Silme akışı

1. Kullanıcı uygulamada `HESABIMI SIL` onayını verir.
2. Apple ile bağlı hesap, iOS sistem Apple giriş ekranıyla yeniden doğrulanır.
3. Mobil uygulama kısa ömürlü identity token ve tek kullanımlık authorization code'u API'ye yollar.
4. API immutable Apple `sub` değerinin mevcut hesaba ait olduğunu ve tokenın güncel olduğunu doğrular.
5. API authorization code'u Apple token endpointinde değiştirir ve dönen tokenı Apple revoke
   endpointinde iptal eder. Bu adım başarısızsa hesap ACTIVE kalır ve silme planlanmaz.
6. Başarılı istekte BirKare oturumları hemen kapanır ve hesap 30 günlük geri alma süresine girer.
7. Kullanıcı bu sürede yeniden doğrulanıp açıkça geri almayı seçebilir. Süre dolunca dosya ve veri
   temizliği otomatik başlar; geçici storage hataları yeniden denenir.

Apple ile bağlı hesaplarda herkese açık e-posta/web silme bağlantısı silme işlemini başlatmaz. Bu
hesaplar, Apple token iptal adımının atlanmaması için BirKare iOS uygulamasında Apple ile yeniden
doğrulanarak silinmelidir.

Apple'ın resmî gereksinimi:
https://developer.apple.com/support/offering-account-deletion-in-your-app/

Token iptal API'si:
https://developer.apple.com/documentation/signinwithapplerestapi/revoke-tokens

## Yayın öncesi kabul testi

- TestFlight build'inde Apple ile yeni bir test hesabı oluşturun.
- Profil → Ayarlar → Gizlilik ve veri → Hesabı sil ekranını açın.
- Apple ile doğrulayıp silme isteğini tamamlayın; uygulamanın login ekranına döndüğünü doğrulayın.
- Eski refresh tokenla korumalı API çağrısının `401` verdiğini doğrulayın.
- 30 gün beklemeden staging verisinde kontrollü bir tarih kullanarak cleanup testini çalıştırın; kaynak
  ve sonuç objelerinin storage'dan, kullanıcı ilişkilerinin DB'den silindiğini doğrulayın.
- Silme sonrası aynı Apple hesabıyla girişte Apple izin ekranının yeniden yetkilendirme isteyebildiğini
  doğrulayın.
- Aktif abonelik varsa uygulamanın mağaza aboneliğinin ayrıca yönetileceğini gösterdiğini doğrulayın.
