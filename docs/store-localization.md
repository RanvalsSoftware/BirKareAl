# BirKare AI — uygulama ve mağaza dil teslimi

## Karar

BirKare arayüz dili ülke, IP adresi veya mağaza ülkesi üzerinden tahmin edilmez. Hedef dil seti Türkçe, İngilizce, Almanca, İspanyolca (İspanya) ve Arapçadır. Yeni üç dil [yayın planındaki](language-expansion-plan.md) çeviri ve cihaz kapıları tamamlanana kadar kullanıcıya açılmaz. Uygulamanın dili aşağıdaki sırayla belirlenir:

1. Kullanıcının uygulama içinde açıkça seçtiği `Türkçe` veya `English` tercihi.
2. Tercih `Cihaz dilini kullan` ise işletim sisteminin uygulama için verdiği sıralı dil listesinde bulunan ilk desteklenen dil.
3. Listede desteklenen bir dil yoksa İngilizce.

Ülke/bölge bilgisi yalnız tarih, sayı, para biçimi, mağaza kullanılabilirliği ve ülkeye özel mağaza listelemeleri için kullanılabilir. Örneğin mağaza ülkesi Türkiye olup cihaz dili İngilizce olan kullanıcı İngilizce arayüz görür; cihaz dili Türkçe olan kullanıcı başka bir ülkede de Türkçe arayüz görür.

Bu ayrım gereklidir: App Store Connect ve Google Play Console'da eklenen diller mağaza ürün sayfasını yerelleştirir. Yüklü uygulamanın React Native arayüz dilini mağaza ülkesi belirlemez.

## Uygulama tarafı

- Etkin uygulama dilleri: `tr`, `en`. Aday diller: `de`, `es`, `ar`.
- Varsayılan tercih: `system` (`Cihaz dilini kullan`).
- Açık kullanıcı tercihi SecureStore'da saklanır ve cihaz dili değişse bile korunur.
- Android 13+ sistem uygulama dili sayfası ve iOS uygulama dili ayarı native `supportedLocales` beyanından `tr` ve `en` seçeneklerini alır.
- Uygulama ön plana döndüğünde Android locale listesi yeniden okunur.
- API çağrıları çözümlenen dili `Accept-Language` ile gönderir; bu başlık yetkilendirme veya ülke bilgisi değildir.
- Native izin açıklamalarının Türkçe ve İngilizce karşılıkları `apps/mobile/locales` altındadır.

## App Store Connect

App Store Connect'te `My Apps → BirKare AI → App Store → iOS App` bölümünde yayınlanan binary'nin desteklediği yerelleştirmeler bulunmalıdır:

| Yerelleştirme   | Repo kaynağı                     | Kullanım                                                            |
| --------------- | -------------------------------- | ------------------------------------------------------------------- |
| Turkish         | `docs/store-metadata.tr.json`    | Ad, alt başlık, tanıtım metni, anahtar kelime, açıklama, sürüm notu |
| English (U.S.)  | `docs/store-metadata.en-US.json` | Ad, alt başlık, tanıtım metni, anahtar kelime, açıklama, sürüm notu |
| German          | `docs/store-metadata.de-DE.json` | Ad, alt başlık, tanıtım metni, anahtar kelime, açıklama, sürüm notu |
| Spanish (Spain) | `docs/store-metadata.es-ES.json` | Ad, alt başlık, tanıtım metni, anahtar kelime, açıklama, sürüm notu |
| Arabic          | `docs/store-metadata.ar.json`    | Ad, alt başlık, tanıtım metni, anahtar kelime, açıklama, sürüm notu |

- Primary Language, yalnız eksik bir yerelleştirme olduğunda kullanılan mağaza fallback'idir; uygulama arayüz dili değildir.
- Her dil için o dilde gerçek uygulama ekran görüntüleri yüklenmelidir. Görselin içine gömülü Türkçe metin İngilizce listelemede otomatik çevrilmez.
- App Privacy, yaş derecelendirmesi, fiyat/ülke kullanılabilirliği ve abonelik ürünleri dil dosyasından bağımsız yönetilir.
- Standart Apple EULA bağlantısı her iki App Store açıklamasında tutulur. Gizlilik politikası URL'sinin herkese açık ve çalışır olduğu gönderimden önce ayrıca doğrulanır.

## Google Play Console

Google Play Console'da `Grow users → Store presence → Main store listing → Manage translations` üzerinden:

| Yerelleştirme                   | Repo kaynağı                     | Kullanım                                    |
| ------------------------------- | -------------------------------- | ------------------------------------------- |
| Turkish – tr-TR                 | `docs/store-metadata.tr.json`    | Uygulama adı, kısa/tam açıklama, sürüm notu |
| English (United States) – en-US | `docs/store-metadata.en-US.json` | Uygulama adı, kısa/tam açıklama, sürüm notu |
| German – de-DE                  | `docs/store-metadata.de-DE.json` | Uygulama adı, kısa/tam açıklama, sürüm notu |
| Spanish (Spain) – es-ES         | `docs/store-metadata.es-ES.json` | Uygulama adı, kısa/tam açıklama, sürüm notu |
| Arabic – ar                     | `docs/store-metadata.ar.json`    | Uygulama adı, kısa/tam açıklama, sürüm notu |

- Main store listing çevirileri kullanıcıya uygun dilde ürün sayfası gösterir; uygulama içi dili zorlamaz.
- Custom store listing ile ülke hedeflemek yalnız mağaza metni/görselleri içindir. Türkiye'ye hedeflenen bir listeleme açmak cihazı Türkçeye çevirmemelidir.
- Her dil için telefon ekran görüntülerinin gerçek Türkçe/İngilizce uygulama ekranından alınmış karşılığı yüklenmelidir.
- Data safety, target audience, app access, fiyatlandırma ve ülke dağıtımı listeleme çevirilerinden ayrı formlardır.

## Yayın öncesi kontrol

```bash
pnpm validate:store-localizations
```

Bu kontrol beş JSON dosyasının zorunlu alanlarını, App Store/Play karakter sınırlarını, unutulmuş placeholder'ları ve Apple standart EULA bağlantısını denetler. Konsola otomatik yükleme yapmaz.

Gerçek cihaz kontrol matrisi:

| Durum                                                | Beklenen arayüz    |
| ---------------------------------------------------- | ------------------ |
| Uygulama tercihi `Türkçe`, cihaz İngilizce           | Türkçe             |
| Uygulama tercihi `English`, cihaz Türkçe             | İngilizce          |
| Tercih `Cihaz dilini kullan`, cihaz dilleri `tr, en` | Türkçe             |
| Tercih `Cihaz dilini kullan`, cihaz dilleri `en, tr` | İngilizce          |
| Tercih `Cihaz dilini kullan`, cihaz yalnız Almanca   | İngilizce fallback |
| Mağaza ülkesi Türkiye, cihaz/uygulama dili İngilizce | İngilizce          |

Yeni dil eklerken aynı değişiklikte uygulama çeviri kaynağı, native locale beyanı, iki mağaza metadata/görselleri, fallback testleri ve backend e-posta desteği birlikte tamamlanmalıdır.
