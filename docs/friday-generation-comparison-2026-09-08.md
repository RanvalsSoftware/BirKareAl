# Cuma gününden bugüne üretim karşılaştırması

> Sonraki inceleme: 8 Eylül 16:03 Türkiye saatindeki yeni işte gerçek bir **aşama/Prisma enum uyumsuzluğu** bulundu ve düzeltildi. Aşağıdaki ilk karşılaştırma tarihsel bulguları korur; güncel olay ve backend yeniden başlatma kaydı için [sonraki incelemeye](generation-finalization-incident-2026-09-08.md) bakın.

İnceleme: 8 Eylül 2026. Karşılaştırılan cuma: 4 Eylül 2026. Saatler aksi belirtilmedikçe UTC'dir; Türkiye saati için 3 saat eklenir.

## Sonuç

İki ayrı sorun var:

1. Önceki iki fotoğraflı üretim OpenAI tarafından **çıktı aşamasında** `moderation_blocked` ile reddedilmiş. Sağlayıcı ayrıntılı kategori bildirmedi; nedenin kesin olarak prompt veya fotoğraf olduğunu söyleyemiyoruz.
2. İnceleme sırasındaki eski backend anahtarı HTTP **401 / invalid_api_key** döndürdü. Bu, en yeni denemenin ön moderasyonda durmasıyla uyumlu bir erişim sorunu; içerik reddi değil. Kullanıcının verdiği yeni anahtar yalnızca backend `.env` dosyasına uygulandı. Yeni anahtarla erişim ve onaylı tek metinden görsel üretim testi başarılı.

401 sonucunu önceki tüm hatalara uygulamak doğru değildir. Anahtarın ne zaman geçersizleştiği bilinmiyor. Sohbette paylaşılmış anahtar yeniden iptal edilip, yenisi sohbet dışında backend ortamına kaydedilmelidir.

## Cuma ile ne değişmiş?

Çalışma dizininde `.git` bulunmadığından commit bazında karşılaştırma yapılamadı. Aşağıdakiler saklanan üretim kayıtları, derlenmiş promptların sunucu tarafından eklenen bölümleri, çalışma zamanı ayarları ve sağlayıcı loglarından elde edildi.

| Alan                  | 4 Eylül başarılı kayıtları     | 8 Eylül başarısız kayıtları                                              |
| --------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| Model                 | `gpt-image-1-mini`             | `gpt-image-1-mini`                                                       |
| Kalite / oran         | `PREVIEW`, `4:5`               | `PREVIEW`, `4:5`                                                         |
| Çıktı biçimi          | JPEG                           | Mevcut sağlayıcı da JPEG istiyor                                         |
| Prompt sürümü         | `2026-09-v2`                   | `2026-09-intensity-v4`                                                   |
| Örnek prompt uzunluğu | 2.244 / 2.261 karakter         | Güzellik: 2.579 / 3.895; K-pop: 2.974 karakter                           |
| Kaynak dosya          | PNG, 2.134.980 bayt            | Önceki retlerde JPEG, 63.326 bayt; en yeni denemede JPEG, 5.362.641 bayt |
| İşlem                 | AI filtre / profesyonel portre | Farklı güzellik katmanları / K-pop dönüşümü                              |

Önemli ayrımlar:

- Aynı mini model cuma günü zaten çalışıyordu; model veya JPEG çıktısının yeni bir değişiklik olduğu iddiası doğrulanmadı.
- Cuma promptlarında da ikincil karakter, ünlü eklememe ve anatomi kuralları vardı. Bunların tamamının sonradan eklendiği söylenemez.
- Fotoğraflar ve seçilen işlemler farklı. Bu karşılaştırma kontrollü A/B testi değildir; daha uzun prompt veya daha küçük dosya tek başına ret nedeni sayılmaz.

## Kayıt izi

| Zaman / kayıt                                         | Kanıt                                                                                                                                                       |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4 Eylül 16:24, `1a10986e-1610-43f4-8765-fd20ebe7bb2e` | Mini modelle AI filtre tamamlandı; yaklaşık 28 saniye üretim süresi.                                                                                        |
| 4 Eylül 15:51, `93a8096d-db29-4873-b13f-6c57e531dbd7` | Mini modelle profesyonel portre tamamlandı; yaklaşık 20 saniye üretim süresi.                                                                               |
| 7 Eylül 17:49, iki sahne denemesi                     | `GENERATION_PROVIDER_FAILURE`; eski kayıtlarda gerçek sağlayıcı hata kodu yok. Sonradan kesin olarak moderasyon veya anahtar hatası diye sınıflandırılamaz. |
| 8 Eylül 09:28, `57b743ea-7368-40d0-949e-782fc4a12086` | HTTP 400, `moderation_blocked`, `image_generation_user_error`, aşama `output`, kategori listesi boş. İstek: `req_80682dcf8b564c03ab305e3cf3d143a0`.         |
| 8 Eylül 09:35, `64b480d6-0c90-46ad-ad3c-99092d199864` | Aynı çıktı reddi; kategori listesi boş. İstek: `req_ca6d09332ab54a6184f505b3f2efa50e`.                                                                      |
| 8 Eylül 12:30, `9c0e0678-2afa-4766-a987-cb115a18e6fc` | Üretim başlamadan `MODERATION_UNAVAILABLE`; derlenmiş prompt yok. Aynı incelemede eski anahtar erişimi 401 döndürdü.                                        |

