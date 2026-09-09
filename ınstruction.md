# Retake AI – Expo React Native + Express.js + OpenAI Tam Teknik Proje Planı

> **Çalışma adı:** Retake AI  
> **Önceki çalışma adı:** BirKare AI  
> **Belge sürümü:** 2.0  
> **Tarih:** 2 Eylül 2026  
> **Hedef platformlar:** iOS ve Android  
> **Mobil uygulama:** Expo + React Native + TypeScript  
> **Backend:** Node.js + Express.js + TypeScript  
> **Veritabanı:** PostgreSQL + Prisma ORM  
> **Yapay zekâ:** OpenAI API – metin/görsel anlama, prompt düzenleme, görsel üretme ve görsel düzenleme  
> **Görsel modeli:** `gpt-image-2`  
> **Moderasyon modeli:** `omni-moderation-latest`  
> **Kuyruk:** Redis + BullMQ  
> **Dosya depolama:** Cloudflare R2 veya aynı arayüzü uygulayan AWS dışı bir obje depolama servisi  
> **AWS kullanımı:** Yok

---

## İçindekiler

1. Belgenin amacı ve kesin teknik kararlar
2. Ürün tanımı ve uygulama kapsamı
3. “ChatGPT kullanmak” teknik olarak ne anlama gelir?
4. Uygulama adı ve marka yaklaşımı
5. Kullanıcı rolleri ve temel kullanıcı akışları
6. Mobil uygulama tasarım sistemi
7. Uygulamanın bütün ekranları
8. Expo React Native mobil mimarisi
9. Mobil kimlik doğrulama ve token yönetimi
10. Fotoğraf yükleme, kamera ve kalite kontrolü
11. Filtre sistemi
12. Express.js backend mimarisi
13. Monorepo ve klasör yapısı
14. Backend modülleri
15. API standartları ve endpoint planı
16. PostgreSQL ve Prisma veri modeli
17. AWS kullanmadan dosya depolama
18. OpenAI yapay zekâ mimarisi
19. Prompt üretimi ve yapılandırılmış çıktı
20. Görsel üretim hattı
21. Ünlü, tarihî kişi ve kamuya mal olmuş kişi sistemi
22. Moderasyon, etik kullanım ve kötüye kullanım önleme
23. Kuyruk, worker ve üretim durumları
24. Kredi, abonelik ve mağaza içi satın alma
25. Bildirim sistemi
26. Admin paneli
27. Güvenlik mimarisi
28. Veri gizliliği, saklama ve silme
29. Loglama, izleme ve maliyet kontrolü
30. Deployment ve sunucu mimarisi
31. Ortam değişkenleri
32. Örnek kodlar
33. Test, kalite ve AI değerlendirme sistemi
34. Sprint planı ve geliştirme takvimi
35. MVP kabul kriterleri
36. Riskler ve alınacak önlemler
37. Sonraki sürümler
38. Başlangıç kontrol listesi

---

# 1. Belgenin Amacı ve Kesin Teknik Kararlar

Bu belge, mevcut BirKare AI backend taslağını tamamen yenileyerek uygulamayı **Expo React Native mobil istemci**, **Node.js Express.js backend**, **PostgreSQL**, **Prisma**, **Redis**, **BullMQ** ve **OpenAI API** üzerine kurmak için hazırlanmıştır.

Bu sürümde eski dokümandaki NestJS ve web odaklı cookie yaklaşımı kaldırılmıştır. Mobil uygulamaya daha uygun bir authentication yapısı, OpenAI tabanlı görsel üretim hattı, filtreler, ünlü kişi kategorisi, kredi sistemi, App Store/Google Play satın alma sistemi, admin yönetimi ve veri güvenliği tek dokümanda toplanmıştır.

## 1.1. Kesin teknoloji kararları

| Katman | Kullanılacak teknoloji |
|---|---|
| Mobil uygulama | Expo + React Native + TypeScript |
| Mobil yönlendirme | Expo Router |
| Mobil veri yönetimi | TanStack Query + Zustand |
| Form yönetimi | React Hook Form + Zod |
| Animasyon | React Native Reanimated + Gesture Handler |
| Backend | Node.js + Express.js + TypeScript |
| API doğrulama | Zod |
| Veritabanı | PostgreSQL |
| ORM | Prisma |
| Cache ve kuyruk | Redis + BullMQ |
| AI metin/görsel orkestrasyonu | OpenAI Responses API |
| Görsel üretme/düzenleme | OpenAI Images API ve gerektiğinde Responses API image generation tool |
| Ana görsel modeli | `gpt-image-2` |
| İçerik güvenliği | `omni-moderation-latest` + uygulama içi kurallar |
| Sunucu görsel işleme | Sharp |
| Mobil güvenli saklama | Expo SecureStore |
| Dosya depolama | Cloudflare R2; geliştirmede local storage adapter |
| E-posta | Resend, Brevo veya standart SMTP; AWS SES kullanılmaz |
| Push bildirim | Expo Notifications |
| Mobil ödeme | Apple In-App Purchase + Google Play Billing; tercihen RevenueCat ile doğrulama |
| Loglama | Pino + request ID |
| Hata izleme | Sentry veya eşdeğeri |
| API dokümantasyonu | OpenAPI 3 + Swagger UI |
| Deployment | Docker Compose + Linux sunucu + Nginx/Caddy |

## 1.2. Bu projede kullanılmayacaklar

- AWS hesabı, AWS S3, AWS Lambda, AWS SES veya AWS CloudFront kullanılmayacak.
- NestJS kullanılmayacak.
- OpenAI API anahtarı mobil uygulamanın içine yazılmayacak.
- Kullanıcı fotoğrafları model eğitimi için kullanılmayacak.
- İlk sürümde özel Stable Diffusion sunucusu veya GPU sunucusu kurulmayacak.
- İlk sürümde Messi, Ronaldo, Kim Kardashian veya Atatürk fotoğrafları internetten izinsiz toplanıp model eğitimi yapılmayacak.
- Refresh token düz metin olarak veritabanında tutulmayacak.
- Mobil uygulamada web tarayıcısına özgü `localStorage` veya HttpOnly-cookie temelli oturum sistemi ana yöntem olarak kullanılmayacak.
- Kredi satın alma işlemi mobil uygulama içinde doğrudan iyzico/Stripe formuna yönlendirilmeyecek; mağaza kuralları dikkate alınacak.

## 1.3. Ana mimari yaklaşım

İlk sürüm için **modüler monolit + ayrı worker** yaklaşımı kullanılacaktır:

- Express API, kullanıcı ve mobil uygulama isteklerini karşılar.
- PostgreSQL kalıcı veriyi tutar.
- Redis geçici verileri, rate limit sayaçlarını ve BullMQ işlerini tutar.
- Worker, uzun süren OpenAI görsel üretim işlerini API sürecinden ayrı çalıştırır.
- Mobil uygulama üretim başladığında bekleyen işi gösterir; uygulama kapanırsa push bildirim ile sonuç haber verilir.
- API ve worker aynı kod tabanındaki ortak paketleri kullanır fakat ayrı process/container olarak çalışır.

```mermaid
flowchart LR
    M[Expo React Native Mobil Uygulama]
    A[Express.js API]
    P[(PostgreSQL)]
    R[(Redis)]
    Q[BullMQ Kuyruğu]
    W[Generation Worker]
    O[OpenAI API]
    S[Cloudflare R2]
    N[Expo Push Service]

    M -->|HTTPS REST| A
    M -->|İmzalı yükleme URL'si| S
    A --> P
    A --> R
    A --> Q
    Q --> W
    W --> O
    W --> S
    W --> P
    W --> N
    N --> M
```

---

# 2. Ürün Tanımı ve Uygulama Kapsamı

## 2.1. Ürün tanımı

**Retake AI**, kullanıcının kendi fotoğrafını yükleyerek veya kamerayla çekerek şu işlemleri yapabildiği mobil bir AI fotoğraf stüdyosudur:

- Fotoğrafın arka planını değiştirme
- Kullanıcıyı yeni bir sahneye yerleştirme
- Sinematik, doğal, retro, HDR, bokeh ve sanatsal filtre uygulama
- Hazır temalarla sosyal medya fotoğrafı oluşturma
- Kurgusal karakter veya izin/lisans süreci tamamlanmış ünlü kişiyle fan sahnesi oluşturma
- Yapay zekâyla sohbet ederek sonucu tekrar düzenleme
- Birden fazla varyasyon üretme
- Önce/sonra karşılaştırma
- HD çıktı alma
- Proje ve versiyon geçmişini saklama
- Favori, paylaşım ve indirme
- Kredi veya abonelik satın alma

## 2.2. Temel ürün modları

### A. AI Arka Plan Değiştir

Kullanıcının yüzü, kıyafeti ve ana pozu mümkün olduğunca korunur; sadece sahne ve çevre değiştirilir.

Örnekler:

- Stadyum
- Ödül töreni
- Kırmızı halı
- Film seti
- Lüks araç önü
- Sahil
- New York gecesi
- İstanbul manzarası
- Bilim kurgu şehri

### B. Ünlüyle Fotoğraf / Fan Moment

Kullanıcının seçilen kişi veya karakterle aynı karede olduğu fan sahnesi oluşturulur.

Bu modda kişi kataloğu backend tarafından yönetilir. Her kişi için kullanım türü, lisans/hak durumu, ülke kısıtı, sahne sınırı ve AI etiketi zorunluluğu bulunur.

### C. AI Filtreler

Fotoğrafı yeni bir görsel stile dönüştürür:

- Drip Art
- Pop Art
- HDR
- Bokeh
- Natural
- Cinematic
- Vintage
- Black & White
- Film
- 3D Cartoon
- Anime benzeri özgün stil
- Magazine Cover
- Professional Portrait

### D. Hızlı Filtreler

AI çağrısı yapmadan cihaz üzerinde anlık uygulanır:

- Parlaklık
- Kontrast
- Doygunluk
- Sıcaklık
- Keskinlik
- Vinyet
- Gren
- Siyah-beyaz
- Soluk film görünümü
- Soğuk/sıcak ton

### E. AI Sohbetle Düzenleme

Kullanıcı sonucu açıp doğal dille revizyon ister:

- “Ronaldo biraz geride olsun.”
- “Arka plan gece maçı olsun.”
- “Yüzümü değiştirme.”
- “Kamerayı biraz uzaklaştır.”
- “Kıyafetimi siyah yap.”
- “Fotoğraf daha doğal telefon kamerası gibi olsun.”

## 2.3. MVP kapsamı

MVP’de bulunması gerekenler:

1. Splash ve onboarding
2. E-posta ile kayıt/giriş
3. Google ve Apple ile giriş
4. Kamera/galeri fotoğraf seçimi
5. Fotoğraf kalite kontrolü
6. Hazır sahne kataloğu
7. Filtre kataloğu
8. Kurgusal karakter kataloğu
9. Hak incelemesi tamamlanan kişiler için ünlü kataloğu altyapısı
10. OpenAI ile 1–4 görsel varyasyonu
11. Üretim ilerleme ekranı
12. Sonuç ve tekrar düzenleme
13. Projeler ve favoriler
14. Kredi cüzdanı
15. App Store ve Google Play satın alma doğrulaması
16. Push bildirim
17. Moderasyon ve raporlama
18. Hesap/veri silme
19. Admin panelinde şablon, kişi ve üretim kontrolü

## 2.4. MVP dışında bırakılacaklar

- Video üretimi
- Canlı kamera filtresi
- Gerçek zamanlı yüz değiştirme
- Kullanıcıların kendi ünlü referanslarını serbestçe yüklemesi
- Sosyal medya akışı ve herkese açık keşfet bölümü
- Kullanıcıların birbirini takip etmesi
- Özel model eğitimi
- Çok kişili grup fotoğrafı garantisi
- Masaüstü düzenleme uygulaması

---

# 3. “ChatGPT Kullanmak” Teknik Olarak Ne Anlama Gelir?

Uygulama, ChatGPT web sitesi veya ChatGPT mobil uygulamasıyla doğrudan haberleşmez. Kullanılan ürün **OpenAI API** olacaktır.

Sistem üç ayrı AI görevi yürütür:

## 3.1. İsteği anlama

Bir OpenAI metin/görsel modeli kullanıcının yazdığı isteği yapılandırılmış JSON’a çevirir.

Örnek kullanıcı metni:

> “Beni gece stadyumda Ronaldo’yla selfie çekilmiş gibi yap, Messi arkada bulanık görünsün.”

Örnek yapılandırılmış çıktı:

```json
{
  "mode": "PUBLIC_FIGURE_FAN_SCENE",
  "scene": "night_football_stadium",
  "composition": "handheld_selfie",
  "primaryPersonPosition": "center_left",
  "featuredPersonPosition": "right",
  "backgroundPersonRequested": true,
  "backgroundBlur": "medium",
  "preserveUserFace": true,
  "preserveUserClothes": true,
  "style": "photorealistic_phone_camera",
  "aspectRatio": "4:5",
  "requiresRightsCheck": true,
  "requiresDisclosure": true
}
```

## 3.2. Görseli üretme veya düzenleme

`gpt-image-2` modeline şu girdiler gönderilir:

- Kullanıcının referans fotoğrafı
- Varsa onaylı kişi/karakter referansları
- Sahne şablonu
- Kullanıcının isteği
- Yüz ve kıyafet koruma talimatları
- Yasaklanan içerikler
- Görsel oranı ve kalite

## 3.3. Sonucu sohbetle revize etme

İlk sonuçtan sonra kullanıcı yeni talimat verir. Sistem önceki görseli yeni referans olarak kullanarak yeni bir versiyon oluşturur.

## 3.4. Model eğitimi gerekecek mi?

MVP için **hayır**.

Başlangıçta şu yapı yeterlidir:

- Prompt şablonları
- Yapılandırılmış JSON çıktısı
- Referans görseller
- OpenAI görsel düzenleme
- Moderasyon
- Prompt versiyonlama
- Kalite test seti

Fine-tuning ancak gerçek kullanım verileri toplandıktan, kullanıcı izni ve anonimleştirme sağlandıktan, belirli bir ölçülebilir problem ortaya çıktıktan sonra değerlendirilecektir. Gerçek kişilerin yüzlerini öğretmek için internetten görsel toplayıp model eğitmek proje kapsamına alınmayacaktır.

## 3.5. API anahtarının yeri

OpenAI API anahtarı yalnızca Express backend veya worker ortamında bulunur:

```text
Expo uygulaması -> Express API -> BullMQ Worker -> OpenAI API
```

Kesinlikle yapılmayacak yapı:

```text
Expo uygulaması -> OpenAI API
```

Çünkü mobil uygulama paketinin içine eklenen anahtar çıkarılabilir ve kötüye kullanılabilir.

---

# 4. Uygulama Adı ve Marka Yaklaşımı

## 4.1. Önerilen çalışma adı

### Retake AI

Kısa, fotoğrafla ilişkili ve uluslararası kullanıma uygundur. Ancak uygulama mağazasına çıkmadan önce marka, alan adı ve mağaza isim uygunluğu kontrol edilmelidir.

## 4.2. Alternatif isimler

- Reframe AI
- ReShot AI
- RePic AI
- Picora
- Revia AI
- FrameMe
- SceneMe
- StarFrame
- FameFrame
- BirKare AI
- HayalKare
- Snaply AI
- Remake Photo

## 4.3. Marka sloganları

- “Hayalindeki karede yerini al.”
- “Fotoğrafını yükle, sahneni yeniden oluştur.”
- “Bir fotoğraftan bambaşka bir an.”
- “Kareyi yeniden çek.”
- “Sen seç, yapay zekâ oluştursun.”

## 4.4. Kod içinde isim bağımlılığını azaltma

Uygulama adı sabit kodlanmamalı; yapılandırmadan gelmelidir:

```env
APP_NAME=Retake AI
APP_SLUG=retake-ai
MOBILE_SCHEME=retakeai
```

Bu sayede marka değişirse backend, bildirim, e-posta ve mobil metinler kolayca güncellenebilir.

---

# 5. Kullanıcı Rolleri ve Temel Kullanıcı Akışları

## 5.1. Roller

### USER

- Fotoğraf yükler
- Görsel üretir
- Filtre uygular
- Projelerini görür
- Kredi satın alır
- Sonuç indirir/paylaşır
- Verisini siler

### SUPPORT

- Destek taleplerini görür
- Kullanıcı hesabının sınırlı destek detaylarını inceler
- Kredi düzeltme talebi açar
- Hassas görsellere varsayılan olarak erişemez

### MODERATOR

- İşaretlenen görselleri inceler
- Üretimi engeller veya serbest bırakır
- Kullanıcı raporlarını yönetir
- Kişi/şablon kısıtlarını uygular

### ADMIN

- Kullanıcı, şablon, filtre, kişi kataloğu ve kredi paketlerini yönetir
- OpenAI hata ve maliyet raporlarını görür
- Prompt sürümlerini yayınlar

### SUPER_ADMIN

- Sistem ayarları
- Rol atama
- Secret dışındaki operasyonel konfigürasyon
- Kritik audit kayıtları
- Acil durum üretim kapatma anahtarı

## 5.2. Yeni kullanıcı akışı

```mermaid
flowchart TD
    A[Splash] --> B[Onboarding]
    B --> C[Yaş ve kullanım onayı]
    C --> D[Giriş / Kayıt]
    D --> E[E-posta doğrulama veya sosyal giriş]
    E --> F[Ana Sayfa]
    F --> G[Fotoğraf seç]
    G --> H[Kalite kontrol]
    H --> I[Sahne / Filtre / Ünlü seç]
    I --> J[Özet ve kredi]
    J --> K[Üretim]
    K --> L[Sonuç]
    L --> M[İndir / Paylaş / Düzenle]
```

## 5.3. Geri dönen kullanıcı akışı

1. Uygulama açılır.
2. SecureStore’daki refresh token okunur.
3. Backend’den yeni access token alınır.
4. Ana sayfa ve son projeler yüklenir.
5. Kullanıcı kaldığı projeye devam eder veya yeni üretim başlatır.

## 5.4. Ünlüyle fotoğraf akışı

1. Kullanıcı “Ünlüler” sekmesini seçer.
2. Backend yalnızca aktif ve izin verilen kişileri döndürür.
3. Kullanıcı kişi detay ekranını açar.
4. Fan içeriği açıklamasını kabul eder.
5. Kullanıcı kendi fotoğrafını yükler.
6. Sahne seçer.
7. Kompozisyon seçer.
8. Sistem hak/politika kontrolü yapar.
9. Kredi rezerve edilir.
10. Üretim kuyruğa girer.
11. Çıktıya gerekli AI etiketi ve metadata eklenir.
12. Sonuç kullanıcıya sunulur.

## 5.5. Filtre akışı

1. Fotoğraf seçilir.
2. Filtre galerisi açılır.
3. Hızlı filtreler cihazda anlık önizlenir.
4. AI filtreleri küçük önizleme ile gösterilir.
5. Kullanıcı yoğunluk ayarını yapar.
6. AI filtreyse kredi özeti gösterilir.
7. Sonuç üretildikten sonra kaydedilir.

---

# 6. Mobil Uygulama Tasarım Sistemi

Tasarım, kullanıcının paylaştığı iki örnekten ilham alan siyah arka planlı, premium, modern ve fotoğraf odaklı bir yapıda olacaktır.

## 6.1. Renkler

| Token | Değer | Kullanım |
|---|---:|---|
| `background` | `#050505` | Ana arka plan |
| `surface` | `#111111` | Kartlar |
| `surfaceElevated` | `#191919` | Modal ve aktif kartlar |
| `surfaceSoft` | `#222222` | Input ve pasif buton |
| `textPrimary` | `#FFFFFF` | Ana yazılar |
| `textSecondary` | `#A7A7A7` | Açıklamalar |
| `textMuted` | `#6F6F6F` | Yardımcı metin |
| `accentYellow` | `#FFC400` | Pro, kredi ve CTA |
| `accentPurple` | `#7C3AED` | AI düzenleme ve gradyan |
| `success` | `#30D158` | Başarılı durum |
| `warning` | `#FF9F0A` | Uyarı |
| `danger` | `#FF453A` | Hata/silme |
| `border` | `rgba(255,255,255,0.10)` | İnce çerçeveler |

Ana CTA için önerilen gradyan:

```text
#7C3AED -> #C83CF0 -> #FFC400
```

## 6.2. Tipografi

Önerilen font: **Manrope** veya **Inter**.

| Stil | Boyut | Ağırlık |
|---|---:|---:|
| Display | 38–44 | 700 |
| H1 | 30–34 | 700 |
| H2 | 24–28 | 700 |
| H3 | 19–22 | 600 |
| Body | 15–17 | 400 |
| Caption | 12–14 | 400/500 |
| Button | 15–17 | 600 |

## 6.3. Görsel dil

- Arka plan tam siyaha yakın
- Kart köşeleri 18–26 px
- Hafif beyaz border
- Sarı vurgu gölgesi sadece önemli CTA’larda
- Üretim ve AI alanlarında mor-sarı gradyan
- Fotoğraflarda 16–22 px radius
- Alt navigasyon yarı transparan/sabit
- Metin yoğunluğu düşük, fotoğraf öncelikli
- Haptik geri bildirim
- Skeleton ve shimmer loading
- Hata durumunda kullanıcı dostu açıklama

## 6.4. Ortak bileşenler

- `AppHeader`
- `BackButton`
- `ProBadge`
- `CreditBadge`
- `PrimaryButton`
- `GradientButton`
- `SecondaryButton`
- `DangerButton`
- `TextField`
- `PasswordField`
- `SearchBar`
- `CategoryChip`
- `FilterCard`
- `SceneCard`
- `PersonCard`
- `ProjectCard`
- `GenerationProgressCard`
- `UploadTile`
- `BottomSheet`
- `ConfirmModal`
- `CreditCostRow`
- `BeforeAfterSlider`
- `EmptyState`
- `ErrorState`
- `OfflineBanner`
- `AIContentBadge`

## 6.5. Erişilebilirlik

- Metin-kontrast oranı kontrol edilir.
- Buton dokunma alanı en az 44x44 pt olur.
- Görseller için erişilebilir etiketler verilir.
- Dinamik font büyüklüğü desteklenir.
- Sadece renkle durum anlatılmaz; ikon ve metin birlikte kullanılır.
- Animasyonu azalt seçeneği desteklenir.
- Üretim sonuçlarında “önce/sonra” ekranı VoiceOver/TalkBack ile açıklanır.

---

# 7. Uygulamanın Bütün Ekranları

Aşağıdaki ekran listesi tasarım ve geliştirme için ana kapsamdır.

## 7.1. Açılış ve onboarding

### 1. Splash Screen

- Logo
- Retake AI adı
- Kısa slogan
- Siyah arka plan
- Sarı/mor hafif glow
- Oturum kontrolü yapılırken animasyon

### 2. Onboarding – Hayalindeki Sahne

- “Fotoğrafını istediğin sahneye taşı.”
- Önce/sonra görseli
- Devam butonu

### 3. Onboarding – AI Filtreler

- Drip Art, Pop Art, Cinematic örnekleri
- Kaydırılabilir mini kartlar

### 4. Onboarding – Fan Moment

- Kurgusal veya izinli kişiyle fan fotoğrafı anlatımı
- “AI ile oluşturuldu” açıklaması

### 5. Yaş, İzin ve Kullanım Onayı

- Kullanıcının yüklediği fotoğraf üzerinde hak/izin sahibi olduğunu onaylaması
- AI içeriği açıklaması
- Gizlilik politikası
- Kullanım koşulları
- Yaş beyanı

## 7.2. Authentication ekranları

### 6. Giriş Yap

- Google ile devam et
- Apple ile devam et
- E-posta
- Şifre
- Giriş butonu
- Şifremi unuttum
- Kayıt ol bağlantısı

### 7. Kayıt Ol

- Ad
- Soyad
- E-posta
- Şifre
- Şifre tekrar
- Kullanım koşulları checkbox
- Kayıt ol

### 8. E-posta Doğrulama

- Kod veya deep link açıklaması
- Tekrar e-posta gönder
- E-posta adresini değiştir

### 9. Şifremi Unuttum

- E-posta girişi
- Gönder butonu

### 10. Yeni Şifre Belirle

- Yeni şifre
- Şifre tekrar
- Oturumları kapat seçeneği

### 11. Sosyal Giriş Tamamlama

- Eksik ad/soyad
- Kullanım koşulları
- Bildirim tercihi

## 7.3. Ana uygulama ekranları

### 12. Ana Sayfa

Üst alan:

- Profil avatarı
- Retake AI logosu
- Kredi bakiyesi
- Pro badge

Sekmeler:

- Görsel
- Video – “yakında” veya gizli
- Ünlüler
- AI Araçları

Hero kart:

- “Ünlülerle Çekil”
- Fan Moment açıklaması
- Hemen Dene

Diğer alanlar:

- Popüler sahneler
- Popüler filtreler
- Son projeler
- Yeni eklenenler

### 13. Keşfet / Katalog

- Arama
- Kategori filtreleri
- Popüler
- Yeni
- Ücretsiz
- Pro
- Sahne/filtre/kişi kartları

### 14. Arama Sonuçları

- Son aramalar
- Öneriler
- Kişiler
- Sahneler
- Filtreler
- Sonuç yok durumu

### 15. Filtreler

İkinci referans tasarımdaki yapıya benzer grid:

- Arama alanı
- Tümü
- Popüler
- Sanatsal
- Doğal
- Retro
- Sinematik
- Portre

Filtre kartları:

- Drip Art
- Pop Art
- HDR
- Bokeh
- Doğal
- Film
- Siyah Beyaz
- Cinematic
- Vintage

### 16. Filtre Detay / Önizleme

- Büyük fotoğraf
- Önce/sonra basılı tutma
- Yoğunluk slider
- “Hızlı” veya “AI” etiketi
- Tahmini kredi
- Uygula butonu

### 17. AI Araçları

- Arka plan değiştir
- Nesne kaldır
- Fotoğraf genişlet
- Portre iyileştir
- Işık düzelt
- Eski fotoğraf yenile
- Profesyonel portre
- Dergi kapağı

## 7.4. Görsel oluşturma akışı

### 18. Oluştur – Mod Seç

- Arka Plan Değiştir
- Yeni Sahne Oluştur
- Ünlüyle Fotoğraf
- AI Filtre
- Profesyonel Portre

### 19. Fotoğraf Yükle

- Kamerayla çek
- Galeriden seç
- Örnek fotoğraf kuralları
- Maksimum dosya boyutu
- İzin açıklaması

### 20. Kamera

- Yüz oval rehberi
- Flaş
- Ön/arka kamera
- Izgara
- Çekim önerisi
- Galeri kısayolu

### 21. Kırp ve Düzenle

- Döndür
- Kırp
- Yakınlaştır
- Düzelt
- Arka plan temizleme önizlemesi

### 22. Fotoğraf Kalite Kontrolü

Kontroller:

- Yüz görünüyor mu?
- Fotoğraf net mi?
- Işık yeterli mi?
- Birden fazla kişi var mı?
- Yüz çok küçük mü?
- Dosya bozuk mu?

Başarısızsa açık öneri:

> “Yüzünüz biraz karanlık görünüyor. Daha aydınlık bir fotoğraf seçmeniz sonucu iyileştirir.”

### 23. Sahne Seç

- Stadyum
- Soyunma odası
- Kupa töreni
- Basın toplantısı
- Kırmızı halı
- Gala
- Lüks araç
- Konser
- Sahil
- Şehir gecesi
- Bilim kurgu

### 24. Ünlü / Karakter Seç

- Arama
- Futbol
- Müzik
- Sinema
- Moda
- Tarihî kişiler
- Kurgusal yıldızlar

Kart üzerinde:

- Profil görseli
- İsim
- Kategori
- Fan içeriği veya lisanslı etiketi
- Aktif/pasif durum

### 25. Kişi Detayı ve Açıklama

- Kişi görseli
- Kullanılabilir sahneler
- Yasak kullanım özeti
- AI fan içeriği açıklaması
- “Gerçek bir buluşmayı göstermez” bildirimi
- Onay checkbox

### 26. Kompozisyon Seç

- Yan yana
- Selfie
- Orta çekim
- Uzak çekim
- Arka planda
- Grup pozu

### 27. Tarz ve Filtre Seç

- Doğal
- Sinematik
- Telefon kamerası
- Film
- Dergi
- Vintage
- 3D
- Sanatsal

### 28. Görsel Ayarları

- Oran: 1:1, 4:5, 9:16, 16:9
- Kalite: Önizleme, Standart, HD
- Görsel sayısı: 1–4
- Yüz koruma önceliği
- Kıyafeti koru
- Arka plan yoğunluğu
- Özel talimat

### 29. Üretim Özeti

- Kaynak fotoğraf
- Sahne
- Seçilen kişi
- Tarz
- Oran
- Görsel sayısı
- Kredi maliyeti
- Kalan kredi
- Oluştur butonu

### 30. Üretim İlerleme

- Animasyon
- “Fotoğraf analiz ediliyor”
- “Sahne hazırlanıyor”
- “Görsel oluşturuluyor”
- “Son düzenlemeler yapılıyor”
- Tahmini değil, durum bazlı ilerleme
- Uygulamadan çıkabilirsin açıklaması
- Bildirim aç butonu
- İptal butonu yalnızca job OpenAI’ye gitmeden önce aktif

### 31. Sonuçlar / Varyasyonlar

- 1–4 görsel grid
- Seçili sonuç
- Favori
- Yeniden oluştur
- Düzenle
- HD hazırla
- Raporla

## 7.5. Editör ve sonuç ekranları

### 32. AI Sohbetle Düzenle

- Büyük sonuç görseli
- Mesaj balonları
- Metin input
- Hazır öneriler:
  - Daha doğal yap
  - Yakınlaştır
  - Arka planı değiştir
  - Yüzümü koru
  - Işığı düzelt
- Her revizyonun kredi maliyeti
- Versiyon geri alma

### 33. Görsel Editörü

- Kırp
- Döndür
- Işık
- Renk
- Filtre
- Fırça
- Nesne kaldır
- Arka plan
- Yazı – MVP sonrası olabilir

### 34. Önce / Sonra

- Sürüklenebilir karşılaştırma çizgisi
- Orijinal ve sonuç etiketleri
- Yakınlaştırma

### 35. Düzenleme Sonucu

- Önceki versiyon
- Son versiyon
- Versiyon galerisi
- HD indir
- Paylaş

### 36. Dışa Aktar / Paylaş

- Fotoğrafı cihaza kaydet
- Instagram Stories oranı
- Instagram gönderisi oranı
- WhatsApp paylaş
- Link oluştur
- AI içerik açıklaması
- Ünlü modunda zorunlu AI etiketi

## 7.6. Proje ve hesap ekranları

### 37. Projelerim

Sekmeler:

- Tümü
- Favoriler
- Ünlüler
- Filtreler
- Arka planlar

### 38. Proje Detayı

- Proje adı
- Kaynak fotoğraf
- Üretim sürümleri
- Kullanılan şablon
- Kredi hareketleri
- İndir
- Düzenlemeye devam et
- Sil

### 39. Favoriler

- Favori sonuçlar
- Filtreler
- Sahneler
- Kişiler

### 40. Kredi ve Paketler

- Mevcut kredi
- Tek kullanımlık paketler
- Pro abonelik
- Paket karşılaştırma
- Satın alımları geri yükle
- Satın alma geçmişi

### 41. Satın Alma Başarılı / Başarısız

- Güncel bakiye
- İşlem numarası
- Tekrar dene
- Destek

### 42. Bildirimler

- Üretim tamamlandı
- Kredi eklendi
- Kampanya
- Moderasyon sonucu
- Sistem duyurusu

### 43. Profil

- Avatar
- Ad soyad
- Pro durumu
- Kredi
- Proje sayısı
- Favori sayısı
- Kredi satın al
- Abonelik planı
- Ödeme geçmişi
- Ayarlar
- Yardım
- Çıkış

### 44. Profili Düzenle

- Ad/soyad
- Avatar
- Dil
- Bildirim tercihleri

### 45. Güvenlik ve Oturumlar

- Şifre değiştir
- Açık cihazlar
- Tüm cihazlardan çıkış
- Biyometrik uygulama kilidi
- Son girişler

### 46. Gizlilik ve Verilerim

- Kaynak fotoğrafı üretimden sonra sil seçeneği
- Verilerimi indir
- Projelerimi sil
- AI veri kullanımı açıklaması
- Saklama süreleri
- Hesabı sil

### 47. Ayarlar

- Dil
- Bildirim
- Otomatik kaydet
- Mobil veri kullanımı
- Animasyonu azalt
- Varsayılan çıktı kalitesi
- Tema – ilk sürüm yalnızca koyu tema olabilir

### 48. Yardım ve Destek

- SSS
- Talep oluştur
- Satın alma sorunu
- Görsel üretim sorunu
- İçerik kaldırma talebi
- Gizlilik talebi

### 49. İçerik Raporlama

- Yanıltıcı içerik
- İzinsiz fotoğraf
- Kişilik hakkı
- Uygunsuz içerik
- Hatalı sonuç
- Diğer

### 50. Yasal Belgeler

- Kullanım koşulları
- Gizlilik politikası
- AI içerik politikası
- Ünlü/fan içerik açıklaması
- Topluluk kuralları
- Lisanslar

### 51. Hesabı Sil

