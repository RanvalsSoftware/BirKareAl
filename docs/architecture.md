# BirKare AI mimarisi

```text
Expo Mobile ──HTTPS──> Express API ──> PostgreSQL
     │                       │
     │ signed PUT URL         ├──> Redis / BullMQ ──> Worker
     ▼                       │                         │
Private Google Cloud Storage / Local adapter <────────┴──> OpenAI Images / Moderation
                                                       └──> Push / e-mail adapters
```

API istekleri hızlı doğrulama, yetkilendirme ve iş planlaması ile sınırlıdır. Görsel üretimi route içerisinde bekletilmez. Worker, asset hazırlama, içerik/rights kontrolü, prompt derleme, provider çağrısı, output moderasyonu ve kredi finalizasyonunu yürütür.

Geliştirme için fake provider ve local storage mevcuttur. Production config, local/memory seçeneklerini reddeder ve server-side OpenAI anahtarı gerektirir.

GCS kullanılırken API, yetkilendirme sonrasında kısa ömürlü signed upload URL üretir; mobil uygulama fotoğraf bytes'ını doğrudan GCS'ye gönderir. Böylece normal GCS upload trafiği API belleğine alınmaz. Kaynak fotoğraf limiti 15 MiB, AI çıktısı üst sınırı 30 MiB'dir. Upload tamamlanınca API, kaynağı boyut/MIME/imza/hash kontrolleri için en fazla 15 MiB olarak okuyup doğrular. Worker eşzamanlılığı `GENERATION_WORKER_CONCURRENCY` ile sınırlanır.

Storage adapter'ındaki `putObject`, Buffer yanında Node.js Readable stream de kabul eder. Stream ve 5 MiB üzerindeki Buffer yüklemeleri GCS resumable upload ve CRC32C doğrulaması kullanır; stream byte sınırı verilirse aktarım sırasında uygulanır.
