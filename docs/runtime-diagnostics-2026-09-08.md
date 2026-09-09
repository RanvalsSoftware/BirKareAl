# Üretim ve Google giriş tanısı — 8 Eylül 2026

**Sonraki güncel bulgu:** 8 Eylül 11:28 Türkiye saatindeki yeni deneme `moderation_blocked` olarak kesinleşti. Ayrıntılar ve yeni ön moderasyon akışı: [Güvenlik tanısı](./moderation-diagnostics-2026-09-08.md). Aşağıdaki ilk inceleme notları daha önceki denemeleri kapsar.

## Doğrulanmış durum

- Yerel API, worker, PostgreSQL ve Redis çalışıyor. API `/health` ve `/ready`: HTTP 200.
- Son iki gerçek görsel denemesi **7 Eylül 2026 20:49 Türkiye saati**. Fotoğraf yükleme ve tamamlama HTTP 200, üretim başlatma HTTP 202. Dolayısıyla bu iki hatanın kaynağı eski `Response.blob()` yüklemesi değil.
- Her iki iş de girdi kontrolünü geçti; `GENERATING` aşamasında yaklaşık 19 ve 13 saniye sonra `GENERATION_PROVIDER_FAILURE` ile sonlandı. İkisinde de ayrılan 2 uygulama kredisi iade edilmiş. Dış sağlayıcının faturalama kayıtları bu incelemede doğrulanmadı.
- Eski worker, dış sağlayıcının gerçek hata kodunu ve istek kimliğini kaydetmiyordu. Bu yüzden geçmiş hatanın kota, güvenlik reddi, bağlantı veya başka bir sağlayıcı reddi olduğu **kesinleşmiş değil**.
- Mevcut `gpt-image-1-mini` modeline salt-okunur erişim HTTP 200; sentetik, kişisel olmayan metin moderasyonu HTTP 200. Bunlar görüntü üretme hesabının bütçe ve görsel erişimini tek başına kanıtlamaz. Yapılandırılmış model değiştirilmedi.
- Yeni ücretli görsel üretilmedi; geçmiş kullanıcı işleri yeniden kuyruğa verilmedi.
- Güncel API ve worker yerelde yeniden başlatıldı; 8 Eylül 11:22 Türkiye saati kontrolünde `/health` ve `/ready` 200, BullMQ worker hazır. Normal Docker build temel imaj indirmesinde beklediği için mevcut yerel runtime imajları üzerine güncel sunucu kaynakları kopyalanarak yerel imajlar oluşturuldu; sunucu bağımlılıkları ve Prisma şeması değiştirilmedi. Bu, temiz staging build doğrulaması değildir; dış yayın öncesi normal Dockerfile ile temiz build yine gereklidir.
- Ayrı bir eski kayıt, **2 Eylül 2026 18:11 Türkiye saati** itibarıyla `QUEUED` durumunda kalmış; 1 kredi ayrılmış, tahsil/iade yok. Karşılık gelen Redis işi mevcut değil. Bu eski kayıt açılırsa durum takibi kendiliğinden tamamlanamaz. Salt-okunur inceleme sırasında kayıt değiştirilmedi; otomatik yeniden ücretli üretim başlatılmamalı. İlgili kullanıcı mevcut iptal düğmesiyle işi sonlandırabilir veya yetkili operasyon kontrollü iptal/iade yapabilir. Bu kayıt 7 Eylül'deki iki sağlayıcı hatasından farklıdır.

## Yapılan düzeltmeler

1. Görsel sağlayıcısı tek istekte en fazla 180 saniye, moderasyon 30 saniye bekler. Kaybolan yanıt sonrası görünmez ikinci bir ücretli üretim oluşmaması için SDK otomatik tekrarları kapalıdır.
2. Sağlayıcı hata türleri ayrılır: kota/bütçe, yoğunluk, zaman aşımı, bağlantı, yapılandırma, geçersiz istek ve güvenlik reddi. Kullanıcıya işlem sonucu ile kredi iadesi açıkça bildirilir.
3. Kayda yalnızca izinli HTTP durumu, hata kodu/türü ve sağlayıcı istek kimliği alınır. Ham SDK hatası, görsel, prompt, token ve yetkilendirme başlıkları kaydedilmez.
4. Mobil API istekleri **yanıt gövdesi okuması dahil** 30 saniyede zaman aşımına uğrar. Durum ekranı sessizce sonsuza kadar dönmek yerine bağlantı uyarısını gösterir; uyarı başarılı durum yanıtı alınana kadar korunur.
5. Geçici ağ kesintisi veya sunucu 503 hatası, geçerli yenileme tokenını artık silmez. Gerçek 400/401/403 oturum reddinde çıkış koruması sürer.
6. Kullanıcının ek açıklaması boşsa moderasyon için boş metin yerine nötr bir ön tanımlı düzenleme açıklaması gönderilir.
7. Soğuk açılan `/beauty` gibi derin bağlantılarda siyah ekranın ayrı bir nedeni bulundu: oturum yükleme yalnızca ana giriş ekranında başlatılıyordu. Oturum artık kök layout üzerinden her giriş yolunda yüklenir; korumalı ekranlar beklerken görünür yükleme durumu gösterir. Geçici açılış bağlantı hatası kayıtlı refresh tokenını silmez.

