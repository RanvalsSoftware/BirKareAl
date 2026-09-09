# BirKare AI — Expo / React Native Onboarding Demo

Bu paket, **BirKare AI** mobil uygulamasının açılış, galeri seçimi, onboarding, filtre galerisi, fan sahnesi, güvenlik onayı, giriş/kayıt ve örnek ana uygulama ekranlarını içerir.

Projede kullanıcı telefondaki sistem galerisini açabilir, kendi fotoğrafını seçebilir, fotoğrafı 4:5 oranında kırpabilir ve onboarding boyunca önizleme olarak kullanabilir. Ayrıca uygulamayı gerçek fotoğraf seçmeden denemek için beş adet yerel demo görseli bulunmaktadır.

## Dahil edilen ekranlar

1. Hareketli fotoğraf bulutu bulunan özel splash ekranı
2. Galeriden veya kameradan fotoğraf seçimi
3. Seçilen fotoğrafla önce/sonra onboarding anlatımı
4. Beş ana kategori seçimi
5. On üç filtre ve sanat stili
6. Kurgusal yıldızla fan selfie anlatımı
7. Fotoğraf hakkı, AI bildirimi ve yaş onayları
8. Siyah temalı giriş ekranı
9. Siyah temalı kayıt ekranı
10. Ana sayfa
11. Oluşturma stüdyosu taslağı
12. Projeler ekranı
13. Profil ekranı

## Görsel kategorileri

- Ünlü/fan selfie sahnesi — kurgusal veya lisanslı karakter yaklaşımı
- Arka plan dönüşümü — villa, gala, özel süit, gece şehri ve seyahat sahneleri
- Filtre/sanat stili — Pop Art, Drip Art, Cartoon, Sketch, Watercolor ve Cyberpunk
- Profesyonel portre — doğal, stüdyo, siyah-beyaz, HDR ve bokeh
- Sinematik sahne — kırmızı halı, gece stadyumu, şehir ışıkları ve gala

Tüm uygulama görselleri `assets/images` altında **ayrı dosyalar** halinde bulunur. Mobil kartlarda doğrudan kullanılabilmeleri için ana görseller 1080 × 1350 piksel, yani 4:5 oranında hazırlanmıştır.

---

## Teknoloji

- Expo SDK 57
- React Native 0.87
- React 19.2
- Expo Router
- TypeScript
- Expo Image Picker
- Expo Image
- Expo Linear Gradient
- React Native Reanimated 4
- AsyncStorage
- Expo Haptics

## Kurulum

```bash
npm install
npx expo start
```

Telefon üzerinden Expo Go ile denemek için terminalde görünen QR kodu okutabilirsiniz.

Yerel ağ erişiminde sorun yaşanıyorsa:

```bash
npx expo start --tunnel
```

Web önizlemesi:

```bash
npm run web
```

Tip kontrolü:

```bash
npm run typecheck
```

## Replit üzerinde açma

1. ZIP dosyasını Replit'e yükleyip arşivi çıkarın.
2. Shell bölümünde `npm install` çalıştırın.
3. Web önizlemesi için `npm run web` çalıştırın.
4. Fiziksel telefonda test için `npx expo start --tunnel` kullanın.
5. Galeri ve kamera davranışlarını gerçek cihaz üzerinde test edin.

Replit web önizlemesinde galeri butonu tarayıcının dosya seçicisini açar. Kamera ve mobil kırpma deneyimi cihaz ve tarayıcı yeteneklerine göre farklılık gösterebilir.

---

## Kullanıcı akışı

```text
/index
  ↓
/(onboarding)/splash
  ↓
/(onboarding)/gallery
  ↓
/(onboarding)/welcome
  ↓
/(onboarding)/categories
  ↓
/(onboarding)/filters
  ↓
/(onboarding)/fan-moment
  ↓
/(onboarding)/consent
  ↓
/(auth)/login veya /(auth)/register
  ↓
/(tabs)/home
```

Onboarding tamamlandığında bu bilgi AsyncStorage'a yazılır. Profil ekranındaki **“Onboarding demosunu yeniden başlat”** seçeneği yerel durumu temizleyerek açılış akışını tekrar gösterir.

## Galeri seçimi

`src/hooks/usePhotoPicker.ts` içinde:

- Galeri izni kontrol edilir.
- Sistem galerisi `launchImageLibraryAsync` ile açılır.
- Yalnızca görseller seçilir.
- Kullanıcıya 4:5 kırpma ekranı gösterilir.
- EXIF verisi istemci sonucuna dahil edilmez.
- Android'de etkinlik kapanırsa `getPendingResultAsync` ile bekleyen sonuç geri alınmaya çalışılır.
- Kamera seçeneği ayrı olarak desteklenir.

Seçilen fotoğraf onboarding sırasında `OnboardingContext` içinde bellekte tutulur. Bu demo herhangi bir backend'e fotoğraf yüklemez.

## Backend bağlantısı eklendiğinde

Mobil uygulama doğrudan OpenAI API anahtarı taşımamalıdır. Üretim isteği Node.js/Express backend'e gönderilmelidir:

```text
Expo uygulaması
  → fotoğraf yükleme isteği
  → Express API
  → güvenlik ve moderasyon
  → OpenAI görsel üretimi
  → dosya depolama
  → üretim sonucu
  → Expo uygulaması
```

Önerilen ilk endpoint:

```http
POST /api/v1/generations
Content-Type: multipart/form-data
Authorization: Bearer <access-token>
```

Alanlar:

```text
photo
categoryId
filterId
sceneId
aspectRatio=4:5
consentAccepted=true
```

Bu pakette backend çağrısı özellikle bağlanmamıştır; oluşturma ekranındaki buton UI demosu olarak bırakılmıştır.

---

## Proje yapısı

```text
BirKareAI_Expo_Onboarding/
├── app/
│   ├── (onboarding)/
│   ├── (auth)/
│   ├── (tabs)/
│   ├── _layout.tsx
│   └── index.tsx
├── src/
│   ├── components/
│   ├── context/
│   ├── data/
│   ├── hooks/
│   ├── theme/
│   ├── types/
│   └── utils/
├── assets/images/
│   ├── brand/
│   ├── categories/
│   ├── filters/
│   ├── onboarding/
│   └── scenes/
├── design-reference/
├── docs/
├── scripts/
├── app.json
├── package.json
└── tsconfig.json
```

## Üretim ortamı notları

Bu paket bir UI/UX prototipidir. Yayına çıkmadan önce:

- Gerçek authentication API'si bağlanmalıdır.
- Fotoğraf yükleme ve silme politikaları uygulanmalıdır.
- Kullanıcı rızası backend tarafında kayıt altına alınmalıdır.
- AI üretimleri moderasyondan geçirilmelidir.
- Ünlü veya kamuya mal olmuş kişilerin isim/görüntü hakları ayrıca doğrulanmalıdır.
- Demo görselleri nihai, lisanslı ürün varlıklarıyla değiştirilmelidir.
- Kredi ve mağaza içi satın alma akışı Apple/Google kurallarına göre tamamlanmalıdır.

## Tasarım dili

- Arka plan: `#050505`
- Ana vurgu: `#FFC400`
- Kart yüzeyi: `#101012`
- Birincil metin: `#FFFFFF`
- İkincil metin: `#A7A7AD`
- Kart yarıçapı: 16–28 px
- Görsel oranı: 4:5
- Hissiyat: premium, sade, sinematik ve mobil öncelikli
