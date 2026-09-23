# BirKare — Yeni kayıt e-posta politikası ve hesap geri alma

Güncelleme: 23 Eylül 2026.

## Karar ve kapsam

20 Eylül tarihli e-posta güvenliği planı gerçek kurumsal adresleri kabul ediyordu. Ürün sahibinin yeni talebi bu kararı değiştirmiştir: **yeni hesaplar yalnızca kodda tanımlanan bilinen sağlayıcılardan açılır.** Bu bir ürün politikasıdır; tek başına sahte hesabı önleme veya mevzuata uygunluk garantisi değildir.

Kaynak: `apps/api/src/modules/auth/email-provider-policy.ts`.

- Gmail: `gmail.com`, `googlemail.com`.
- Microsoft: `outlook.com`, `hotmail.com`, `live.com`, `msn.com`.
- Yahoo: `yahoo.com`, `yahoo.co.uk`.
- Apple: `icloud.com`, `me.com`, `mac.com`; Sign in with Apple için `privaterelay.appleid.com`.
- Yandex: `yandex.com`, `yandex.ru`.
- Proton: `proton.me`, `protonmail.com`.
- Diğer desteklenenler: `zoho.com`, `mail.ru`, `gmx.com`, `gmx.de`, `aol.com`.

Liste tam alan adı eşleşmesi kullanır; alt alan adları veya `gmail.com.evil.com` gibi sonuna başka alan adı eklenen değerler kabul edilmez. Bölgesel uzantılar otomatik olarak kabul edilmez. `EMAIL_DOMAIN_ALLOWLIST` yalnız disposable-list yanlış pozitiflerini düzeltir; kurumsal alan adı eklemek yeni kayıt sağlayıcı kuralını aşmaz. `NODE_ENV=test` için ayrılmış `.test` fixture istisnası development/staging/production ortamlarında kapalıdır.

Format, typo, disposable, MX, rate limit ve sahiplik doğrulaması korunur. Parolalı kayıt OTP doğrulamasından önce etkinleşmez veya hoş geldin kredisi almaz. Sosyal kayıtta backend sağlayıcı kimliğini doğrular ve aynı yeni-kayıt alan adı kuralını uygular; eski bir sosyal kayıt handoff'u hesap oluşturulurken yeniden denetlenir.

## Mevcut hesaplar etkilenmez

Var olan hesabın parola girişi, bağlı Google/Apple kimliği, doğrulama tekrar gönderimi ve hesap geri alma akışı yeni-kayıt sağlayıcı filtresinden geçmez. Eski kurumsal hesaplar bu değişiklik yüzünden kilitlenmez. Google/Apple kimliği e-posta benzerliğiyle değil, zaten bağlı değişmez sağlayıcı subject değeriyle eşleştirilir. Bu eşleşme güvenlik kontrolü kaldırılmamıştır.

## Silme ve 30 günlük geri alma

30 gün BirKare'nin seçilmiş ürün politikasıdır; bütün mağazalar veya ülkeler için zorunlu ya da otomatik olarak hukuka uygun bir süre iddiası değildir. Silme isteğinde hesabın erişimi kapatılır ve oturumlar iptal edilir. Hesap `DELETION_PENDING` durumundayken ve geçerli geri alma süresi bitmemişken:

1. Google/Apple tekrar doğrulanır.
2. API normal oturum yerine `deletionRecoveryRequired`, `recoveryDays: 30`, `recoveryUntil` döndürür; access/refresh token verilmez.
3. Hem giriş ekranındaki hem kayıt ekranındaki Google akışı, giriş sayfası üzerinde aynı blur'lu geri alma penceresine ulaşır.
4. Kullanıcı açıkça “Hesabı geri getir” derse yeniden doğrulanan kimlikle hesap etkinleşir, yeni oturum açılır. Eski oturumlar açılmaz ve yeni hoş geldin kredisi verilmez.
5. “Silme işlemine devam et” veya pencereyi kapatma, takvimi sıfırlamaz ya da hesabı etkinleştirmez.

Parolalı girişte mevcut `AUTH_ACCOUNT_DELETION_PENDING` hata bilgisi de aynı pencereye bağlanır. Askıya alınmış veya kalıcı silinmiş hesaplar geri alma penceresiyle etkinleştirilemez. Kalıcı olarak silinmiş veri yeniden mobil build alarak geri getirilemez. Eski kayıtlarda yalnızca mevcut kodun izin verdiği, silme zamanı belli olan pending kayıtların uyumluluk akışı vardır; eksik veriye sahte geri yükleme yapılmaz.

