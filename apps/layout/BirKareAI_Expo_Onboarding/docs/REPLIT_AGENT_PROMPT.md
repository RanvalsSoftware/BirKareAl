# Replit Agent Uygulama Talimatı

Aşağıdaki talimatı Replit Agent içinde kullanabilirsiniz:

```text
Bu repodaki mevcut Expo Router + React Native + TypeScript yapısını koru.

Amaç:
BirKare AI mobil uygulamasının onboarding demosunu çalışır hale getir.

Zorunlu koşullar:
1. app dizinindeki Expo Router rota yapısını bozma.
2. Siyah arka plan ve #FFC400 sarı vurgu dilini koru.
3. assets/images klasöründeki tüm yerel görselleri kullan; internetten rastgele görsel çekme.
4. /app/(onboarding)/gallery ekranında expo-image-picker ile telefon galerisini aç.
5. Kullanıcının seçtiği fotoğrafı OnboardingContext içinde tut ve welcome, filters ve create ekranlarında göster.
6. Splash ekranındaki orta kart büyüyüp küçülsün; yan kartlar bağımsız olarak sağa, sola, yukarı ve aşağı hareket etsin.
7. Onboarding sırası splash → gallery → welcome → categories → filters → fan-moment → consent olsun.
8. Consent ekranındaki üç kutu işaretlenmeden devam butonu aktif olmasın.
9. Onboarding tamamlanma durumunu AsyncStorage ile sakla.
10. Profil ekranındaki yeniden başlat butonu AsyncStorage durumunu temizlesin.
11. Uygulama mobil ekranlarda kaymasın; küçük ekranlarda içerikler ScrollView ile erişilebilir olsun.
12. Expo SDK 57 paket sürümlerini keyfî biçimde değiştirme. Gerekirse npx expo install --fix çalıştır.
13. Mobil istemci içine OpenAI API anahtarı ekleme.
14. Gerçek ünlü benzerlikleri üretme; demo fan sahnelerini kurgusal karakter olarak tanımla.
15. Her değişiklikten sonra TypeScript hatalarını düzelt ve npm run typecheck çalıştır.

İlk olarak npm install çalıştır, ardından npx expo start --web ile önizlemeyi aç. Uygulama açılmazsa önce import yollarını, Expo Router rotalarını ve package.json sürüm uyumunu kontrol et.
```