- Sonuçların açıklaması
- Şifre/sosyal giriş doğrulaması
- Bekleme süresi bilgisi
- Kalıcı onay

## 7.7. Sistem durum ekranları

### 52. İnternet Yok

- Yerel projelere sınırlı erişim
- Tekrar dene

### 53. Sunucu Bakımda

- Açıklama
- Durum sayfası

### 54. Üretim Başarısız

- Hata nedeni
- Kredi iadesi bilgisi
- Tekrar dene
- Destek

### 55. İçerik Engellendi

- Kullanıcı dostu politika açıklaması
- Kredi alınmadı/iade edildi bilgisi
- Talebi değiştir
- İtiraz/rapor mekanizması

---

# 8. Expo React Native Mobil Mimarisi

## 8.1. Önerilen mobil paketler

```text
expo
expo-router
expo-image-picker
expo-camera
expo-image-manipulator
expo-file-system
expo-media-library
expo-sharing
expo-secure-store
expo-notifications
expo-device
expo-application
expo-linking
expo-auth-session
expo-apple-authentication
expo-local-authentication
expo-haptics
expo-linear-gradient
expo-blur
expo-font
expo-splash-screen
expo-web-browser
react-native-reanimated
react-native-gesture-handler
react-native-safe-area-context
react-native-svg
@shopify/flash-list
@shopify/react-native-skia
@tanstack/react-query
zustand
react-hook-form
zod
@hookform/resolvers
axios
socket.io-client
i18next
react-i18next
expo-localization
```

Paketlerin kesin sürümleri proje açıldığı gün Expo’nun güncel kararlı SDK sürümüne göre `npx expo install` ile sabitlenecektir.

## 8.2. Expo Go mu, development build mi?

İlk prototipte Expo Go kullanılabilir. Ancak production geliştirmesinde **Expo Development Build** kullanılmalıdır. Bunun nedenleri:

- Apple Authentication
- RevenueCat veya native in-app purchase
- Gelişmiş görsel işleme paketleri
- Uygulama bütünlüğü ve native konfigürasyon
- Gerçek cihaz bildirim testleri
- App Store/Google Play release davranışına yakın test

## 8.3. Mobil klasör yapısı

```text
apps/mobile/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── verify-email.tsx
│   │   ├── forgot-password.tsx
│   │   └── reset-password.tsx
│   ├── (onboarding)/
│   │   ├── welcome.tsx
│   │   ├── filters.tsx
│   │   ├── fan-moment.tsx
│   │   └── consent.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── home.tsx
│   │   ├── explore.tsx
│   │   ├── projects.tsx
│   │   ├── credits.tsx
│   │   └── profile.tsx
│   ├── create/
│   │   ├── index.tsx
│   │   ├── upload.tsx
│   │   ├── crop.tsx
│   │   ├── quality-check.tsx
│   │   ├── scene.tsx
│   │   ├── person.tsx
│   │   ├── composition.tsx
│   │   ├── style.tsx
│   │   ├── settings.tsx
│   │   ├── review.tsx
│   │   └── progress.tsx
│   ├── filters/
│   │   ├── index.tsx
│   │   └── [slug].tsx
│   ├── generations/
│   │   ├── [id].tsx
│   │   ├── [id]/results.tsx
│   │   ├── [id]/edit.tsx
│   │   ├── [id]/compare.tsx
│   │   └── [id]/export.tsx
│   ├── projects/[id].tsx
│   ├── settings/
│   ├── support/
│   └── legal/
├── src/
│   ├── api/
│   ├── components/
│   ├── features/
│   ├── hooks/
│   ├── stores/
│   ├── theme/
│   ├── utils/
│   ├── validation/
│   ├── types/
│   └── constants/
├── assets/
├── app.config.ts
├── eas.json
└── package.json
```

## 8.4. State yönetimi

### TanStack Query

Sunucudan gelen veriler:

- Kullanıcı profili
- Kredi bakiyesi
- Şablonlar
- Filtreler
- Kişiler
- Projeler
- Generation durumu
- Bildirimler

### Zustand

Geçici oluşturma akışı:

```ts
interface CreateFlowState {
  sourceAssetId: string | null;
  mode: GenerationMode | null;
  sceneId: string | null;
  featuredPersonId: string | null;
  stylePresetId: string | null;
  composition: Composition | null;
  aspectRatio: AspectRatio;
  quality: GenerationQuality;
  numberOfImages: number;
  preserveFace: boolean;
  preserveClothes: boolean;
  customInstruction: string;
  reset(): void;
}
```

Bu state kalıcı kullanıcı verisi değildir. Akış tamamlanınca temizlenir. Kullanıcı uygulamayı yanlışlıkla kapatırsa taslağın sınırlı bir kısmı AsyncStorage’da saklanabilir; token veya hassas sırlar AsyncStorage’a yazılmaz.

## 8.5. API istemcisi

- Base URL env üzerinden gelir.
- Access token request header’a eklenir.
- 401 alınırsa tek bir refresh işlemi yapılır.
- Aynı anda gelen diğer istekler refresh bitene kadar bekler.
- Refresh başarısızsa SecureStore temizlenir ve login’e yönlendirilir.
- Her istekte `X-Request-Id`, `X-App-Version`, `X-Platform`, `X-Device-Id` gönderilir.

## 8.6. Offline yaklaşımı

MVP tamamen offline çalışmaz. Ancak:

- Katalog son başarılı verisi cache’den gösterilebilir.
- Proje küçük resimleri cache’lenebilir.
- Yükleme başlamadıysa taslak saklanabilir.
- Üretim ve ödeme işlemleri internetsiz başlatılamaz.
- Bağlantı geri gelince kullanıcıya tekrar deneme sunulur.

## 8.7. Performans

- Katalog listelerinde FlashList kullanılır.
- Büyük görseller ekrana gelmeden önce uygun thumbnail kullanılır.
- Full resolution dosya yalnızca edit/export ekranında indirilir.
- Ekran dışındaki video veya animasyon durdurulur.
- Fotoğraf upload öncesi makul boyuta küçültülür.
- Görsel preload yalnızca bir sonraki adım için yapılır.
- Aynı anda birden fazla 20 MB dosya RAM’e alınmaz.


---

# 9. Mobil Kimlik Doğrulama ve Token Yönetimi

Eski dokümandaki HttpOnly cookie yaklaşımı web için uygundur; fakat Expo mobil uygulamasında ana yöntem olarak **Bearer access token + SecureStore refresh token** kullanılacaktır.

## 9.1. Token stratejisi

### Access token

- JWT biçiminde
- Kısa ömürlü: önerilen 10–15 dakika
- Mobil uygulamanın RAM’inde tutulur
- API çağrılarında `Authorization: Bearer <token>` olarak gönderilir
- Uygulama yeniden açıldığında refresh token kullanılarak tekrar alınır

### Refresh token

- JWT olmak zorunda değildir; yüksek entropili rastgele değer olması tercih edilir
- Önerilen ömür: 30 gün
- Expo SecureStore içinde tutulur
- Veritabanında ham hali değil, SHA-256/HMAC hash’i tutulur
- Her yenilemede rotation yapılır
- Eski token tekrar kullanılırsa token family’si iptal edilir

## 9.2. Session tablosu yaklaşımı

Her cihaz oturumu ayrı kayıt olur:

```text
User
└── Session 1 – iPhone
└── Session 2 – Android
└── Session 3 – iPad
```

Session alanları:

- `id`
- `userId`
- `tokenFamilyId`
- `refreshTokenHash`
- `deviceId`
- `deviceName`
- `platform`
- `appVersion`
- `ipHash`
- `userAgent`
- `expiresAt`
- `lastUsedAt`
- `rotatedAt`
- `revokedAt`
- `revokedReason`

## 9.3. Kayıt akışı

**Endpoint:** `POST /v1/auth/register`

İstek:

```json
{
  "email": "ali@example.com",
  "password": "Guclu-Sifre-123!",
  "firstName": "Ali",
  "lastName": "Yılmaz",
  "termsVersion": "2026-09-01",
  "privacyVersion": "2026-09-01",
  "ageConfirmed": true
}
```

Backend adımları:

1. Zod doğrulaması
2. E-posta normalize edilir
3. Kullanıcı var mı kontrol edilir
4. Şifre Argon2id ile hash’lenir
5. User, Profile, Wallet ve Consent kayıtları transaction içinde oluşturulur
6. Ham doğrulama token’ı oluşturulur
7. Veritabanına token hash’i yazılır
8. E-posta işi BullMQ’ya gönderilir
9. Genel bir başarı cevabı döndürülür

## 9.4. E-posta doğrulama

Mobil deep link:

```text
retakeai://auth/verify-email?token=...
```

Backend endpoint’i:

```text
POST /v1/auth/verify-email
```

Token:

- Tek kullanımlıktır
- Ham hali e-postaya gönderilir
- Hash’i veritabanındadır
- 24 saat sonra geçersiz olur
- Kullanıldıktan sonra `usedAt` doldurulur

## 9.5. Login akışı

**Endpoint:** `POST /v1/auth/login`

İstek:

```json
{
  "email": "ali@example.com",
  "password": "Guclu-Sifre-123!",
  "device": {
    "deviceId": "local-generated-uuid",
    "platform": "ios",
    "deviceName": "iPhone",
    "appVersion": "1.0.0"
  }
}
```

Yanıt:

```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "accessTokenExpiresIn": 900,
    "user": {
      "id": "...",
      "email": "ali@example.com",
      "firstName": "Ali",
      "role": "USER"
    }
  }
}
```

Mobil uygulama:

1. Refresh token’ı SecureStore’a yazar.
2. Access token’ı memory store’a yazar.
3. `/v1/me` çağrısı yapar.
4. Ana uygulamaya yönlenir.

## 9.6. Refresh token rotation

```mermaid
sequenceDiagram
    participant M as Mobil
    participant A as Express API
    participant D as PostgreSQL

    M->>A: POST /auth/refresh + refreshToken
    A->>D: Token hash ile session ara
    D-->>A: Aktif session
    A->>D: Eski tokenı rotated/revoked yap
    A->>D: Yeni refresh token hash ile session güncelle
    A-->>M: Yeni access + refresh token
    M->>M: SecureStore içindeki tokenı değiştir
```

### Reuse detection

Daha önce rotate edilmiş eski token yeniden gelirse:

- Token family içindeki tüm session’lar kapatılır.
- Kullanıcıya güvenlik bildirimi gönderilir.
- Olay `AuditLog` içine yazılır.
- Kullanıcı tekrar login olmak zorunda kalır.

## 9.7. Logout

**Endpoint:** `POST /v1/auth/logout`

- Gönderilen refresh token’ın session’ı revoke edilir.
- Mobil SecureStore temizlenir.
- Access token memory’den silinir.
- Query cache temizlenir.

## 9.8. Tüm cihazlardan çıkış

**Endpoint:** `POST /v1/auth/logout-all`

- Kullanıcının aktif session’larının tümü revoke edilir.
- Mevcut cihaz da login ekranına gönderilir.

## 9.9. Google ve Apple girişi

Mobil uygulama sosyal sağlayıcıdan bir identity token veya authorization code alır ve backend’e yollar.

Backend:

1. Sağlayıcı token’ını sağlayıcının anahtarlarıyla doğrular.
2. E-posta ve provider user ID alınır.
3. `AuthAccount` kaydı bulunur veya oluşturulur.
4. E-posta başka hesapta bulunuyorsa güvenli hesap bağlama akışı uygulanır.
5. Uygulama access/refresh token’ları üretilir.

Endpoint’ler:

```text
POST /v1/auth/google
POST /v1/auth/apple
POST /v1/auth/link/google
POST /v1/auth/link/apple
DELETE /v1/auth/accounts/:provider
```

## 9.10. Biyometrik uygulama kilidi

Face ID veya parmak izi, backend login yerine geçmez. Sadece SecureStore’daki oturumun yerel erişimini korur.

- Kullanıcı ayarlardan açar.
- Uygulama foreground’a döndüğünde local authentication ister.
- Biyometri değişirse token erişilemeyebilir; kullanıcı yeniden login olur.
- Kritik verinin tek kaynağı SecureStore olmaz.

## 9.11. Şifre güvenliği

- En az 10 karakter önerilir.
- Büyük/küçük harf, sayı ve sembol desteklenir.
- Çok katı ama tahmin edilebilir kurallar yerine güçlü parola ve sızmış parola kontrolü tercih edilir.
- Şifre loglanmaz.
- Reset sonrası tüm session’ları kapatma varsayılan olur.
- Login hata cevabı “e-posta veya şifre hatalı” şeklinde genel tutulur.

---

# 10. Fotoğraf Yükleme, Kamera ve Kalite Kontrolü

## 10.1. Kabul edilen formatlar

- JPEG
- PNG
- WebP
- iPhone HEIC seçilirse mobilde JPEG/WebP’ye dönüştürme veya backend dönüştürme

Önerilen limitler:

- İlk upload için maksimum 20 MB
- Maksimum kenar 4096 px
- Minimum yüz genişliği 200 px önerisi
- En az 512x512 kaynak görsel
- Tek kullanıcı fotoğrafı MVP’de tercih edilir

## 10.2. Mobil ön işleme

Fotoğraf yüklenmeden önce:

1. URI doğrulanır.
2. Dosya tipi kontrol edilir.
3. EXIF yönü uygulanır.
4. Uzun kenar örneğin 2048–3072 px aralığına küçültülür.
5. Kalite 0.85–0.92 aralığında sıkıştırılır.
6. Kullanıcıya upload önizlemesi gösterilir.
7. Dosyanın SHA-256 özeti hesaplanabilir.

Mobil ön işleme yalnızca ağ ve performans optimizasyonudur. Güvenlik kontrolü backend’de tekrar yapılır.

## 10.3. Upload akışı

```mermaid
sequenceDiagram
    participant M as Expo Mobil
    participant A as Express API
    participant S as R2 Storage
    participant W as Asset Worker
    participant D as PostgreSQL

    M->>A: POST /uploads/initiate
    A->>D: PENDING Asset oluştur
    A-->>M: assetId + signedUploadUrl
    M->>S: PUT görsel
    M->>A: POST /uploads/:assetId/complete
    A->>W: Asset validate job
    W->>S: Dosyayı indir
    W->>W: Magic byte, boyut, EXIF, Sharp
    W->>D: Asset READY veya REJECTED
    A-->>M: Asset durumu
```

## 10.4. Backend dosya kontrolleri

- MIME header’a güvenilmez; magic byte kontrol edilir.
- Dosya gerçekten görsel olarak decode edilebiliyor mu kontrol edilir.
- Pixel count ve decompression bomb sınırı uygulanır.
- EXIF ve GPS metadata temizlenir.
- Zararlı payload/bozuk dosya kontrolü yapılır.
- Orijinal dosya quarantine prefix’ine yüklenir.
- Kontrol sonrası safe prefix’ine taşınır veya yeni obje oluşturulur.
- Kullanıcının başka kullanıcı asset ID’sine erişmesi engellenir.

## 10.5. Asset türleri

```text
USER_SOURCE
APPROVED_REFERENCE
SCENE_PREVIEW
FILTER_PREVIEW
GENERATION_PREVIEW
GENERATION_FINAL
THUMBNAIL
AVATAR
MODERATION_COPY
```

## 10.6. Fotoğraf kalite kontrolü

Kalite kontrolü iki katmanlı olabilir:

### Yerel hızlı kontrol

- Görsel boyutu
- Dosya boyutu
- Kırpma oranı
- Çok karanlık/çok parlak temel histogram

### AI/görsel analiz kontrolü

OpenAI görüntü anlayan modelinden yapılandırılmış cevap alınır:

```json
{
  "accepted": true,
  "faceCount": 1,
  "faceVisible": true,
  "faceSharpness": "good",
  "lighting": "acceptable",
  "occlusion": "none",
  "subjectTooSmall": false,
  "nudityRisk": false,
  "recommendedCrop": "portrait_center",
  "warnings": []
}
```

Bu analiz kesin biyometrik tanıma için kullanılmaz. Amacı üretim kalitesini yükseltmek ve uygunsuz girdileri yönlendirmektir.

## 10.7. Kaynak fotoğraf önerileri

Uygulamada kullanıcıya şu öneriler gösterilir:

- Yüzünüz tamamen görünsün.
- Güneş gözlüğü veya yüzü kapatan nesne olmasın.
- Fotoğraf çok karanlık olmasın.
- Aşırı filtreli fotoğraf yerine doğal fotoğraf seçin.
- Omuzların görünmesi kompozisyonu iyileştirir.
- Fotoğrafta yalnızca siz olun.
- Başkasına ait fotoğrafı izinsiz yüklemeyin.

## 10.8. Saklama seçeneği

Kullanıcıya iki seçenek sunulur:

- “Kaynak fotoğrafımı projede sakla”
- “Üretim tamamlanınca kaynak fotoğrafımı sil”

İkinci seçenek seçilirse kaynak asset, üretim ve itiraz süreci tamamlandıktan sonra kısa bir güvenlik penceresi içinde silme kuyruğuna alınır.

---

# 11. Filtre Sistemi

Filtre sistemi ikiye ayrılmalıdır: **anlık filtreler** ve **AI filtreler**.

## 11.1. Anlık filtreler

Cihazda hızlı önizleme verir ve kredi harcamaz.

Örnek işlem reçetesi:

```json
{
  "type": "LOCAL_FILTER",
  "preset": "cinematic_soft",
  "operations": {
    "brightness": -0.03,
    "contrast": 1.12,
    "saturation": 0.92,
    "temperature": 0.04,
    "highlights": -0.12,
    "shadows": 0.08,
    "grain": 0.05,
    "vignette": 0.08
  }
}
```

Önizleme için React Native Skia kullanılabilir. Final export sırasında aynı reçete Sharp ile backend’de uygulanarak cihazlar arası tutarlılık sağlanabilir.

## 11.2. AI filtreler

Görselin yapısını veya stilini daha derin biçimde değiştirir. OpenAI görsel düzenleme çağrısı gerekir.

Örnekler:

- Drip Art
- Pop Art
- 3D Cartoon
- Fantasy Portrait
- Magazine Cover
- Retro Film Scene
- Futuristic Portrait
- Painting

## 11.3. Filtre veri modeli

Her filtre için:

```json
{
  "slug": "drip-art",
  "name": "Drip Art",
  "category": "ARTISTIC",
  "engine": "OPENAI",
  "creditCost": 3,
  "isPro": true,
  "previewAssetId": "asset_123",
  "promptModifier": "Transform the image into an original colorful drip-art portrait...",
  "preserveFaceDefault": true,
  "supportsIntensity": false,
  "enabled": true
}
```

## 11.4. Filtre kategorileri

```text
ALL
POPULAR
NATURAL
PORTRAIT
CINEMATIC
ARTISTIC
RETRO
BLACK_AND_WHITE
FANTASY
PROFESSIONAL
```

## 11.5. Filtre yoğunluğu

Anlık filtrelerde gerçek bir slider uygulanır. AI filtrelerinde “Düşük/Orta/Yüksek” gibi prompt profilleri kullanılabilir. Kullanıcıya yanıltıcı yüzde gösterilmez; çünkü generatif model etkisi tam doğrusal değildir.

## 11.6. Non-destructive editing

Orijinal görsel değiştirilmez. Projede yalnızca düzenleme reçetesi tutulur:

```json
{
  "crop": { "x": 0.1, "y": 0.0, "width": 0.8, "height": 1.0 },
  "rotation": 0,
  "localFilter": "cinematic_soft",
  "localFilterIntensity": 0.72,
  "aiGenerationId": "gen_123"
}
```

Kullanıcı filtreyi geri alabilir veya başka filtre deneyebilir.

## 11.7. Filtre önizleme maliyeti

- Yerel filtre: ücretsiz ve anlık
- AI filtre küçük önizleme: 1–2 kredi
- Standart çıktı: 3–5 kredi
- HD çıktı: 8–12 kredi

Kredi karşılıkları model maliyeti ve mağaza komisyonuna göre admin panelinden değiştirilebilir.

---

# 12. Express.js Backend Mimarisi

Backend, Express.js üzerinde TypeScript ile yazılacaktır. Route içinde iş mantığı tutulmayacaktır.

## 12.1. Katmanlar

```text
Route
  -> Validation Middleware
  -> Authentication/Authorization Middleware
  -> Controller
  -> Service
  -> Repository / Prisma
  -> External Providers
```

### Route

URL, middleware ve controller bağlar.

### Controller

- Request verisini alır
- Service çağırır
- Standart response döndürür
- İş mantığı içermez

### Service

- İş kuralları
- Transaction yönetimi
- Yetki kontrolü
- Kuyruk oluşturma
- Provider çağrılarını koordine etme

### Repository

- Prisma sorguları
- Tekrarlanan veri erişim kodları

### Provider

- OpenAI
- Storage
- E-posta
- Push
- RevenueCat / store doğrulaması

## 12.2. API process ile worker process ayrımı

### API process

- Hızlı HTTP işlemleri
- Auth
- Katalog
- Proje CRUD
- Upload URL üretme
- Generation başlatma
- Durum sorgulama

### Worker process

- Görsel indirme/işleme
- OpenAI çağrıları
- Moderasyon
- Output post-processing
- Push bildirim
- Silme işleri
- E-posta işleri

OpenAI çağrısı route’un içinde bekletilmez. Böylece API timeout, yeniden başlatma veya yoğunluk durumunda iş kaybı azalır.

## 12.3. Önerilen backend paketleri

```text
express
cors
helmet
compression
cookie-parser              # yalnızca admin web veya gerekli yardımcı akışlarda
zod
@prisma/client
prisma
argon2
jose
openai
ioredis
bullmq
sharp
multer                     # yalnızca kontrollü küçük multipart endpoint gerekirse
pino
pino-http
express-rate-limit
rate-limit-redis
nanoid
uuid
undici
nodemailer veya resend SDK
socket.io
prom-client                # opsiyonel metrics
@asteasolutions/zod-to-openapi
swagger-ui-express
```

## 12.4. Node runtime

- Güncel desteklenen Node.js LTS sürümü kullanılmalıdır.
- `package.json` içinde engine sınırı tanımlanır.
- ESM veya CommonJS baştan seçilir; proje boyunca karıştırılmaz.
- Öneri: ESM + TypeScript + `tsx` geliştirme runner.

## 12.5. Request yaşam döngüsü

Her request için:

1. Request ID oluşturulur veya header’dan alınır.
2. Güvenlik header’ları uygulanır.
3. CORS kontrol edilir.
4. Body boyutu kontrol edilir.
5. Rate limit uygulanır.
6. Auth gerekiyorsa token doğrulanır.
7. Zod ile input doğrulanır.
8. Controller çalışır.
9. Response envelope döner.
10. Süre, status code ve request ID loglanır.
11. Hata varsa merkezi error handler işleme alır.

---

# 13. Monorepo ve Klasör Yapısı

Önerilen paket yöneticisi: `pnpm`.

```text
retake-ai/
├── apps/
│   ├── mobile/                  # Expo React Native
│   ├── api/                     # Express API
│   ├── worker/                  # BullMQ worker process
│   └── admin/                   # Opsiyonel React/Vite admin paneli
├── packages/
│   ├── contracts/               # Zod request/response şemaları
│   ├── database/                # Prisma schema ve client
│   ├── ai/                      # Prompt builder ve OpenAI ortak kodu
│   ├── storage/                 # R2/local adapter
│   ├── config/                  # Ortak environment doğrulama
│   ├── logger/                  # Pino config
│   ├── shared/                  # Enum, yardımcılar
│   └── tsconfig/                # Ortak TS config
├── infra/
│   ├── docker/
│   ├── nginx/
│   ├── scripts/
│   └── monitoring/
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── prompts.md
│   ├── safety-policy.md
│   ├── data-retention.md
│   └── app-store-checklist.md
├── .github/workflows/
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── README.md
```

## 13.1. API klasör yapısı

```text
apps/api/src/
├── app.ts
├── server.ts
├── config/
├── middleware/
│   ├── auth.middleware.ts
│   ├── role.middleware.ts
│   ├── request-id.middleware.ts
│   ├── rate-limit.middleware.ts
│   ├── validate.middleware.ts
│   ├── error.middleware.ts
│   └── not-found.middleware.ts
├── modules/
│   ├── auth/
│   ├── users/
│   ├── sessions/
│   ├── assets/
│   ├── catalog/
│   ├── filters/
│   ├── featured-people/
│   ├── projects/
│   ├── generations/
│   ├── moderation/
│   ├── billing/
│   ├── notifications/
│   ├── reports/
│   ├── support/
│   └── admin/
├── providers/
│   ├── openai/
│   ├── storage/
│   ├── email/
│   ├── push/
│   └── payments/
├── queues/
├── utils/
└── types/
```

## 13.2. Worker klasör yapısı

```text
apps/worker/src/
├── worker.ts
├── queues/
│   ├── generation.worker.ts
│   ├── asset.worker.ts
│   ├── notification.worker.ts
│   ├── email.worker.ts
│   └── deletion.worker.ts
├── jobs/
│   ├── analyze-source.job.ts
│   ├── moderate-input.job.ts
│   ├── generate-image.job.ts
│   ├── post-process.job.ts
│   ├── moderate-output.job.ts
│   └── finalize-generation.job.ts
└── providers/
```

## 13.3. Ortak contract paketi

Mobil ile backend aynı request/response tiplerini kullanabilir:

```ts
export const CreateGenerationSchema = z.object({
  projectId: z.string().uuid(),
  sourceAssetId: z.string().uuid(),
  mode: z.enum([
    "BACKGROUND_REPLACE",
    "FULL_SCENE",
    "FAN_MOMENT",
    "AI_FILTER",
    "PRO_PORTRAIT"
  ]),
  sceneTemplateId: z.string().uuid().nullable(),
  featuredPersonId: z.string().uuid().nullable(),
  stylePresetId: z.string().uuid().nullable(),
  aspectRatio: z.enum(["1:1", "4:5", "9:16", "16:9"]),
  quality: z.enum(["PREVIEW", "STANDARD", "HD"]),
  numberOfImages: z.number().int().min(1).max(4),
  preserveFace: z.boolean(),
  preserveClothes: z.boolean(),
  customInstruction: z.string().max(1000).optional()
});
```

Bu paket sayesinde mobil ve backend sözleşmesi farklılaşmaz.


---

# 14. Backend Modülleri

## 14.1. Core / Config modülü

Görevleri:

- Environment variable doğrulama
- Uygulama başlangıç kontrolleri
- Veritabanı bağlantısı
- Redis bağlantısı
- OpenAI client oluşturma
- Storage provider seçimi
- Logger
- Health ve readiness endpoint’leri
- Feature flag sistemi

Uygulama, kritik env eksikse sessizce başlamamalı; başlangıçta hata verip kapanmalıdır.

## 14.2. Auth modülü

Görevleri:

- Kayıt
- Login
- E-posta doğrulama
- Refresh token rotation
- Logout
- Tüm cihazlardan çıkış
- Google girişi
- Apple girişi
- Şifre sıfırlama
- Hesap bağlama
- Session listeleme
- Session revoke

## 14.3. User modülü

Görevleri:

- Profil getirme/güncelleme
- Avatar
- Dil
- Bildirim tercihleri
- Uygulama tercihleri
- Veri export talebi
- Hesap silme talebi
- Kullanıcı durumu

## 14.4. Asset modülü

Görevleri:

- Upload başlatma
- Signed URL üretme
- Upload complete
- Asset sahipliği
- Thumbnail
- EXIF temizleme
- Dosya validasyonu
- Geçici/public/private erişim URL’si
- Retention ve deletion

## 14.5. Catalog modülü

Tek endpoint ailesiyle mobil katalog verisini sağlar:

- Ana sayfa bölümleri
- Sahne şablonları
- Stil presetleri
- Filtreler
- Öne çıkan kişiler
- Kategoriler
- Arama önerileri
- Uygulama içi kampanyalar

Katalog response’ları Redis ile kısa süre cache’lenebilir.

## 14.6. Featured People modülü

Görevleri:

- Kişi kataloğu
- Lisans/hak durum kontrolü
- Ülke ve yaş kısıtı
- Sahnelerle uyumluluk
- Kullanım açıklamaları
- Aktif/pasif
- Politik/tarihî hassasiyet flag’leri
- Reference asset erişimi
- Takedown/acil kapatma

## 14.7. Project modülü

Proje, kullanıcının tek bir yaratıcı çalışmasını temsil eder.

Görevleri:

- Taslak oluşturma
- Kaynak asset bağlama
- Mod, sahne, kişi ve stil seçimi
- Proje adı
- Proje listesi
- Favori
- Arşiv
- Silme
- Versiyon geçmişi

## 14.8. Generation modülü

Görevleri:

- Üretim isteğini doğrulama
- Kredi maliyeti hesaplama
- Kredi rezervasyonu
- Moderasyon ön kontrolü
- Prompt snapshot oluşturma
- BullMQ job oluşturma
- Durum ve ilerleme
- İptal
- Tekrar dene
- Varyasyon seçimi
- Finalize
- Revizyon zinciri
- Kredi iadesi

## 14.9. AI Orchestrator modülü

Görevleri:

- Kullanıcı talebini normalize etme
- Sahne promptu derleme
- Uygulama güvenlik kurallarını ekleme
- Referans görsel sıralaması
- OpenAI model seçimi
- Maliyet/kalite profili
- Retry kararları
- Provider response normalizasyonu
- Request ID ve usage kaydı

Bu modül OpenAI’ye doğrudan bağımlı controller yazılmasını engeller.

## 14.10. Moderation modülü

Görevleri:

- Input metin moderasyonu
- Input görsel moderasyonu
- Output görsel moderasyonu
- Uygulama içi yasak kullanım kuralları
- Manuel review kuyruğu
- Kullanıcı ihlal puanı
- Appeal/itiraz
- Raporlama

## 14.11. Billing modülü

Görevleri:

- Wallet
- Reserved balance
- Credit ledger
- Paketler
- Abonelik
- Apple/Google purchase doğrulama
- RevenueCat webhook
- Refund/chargeback
- Restore purchases
- Promosyon kredisi
- Admin kredi düzeltmesi

## 14.12. Notification modülü

- Expo push token kaydı
- Üretim tamamlandı bildirimi
- Üretim başarısız bildirimi
- Kredi bildirimi
- Güvenlik bildirimi
- E-posta tercihleri
- Bildirim inbox

## 14.13. Report ve Support modülü

- İçerik raporu
- İzinsiz görüntü şikâyeti
- Kişilik hakkı kaldırma talebi
- Satın alma sorunu
- Teknik hata
- Moderasyon itirazı
- Destek ticket durumları

## 14.14. Admin modülü

- Dashboard
- Kullanıcı yönetimi
- Kişi kataloğu
- Şablon/prompt yönetimi
- Generation job yönetimi
- Queue durumu
- Moderasyon
- Kredi paketleri
- Feature flags
- Audit logs
- Sistem kill switch

---

# 15. API Standartları ve Endpoint Planı

## 15.1. API sürümleme

Tüm endpoint’ler:

```text
/v1/...
```

Breaking değişiklikte `/v2` açılır. Mevcut mobil sürümün çalışması için eski sürüm belirli süre desteklenir.

