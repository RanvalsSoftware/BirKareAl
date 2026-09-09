# BirKare AI

BirKare AI, kullanıcının kendi fotoğrafını sahne, filtre ve özgün kurgusal karakterlerle birleştirebildiği iOS/Android odaklı bir AI fotoğraf stüdyosu MVP’sidir. Bu depo, mobil istemciyi ve server-side AI üretim altyapısını ayrı servisler halinde barındırır.

> Marka adı kullanıcı isteği doğrultusunda **BirKare AI**’dır. Referans tasarımdaki gerçek kişi örnekleri ürüne aktarılmamıştır: MVP kataloğunda yalnızca kurgusal, gerçek bir kişiye benzemeyen karakterler bulunur.

## Yapı

```text
apps/
  mobile/  Expo + React Native + TypeScript (iOS ve Android)
  api/     Express + TypeScript REST API
  worker/  BullMQ üretim worker’ı
packages/
  contracts/  Ortak Zod istek/yanıt sözleşmeleri
  database/   Prisma şeması ve repository katmanı
  ai/         Prompt, moderasyon ve OpenAI provider sınırı
  storage/    Local/R2 storage adapter’ları
  config/     Zod tabanlı environment doğrulaması
  logger/     Pino logger
  shared/     Ortak policy, enum ve response yardımcıları
```

Mobil uygulama; animasyonlu splash/onboarding, e-posta kimlik doğrulama ekranları, filtre kataloğu, sahne oluşturma sihirbazı, üretim ilerlemesi, sonuç/revizyon, projeler, kredi ve profil ekranlarını içerir. Formlar React Hook Form + Zod kullanır. Refresh token Expo SecureStore’da, erişim token’ı yalnızca bellekte tutulur.

## Yerelde çalıştırma

Node 22.13+ ve pnpm 10 gerekir. Corepack ile:

```bash
corepack enable
pnpm install
cp .env.example .env
cp apps/mobile/.env.example apps/mobile/.env
pnpm dev:api
```

Başka bir terminalde:

```bash
pnpm dev:mobile
```

Expo menüsünden iOS Simulator veya Android Emulator’ı açabilirsiniz. Android emülatörde API varsayılanı `http://10.0.2.2:4000`’dır; iOS Simulator `http://localhost:4000` kullanır. Fiziksel cihazda `EXPO_PUBLIC_API_BASE_URL` için bilgisayarınızın yerel ağ IP adresini kullanın; cihazdaki `localhost` bilgisayarınıza işaret etmez.

Pixel emülatörü hazır olmadan Expo Go kurulumunu başlatmayın. Bu depodaki AVD adı `Pixel_6_Pro`’dur:

```bash
/Users/foxy/Library/Android/sdk/emulator/emulator @Pixel_6_Pro -no-snapshot-load
adb -s emulator-5554 wait-for-device
adb -s emulator-5554 reverse tcp:8081 tcp:8081
adb -s emulator-5554 reverse tcp:4000 tcp:4000
```

Geliştirme varsayılanı, gerçek bir OpenAI çağrısı yapmayan local/memory provider’dır. Bu sayede ekranlar ve yaratım akışı gizli anahtar olmadan test edilebilir.

### Docker ile altyapı

```bash
cp .env.example .env
docker compose up --build -d
curl http://localhost:4000/ready
```

Bu komut PostgreSQL, Redis, Mailpit, API ve ayrı worker başlatır. `migrate` servisi API/worker’dan önce Prisma migration’larını otomatik uygular. Servis durumunu ve logları şu komutlarla izleyebilirsiniz:

```bash
docker compose ps
docker compose logs -f api worker
```

## Kalite kontrolleri

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
```

## Güvenlik sınırları

- `OPENAI_API_KEY` yalnızca API/worker environment’ında tutulur; mobil `EXPO_PUBLIC_*` değişkenlerine asla eklenmez.
- Kayıt/giriş doğrulaması Zod ile yapılır; şifreler Argon2id, refresh tokenlar hash + rotation yaklaşımıyla ele alınır.
- Üretim maliyeti/işi API yerine queue üzerinden yürür; worker modere eder, prompt derler ve çıktıyı saklar.
- Gerçek, kamusal veya siyasi kişiler başlangıçta kapalıdır. Katalog yalnızca rights engine’in seçilebilir olarak işaretlediği kurgusal/lisanslı kişileri döndürebilir.
- Production ortamında memory DB, local storage, dev auth ve inline worker geçersizdir; PostgreSQL, Redis/BullMQ ve private R2 zorunlu kılınır.

## Gerçek entegrasyonlar için gerekli environment’lar

`.env.example` tüm değişken adlarını gösterir. Staging/production’da ayrı OpenAI, R2, PostgreSQL, Redis, JWT ve e-posta/bildirim kimlik bilgileri tanımlanmalıdır. Apple/Google giriş ve mağaza satın alma akışları ayrıca ilgili uygulama kimlikleri ve sunucu tarafı receipt doğrulaması ister.
