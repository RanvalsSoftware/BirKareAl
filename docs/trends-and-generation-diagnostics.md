# Akımlar ve üretim tanılaması — 8 Eylül 2026

## Akım kataloğu

Kaynak: kullanıcının `assets/images/akım` klasöründeki dokuz görseli ve paylaştığı prompt taslağı. Görselsiz `dreamy_soft_idol` eklenmedi. Görseller uygulamada temsilî katalog kapaklarıdır; üretime kaynak fotoğraf olarak gönderilmez.

| Görsel | Sabit backend kimliği | Yön |
| --- | --- | --- |
| kpop.png | kpop_star | Pop sahnesi, üç çeyrek yakın açı, kontrollü pembe/lavanta ışık |
| 80-pop.png | pop_icon_80s | Omuz üstü portre, deri ceket, retro müzik stüdyosu |
| 90-analog.png | analog_90s | Alçak duvarda oturma, doğrudan flaş, analog sokak fotoğrafı |
| celebrity.png | y2k_celebrity | Metalik gece kıyafeti, araç yanında bakış, 2000'ler flaşı |
| kırmızı-halı.png | red_carpet_glam | Özgün davet, yürürken geriye bakış, sıcak ortam ve flaş |
| magazine.png | editorial_cover | Heykelsi kumaş, oturarak poz, yazısız minimal editoryal |
| old-money.png | old_money_portrait | Klasik koltuk, krem/lacivert kıyafet, yan pencere ışığı |
| streetwear.png | streetwear_editorial | Bina köşesinde poz, geniş denim, gece sokak flaşı |
| neon.png | neon_club_night | Yakın selfie, müzik mekânı, nötr yüz dolgulu pembe/mavi ışık |

`packages/ai/src/trend-prompt.ts` her kimlik için ayrı ortam, kıyafet, kamera/poz ve ışık tanımı derler. Kullanıcı fotoğrafı tek kimlik referansıdır. Taslaktaki “CATALOGUE MODEL ONLY” bölümleri ve örnek modellerin yaş, saç rengi, etnik köken tarifleri üretim promptuna alınmaz. Gerçek kişi/ünlü taklidi veya gerçek etkinliğe katılım iddiası amaçlanmaz.

## Yoğunluk

- 0: Akım dönüşümü yok; yalnız istenen en-boy oranına uygun kompozisyon.
- 1–35: Kaynak poz ve kıyafet silueti korunur; hafif ortam ve ışık dokunuşu.
- 36–70: Ortam ve kıyafet belirgin değişir; poz ve renk işlemesi dengeli kalır.
- 71–100: Tam akım kıyafeti, ortamı, kamera/poz yönü ve ışığı uygulanır.

Her aralıkta seçilen sayısal yoğunluk da iletilir. Bu değer çıktı kalitesi veya kredi seviyesi değildir. Kimlik, cilt tonu, yaş görünümü ve anatomiyi değiştirme yoğunluğu değildir. Üretken modelin sonucu değişebilir; yerel temsilî önizleme gerçek AI sonucu sayılmaz.

## İstek ve güvenlik sınırları

Quote, create ve preview istekleri yalnız dokuz sabit `trendPreset` değerini kabul eder. Mevcut `AI_FILTER` işi ve `natural-light` katalog kaydı taşıyıcı olarak kullanılır; akıma özel prompt derleyicisi genel filtrenin “kıyafeti/pozu/ortamı değiştirme” talimatlarını uygulamaz.

Akım isteklerinde:

- `preserveFace: true`, `preserveClothes: false`.
- `sceneTemplateId`, `featuredPersonId`: `null`; karakter modu yok.
- Güzellik veya cinsiyet görünümü aracıyla birleştirme yok.
- Hesaba ve projeye ait, hazır ve silinmemiş `USER_SOURCE` gerekir.
- Seçim ve yoğunluk iş tarifine anlık olarak kaydedilir. Projede sonradan yapılan değişiklik kuyruktaki işi değiştirmez.
- Revizyon özgün fotoğraftan hesaplanır, üretilmiş yüzün üzerine tekrar tekrar uygulanmaz.
- Hatalı istek kredi ayırmadan reddedilir; idempotency aynı isteğin tekrar ücretlenmesini engeller.
- Revizyon fiyatındaki karakter/sahne ek ücretleri güncel projeden değil, özgün işin kaydedilmiş seçiminden hesaplanır.

Veritabanı şeması veya model değişmedi; akım seçimi mevcut JSON recipe alanında tutulur. Modelin desteklediği gerçek çıktı boyutlarını mevcut sağlayıcı belirler; taslaktaki 1122×1402 ölçüsü geçersiz API parametresi olarak gönderilmez.

## %65'te görülen güvenlik reddi