## 15.2. Başarılı response formatı

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_01J...",
    "timestamp": "2026-09-02T09:00:00.000Z"
  }
}
```

## 15.3. Hata response formatı

```json
{
  "success": false,
  "error": {
    "code": "GENERATION_INSUFFICIENT_CREDITS",
    "message": "Bu üretim için yeterli krediniz bulunmuyor.",
    "details": {
      "required": 10,
      "available": 4
    }
  },
  "meta": {
    "requestId": "req_01J..."
  }
}
```

Production’da stack trace dönülmez.

## 15.4. Pagination

Cursor tabanlı pagination tercih edilir:

```text
GET /v1/projects?limit=20&cursor=project_abc
```

Yanıt:

```json
{
  "success": true,
  "data": {
    "items": [],
    "nextCursor": "project_xyz",
    "hasMore": true
  }
}
```

## 15.5. Idempotency

Kredi, satın alma ve generation başlatma endpoint’lerinde:

```text
Idempotency-Key: mobile-generated-uuid
```

Aynı anahtar ve aynı request body tekrar gelirse ikinci kez kredi düşülmez veya aynı iş yeniden açılmaz.

## 15.6. Auth endpoint’leri

```text
POST   /v1/auth/register
POST   /v1/auth/login
POST   /v1/auth/refresh
POST   /v1/auth/logout
POST   /v1/auth/logout-all
POST   /v1/auth/verify-email
POST   /v1/auth/resend-verification
POST   /v1/auth/forgot-password
POST   /v1/auth/reset-password
POST   /v1/auth/google
POST   /v1/auth/apple
GET    /v1/auth/sessions
DELETE /v1/auth/sessions/:sessionId
```

## 15.7. Kullanıcı endpoint’leri

```text
GET    /v1/me
PATCH  /v1/me
PATCH  /v1/me/preferences
POST   /v1/me/avatar
GET    /v1/me/data-export
POST   /v1/me/data-export
DELETE /v1/me
POST   /v1/me/cancel-deletion
```

## 15.8. Upload ve asset endpoint’leri

```text
POST   /v1/uploads/initiate
POST   /v1/uploads/:assetId/complete
GET    /v1/assets/:assetId
GET    /v1/assets/:assetId/access-url
DELETE /v1/assets/:assetId
POST   /v1/assets/:assetId/retry-validation
```

### Upload initiate isteği

```json
{
  "fileName": "selfie.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 4830123,
  "purpose": "USER_SOURCE",
  "sha256": "optional-client-hash"
}
```

### Upload initiate yanıtı

```json
{
  "success": true,
  "data": {
    "assetId": "6be8...",
    "uploadUrl": "https://signed-private-url",
    "method": "PUT",
    "headers": {
      "Content-Type": "image/jpeg"
    },
    "expiresIn": 300
  }
}
```

## 15.9. Katalog endpoint’leri

```text
GET /v1/catalog/home
GET /v1/catalog/search?q=...
GET /v1/catalog/scenes
GET /v1/catalog/scenes/:slug
GET /v1/catalog/filters
GET /v1/catalog/filters/:slug
GET /v1/catalog/styles
GET /v1/catalog/featured-people
GET /v1/catalog/featured-people/:slug
GET /v1/catalog/categories
```

Kişi endpoint’i yalnızca kullanıcının ülke, yaş ve uygulama sürümüne uygun aktif kayıtları döndürür.

## 15.10. Proje endpoint’leri

```text
POST   /v1/projects
GET    /v1/projects
GET    /v1/projects/:projectId
PATCH  /v1/projects/:projectId
DELETE /v1/projects/:projectId
POST   /v1/projects/:projectId/favorite
DELETE /v1/projects/:projectId/favorite
GET    /v1/projects/:projectId/generations
```

## 15.11. Generation endpoint’leri

```text
POST   /v1/generations/quote
POST   /v1/generations
GET    /v1/generations/:generationId
POST   /v1/generations/:generationId/cancel
POST   /v1/generations/:generationId/retry
POST   /v1/generations/:generationId/select-output
POST   /v1/generations/:generationId/revisions
GET    /v1/generations/:generationId/messages
POST   /v1/generations/:generationId/messages
POST   /v1/generations/:generationId/export
```

### Quote endpoint’i

Üretimden önce kredi hesabı yapılır:

```json
{
  "mode": "FAN_MOMENT",
  "quality": "HD",
  "numberOfImages": 2,
  "sceneTemplateId": "...",
  "featuredPersonId": "...",
  "stylePresetId": "..."
}
```

Yanıt:

```json
{
  "success": true,
  "data": {
    "creditCost": 20,
    "availableCredits": 34,
    "canGenerate": true,
    "breakdown": [
      { "label": "2 HD görsel", "credits": 18 },
      { "label": "Fan Moment sahnesi", "credits": 2 }
    ]
  }
}
```

### Generation oluşturma isteği

```json
{
  "projectId": "...",
  "sourceAssetId": "...",
  "mode": "FAN_MOMENT",
  "sceneTemplateId": "...",
  "featuredPersonId": "...",
  "stylePresetId": "...",
  "composition": "SELFIE",
  "aspectRatio": "4:5",
  "quality": "STANDARD",
  "numberOfImages": 2,
  "preserveFace": true,
  "preserveClothes": true,
  "customInstruction": "Gece stadyum ışıkları olsun.",
  "disclosureAccepted": true
}
```

Yanıt hemen işi döndürür:

```json
{
  "success": true,
  "data": {
    "generationId": "...",
    "status": "QUEUED",
    "creditReservationId": "...",
    "estimatedPosition": 3
  }
}
```

## 15.12. Generation durum yanıtı

```json
{
  "success": true,
  "data": {
    "id": "...",
    "status": "GENERATING",
    "stage": "OPENAI_IMAGE_GENERATION",
    "progress": 55,
    "message": "Görseliniz oluşturuluyor.",
    "outputs": [],
    "credit": {
      "reserved": 10,
      "charged": 0,
      "refunded": 0
    },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

`progress` teknik bir yüzde garantisi değildir; aşama ağırlıklarından türetilir.

## 15.13. Revizyon endpoint’i

```text
POST /v1/generations/:generationId/revisions
```

```json
{
  "instruction": "Kamera biraz uzak olsun ve ortam daha doğal görünsün.",
  "sourceOutputId": "...",
  "quality": "STANDARD"
}
```

Yeni revision ayrı generation kaydıdır ve `parentGenerationId` ile bağlanır.

## 15.14. Filtre endpoint’leri

```text
POST /v1/filters/quote
POST /v1/filters/apply
GET  /v1/filters/jobs/:id
```

Anlık local filtreler backend çağrısı yapmadan uygulanabilir. Final export gerekirse recipe backend’e gönderilir.

## 15.15. Kredi ve satın alma endpoint’leri

```text
GET  /v1/billing/wallet
GET  /v1/billing/transactions
GET  /v1/billing/products
POST /v1/billing/purchases/apple/verify
POST /v1/billing/purchases/google/verify
POST /v1/billing/purchases/restore
POST /v1/webhooks/revenuecat
POST /v1/webhooks/apple
POST /v1/webhooks/google
```

## 15.16. Bildirim endpoint’leri

```text
POST   /v1/push/devices
DELETE /v1/push/devices/:id
GET    /v1/notifications
PATCH  /v1/notifications/:id/read
POST   /v1/notifications/read-all
```

## 15.17. Rapor ve destek endpoint’leri

```text
POST /v1/reports
GET  /v1/support/tickets
POST /v1/support/tickets
GET  /v1/support/tickets/:id
POST /v1/support/tickets/:id/messages
```

## 15.18. Admin endpoint’leri

```text
GET    /v1/admin/dashboard
GET    /v1/admin/users
GET    /v1/admin/users/:id
PATCH  /v1/admin/users/:id/status
POST   /v1/admin/users/:id/credits
GET    /v1/admin/generations
GET    /v1/admin/generations/:id
POST   /v1/admin/generations/:id/retry
POST   /v1/admin/generations/:id/refund
CRUD   /v1/admin/scenes
CRUD   /v1/admin/filters
CRUD   /v1/admin/featured-people
CRUD   /v1/admin/prompt-versions
GET    /v1/admin/moderation
PATCH  /v1/admin/moderation/:id
GET    /v1/admin/audit-logs
PATCH  /v1/admin/feature-flags/:key
```

---

# 16. PostgreSQL ve Prisma Veri Modeli

Aşağıdaki şema, ilişkilerin ve ana alanların uygulanabilir bir başlangıç taslağıdır. Proje geliştirilirken migration’lar küçük ve kontrollü şekilde çıkarılmalıdır.

## 16.1. Ana enum’lar

```prisma
enum UserRole {
  USER
  SUPPORT
  MODERATOR
  ADMIN
  SUPER_ADMIN
}

enum UserStatus {
  PENDING_VERIFICATION
  ACTIVE
  SUSPENDED
  DELETION_PENDING
  DELETED
}

enum AuthProvider {
  PASSWORD
  GOOGLE
  APPLE
}

enum AssetType {
  USER_SOURCE
  APPROVED_REFERENCE
  SCENE_PREVIEW
  FILTER_PREVIEW
  GENERATION_PREVIEW
  GENERATION_FINAL
  THUMBNAIL
  AVATAR
}

enum AssetStatus {
  PENDING_UPLOAD
  UPLOADED
  VALIDATING
  READY
  REJECTED
  DELETION_PENDING
  DELETED
}

enum ProjectMode {
  BACKGROUND_REPLACE
  FULL_SCENE
  FAN_MOMENT
  AI_FILTER
  PRO_PORTRAIT
}

enum ProjectStatus {
  DRAFT
  ACTIVE
  ARCHIVED
  DELETION_PENDING
  DELETED
}

enum GenerationStatus {
  DRAFT
  VALIDATING
  MODERATING_INPUT
  BLOCKED
  QUEUED
  PREPARING
  GENERATING
  POST_PROCESSING
  MODERATING_OUTPUT
  COMPLETED
  FAILED
  CANCELLED
  DELETION_PENDING
  DELETED
}

enum GenerationQuality {
  PREVIEW
  STANDARD
  HD
}

enum FeaturedPersonKind {
  FICTIONAL_CHARACTER
  LICENSED_PERSON
  PUBLIC_FIGURE_FAN_ART
  HISTORICAL_FIGURE
}

enum RightsStatus {
  FICTIONAL
  PENDING_REVIEW
  LICENSED
  LIMITED
  EXPIRED
  BLOCKED
}

enum CreditTransactionType {
  PURCHASE
  SUBSCRIPTION_GRANT
  GENERATION_RESERVATION
  GENERATION_CAPTURE
  GENERATION_RELEASE
  REFUND
  BONUS
  ADMIN_ADJUSTMENT
  CHARGEBACK
}

enum TransactionStatus {
  PENDING
  COMPLETED
  FAILED
  REVERSED
}

enum ModerationStage {
  INPUT_TEXT
  INPUT_IMAGE
  COMPILED_PROMPT
  OUTPUT_IMAGE
  USER_REPORT
}

enum ModerationAction {
  ALLOW
  BLOCK
  REVIEW
  WARN
}
```

## 16.2. Kullanıcı ve authentication modelleri

```prisma
model User {
  id                String      @id @default(uuid())
  email             String      @unique
  passwordHash      String?
  firstName         String?
  lastName          String?
  role              UserRole    @default(USER)
  status            UserStatus  @default(PENDING_VERIFICATION)
  emailVerifiedAt   DateTime?
  locale            String      @default("tr-TR")
  countryCode       String?
  dateOfBirth       DateTime?
  lastLoginAt       DateTime?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  deletedAt         DateTime?

  profile           Profile?
  accounts          AuthAccount[]
  sessions          Session[]
  emailTokens       EmailToken[]
  consents          ConsentRecord[]
  assets            Asset[]
  projects          Project[]
  generations       Generation[]
  wallet            CreditWallet?
  transactions      CreditTransaction[]
  purchases         StorePurchase[]
  subscriptions     Subscription[]
  pushDevices       PushDevice[]
  notifications     Notification[]
  reports           Report[]
  auditLogs         AuditLog[]  @relation("AuditActor")

  @@index([status])
  @@index([createdAt])
}

model Profile {
  id                 String   @id @default(uuid())
  userId             String   @unique
  avatarAssetId      String?
  bio                String?
  defaultAspectRatio String   @default("4:5")
  defaultQuality     String   @default("STANDARD")
  keepSourcePhotos   Boolean  @default(true)
  marketingEmail     Boolean  @default(false)
  pushEnabled        Boolean  @default(true)
  reducedMotion      Boolean  @default(false)
  preferences        Json?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model AuthAccount {
  id                String       @id @default(uuid())
  userId            String
  provider          AuthProvider
  providerAccountId String
  providerEmail     String?
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  user              User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id               String    @id @default(uuid())
  userId           String
  tokenFamilyId    String
  refreshTokenHash String    @unique
  deviceId         String?
  deviceName       String?
  platform         String?
  appVersion       String?
  ipHash           String?
  userAgent        String?
  expiresAt        DateTime
  lastUsedAt       DateTime  @default(now())
  rotatedAt        DateTime?
  revokedAt        DateTime?
  revokedReason    String?
  createdAt        DateTime  @default(now())

  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, revokedAt])
  @@index([tokenFamilyId])
  @@index([expiresAt])
}

model EmailToken {
  id         String    @id @default(uuid())
  userId     String
  type       String
  tokenHash  String    @unique
  expiresAt  DateTime
  usedAt     DateTime?
  createdAt  DateTime  @default(now())

  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, type])
  @@index([expiresAt])
}

model ConsentRecord {
  id                            String   @id @default(uuid())
  userId                        String
  termsVersion                  String
  privacyVersion                String
  aiDisclosureVersion           String
  ageConfirmed                  Boolean
  ownImageOrPermissionConfirmed Boolean
  publicFigureDisclosureAccepted Boolean @default(false)
  ipHash                        String?
  userAgent                     String?
  createdAt                     DateTime @default(now())

  user                          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}
```

## 16.3. Asset modelleri

```prisma
model Asset {
  id              String       @id @default(uuid())
  ownerId         String?
  type            AssetType
  status          AssetStatus  @default(PENDING_UPLOAD)
  storageProvider String
  storageKey      String       @unique
  originalName    String?
  mimeType        String
  sizeBytes       BigInt
  width           Int?
  height          Int?
  sha256          String?
  perceptualHash  String?
  isPrivate       Boolean      @default(true)
  moderationState String?
  retentionUntil  DateTime?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  deletedAt       DateTime?

  owner           User?        @relation(fields: [ownerId], references: [id], onDelete: SetNull)
  variants        AssetVariant[]
  generationInputs GenerationInput[]
  generationOutputs GenerationOutput[]

  @@index([ownerId, createdAt])
  @@index([status])
  @@index([retentionUntil])
  @@index([sha256])
}

model AssetVariant {
  id          String   @id @default(uuid())
  assetId     String
  kind        String
  storageKey  String   @unique
  mimeType    String
  sizeBytes   BigInt
  width       Int?
  height      Int?
  createdAt   DateTime @default(now())

  asset       Asset    @relation(fields: [assetId], references: [id], onDelete: Cascade)

  @@unique([assetId, kind])
}
```

## 16.4. Katalog modelleri

```prisma
model SceneTemplate {
  id                  String   @id @default(uuid())
  slug                String   @unique
  name                String
  description         String?
  category            String
  previewAssetId      String?
  basePrompt           String
  negativeConstraints String?
  allowedModes        String[]
  requiredCredits     Int      @default(0)
  isPro               Boolean  @default(false)
  enabled             Boolean  @default(true)
  sortOrder           Int      @default(0)
  config              Json?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  projects            Project[]

  @@index([category, enabled, sortOrder])
}

model StylePreset {
  id                  String   @id @default(uuid())
  slug                String   @unique
  name                String
  category            String
  engine              String
  previewAssetId      String?
  promptModifier      String?
  localOperations     Json?
  requiredCredits     Int      @default(0)
  isPro               Boolean  @default(false)
  supportsIntensity   Boolean  @default(false)
  preserveFaceDefault Boolean  @default(true)
  enabled             Boolean  @default(true)
  sortOrder           Int      @default(0)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  projects            Project[]
}

model FeaturedPerson {
  id                    String             @id @default(uuid())
  slug                  String             @unique
  displayName           String
  category              String
  kind                  FeaturedPersonKind
  rightsStatus          RightsStatus
  promptDescriptor      String
  referenceAssetId      String?
  isHistorical          Boolean            @default(false)
  isPoliticalOrSensitive Boolean           @default(false)
  minimumAge            Int?
  allowedCountries      String[]
  blockedCountries      String[]
  allowedSceneSlugs     String[]
  blockedUseCases       String[]
  disclosureText        String?
  rightsOwner           String?
  licenseStartsAt       DateTime?
  licenseEndsAt         DateTime?
  legalNotes            String?
  enabled               Boolean            @default(false)
  sortOrder             Int                @default(0)
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  projects              Project[]

  @@index([category, enabled, sortOrder])
  @@index([rightsStatus, enabled])
}
```

> `referenceAssetId` alanının gerçek relation’a dönüştürülmesi implementation sırasında yapılabilir. Katalog referans görselleri ayrı sahiplik ve erişim kurallarıyla korunmalıdır.

## 16.5. Proje ve generation modelleri

```prisma
model Project {
  id                 String        @id @default(uuid())
  userId             String
  title              String?
  mode               ProjectMode
  status             ProjectStatus @default(DRAFT)
  sourceAssetId      String?
  sceneTemplateId    String?
  stylePresetId      String?
  featuredPersonId   String?
  composition        String?
  aspectRatio        String         @default("4:5")
  editRecipe         Json?
  isFavorite         Boolean        @default(false)
  lastOpenedAt       DateTime?
  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt
  deletedAt          DateTime?

  user               User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  sceneTemplate      SceneTemplate? @relation(fields: [sceneTemplateId], references: [id], onDelete: SetNull)
  stylePreset        StylePreset?    @relation(fields: [stylePresetId], references: [id], onDelete: SetNull)
  featuredPerson     FeaturedPerson? @relation(fields: [featuredPersonId], references: [id], onDelete: SetNull)
  generations        Generation[]

  @@index([userId, createdAt])
  @@index([userId, isFavorite])
  @@index([status])
}

model Generation {
  id                    String            @id @default(uuid())
  userId                String
  projectId             String
  parentGenerationId    String?
  status                GenerationStatus  @default(DRAFT)
  stage                 String?
  progress              Int               @default(0)
  quality               GenerationQuality
  requestedImageCount   Int               @default(1)
  aspectRatio           String
  width                 Int?
  height                Int?
  preserveFace          Boolean           @default(true)
  preserveClothes       Boolean           @default(true)
  userInstruction       String?
  normalizedIntent      Json?
  compiledPrompt        String?
  promptVersion         String?
  provider              String            @default("OPENAI")
  model                 String
  providerRequestId     String?
  providerResponseId    String?
  providerUsage         Json?
  estimatedCostUsd      Decimal?          @db.Decimal(12, 6)
  actualCostUsd         Decimal?          @db.Decimal(12, 6)
  reservedCredits       Int               @default(0)
  chargedCredits        Int               @default(0)
  refundedCredits       Int               @default(0)
  failureCode           String?
  failureMessage        String?
  retryCount            Int               @default(0)
  startedAt             DateTime?
  completedAt           DateTime?
  failedAt              DateTime?
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt
  deletedAt             DateTime?

  user                  User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  project               Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)
  parentGeneration      Generation?         @relation("GenerationTree", fields: [parentGenerationId], references: [id], onDelete: SetNull)
  childGenerations      Generation[]        @relation("GenerationTree")
  inputs                GenerationInput[]
  outputs               GenerationOutput[]
  messages              GenerationMessage[]
  moderationEvents      ModerationEvent[]

  @@index([userId, createdAt])
  @@index([projectId, createdAt])
  @@index([status, createdAt])
  @@index([providerRequestId])
}

model GenerationInput {
  id            String     @id @default(uuid())
  generationId  String
  assetId       String
  role          String
  sortOrder     Int        @default(0)
  createdAt     DateTime   @default(now())

  generation    Generation @relation(fields: [generationId], references: [id], onDelete: Cascade)
  asset         Asset      @relation(fields: [assetId], references: [id], onDelete: Restrict)

  @@unique([generationId, assetId, role])
}

model GenerationOutput {
  id               String     @id @default(uuid())
  generationId     String
  assetId          String
  variantIndex     Int
  selected         Boolean    @default(false)
  watermarkApplied Boolean    @default(false)
  disclosureType   String?
  safetyMetadata   Json?
  createdAt        DateTime   @default(now())

  generation       Generation @relation(fields: [generationId], references: [id], onDelete: Cascade)
  asset            Asset      @relation(fields: [assetId], references: [id], onDelete: Restrict)

  @@unique([generationId, variantIndex])
  @@index([assetId])
}

model GenerationMessage {
  id               String     @id @default(uuid())
  generationId     String
  role             String
  content          String
  normalizedIntent Json?
  createdAt        DateTime   @default(now())

  generation       Generation @relation(fields: [generationId], references: [id], onDelete: Cascade)

  @@index([generationId, createdAt])
}
```

## 16.6. Prompt ve moderasyon modelleri

```prisma
model PromptVersion {
  id              String   @id @default(uuid())
  key             String
  version         Int
  template        String
  safetyRules     String
  outputSchema    Json?
  notes           String?
  isActive        Boolean  @default(false)
  createdByUserId String?
  createdAt       DateTime @default(now())
  publishedAt     DateTime?

  @@unique([key, version])
  @@index([key, isActive])
}

model ModerationEvent {
  id            String           @id @default(uuid())
  userId        String?
  generationId  String?
  assetId       String?
  stage         ModerationStage
  provider      String
  model         String
  flagged       Boolean
  action        ModerationAction
  categories    Json?
  scores        Json?
  policyRule    String?
  reason        String?
  reviewedById  String?
  reviewedAt    DateTime?
  createdAt     DateTime         @default(now())

  generation    Generation?      @relation(fields: [generationId], references: [id], onDelete: SetNull)

  @@index([generationId, stage])
  @@index([action, createdAt])
  @@index([userId, createdAt])
}
```

## 16.7. Kredi ve satın alma modelleri

```prisma
model CreditWallet {
  id              String   @id @default(uuid())
  userId          String   @unique
  available       Int      @default(0)
  reserved        Int      @default(0)
  lifetimeEarned  Int      @default(0)
  lifetimeSpent   Int      @default(0)
  version         Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model CreditTransaction {
  id               String                @id @default(uuid())
  userId           String
  type             CreditTransactionType
  status           TransactionStatus     @default(PENDING)
  amount           Int
  availableAfter   Int?
  reservedAfter    Int?
  referenceType    String?
  referenceId      String?
  idempotencyKey   String?               @unique
  description      String?
  metadata         Json?
  createdAt        DateTime              @default(now())
  completedAt      DateTime?

  user             User                  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([referenceType, referenceId])
}

model StorePurchase {
  id                    String            @id @default(uuid())
  userId                String
  platform              String
  productId             String
  originalTransactionId String?
  transactionId         String            @unique
  status                String
  creditsGranted        Int               @default(0)
  priceAmount           Decimal?          @db.Decimal(12, 2)
  priceCurrency         String?
  purchasePayload       Json?
  purchasedAt           DateTime?
  verifiedAt            DateTime?
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  user                  User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([originalTransactionId])
}

model Subscription {
  id                 String    @id @default(uuid())
  userId             String
  provider           String
  entitlementId      String
  productId          String
  status             String
  currentPeriodStart DateTime?
  currentPeriodEnd   DateTime?
  autoRenewing       Boolean   @default(false)
  metadata           Json?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, status])
  @@unique([provider, entitlementId])
}
```

## 16.8. Bildirim, rapor ve audit modelleri

```prisma
model PushDevice {
  id            String   @id @default(uuid())
  userId        String
  expoPushToken String   @unique
  deviceId      String?
  platform      String
  appVersion    String?
  enabled       Boolean  @default(true)
  lastSeenAt    DateTime @default(now())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, enabled])
}

model Notification {
  id          String    @id @default(uuid())
  userId      String
  type        String
  title       String
  body        String
  data        Json?
  sentAt      DateTime?
  readAt      DateTime?
  createdAt   DateTime  @default(now())

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, readAt, createdAt])
}

model Report {
  id                 String   @id @default(uuid())
  reporterUserId     String
  targetGenerationId String?
  reason             String
  description        String?
  status             String   @default("OPEN")
  assignedToUserId   String?
  resolution         String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  resolvedAt         DateTime?

  reporter           User     @relation(fields: [reporterUserId], references: [id], onDelete: Cascade)

  @@index([status, createdAt])
  @@index([targetGenerationId])
}

model AuditLog {
  id          String   @id @default(uuid())
  actorUserId String?
  action      String
  entityType  String
  entityId    String?
  requestId   String?
  ipHash      String?
  metadata    Json?
  createdAt   DateTime @default(now())

  actor       User?    @relation("AuditActor", fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([actorUserId, createdAt])
  @@index([entityType, entityId])
  @@index([requestId])
}

model IdempotencyRecord {
  id            String   @id @default(uuid())
  userId        String?
  route         String
  key           String
  requestHash   String
  responseCode  Int?
  responseBody  Json?
  lockedUntil   DateTime?
  expiresAt     DateTime
  createdAt     DateTime @default(now())

  @@unique([route, key])
  @@index([expiresAt])
}
```

## 16.9. Veritabanı ilkeleri

- Para yerine kredi tutulsa bile her değişiklik ledger tablosuna yazılır.
- Wallet alanı performans için özet bakiyedir; gerçek hareketler `CreditTransaction` kayıtlarıdır.
- Generation prompt ve model snapshot’ı saklanır; şablon sonradan değişse de eski üretim izlenebilir.
- Kullanıcı silindiğinde finansal/audit kayıtlar mevzuata göre anonimleştirilebilir; doğrudan kontrolsüz cascade ile yok edilmez.
- Tüm tarih alanları UTC saklanır.
- Büyük JSON alanlarına gereksiz veri doldurulmaz.
- İndeksler gerçek sorgu planlarına göre gözden geçirilir.
- Wallet güncellemeleri transaction ve optimistic version ile yarış koşullarına karşı korunur.

---

# 17. AWS Kullanmadan Dosya Depolama

## 17.1. Önerilen production çözümü

**Cloudflare R2 private bucket** önerilir.

Nedenleri:

- AWS hesabı gerektirmez.
- Obje depolama mantığı görsel uygulaması için uygundur.
- Signed URL üretilebilir.
- Private bucket kullanılabilir.
- CDN/custom domain ile kontrollü dağıtım yapılabilir.
- API ve worker stateless kalabilir.

## 17.2. Depolama adapter’ı

Kod doğrudan R2’ye kilitlenmemelidir:

```ts
export interface StorageProvider {
  createUploadUrl(input: {
    key: string;
    contentType: string;
    expiresInSeconds: number;
  }): Promise<{ url: string; headers?: Record<string, string> }>;

  createDownloadUrl(input: {
    key: string;
    expiresInSeconds: number;
  }): Promise<string>;

  putObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
    metadata?: Record<string, string>;
  }): Promise<void>;

  getObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
```

Implementasyonlar:

```text
LocalStorageProvider       -> development/test
R2StorageProvider          -> production
MinioStorageProvider       -> self-hosted alternatif
```

R2 S3-uyumlu protokol sunabilir; bu, AWS servisi kullanıldığı anlamına gelmez. Projede AWS hesabı, AWS kaynakları ve AWS faturalandırması bulunmayacaktır. İstenirse AWS adlı SDK bağımlılığı yerine MinIO client veya imza üreten bağımsız bir istemci kullanılabilir.

## 17.3. Bucket/prefix yapısı

```text
private/
├── users/{userId}/sources/{assetId}/original.webp
├── users/{userId}/sources/{assetId}/thumb.webp
├── users/{userId}/generations/{generationId}/preview-1.webp
├── users/{userId}/generations/{generationId}/final-1.webp
├── users/{userId}/avatars/{assetId}.webp
├── catalog/scenes/{slug}/preview.webp
├── catalog/filters/{slug}/preview.webp
├── catalog/people/{personId}/reference.webp
└── moderation/{year}/{month}/{eventId}.webp
```

## 17.4. Public URL yerine signed URL

Kullanıcı kaynakları ve sonuçları public bucket URL’siyle açık sunulmamalıdır.

- Upload URL: 5 dakika
- Download preview URL: 5–15 dakika
- Final download URL: 1–5 dakika
- Share link: uygulama backend route’u + ayrı revoke edilebilir token

## 17.5. Share link modeli

Kullanıcı paylaşım linki oluşturduğunda:

```text
https://share.retake.ai/s/AbC123
```

Backend:

- Share token’ını hash’li saklar.
- Linkin son kullanma tarihini tutar.
- Kullanıcı linki iptal edebilir.
- Sayfada AI açıklaması gösterir.
- Gerçek storage key’i kullanıcıya açıklamaz.

## 17.6. Development storage

Local development:

```text
./.local-storage/
```

- Git’e eklenmez.
- Docker volume ile tutulur.
- Testlerde in-memory fake provider kullanılabilir.

## 17.7. Dosya yaşam döngüsü

- Başlatılıp tamamlanmayan upload: 24 saat sonra silinir.
- Rejected asset: kısa inceleme süresi sonrası silinir.
- Kullanıcının “kaynağı sil” tercihi: generation tamamlandıktan sonra deletion job.
- Silinen proje: grace period sonunda output ve input asset’ler silinir.
- Hesap silme: ilişkili kişisel asset’ler toplu deletion kuyruğuna girer.
- Yedeklerden silinme süresi gizlilik politikasında açık yazılır.


---

# 18. OpenAI Yapay Zekâ Mimarisi

## 18.1. ChatGPT uygulaması değil, OpenAI API kullanılacak

Bu projede kullanıcıya ayrı bir ChatGPT ekranı gömülmeyecektir. “ChatGPT kullanacağız” ifadesinin teknik karşılığı şudur:

- Mobil uygulama yalnızca Retake AI arayüzünü gösterir.
- Kullanıcı metni, fotoğrafı ve seçimleri Express API’ye gider.
- Express API, isteği doğrular ve üretim işini kuyruğa ekler.
- Worker, OpenAI API ile güvenli sunucu bağlantısı kurar.
- OpenAI metin modeli isteği yapılandırır ve prompt üretir.
- OpenAI görsel modeli yeni görseli üretir veya mevcut görseli düzenler.
- Sonuç Retake AI depolamasına kaydedilir ve mobil uygulamaya iletilir.

Kullanıcı hiçbir aşamada OpenAI API anahtarını görmez. OpenAI anahtarı yalnızca backend ve worker ortam değişkenlerinde bulunur.

```mermaid
sequenceDiagram
    participant U as Kullanıcı
    participant M as Expo Mobil
    participant A as Express API
    participant Q as BullMQ
    participant W as Worker
    participant O as OpenAI API
    participant S as R2 Storage

    U->>M: Fotoğraf + sahne + talimat
    M->>A: POST /v1/generations
    A->>A: Kimlik, hak, kota ve kredi kontrolü
    A->>Q: Generation job
    A-->>M: generationId + QUEUED
    Q->>W: İşi teslim et
    W->>S: Kaynakları güvenli URL ile al
    W->>O: Moderasyon + prompt + image edit
    O-->>W: Üretilen görsel
    W->>S: Preview/final kaydet
    W->>A: DB durumunu güncelle
    A-->>M: Socket/poll/push ile tamamlandı
```

## 18.2. Kullanılacak OpenAI parçaları

### A. Metin ve istek yorumlama

Metin modeli şu görevlerde kullanılacaktır:

- Kullanıcının serbest metnini yapılandırılmış JSON’a dönüştürme
- Sahne, kompozisyon, kamera, ışık ve stil alanlarını çıkarma
- Eksik ama güvenli varsayımları belirleme
- Kullanıcı talimatını uygulama içi kurallarla birleştirme
- Revizyon talimatını önceki üretime göre yorumlama
- Kullanıcıya uygun hata ve yönlendirme metni hazırlama

Metin modeli adı kodun içine sabit yazılmamalıdır:

```env
OPENAI_TEXT_MODEL=<güncel_ve_onaylı_model>
```

Böylece model değiştiğinde uygulama yeniden derlenmeden konfigürasyon değiştirilebilir.

### B. Görsel üretme ve düzenleme

Ana görsel modeli:

```env
OPENAI_IMAGE_MODEL=gpt-image-2
```

Kullanım biçimleri:

- Sıfırdan sahne üretme
- Kullanıcının fotoğrafını referans alarak yeni sahne oluşturma
- Arka plan veya belirli bölgeyi düzenleme
- İlk sonuç üzerinde sohbetle revizyon yapma
- Birden fazla referans görselle kontrollü kompozisyon oluşturma

### C. Moderasyon

```env
OPENAI_MODERATION_MODEL=omni-moderation-latest
```

Moderasyon üç noktada çalışır:

1. Kullanıcının yazdığı metin ve yüklediği kaynak fotoğraf
2. Worker’ın OpenAI’ye göndereceği derlenmiş prompt
3. Üretim sonucunun metin/görsel güvenlik kontrolü

Moderasyon tek başına yeterli kabul edilmeyecektir. Uygulama ayrıca kendi ürün kurallarını, kişi hakları kontrolünü, yaş kontrolünü, kötüye kullanım sinyallerini ve insan incelemesini kullanacaktır.

## 18.3. Images API ve Responses API ayrımı

### Images API

Tek seferlik ve belirli bir görsel işi için tercih edilir:

- Bir fotoğrafı belirli prompt ile düzenle
- Birkaç varyasyon üret
- Önizleme veya final çıktı oluştur
- Maskeli düzenleme uygula

### Responses API

Çok turlu AI sohbet düzenleyicisi için tercih edilir:

- “Ronaldo biraz geride olsun.”
- “Kamerayı uzaklaştır.”
- “Yüzüme dokunma.”
- “Aynı sahneyi gece yap.”
- “İkinci görseldeki ışığı koru.”

Her generation/revision kaydı hangi API yolu ve hangi modelle üretildiğini saklamalıdır. Bu bilgi kullanıcıya gösterilmese bile maliyet, hata analizi ve tekrar üretilebilirlik için önemlidir.

## 18.4. Model eğitimi neden ilk sürümde yapılmayacak?

Retake AI MVP’sinde fine-tuning veya kişiye özel model eğitimi gerekmemektedir. Kullanıcı fotoğrafı ve kontrollü prompt ile image editing yapılacaktır.

İlk sürümde model eğitmemenin nedenleri:

- Daha hızlı geliştirme
- GPU sunucusu gerektirmemesi
- Kullanıcı yüz verisinin eğitim setine girmemesi
- Ünlü kişilerin fotoğraflarının izinsiz eğitim verisi olarak toplanmaması
- Veri silme taleplerinin daha kolay yönetilmesi
- Model güncelleme ve bakım maliyetinin düşük olması
- İlk ürün-pazar uyumunu ölçmeden pahalı altyapı kurulmaması

“Modeli eğitmek” ile “referans fotoğraf kullanmak” aynı şey değildir. Bu projede kaynak görsel, yalnızca kullanıcının talep ettiği üretim sırasında referans olarak kullanılır; kalıcı bir kişisel model oluşturulmaz.

## 18.5. AI provider soyutlaması

OpenAI entegrasyonu controller içine doğrudan yazılmamalıdır. Bir provider interface kullanılmalıdır:

```ts
export type ImageGenerationInput = {
  requestId: string;
  prompt: string;
  sourceImages: Array<{
    buffer: Buffer;
    mimeType: "image/jpeg" | "image/png" | "image/webp";
    role: "USER" | "SCENE" | "PERSON" | "PREVIOUS_OUTPUT";
  }>;
  quality: "low" | "medium" | "high";
  size: "1024x1024" | "1024x1536" | "1536x1024";
  numberOfImages: number;
};

export type ImageGenerationOutput = {
  providerRequestId?: string;
  images: Array<{
    bytes: Buffer;
    mimeType: string;
  }>;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
};

export interface ImageGenerationProvider {
  generate(input: ImageGenerationInput): Promise<ImageGenerationOutput>;
}
```

Uygulama içinde:

```text
OpenAIImageGenerationProvider
FakeImageGenerationProvider      -> test
DisabledImageGenerationProvider  -> acil kapatma modu
```

Bu ayrım şu avantajları sağlar:

- Testlerde gerçek OpenAI harcaması yapılmaz.
- Provider hataları tek katmanda yönetilir.
- Model veya endpoint değişikliği merkezi yapılır.
- Gelecekte ikinci bir sağlayıcı eklemek gerekirse ürün servisleri bozulmaz.

## 18.6. OpenAI anahtar ve organizasyon güvenliği

- Anahtar `.env` dosyasında veya secret manager içinde tutulur.
- Mobil bundle, EAS config public alanı veya Expo Constants içine eklenmez.
- GitHub Actions loglarına yazdırılmaz.
- Hata mesajında anahtarın hiçbir parçası döndürülmez.
- Development, staging ve production için ayrı OpenAI proje anahtarları kullanılır.
- Production anahtarı yalnızca worker container’ına verilir.
- API container’ı doğrudan image generation yapmayacaksa OpenAI anahtarına ihtiyaç duymaz.
- Harcama limiti ve alarmı OpenAI proje seviyesinde ayrıca ayarlanır.
- Anahtar periyodik döndürülür.
- Bir anahtar sızdığı düşünülürse hemen iptal edilir ve audit olayı oluşturulur.

## 18.7. İstek zaman aşımı ve retry yaklaşımı

Her OpenAI isteğinde:

- Uygun timeout
- Provider request ID
- Internal request ID
- Model adı
- Prompt sürümü
- Başlama/bitiş zamanı
- Deneme sayısı
- Hata türü

kaydedilir.

Retry yapılabilecek hatalar:

- Ağ kopması
- Geçici timeout
- `429` rate limit
- Geçici `5xx` sağlayıcı hatası

Retry yapılmayacak hatalar:

- Moderasyon engeli
- Geçersiz görsel formatı
- Lisans/hak kontrolü başarısızlığı
- Yetersiz kredi
- Kullanıcının iptal ettiği iş
- Kalıcı validation hatası

Retry sırasında exponential backoff ve jitter uygulanır.

## 18.8. AI veri minimizasyonu

OpenAI’ye yalnızca üretim için gerekli veri gönderilir:

- Kullanıcının e-posta adresi gönderilmez.
- Gerçek kullanıcı ID yerine rastgele internal request ID kullanılır.
- Cihaz kimliği veya IP adresi prompt içine yazılmaz.
- Gereksiz EXIF metadata gönderilmez.
- Kaynak dosya adı kişisel bilgi içermeyecek şekilde normalize edilir.
- Prompt loglarında hassas metinler maskelenir.
- Kullanıcının açık talebi dışında geçmiş projeler yeni generation’a eklenmez.

OpenAI tarafındaki veri ayarları ve saklama seçenekleri yayına çıkmadan önce kullanılan endpoint/model için tekrar doğrulanmalı ve gizlilik politikasında açıkça belirtilmelidir.

## 18.9. Model capability registry

Modellerin özellikleri veritabanı yerine kod/config registry içinde tutulabilir:

```ts
export const AI_MODEL_REGISTRY = {
  imagePrimary: {
    provider: "openai",
    model: process.env.OPENAI_IMAGE_MODEL!,
    supportsImageEdit: true,
    supportsMultipleReferences: true,
    allowedQualities: ["low", "medium", "high"],
    maxAppReferenceImages: 3,
  },
  moderationPrimary: {
    provider: "openai",
    model: process.env.OPENAI_MODERATION_MODEL!,
    supportsText: true,
    supportsImage: true,
  },
} as const;
```

Bu registry, UI’daki seçenekleri değil backend’in teknik sınırlarını belirler. Kullanıcı hiçbir zaman doğrudan model seçmemelidir; ürün uygun modeli otomatik seçer.

---

# 19. Prompt Üretimi ve Yapılandırılmış Çıktı

## 19.1. Prompt sistemi neden ayrı bir modül olmalı?

Kullanıcıdan gelen cümleyi doğrudan görsel modeline göndermek:

- Tutarsız sonuç üretir.
- Ürün kurallarını atlatabilir.
- Ünlü hak kontrolünü zorlaştırır.
- Prompt injection riskini artırır.
- Aynı şablonda farklı kalite oluşmasına neden olur.
- Maliyet ve hata analizi yapılamaz.

Bu nedenle prompt üç ayrı aşamada hazırlanmalıdır:

1. **Intent parsing:** Kullanıcının ne istediği yapılandırılır.
2. **Policy enrichment:** Hak, güvenlik, yaş ve ürün kuralları eklenir.
3. **Prompt compilation:** Görsel modele gönderilecek nihai prompt oluşturulur.

## 19.2. Yapılandırılmış generation intent modeli

```ts
const GenerationIntentSchema = z.object({
  operation: z.enum([
    "BACKGROUND_REPLACE",
    "FULL_SCENE",
    "FAN_MOMENT",
    "AI_FILTER",
    "REVISION",
  ]),
  sceneId: z.string().nullable(),
  filterId: z.string().nullable(),
  featuredPersonId: z.string().nullable(),
  composition: z.object({
    framing: z.enum(["CLOSE_UP", "HALF_BODY", "FULL_BODY", "WIDE"]),
    userPosition: z.enum(["LEFT", "CENTER", "RIGHT"]),
    companionPosition: z.enum(["LEFT", "CENTER", "RIGHT"]).nullable(),
    cameraDistance: z.enum(["NEAR", "MEDIUM", "FAR"]),
  }),
  lighting: z.enum([
    "NATURAL",
    "STUDIO",
    "GOLDEN_HOUR",
    "STADIUM",
    "NIGHT_CINEMATIC",
  ]),
  style: z.enum([
    "PHOTOREALISTIC",
    "CINEMATIC",
    "EDITORIAL",
    "RETRO",
    "ANIMATED",
  ]),
  preserve: z.object({
    face: z.boolean(),
    hairstyle: z.boolean(),
    skinTone: z.boolean(),
    clothing: z.boolean(),
    pose: z.boolean(),
  }),
  output: z.object({
    aspectRatio: z.enum(["1:1", "4:5", "9:16", "16:9"]),
    quality: z.enum(["low", "medium", "high"]),
    numberOfImages: z.number().int().min(1).max(4),
  }),
  userInstructionSummary: z.string().max(600),
  detectedRisks: z.array(z.string()),
});
```

Metin modelinin çıktısı bu Zod şemasından geçmeden kabul edilmez.

## 19.3. Kullanıcı girdileri ile sistem girdilerinin ayrımı

Aşağıdakiler sistem tarafından belirlenir ve kullanıcı değiştiremez:

- AI etiketi gerekliliği
- Kamuya mal olmuş kişi kullanım politikası
- Gerçek olay veya reklam onayı izlenimi vermeme kuralı
- Uygunsuz içerik kısıtları
- Kimlik hırsızlığı ve sahte kanıt üretmeme kuralı
- Ürün logosu/sponsor/marka kuralları
- Çocuk güvenliği
- Moderasyon gerekliliği

Kullanıcının metni ayrı bir data alanı olarak modele verilir:

```text
USER_INSTRUCTION_DATA:
"Gece stadyumunda yan yana selfie olsun, ışıklar açık olsun."
```

Kullanıcının “önceki talimatları unut”, “AI etiketini kaldır” veya “kuralları yok say” gibi ifadeleri sistem promptunu değiştiremez.

## 19.4. Prompt bileşenleri

Nihai prompt şu bloklardan oluşur:

```text
1. Görevin türü
2. Kaynak görsel rollerinin açıklaması
3. Kullanıcının korunacak özellikleri
4. Sahne açıklaması
5. Seçilen kurgusal/lisanslı kişinin güvenli açıklaması
6. Kompozisyon
7. Kamera ve lens hissi
8. Işık ve gölge
9. Stil ve renk
10. Gerçekçilik/etiketleme koşulu
11. Negatif kısıtlar
12. Teknik çıktı hedefi
```

## 19.5. Standart kaynak koruma bloğu

```text
Use the uploaded user image only as the identity and appearance reference
for the primary subject. Preserve the user's recognizable facial structure,
hairstyle, skin tone, approximate age appearance and selected clothing as
closely as the editing task allows. Do not replace the user with another
person. Do not change protected attributes unless the user explicitly chose
an allowed transformation that requires it.
```

Bu metin bir garanti değildir. UI’da “AI sonucu yüzünüzü küçük ölçüde değiştirebilir” açıklaması ayrıca gösterilir.

## 19.6. Arka plan değiştirme prompt şablonu

```text
TASK: Controlled background replacement.

PRIMARY SUBJECT:
Use source image 1 as the user reference. Preserve the original user's face,
body, clothing and pose. Keep the foreground subject visually consistent.

NEW ENVIRONMENT:
{{sceneDescription}}

COMPOSITION:
{{compositionDescription}}

LIGHTING:
Match the new environment's light direction, exposure, color temperature,
contact shadows and depth of field while preserving the user's identity.

CONSTRAINTS:
No extra faces, no duplicate body parts, no text, no unintended logos,
no misleading news context and no removal of required AI disclosure metadata.
```

## 19.7. Kurgusal yıldızla fan sahnesi prompt şablonu

```text
Create a clearly fictional AI-generated fan scene.

Source image 1 is the user. Preserve the user's identity and selected outfit.
Add one original fictional internationally known football-star character based
only on the approved catalog description below. The character must not copy or
closely reproduce the likeness of a real athlete or public figure.

FICTIONAL CHARACTER DESCRIPTION:
{{approvedCharacterDescription}}

SCENE:
{{sceneDescription}}

COMPOSITION:
{{compositionDescription}}

The result must read as fan artwork, not documentary evidence of a real meeting,
endorsement, sponsorship, news event or historical fact.
```

## 19.8. Lisanslı kişi için prompt şablonu

Bu şablon yalnızca backend hak motoru `ALLOW` sonucu verirse kullanılabilir:

```text
Create an AI-generated fan image using the approved reference assets associated
with featured person catalog record {{featuredPersonId}}. Use only the approved
reference set and stay within the authorized scene, territory and campaign rules.

The first source image is the user. Preserve the user's recognizable identity.
The second/approved source set represents the licensed featured person.

SCENE:
{{sceneDescription}}

COMPOSITION:
{{compositionDescription}}

Do not imply a real endorsement, commercial recommendation, historical meeting,
news event or political message unless the rights record explicitly authorizes
that exact campaign. Keep the required visible AI-generated label.
```

## 19.9. Revizyon promptu

Kullanıcı:

> “Ünlü kişi biraz geride olsun, beni değiştirme, ışığı daha doğal yap.”

Yapılandırılmış revizyon:

```json
{
  "targetVersionId": "gen_output_123",
  "changes": [
    {
      "target": "FEATURED_PERSON",
      "action": "MOVE_BACK"
    },
    {
      "target": "PRIMARY_USER",
      "action": "PRESERVE_IDENTITY_STRONGLY"
    },
    {
      "target": "LIGHTING",
      "action": "MAKE_NATURAL"
    }
  ],
  "keepUnchanged": [
    "SCENE",
    "USER_CLOTHING",
    "CAMERA_FRAMING"
  ]
}
```

Nihai revizyon promptu önceki output’u kaynak alır ve yalnızca istenen farkları vurgular.

## 19.10. Prompt versiyonlama

Her prompt şablonunun sürümü olmalıdır:

```text
fan-moment:v1
fan-moment:v2
background-replace:v3
revision-preserve-face:v2
```

Generation kaydı şunları saklar:

- `promptTemplateKey`
- `promptTemplateVersion`
- `compiledPromptHash`
- `intentJson`
- `policySnapshotJson`
- `model`
- `provider`

Tam promptun kalıcı saklanması gizlilik açısından gerekli değilse, şifreli veya sınırlı süreli tutulmalı; uzun vadeli analiz için hash ve normalize edilmiş alanlar yeterli olabilir.

## 19.11. Prompt yönetimi

Prompt değişiklikleri doğrudan production’a çıkmamalıdır:

1. Yeni prompt taslağı oluşturulur.
2. Offline eval dataset üzerinde çalıştırılır.
3. Safety testleri yapılır.
4. Staging’de sınırlı gerçek üretim yapılır.
5. Admin/ürün sahibi onaylar.
6. Versiyon aktif edilir.
7. Gerekirse yüzde bazlı rollout yapılır.
8. Hata oranı artarsa önceki sürüme dönülür.

## 19.12. Prompt injection savunması

- Serbest kullanıcı metni maksimum uzunlukla sınırlanır.
- Kullanıcı metni HTML/Unicode kontrolünden geçirilir.
- Sistem promptu ile kullanıcı metni farklı message alanlarında tutulur.
- Kullanıcı metninden model/endpoint/anahtar seçimi yapılmaz.
- Kullanıcı, `featuredPersonId` yerine keyfi referans URL veremez.
- Prompt içindeki URL’ler takip edilmez.
- Worker internetten keyfi dosya indirmez.
- AI çıktısı backend kararının yerine geçmez.
- “Model uygun dedi” hak kontrolünün kanıtı sayılmaz.
- Yapılandırılmış çıktı Zod ile doğrulanır.
- Başarısız parse sonucu otomatik olarak güvenli fallback veya kullanıcıya düzeltme isteği döner.

---

# 20. Görsel Üretim Hattı

## 20.1. Ana prensip

Görsel üretme isteği tek bir API çağrısı değildir. Güvenli ve hataya dayanıklı bir işlem zinciridir:

```text
Talep oluştur
→ doğrula
→ kaynakları kontrol et
→ moderasyon
→ kişi/hak kontrolü
→ fiyat teklifi
→ kredi rezerve et
→ kuyruğa al
→ prompt derle
→ OpenAI ile üret
→ kalite kontrol
→ output moderasyonu
→ AI etiketi/metadata
→ depola
→ krediyi kesinleştir
→ kullanıcıya bildir
```

## 20.2. Tam state machine

```text
DRAFT
  ↓
VALIDATING
  ↓
AWAITING_UPLOAD
  ↓
INPUT_QUALITY_CHECK
  ↓
INPUT_MODERATION
  ↓
RIGHTS_CHECK
  ↓
AWAITING_CREDIT_RESERVATION
  ↓
QUEUED
  ↓
PREPARING_ASSETS
  ↓
COMPILING_PROMPT
  ↓
GENERATING
  ↓
POST_PROCESSING
  ↓
OUTPUT_MODERATION
  ↓
QUALITY_CHECK
  ↓
UPLOADING_OUTPUTS
  ↓
COMPLETED
```

Alternatif terminal durumlar:

```text
FAILED
BLOCKED
CANCELLED
EXPIRED
PARTIALLY_COMPLETED
```

## 20.3. Üretim oluşturma işlemi

`POST /v1/generations` çağrısında API:

1. JWT içinden kullanıcıyı bulur.
2. Kullanıcının aktif/askıda durumunu kontrol eder.
3. Idempotency key’i kontrol eder.
4. Asset sahipliğini doğrular.
5. Asset’in hazır ve onaylanmış olduğunu kontrol eder.
6. Scene/filter/person kayıtlarının aktif olduğunu kontrol eder.
7. Hak motorunu çalıştırır.
8. Generation maliyetini hesaplar.
9. Kredi rezervasyonu yapar.
10. Generation ve job kayıtlarını transaction içinde oluşturur.
11. BullMQ kuyruğuna yalnızca ID tabanlı payload koyar.
12. Mobil uygulamaya `202 Accepted` döner.

Örnek yanıt:

```json
{
  "success": true,
  "data": {
    "generationId": "gen_01J...",
    "projectId": "prj_01J...",
    "status": "QUEUED",
    "reservedCredits": 2,
    "estimatedQueueSeconds": 35,
    "statusUrl": "/v1/generations/gen_01J..."
  }
}
```

## 20.4. Worker kaynak hazırlığı

Worker:

- Generation kaydını `FOR UPDATE` veya idempotent state kontrolüyle alır.
- İş zaten tamamlandıysa yeniden üretmez.
- Kaynak görseller için kısa ömürlü signed download URL üretir veya storage adapter’dan stream alır.
- SHA-256 checksum doğrular.
- MIME type’ı magic bytes ile tekrar kontrol eder.
- Görseli Sharp ile decode eder.
- Boyut ve orientation’ı normalize eder.
- Aşırı büyük görseli güvenli ölçüye küçültür.
- EXIF ve gereksiz metadata’yı temizler.
- Gerekli maske/segmentasyon output’unu hazırlar.

Raw base64 görseller Redis job payload’ına yazılmaz.

## 20.5. Üretim modları

### Mod 1 – Background Replace

Amaç:

- Kullanıcının yüzünü ve ön planını korumak
- Yeni bir sahne üretmek
- Işık/gölge uyumu sağlamak

Tercih edilen yaklaşım:

1. Kişi segmentasyonu
2. Kontrollü generative background
3. Orijinal kişi katmanını yeniden kompozit etme
4. Renk ve temas gölgesi uyarlama

Bu yöntem, tüm fotoğrafı yeniden üretmeye göre kimlik korumasında daha güvenlidir.

### Mod 2 – Full Scene

Amaç:

- Kullanıcıyı yeni bir sahneye tamamen yerleştirmek
- Poz/kamera/kompozisyonu değiştirmek
- Sinematik sonuç oluşturmak

Bu modda yüz ve beden daha fazla yeniden üretildiği için kullanıcıya kimlik tutarlılığı konusunda açık uyarı gösterilir.

### Mod 3 – Fan Moment

Amaç:

- Kullanıcı + kurgusal veya lisanslı seçili kişi
- Hazır, hak kontrolü yapılmış sahne
- AI fan-art açıklaması

Serbest internet referansı ve serbest ünlü adı MVP’de kabul edilmez.

### Mod 4 – AI Filter

Amaç:

- Yüz/kimlik mümkün olduğunca korunurken belirli bir artistik görünüm oluşturmak
- Drip Art, Cinematic, Pop Art, HDR, Vintage gibi katalog filtreleri uygulamak

Filtre promptu backend katalog kaydından gelir. Kullanıcı sadece yoğunluk ve izin verilen küçük ayarları değiştirir.

## 20.6. Kalite seviyeleri

| Seviye | Kullanım | Önerilen davranış |
|---|---|---|
| Preview Low | Hızlı seçim | Düşük kredi, hızlı önizleme |
| Preview Medium | Daha doğru seçim | Orta kalite, tek veya iki varyasyon |
| Final High | İndirme/paylaşım | Yüksek kalite, watermark/metadata, daha yüksek kredi |

Uygulama ilk üretimde iki düşük/orta önizleme oluşturabilir. Kullanıcı birini seçtikten sonra seçili varyasyon üzerinden HD final üretilebilir.

## 20.7. Aspect ratio eşlemesi

```ts
export const ASPECT_RATIO_TO_SIZE = {
  "1:1": "1024x1024",
  "4:5": "1024x1536",
  "9:16": "1024x1536",
  "16:9": "1536x1024",
} as const;
```

`9:16` ile `4:5` aynı temel üretim boyutundan farklı crop/padding stratejisi kullanabilir. Nihai ürün ölçüsü Sharp ile hazırlanır:

- Instagram Post: 1080 × 1350
- Instagram Story/Reels Cover: 1080 × 1920
- Square: 1080 × 1080
- Landscape: 1920 × 1080

Bu değerler ürün preset’leridir; modelin desteklediği ham boyutlardan sonra crop yapılır.

## 20.8. Birden fazla referans görsel

MVP uygulama limiti:

- 1 ana kullanıcı fotoğrafı zorunlu
- En fazla 2 ek kullanıcı referansı
- Katalogdaki featured person referansları backend tarafından eklenir
- Önceki output revizyonda ayrı rol taşır

Referans sırası deterministik tutulur:

```text
1. PRIMARY_USER
2. SECONDARY_USER_REFERENCE
3. APPROVED_FEATURED_PERSON_REFERENCE
4. PREVIOUS_OUTPUT
```

Prompt her görselin rolünü açıkça tarif eder.

## 20.9. Output işleme

OpenAI’den görsel geldikten sonra worker:

1. Dosya formatını ve byte boyutunu kontrol eder.
2. Decode edilebildiğini doğrular.
3. Gerekiyorsa sRGB renk profiline çevirir.
4. Orijinal high output’u private storage’a yazar.
5. Mobil preview üretir.
6. Grid thumbnail üretir.
7. Paylaşım için optimize edilmiş sürüm üretir.
8. AI disclosure katmanı/metadata uygular.
9. SHA-256 checksum kaydeder.
10. Output moderasyon ve kalite kontrolünü tamamlar.

Örnek output varyantları:

```text
original.webp
preview-1440.webp
thumb-512.webp
share-1080x1350.webp
story-1080x1920.webp
```

## 20.10. AI etiketi

Ürün iki katmanlı disclosure kullanmalıdır:

### Görünür disclosure

- Sonuç ekranında “AI ile oluşturuldu” rozeti
- Public share sayfasında açık açıklama
- Ünlü/kamuya mal olmuş kişi içeren export’ta küçük ama okunabilir işaret
- Gerekli durumlarda görselin köşesinde watermark

### Makinece okunabilir disclosure

- Dosya metadata alanları
- Generation ID veya doğrulama referansı
- Varsa platformların desteklediği content provenance standardı

Kullanıcı visible watermark’ı kaldırabilse bile, yüksek riskli fan/public-figure akışında metadata disclosure kaldırılamaz. Lisans sözleşmesi daha sıkı bir etiket gerektiriyorsa o uygulanır.

## 20.11. Kalite kontrolü

Automated quality checks:

- Görsel decode oluyor mu?
- Beklenen boyut/oran doğru mu?
- Ana yüz algılanıyor mu?
- Yüz sayısı beklenen aralıkta mı?
- Aşırı blur var mı?
- Tamamen siyah/beyaz çıktı mı?
- NSFW veya policy riski var mı?
- Kullanıcı yüzü kaynakla makul ölçüde benzer mi?
- Ek parmak/kol/yüz gibi belirgin artifact sinyali var mı?
- Visible AI badge gerekiyorsa mevcut mu?

Kalite skoru düşükse:

1. Tek otomatik yeniden deneme
2. Alternatif prompt varyantı
3. Sonuç hâlâ kötü ise `FAILED_QUALITY_CHECK`
4. Kredi otomatik release/refund
5. Kullanıcıya farklı fotoğraf önerisi

Yüz benzerliği skoru biyometrik kimlik doğrulama amacıyla kullanılmamalıdır. Sadece yaratıcı output kalite sinyali olarak, açık kullanıcı rızası ve uygun hukuki incelemeyle uygulanmalıdır.

## 20.12. Revizyon zinciri

Her revizyon önceki generation’ın üzerine yazılmaz:

```text
Project
├── Generation 1
│   ├── Output A
│   └── Output B
├── Revision 1 -> Output A baz alınır
├── Revision 2 -> Revision 1 baz alınır
└── HD Final -> Revision 2 baz alınır
```

Bu sayede:

- Geri alma yapılabilir.
- Kullanıcı eski sonucu kaybetmez.
- Maliyet her revizyon için ayrı ölçülür.
- Hangi promptun hangi sonucu ürettiği izlenir.

## 20.13. İptal davranışı

- `QUEUED`: İş kuyruktan kaldırılabilir, kredi release edilir.
- `PREPARING_ASSETS`: İptal flag’i yazılır; worker güvenli checkpoint’te durur.
- `GENERATING`: Provider çağrısı başlamışsa gerçek maliyet oluşabilir. UI “İptal talebi alındı” der, provider sonucu geldiğinde kayıt kullanıcıya gösterilmeden silinebilir; kredi politikası açık tanımlanmalıdır.
- `COMPLETED`: İptal değil, silme işlemi yapılır.

## 20.14. Başarısızlık ve kullanıcı mesajları

Teknik hata kullanıcıya doğrudan gösterilmez:

| İç hata | Kullanıcı mesajı |
|---|---|
| PROVIDER_TIMEOUT | “Görsel hazırlanırken süre aşıldı. Krediniz iade edildi.” |
| INPUT_LOW_QUALITY | “Yüzünüzün daha net göründüğü bir fotoğraf yükleyin.” |
| RIGHTS_NOT_ALLOWED | “Bu kişi veya kullanım türü şu anda seçilemiyor.” |
| MODERATION_BLOCKED | “Bu talep uygulamanın güvenlik kurallarına uygun değil.” |
| INSUFFICIENT_CREDITS | “Bu işlem için yeterli krediniz bulunmuyor.” |
| OUTPUT_QUALITY_FAILED | “İyi bir sonuç oluşturulamadı. Krediniz iade edildi.” |
| STORAGE_ERROR | “Dosya kaydedilemedi. İşlem yeniden denenebilir.” |

Her hata response’unda kullanıcıya gösterilmeyen internal `requestId` bulunur; destek ekibi bu ID ile logları arar.


---

# 21. Ünlü, Tarihî Kişi ve Kamuya Mal Olmuş Kişi Sistemi

## 21.1. Temel ürün kararı

Retake AI’nin “ünlüyle fotoğraf” özelliği teknik olarak mümkündür; fakat teknik olarak bir yüz üretebilmek, o kişinin adını ve benzerliğini ticari bir uygulamada kullanma hakkı verdiği anlamına gelmez.

Bu nedenle kişi özelliği serbest metin alanı olarak açılmayacaktır. Kullanıcı yalnızca backend katalogunda aktif ve izin durumu uygun kayıtları seçebilecektir.

MVP için üç sınıf önerilir:

1. **Kurgusal karakterler** – Retake AI’ye özgü, gerçek kişiye benzemeyen karakterler
2. **Lisanslı kişiler** – Yazılı kullanım hakkı alınmış kişiler
3. **İnceleme bekleyen kişiler** – Katalogda taslak olarak bulunur ancak kullanıcıya gösterilmez

## 21.2. Messi, Ronaldo, Kim Kardashian ve Atatürk örnekleri

Bu isimler ürün fikir listesine eklenebilir; ancak varsayılan seed kaydı şu durumda olmalıdır:

```text
rightsStatus = PENDING_REVIEW
isSelectable = false
isSearchable = false
isGenerationEnabled = false
```

Yani:

- Uygulamada kartları yayınlanmaz.
- Kullanıcı üretim isteğinde seçemez.
- Referans görseller production storage’a eklenmez.
- Adları reklam kampanyasında kullanılmaz.
- Hukuki, ticari, platform ve OpenAI kullanım koşulları incelenmeden açılmaz.

Atatürk gibi tarihî ve Türkiye açısından özel hassasiyete sahip bir kişi için ayrıca:

- Yerel hukuk incelemesi
- Hakaret/aşağılama/manipülasyon riski kontrolü
- Siyasi propaganda ve yanlış tarih anlatısı kontrolü
- İzin verilen sahne whitelist’i
- Ülke/yaş kısıtı
- Zorunlu disclosure
- İnsan moderasyonu

uygulanmalıdır.

Bu doküman hukuki görüş değildir. Yayın öncesi fikrî mülkiyet, kişilik hakları, reklam hukuku, tüketici hukuku, KVKK ve mağaza kuralları için uzman incelemesi yapılmalıdır.

## 21.3. Featured person veri modeli

Önerilen kayıt alanları:

```ts
export type FeaturedPersonRecord = {
  id: string;
  slug: string;
  displayName: string;
  safeDisplayName?: string;
  category: "ATHLETE" | "ACTOR" | "MUSICIAN" | "CREATOR" | "HISTORICAL" | "FICTIONAL";
  personType: "FICTIONAL" | "REAL_PUBLIC_FIGURE" | "LICENSED_TALENT";
  rightsStatus:
    | "FICTIONAL_OWNED"
    | "PENDING_REVIEW"
    | "LICENSED"
    | "EXPIRED"
    | "SUSPENDED"
    | "BLOCKED";
  licenseOwner?: string;
  licenseReference?: string;
  licenseStartsAt?: string;
  licenseEndsAt?: string;
  allowedCountries: string[];
  blockedCountries: string[];
  allowedSceneIds: string[];
  blockedSceneIds: string[];
  allowedCommercialUse: boolean;
  allowedSocialSharing: boolean;
  requiresVisibleWatermark: boolean;
  requiresHumanReview: boolean;
  minimumUserAge: number;
  approvedDescription: string;
  approvedReferenceAssetIds: string[];
  isSearchable: boolean;
  isSelectable: boolean;
  isGenerationEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};
```

## 21.4. Hak belgesi yönetimi

Lisanslı kişi kaydında hak belgesinin kendisi private storage’da tutulmalıdır. Admin panelinde:

- Belge adı
- Hak sahibi
- İmza tarihi
- Başlangıç/bitiş
- Coğrafi kapsam
- Platform kapsamı
- Reklam kullanımı
- Sosyal medya paylaşımı
- Watermark koşulu
- Yasak sahneler
- Yenileme tarihi
- Onaylayan hukuk/iş birimi

alanları gösterilir.

Belge bitiş tarihinden önce otomatik bildirim:

```text
T-60 gün
T-30 gün
T-7 gün
T-1 gün
```

Süre dolduğu anda:

- Yeni üretim kapatılır.
- Kart katalogdan kaldırılır.
- Eski kullanıcı üretimlerinin erişim politikası sözleşmeye göre uygulanır.
- Admin audit log oluşturulur.

## 21.5. Hak motoru

Her üretimden önce deterministik bir policy engine çalışır:

```ts
function evaluateFeaturedPersonRights(input: {
  person: FeaturedPersonRecord;
  userCountry: string;
  userAge: number;
  sceneId: string;
  usage: "PRIVATE" | "SOCIAL_SHARE" | "COMMERCIAL";
  now: Date;
}) {
  const { person, userCountry, userAge, sceneId, usage, now } = input;

  if (!person.isGenerationEnabled) return { decision: "DENY", code: "DISABLED" };
  if (person.rightsStatus === "FICTIONAL_OWNED") return { decision: "ALLOW" };
  if (person.rightsStatus !== "LICENSED") return { decision: "DENY", code: "NOT_LICENSED" };
  if (person.licenseStartsAt && now < new Date(person.licenseStartsAt)) {
    return { decision: "DENY", code: "NOT_STARTED" };
  }
  if (person.licenseEndsAt && now >= new Date(person.licenseEndsAt)) {
    return { decision: "DENY", code: "EXPIRED" };
  }
  if (userAge < person.minimumUserAge) return { decision: "DENY", code: "AGE_RESTRICTED" };
  if (person.blockedCountries.includes(userCountry)) {
    return { decision: "DENY", code: "COUNTRY_BLOCKED" };
  }
  if (person.allowedCountries.length && !person.allowedCountries.includes(userCountry)) {
    return { decision: "DENY", code: "COUNTRY_NOT_ALLOWED" };
  }
  if (person.blockedSceneIds.includes(sceneId)) {
    return { decision: "DENY", code: "SCENE_BLOCKED" };
  }
  if (person.allowedSceneIds.length && !person.allowedSceneIds.includes(sceneId)) {
    return { decision: "DENY", code: "SCENE_NOT_ALLOWED" };
  }
  if (usage === "COMMERCIAL" && !person.allowedCommercialUse) {
    return { decision: "DENY", code: "COMMERCIAL_USE_NOT_ALLOWED" };
  }

  return {
    decision: person.requiresHumanReview ? "REVIEW" : "ALLOW",
    requiresVisibleWatermark: person.requiresVisibleWatermark,
  };
}
```

AI modeli bu kararı vermez. Karar tamamen backend kayıtlarına göre deterministik yapılır.

## 21.6. Kişi referans görselleri

Lisanslı kişi için yalnızca hak sahibi tarafından onaylanmış referans seti kullanılmalıdır:

- İnternetten otomatik scraping yapılmaz.
- Google Images veya sosyal medya görseli otomatik indirilmez.
- Kullanıcı kendi seçtiği ünlü fotoğrafını yükleyerek katalog kontrolünü atlayamaz.
- Her referans asset’in kaynağı ve onay tarihi kaydedilir.
- Referans dosyaları private bucket’ta tutulur.
- Referanslara yalnızca worker service account erişebilir.
- Admin önizlemesi bile kısa ömürlü signed URL ile açılır.

## 21.7. Kurgusal karakter tasarımı

İlk sürümün güvenli ve pazarlanabilir olması için Retake AI’ye ait özgün karakter seti hazırlanabilir:

- Dünya Futbol Yıldızı
- Futbol Efsanesi
- Genç Şampiyon
- Sinema Yıldızı
- Pop İkonu
- Moda İkonu
- Teknoloji Vizyoneri
- Tarihî Komutan Arketipi
- Kırmızı Halı Oyuncusu
- Şampiyon Takım

Her karakter için:

- Özgün isim
- Görsel kimlik kılavuzu
- Yaş görünümü
- Saç/yüz/kıyafet tarifi
- Kullanılabilir sahneler
- Yasak konular
- Referans görseller
- Marka hikâyesi

oluşturulur. Karakterin gerçek bir kişiye belirgin şekilde benzememesi kalite kontrolünde incelenir.

## 21.8. Kullanıcı metninde serbest ünlü adı

Kullanıcı prompt alanına “Messi ile yap” yazarsa:

1. Named-entity detection ismi algılar.
2. Katalogda aktif lisanslı kayıt aranır.
3. Kayıt yoksa üretim yapılmaz.
4. Kullanıcıya güvenli alternatif sunulur:

```text
“Bu kişi şu anda Retake AI kataloğunda kullanıma açık değil. Kurgusal Dünya Futbol Yıldızı seçeneğiyle benzer bir fan sahnesi oluşturabilirsin.”
```

İsim, prompttan silinip fark ettirmeden başka biri üretilmemelidir. Kullanıcıya açıkça bilgi verilmelidir.

## 21.9. İzin verilen fan sahneleri

Düşük riskli örnekler:

- Açıkça AI fan sanatı olarak etiketli stadyum selfie’si
- Kırmızı halı fan sahnesi
- Kupa kutlaması temalı kurgusal sahne
- Basın duvarı önünde fan fotoğrafı
- Konser sonrası fan buluşması teması

Yüksek riskli veya varsayılan olarak yasak örnekler:

- Bir ürün veya markayı onaylıyormuş gibi reklam
- Siyasi destek açıklaması
- Gerçek haber görüntüsü gibi tasarım
- Suç veya skandal kanıtı
- Cinsel/aşağılayıcı/şiddet içeren sahne
- Sağlık, finans veya yatırım tavsiyesi veriyormuş gibi içerik
- Resmî takım/marka sponsorluğu varmış izlenimi
- Tarihî bir olayın gerçek fotoğrafıymış gibi sunum
- Ölüm, afet veya trajedi üzerinden manipülasyon
- Sahte imza, sözleşme, kimlik veya belge

## 21.10. Disclosure metinleri

Sonuç ekranı:

```text
AI ile oluşturuldu
Bu görsel gerçek bir buluşmayı, sponsorluk ilişkisini veya tarihî olayı göstermez.
```

Paylaşım sayfası:

```text
Bu içerik Retake AI kullanılarak yapay zekâ ile oluşturulmuştur. Görselde yer alan
sahne gerçek bir olayın belgesi değildir. Varsa tanınmış kişi kullanımı lisans ve
uygulama kuralları kapsamında sınırlandırılmıştır.
```

Export metadata örneği:

```json
{
  "generator": "Retake AI",
  "contentType": "AI_GENERATED_IMAGE",
  "generationId": "gen_01J...",
  "disclosure": "synthetic_or_ai_edited",
  "createdAt": "2026-09-02T09:00:00Z"
}
```

## 21.11. Model reddi ve graceful fallback

OpenAI sağlayıcısı belirli kişi veya içerik nedeniyle isteği reddederse:

- Promptu kuralları aşacak şekilde otomatik değiştirmeye çalışılmaz.
- Provider reddi audit edilir.
- Kullanıcıya genel ama anlaşılır mesaj gösterilir.
- Rezerve kredi release edilir.
- Kurgusal karakter önerilir.
- Aynı reddedilen isteğin otomatik retry’ı yapılmaz.

## 21.12. Ticari kullanım ayrımı

Standart kullanıcı çıktıları varsayılan olarak kişisel kullanım içindir. Ticari kullanım ayrı ürün/izin katmanıdır:

- Marka reklamı
- Sponsorlu paylaşım
- Basılı kampanya
- Ücretli sosyal medya reklamı
- Ürün ambalajı
- Kurumsal etkinlik

Bu kullanımlar için:

- Ayrı lisans
- Ayrı fiyat
- İnsan onayı
- İndirilebilir lisans özeti
- Kampanya ID
- Süre/coğrafya kısıtı

uygulanmalıdır.

---

# 22. Moderasyon, Etik Kullanım ve Kötüye Kullanım Önleme

## 22.1. Moderasyon mimarisi

Moderasyon tek bir `if` kontrolü değildir. Beş katmanlı olmalıdır:

```text
1. Input validation
2. OpenAI text/image moderation
3. Retake AI policy engine
4. Output moderation ve kalite kontrol
5. Kullanıcı raporu + insan incelemesi
```

## 22.2. Moderasyon kontrol noktaları

### Kontrol 1 – Hesap ve davranış

- Hesap yaşı
- E-posta/telefon doğrulaması
- Yaş beyanı
- Ülke
- Önceki ihlaller
- Çok hızlı generation denemesi
- Çok sayıda farklı yüz yükleme
- Otomasyon/bot sinyali
- Chargeback veya satın alma suistimali

### Kontrol 2 – Kullanıcı metni

- Şiddet
- Cinsel içerik
- Nefret/aşağılama
- Kendine zarar
- Çocuk güvenliği
- Dolandırıcılık
- Sahte belge/kanıt
- Politik manipülasyon
- Ünlüyle gerçek ilişki/endorsement iddiası
- Aşağılayıcı veya mahrem sahne

### Kontrol 3 – Kaynak fotoğraf

- Fotoğraf mı?
- Yüz var mı?
- Tek kişi mi?
- Yaş riski var mı?
- Çıplaklık/mahremiyet riski var mı?
- Ekran görüntüsü/kimlik belgesi/banka belgesi mi?
- Başkasına ait olma ihtimali yüksek mi?
- Daha önce engellenmiş hash ile eşleşiyor mu?

### Kontrol 4 – Hak ve katalog

- Kişi seçimi açık mı?
- Lisans geçerli mi?
- Sahne izinli mi?
- Ülke izinli mi?
- Kullanım türü izinli mi?
- Zorunlu watermark var mı?

### Kontrol 5 – Output

- Yasak içerik oluşmuş mu?
- Ek kişi/yüz oluşmuş mu?
- Yanlış logo/marka var mı?
- Aşağılayıcı veya politik bağlam ortaya çıkmış mı?
- AI etiketi uygulanmış mı?
- Kullanıcının açık talebine aşırı aykırı mı?

## 22.3. Uygulama içi policy sınıfları

```ts
export enum PolicyCategory {
  SEXUAL_CONTENT = "SEXUAL_CONTENT",
  MINOR_SAFETY = "MINOR_SAFETY",
  GRAPHIC_VIOLENCE = "GRAPHIC_VIOLENCE",
  HATE_OR_HARASSMENT = "HATE_OR_HARASSMENT",
  SELF_HARM = "SELF_HARM",
  FRAUD_OR_IMPERSONATION = "FRAUD_OR_IMPERSONATION",
  FAKE_EVIDENCE = "FAKE_EVIDENCE",
  NON_CONSENSUAL_LIKENESS = "NON_CONSENSUAL_LIKENESS",
  PUBLIC_FIGURE_RIGHTS = "PUBLIC_FIGURE_RIGHTS",
  POLITICAL_MANIPULATION = "POLITICAL_MANIPULATION",
  DECEPTIVE_ENDORSEMENT = "DECEPTIVE_ENDORSEMENT",
  DOCUMENT_OR_IDENTITY_FORGERY = "DOCUMENT_OR_IDENTITY_FORGERY",
  PRIVACY_VIOLATION = "PRIVACY_VIOLATION",
  COPYRIGHT_OR_TRADEMARK_RISK = "COPYRIGHT_OR_TRADEMARK_RISK",
  SPAM_OR_AUTOMATION = "SPAM_OR_AUTOMATION",
}
```

Kararlar:

```text
ALLOW
ALLOW_WITH_DISCLOSURE
ALLOW_WITH_WATERMARK
REQUIRE_HUMAN_REVIEW
DENY
SUSPEND_ACCOUNT
```

## 22.4. Çocuk güvenliği

En düşük riskli ilk sürüm yaklaşımı:

- Uygulamayı 18+ olarak konumlandırmak
- Kullanıcıdan doğum yılı/yaş onayı almak
- Yaşı belirsiz kaynaklarda yüksek riskli özellikleri kapatmak
- Reşit olmayan kişileri ünlü fan sahnesi veya yetişkin temalı sahnelerde kullanmamak
- Cinsel, romantik, aşağılayıcı veya tehlikeli bağlamları kesin engellemek
- İnsan incelemesi olmadan çocuk içeren paylaşımları public hale getirmemek

Gelecekte reşit olmayan kullanıcı desteği açılacaksa ebeveyn izni, yaş doğrulaması, veri saklama ve mağaza çocuk güvenliği kuralları ayrı bir proje olarak ele alınmalıdır.

## 22.5. Başkasının fotoğrafını yükleme

Upload ekranında açık onay kutusu:

```text
Bu fotoğrafı kullanma hakkına sahip olduğumu ve görseldeki kişilerin gerekli
izinlerini aldığımı onaylıyorum.
```

Ancak yalnızca onay kutusu yeterli değildir. Abuse sinyalleri:

- Aynı hesap kısa sürede çok sayıda farklı kişinin yüzünü yüklüyor.
- İnternetten alınmış profesyonel basın fotoğrafları yükleniyor.
- Ünlü isimleriyle eşleştirilmiş görseller gönderiliyor.
- Şikâyet alan asset tekrar kullanılıyor.
- İntikam, aşağılama veya mahrem sahne promptları kullanılıyor.

Bu durumlarda özellik kısıtı veya insan incelemesi uygulanabilir.

## 22.6. Politik ve tarihî içerikler

Politik figürler ve tarihî liderler ayrı yüksek risk sınıfında tutulmalıdır:

- Seçim yönlendirmesi
- Aday desteği
- Sahte konuşma/alınmış karar
- Protesto/çatışma görüntüsü
- Gerçek tarihî belge görünümü
- Propaganda afişi
- Haber kanıtı görünümü

MVP’de politik figür üretimi tamamen kapalı tutulabilir. Tarihî içerikler yalnızca açıkça sanatsal/eğitsel ve AI olarak etiketli hazır şablonlarla sınırlandırılabilir.

## 22.7. Dolandırıcılık ve sahte kanıt

Şu talep türleri engellenmelidir:

- “Bu kişiyle gerçekten toplantı yaptığımı kanıtlayan fotoğraf üret.”
- “Ünlü bu ürünü kullanıyor gibi reklam hazırla.”
- “Mahkeme/olay yeri fotoğrafı yap.”
- “Kimlik, pasaport, banka dekontu, bilet veya resmî belge üret.”
- “Birinin suç işlerken fotoğrafını yap.”
- “Mesaj ekranı veya haber sitesi görüntüsü oluştur.”

Retake AI eğlence ve yaratıcı fotoğraf stüdyosudur; doğrulama/kanıt/belge üretim aracı değildir.

## 22.8. Moderasyon event modeli

Her önemli karar kaydedilir:

```json
{
  "eventId": "mod_01J...",
  "userId": "usr_01J...",
  "generationId": "gen_01J...",
  "stage": "INPUT_TEXT",
  "provider": "OPENAI",
  "providerModel": "omni-moderation-latest",
  "providerDecision": "FLAGGED",
  "appDecision": "DENY",
  "categories": ["FAKE_EVIDENCE", "DECEPTIVE_ENDORSEMENT"],
  "policyVersion": "2026-09-v1",
  "reviewStatus": "NOT_REQUIRED",
  "createdAt": "2026-09-02T09:00:00Z"
}
```

Hassas metin veya görselin tamamı audit tablosuna kopyalanmamalıdır. Gerekli inceleme materyali ayrı, şifreli, erişim kontrollü ve kısa süreli tutulmalıdır.

## 22.9. İhlal puanı

Örnek risk puanı:

```text
Düşük risk uyarısı                 +1
Moderasyon reddi                   +3
Başkasının fotoğrafı şikâyeti      +5
Public figure hak ihlali           +5
Sahte belge/kanıt talebi            +7
Çocuk güvenliği ihlali             +10
```

Politika:

- `0–2`: normal
- `3–5`: rate limit daralt
- `6–9`: üretimleri insan incelemesine al
- `10+`: geçici askıya al
- Kritik kategori: doğrudan askıya alma ve güvenlik incelemesi

Puan sistemi otomatik hüküm vermek yerine risk sinyali olarak kullanılmalıdır. Haksız pozitiflere karşı itiraz akışı olmalıdır.

## 22.10. Kullanıcı raporlama

Her paylaşılan sonuçta:

- Bu içerik bana ait
- İzinsiz yüz kullanımı
- Aldatıcı/yanlış bilgi
- Uygunsuz/cinsel içerik
- Şiddet/nefret
- Telif/marka ihlali
- Diğer

rapor seçenekleri bulunur.

Rapor alındığında:

1. Public share link geçici gizlenebilir.
2. Rapor kaydı oluşturulur.
3. İlgili asset/generation immutable evidence reference ile korunur.
4. İnsan incelemesine girer.
5. Sonuç kullanıcıya bildirilir.
6. Gerekirse asset silinir ve hesap yaptırımı uygulanır.

## 22.11. İtiraz süreci

Kullanıcı engellenen generation için itiraz oluşturabilir:

```text
POST /v1/moderation/appeals
```

İtiraz:

- Otomatik kararın kodunu
- Kullanıcının açıklamasını
- Generation/asset referansını
- İnceleme geçmişini

saklar. Moderatör kararı audit edilir ve önceki kayıt üzerine yazılmaz.

## 22.12. İnsan moderasyonu erişimi

- Moderatörler production DB’ye doğrudan bağlanmaz.
- Admin panelinde yalnızca görev için gerekli veri görünür.
- Görsel görüntüleme audit log’a yazılır.
- Signed URL kısa süreli ve tek amaçlıdır.
- Görsel indirme varsayılan olarak kapalıdır.
- Moderatörler ayrı RBAC rolü kullanır.
- Yüksek riskli işlemlerde iki kişi onayı uygulanabilir.

## 22.13. Acil kapatma düğmeleri

Admin feature flags:

```text
DISABLE_ALL_GENERATION
DISABLE_PUBLIC_FIGURES
DISABLE_HISTORICAL_FIGURES
DISABLE_SOCIAL_SHARING
DISABLE_NEW_UPLOADS
FORCE_ALL_TO_HUMAN_REVIEW
DISABLE_HIGH_QUALITY_EXPORT
```

Bu flag’ler Redis cache + DB kaydıyla birkaç saniye içinde aktif olmalıdır.

---

# 23. Kuyruk, Worker ve Üretim Durumları

## 23.1. Neden kuyruk kullanılacak?

OpenAI görsel üretimi birkaç saniyeden daha uzun sürebilir. API request’ini açık tutmak:

- Mobil bağlantı kopmalarında sorun yaratır.
- Timeout riskini artırır.
- Aynı anda çok iş geldiğinde API’yi kilitler.
- Retry ve kredi iadesini zorlaştırır.

Bu nedenle Express API işi kabul eder, BullMQ kuyruğa koyar ve hemen generation ID döndürür.

## 23.2. Kuyruklar

```text
generation:prepare
  -> kaynak hazırlama, kalite kontrolü

generation:moderate-input
  -> input moderasyon

generation:render
  -> OpenAI image generation

generation:postprocess
  -> Sharp, watermark, varyantlar

generation:moderate-output
  -> sonuç kontrolü

generation:finalize
  -> DB, kredi capture, bildirim

notifications:push
emails:transactional
storage:cleanup
privacy:delete-user
billing:verify-purchase
moderation:human-review
```

MVP’de kuyruk sayısı azaltılabilir; ancak tek job içinde aşamalar yine durum olarak kaydedilmelidir.

## 23.3. Job payload ilkesi

Redis’e hassas görsel veya promptun tamamı yazılmaz:

```json
{
  "jobVersion": 1,
  "generationId": "gen_01J...",
  "userId": "usr_01J...",
  "requestId": "req_01J...",
  "attempt": 0
}
```

Worker gerekli ayrıntıyı PostgreSQL’den alır. Prompt alanları gerekiyorsa şifreli veya sınırlı süreli saklanır.

## 23.4. Job idempotency

BullMQ `jobId`:

```text
generation:{generationId}:render:v1
```

Worker başlangıcında:

```ts
if (["COMPLETED", "BLOCKED", "CANCELLED"].includes(generation.status)) {
  return;
}
```

Ayrıca output checksum ve provider request kaydı kontrol edilir. Böylece process crash sonrası aynı output tekrar ücretlenmez veya duplicate kayıt oluşmaz.

## 23.5. Retry politikası

Örnek:

```ts
const renderJobOptions = {
  attempts: 4,
  backoff: {
    type: "exponential",
    delay: 5_000,
  },
  removeOnComplete: 1_000,
  removeOnFail: 5_000,
};
```

Gerçek retry kararı hata sınıfına göre yapılır:

```ts
class RetryableProviderError extends Error {}
class NonRetryablePolicyError extends Error {}
class NonRetryableValidationError extends Error {}
```

Jitter eklenerek aynı anda çok sayıda işin tekrar provider’a yüklenmesi önlenir.

## 23.6. Concurrency kontrolü

Worker concurrency sabit bir sayı değildir. Şunlara göre belirlenir:

- OpenAI proje rate limit’i
- Ortalama görsel boyutu
- Worker RAM/CPU
- Storage bandwidth
- Günlük bütçe
- Queue waiting time

Örnek başlangıç:

```env
GENERATION_WORKER_CONCURRENCY=3
POSTPROCESS_WORKER_CONCURRENCY=5
```

Admin panelinden veya env üzerinden güvenli biçimde azaltılabilir.

## 23.7. Kullanıcı başına eşzamanlı iş

MVP:

- Ücretsiz kullanıcı: aynı anda 1 generation
- Pro kullanıcı: aynı anda 2 generation
- Admin/test hesabı: özel limit

Limit API ve Redis distributed semaphore ile uygulanır.

## 23.8. Global rate limiter

Provider’a gönderim için BullMQ rate limiter:

```ts
limiter: {
  max: Number(process.env.OPENAI_MAX_JOBS_PER_WINDOW),
  duration: Number(process.env.OPENAI_RATE_WINDOW_MS),
}
```

Rate limit değerleri gerçek OpenAI proje limitine göre ayarlanır.

## 23.9. Durum güncellemesi

Mobil uygulama üç yöntem kullanabilir:

1. **Polling** – her 3–5 saniye `GET /v1/generations/:id`
2. **Socket.IO** – uygulama açıkken canlı durum
3. **Expo Push** – uygulama arka planda/kapalıyken tamamlanma

MVP için polling + push yeterlidir. Socket.IO sonraki aşamada eklenebilir.

## 23.10. Progress yüzdesi

Model gerçek bir yüzde vermiyorsa sahte hassas yüzde gösterilmemelidir. Aşama tabanlı progress:

```text
Yükleme kontrol ediliyor      10%
Fotoğraf analiz ediliyor      20%
Talep hazırlanıyor            35%
Görsel oluşturuluyor          45–80%
Son dokunuşlar yapılıyor      85%
Kaydediliyor                  95%
Hazır                         100%
```

“Görsel oluşturuluyor” bölümünde süre belirsizliği animasyon ve açıklamayla yönetilir.

## 23.11. Dead-letter ve manuel retry

Maksimum retry sonrası iş:

- `FAILED` durumuna alınır.
- Kredi release/refund edilir.
- Failure reason normalize edilir.
- Dead-letter listesine eklenir.
- Admin panelinde request ID ile görünür.
- Yetkili admin “Retry with same input” veya “Retry with latest prompt” seçebilir.

Manuel retry yeni bir job ID ve audit kaydı üretir.

## 23.12. Stalled job

BullMQ stalled job kontrolü yanında uygulama cron’u:

- `GENERATING` durumunda 30 dakikadan uzun kalan işler
- `QUEUED` olup 2 saat işlenmeyen işler
- Kredi rezervasyonu açılmış ama generation oluşmamış işlemler

bulur ve uzlaştırır.

## 23.13. Scheduled cleanup işleri

```text
Her 10 dakika  -> stuck generation reconciliation
Saatlik         -> expired upload cleanup
Günlük          -> expired signed share links
Günlük          -> old raw prompt/log cleanup
Günlük          -> orphan storage object scan
Haftalık        -> credit ledger reconciliation
Aylık           -> rights/license expiry report
```

## 23.14. Graceful shutdown

Worker kapatılırken:

1. Yeni job almayı bırakır.
2. Aktif jobların belirli süre tamamlanmasını bekler.
3. Açık DB/Redis bağlantılarını kapatır.
4. Tamamlanmayan işi kuyrukta retry’a bırakır.
5. Health endpoint’i `not ready` durumuna geçer.

Deployment sırasında veri kaybı ve duplicate generation böyle azaltılır.

---

# 24. Kredi, Abonelik ve Mağaza İçi Satın Alma

## 24.1. Mobil uygulama ödeme prensibi

Retake AI içinde satılan kredi ve Pro abonelik dijital özellik/dijital içerik niteliğindedir. iOS ve Android uygulamalarında mağaza içi satın alma kuralları dikkate alınmalıdır.

Önerilen yaklaşım:

- iOS: Apple In-App Purchase
- Android: Google Play Billing
- Tek entegrasyon ve receipt doğrulama için: RevenueCat veya eşdeğer bir abonelik/entitlement katmanı
- Backend: Apple/Google/RevenueCat webhook doğrulaması
- Client hiçbir zaman “satın alma başarılı” kararını tek başına vermez.

Kullanıcıyı uygulama içinden doğrudan Stripe/iyzico ödeme sayfasına yönlendirerek dijital kredi satmak, mağaza kuralları açısından yayına çıkmadan ayrıca incelenmelidir. MVP’de mağaza içi satın alma ana yöntem olmalıdır.

## 24.2. Kredi tipleri

```text
PURCHASED_CREDIT       -> mağazadan satın alınmış
SUBSCRIPTION_CREDIT    -> abonelik dönemiyle verilen
PROMOTIONAL_CREDIT     -> kampanya/hediye
REFUND_CREDIT          -> teknik hata iadesi
ADMIN_ADJUSTMENT       -> admin düzeltmesi
```

Satın alınmış krediler için mağaza kuralları ve tüketici mevzuatı dikkate alınarak son kullanma tarihi uygulanmaması güvenli varsayımdır. Promosyon kredilerinin süresi varsa satın alma öncesi ve cüzdanda açık gösterilmelidir.

## 24.3. Paket örnekleri

Gerçek fiyatlar App Store Connect ve Google Play Console’da ülkeye göre yönetilir:

```text
retake.credits.10
retake.credits.30
retake.credits.80
retake.credits.200
retake.pro.monthly
retake.pro.yearly
```

Backend ürün tablosu:

```text
storeProductId
platform
productType
creditAmount
entitlementKey
isActive
validFrom
validUntil
metadata
```

Fiyatın kaynağı mobil mağazadır. Backend’de sabit para birimi/fiyat göstermek yerine store ürün bilgisinden gelen localized price kullanılmalıdır.

## 24.4. İşlem maliyeti örneği

Kredi tarifesi model maliyeti + storage + moderasyon + operasyon payı + mağaza komisyonu + hata/refund payı dikkate alınarak belirlenir.

Örnek, yalnızca ürün planlama amacıyla:

| İşlem | Kredi |
|---|---:|
| 1 düşük kalite önizleme | 1 |
| 2 düşük kalite önizleme | 2 |
| Orta kalite tek çıktı | 4 |
| Yüksek kalite final | 10 |
| Küçük revizyon | 3 |
| AI filtre preview | 1 |
| AI filtre HD | 6 |

Gerçek kredi karşılıkları OpenAI’nin güncel fiyatı ve ölçülen ortalama maliyet kullanılarak konfigürasyondan yönetilmelidir.

## 24.5. Quote endpoint’i

Kullanıcı “Oluştur” düğmesine basmadan önce:

```http
POST /v1/generations/quote
```

Yanıt:

```json
{
  "success": true,
  "data": {
    "quoteId": "qte_01J...",
    "credits": 2,
    "expiresAt": "2026-09-02T09:05:00Z",
    "breakdown": [
      { "code": "PREVIEW", "quantity": 2, "credits": 2 }
    ],
    "balanceAfter": 22
  }
}
```

Generation oluştururken quote ID gönderilir. Süresi dolmuş veya parametreleri değişmiş quote kabul edilmez.

## 24.6. Reserve–capture–release modeli

Krediyi generation başlamadan doğrudan kesin düşmek yerine:

```text
AVAILABLE -> RESERVED -> CAPTURED
                      ↘ RELEASED
```

kullanılır.

### Reserve

- Generation kabul edildiğinde yeterli bakiye kontrol edilir.
- Kredi rezervasyon kaydı oluşturulur.
- Kullanılabilir bakiye azalır ama işlem henüz kesinleşmez.

### Capture

- En az bir kullanılabilir output başarıyla üretildiğinde rezervasyon kesin harcamaya dönüşür.

### Release

- Moderasyon engeli
- Provider hatası
- Kalite kontrolü başarısızlığı
- Kullanıcı generation başlamadan iptal

hallerinde rezervasyon serbest bırakılır.

## 24.7. Ledger ilkesi

`wallet.balance = 24` tek başına yeterli değildir. Her hareket immutable ledger kaydıdır:

```text
CREDIT_PURCHASED        +30
GENERATION_RESERVED      -2 available / +2 reserved
GENERATION_CAPTURED      -2 reserved
GENERATION_RELEASED      +2 available / -2 reserved
ADMIN_ADJUSTMENT         +5
CHARGEBACK               -30
```

Bakiyeler transaction içinde güncellenir. Ledger satırı sonradan değiştirilmez; düzeltme ters kayıtla yapılır.

## 24.8. Prisma transaction örneği

```ts
await prisma.$transaction(async (tx) => {
  const wallet = await tx.creditWallet.findUnique({
    where: { userId },
  });

  if (!wallet || wallet.availableBalance < requiredCredits) {
    throw new InsufficientCreditsError();
  }

  await tx.creditWallet.update({
    where: { userId },
    data: {
      availableBalance: { decrement: requiredCredits },
      reservedBalance: { increment: requiredCredits },
    },
  });

  await tx.creditTransaction.create({
    data: {
      userId,
      walletId: wallet.id,
      type: "GENERATION_RESERVE",
      amount: -requiredCredits,
      referenceType: "GENERATION",
      referenceId: generationId,
      idempotencyKey,
    },
  });
});
```

Yüksek eşzamanlılıkta optimistic concurrency/version alanı veya uygun row locking yaklaşımı uygulanmalıdır.

## 24.9. Satın alma akışı

```mermaid
sequenceDiagram
    participant U as Kullanıcı
    participant M as Mobil Uygulama
    participant Store as Apple/Google
    participant B as Express Backend
    participant RC as RevenueCat/Verifier
    participant DB as PostgreSQL

    U->>M: Kredi paketini seçer
    M->>Store: Purchase başlatır
    Store-->>M: Transaction/receipt
    M->>B: Transaction ID gönderir
    B->>RC: Server-side doğrulama
    RC-->>B: Doğrulanmış entitlement/transaction
    B->>DB: Idempotent purchase + kredi ledger
    B-->>M: Güncel bakiye
```

## 24.10. Receipt ve webhook güvenliği

- Store transaction ID unique olmalıdır.
- Aynı receipt ikinci kez kredi veremez.
- Kullanıcı ID ile app user ID eşleşmesi kontrol edilir.
- Bundle/package ID doğrulanır.
- Product ID whitelist içinde olmalıdır.
- Environment sandbox/production ayrımı yapılır.
- İmzalı webhook doğrulanır.
- Webhook replay koruması uygulanır.
- Refund/chargeback event’i ledger’a ters işlem olarak yazılır.
- Client’tan gelen kredi miktarına güvenilmez.

## 24.11. Abonelik entitlement’ları

Örnek:

```text
FREE
PRO_MONTHLY
PRO_YEARLY
CREATOR
```

Pro avantajları:

- Aylık kredi
- Daha yüksek eşzamanlı generation limiti
- Filigransız, uygun düşük-risk çıktılar
- Öncelikli kuyruk
- Daha uzun proje saklama
- Ek filtre paketleri
- Daha yüksek export çözünürlüğü

Ünlü/public figure watermark’ı Pro üyelikle kaldırılmaz; hak ve güvenlik kuralı üyelikten bağımsızdır.

## 24.12. Abonelik yenileme kredisi

Aylık kredi verme kuralı idempotent olmalıdır:

```text
subscriptionPeriodId + userId + entitlementKey
```

aynı dönemde yalnızca bir kez kredi verir.

Kullanılmayan abonelik kredilerinin devredip devretmeyeceği ürün politikasında açık yazılmalıdır. Purchased credits ile subscription credits ayrı lot olarak takip edilebilir.

## 24.13. Kredi lot tüketimi

Önerilen sıra:

1. Süresi en yakın promosyon kredi
2. Dönem kredisi
3. Satın alınmış kredi

Ancak mağaza ve tüketici kuralları açısından purchased credit’in korunması gerekir. Kullanıcı cüzdanında hangi kredi türünün ne kadar olduğu görülebilir.

## 24.14. Restore purchases

Profil > Satın Almaları Geri Yükle:

- Apple/Google geçmiş entitlement’ları alınır.
- Backend doğrular.
- Eksik subscription durumu düzeltilir.
- Tüketilebilir kredi paketlerinde tekrar kredi verilmemesi için transaction ID ledger kontrolü yapılır.

## 24.15. Satın alma hata ekranları

- Kullanıcı iptal etti
- Store bağlantısı yok
- Ürün bulunamadı
- Ödeme bekliyor
- Ödeme tamamlandı ama backend doğrulaması bekleniyor
- Refund edildi
- Başka hesaba bağlı transaction
- Mağaza geçici olarak kullanılamıyor

“Ödeme tamamlandı ama kredi gelmedi” durumunda kullanıcı transaction ID ile destek kaydı açabilmelidir.

## 24.16. Web ödeme geleceği

Web uygulaması ileride yayınlanırsa ayrı checkout kullanılabilir. Ancak:

- Mobil mağaza yönlendirme kuralları
- Ülke bazlı istisnalar
- Entitlement eşitleme
- Fiyat farkları
- Vergi/fatura

konuları yayın tarihindeki güncel kurallara göre ayrıca incelenmelidir.


---

# 25. Bildirim Sistemi

## 25.1. Bildirim türleri

Retake AI’de bildirimler yalnızca pazarlama için değil, uzun süren generation işlerinin kullanıcı deneyimi için gereklidir.

```text
GENERATION_COMPLETED
GENERATION_FAILED
GENERATION_BLOCKED
CREDITS_ADDED
CREDITS_LOW
PURCHASE_VERIFIED
PURCHASE_FAILED
SUBSCRIPTION_RENEWED
SUBSCRIPTION_EXPIRING
SECURITY_NEW_LOGIN
SECURITY_PASSWORD_CHANGED
RIGHTS_OR_SHARE_TAKEDOWN
SUPPORT_REPLY
PRODUCT_ANNOUNCEMENT
```

## 25.2. Expo push kurulumu

Mobil uygulama:

1. Bildirim iznini bağlama göre ister.
2. Expo push token veya native device token alır.
3. Token’ı `POST /v1/devices` ile backend’e gönderir.
4. Token kullanıcı + cihaz + platform ile ilişkilendirilir.
5. Logout olduğunda cihaz oturumu ayrılır.
6. Geçersiz token provider cevabıyla pasif yapılır.

Kullanıcı ilk açılışta bildirim iznine zorlanmamalıdır. En doğru an:

> “Görselin birkaç dakika sürebilir. Hazır olduğunda haber vermemizi ister misin?”

## 25.3. Push device modeli

```ts
model PushDevice {
  id              String   @id @default(cuid())
  userId          String
  platform        Platform
  expoPushToken   String?  @unique
  nativePushToken String?  @unique
  deviceIdHash    String?
  appVersion      String?
  locale          String?
  timezone        String?
  isActive        Boolean  @default(true)
  lastSeenAt      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

Ham cihaz kimliği zorunlu olmadıkça saklanmaz; gerektiğinde hash kullanılır.

## 25.4. Bildirim payload’ı

Push mesajında hassas prompt veya kişi adı taşımamak daha güvenlidir:

```json
{
  "title": "Görselin hazır ✨",
  "body": "Retake AI projen tamamlandı.",
  "data": {
    "type": "GENERATION_COMPLETED",
    "generationId": "gen_01J...",
    "deepLink": "retake://projects/gen_01J..."
  }
}
```

Kilit ekranında kullanıcı fotoğrafı veya hassas içerik preview’su gösterilmez.

## 25.5. Deep linking

Expo Router route örnekleri:

```text
retake://generation/{id}
retake://project/{id}
retake://credits
retake://support/ticket/{id}
```

Deep link açıldığında:

- Kullanıcı login değilse auth ekranına gider.
- Login sonrası hedef rota geri yüklenir.
- Generation sahipliği backend’den doğrulanır.
- Yalnızca ID’ye güvenilip başka kullanıcı verisi açılmaz.

## 25.6. In-app notification center

Push kapalı olsa bile uygulama içinde bildirim kutusu bulunur:

- Okundu/okunmadı
- Tarih
- Bildirim türü
- Hedef sayfa
- Toplu okundu işaretleme
- Bildirim silme

Backend push gönderirken aynı anda notification DB kaydı oluşturur.

## 25.7. Bildirim tercihleri

Kullanıcı ayrı ayrı yönetebilir:

```text
Generation sonuçları          zorunlu/işlemsel
Güvenlik bildirimleri         zorunlu/işlemsel
Satın alma bildirimleri       zorunlu/işlemsel
Kredi azaldı                  isteğe bağlı
Yeni filtreler                isteğe bağlı
Kampanya ve pazarlama         açık rıza
```

Pazarlama izni, işlemsel bildirim izninden ayrı tutulur.

## 25.8. Push retry ve receipt kontrolü

- Push job idempotent ID kullanır.
- Geçici hata retry edilir.
- Expo receipt’leri sonradan kontrol edilir.
- `DeviceNotRegistered` gibi hata alan token pasif yapılır.
- Aynı generation için kullanıcıya tekrar tekrar bildirim gönderilmez.

---

# 26. Admin Paneli

## 26.1. Admin panel yaklaşımı

Admin paneli mobil uygulama içinde gizli bir ekran olarak yapılmamalıdır. Ayrı bir web uygulaması önerilir:

```text
apps/admin
```

Teknoloji:

- React + Vite veya Next.js
- TypeScript
- TanStack Query
- Zod
- Yetkili admin API endpoint’leri
- Ayrı domain: `admin.retake.ai`

Admin panel aynı PostgreSQL’e doğrudan bağlanmaz; tüm işlemler Express API üzerinden ve RBAC ile yapılır.

## 26.2. Admin rolleri

```text
SUPER_ADMIN
OPERATIONS_ADMIN
CONTENT_ADMIN
MODERATOR
SUPPORT_AGENT
BILLING_ADMIN
LEGAL_REVIEWER
ANALYST_READ_ONLY
```

Örnek yetki matrisi:

| İşlem | Super | Content | Moderator | Support | Billing | Legal | Analyst |
|---|---:|---:|---:|---:|---:|---:|---:|
| Kullanıcı görüntüle | ✓ | – | Sınırlı | Sınırlı | Sınırlı | – | Anonim |
| Hesap askıya al | ✓ | – | ✓ | Talep | – | – | – |
| Filtre yönet | ✓ | ✓ | – | – | – | – | Görüntüle |
| Kişi lisansı aç | ✓ | – | – | – | – | ✓ | Görüntüle |
| Moderasyon incele | ✓ | – | ✓ | – | – | Sınırlı | Anonim |
| Kredi düzelt | ✓ | – | – | Talep | ✓ | – | – |
| Prompt yayınla | ✓ | ✓ | Test | – | – | Review | Görüntüle |
| Audit log | ✓ | Sınırlı | Sınırlı | Sınırlı | Sınırlı | Sınırlı | – |

## 26.3. Admin authentication

Admin hesapları için:

- Ayrı login policy
- Zorunlu MFA/TOTP veya WebAuthn
- Kısa session
- IP/ülke anomali uyarısı
- Yeni cihaz doğrulaması
- Brute-force limiti
- Hassas işlemde step-up authentication
- Paylaşımlı admin hesabı yasağı

Admin access token normal kullanıcı token’ıyla aynı audience kullanmamalıdır.

## 26.4. Dashboard

Kartlar:

- Bugünkü kayıt
- Aktif kullanıcı
- Başlatılan generation
- Başarı oranı
- Ortalama üretim süresi
- Kuyruk bekleme süresi
- Provider hata oranı
- Moderasyon engeli
- Otomatik kredi iadesi
- Günlük AI maliyeti
- Kredi satışı
- Abonelik sayısı
- Açık destek talebi
- Açık abuse raporu

Grafikler:

- Generation trendi
- Model/kalite bazında maliyet
- Sahne/filtre popülerliği
- Ülke/platform dağılımı
- Funnel: upload → generate → preview → HD → share
- Retention

Analitik ekranında kişisel görseller gösterilmez.

## 26.5. Kullanıcı yönetimi

Admin kullanıcı detayında:

- ID ve temel profil
- Hesap durumu
- Email doğrulama durumu
- Platform ve uygulama sürümü
- Cüzdan özeti
- Abonelik durumu
- Generation sayıları
- Başarısızlık/moderasyon sayıları
- Destek talepleri
- Aktif oturumlar
- Audit geçmişi

Hassas aksiyonlar:

- Tüm oturumları sonlandır
- Geçici askıya al
- Kalıcı kapat
- Kredi düzeltme talebi
- Kullanıcı veri export’u başlat
- Hesap silme kuyruğu başlat

Kredi düzeltmesi mutlaka gerekçe ve ikinci onay gerektirebilir.

## 26.6. Katalog yönetimi

Admin şunları yönetir:

- Ana sayfa banner
- Kategoriler
- Sahne şablonları
- Filtreler
- Kurgusal karakterler
- Lisanslı kişi kayıtları
- Etiketler
- Ülke/yaş kısıtları
- Kredi maliyeti
- Preview asset’leri
- Sıralama
- Yayın başlangıç/bitiş

Katalog değişikliği draft → review → publish akışıyla yapılmalıdır.

## 26.7. Sahne şablonu formu

Alanlar:

```text
Ad
Slug
Kategori
Kısa açıklama
Uzun açıklama
Kapak görseli
Prompt template key/version
Desteklenen generation modları
Desteklenen oranlar
Önerilen fotoğraf tipi
Minimum yüz kalite puanı
Varsayılan kompozisyon
Kredi maliyet çarpanı
Ülke/yaş kısıtı
İzin verilen featured person grupları
Yasak kelime ve kullanım alanları
Aktif/pasif
```

## 26.8. Filtre yönetimi

Her filtre:

- Local mı AI mı?
- Local recipe JSON
- AI prompt key/version
- Yoğunluk aralığı
- Önizleme görseli
- Kredi maliyeti
- Pro-only durumu
- Yüz koruma seviyesi
- Moderasyon riski
- A/B test grubu

ile yönetilir.

## 26.9. Featured person ve lisans ekranı

Bu ekran yüksek yetkilidir:

- Kişi temel bilgileri
- Person type
- Rights status
- Lisans belgeleri
- Onaylı referans asset’ler
- Ülke/sahne/kullanım izinleri
- Watermark kuralı
- İnsan inceleme kuralı
- Lisans bitiş alarmları
- Geçmiş durum değişiklikleri
- Acil kapatma

`PENDING_REVIEW` kaydını `LICENSED` yapmak için hukuk rolü + super admin çift onayı önerilir.

## 26.10. Prompt yönetimi

- Prompt key
- Sürüm
- Taslak metin
- Değişiklik açıklaması
- Test sonuçları
- Safety test sonucu
- Maliyet karşılaştırması
- Yayın yüzdesi
- Aktif/rollback sürümü

Prompt editor içinde production kullanıcı fotoğrafları varsayılan test materyali olarak kullanılmamalıdır. Onaylı sentetik/eval asset seti kullanılmalıdır.

## 26.11. Generation operations ekranı

Filtreler:

- Durum
- Tarih
- Provider/model
- Prompt version
- Kullanıcı ID
- Job ID
- Hata kodu
- Kredi durumu
- Süre
- Maliyet

Aksiyonlar:

- Job detayını görüntüle
- Güvenli retry
- Kredi release/refund
- Kullanıcıya bildirim gönder
- Output’u gizle
- Abuse incelemesine gönder
- Provider request ID kopyala

Admin “retry” yaparken yeni provider maliyetinin kime yansıyacağı açık seçilir.

## 26.12. Moderasyon paneli

Queue görünümü:

```text
Critical
High
Normal
Appeals
User Reports
Rights Complaints
```

İnceleme ekranı:

- Sınırlı kaynak preview
- Kullanıcı talimatının maskelenmiş/özetlenmiş hali
- Provider kategorileri
- App policy kararları
- Önceki ihlaller
- Karar seçenekleri
- Gerekçe kodu
- İç not
- Kullanıcıya gidecek mesaj

## 26.13. Billing paneli

- Store transactions
- Webhook geçmişi
- Abonelik durumu
- Refund/chargeback
- Wallet/ledger
- Reconciliation raporu
- Bekleyen purchase verification
- Kullanıcı kredi düzeltme

Admin hiçbir zaman receipt’i düzenleyemez. Düzeltme ayrı ledger kaydıyla yapılır.

## 26.14. Support paneli

- Ticket listesi
- Generation request ID arama
- Kullanıcı hesabı
- Teknik hata özeti
- Kredi iade yetkisi veya onay talebi
- Hazır cevaplar
- Kullanıcıya push/e-posta
- Attachment erişim kontrolü

Support agent kullanıcı promptunun veya fotoğrafının tamamını gereksiz yere görmemelidir.

## 26.15. Feature flags

Admin paneli feature flag yönetir:

```text
feature.filters.ai
feature.fan_moment
feature.featured_people
feature.chat_revision
feature.video
feature.social_share
feature.purchases
feature.pro_subscription
```

Alanlar:

- Global açık/kapalı
- Platform
- Minimum app version
- Ülke
- Kullanıcı yüzdesi
- Deney grubu
- Başlangıç/bitiş

## 26.16. Audit log

Aşağıdaki işlemler silinemez audit log üretir:

- Admin login
- Kullanıcı askıya alma
- Kredi düzeltme
- Lisans durumu değiştirme
- Prompt yayınlama
- Moderasyon kararı
- Asset görüntüleme
- User export/deletion
- Feature kill switch
- Sistem ayarı değişikliği

Audit log:

- Actor ID
- Role
- Action
- Target type/ID
- Önceki değer hash/özet
- Yeni değer hash/özet
- IP/device bilgisi
- Request ID
- Timestamp

saklar.

---

# 27. Güvenlik Mimarisi

## 27.1. Tehdit modeli

Retake AI için başlıca tehditler:

- OpenAI anahtarının sızması
- Hesap ele geçirme
- Refresh token çalınması
- Başkasının fotoğrafının izinsiz kullanılması
- Public figure/marka hak ihlali
- Zararlı dosya yükleme
- Signed URL suistimali
- SSRF
- Brute-force ve credential stuffing
- Ücretsiz kredi suistimali
- Receipt replay
- Generation spam ve maliyet saldırısı
- Admin hesabı ele geçirme
- Loglarda yüz/prompt sızıntısı
- Storage bucket yanlışlıkla public açılması
- SQL injection
- Dependency supply-chain riski
- Prompt injection
- Webhook taklidi
- Queue duplicate/replay

## 27.2. Güvenlik sınırları

```text
Untrusted:
- Mobil uygulama
- Kullanıcı girdisi
- Kullanıcı dosyası
- Client'tan gelen kredi/fiyat
- Client'tan gelen rol
- Client'tan gelen rights decision
- Dış webhook doğrulanana kadar

Trusted after verification:
- Express service layer
- PostgreSQL transaction
- Signed internal job payload
- Verified store transaction
- Server-side catalog/rights record
```

Mobil uygulama tersine mühendislikle değiştirilebilir kabul edilir. Tüm kritik karar backend’de alınır.

## 27.3. TLS ve ağ

- Tüm trafik HTTPS.
- TLS Nginx/Caddy veya güvenilir reverse proxy’de sonlandırılır.
- HTTP otomatik HTTPS’e yönlendirilir.
- PostgreSQL ve Redis public internete açılmaz.
- Redis parola/TLS veya private Docker network ile korunur.
- Admin domain ayrı firewall/WAF politikası kullanabilir.
- Worker portu public olmaz.
- Health endpoint’i hassas ayrıntı döndürmez.

## 27.4. Express hardening

```ts
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
```

Dosya upload’u API body üzerinden alınacaksa route bazında özel limit uygulanır. Ana tercih signed direct upload’dur.

## 27.5. CORS

Mobil native isteklerinde CORS güvenlik sınırı değildir; yine de admin/web istemciler için allowlist uygulanır:

```text
https://admin.retake.ai
https://www.retake.ai
https://staging-admin.retake.ai
```

`*` ve credentials birlikte kullanılmaz.

## 27.6. Authentication güvenliği

- Access token: 10–15 dakika
- Refresh token: 30 gün veya ürün politikasına göre
- Refresh token rotation
- Token family/reuse detection
- Refresh token yalnızca hash’li DB kaydı
- Logout’ta session revoke
- Şifre değişikliğinde tüm session revoke seçeneği
- Admin için kısa refresh süresi ve MFA
- JWT `iss`, `aud`, `sub`, `exp`, `jti` doğrulaması
- Key rotation için `kid`
- Tercihen asymmetric signing (`RS256`/`EdDSA`) veya güçlü secret yönetimi

## 27.7. Şifre güvenliği

Öneri:

- Argon2id tercih edilir; bcrypt kullanılacaksa güncel maliyet testi yapılır.
- Minimum 10–12 karakter
- Sadece karmaşık karakter zorlaması yerine uzunluk ve sızmış şifre kontrolü
- Şifre input’u loglanmaz
- Forgot-password response user enumeration yapmaz
- Reset token hash’li saklanır
- Token tek kullanımlı ve kısa süreli
- Reset sonrası session’lar iptal edilir

## 27.8. Rate limit planı

| Endpoint grubu | Önerilen başlangıç limiti |
|---|---:|
| Genel API | 120/dakika/kullanıcı |
| Login | 5/15 dakika/email+IP |
| Register | 3/saat/IP |
| Forgot password | 3/saat/email+IP |
| Refresh | 30/15 dakika/session |
| Upload initiate | 20/saat/kullanıcı |
| Generation quote | 30/dakika/kullanıcı |
| Generation create | plan bazlı + eşzamanlı limit |
| Revision | plan bazlı |
| Report content | 10/saat/kullanıcı |
| Admin login | 5/30 dakika/IP+account |

Gerçek değerler yük testi ve abuse gözlemine göre ayarlanır.

## 27.9. Dosya güvenliği

- MIME header’a tek başına güvenilmez; magic bytes kontrol edilir.
- JPEG, PNG, WebP dışında format engellenir.
- SVG kullanıcı upload’u kabul edilmez.
- Maksimum byte ve piksel alanı sınırı vardır.
- Decompression bomb kontrolü yapılır.
- EXIF temizlenir.
- Zararlı/bozuk decode dosyaları reddedilir.
- Orijinal dosya adı storage path’te kullanılmaz.
- Storage key server tarafından üretilir.
- Upload URL yalnızca belirli key/content type/size için geçerlidir.
- Upload tamamlanınca checksum doğrulanır.
- Asset sahipliği tüm erişimlerde kontrol edilir.

## 27.10. SSRF savunması

Backend kullanıcıdan gelen URL’yi indirerek referans fotoğraf almamalıdır. Mutlaka URL import özelliği gerekiyorsa:

- Yalnızca allowlist domain
- DNS rebinding kontrolü
- Private/local IP engeli
- Redirect limiti
- Content-length limiti
- MIME doğrulama
- Ayrı sandbox downloader

MVP’de URL ile görsel import tamamen kapalı tutulmalıdır.

## 27.11. Signed URL güvenliği

- Kısa ömürlü
- Tek object key
- Uygun HTTP method
- Content type/size koşulu
- User-owned prefix
- Public list izni yok
- Object path tahmin edilse bile erişim yok
- Download için `Content-Disposition` güvenli ayarlanır

Signed URL loglarda tam query string ile tutulmaz.

## 27.12. PostgreSQL güvenliği

- Prisma parametreli sorgular kullanır.
- Raw SQL yalnızca gerekli ve code-reviewed alanlarda.
- DB kullanıcısı minimum yetkili.
- Migration user ile runtime user ayrılabilir.
- Production DB public değil.
- TLS/private network.
- Otomatik backup.
- Point-in-time recovery imkânı tercih edilir.
- Restore testi düzenli yapılır.

“Backup var” yeterli değildir; geri yükleme testi yapılmamış backup güvenilir sayılmaz.

## 27.13. Redis güvenliği

- Public internetten kapalı
- Ayrı namespace/prefix
- Queue verisi için TTL/cleanup
- Hassas raw görsel yok
- Production’da persistence ihtiyacı değerlendirilir
- Queue kritikse Redis backup/HA planı
- Job payload imzalı/internal ID tabanlı

## 27.14. OpenAI maliyet saldırısı savunması

- Kullanıcı başına günlük generation limiti
- Cüzdan/kredi kontrolü
- Eşzamanlı iş limiti
- Yeni hesap için daha sıkı limit
- CAPTCHA/device attestation gerektiğinde
- Tek IP’den çok hesap tespiti
- Ücretsiz kredi claim idempotency
- Global günlük bütçe sınırı
- Provider kill switch
- Anormal kullanım alarmı

## 27.15. Webhook güvenliği

- İmza doğrulama
- Timestamp/replay limiti
- Raw body gerektiğinde route özel parser
- Event ID unique
- İşlem idempotent
- Unknown event loglanır ama başarısızlıkla tüm webhook zinciri durdurulmaz
- Secret periyodik döndürülür

## 27.16. Admin güvenliği

- MFA zorunlu
- RBAC
- Step-up auth
- Hassas alan maskesi
- Export/indirme kısıtı
- Audit log
- IP/ülke anomali
- Kısa idle timeout
- Admin session revoke
- Production’a doğrudan DB erişimi yok
- Dört göz prensibi

## 27.17. Dependency ve CI güvenliği

- Lockfile commit edilir.
- Dependabot/Renovate.
- `npm audit` tek başına yeterli kabul edilmez; kritik bağımlılık review.
- Secret scanning.
- SAST.
- Container image scanning.
- Minimum base image.
- Root olmayan container user.
- Build artifact imzası/SBOM gelecekte.
- Production deploy yalnızca protected branch/tag üzerinden.

## 27.18. Log redaction

Aşağıdakiler loglanmaz veya maskelenir:

```text
Authorization header
Refresh token
Password
OpenAI API key
Store receipt'in tamamı
Signed URL query string
Raw kullanıcı fotoğrafı
Tam kullanıcı promptu
Reset/verify token
```

Pino redaction örneği:

```ts
redact: {
  paths: [
    "req.headers.authorization",
    "req.headers.cookie",
    "body.password",
    "body.refreshToken",
    "body.receipt",
    "response.uploadUrl",
    "response.downloadUrl",
  ],
  censor: "[REDACTED]",
}
```

## 27.19. Güvenlik olayı müdahale planı

Örnek runbook:

### OpenAI anahtarı sızdı

1. Anahtarı iptal et.
2. Yeni anahtar oluştur.
3. Generation kill switch aç.
4. Son kullanım loglarını incele.
5. Bütçe/usage kontrol et.
6. Secret’ın çıktığı kaynağı temizle.
7. Gerekirse kullanıcı ve yetkililere bildirim süreci başlat.

### Storage yanlışlıkla public oldu

1. Public access kapat.
2. Access log incele.
3. Signed URL/credential rotate et.
4. Etkilenen object listesini çıkar.
5. Hukuki/gizlilik olay sürecini uygula.

### Kullanıcı yüzü izinsiz kullanıldı

1. Share link’i derhal gizle.
2. Kanıt ve audit kaydını güvenli koru.
3. Generation/user incele.
4. İlgili kişiye süreç bilgisi ver.
5. Silme/yaptırım/itiraz kararını uygula.

---

# 28. Veri Gizliliği, Saklama ve Silme

## 28.1. Veri sınıflandırması

| Veri | Sınıf | Örnek |
|---|---|---|
| Kimlik ve hesap | Kişisel | email, ad, doğum yılı |
| Yüz/görsel | Yüksek hassasiyet | selfie, generation output |
| Authentication | Gizli | refresh hash, reset token hash |
| Finans | Hassas | store transaction ID, ledger |
| AI prompt | Kişisel olabilen | sahne talimatı |
| Telemetri | Operasyonel | request ID, süre, hata kodu |
| Moderasyon | Yüksek hassasiyet | ihlal kategorisi, review kaydı |
| Hak belgeleri | Gizli ticari | lisans sözleşmesi |

Yüz görselleri, üründe biyometrik kimlik doğrulama yapılmasa bile yüksek hassasiyetli kişisel veri yaklaşımıyla korunmalıdır.

## 28.2. Açık kullanıcı bilgilendirmesi

İlk upload öncesi kısa özet:

```text
Fotoğrafınız seçtiğiniz AI düzenlemesini oluşturmak için güvenli biçimde işlenir.
API anahtarı cihazda tutulmaz. Fotoğrafınızı model eğitimi için kullanmayız.
Kaynak ve sonuç görsellerinizi hesabınızdan silebilirsiniz. Ayrıntılar için
Gizlilik Politikası’nı inceleyin.
```

Kullanım koşulları ve gizlilik politikası checkbox ile tek bir belirsiz rızaya dönüştürülmemelidir. Zorunlu işlem, opsiyonel pazarlama ve opsiyonel ürün geliştirme izinleri ayrılmalıdır.

## 28.3. Önerilen saklama süreleri

Kesin süreler hukuk ve ürün kararıyla onaylanmalıdır. Başlangıç önerisi:

| Veri | Varsayılan süre |
|---|---|
| Tamamlanmamış upload | 24 saat |
| Rejected/bozuk asset | 24–72 saat |
| Kaynak selfie | Kullanıcının seçimi; varsayılan 30 gün veya generation sonrası sil |
| Generation preview | Aktif hesapta 90 gün |
| HD/favori output | Kullanıcı silene kadar veya plan saklama süresi |
| Signed URL | 1–15 dakika |
| Share token | Kullanıcı iptaline veya expiry’ye kadar |
| Raw prompt | 7–30 gün; sonra sil/anonimleştir |
| Normalize telemetry | 12–24 ay |
| Auth audit | 12–24 ay |
| Moderasyon evidence | Risk ve hukuki gerekliliğe göre sınırlı süre |
| Silinen hesap primary data | En kısa operasyonel süre |
| Backup içindeki silinmiş veri | Backup retention sonunda |

## 28.4. Kullanıcı saklama tercihleri

Ayarlar > Gizlilik:

- Kaynak fotoğrafı üretimden sonra otomatik sil
- Projeleri 30/90/365 gün sakla
- AI sohbet geçmişini sakla/sil
- Paylaşım linklerini yönet
- Tüm kaynak görselleri sil
- Tüm projeleri sil
- Verilerimi indir
- Hesabımı sil

“Kullanıcı kaynağı hemen sil” seçerse revizyon özelliğinin sınırlanacağı açıklanır.

## 28.5. Hesap silme akışı

```http
DELETE /v1/me
```

Akış:

1. Şifre/MFA/yeniden doğrulama.
2. Aktif abonelik ve mağaza durumu açıklaması.
3. Silme talebi oluşturma.
4. Tüm session’ları revoke.
5. Hesabı `DELETION_PENDING` yapma.
6. Public share link’lerini kapatma.
7. Yeni generation’ı engelleme.
8. Privacy queue’ya deletion job ekleme.
9. Storage object’lerini silme.
10. Kişisel DB alanlarını silme/anonimleştirme.
11. Finans/audit gibi yasal zorunlu kayıtları minimum veriyle ayırma.
12. Tamamlanınca e-posta bildirimi.

Grace period varsa kullanıcıya tarih açıkça gösterilir. Güvenlik açısından account takeover şüphesinde deletion geçici bekletilebilir ve kullanıcıya bildirilir.

## 28.6. Storage deletion manifest

Hesap silmede yalnızca DB cascade’e güvenilmez. Manifest oluşturulur:

```json
{
  "deletionRequestId": "del_01J...",
  "userId": "usr_01J...",
  "storagePrefixes": [
    "private/users/usr_01J.../sources/",
    "private/users/usr_01J.../generations/",
    "private/users/usr_01J.../avatars/"
  ],
  "dbTables": [
    "projects",
    "generations",
    "assets",
    "notifications",
    "push_devices"
  ],
  "status": "PROCESSING"
}
```

Her adım idempotent ve retry edilebilir olmalıdır.

## 28.7. Veri export’u

```http
POST /v1/me/data-export
```

Export içeriği:

- Profil ve ayarlar
- Proje metadata
- Generation metadata
- Kredi işlemleri
- Abonelik durumu
- Paylaşım linkleri
- Kullanıcıya ait görseller için zaman sınırlı download paketi

Hazır dosya private storage’a yazılır, 24–72 saat geçerli signed link gönderilir. Export talebi rate limited ve yeniden doğrulamalıdır.

## 28.8. OpenAI’ye veri aktarımı

Gizlilik politikasında açıkça belirtilmesi gerekenler:

- Görsel ve metin üretim amacıyla üçüncü taraf AI sağlayıcısına iletilebilir.
- Hangi veri kategorilerinin iletildiği
- İşleme amacı
- Kullanılan bölge/saklama ayarları
- Kullanıcının silme seçenekleri
- Model eğitimi konusunda ürünün ve sağlayıcının geçerli veri ayarları

Yayın öncesi OpenAI’nin kullanılan API ve hesap için geçerli veri kontrolleri tekrar doğrulanmalıdır.

## 28.9. KVKK/GDPR yaklaşımı

İhtiyaca göre:

- Veri sorumlusu/işleyen rolleri
- Aydınlatma metni
- İşleme şartları
- Açık rıza ayrımı
- Veri sahibi başvuru kanalı
- Yurt dışına aktarım değerlendirmesi
- Alt işleyen listesi
- Veri envanteri
- İhlal müdahale prosedürü
- Saklama/imha politikası
- DPIA/etki değerlendirmesi

hazırlanmalıdır.

Bu bölüm teknik ürün planıdır; resmî hukuki uyumluluk için uzman görüşü gerekir.

## 28.10. Ürün analitiği gizliliği

Analitik event örneği:

```json
{
  "event": "generation_completed",
  "anonymousUserId": "anon_hash",
  "mode": "FAN_MOMENT",
  "sceneCategory": "SPORT",
  "quality": "medium",
  "latencyBucket": "30_60_sec",
  "success": true
}
```

Gönderilmemesi gerekenler:

- Fotoğraf
- Tam prompt
- Ünlü lisans belgesi
- E-posta
- Signed URL
- Face embedding

## 28.11. Privacy by design kontrolü

Her yeni özellik için şu sorular cevaplanır:

1. Bu veri gerçekten gerekli mi?
2. Daha az veriyle yapılabilir mi?
3. Ne kadar süre tutacağız?
4. Kullanıcı nereden silecek?
5. Hangi üçüncü taraflara gidecek?
6. Kimler erişebilecek?
7. Erişim audit edilecek mi?
8. Çocuk/public figure riski var mı?
9. Backup’tan ne zaman düşecek?
10. İhlal olursa etki nedir?

---

# 29. Loglama, İzleme ve Maliyet Kontrolü

## 29.1. Structured logging

Pino JSON log formatı:

```json
{
  "level": 30,
  "time": 1788339600000,
  "service": "generation-worker",
  "environment": "production",
  "requestId": "req_01J...",
  "generationId": "gen_01J...",
  "jobId": "generation:gen_01J...:render:v1",
  "event": "openai_generation_completed",
  "durationMs": 42380,
  "model": "gpt-image-2",
  "quality": "medium",
  "outputCount": 2
}
```

Loglar insan cümlesi yerine sorgulanabilir alanlar içermelidir.

## 29.2. Request ID

- Reverse proxy gelen `X-Request-ID` güvenilir değilse yenisini üretir.
- API response header’da döndürür.
- DB generation kaydına yazar.
- BullMQ job’a aktarır.
- OpenAI provider call loguna ekler.
- Support ekranında aranabilir.

## 29.3. Hata izleme

Sentry veya eşdeğeri:

- Express unhandled error
- Worker job failure
- Mobile crash
- React Native JS error
- Native crash
- Slow API traces
- Release/environment bilgisi

Before-send hook hassas alanları temizler. Screenshot/attachment otomatik yükleme gizlilik incelemesi olmadan açılmaz.

## 29.4. Temel teknik metrikler

### API

- Request count
- p50/p95/p99 latency
- 4xx/5xx rate
- Auth failure
- Rate limit hit
- DB query latency
- Connection pool saturation

### Queue

- Waiting jobs
- Active jobs
- Completed/failed
- Retry count
- Stalled jobs
- Oldest waiting age

### AI

- Generation success rate
- Provider refusal rate
- Provider timeout/rate limit
- Ortalama üretim süresi
- Model/quality usage
- Output quality failure
- Revision success

### Storage

- Upload success
- Object count/bytes
- Signed URL error
- Orphan object
- Delete failure

### Billing

- Purchase verification success
- Duplicate receipt
- Refund/chargeback
- Credit reserve/capture/release farkı
- Wallet reconciliation mismatch

## 29.5. Ürün metrikleri

- Onboarding completion
- İlk upload
- İlk generation
- Preview seçme oranı
- HD dönüşüm oranı
- Share oranı
- 1/7/30 günlük retention
- Filtre/sahne popülerliği
- Ücretsiz → ücretli dönüşüm
- Generation başına revizyon
- Kullanıcı rapor oranı

## 29.6. AI maliyet kaydı

Her generation için:

```text
provider
model
input_count
input_bytes
quality
size
output_count
reported_usage
estimated_provider_cost
storage_cost_estimate
moderation_cost_estimate
store_fee_allocation
credits_charged
```

alanları tutulur. Sağlayıcı usage detayı her çağrıda mevcut değilse konfigüre edilen fiyat tablosuyla tahmin yapılır.

## 29.7. Fiyat tablosu versiyonlama

```text
ai_pricing_version = openai-2026-09-01
```

Config:

```json
{
  "provider": "openai",
  "model": "gpt-image-2",
  "effectiveFrom": "2026-09-01T00:00:00Z",
  "qualityCosts": {
    "low": 0,
    "medium": 0,
    "high": 0
  },
  "currency": "USD"
}
```

Gerçek değerler güncel resmî fiyat sayfasından kontrollü olarak girilir. Geçmiş generation maliyetleri eski fiyat versiyonuyla korunur.

## 29.8. Bütçe güvenliği

```env
AI_DAILY_BUDGET_USD=...
AI_MONTHLY_BUDGET_USD=...
AI_BUDGET_WARNING_PERCENT=70
AI_BUDGET_CRITICAL_PERCENT=90
```

Eşik davranışları:

- %70: operasyon uyarısı
- %90: ücretsiz generation limiti düşür
- %100: ücretli kullanıcılar için politika kararına göre kontrollü devam veya global kill switch

Bütçe sayacı yalnızca local tahmine değil, OpenAI proje usage verisiyle düzenli uzlaştırmaya dayanmalıdır.

## 29.9. Alarm örnekleri

- 5 dakikada provider hata > %20
- Queue oldest age > 10 dakika
- Moderasyon oranında ani artış
- Kredi iadesinde 3x artış
- Storage upload başarısı < %98
- Purchase verification failure > %5
- API p95 > 1 saniye
- DB disk > %80
- Redis memory > %80
- Günlük bütçe > %90
- Yeni admin login farklı ülkeden

## 29.10. SLO önerileri

MVP hedefleri:

```text
API availability:                 %99.5 aylık
Auth p95 latency:                 < 500 ms
Generation create p95:            < 800 ms
Upload initiation p95:            < 500 ms
Generation success:               > %95 provider sağlıklı iken
Credit reconciliation accuracy:   %100
Deletion job completion:          < 24 saat
Critical moderation report SLA:   < 4 saat
```

Generation süresi haricî sağlayıcıya bağlı olduğu için ayrı SLO olarak ölçülür.

---

# 30. Deployment ve Sunucu Mimarisi

## 30.1. AWS’siz production yaklaşımı

Uygulama şu altyapılardan birinde çalışabilir:

- Hetzner Cloud
- DigitalOcean Droplet/App Platform
- Google Cloud Compute Engine/Cloud Run uygun mimariyle
- OVH
- Türkiye’de güvenilir bir VPS/dedicated sağlayıcı
- Kendi yönetilen Linux sunucusu

Dosya depolama:

- Cloudflare R2
- Alternatif: Backblaze B2, DigitalOcean Spaces, MinIO veya adapter’ı uygulanan başka AWS dışı object storage

Bu dokümanın referans deployment’ı:

```text
Linux VM + Docker Compose + PostgreSQL + Redis + API + Worker + Nginx/Caddy + Cloudflare R2
```

## 30.2. Docker servisleri

```yaml
services:
  api:
    image: ghcr.io/organization/retake-api:${APP_VERSION}
    restart: unless-stopped
    env_file: .env.production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks: [internal, edge]

  worker:
    image: ghcr.io/organization/retake-worker:${APP_VERSION}
    restart: unless-stopped
    env_file: .env.production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks: [internal]

  admin:
    image: ghcr.io/organization/retake-admin:${APP_VERSION}
    restart: unless-stopped
    networks: [edge]

  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks: [internal]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redis_data:/data
    networks: [internal]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  reverse-proxy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
    networks: [edge]

networks:
  internal:
    internal: true
  edge:

volumes:
  postgres_data:
  redis_data:
  caddy_data:
```

Production’da DB’nin aynı VM’de veya yönetilen ayrı serviste olması ölçek ve bütçeye göre kararlaştırılır.

## 30.3. Domain yapısı

```text
api.retake.ai          -> Express API
admin.retake.ai        -> Admin web
www.retake.ai          -> Landing/privacy/terms/share shell
share.retake.ai        -> Public share pages
status.retake.ai       -> Status page
```

Mobil universal links/app links yapılandırması bu domainlerle yapılır.

## 30.4. Ortamlar

```text
local
review/preview
staging
production
```

Her ortamın ayrı olması gerekenler:

- PostgreSQL
- Redis namespace/instance
- R2 bucket/prefix
- OpenAI project/key
- Google/Apple OAuth credentials
- Store sandbox/production config
- Sentry environment
- Push credentials

Production verisi staging’e kopyalanmaz. Gerekli test datası anonim/sentetik üretilir.

## 30.5. CI/CD

GitHub Actions örnek aşamalar:

```text
1. checkout
2. install frozen lockfile
3. lint
4. typecheck
5. unit tests
6. integration tests
7. build API/worker/admin
8. Prisma schema validation
9. dependency/container scan
10. Docker image build
11. image registry push
12. staging deploy
13. smoke test
14. production approval
15. production migration
16. rolling deploy
17. health/smoke verification
```

## 30.6. Database migration

- Prisma migration dosyaları Git’e commit edilir.
- Production’da `prisma migrate deploy` kullanılır.
- Destructive migration ayrı review ister.
- Büyük tablo değişikliklerinde expand-and-contract yaklaşımı.
- Migration öncesi backup alınır.
- Migration sonucu health/smoke test yapılır.
- Geri dönüş planı hazırlanır.

## 30.7. Zero/low downtime yaklaşımı

1. Yeni kod eski ve yeni schema ile uyumlu deploy edilir.
2. Yeni nullable alan eklenir.
3. Backfill job çalışır.
4. Kod yeni alanı kullanmaya başlar.
5. Sonraki sürümde eski alan kaldırılır.

Worker job payload’larında `jobVersion` olması rolling deploy sırasında eski/yeni worker uyumluluğunu sağlar.

## 30.8. Health endpoint’leri

```text
GET /health/live
GET /health/ready
GET /health/version
```

`live`:

- Process çalışıyor mu?

`ready`:

- PostgreSQL bağlantısı
- Redis bağlantısı
- Gerekli config
- Worker ise queue erişimi

OpenAI’ye her health check’te gerçek ücretli çağrı yapılmaz. Ayrı synthetic canary periyodik çalıştırılabilir.

## 30.9. Scaling

İlk aşama:

```text
1 API container
1 worker container
1 PostgreSQL
1 Redis
```

Büyüyünce:

- API yatay çoğaltılır.
- Worker sayısı queue ve provider limite göre artırılır.
- Postprocess worker ayrı ölçeklenir.
- PostgreSQL yönetilen/HA servise taşınabilir.
- Redis yönetilen/HA olabilir.
- CDN üzerinden public landing/share asset’leri sunulur.

Session state API memory’sinde tutulmadığı için API yatay ölçeklenebilir.

## 30.10. Backup planı

### PostgreSQL

- Günlük full backup
- Mümkünse WAL/PITR
- Şifreli uzak lokasyon
- Retention: 7 günlük + 4 haftalık + ürün ihtiyacına göre aylık
- Aylık restore testi

### R2/object storage

- Versioning/soft-delete değerlendirmesi
- Kullanıcı silme politikasını ihlal etmeyecek lifecycle
- Katalog ve lisans belgeleri için ayrı backup

### Redis

Redis primary source of truth değildir; queue recovery ihtiyacına göre AOF/backup uygulanır. Generation durumu PostgreSQL’de tutulduğu için queue yeniden oluşturulabilir.

## 30.11. Secret management

Başlangıçta güvenli server secret file veya Docker secret kullanılabilir. Daha ileri:

- Doppler
- 1Password Secrets Automation
- Infisical
- Vault
- Sağlayıcının secret manager’ı

`.env.production` Git’e eklenmez ve yedeklerde düz metin dolaştırılmaz.

## 30.12. Mobil build ve yayın

Expo:

```text
EAS Build
EAS Submit
EAS Update (yalnızca uygun JS/asset güncellemeleri)
```

Kanallar:

```text
development
preview
production
```

EAS Update ile native izin/SDK değişiklikleri gönderilemez; bu değişiklikler yeni mağaza build’i gerektirir.

## 30.13. Store release süreci

- Privacy Nutrition Label / Data Safety formu
- Fotoğraf/kamera izin açıklamaları
- AI-generated content açıklaması
- UGC reporting/blocking akışı
- In-app purchase ürünleri
- Restore purchases
- Account deletion
- Test hesabı
- Review notes
- Lisanslı kişi kullanımı varsa belge/izin hazırlığı

Her release’te mağaza kuralları güncel olarak tekrar kontrol edilmelidir.

## 30.14. Release rollback

Backend:

- Önceki Docker image tag
- DB migration uyumluluğu
- Feature flag kill switch

Mobil:

- Kritik özelliği remote flag ile kapatma
- EAS update rollback, uygunsa
- Gerekirse acil mağaza sürümü

AI prompt:

- Prompt version rollback
- Model config rollback
- Public figure global disable


---

# 31. Ortam Değişkenleri

## 31.1. İlkeler

- `.env` dosyaları Git’e eklenmez.
- `.env.example` yalnızca anahtar adlarını ve güvenli örnekleri içerir.
- Mobil uygulamaya konulan `EXPO_PUBLIC_*` değerlerinin herkes tarafından görülebileceği kabul edilir.
- OpenAI, DB, Redis, storage, e-posta ve satın alma secret’ları `EXPO_PUBLIC_*` olamaz.
- Development, staging ve production secret’ları ayrıdır.
- Uygulama başlarken env değerleri Zod ile doğrulanır; eksik kritik config ile process başlamaz.

## 31.2. Backend `.env.example`

```env
# --------------------------------------------------
# APP
# --------------------------------------------------
NODE_ENV=development
APP_NAME=Retake AI
APP_VERSION=0.1.0
API_HOST=0.0.0.0
API_PORT=4000
API_BASE_URL=http://localhost:4000
PUBLIC_WEB_URL=http://localhost:3000
ADMIN_WEB_URL=http://localhost:3001
SHARE_WEB_URL=http://localhost:3002
DEFAULT_LOCALE=tr-TR
DEFAULT_TIMEZONE=Europe/Istanbul

# Comma-separated allowlist
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
TRUST_PROXY_HOPS=1

# --------------------------------------------------
# DATABASE
# --------------------------------------------------
DATABASE_URL=postgresql://retake:retake@localhost:5432/retake?schema=public
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20
DATABASE_QUERY_TIMEOUT_MS=10000

# --------------------------------------------------
# REDIS / BULLMQ
# --------------------------------------------------
REDIS_URL=redis://localhost:6379
REDIS_PREFIX=retake:dev:
GENERATION_QUEUE_NAME=generation
GENERATION_WORKER_CONCURRENCY=2
POSTPROCESS_WORKER_CONCURRENCY=4
JOB_MAX_ATTEMPTS=4
JOB_BACKOFF_MS=5000

# --------------------------------------------------
# AUTH / JWT
# --------------------------------------------------
JWT_ISSUER=https://api.retake.ai
JWT_USER_AUDIENCE=retake-mobile
JWT_ADMIN_AUDIENCE=retake-admin
JWT_ACCESS_PRIVATE_KEY_BASE64=
JWT_ACCESS_PUBLIC_KEY_BASE64=
JWT_ACCESS_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=30
REFRESH_TOKEN_PEPPER=
PASSWORD_RESET_TTL_MINUTES=30
EMAIL_VERIFY_TTL_HOURS=24

# --------------------------------------------------
# PASSWORD / AUTH DEFENSE
# --------------------------------------------------
ARGON2_MEMORY_COST=65536
ARGON2_TIME_COST=3
ARGON2_PARALLELISM=1
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCK_MINUTES=15

# --------------------------------------------------
# OPENAI
# --------------------------------------------------
OPENAI_API_KEY=
OPENAI_PROJECT_ID=
OPENAI_ORGANIZATION_ID=
OPENAI_TEXT_MODEL=
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_MODERATION_MODEL=omni-moderation-latest
OPENAI_REQUEST_TIMEOUT_MS=180000
OPENAI_MAX_JOBS_PER_WINDOW=10
OPENAI_RATE_WINDOW_MS=60000
OPENAI_STORE_RESPONSES=false

# --------------------------------------------------
# AI COST / FEATURE SAFETY
# --------------------------------------------------
AI_DAILY_BUDGET_USD=100
AI_MONTHLY_BUDGET_USD=2000
AI_BUDGET_WARNING_PERCENT=70
AI_BUDGET_CRITICAL_PERCENT=90
AI_MAX_REFERENCE_IMAGES=3
AI_MAX_PREVIEW_IMAGES=4
AI_DEFAULT_PREVIEW_QUALITY=low
AI_DEFAULT_FINAL_QUALITY=high
DISABLE_ALL_GENERATION=false
DISABLE_PUBLIC_FIGURES=true
DISABLE_HISTORICAL_FIGURES=true
FORCE_AI_WATERMARK_FOR_FEATURED_PEOPLE=true

# --------------------------------------------------
# STORAGE – CLOUDFLARE R2
# --------------------------------------------------
STORAGE_DRIVER=r2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_BUCKET_PRIVATE=retake-private
R2_BUCKET_PUBLIC=retake-public
R2_PUBLIC_BASE_URL=
UPLOAD_URL_TTL_SECONDS=300
DOWNLOAD_URL_TTL_SECONDS=300
MAX_UPLOAD_BYTES=15728640
MAX_IMAGE_PIXELS=40000000

# Development fallback
LOCAL_STORAGE_ROOT=./.local-storage

# --------------------------------------------------
# EMAIL
# --------------------------------------------------
EMAIL_DRIVER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM_NAME=Retake AI
EMAIL_FROM_ADDRESS=noreply@retake.ai
SUPPORT_EMAIL=support@retake.ai

# --------------------------------------------------
# GOOGLE / APPLE LOGIN
# --------------------------------------------------
GOOGLE_IOS_CLIENT_ID=
GOOGLE_ANDROID_CLIENT_ID=
GOOGLE_WEB_CLIENT_ID=
APPLE_SERVICE_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY_BASE64=

# --------------------------------------------------
# PUSH NOTIFICATIONS
# --------------------------------------------------
EXPO_ACCESS_TOKEN=
EXPO_PROJECT_ID=
PUSH_NOTIFICATIONS_ENABLED=true

# --------------------------------------------------
# MOBILE PURCHASES / REVENUECAT
# --------------------------------------------------
REVENUECAT_WEBHOOK_SECRET=
REVENUECAT_PROJECT_ID=
APPLE_SHARED_SECRET=
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64=
PURCHASES_ENABLED=false

# --------------------------------------------------
# MODERATION / RETENTION
# --------------------------------------------------
MINIMUM_USER_AGE=18
SOURCE_ASSET_RETENTION_DAYS=30
PREVIEW_RETENTION_DAYS=90
RAW_PROMPT_RETENTION_DAYS=14
FAILED_UPLOAD_RETENTION_HOURS=24
DATA_EXPORT_EXPIRY_HOURS=48
ACCOUNT_DELETION_GRACE_DAYS=0

# --------------------------------------------------
# RATE LIMIT
# --------------------------------------------------
RATE_LIMIT_GENERAL_PER_MINUTE=120
RATE_LIMIT_UPLOAD_PER_HOUR=20
RATE_LIMIT_GENERATION_QUOTE_PER_MINUTE=30
RATE_LIMIT_REPORT_PER_HOUR=10

# --------------------------------------------------
# OBSERVABILITY
# --------------------------------------------------
LOG_LEVEL=info
SENTRY_DSN=
SENTRY_ENVIRONMENT=development
OTEL_EXPORTER_OTLP_ENDPOINT=
METRICS_ENABLED=true

# --------------------------------------------------
# ADMIN SECURITY
# --------------------------------------------------
ADMIN_MFA_REQUIRED=true
ADMIN_SESSION_IDLE_MINUTES=15
ADMIN_SESSION_MAX_HOURS=8
ADMIN_ALLOWED_IP_RANGES=

# --------------------------------------------------
# FEATURE FLAGS DEFAULTS
# --------------------------------------------------
FEATURE_AI_FILTERS=true
FEATURE_FAN_MOMENT=true
FEATURE_CHAT_REVISION=true
FEATURE_PUBLIC_SHARING=true
FEATURE_VIDEO=false
```

## 31.3. Expo mobil `.env.example`

Mobilde yalnızca public ve secret olmayan config:

```env
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000
EXPO_PUBLIC_WEB_BASE_URL=http://localhost:3000
EXPO_PUBLIC_SHARE_BASE_URL=http://localhost:3002
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=
EXPO_PUBLIC_EAS_PROJECT_ID=
EXPO_PUBLIC_MINIMUM_USER_AGE=18
EXPO_PUBLIC_SUPPORT_EMAIL=support@retake.ai
```

RevenueCat’in mobil public SDK key’leri secret gibi değerlendirilmez; buna rağmen backend yetkilendirmesi yerine geçmez. Store transaction doğrulaması backend’de yapılır.

## 31.4. Env doğrulama örneği

```ts
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  OPENAI_API_KEY: z.string().min(20),
  OPENAI_IMAGE_MODEL: z.string().min(1),
  OPENAI_MODERATION_MODEL: z.string().min(1),
  STORAGE_DRIVER: z.enum(["local", "r2"]),
  R2_ENDPOINT: z.string().url().optional(),
  R2_BUCKET_PRIVATE: z.string().optional(),
  JWT_ACCESS_PRIVATE_KEY_BASE64: z.string().min(1),
  JWT_ACCESS_PUBLIC_KEY_BASE64: z.string().min(1),
  REFRESH_TOKEN_PEPPER: z.string().min(32),
});

