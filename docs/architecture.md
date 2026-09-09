# BirKare AI mimarisi

```text
Expo Mobile ──HTTPS──> Express API ──> PostgreSQL
     │                       │
     │ signed upload          ├──> Redis / BullMQ ──> Worker
     ▼                       │                         │
Private R2 / Local adapter <--┴───────────────────────┼──> OpenAI Images / Moderation
                                                       └──> Push / e-mail adapters
```

API istekleri hızlı doğrulama, yetkilendirme ve iş planlaması ile sınırlıdır. Görsel üretimi route içerisinde bekletilmez. Worker, asset hazırlama, içerik/rights kontrolü, prompt derleme, provider çağrısı, output moderasyonu ve kredi finalizasyonunu yürütür.

Geliştirme için fake provider ve local storage mevcuttur. Production config, local/memory seçeneklerini reddeder ve server-side OpenAI anahtarı gerektirir.