8 Eylül 2026 11:28:59 Türkiye saati civarındaki güncel kayıtta görsel servisi HTTP 400, `moderation_blocked`, `image_generation_user_error` döndürdü. İş bir doğal denge/leke giderme düzenlemesiydi; ek kullanıcı metni yoktu. Bu kayıtta gerekçeyi belirleyen ayrıntılı kategori bulunmuyor. Bu nedenle otomatik olarak yanlış pozitif veya yükleme hatası denemez.

Söz konusu işte ayrılan 1 uygulama kredisi iade edildi, tahsil edilen kredi 0. Bu, dış sağlayıcının parasal faturalaması hakkında bir iddia değildir. %65 uygulamanın işlem aşamasıdır; modelin tamamlanma oranının ölçümü değildir.

Sağlayıcı güvenliği devre dışı bırakılmadı, otomatik ücretli tekrar veya güvenlik reddini aşmak için prompt değiştirme uygulanmadı. Uygulama, yükleme/bağlantı hatası ile içerik reddini ayrı göstermeli; kullanıcıya kendi fotoğrafını veya seçimini değiştirip yeni, açık bir istek başlatma seçeneği sunmalıdır. Geçerli bir giriş moderasyonu sonucu, görsel servisinin sonraki kontrolünden kesin geçileceği anlamına gelmez.

OpenAI Docs rehberi doğrultusunda resmi [görsel üretim](https://developers.openai.com/api/docs/guides/image-generation) ve [moderasyon](https://developers.openai.com/api/docs/guides/moderation) belgeleri kullanıldı. Mevcut model korundu; bu çalışma canlı, ücretli görsel üretim testi yapıldığı anlamına gelmez.

Aynı özgün kaynakla yapılan tek ücretsiz moderasyon tanılama isteği HTTP 200, `flagged: false` döndürdü. Bu sonuç ayrı Images kontrolünün yanlış karar verdiğini kanıtlamaz. Teknik ayrıntılar ve eklenen erken kontrol: [moderasyon tanılama notu](./moderation-diagnostics-2026-09-08.md).

## Yerel doğrulama

- 73 backend testi geçti: auth, kaynak sahipliği, akım sözleşmesi, promptlar, quote/create/preview/revision, idempotency, güvenlik reddi, iptal ve kredi iadesi.
- API TypeScript kontrolü geçti.
- 222 mobil testi, mobil TypeScript ve ESLint geçti. Son native input değişikliğinden sonra iOS ve Android Hermes export tekrar başarılı oldu (`/private/tmp/birkare-trends-native-S4T7aO/final-ios` ve `final-android`). Bunlar IPA/AAB mağaza derlemeleri değildir.
- API ve worker yerel Docker servisleri güncellendi; `/health` ve `/ready` başarılı, worker hazır.
- Mevcut sunucu bağımlılıkları ve Prisma şeması değişmediğinden kaynaklar kurulu yerel runtime imajına eklendi. Bu işlem temiz staging/production imajının baştan derlendiği veya mağaza sürümü hazırlandığı anlamına gelmez.
- Eski kullanıcı işleri yeniden kuyruğa alınmadı; hesap, fotoğraf veya bakiye sıfırlanmadı.

## Google sonrası profil alanları

İlk ortak `FormField` hitbox/ref düzenlemesinden sonra kullanıcı sorunun devam ettiğini bildirdi. Bunun üzerine `social-complete.tsx` içindeki Ad, Soyad ve Doğum yılı alanları, çalışan `login.tsx` ekranındaki doğrudan native `TextInput` yapısına geçirildi: aynı sabit ölçüler, doğrudan Controller olayları, `blurOnSubmit=false` ve `rejectResponderTermination=false`; arada odak-state yöneten `FormField` yok.

Doğum yılı yazım sırasında string kalır, yalnız doğrulanmış submitte sayıya dönüştürülür. Türkçe karakter, her tuş sonrası render, silme, alanın yeniden mount olmaması, odak zinciri ve beş zorunlu onay gerçek React/react-hook-form testlerinde kontrol edildi. Native yapraklar testte taklittir; gerçek cihazda klavyeyle yazmanın kesin düzeldiği iddia edilmez. Yeni ekranın simülatöre ulaştığı salt okunur görüntüyle görüldü; kullanıcı yeniden denemeli.

## Yayın öncesi kalan ortak API riski

Mevcut `POST /v1/generations/:generationId/revisions` endpoint'i henüz idempotency anahtarını kullanmıyor. Yukarıdaki yeniden gönderim koruması ana create/preview uçları içindir; revizyon isteği istemci tarafından otomatik tekrarlanmamalıdır. Mobilde bu revizyon endpoint'ini çağıran bir kullanıcı akışı bulunmuyor. Sunucu endpoint'i yayına açılmadan önce hesabı ve üst işi kapsayan kalıcı idempotency/atomik rezervasyon ve eşzamanlı tekrar testleri eklenmeli.