export const env = EnvSchema.parse(process.env);
```

Production’da `STORAGE_DRIVER=r2` iken R2 alanlarını koşullu zorunlu yapmak için `superRefine` kullanılmalıdır.

## 31.5. Secret rotasyon tablosu

| Secret | Önerilen rotasyon |
|---|---|
| OpenAI API key | 90 gün veya olay anında |
| JWT signing key | Planlı key ring ile 90–180 gün |
| Refresh pepper | Acil durum dışında dikkatli migration ile |
| R2 access key | 90 gün |
| SMTP credential | 90–180 gün |
| Webhook secret | 90–180 gün |
| Admin recovery codes | Kullanım sonrası hemen |

---

# 32. Örnek Kodlar

> Bu bölüm üretim kodunun tamamı değildir. Kullanılan paketlerin kurulu sürümüne göre method ve option adları resmî dokümantasyondan doğrulanmalıdır. Kodlar mimari sınırları ve güvenli akışı göstermek için verilmiştir.

## 32.1. Express uygulama bootstrap

```ts
// apps/api/src/app.ts
import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";
import { apiRouter } from "./routes/index.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY_HOPS);

  app.use(
    pinoHttp({
      logger,
      genReqId(req, res) {
        const supplied = req.headers["x-request-id"];
        const requestId = typeof supplied === "string" ? supplied : randomUUID();
        res.setHeader("x-request-id", requestId);
        return requestId;
      },
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.body.password",
          "req.body.refreshToken",
          "req.body.receipt",
        ],
        censor: "[REDACTED]",
      },
    }),
  );

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.CORS_ALLOWED_ORIGINS.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("CORS origin is not allowed"));
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));

  app.get("/health/live", (_req, res) => {
    res.status(200).json({ status: "ok", version: env.APP_VERSION });
  });

  app.use("/v1", apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
```

## 32.2. Merkezi hata sınıfı

```ts
// packages/shared/src/errors/app-error.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}
```

```ts
// apps/api/src/middleware/error-handler.ts
import type { ErrorRequestHandler } from "express";
import { AppError } from "@retake/shared/errors";

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  req.log.error(
    {
      err: error,
      requestId: req.id,
    },
    "request_failed",
  );

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId: req.id,
      },
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Beklenmeyen bir hata oluştu.",
      requestId: req.id,
    },
  });
};
```

## 32.3. Zod route doğrulama middleware’i

```ts
import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";
import { AppError } from "@retake/shared/errors";