Son üç kaydın her birinde 1 kredi ayrılmış, 1 kredi iade edilmiş ve 0 kredi tahsil edilmiştir. Eski işler yeniden kuyruğa alınmadı, hesap/kredi kayıtları bu incelemede değiştirilmedi.

## Uygulanan düzeltmeler

- Yeni anahtar sadece kökteki backend `.env` dosyasına yazıldı; dosya izinleri `600`. Mobil bundle'a anahtar eklenmedi.
- Yerel API ve worker yeni ortam ve kodla yeniden oluşturuldu. Veritabanı/volume silinmedi. Bu işlem staging veya production yayını değildir.
- Ön moderasyondaki 401, 403, model erişimi, kota ve hız sınırı hataları uygun teknik hata kodlarıyla ayrılıyor. Anahtar hatası kullanıcı fotoğrafını suçlamıyor.
- Moderasyon hizmeti kapalı/erişilemezse üretim güvenli biçimde duruyor; bu durum içerik reddi olarak işaretlenmiyor.
- Promptlarda kişi sayısı kuralları işlem kapsamına göre düzenlendi: yerel düzenlemelerde mevcut kişiler korunuyor; izinli ikincil karakter sahnesinde kişi ekleme talimatıyla çelişen genel kural kaldırıldı. Açıkça istenen cinsiyet görünümü dönüşümündeki sakal düzenleme talimatı ile genel sakalı koruma kuralı uyumlu hale getirildi. Hak/izin kontrolleri korunuyor.
- Yeni derlenen üretimler `2026-09-scope-v5` olarak kaydediliyor. Prompt düzeltmeleri kalite/tutarlılık düzeltmesidir; önceki retlerin kesin çözümü olduğu iddia edilmez.
- Model değiştirilmedi, Images `moderation: auto` korundu; ret sonrası otomatik yeniden üretim eklenmedi.
- Docker bağlamından ek ortam dosyaları ve imzalama anahtarları dışlandı.

## Doğrulama

- Yeni anahtarla model erişimi: HTTP 200; yeniden başlatılan worker da aynı modele erişti.
- Sabit, kişisel veri içermeyen metin için ön moderasyon: HTTP 200, `flagged: false`.
- Kullanıcının açık onayıyla **yalnızca bir ücretli test**: “ahşap masada seramik kupa” açıklamasıyla metinden üretim; fotoğraf gönderilmedi. `gpt-image-1-mini`, düşük kalite, `1024x1024`, `moderation: auto`, otomatik yeniden deneme kapalı.
- Sonuç: **16.708 ms**, 1 JPEG, **66.690 bayt**; JPEG dosya imzası doğrulandı. İstek: `req_708dc30a56a24e4b990ee6bc87896976`. Görsel diske/projelere kaydedilmedi ve görsel kalite incelemesi yapılmadı. Uygulama kredisi kullanılmadı.
- API testleri: **82/82 geçti**. API, worker ve AI paketi TypeScript kontrolleri geçti. Değişen kodların biçim kontrolü geçti.
- Yenilenen yerel API readiness kontrolü: HTTP 200. Worker yeni prompt sürümü ve teknik hata ayrımıyla çalışıyor.

Bu test model ve anahtarın şu anda görsel üretebildiğini kanıtlar. Kullanıcının aynı fotoğrafıyla düzenlemenin veya mobil uçtan uca akışın geçtiğini kanıtlamaz; önceki çıktı reddini geçersiz kılmaz.

## Tanılama komutu

`apps/worker` dizininde:

```sh
node --env-file=../../.env --import tsx scripts/diagnose-image-provider.ts
```

Varsayılan çalışma görsel üretmez; model erişimini ve sabit metin moderasyonunu kontrol eder. Yalnızca güvenli hata meta bilgileri yazılır; anahtar veya ham SDK hatası yazılmaz. `--generate-smoke` ücretli tek metinden görsel üretim çağrısı ekler; yeniden kullanmadan önce ücretli test için yeni kullanıcı onayı alınmalıdır.

## Ayrı olarak takip edilecek dayanıklılık riskleri

İzole hata enjeksiyonunda kredi finalizasyonuna ilişkin iki farklı kenar durum görüldü: hata işlenirken kredi iadesi de başarısız olursa iş ilerleme aşamasında kalabiliyor; kredi tahsilatından sonra tamamlandı kaydı başarısız olursa işin muhasebe özetiyle cüzdan uyuşmayabiliyor. Bu olayların yukarıdaki gerçek retlerde yaşandığına dair kanıt yok; incelenen retlerin iadeleri doğru. Bu incelemede finansal akışa veya mevcut kredi kayıtlarına müdahale edilmedi. Yayın öncesinde ayrı atomiklik/yeniden deneme testleriyle ele alınmalıdır.

## Sağlayıcı belgeleri

- OpenAI [görsel üretimi ve engellenen isteklerin işlenmesi](https://developers.openai.com/api/docs/guides/image-generation): `moderation_blocked` ile teknik hataları ayırma, isteğe bağlı giriş/çıktı aşaması bilgisi. Ön kontrolün geçmesi ayrı çıktı kontrolünün de geçeceği anlamına gelmez.
- OpenAI [API hata kodları](https://developers.openai.com/api/docs/guides/error-codes): kimlik doğrulama, kota ve hız sınırı hatalarının ayrımı.
