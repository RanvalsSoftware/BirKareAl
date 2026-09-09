# Express.js Backend Bağlantı Notu

Bu Expo paketi yalnızca mobil arayüz ve yerel onboarding durumunu içerir. AI üretimi için mobil uygulama OpenAI'ye doğrudan bağlanmamalıdır.

## Önerilen oluşturma isteği

```http
POST /api/v1/generations
Authorization: Bearer <access-token>
Content-Type: multipart/form-data
```

```text
photo: File
categoryId: fan-selfie | background | art-filter | professional | cinematic
filterId: natural | cinematic | pop-art | ...
sceneId: string
aspectRatio: 4:5
consentAccepted: true
```

## Backend sırası

1. JWT doğrulaması
2. Dosya türü ve boyut kontrolü
3. Kullanıcı rızası kontrolü
4. Metin/görsel moderasyonu
5. Kredi rezervasyonu
6. İşin BullMQ kuyruğuna eklenmesi
7. OpenAI görsel üretimi
8. Sonucun depolanması
9. Kredi kesinleştirme veya iade
10. Mobil uygulamaya SSE/WebSocket/polling ile durum dönülmesi

## Önerilen durumlar

```text
VALIDATING
MODERATING
QUEUED
PROCESSING
QUALITY_CHECK
COMPLETED
FAILED
BLOCKED
```

## Mobil tarafta eklenecekler

- `src/services/api.ts`
- `src/services/generations.ts`
- yükleme ilerlemesi
- üretim durum ekranı
- başarısız işte yeniden deneme
- sonuç görseli ve revizyon sohbeti

OpenAI API anahtarı yalnızca Express sunucusunun environment variable alanında tutulmalıdır.
