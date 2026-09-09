# BirKare AI — Açılış ve Onboarding Ekran Planı

## 1. Hareketli Splash

Merkezdeki fotoğraf nefes alır gibi büyür ve küçülür. Dört çevre kartı farklı süre ve yönlerde hareket eder. Ekran yaklaşık 4,6 saniye sonra otomatik olarak galeri seçimine geçer; kullanıcı ekrana dokunarak daha erken ilerleyebilir.

Animasyon ilkesi:

- Merkez kart: `scale 1 → 1.045 → 1`
- Merkez kart: hafif dikey salınım
- Çevre kartları: farklı `translateX`, `translateY` ve dönüş değerleri
- Animasyonlar birbirinden farklı gecikmelerle başlar
- Kart hareketleri hızlı değil, premium ve sakin görünür

## 2. Fotoğraf Seçimi

Kullanıcı üç yoldan biriyle ilerler:

1. Sistem galerisini açar.
2. Kamerayla yeni bir fotoğraf çeker.
3. Beş demo görselinden birini seçer.

Seçim tamamlanmadan devam butonu etkinleşmez.

## 3. Fotoğrafını Sahneye Taşı

Seçilen kullanıcı fotoğrafı sol kartta gösterilir. Sağ kartta örnek sinematik sonuç vardır. Ekran, yüz odağı, sahne seçimi ve AI üretimi kavramlarını kısa olarak anlatır.

## 4. Kategori Seçimi

Beş kategori yatay kartlar halinde sunulur:

- Fan Selfie
- Arka Plan
- Sanat Stili
- Profesyonel Portre
- Sinematik

Seçilen kart sarı çerçeve ve onay işareti kazanır.

## 5. Filtre Seçimi

Üstte büyük bir 4:5 önizleme bulunur. Altında filtre grupları ve yatay filtre kartları vardır. Kullanıcı seçim yaptıkça büyük önizleme değişir.

Filtre grupları:

- Tümü
- Doğal
- Sanatsal
- Sinematik
- Profesyonel

## 6. Fan Moment

Kurgusal futbol yıldızıyla hazırlanmış örnek bir fan sahnesi gösterilir. Gerçek buluşma, sponsorluk veya tarihî olay izlenimi oluşturmaması gerektiği açık biçimde belirtilir.

## 7. Güvenlik Onayları

Üç onayın tamamı zorunludur:

- Fotoğraf kullanım hakkı
- AI içeriği bildirimi
- 18 yaş onayı

Tamamlandığında onboarding durumu yerel depolamaya yazılır ve kullanıcı giriş ekranına yönlendirilir.