Kaynaklar: `auth.service.ts`, `register.tsx`, `login.tsx`, `deletion-recovery-handoff.ts`. Ekranlar arasında taşınan kimlik belirteci yalnız bir kullanımlık, en fazla beş dakikalık bellekte tutulur; URL, route parametresi, kalıcı depolama veya log'a yazılmaz.

## Yerel ortamda çalışan kodu kanıtla

Repo kökünde:

```bash
pnpm dev:local:check
```

Bu komut salt okunurdur. Root `.env` mobil adresini ve `http://localhost:4000/health` cevabını denetler. Beklenen değerler:

```json
{
  "authProtocol": "2026-09-23-email-recovery-v1",
  "emailRegistrationPolicy": "known-providers-v1",
  "accountDeletionRecoveryDays": 30
}
```

Bu alanlar yoksa 4000 portunda eski API çalışıyordur veya istek başka bir servise gidiyordur. Komut Mac'te dinleyen süreci ve varsa portu yayınlayan Docker container'ını gösterir; hiçbir süreci öldürmez ve veritabanını değiştirmez. Docker API image'i kullanılıyorsa yalnız `git pull` veya Metro'yu yeniden başlatmak container kodunu güncellemez. Aynı portta ikinci API açma; mevcut çalıştırma yöntemindeki API'yi güncelle.

Kaynak üzerinden çalıştırılan API için güncel kodu çekip bağımlılıkları kurduktan sonra kendi API terminalini yeniden başlat:

```bash
pnpm dev:api
```

Kontrol başarılıysa ikinci terminalde:

```bash
pnpm dev:mobile:local
```

Bu komut Expo Go değil `expo start --dev-client --clear` kullanır. Bu değişiklik native bağımlılık eklemez. Memory repository yeniden başlayınca test hesapları kaybolur; kalıcı testler için izole yerel PostgreSQL kullan. iOS uygulamasını kaldırmak Keychain/SecureStore verilerinin mutlaka silindiği anlamına gelmez.

403 tek başına kök sebebi açıklamaz. Güncel development kodunda `[BirKare Auth] API rejected Google exchange` satırı yalnız güvenli `code`, `status`, `requestId` alanlarını gösterir. Token veya şifre paylaşılmamalıdır. `AUTH_ACCOUNT_SUSPENDED`, `AUTH_ACCOUNT_DELETION_RECOVERY_UNAVAILABLE`, ağ hataları ve eski API sürümü ayrı değerlendirilmelidir; bütün 403 cevapları başarıya çevrilmez.

## Testler

`email-security.service.test.ts`: tam sağlayıcı listesi, kurumsal adres reddi, alt alan adı yanıltmaları, allowlist ile aşmayı önleme, MX sorunları, mevcut hesapların erişimi ve rate limit.

`auth.registration-recovery.test.ts`: yeni parola/Google/Apple kayıtlarına aynı politika; eski handoff reddi; OTP öncesi kredi verilmemesi; gerçek Express HTTP akışında giriş → DELETE → seçim → açık onayla geri alma; eski token'ın geçersiz kalması ve kredi tekrarının önlenmesi. CI'da aynı HTTP testi ayrı geçici PostgreSQL veritabanıyla da çalışır. Google/Apple sağlayıcı ağ çağrıları kontrollü test doğrulayıcılarıyla temsil edilir; bu test mağaza konsollarını veya gerçek OAuth sağlayıcı bağlantısını doğrulamaz.

`deletion-recovery-handoff.test.ts`: tek kullanım, zaman aşımı ve rastgele 403'ün geri alma durumuna dönüştürülmemesi. Native cihaz görünümü ayrıca Simulator/telefon üzerinde denenmelidir.

## E-posta teslimatı ve yayın sınırı

Bilinen sağlayıcı uzantısı mailbox sahipliğini veya SMTP teslimatını garanti etmez. OTP/link gönderimi mevcut SMTP yapılandırmasına bağlıdır. Apple Private Relay için gönderen adresinin Apple Developer'da kayıtlı olması ve SPF/DKIM doğrulaması ayrıca kontrol edilmelidir. GitHub commit'i yerel API, Portainer image'i, EAS binary'si veya web sitesinin otomatik deploy edildiği anlamına gelmez.

Resmî referanslar:
- https://developer.apple.com/support/offering-account-deletion-in-your-app/
- https://developer.apple.com/help/account/capabilities/configure-private-email-relay-service/
- https://support.google.com/googleplay/android-developer/answer/13327111?hl=en
- https://docs.expo.dev/versions/latest/sdk/securestore/