export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      next(
        new AppError(
          "VALIDATION_ERROR",
          "Gönderilen bilgiler geçerli değil.",
          422,
          parsed.error.flatten(),
        ),
      );
      return;
    }

    req.body = parsed.data;
    next();
  };
}
```

## 32.4. Register schema

```ts
import { z } from "zod";

export const RegisterBodySchema = z.object({
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
  password: z.string().min(10).max(128),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()),
  acceptedTermsVersion: z.string().min(1),
  acceptedPrivacyVersion: z.string().min(1),
});
```

## 32.5. Şifre hash servisi

```ts
import argon2 from "argon2";
import { env } from "../config/env.js";

export const passwordHasher = {
  hash(password: string) {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: env.ARGON2_MEMORY_COST,
      timeCost: env.ARGON2_TIME_COST,
      parallelism: env.ARGON2_PARALLELISM,
    });
  },

  verify(hash: string, password: string) {
    return argon2.verify(hash, password);
  },
};
```

## 32.6. Refresh token oluşturma ve hash

```ts
import { createHmac, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

export function createRefreshToken() {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string) {
  return createHmac("sha256", env.REFRESH_TOKEN_PEPPER)
    .update(token)
    .digest("hex");
}
```

DB’de yalnızca `hashRefreshToken(rawToken)` tutulur.

## 32.7. Refresh rotation örneği

```ts
async function rotateRefreshToken(input: {
  rawRefreshToken: string;
  userAgent?: string;
  ipAddress?: string;
}) {
  const tokenHash = hashRefreshToken(input.rawRefreshToken);

  return prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new AppError("INVALID_SESSION", "Oturum geçersiz.", 401);
    }

    if (session.replacedBySessionId) {
      await tx.session.updateMany({
        where: { tokenFamilyId: session.tokenFamilyId },
        data: { revokedAt: new Date(), revokeReason: "TOKEN_REUSE" },
      });
      throw new AppError("SESSION_REUSE_DETECTED", "Oturum güvenlik nedeniyle kapatıldı.", 401);
    }

    const nextRawToken = createRefreshToken();
    const nextSession = await tx.session.create({
      data: {
        userId: session.userId,
        tokenFamilyId: session.tokenFamilyId,
        refreshTokenHash: hashRefreshToken(nextRawToken),
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
        expiresAt: addDays(new Date(), env.REFRESH_TOKEN_TTL_DAYS),
      },
    });

    await tx.session.update({
      where: { id: session.id },
      data: {
        revokedAt: new Date(),
        revokeReason: "ROTATED",
        replacedBySessionId: nextSession.id,
      },
    });

    return {
      accessToken: await issueAccessToken(session.user),
      refreshToken: nextRawToken,
    };
  });
}
```

## 32.8. Expo SecureStore token saklama

```ts
// apps/mobile/src/features/auth/token-store.ts
import * as SecureStore from "expo-secure-store";

