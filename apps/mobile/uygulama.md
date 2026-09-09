API, worker ve env bağlantısını bu projedeki gerçek compose düzenine göre açıklayacağım; özellikle hangisinin yayınlanması gerektiğini ve env’lerin image’a mı yoksa Portainer’a mı ait olduğunu netleştiriyorum.

Read 

Read 

Read , lines 1 to 115

Read 

Read 

Kısaca:

## API ne işe yarıyor?

`birkare-api` dışarıdan gelen istekleri karşılar:

- Mobil auth/login
- Fotoğraf upload
- Filtre ve üretim ayarları
- Kredi kontrolü
- AI üretimini kuyruğa ekleme
- Üretim durumunu ve sonucu döndürme
- `/health` ve `/ready`

Bu servis dışarıya açılır. Reverse proxy üzerinden genelde `https://api.domain.com` olarak yayınlanır.

## Worker ne işe yarıyor?

`birkare-worker` arka planda çalışan üretim servisidir:

- Redis kuyruğundaki işleri alır
- OpenAI görsel üretimini çağırır
- Moderasyon kontrolünü yapar
- Görseli R2’ye kaydeder
- Kredi tahsil/iade işlemlerini tamamlar
- Üretim durumunu `COMPLETED`, `FAILED` veya `BLOCKED` yapar

Worker’ın dışarıya port açmasına gerek yoktur ama **mutlaka çalışması gerekir**. Sadece API’yi çalıştırırsan üretim işleri kuyruğa girer fakat işlenmez.

Bu nedenle ikisinin de yayınlanması gerekir:

```text
API image:
ghcr.io/ranvals-software/birkare-api:2026.09.08-2

Worker image:
ghcr.io/ranvals-software/birkare-worker:2026.09.08-2
```

API dışarıdan erişilebilir olmalı, worker ise sadece Portainer’ın private Docker ağı içinde kalmalı.

## Env’ler nerede?

Şablon dosya:

`.env.production.example`

Yerel gerçek env dosyası:

`portainer.env`

Bu dosya repoya gönderilmemeli. Portainer’da Stack oluştururken **Environment variables** alanına girilmeli veya güvenli env dosyası olarak kullanılmalı.

Ana env grupları:

```text
IMAGE_TAG=2026.09.08-2
DATABASE_URL=Cloud SQL bağlantısı
REDIS_PASSWORD=Portainer Redis şifresi
JWT_ISSUER=https://api.domain.com
CORS_ORIGINS=https://uygulama-domaini.com
JWT_ACCESS_SECRET=...
PASSWORD_PEPPER=...
OPENAI_API_KEY=...
R2_ENDPOINT=...
R2_BUCKET=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
```

Ayrıca:

- `DATABASE_URL`: Cloud SQL bağlantısı
- `REDIS_PASSWORD`: Compose içindeki Redis için
- `OPENAI_API_KEY`: API ve worker’ın AI kullanımı için
- `R2_*`: görsellerin kalıcı saklanması için
- `JWT_*` ve `PASSWORD_PEPPER`: auth güvenliği için
- `CORS_ORIGINS`: izin verilen frontend adresleri için
- `DISABLE_ALL_GENERATION`: ilk kurulumda `true`, kontrollerden sonra `false`

Compose dosyası burada:

`docker-compose.production.yml`

Kullanım sırası:

```sh
docker compose --env-file portainer.env \
  -f docker-compose.production.yml \
  pull

docker compose --env-file portainer.env \
  -f docker-compose.production.yml \
  --profile tools run --rm migrate

docker compose --env-file portainer.env \
  -f docker-compose.production.yml \
  up -d
```

`migrate` sadece veritabanı tablolarını güncellemek için API image’ını tek seferlik kullanır. Kalıcı çalışan servisler ise `api`, `worker` ve `redis` olur.

Önemli: `.env` dosyasındaki local geliştirme değerleri Portainer’a aynen taşınmamalı. Cloud SQL, R2, HTTPS domaini ve production secret değerleri Portainer’da ayrıca girilmeli.