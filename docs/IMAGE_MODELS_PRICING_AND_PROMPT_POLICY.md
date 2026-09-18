# BirKare AI — Görsel modelleri, kredi ve kârlılık politikası

Son güncelleme: 15 Eylül 2026

## Uygulanan karar

BirKare iki kontrollü model hattı kullanır:

| İşlem                      | Model hattı            | Kalite | Kredi |
| -------------------------- | ---------------------- | ------ | ----: |
| Hızlı önizleme             | GPT-Image-2.5 Flare    | low    |     1 |
| Normal standart üretim     | GPT-Image-2.5 Flare    | medium |     4 |
| Hassas standart düzenleme  | GPT-Image-2.5 Sunburst | medium |     6 |
| Normal HD üretim           | GPT-Image-2.5 Flare    | high   |     7 |
| Hassas Premium HD          | GPT-Image-2.5 Sunburst | high   |    10 |
| Filtre                     | temel bedele ek        | —      |    +1 |
| Sahne                      | temel bedele ek        | —      |    +1 |
| Akım / trend               | temel bedele ek        | —      |    +2 |
| Kurgusal/lisanslı karakter | temel bedele ek        | —      |    +2 |
| Standart güzellik          | temel bedele ek        | —      |    +1 |
| Premium güzellik           | temel bedele ek        | —      |    +2 |
| Pro portre                 | temel bedele ek        | —      |    +2 |
| Yüz ve kimlik koruma       | her üretime dahil      | —      |     0 |

Sunburst hattı yalnız backend tarafından seçilir. `STANDARD` veya `HD` isteğinde tam sahne (`FULL_SCENE`), akım/trend, güzellik düzenlemesi, cinsiyet görünümü dönüşümü, Pro portre ya da seçilmiş karakter varsa hassas hat kullanılır. `PREVIEW` her durumda Flare ile kalır. Mobil uygulama model adı veya `premiumModel` bayrağı gönderemez.

Ekler seçildikleri her çıktı için bir kez hesaplanır; dört görsel üretiminde hem temel hem de ek bedel dörtle çarpılır. Birbirinin yerine geçen akım, beauty ve normal filtre katmanları aynı seçim için üst üste yazılmaz. Örneğin Premium HD sahne + filtre + karakter `10 + 1 + 1 + 2 = 14 kredi`; Premium HD Pro portre `10 + 2 = 12 kredi` olur. Yüz ve kimlik koruması hiçbir zaman gizli ek bedel üretmez.

## Güncel model karşılaştırması

| Model                    | Durum                    | Güçlü olduğu yer                                  | BirKare kararı                                |
| ------------------------ | ------------------------ | ------------------------------------------------- | --------------------------------------------- |
| `gpt-image-2.5-flare`    | Güncel                   | Hızlı, yüksek kaliteli günlük üretim ve düzenleme | Önizleme ve normal filtre hattı                |
| `gpt-image-2.5-sunburst` | Güncel                   | En yüksek düzenleme hassasiyeti ve talimata uyum  | Standart/HD sahne, akım ve kimlik hassas işler |
| `gpt-image-2`            | Güncel ama önceki nesil  | Esnek boyut ve daha düşük token birim fiyatı      | Geri dönüş seçeneği; varsayılan değil         |
| `gpt-image-1.5`          | Kullanımdan kaldırılıyor | Önceki nesil üretim/düzenleme                     | Yeni üretimde kullanılmaz                     |
| `gpt-image-1-mini`       | Kullanımdan kaldırılıyor | Eski düşük maliyetli görsel modeli                | Kalite ve yaşam döngüsü nedeniyle kullanılmaz |
| DALL·E 2 / DALL·E 3      | Kullanımdan kaldırılıyor | Eski üretim hattı                                 | Kullanılmaz                                   |

`gpt-image-2-mini`, `gpt-image-3-mini` ve `gpt-image-4-mini` adlı kullanılabilir görsel üretim modelleri yoktur. GPT-4o Mini veya GPT-5 Mini gibi genel modeller görsel anlayabilir ama BirKare'nin görsel çıktı motorunun yerine geçmez.

Resmî OpenAI belgelerine göre Flare hızlı günlük üretim, Sunburst ise düzenleme hassasiyeti için konumlandırılır. İkisi de `low`, `medium`, `high`, `xhigh`, `max` ve `auto` kalite seçeneklerini destekler. BirKare maliyetin öngörülebilir kalması için yalnız `low`, `medium` ve `high` kullanır.

Kaynaklar:

- https://developers.openai.com/api/docs/models/gpt-image-2.5-flare
- https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst
- https://developers.openai.com/api/docs/guides/image-generation
- https://developers.openai.com/api/docs/pricing
- https://developers.openai.com/api/docs/models/all

## OpenAI maliyeti nasıl ölçülecek?

Flare ve Sunburst için resmî token fiyatları aynıdır:

| Kalem                     | 1 milyon token |
| ------------------------- | -------------: |
| Metin girdisi             |             $5 |
| Önbellekli metin girdisi  |          $1,25 |
| Görsel girdisi            |             $8 |
| Önbellekli görsel girdisi |             $2 |
| Görsel çıktısı            |            $30 |

Aynı birim fiyat, iki modelin aynı istekte mutlaka aynı toplam tokenı kullanacağı anlamına gelmez. Kesin işlem maliyeti; kaynak görsel boyutu, çıktı boyutu, kalite, kaynak görsel sayısı ve gerçek `usage` değerine bağlıdır. Bu nedenle uygulama her tamamlanan üretimde model adıyla birlikte `inputTokens` ve `outputTokens` değerlerini saklar. OpenAI'nin örnek hesaplayıcısındaki düşük kalite örneği 196 çıktı tokenı, yani yalnız görsel çıktısı için $0,00588'dir; girdi tokenları buna dahil değildir.

İş planında kredi başına **₺1,10 maliyet rezervi** kullanılır. Bu OpenAI fiyatı değil; model kullanımı, kaynak görsel, olası iade, depolama ve küçük operasyon tamponu için BirKare'nin iç bütçe katsayısıdır. İlk 500 gerçek ücretli üretimden sonra gerçek `usage` verisiyle yeniden kalibre edilmelidir.

## Abonelik ve ek kredi fiyatları

| Paket          | Hedef mağaza fiyatı |     Kredi politikası |
| -------------- | ------------------: | -------------------: |
| Aylık Pro      |        ₺299,99 / ay |          80 kredi/ay |
| Yıllık Pro     |     ₺2.499,99 / yıl | 80 kredi/ay, 960/yıl |
| Ömür Boyu Pro  | ₺4.999,99 tek ödeme |    Bir kez 200 kredi |
| Ek kredi küçük |              ₺99,99 |             20 kredi |
| Ek kredi orta  |             ₺249,99 |             60 kredi |
| Ek kredi büyük |             ₺499,99 |            150 kredi |

Ömür boyu plan sınırsız üretim veya aylık kredi vermez. Kalıcı Pro özellikleri ve bir kez 200 kredi verir. Fiyatın gerçek kaynağı App Store/Google Play ve RevenueCat `product.priceString` değeridir; kod sabit fiyatı satın alma kanıtı olarak kabul etmez.

### Paketlerin üretim karşılığı

|                  Kredi | Flare standart (4) | Standart filtre (5) | Sunburst beauty (7) | Sunburst HD akım (12) | Premium HD sahne + filtre + karakter (14) |
| ---------------------: | -----------------: | ------------------: | ------------------: | -------------------: | ----------------------------------------: |
|               80 aylık |                 20 |                  16 |                  11 |                    6 |                                         5 |
|             960 yıllık |                240 |                 192 |                 137 |                   80 |                                        68 |
| 200 lifetime başlangıç |                 50 |                  40 |                  28 |                   16 |                                        14 |

## Katkı payı rezerv tablosu

Aşağıdaki tablo vergi hariç nihai muhasebe sonucu değildir. Mağaza kesintisi ve kredi başına ₺1,10 iç maliyet rezervinden sonra sunucu, destek, pazarlama, vergi ve diğer giderler için kalan alanı gösterir.

| Paket                    | %15 mağaza sonrası | Kredi rezervi | Kalan katkı alanı |
| ------------------------ | -----------------: | ------------: | ----------------: |
| Aylık ₺299,99 / 80       |            ₺254,99 |        ₺88,00 |           ₺166,99 |
| Yıllık ₺2.499,99 / 960   |          ₺2.124,99 |     ₺1.056,00 |         ₺1.068,99 |
| Lifetime ₺4.999,99 / 200 |          ₺4.249,99 |       ₺220,00 |         ₺4.029,99 |
| 20 kredi / ₺99,99        |             ₺84,99 |        ₺22,00 |            ₺62,99 |
| 60 kredi / ₺249,99       |            ₺212,49 |        ₺66,00 |           ₺146,49 |
| 150 kredi / ₺499,99      |            ₺424,99 |       ₺165,00 |           ₺259,99 |

%30 mağaza kesintili stres senaryosunda model/operasyon rezervi sonrası kalan alan sırasıyla aylıkta yaklaşık ₺121,99, yıllıkta ₺693,99 ve lifetime pakette ₺3.279,99 olur.