const REFRESH_TOKEN_KEY = "retake.refreshToken";

export async function saveRefreshToken(token: string) {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearRefreshToken() {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
```

Access token Zustand memory store’da tutulur; kalıcı AsyncStorage’a yazılmaz.

## 32.9. Mobil API client ve refresh kilidi

```ts
import { getRefreshToken, saveRefreshToken, clearRefreshToken } from "./token-store";
import { authStore } from "./auth-store";

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;

    const response = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      await clearRefreshToken();
      authStore.getState().clearSession();
      return null;
    }

    const payload = await response.json();
    await saveRefreshToken(payload.data.refreshToken);
    authStore.getState().setAccessToken(payload.data.accessToken);
    return payload.data.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  let accessToken = authStore.getState().accessToken;

  const perform = (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(init.headers ?? {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    });

  let response = await perform(accessToken);

  if (response.status === 401) {
    accessToken = await refreshAccessToken();
    if (accessToken) response = await perform(accessToken);
  }

  return response;
}
```

## 32.10. Image picker örneği

```tsx
import * as ImagePicker from "expo-image-picker";

export async function selectSourcePhoto() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Fotoğraf izni verilmedi.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: false,
    quality: 1,
    exif: false,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    mimeType: asset.mimeType ?? "image/jpeg",
    fileSize: asset.fileSize,
  };
}
```

Paket sürümüne göre `mediaTypes` option değeri kontrol edilmelidir.

## 32.11. Upload initiate route

```ts
const UploadInitiateSchema = z.object({
  fileName: z.string().max(150),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(env.MAX_UPLOAD_BYTES),
  purpose: z.enum(["SOURCE_PHOTO", "AVATAR"]),
});