OpenAI, karmaşık görüntü isteklerinin iki dakikaya kadar sürebileceğini; hataları HTTP durumu, kararlı hata kodu ve istek kimliğiyle incelemeyi önerir. Zaman sınırı buna göre tanımlandı. [Resmî görüntü üretim kılavuzu](https://developers.openai.com/api/docs/guides/image-generation)

## Google: doğrulananlar ve henüz doğrulanamayanlar

- Backend Web/iOS Client ID ile mobil build'in açık istemci kimlikleri eşleşiyor.
- Kurulu iOS uygulamasının paket kimliği `com.birkareai.mobile`; Google dönüş şeması iOS Client ID ile eşleşiyor.
- Google imza anahtarları servisine backend erişimi HTTP 200.
- İncelenen son 24 saatlik API kayıtlarında yeni `/google` giriş isteği yok. Bu, o kayıt aralığında hatanın backend Google doğrulamasına ulaştığının kanıtlanmadığı anlamına gelir; istemci ekranındaki tam hata olmadan Cloud Console ayarının bozuk olduğu söylenemez.
- Android Client ID ortamda boş. Native SDK Web Client ID kullanır; Android paket + imza SHA-1 kayıtları ayrıca Google Cloud üzerinden doğrulanmalıdır. Bu değer tek başına iOS giriş hatasının sebebi değildir.
- Aynı e-posta ile önceden şifreli hesap varsa otomatik hesap birleştirilmez. Önce şifreyle giriş, sonra **Ayarlar → Güvenlik → Google hesabını bağla** gerekir. Bu hesap ele geçirmeyi engelleyen kasıtlı korumadır.

İstemci türü ve dönüş şeması kontrolü [Google'ın resmî iOS kurulum kılavuzuna](https://developers.google.com/identity/sign-in/ios/start-integrating), sunucu doğrulaması da [Google backend authentication kılavuzuna](https://developers.google.com/identity/sign-in/ios/backend-auth) göre incelendi. Cloud Console'daki kayıtların mevcut durumu hesaba erişilmeden doğrulanmış sayılmamalı.

### Güvenli yeniden üretim sırası

1. Yerel backend açıkken güncel development build'i aç; Expo Go Google native SDK'sını içermez.
2. Google ile girişe bir kez dokun. Hata ekranının tam metni/kodu ve deneme saatini kaydet; ID token, erişim tokenı veya şifre paylaşma.
3. Aynı saatte API kayıtlarını incele. İstek hiç gelmiyorsa native SDK, cihaz ağı, OAuth test kullanıcıları ve native build yapılandırması incelenir. İstek geliyorsa API'nin `AUTH_*` kodu esas alınır.
4. `AUTH_SOCIAL_ACCOUNT_LINK_REQUIRED` için yukarıdaki bağlantı akışını kullan. `AUTH_GOOGLE_CLIENT_MISMATCH` için ortam Client ID'larını kontrol et; issuer/audience kontrolünü kapatma.
5. Android'de debug, EAS internal ve Play App Signing sertifikalarının SHA-1 kayıtlarını birbirine karıştırma. iOS Client ID paket kimliğiyle eşleşmelidir.

## Test kapsamı

Eski iş denetimi: 2 Eylül 2026'dan kalan bir `QUEUED` kaydın Redis/BullMQ karşılığı yok; 1 uygulama kredisi hâlâ rezervasyonda. Bu eski kayıt yeni ücretli işe çevrilmedi veya kullanıcı adına iptal edilmedi. Durum ekranı iki dakikayı aşan kuyruk bekleyişini artık açıkça bildirir; mevcut **Üretimi iptal et** işlemini kullanıcı seçerse kontrollü iade yapılır. Son iki gerçek sağlayıcı hatasından ayrı bir durumdur.

- Gerçek SDK, taklit HTTP taşıyıcıyla çalıştırıldı: kota reddinde tek istek, kişisel veri sızdırmayan hata ve doğru model/kanvas doğrulandı.
- İzole bellek deposu + taklit görsel sağlayıcısıyla tam worker akışı: çıktı kaydı, bir defa kredi tahsilatı, kota reddinde bir defa iade ve aynı iş tekrar tesliminde yeniden üretmeme.
- Mobil: yanıt gelmeyen istek ve bitmeyen gövde zaman aşımı; geçici refresh hatasında oturumun korunması; gerçek token reddinde temizlenmesi; başarısızlıkta sahte %100 başarı gösterilmemesi.
- Bu testler ücretli OpenAI görüntü üretimini, kullanıcının gerçek Google hesabıyla girişi veya üretim ortamını başarıyla doğruladığımız anlamına gelmez.
- Son toplu kontrol: **151 mobil test, 58 API testi** başarılı; API testleri güncel Linux imajında da çalıştırıldı. Mobile/API/worker/contracts/database/AI tip kontrolleri ve mobil lint temiz. iOS ve Android Hermes export başarılı; bu sonuç imzalı App Store/AAB build'i değildir. Güzellik ekranı iOS simülatöründe görsel olarak kontrol edildi.
- Export çıktıları: `/tmp/birkare-beauty-export.a7hlyM/ios`, `/tmp/birkare-beauty-export.a7hlyM/android`; geçici çalışma dosyalarıdır, mağaza yayını yapılmadı.
