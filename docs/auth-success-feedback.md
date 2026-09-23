# Geçici kayıt ve doğrulama bildirimleri

23 Eylül 2026

## Düzeltilen davranışlar

- Giriş ekranı `verified=1` parametresini kalıcı görünürlük olarak kullanmaz. İpucu bir kez tüketilir (`verified=0`) ve bağımsız bildirim en fazla 4 saniye gösterilir. Ekrandan ayrılma, kapatma düğmesi veya yeni giriş işlemi bildirimi kaldırır. E-posta alanı korunur; bildirim hiçbir zaman oturum açmaz.
- Başarılı kayıt, 1,4 saniyelik yapay bekleme ve kalıcı `registrationSuccess` durumu yerine doğrudan doğrulama ekranına geçer (`replace`). Bu ekranda tek kullanımlık `registered=1` bildirimi gösterilir. Kodla sahiplik doğrulaması hâlâ zorunludur; kredi/oturum mantığı değişmez.
- OTP doğrulaması sonrası mevcut başarı animasyonu korunur. Otomatik giriş ekranı geçişi animasyonun tamamlanmasına bağlı değildir. Kullanıcı ayrıca “Giriş ekranına geç” düğmesine basabilir; aynı geçiş iki kez çalışmaz. Ekran odak dışına çıktığında geçiş zamanlayıcısı iptal edilir.
- Kod tekrar gönderme ve şifre sıfırlama bağlantısı isteğinin geri bildirimi de 4 saniye sonra kapanır. Aynı başarılı işlem tekrar edildiğinde süre yeniden başlar. Şifre sıfırlama isteğinde API hatası artık formun `isSubmitSuccessful` durumuyla başarı sayılmaz. Mevcut genel kabul mesajı korunur; SMTP teslim edildi iddiası eklenmez.
- Bekleyen silme hesabının geri alma diyaloğu, doğrulama süresi, sağlayıcı listesi, abonelik ve backend değişmedi.

## Test

`use-auth-notice.test.ts`: otomatik kapanma, aynı mesajın yeniden gösterimi, elle kapatma, ilgisiz render, blur/yeniden odaklanma, unmount, route parametresinin bir kez tüketilmesi.

Geliştirme istemcisiyle kontrol:

1. Kayıt ol → doğrulama ekranı hemen açılsın; kayıt bildirimi 4 saniye içinde kapansın.
2. Doğru OTP → başarı animasyonu → giriş; yeşil “E-posta doğrulandı” bildirimi 4 saniye sonra kapansın.
3. Yeşil bildirimi X ile kapat; sayfadan çıkıp dön; tekrar görünmesin. E-postanın alanı boşalmasın.
4. Otomatik geçişi beklemeden “Giriş ekranına geç” seç; tek yönlendirme olsun.
5. Şifre sıfırlama isteğini başarılı ve başarısız cevaplarla dene; başarısız cevapta başarı bildirimi çıkmasın.
6. Kod tekrar gönder → bildirim kapansın; sonraki kabul edilen istekte yeniden görünsün.

Bu değişiklik JS/TS arayüz ve zamanlayıcı davranışıdır; native bağımlılık veya backend değiştirmez. Cihaz görünümü ayrıca gerçek development client üzerinde kontrol edilmelidir.