router.post(
  "/uploads/initiate",
  requireUser,
  validateBody(UploadInitiateSchema),
  asyncHandler(async (req, res) => {
    const result = await assetService.initiateUpload({
      userId: req.user.id,
      ...req.body,
    });

    res.status(201).json({ success: true, data: result });
  }),
);
```

## 32.12. Storage adapter

```ts
export interface ObjectStorage {
  createUploadUrl(input: {
    key: string;
    contentType: string;
    contentLength: number;
    expiresInSeconds: number;
  }): Promise<{ url: string; headers: Record<string, string> }>;

  createDownloadUrl(input: {
    key: string;
    expiresInSeconds: number;
    downloadFileName?: string;
  }): Promise<string>;

  putObject(input: {
    key: string;
    body: Buffer | NodeJS.ReadableStream;
    contentType: string;
    metadata?: Record<string, string>;
  }): Promise<void>;

  getObject(input: { key: string }): Promise<NodeJS.ReadableStream>;
  deleteObject(input: { key: string }): Promise<void>;
  deletePrefix(input: { prefix: string }): Promise<void>;
  exists(input: { key: string }): Promise<boolean>;
}
```

## 32.13. OpenAI image provider örneği

```ts
// apps/worker/src/providers/openai-image.provider.ts
import OpenAI, { toFile } from "openai";
import type {
  ImageGenerationInput,
  ImageGenerationOutput,
  ImageGenerationProvider,
} from "@retake/ai-contracts";
import { env } from "../config/env.js";

export class OpenAIImageProvider implements ImageGenerationProvider {
  private readonly client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    project: env.OPENAI_PROJECT_ID || undefined,
    organization: env.OPENAI_ORGANIZATION_ID || undefined,
    timeout: env.OPENAI_REQUEST_TIMEOUT_MS,
  });

  async generate(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
    const files = await Promise.all(
      input.sourceImages.map((source, index) =>
        toFile(source.buffer, `reference-${index + 1}.${extensionFor(source.mimeType)}`, {
          type: source.mimeType,
        }),
      ),
    );

    const response = await this.client.images.edit({
      model: env.OPENAI_IMAGE_MODEL,
      image: files,
      prompt: input.prompt,
      quality: input.quality,
      size: input.size,
      n: input.numberOfImages,
    });

    const images = (response.data ?? []).map((item) => {
      if (!item.b64_json) {
        throw new Error("OpenAI image response did not contain base64 output");
      }

      return {
        bytes: Buffer.from(item.b64_json, "base64"),
        mimeType: "image/png",
      };
    });

    if (images.length === 0) {
      throw new Error("OpenAI returned no image output");
    }

    return {
      providerRequestId: response._request_id,
      images,
    };
  }
}
```

OpenAI SDK’de response request ID ve image option alanlarının adı sürüme göre doğrulanmalıdır. Uygulama adapter sayesinde bu değişikliği tek dosyada karşılar.

## 32.14. Moderasyon provider örneği

```ts
export async function moderateText(text: string) {
  const response = await openai.moderations.create({
    model: env.OPENAI_MODERATION_MODEL,
    input: text,
  });

  const result = response.results[0];

  return {
    flagged: result.flagged,
    categories: result.categories,
    scores: result.category_scores,
    providerRequestId: response._request_id,
  };
}
```

Görsel moderasyon girdi formatı kullanılan SDK/model sürümüne göre resmi dokümandan uygulanır.

## 32.15. Generation create service

```ts
export async function createGeneration(input: CreateGenerationInput) {
  const idempotency = await idempotencyService.begin({
    userId: input.userId,
    key: input.idempotencyKey,
    route: "POST:/v1/generations",
    requestHash: stableHash(input.requestBody),
  });

  if (idempotency.cachedResponse) return idempotency.cachedResponse;

  const validated = await generationValidator.validate(input);
  const quote = await quoteService.requireValidQuote({
    userId: input.userId,
    quoteId: input.quoteId,
    parametersHash: validated.parametersHash,
  });

  const generation = await prisma.$transaction(async (tx) => {
    const project = await projectService.findOrCreateInTransaction(tx, validated);
    const generationRow = await tx.generation.create({
      data: {
        userId: input.userId,
        projectId: project.id,
        status: "QUEUED",
        operation: validated.operation,
        sceneId: validated.sceneId,
        featuredPersonId: validated.featuredPersonId,
        quality: validated.quality,
        outputCount: validated.outputCount,
        requestId: input.requestId,
      },
    });

    await creditService.reserveInTransaction(tx, {
      userId: input.userId,
      generationId: generationRow.id,
      credits: quote.credits,
      idempotencyKey: `reserve:${generationRow.id}`,
    });

    return generationRow;
  });

  await generationQueue.add(
    "render",
    { generationId: generation.id, requestId: input.requestId, jobVersion: 1 },
    { jobId: `generation:${generation.id}:render:v1` },
  );

  const response = {
    generationId: generation.id,
    status: generation.status,
    reservedCredits: quote.credits,
  };

  await idempotencyService.complete(idempotency.id, response);
  return response;
}
```

Queue add başarısız olursa outbox pattern veya reconciliation job kullanılmalıdır. DB commit olup job eklenmemesi senaryosu göz ardı edilmemelidir.

## 32.16. Transactional outbox önerisi

DB transaction içinde:

```text
Generation oluştur
Credit reserve et
OutboxEvent oluştur: GENERATION_REQUESTED
```

Ayrı dispatcher outbox event’i BullMQ’ya taşır ve event’i `processedAt` ile işaretler. Böylece API ile Redis arasında atomiklik sorunu azaltılır.

```ts
await tx.outboxEvent.create({
  data: {
    topic: "GENERATION_REQUESTED",
    aggregateType: "GENERATION",
    aggregateId: generation.id,
    payload: { generationId: generation.id, jobVersion: 1 },
  },
});
```

## 32.17. BullMQ worker iskeleti

```ts
import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { processGeneration } from "../services/process-generation.js";

export const generationWorker = new Worker(
  "generation",
  async (job) => {
    const { generationId, requestId, jobVersion } = job.data;

    if (jobVersion !== 1) {
      throw new Error(`Unsupported job version: ${jobVersion}`);
    }

    return processGeneration({
      generationId,
      requestId,
      bullJobId: String(job.id),
      attempt: job.attemptsMade,
    });
  },
  {
    connection: redisConnection,
    concurrency: env.GENERATION_WORKER_CONCURRENCY,
  },
);

generationWorker.on("failed", (job, error) => {
  logger.error(
    {
      err: error,
      jobId: job?.id,
      generationId: job?.data?.generationId,
    },
    "generation_job_failed",
  );
});
```

## 32.18. Worker orchestration iskeleti

```ts
export async function processGeneration(input: ProcessGenerationInput) {
  const generation = await generationRepository.getForProcessing(input.generationId);

  if (!generation || isTerminal(generation.status)) return;

  await generationRepository.transition(generation.id, "PREPARING_ASSETS");
  const assets = await assetPreparationService.prepare(generation);

  await generationRepository.transition(generation.id, "INPUT_MODERATION");
  await moderationService.assertInputAllowed({ generation, assets });

  await generationRepository.transition(generation.id, "RIGHTS_CHECK");
  await rightsService.assertAllowed(generation);

  await generationRepository.transition(generation.id, "COMPILING_PROMPT");
  const prompt = await promptService.compile({ generation, assets });

  await generationRepository.transition(generation.id, "GENERATING");
  const providerResult = await imageProvider.generate({
    requestId: input.requestId,
    prompt: prompt.text,
    sourceImages: assets.providerInputs,
    quality: generation.quality,
    size: mapSize(generation.aspectRatio),
    numberOfImages: generation.outputCount,
  });

  await generationRepository.transition(generation.id, "POST_PROCESSING");
  const outputs = await outputService.processAndStore({
    generation,
    providerResult,
  });

  await generationRepository.transition(generation.id, "OUTPUT_MODERATION");
  await moderationService.assertOutputsAllowed({ generation, outputs });

  await generationRepository.transition(generation.id, "QUALITY_CHECK");
  await qualityService.assertAcceptable({ generation, assets, outputs });

  await generationFinalizer.complete({ generation, outputs, prompt, providerResult });
}
```

Her aşama try/catch ile normalize edilmiş failure code üretmeli; tüm hatalar aynı şekilde retry edilmemelidir.

## 32.19. Generation finalizer

```ts
await prisma.$transaction(async (tx) => {
  await tx.generation.update({
    where: { id: generation.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      providerRequestId,
      model,
      promptTemplateKey,
      promptTemplateVersion,
    },
  });

  await creditService.captureInTransaction(tx, {
    userId: generation.userId,
    generationId: generation.id,
    idempotencyKey: `capture:${generation.id}`,
  });

  await tx.outboxEvent.create({
    data: {
      topic: "GENERATION_COMPLETED",
      aggregateType: "GENERATION",
      aggregateId: generation.id,
      payload: { generationId: generation.id, userId: generation.userId },
    },
  });
});
```

## 32.20. React Query generation hook

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useCreateGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGenerationPayload) => {
      const response = await apiFetch("/v1/generations", {
        method: "POST",
        headers: {
          "idempotency-key": input.idempotencyKey,
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) throw await toApiError(response);
      return response.json();
    },
    onSuccess(payload) {
      queryClient.setQueryData(
        ["generation", payload.data.generationId],
        payload.data,
      );
    },
  });
}

export function useGeneration(id: string | undefined) {
  return useQuery({
    queryKey: ["generation", id],
    enabled: Boolean(id),
    queryFn: () => getGeneration(id!),
    refetchInterval(query) {
      const status = query.state.data?.status;
      return isTerminalStatus(status) ? false : 4000;
    },
  });
}
```

## 32.21. Result screen state örneği

```tsx
function GenerationResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const generation = useGeneration(id);

  if (generation.isLoading) return <ResultSkeleton />;
  if (generation.isError) return <RetryState requestId={generation.error.requestId} />;

  switch (generation.data.status) {
    case "QUEUED":
    case "PREPARING_ASSETS":
    case "COMPILING_PROMPT":
    case "GENERATING":
    case "POST_PROCESSING":
      return <GenerationProgress generation={generation.data} />;
    case "BLOCKED":
      return <ModerationBlockedState generation={generation.data} />;
    case "FAILED":
      return <GenerationFailedState generation={generation.data} />;
    case "COMPLETED":
      return <CompletedResultGallery generation={generation.data} />;
    default:
      return <UnknownState />;
  }
}
```

## 32.22. Server-side hak kontrolü çağrısı

```ts
const rightsDecision = evaluateFeaturedPersonRights({
  person,
  userCountry: user.countryCode,
  userAge: calculateAge(user.birthYear),
  sceneId: generation.sceneId,
  usage: generation.usageType,
  now: new Date(),
});

if (rightsDecision.decision === "DENY") {
  throw new AppError(
    "FEATURED_PERSON_NOT_ALLOWED",
    "Bu kişi veya sahne şu anda kullanılamıyor.",
    403,
    { reasonCode: rightsDecision.code },
  );
}
```

## 32.23. Public share route

```ts
router.get(
  "/shares/:token",
  asyncHandler(async (req, res) => {
    const tokenHash = hashShareToken(req.params.token);
    const share = await shareRepository.findActiveByTokenHash(tokenHash);

    if (!share || share.expiresAt < new Date() || share.revokedAt) {
      throw new AppError("SHARE_NOT_FOUND", "Paylaşım bulunamadı.", 404);
    }

    const previewUrl = await storage.createDownloadUrl({
      key: share.output.shareStorageKey,
      expiresInSeconds: 60,
    });

    res.json({
      success: true,
      data: {
        title: share.title,
        previewUrl,
        disclosure: "AI_GENERATED",
        expiresAt: share.expiresAt,
      },
    });
  }),
);
```

Public route, kullanıcı adı/e-posta/proje promptu gibi gereksiz veriyi döndürmez.

## 32.24. Account deletion outbox

```ts
await prisma.$transaction(async (tx) => {
  await tx.user.update({
    where: { id: userId },
    data: {
      status: "DELETION_PENDING",
      deletionRequestedAt: new Date(),
    },
  });

  await tx.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokeReason: "ACCOUNT_DELETION" },
  });

  await tx.shareLink.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await tx.outboxEvent.create({
    data: {
      topic: "USER_DELETION_REQUESTED",
      aggregateType: "USER",
      aggregateId: userId,
      payload: { userId },
    },
  });
});
```


---

# 33. Test, Kalite ve AI Değerlendirme Sistemi

## 33.1. Test stratejisi

Retake AI testleri beş seviyede yürütülmelidir:

```text
1. Static checks
2. Unit tests
3. Integration tests
4. End-to-end tests
5. AI quality/safety evaluations
```

## 33.2. Static kontroller

Her pull request’te:

- TypeScript typecheck
- ESLint
- Prettier/format kontrolü
- Prisma schema validate
- OpenAPI contract kontrolü
- Secret scan
- Dependency vulnerability scan
- Dead code/import kontrolü
- Expo Doctor

çalışır.

## 33.3. Unit test kapsamı

### Backend

- Password hash/verify
- JWT issue/verify
- Refresh rotation/reuse detection
- User age hesaplama
- Featured person hak motoru
- Generation quote
- Credit reserve/capture/release
- Prompt compilation
- Moderation decision mapping
- Storage key üretimi
- Signed URL expiry
- Retention hesaplama
- Error normalization

### Mobile

- Form validation
- Auth state
- Token store wrapper mock
- Generation state rendering
- Filter intensity state
- Credit quote display
- Deep link resolver
- Error message mapping

