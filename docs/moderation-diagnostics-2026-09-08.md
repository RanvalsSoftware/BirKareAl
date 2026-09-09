# %65 civarında duran üretim — 8 Eylül 2026

> Bu belge sabah incelenen ilk ret için tutulmuş tarihsel kayıttır. Daha sonraki çıktı retleri, ayrıca saptanan geçersiz anahtar, yeni anahtarla başarılı canlı test ve cuma karşılaştırması için [güncel incelemeye](friday-generation-comparison-2026-09-08.md) bakın. Aşağıdaki “son deneme” ve test sınırları bu ilk inceleme anını anlatır.

## Kesinleşen neden

8 Eylül 2026 **11:28 Türkiye saati** ile yapılan son denemede fotoğraf yükleme tamamlandı. Üretim başladıktan yaklaşık 16 saniye sonra OpenAI Images hizmeti HTTP 400, `moderation_blocked`, `image_generation_user_error` döndürdü. Uygulamadaki %65, AI üretim aşamasının sabit ilerleme işaretidir; tamamlanma oranının ölçümü değildir.

Bu bir yükleme hatası, sonsuz animasyon veya eksik API anahtarı değil; görsel sağlayıcısının güvenlik reddidir. İş `BLOCKED` olarak sonlanmış, **1 kredi iade edilmiş**, **0 kredi tahsil edilmiştir**.

Seçimler: Doğal denge 45 + leke düzeltme 65. Diğer güzellik katmanları ve makyaj kapalı; ek kullanıcı açıklaması veya cinsiyet dönüşümü yok. Bu meta bilgiler tek başına kaynak görselin ya da sonucun güvenlik bakımından uygun/uygunsuz olduğunu kanıtlamaz. Sağlayıcının ayrıntılı kategori/aşama bilgisi önceki hata kaydında bulunmadığından bunu “kesin yanlış pozitif” olarak nitelemiyoruz.

## Yapılan iyileştirmeler

- Ücretli görsel oluşturma çağrısından önce artık **orijinal fotoğraf + kullanıcı açıklaması** birlikte moderasyona gönderilir. Ön kontrol engeli `INPUT_MODERATION_BLOCKED` olarak erken ve açık biçimde gösterilir; ücretli render çağrılmaz ve rezervasyon iade edilir.
- Güvenlik servisi erişilemiyorsa veya geçerli sonuç döndürmüyorsa üretim başlatılmaz. Bu durum kullanıcıya içerik suçu gibi değil, `MODERATION_UNAVAILABLE` hizmet hatası olarak bildirilir.
- OpenAI Images'ın kendi `moderation: auto` koruması açık kalır. Ön moderasyonun geçmesi, görüntü üretiminin güvenlik filtresinden mutlaka geçeceği anlamına gelmez. Sonraki bir reddi yok sayan otomatik tekrar veya prompt kaçırma yolu eklenmedi.
- Sağlayıcı gönderirse yalnızca izinli `input/output/unknown` aşaması ve kaba güvenlik kategorileri kaydedilir. Ham hata mesajı, fotoğraf, kullanıcı promptu, token veya özel URL kaydedilmez. Aşama bilinmiyorsa mesajda ayrıntılı nedenin bildirilmediği açıkça söylenir.
- İşlem bittiğinde mobil ekran sunucunun gerçek iade miktarını gösterir, kredi önbelleğini günceller ve **Fotoğrafı değiştir / Düzenleme ayarlarına dön / Projelerime dön** seçenekleri sunar. Bu düğmeler kendiliğinden yeni üretim göndermez.
- Ön moderasyon sırasında kullanıcının iptal ettiği işin sonraki ücretli üretime geçmesi engellendi.

Bu uygulama, OpenAI'nin [çok modlu moderasyon kılavuzuna](https://developers.openai.com/api/docs/guides/moderation) ve [görüntü üretiminde güvenlik reddi/hata işleme açıklamasına](https://developers.openai.com/api/docs/guides/image-generation) göre yapıldı. Gerçek güvenlik reddini aşmak için güvenlik seviyesi düşürülmedi.

## Doğrulama sınırı

Taklit SDK taşıyıcısı ve izole test hesabıyla şu davranışlar sınandı: gerçek kaynak fotoğrafın moderasyona eklenmesi, işaretlenen girdide sıfır render çağrısı, hizmet hatasında güvenli durdurma, tek iade, ön kontrol geçse de sonraki sağlayıcı reddine uyma, iptal yarışında yeniden başlatmama ve günlüklerden hassas verilerin çıkarılması.

Ek olarak, aynı başarısız işin kayıtlı **orijinal fotoğrafıyla yalnızca bir ücretsiz moderasyon kontrolü** yapıldı: HTTP 200, `flagged: false`, işaretlenen kategori yok. Bu kontrol görsel üretmedi, işi tekrar kuyruğa almadı ve veritabanını değiştirmedi. Sonuç yalnızca bu ön kontrolün fotoğrafı işaretlemediğini gösterir; Images servisinin ayrı giriş/çıkış güvenlik kararını geçersiz kılmaz ve önceki reddin kesin olarak yanlış pozitif olduğunu kanıtlamaz.

Kullanıcının eski işi yeniden çalıştırılmadı ve yeni ücretli test görseli oluşturulmadı. Bu değişiklikler aynı fotoğrafın gelecekte kesinlikle kabul edileceği vaadi değildir. Güvenli ve izinli başka bir fotoğraf veya uygun düzenleme seçimiyle kullanıcı yeni bir istek oluşturabilir; her yeni gönderim yine aynı güvenlik kontrollerine tabidir.