## Prompt ve filtre denetimi

Kod tabanında şu kapsam ayrı ve sunucu tarafında derlenir:

- 11 sahnenin her biri kendine ait ortam, ışık ve kompozisyon talimatına sahiptir.
- 13 filtre/stil için düşük, orta ve yüksek yoğunluk birbirinden farklıdır; toplam 39 yoğunluk yönü test edilir.
- 11 akımın her birinde sahne, kıyafet, kamera ve ışık ayrı tarif edilir; kamera/poz yönleri kaynak fotoğraftaki görünür anatomi ve kadrajla sınırlandırılır.
- 7 güzellik ayarı ve 3 makyaj seçeneği toplam 10 farklı prompt üretir.
- Arka plan değiştir, ışığı düzelt, profesyonel portre ve fotoğrafı genişlet araçlarında mobil istemci model promptu göndermez; yalnız allowlist `toolPreset` kimliği gönderir ve gerçek edit talimatı backend'de derlenir.
- Kullanıcı metni en fazla 1000 karakterdir ve kimlik, anatomi, güvenlik, model ya da çıktı kurallarını geçersiz kılamaz.
- Kaynak kişi, kişi sayısı, yüz geometrisi, ten tonu, belirgin işaretler ve gerçekçi anatomi korunur.
- Sıfır yoğunlukta seçili trend uygulanmaz; düşük/orta/yüksek yoğunluk gerçekten farklı talimat üretir.
- Worker ücretli görsel isteğini otomatik tekrar etmez. Başarısız/engellenmiş işte ayrılan kredi idempotent olarak iade edilir.

Standart/HD tam sahne ve akım üretimleri hassas Sunburst hattına geçtiği için temel üretim bedeli premium tablodan hesaplanır: örneğin Standart tam sahne (ek filtresiz) `6 + 1 = 7`, HD tam sahne `10 + 1 = 11`, Standart akım `6 + 2 = 8`, HD akım `10 + 2 = 12` kredidir. Preview aynı seçimlerde Flare/low kalır.

Filtrenin adı fiyatı değiştirmez; uygulanan her normal filtre çıktı başına `+1` kredidir. Akım (`+2`) veya beauty (`+1`/`+2`) seçimi aynı doğal-ışık adaptörünü kullandığında ayrıca filtre bedeli eklenmez. Sahne ve karakter gibi gerçekten birlikte uygulanabilen seçimler ayrı kalemler olarak eklenir. Kullanıcı yalnızca kart veya slider seçerken kredi harcamaz; backend teklifi onaylanıp üretim kaydı oluşturulurken toplam tutar atomik olarak ayrılır.

## Üretim başlangıcı ve hata önleme kuralları

1. API katalog, hak, güzellik/trend uyumu ve özgün kaynak görseli doğrular.
2. Model hattı backend tarafından belirlenir ve kredi teklifi aynı kararla hesaplanır.
3. Kredi atomik ve idempotent olarak ayrılır.
4. Üretim kaydına immutable seçim snapshot'ı, model, prompt sürümü ve ayrılan kredi yazılır.
5. İş kuyruğa yalnız kimlikler ile gönderilir; fotoğraf veya prompt queue payload'ına konmaz.
6. Worker kaynak ve katalog seçimlerini tekrar doğrular, girdiyi modere eder ve tek ücretli isteği seçilmiş modele gönderir.
7. Sonuç doğrulanıp özel depolamaya yazıldıktan sonra kredi tahsil edilir.
8. Sağlayıcı, güvenlik, kota veya geçersiz çıktı hatasında sonuç kaydedilmez ve ayrılan kredi bir kez iade edilir.

## Yayına alma kontrolü

- Runtime: `OPENAI_IMAGE_MODEL=gpt-image-2.5-flare`
- Runtime: `OPENAI_IMAGE_PREMIUM_MODEL=gpt-image-2.5-sunburst`
- RevenueCat yıllık kredi: `REVENUECAT_ANNUAL_MONTHLY_CREDITS=80`
- RevenueCat/App Store/Play Console fiyatları bu belgedeki hedeflerle elle eşleştirilir.
- Canlıdan önce her iki model için salt-okunur model erişim testi yapılır.
- Ardından kişisel fotoğraf içermeyen tek düşük kaliteli smoke üretimi ve sandbox satın alma/restore testi yapılır.
- İlk 500 üretimde model, kalite, en-boy oranı, kaynak sayısı, latency, güvenlik sonucu, input/output token ve net başarı maliyeti izlenir.