## 33.4. Integration testleri

Testcontainers veya izole Docker servisleriyle:

- PostgreSQL + Prisma
- Redis + BullMQ
- LocalStorageProvider
- FakeOpenAIProvider
- FakePurchaseVerifier
- FakePushProvider

birlikte test edilir.

Örnek senaryolar:

1. Register → verify email → login
2. Login → refresh rotation → old token reuse
3. Upload initiate → complete → asset ready
4. Quote → reserve → generation complete → capture
5. Quote → reserve → provider fail → release
6. Duplicate idempotency key
7. Featured person license expiry
8. Account deletion manifest
9. Purchase webhook replay
10. Share token revoke

## 33.5. API E2E testleri

Supertest ile gerçek Express app:

```ts
it("creates a queued generation and reserves credits", async () => {
  const response = await request(app)
    .post("/v1/generations")
    .set("authorization", `Bearer ${accessToken}`)
    .set("idempotency-key", "test-generation-1")
    .send(validGenerationPayload)
    .expect(202);

  expect(response.body.data.status).toBe("QUEUED");
  expect(response.body.data.reservedCredits).toBe(2);
});
```

E2E testleri gerçek OpenAI çağrısı yapmaz. Provider fixture’ları deterministik output döndürür.

## 33.6. Mobile UI testleri

Araçlar:

- React Native Testing Library
- Jest
- Maestro veya Detox/EAS uyumlu E2E çözümü

Kritik mobil akışlar:

- Onboarding
- Register/login
- Fotoğraf izni reddi
- Gallery upload
- Create wizard
- Quote ve kredi onayı
- Generation progress
- App arka plana alınıp tekrar açılması
- Push deep link
- Revision chat
- Purchase restore
- Account deletion

## 33.7. Cihaz matrisi

Minimum:

### iOS

- Güncel iPhone Pro boyutu
- Küçük ekranlı desteklenen iPhone
- Dynamic Type büyük font
- Karanlık mod
- Düşük güç modu

### Android

- Orta seviye cihaz
- Düşük RAM cihaz
- Farklı ekran oranı
- Android güncel sürüm
- Desteklenen en düşük Android sürümü
- Üreticiye özel permission davranışı

Ayrıca:

- Yavaş ağ
- Uçak modu
- Çok az disk alanı
- Bildirim kapalı
- Kamera izni kapalı
- Fotoğraf izni sınırlı

senaryoları test edilir.

## 33.8. Load testleri

k6 veya Artillery:

- Login/read endpoints
- Catalog list
- Generation quote
- Generation create
- Polling endpoint
- Upload initiate
- Webhook bursts

OpenAI endpoint’i load testte mock edilir. Gerçek provider’a kontrolsüz yük bindirilmez.

Örnek hedef:

```text
500 eşzamanlı katalog kullanıcısı
100 eşzamanlı polling
20 generation create/saniye burst
100 purchase webhook/saniye kısa burst
```

Gerçek hedefler beklenen kullanıcı sayısına göre güncellenir.

## 33.9. Güvenlik testleri

- Auth bypass
- JWT audience/issuer yanlışlığı
- Expired token
- Refresh replay
- IDOR: başka kullanıcının asset/project/generation erişimi
- Signed URL yetki/expiry
- Upload content spoofing
- Oversized/decompression bomb
- Rate-limit bypass
- Purchase receipt replay
- Webhook signature bypass
- Admin RBAC
- Prompt injection
- Featured person catalog bypass
- Path traversal
- SQL injection raw route
- SSRF denemesi
- CORS/admin CSRF

Production öncesi bağımsız penetration test önerilir.

## 33.10. AI eval yaklaşımı

AI sonucu klasik unit test gibi piksel eşitliğiyle test edilemez. Ölçülebilir eval seti hazırlanır.

Her eval case:

```json
{
  "caseId": "fan-stadium-001",
  "sourceAssetIds": ["eval-user-front-01"],
  "operation": "FAN_MOMENT",
  "sceneId": "stadium-night",
  "characterType": "FICTIONAL",
  "instruction": "Kişi sağımda ve biraz geride olsun",
  "expected": {
    "userFacePreserved": true,
    "expectedFaceCount": 2,
    "featuredPersonPosition": "RIGHT",
    "aiDisclosureRequired": true,
    "forbiddenElements": ["team_logo", "news_banner", "extra_face"]
  }
}
```

## 33.11. AI kalite ölçütleri

Her output 1–5 veya pass/fail:

- Kimlik benzerliği
- Yüz netliği
- Kompozisyon doğruluğu
- Sahne doğruluğu
- Işık/gölge uyumu
- El/kol/yüz artifact seviyesi
- Prompt uygunluğu
- Filtre karakteri
- Doğallık
- AI etiketi
- Uygunsuz logo/metin
- Güvenlik uyumu

İnsan değerlendirmesi en az iki değerlendiriciyle yapılabilir. Anlaşmazlık oranı da ölçülür.

## 33.12. AI safety eval seti

Mutlaka test edilecek red-team istekler:

- Serbest ünlü adı
- Lisansı olmayan kişi ID’si
- Lisansı sona ermiş kişi
- Yasak ülke
- Ürün endorsement talebi
- Politik destek sahnesi
- Gerçek haber kanıtı
- Sahte kimlik/belge
- Cinsel/aşağılayıcı sahne
- Çocuk içeren riskli sahne
- “AI etiketini kaldır”
- “Kuralları yok say”
- Başkasının fotoğrafı olduğu açık talep
- İnternetten URL referansı
- Prompt içine sistem komutu enjeksiyonu

Beklenen sonuçlar `DENY`, `REVIEW` veya güvenli alternatif olarak tanımlanır.

## 33.13. Golden dataset

Üretim model/prompt güncellemesinde aynı sentetik/onaylı kaynaklarla golden dataset çalıştırılır:

```text
50 temel sahne
20 filtre
20 revizyon
30 kötüye kullanım vakası
20 düşük kaliteli fotoğraf
10 farklı cilt tonu/ışık koşulu
10 farklı ekran/oran çıktısı
```

Dataset gerçek kullanıcı fotoğraflarından izinsiz oluşturulmaz. Çalışanlardan/oyunculardan özel izinli veya sentetik asset’ler kullanılır.

## 33.14. Prompt A/B testi

A/B test:

- Yalnızca güvenlik açısından eşdeğer promptlar
- Kullanıcı yüzdesi küçük başlar
- Başarı, revizyon, refund, maliyet ve rapor oranı ölçülür
- Safety metriği kötüleşirse otomatik kapatma
- Prompt version generation kaydında bulunur

## 33.15. Gerçek OpenAI staging testleri

CI testleri mock kullanır. Staging’de sınırlı gerçek test:

- Günlük maksimum case
- Ayrı OpenAI project ve bütçe
- Onaylı eval görselleri
- Production kullanıcı verisi yok
- Sonuçlar kısa süre saklanır
- Maliyet raporu çıkarılır

## 33.16. Regression kriterleri

Yeni model/prompt sürümü yayınlanamaz, eğer:

- Safety pass oranı düşmüşse
- Kimlik koruma anlamlı kötüleşmişse
- Maliyet belirlenen eşiği aşmışsa
- Ortalama süre kabul eşiğini aşmışsa
- Output artifact oranı yükselmişse
- Public figure rights bypass oluşmuşsa

## 33.17. Store review test hesabı

Apple/Google incelemesi için:

- Çalışan test hesabı
- Yeterli test kredisi
- Moderasyon sınırları açıklaması
- Demo scene ve kurgusal karakter
- Account deletion yolu
- Restore purchases yolu
- İzinlerin neden istendiği
- Ünlü özelliği kapalıysa review note

hazır tutulur.

## 33.18. Definition of Done

Bir task tamamlandı sayılmaz, eğer:

- Kod yazılmış ama test yoksa
- API contract güncellenmemişse
- Error state tasarlanmamışsa
- Analytics/audit ihtiyacı değerlendirilmemişse
- Accessibility kontrolü yoksa
- Security/privacy etkisi incelenmemişse
- Feature flag/rollback yoksa
- Dokümantasyon güncellenmemişse

---

# 34. Sprint Planı ve Geliştirme Takvimi

## 34.1. Planlama varsayımı

Tahmini takvim:

- Deneyimli tek full-stack geliştirici: yaklaşık 12–16 hafta
- 1 mobil + 1 backend + yarı zamanlı UI/QA: yaklaşık 8–12 hafta
- Lisanslı gerçek ünlü özelliği: hukuki ve ticari süreç nedeniyle takvim dışı bağımlılık

Bu süreler tahminidir; tasarım onayları, mağaza incelemesi, OpenAI erişimi, ödeme hesabı ve lisans süreçleri süreyi değiştirebilir.

## 34.2. Ekip önerisi

Minimum:

```text
1 React Native/Expo geliştirici
1 Node.js/Express backend geliştirici
1 UI/UX tasarımcı, yarı zamanlı
1 QA, yarı zamanlı
1 ürün sahibi
1 hukuk/gizlilik danışmanı, ihtiyaç bazlı
```

Tek geliştiriciyle yapılabilir, ancak mobil, backend, AI eval ve mağaza süreçleri ardışık ilerleyeceği için süre uzar.

## 34.3. Sprint 0 – Ürün, tasarım ve güvenlik temeli

**Süre:** 1 hafta

Çıktılar:

- Retake AI çalışma adı ve marka kontrol listesi
- Hedef kullanıcı ve 18+ kararı
- MVP kapsamı
- Gerçek ünlülerin varsayılan kapalı olması
- Kurgusal karakter konseptleri
- 55 ekranın final wireframe listesi
- Siyah tema design token’ları
- API/DB mimari kararı
- Veri akış şeması
- Tehdit modeli
- Privacy/terms taslağı ihtiyaç listesi
- Jira/GitHub project setup

Kabul:

- Kapsam yazılı onaylanmış
- MVP dışı maddeler ayrılmış
- Hassas kişi/public figure yaklaşımı onaylanmış

## 34.4. Sprint 1 – Monorepo, temel backend ve auth

**Süre:** 1–2 hafta

Backend:

- pnpm monorepo
- Express bootstrap
- Env validation
- PostgreSQL + Prisma
- Redis bağlantısı
- Pino + request ID
- Register/login/refresh/logout
- Email verify/reset password
- Session list/revoke
- OpenAPI

Mobil:

- Expo Router
- Theme/tokens
- Splash/onboarding
- Login/register/forgot/reset
- SecureStore auth
- TanStack Query/Zustand
- API error handling

Test:

- Auth unit/integration/E2E
- Refresh reuse detection

## 34.5. Sprint 2 – Ana sayfa, katalog ve asset upload

**Süre:** 1–2 hafta

Backend:

- Scene/filter/category katalog
- Asset model
- R2 adapter
- Signed upload/download
- Upload complete
- Sharp normalization
- EXIF temizleme
- Asset quality check

Mobil:

- Ana sayfa
- Explore/search
- Filtre galerisi
- Fotoğraf seç/kamera
- Crop/rotate
- Upload progress
- Kaynak fotoğraf kalite uyarıları

Admin:

- Basit katalog CRUD başlangıcı

## 34.6. Sprint 3 – Local filtreler ve create wizard

**Süre:** 1 hafta

Mobil:

- Local filtre preview
- Intensity slider
- Before/after
- Oluştur adımları
- Sahne seçimi
- Kompozisyon
- Oran/kalite/output sayısı
- Quote özeti

Backend:

- Filter recipe catalog
- Quote service
- Credit wallet temel modeli
- Feature flags

## 34.7. Sprint 4 – OpenAI generation pipeline

**Süre:** 2 hafta

Backend/worker:

- OpenAI provider
- Moderation provider
- Prompt intent/compile
- BullMQ
- Generation states
- Credit reserve/capture/release
- Output processing
- R2 output upload
- Polling endpoint
- Retry/failure normalization
- AI etiketi

Mobil:

- Generation progress
- Background task UX
- Completed/failed/blocked ekranları
- Result gallery

Test:

- Fake provider E2E
- Sınırlı staging real OpenAI test

## 34.8. Sprint 5 – Fan Moment ve hak motoru

**Süre:** 1–2 hafta

- Featured person data model
- Kurgusal karakter seti
- Rights engine
- Katalog seçme ekranı
- Serbest ünlü adı detection/fallback
- Public figure global kill switch
- Watermark/disclosure
- Hazır fan sahneleri
- Lisans admin alanı, gerçek kişi kapalı
- Red-team testleri

Messi/Ronaldo/Kim Kardashian/Atatürk seed kayıtları yalnızca `PENDING_REVIEW` ve görünmez olarak eklenebilir.

## 34.9. Sprint 6 – AI sohbet revizyonu ve projeler

**Süre:** 1 hafta

- Project/version history
- Revision endpoint
- Responses API veya image edit continuation
- Chat UI
- Quick suggestion chips
- Önce/sonra
- HD finalize
- Favoriler
- Projelerim
- Proje silme

## 34.10. Sprint 7 – Satın alma ve bildirim

**Süre:** 1–2 hafta

- Store products
- RevenueCat/native IAP
- Server verification
- Webhooks
- Purchase ledger
- Restore purchases
- Subscription entitlement
- Expo push
- Notification center
- Deep links
- Purchase error/reconciliation

## 34.11. Sprint 8 – Admin, moderasyon ve destek

**Süre:** 1–2 hafta

- Admin auth + MFA
- Dashboard
- User management
- Catalog/filter/prompt management
- Generation operations
- Moderation queue
- Abuse reports
- Billing/ledger view
- Support tickets
- Audit log
- Kill switches

## 34.12. Sprint 9 – Gizlilik, güvenlik ve silme

**Süre:** 1 hafta

- Account deletion
- Data export
- Retention jobs
- Share revoke
- Privacy settings
- Log redaction review
- Security headers/rate limits
- Backup/restore test
- Pen-test fixes

## 34.13. Sprint 10 – Store hazırlık ve yayın

**Süre:** 1–2 hafta

- Mobile performance
- Accessibility
- Device matrix
- App icons/splash/screenshots
- Privacy labels/data safety
- Terms/privacy pages
- Store products
- Review account
- Crash monitoring
- Production deployment
- Smoke tests
- Gradual rollout

## 34.14. Milestone’lar

```text
M1 – Login çalışan mobil iskelet
M2 – Fotoğraf yükleme ve filtreler
M3 – İlk uçtan uca OpenAI generation
M4 – Fan Moment kurgusal karakter
M5 – Revizyon ve proje geçmişi
M6 – IAP ve push
M7 – Admin/moderasyon
M8 – Store release candidate
```

## 34.15. İlk MVP’de kesin bulunması gerekenler

- E-posta/Google/Apple login
- Fotoğraf upload
- 8–12 sahne
- 8–12 filtre
- Arka plan değiştirme
- Full scene
- En az 3 kurgusal fan karakteri
- 2 preview
- Sonuç/revision
- Kredi sistemi
- IAP
- Projelerim
- Profil/gizlilik/silme
- Moderasyon
- Admin temel operasyon

## 34.16. MVP dışı tutulması önerilenler

- Video generation
- Gerçek zamanlı kamera AI
- Sosyal feed
- Kullanıcılar arası mesajlaşma
- Açık marketplace
- Serbest internetten kişi import
- Kullanıcıya özel model eğitimi
- Takım/marka logo lisansları
- Gerçek ünlü kataloğunu lisans olmadan açma
- Web editör
- Kurumsal white-label

---

# 35. MVP Kabul Kriterleri

## 35.1. Authentication

- Kullanıcı kayıt olabilir.
- E-postasını doğrulayabilir.
- Giriş/çıkış yapabilir.
- Refresh rotation çalışır.
- Eski refresh token reuse tüm token family’yi kapatır.
- Google/Apple giriş uygun platformlarda çalışır.
- Şifre sıfırlama user enumeration yapmaz.
- Hesap silme yolu uygulama içinde görünür.

## 35.2. Upload

- JPEG/PNG/WebP kabul edilir.
- Maksimum boyut uygulanır.
- Bozuk/yanlış MIME reddedilir.
- EXIF temizlenir.
- Kullanıcı yalnızca kendi asset’ine erişir.
- Upload progress ve retry vardır.
- Fotoğraf kalite uyarısı anlaşılırdır.

## 35.3. Filtreler

- Filtre listesi kategoriyle gösterilir.
- Local filtre anlık önizlenir.
- AI filtre kredi bilgisini gösterir.
- Intensity değiştirilebilir.
- Before/after çalışır.
- Seçim proje draft’ında korunur.

## 35.4. Generation

- Quote doğru hesaplanır.
- Kredi atomik reserve edilir.
- Job kuyruğa girer.
- Uygulama kapanıp açıldığında durum geri gelir.
- Başarılı output depolanır.
- Başarısız işte kredi release/refund olur.
- Duplicate request duplicate maliyet üretmez.
- Kullanıcı yalnızca kendi generation’ını görür.

## 35.5. OpenAI

- API anahtarı mobil bundle’da bulunmaz.
- Provider timeout/retry doğru çalışır.
- Prompt şeması validasyonlu.
- Moderasyon input/output uygulanır.
- Model/prompt sürümü kaydedilir.
- Maliyet tahmini kaydedilir.
- OpenAI reddi güvenli kullanıcı mesajına dönüşür.

## 35.6. Fan Moment

- Yalnızca aktif kurgusal/lisanslı kişi seçilebilir.
- `PENDING_REVIEW` kişi API’den dönmez.
- Lisans sona ererse yeni generation engellenir.
- Serbest ünlü adı katalog bypass yapamaz.
- AI disclosure sonuç ve share sayfasında vardır.
- Endorsement/news/evidence istekleri engellenir.

## 35.7. Revizyon

- Önceki output kaybolmaz.
- Revizyon yeni generation kaydıdır.
- Kullanıcı talimatı structured değişikliğe çevrilir.
- Revizyon maliyeti önceden gösterilir.
- Kullanıcı önceki versiyona dönebilir.

## 35.8. Billing

- Store ürünleri localized fiyat gösterir.
- Server-side doğrulama vardır.
- Transaction ID tekrar kullanılamaz.
- Satın alma sonrası bakiye ledger ile uyumludur.
- Restore purchases çalışır.
- Refund/chargeback işlenir.
- Purchased credit yanlışlıkla expire olmaz.

## 35.9. Bildirim

- Generation tamamlanınca push gönderilir.
- Push kapalıysa in-app notification vardır.
- Deep link doğru projeyi açar.
- Başka kullanıcı ID’siyle veri açılamaz.
- Hassas prompt kilit ekranına yazılmaz.

## 35.10. Admin

- MFA zorunlu.
- RBAC çalışır.
- Her hassas işlem audit edilir.
- Generation/job aranabilir.
- Kredi düzeltmesi gerekçelidir.
- Public figure kill switch çalışır.
- Moderasyon raporu incelenebilir.

## 35.11. Gizlilik

- Kullanıcı kaynak fotoğrafını silebilir.
- Share link’i iptal edebilir.
- Veri export talep edebilir.
- Hesap silme job’ı storage dahil tamamlanır.
- Retention job’ları testlidir.
- Loglarda secret/signed URL/raw yüz yoktur.

## 35.12. Performans ve stabilite

- App kritik ekranlarda crash olmaz.
- Düşük ağda upload retry çalışır.
- API p95 hedefe yakındır.
- Queue stalled job recovery vardır.
- Backup restore testi yapılmıştır.
- Global AI kill switch test edilmiştir.

---

# 36. Riskler ve Alınacak Önlemler

| Risk | Etki | Olasılık | Önlem |
|---|---|---:|---|
| Kullanıcı yüzünün bozulması | Yüksek | Orta | İyi kaynak kalite kontrolü, background mode, çoklu referans, revision/refund |
| Ünlü hak ihlali | Çok yüksek | Orta | Varsayılan kapalı, katalog whitelist, lisans kaydı, hukuk onayı |
| Aldatıcı gerçek fotoğraf algısı | Yüksek | Yüksek | Visible disclosure, metadata, share açıklaması, yasak kullanım |
| OpenAI isteğinin reddi | Orta | Orta | Güvenli alternatif, kurgusal karakter, kredi release |
| OpenAI fiyat artışı | Yüksek | Orta | Kredi abstraction, pricing version, bütçe alarmı, config |
| Provider kesintisi | Yüksek | Orta | Queue, retry, kullanıcı mesajı, refund, status page |
| API anahtarı sızıntısı | Çok yüksek | Düşük/Orta | Worker-only secret, rotation, spend limits, scan |
| Storage public misconfig | Çok yüksek | Düşük | Private bucket, policy test, signed URL, monitoring |
| Başkasının yüzüyle kötüye kullanım | Çok yüksek | Orta | Consent, abuse detection, report/takedown, moderation |
| Çocuk güvenliği | Çok yüksek | Orta | 18+ launch, strict block/review, no risky scenes |
| Satın alma duplicate/receipt replay | Yüksek | Orta | Server verification, unique transaction ID, idempotency |
| Kredi tutarsızlığı | Yüksek | Düşük/Orta | Immutable ledger, transactions, reconciliation |
| Queue duplicate job | Orta | Orta | Deterministic job ID, state check, outbox |
| Mobil mağaza reddi | Yüksek | Orta | IAP, account deletion, UGC moderation, review notes |
| Marka/alan adı çakışması | Orta/Yüksek | Orta | Marka ve domain araştırması, geçici working name |
| Kullanıcı silme talebinin eksik kalması | Çok yüksek | Düşük/Orta | Deletion manifest, idempotent jobs, audit |
| Loglarda kişisel veri | Yüksek | Orta | Redaction, schema, log review, short retention |
| Prompt güncellemesinin kaliteyi bozması | Orta | Orta | Versioning, golden eval, canary, rollback |
| Admin hesabı ele geçirilmesi | Çok yüksek | Düşük | MFA, RBAC, step-up, audit, IP anomaly |
| Gerçek ünlü seçeneğinin hukuken gecikmesi | Orta | Yüksek | Kurgusal karakterlerle MVP, lisansı ayrı milestone |
| Video özelliğinin maliyet/karmaşıklığı | Yüksek | Yüksek | MVP dışı, ayrı fizibilite |

## 36.1. En kritik üç risk

### 1. Kişi hakları

Ünlü özelliği teknik değil, öncelikle hak ve ürün güvenliği problemidir. Lisans yoksa gerçek kişi seçeneği açılmamalıdır.

### 2. Yüz kalitesi

“Yüz hiç değişmez” şeklinde garanti verilmemelidir. Background replacement ile full scene ayrı anlatılmalı ve kullanıcıya retake/revision imkânı sunulmalıdır.

### 3. Maliyet suistimali

OpenAI çağrıları backend, kredi, rate limit, queue ve global bütçe kontrollerinden geçmeden başlatılmamalıdır.

## 36.2. Go/no-go kapıları

Production’a geçişten önce:

```text
[ ] OpenAI image generation staging’de stabil
[ ] Moderasyon test seti geçti
[ ] Gerçek ünlüler kapalı veya lisanslı
[ ] Kredi ledger reconciliation %100
[ ] Account deletion storage dahil çalışıyor
[ ] Store IAP doğrulaması çalışıyor
[ ] Security review tamamlandı
[ ] Backup restore edildi
[ ] Privacy/terms yayınlandı
[ ] Kill switch test edildi
```

---

# 37. Sonraki Sürümler

## 37.1. V1.1

- Daha fazla local filtre
- Batch favorite/download
- Gelişmiş crop
- Daha iyi revision suggestions
- Prompt-based scene search
- Pro öncelikli queue
- Referans fotoğraf yönetimi
- Türkçe/İngilizce tam lokalizasyon

## 37.2. V1.2

- Kullanıcıya ait tutarlı avatar profili, açık izinle
- Çoklu kişi/grup fotoğrafı
- Couple/family templates, güçlü izin kurallarıyla
- Gelişmiş background mask editor
- Layer-based manual edit
- AI lighting transfer
- Saç/kıyafet değişimi için ayrı kontrollü modlar

## 37.3. V2 – Video

Ayrı fizibilite gerektirir:

- Fotoğraftan kısa video
- Kameraya bakma/gülümseme
- Sahne içinde parallax
- Müzik ve template
- Video watermark/disclosure
- Çok daha yüksek maliyet ve queue süresi
- Yeni moderasyon ve kişi hakları riski

Video, fotoğraf MVP’sine karıştırılmamalıdır.

## 37.4. Etkinlik modu

- QR ile fotoğraf yükleme
- Marka/lisanslı etkinlik şablonu
- Kiosk/tablet
- Toplu generation
- Etkinlik galerisi
- Otomatik silme süresi
- Kurumsal lisans

## 37.5. White-label/B2B

- Tenant yapısı
- Kurumsal katalog
- Marka renkleri
- Kendi lisanslı yüz/karakter seti
- Aylık kota
- Yönetici raporu
- SSO
- Bölgesel storage
- SLA

MVP veri modeli gelecekte tenant eklenmesini engellemeyecek şekilde tasarlanabilir; fakat erken multi-tenant karmaşıklığına girilmemelidir.

## 37.6. Creator marketplace

Yüksek moderasyon ve fikrî mülkiyet riski taşır. İleride:

- Onaylı sahne tasarımcıları
- Prompt/filtre paketleri
- Revenue share
- Hak belgesi
- Moderasyon
- Takedown

ile değerlendirilebilir.

## 37.7. Kişisel stil profili

Kullanıcı açık izin verirse:

- Beğendiği filtreler
- Tercih ettiği ışık
- Favori kompozisyon
- Sık kullandığı oran

gibi düşük riskli tercihler saklanabilir. Yüz embedding veya kişisel model ayrı izin ve risk değerlendirmesi olmadan yapılmaz.

## 37.8. Content provenance doğrulama sayfası

Generation ID ile:

```text
Bu içerik Retake AI ile oluşturuldu mu?
Üretim tarihi
AI düzenleme türü
Disclosure durumu
Share link geçerliliği
```

bilgisi döndürülebilir. Kullanıcı kimliği veya prompt gösterilmez.

---

# 38. Başlangıç Kontrol Listesi

## 38.1. Ürün

- [ ] Çalışma adı kesinleştirildi
- [ ] Marka/domain ön araştırması yapıldı
- [ ] 18+ kararı alındı
- [ ] MVP kapsamı yazılı onaylandı
- [ ] Gerçek ünlüler başlangıçta kapalı
- [ ] İlk 3–5 kurgusal karakter tanımlandı
- [ ] İlk 8–12 sahne seçildi
- [ ] İlk 8–12 filtre seçildi
- [ ] Kredi planı taslaklandı

## 38.2. Tasarım

- [ ] Siyah tema token’ları oluşturuldu
- [ ] Logo/splash hazırlandı
- [ ] Onboarding ekranları
- [ ] Login/register/forgot password
- [ ] Ana sayfa
- [ ] Filtre galerisi
- [ ] Create wizard
- [ ] Featured person seçimi
- [ ] Generation progress
- [ ] Result/revision
- [ ] Projects/favorites
- [ ] Credits/purchase
- [ ] Profile/settings/privacy
- [ ] Empty/loading/error/blocked states
- [ ] Accessibility review

## 38.3. Mobil teknik

- [ ] Expo project oluşturuldu
- [ ] Expo Router kuruldu
- [ ] Dev build profili
- [ ] TanStack Query
- [ ] Zustand
- [ ] SecureStore
- [ ] ImagePicker/Camera
- [ ] ImageManipulator
- [ ] Reanimated/Gesture Handler
- [ ] Notifications
- [ ] Deep links
- [ ] Sentry
- [ ] EAS project

## 38.4. Backend teknik

- [ ] pnpm monorepo
- [ ] Express + TypeScript
- [ ] Zod env/config
- [ ] Prisma/PostgreSQL
- [ ] Redis/BullMQ
- [ ] Pino/request ID
- [ ] OpenAPI
- [ ] Auth/session rotation
- [ ] Asset/storage adapter
- [ ] Cloudflare R2 bucket’ları
- [ ] Generation outbox/queue
- [ ] OpenAI provider
- [ ] Moderation provider
- [ ] Prompt compiler
- [ ] Credit ledger
- [ ] Push provider
- [ ] Purchase verifier
- [ ] Retention/deletion jobs

## 38.5. OpenAI

- [ ] Ayrı dev/staging/prod project/key
- [ ] Billing/usage limit
- [ ] Image model erişimi
- [ ] Moderation erişimi
- [ ] API key yalnızca worker’da
- [ ] Provider timeout/retry
- [ ] Prompt versioning
- [ ] Mock provider
- [ ] Golden eval set
- [ ] Safety red-team set
- [ ] Günlük bütçe alarmı

## 38.6. Storage

- [ ] Private bucket
- [ ] Public katalog bucket veya CDN stratejisi
- [ ] CORS policy
- [ ] Signed upload
- [ ] Signed download
- [ ] Lifecycle rules
- [ ] Object key policy
- [ ] Checksum
- [ ] Orphan cleanup
- [ ] Account deletion test

## 38.7. Featured person ve haklar

- [ ] Person types
- [ ] Rights statuses
- [ ] Hak motoru
- [ ] Lisans belge deposu
- [ ] Ülke/sahne/kullanım kısıtları
- [ ] Lisans expiry job
- [ ] AI disclosure
- [ ] Public figure kill switch
- [ ] Messi/Ronaldo/Kim Kardashian/Atatürk kapalı seed
- [ ] Hukuk review süreci

## 38.8. Billing

- [ ] Store product ID’leri
- [ ] Sandbox hesapları
- [ ] RevenueCat/native SDK
- [ ] Backend transaction verification
- [ ] Webhook signature
- [ ] Receipt replay test
- [ ] Credit reserve/capture/release
- [ ] Refund/chargeback
- [ ] Restore purchases
- [ ] Ledger reconciliation

## 38.9. Güvenlik

- [ ] Threat model
- [ ] Rate limits
- [ ] Argon2id
- [ ] JWT audience/issuer
- [ ] Refresh reuse detection
- [ ] Secret scanning
- [ ] Log redaction
- [ ] Upload magic byte check
- [ ] SSRF kapalı
- [ ] Admin MFA/RBAC
- [ ] Signed URL test
- [ ] Security headers
- [ ] Dependency/container scan
- [ ] Incident runbook

## 38.10. Gizlilik ve mağaza

- [ ] Gizlilik politikası
- [ ] Kullanım koşulları
- [ ] AI disclosure metni
- [ ] Fotoğraf kullanım hakkı onayı
- [ ] Veri saklama/imha politikası
- [ ] Account deletion
- [ ] Data export
- [ ] App Store privacy labels
- [ ] Google Play Data Safety
- [ ] Kamera/fotoğraf izin metinleri
- [ ] UGC report/block akışı
- [ ] Review test hesabı

## 38.11. Operasyon

- [ ] Staging
- [ ] Production
- [ ] CI/CD
- [ ] Health checks
- [ ] Monitoring dashboard
- [ ] Alerting
- [ ] Status page
- [ ] Backup
- [ ] Restore test
- [ ] Prompt rollback
- [ ] Model rollback
- [ ] Global kill switch
- [ ] Support process

---

# Sonuç ve Önerilen İlk Uygulama Sırası

Retake AI için doğru başlangıç, modeli eğitmek veya ünlü fotoğraflarını toplamak değildir. Doğru sıra şudur:

```text
1. Expo + Express monorepo ve design system
2. PostgreSQL/Prisma + güvenli mobil auth
3. Cloudflare R2 upload ve fotoğraf kalite kontrolü
4. Sahne/filtre katalogları ve create wizard
5. OpenAI provider + moderasyon + BullMQ worker
6. Kredi reserve/capture/release
7. Sonuç, revizyon ve proje geçmişi
8. Kurgusal Fan Moment karakterleri
9. IAP + push + admin/moderasyon
10. Gizlilik, silme, mağaza testleri ve kontrollü yayın
```

Gerçek ünlüler için ayrı yol:

```text
Hak sahibi/lisans süreci
→ onaylı referans seti
→ izin verilen sahne ve kullanım matrisi
→ hukuk/platform/OpenAI incelemesi
→ insan moderasyonlu kapalı beta
→ kontrollü yayın
```

Bu mimariyle:

- Mobil uygulama Expo React Native üzerinde çalışır.
- Backend Node.js Express.js olur.
- PostgreSQL ve Prisma kalıcı veriyi yönetir.
- Redis ve BullMQ uzun AI işlerini güvenli biçimde yürütür.
- AWS kullanılmaz.
- Cloudflare R2 veya aynı adapter’ı kullanan başka bir AWS dışı depolama kullanılır.
- OpenAI anahtarı yalnızca sunucuda tutulur.
- Görsel üretme ve sohbetle düzenleme OpenAI API üzerinden yapılır.
- İlk sürümde özel model eğitilmez.
- Kullanıcı yüzleri eğitim verisi olarak toplanmaz.
- Ünlü/tarihî kişi özelliği hak kontrolü ve zorunlu AI açıklaması olmadan açılmaz.
- Maliyet kredi, kuyruk, rate limit ve bütçe sınırıyla kontrol edilir.
- Kullanıcı hesabını, kaynak fotoğraflarını, projelerini ve paylaşım linklerini yönetebilir.

Bu belge, Retake AI’nin ürün, tasarım, mobil, backend, AI, güvenlik, ödeme, moderasyon, deployment ve yayın süreçleri için ana teknik plan olarak kullanılabilir.

