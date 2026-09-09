# Güzellik Stüdyosu — uygulanan sistem

8 Eylül 2026. Kartlar temsili görsellerdir; filtre sonucu vaat eden önce/sonra fotoğrafları değildir. Kaynak olarak yalnız kullanıcının seçtiği özgün fotoğraf gönderilir.

## Görünümler

| No  | Görünüm              | Varsayılan yoğunluk | Erişim      |
| --- | -------------------- | ------------------- | ----------- |
| 1   | Doğal                | 35                  | Standart    |
| 2   | Sivilce & Leke       | 65                  | Standart    |
| 3   | Pürüzsüz Cilt        | 30                  | Standart    |
| 4   | Göz Altı             | 35                  | Standart    |
| 5   | Cilt Işıltısı        | 30                  | Standart    |
| 6   | Yüz Kontürü          | 20                  | PRO yakında |
| 7   | Genç Görünüm         | 20                  | PRO yakında |
| 8   | Makyaj 1 · Nude      | 40                  | Standart    |
| 9   | Makyaj 2 · Soft Glam | 50                  | PRO yakında |
| 10  | Makyaj 3 · Gece      | 60                  | PRO yakında |

“Standart” üretimin ücretsiz olduğu anlamına gelmez; mevcut kalite ve adet bazlı üretim kredisi kullanılır. PRO abonelik/mağaza makbuz doğrulaması henüz mevcut değildir. Kilit yalnız arayüzde değildir: API, pozitif yoğunluklu PRO ayarını kredi ayırmadan reddeder. Kredi bakiyesi veya kullanıcının gönderdiği bir bayrak PRO yetkisi sayılmaz.

Kaynak klasörde toplam 10 dosya vardır: 9 güzellik portresi ve kullanıcının ayrıca ayırdığı cinsiyet dönüşümü görseli. Nude için ayrı onuncu güzellik portresi olmadığından Doğal'ın temsili fotoğrafı paylaşılır. `10_23_05.png` yalnız ayrı **Cinsiyet değiştirme** aracında kullanılır. Bu araç kadınsı/erkeksi görünümü kullanıcıya seçtirir; fotoğraftan cinsiyet çıkarımı yapmaz.

## Akış ve veri

Ana sayfa güzellik slider'ı/kartları veya Keşfet → Güzellik → özgün fotoğraf seçimi → Güzellik Stüdyosu → kredi özeti/onay → tek üretim → sonuç/paylaşım.

- Rötuşlar birlikte kullanılabilir; makyaj seçimi tek bir enum olduğu için farklı makyaj stilleri üst üste binmez.
- Kaydırıcı değişiklikleri yereldir, API çağırmaz. Işık için hafif yerel önizleme vardır; cilt/makyajın gerçek AI sonucu yalnız üretimde alınır ve bu ayrım ekranda yazılıdır.
- Yoğunluk 0–100 tam sayıdır. Backend, etki türüne özgü güvenli üst sınırla anlamlı talimata dönüştürür; sağlayıcıdan matematiksel piksel yüzdesi beklenmez. Kontür yüz geometrisi yerine ışık/gölgeyle anlatılır.
- `POST /v1/generations/quote`, `POST /v1/generations` ve `/preview` top-level `beauty` veya `transformation` alır. Birlikte gönderilemezler; mod `AI_FILTER`, stil `natural-light` olmalıdır.
- `beauty.adjustments` yedi kararlı ID ve yoğunluklarını; `makeup` tek preset/yoğunluğunu; iki koruma tercihi cilt dokusu ve çil/ben ayarını taşır. İstemciden prompt veya model parametresi kabul edilmez.
- Seçimler üretim kaydındaki JSON `recipe` içine sabitlenir. Daha sonra proje değişse de kuyruktaki işin promptu değişmez. Güzellik revizyonu önceki AI çıktısını değil özgün kaynak asset'ini kullanır.
- Kimlik, ten tonu, anatomi, kıyafet ve arka plan koruması zorunlu prompt kurallarıdır. AI modellerinde birebir piksel/kimlik garantisi verilmez; sonuç kullanıcı kontrolünden geçmelidir.
- Mevcut model ve fiyat profili değiştirilmedi. OpenAI Docs ile düzenleme parametreleri kontrol edildi; referans metindeki model değişikliği otomatik uygulanmadı. [Resmî düzenleme API referansı](https://developers.openai.com/api/reference/resources/images/methods/edit), [görsel üretim kılavuzu](https://developers.openai.com/api/docs/guides/image-generation).

## Doğrulama sınırı

Kontrat, prompt, kaynak sahipliği/türü, PRO reddi, idempotency, kayıt/önizleme ve revizyon testleri izole verilerle çalışır. Bunlar ücretli sağlayıcıdaki görsel kalite değerlendirmesinin yerini tutmaz. Yayın öncesi izinli farklı yetişkin portreleri üzerinde düşük/orta/yüksek yoğunluk, gözlük/sakal/farklı cilt tonları ve cihaz ekranları ayrıca değerlendirilmelidir.
