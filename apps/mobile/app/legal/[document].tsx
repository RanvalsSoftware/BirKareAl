import { useLanguageRevision } from '@/i18n/use-language';
import { tr as translateCopy } from '@/i18n/engine';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { GlassSurface } from '@/components';
import { SettingsNote, SettingsPage } from '@/features/settings/components';
import { colors, spacing, typography } from '@/theme';

const content: Record<
  string,
  { title: string; updated: string; sections: { heading: string; body: string }[] }
> = {
  terms: {
    get title() { return translateCopy("Kullanım koşulları"); },
    get updated() { return translateCopy("3 Eylül 2026"); },
    sections: [
      {
        heading: '1. Kapsam ve kabul',
        get body() { return translateCopy("BirKare AI hesabı oluşturarak bu örnek Kullanım Koşulları’nı kabul etmiş olursun. Koşulları kabul etmiyorsan hesap oluşturmamalı veya hizmeti kullanmamalısın."); },
      },
      {
        get heading() { return translateCopy("2. Hesap ve yaş şartı"); },
        get body() { return translateCopy("Hizmet 18 yaş ve üzeri kullanıcılar içindir. Kayıt bilgilerinin doğru tutulmasından, şifrenin korunmasından ve hesabındaki işlemlerden sen sorumlusun."); },
      },
      {
        get heading() { return translateCopy("3. Fotoğraf ve içerik hakları"); },
        get body() { return translateCopy("Yalnızca sana ait olan veya kullanmak için gerekli izne sahip olduğun fotoğraf ve içerikleri yükleyebilirsin. Başkalarının telif, kişilik ve gizlilik haklarına saygı göstermelisin."); },
      },
      {
        get heading() { return translateCopy("4. AI üretimi ve şeffaflık"); },
        get body() { return translateCopy("Üretilen sonuçlar yapay zekâ tarafından oluşturulabilir veya önemli ölçüde değiştirilebilir. Sonuçların hatalı olabileceğini ve paylaşım sırasında AI içeriği olarak belirtilmesi gerekebileceğini kabul edersin."); },
      },
      {
        get heading() { return translateCopy("5. Yasaklanan kullanımlar"); },
        get body() { return translateCopy("İzinsiz kimlik taklidi, aldatma, taciz, yasa dışı içerik, mahrem görüntü, nefret veya güvenliği tehlikeye atan üretimler yasaktır. Bu tür istekler engellenebilir."); },
      },
      {
        get heading() { return translateCopy("6. Krediler ve ücretli özellikler"); },
        get body() { return translateCopy("Bazı üretimler kredi veya ücretli üyelik gerektirebilir. Satın alma öncesinde gösterilen fiyat, kapsam ve varsa yenileme bilgileri ilgili işlem için geçerlidir."); },
      },
      {
        get heading() { return translateCopy("7. Askıya alma ve değişiklikler"); },
        get body() { return translateCopy("Güvenlik, kötüye kullanım veya koşul ihlali durumunda erişim sınırlandırılabilir. Önemli koşul değişiklikleri uygulama içinde duyurulur ve yürürlük tarihi açıkça gösterilir."); },
      },
      {
        get heading() { return translateCopy("8. İletişim"); },
        get body() { return translateCopy("Koşullar, hesap veya içerik haklarıyla ilgili sorularını uygulamadaki Destek bölümünden iletebilirsin."); },
      },
    ],
  },
  privacy: {
    get title() { return translateCopy("Gizlilik politikası"); },
    get updated() { return translateCopy("7 Eylül 2026"); },
    sections: [
      {
        heading: '1. Toplanan bilgiler',
        get body() { return translateCopy("Hesap bilgileri, yüklediğin fotoğraflar, seçtiğin sahne ve filtreler, üretim kayıtları, cihaz bilgileri ve güvenlik günlükleri hizmeti sunmak için işlenebilir."); },
      },
      {
        get heading() { return translateCopy("2. Kullanım amaçları"); },
        get body() { return translateCopy("Bilgiler hesabını oluşturmak, görsel üretim taleplerini yerine getirmek, güvenliği sağlamak, kötüye kullanımı önlemek ve talep ettiğin destek hizmetini sunmak amacıyla kullanılır."); },
      },
      {
        get heading() { return translateCopy("3. Fotoğraflar ve AI sağlayıcıları"); },
        get body() { return translateCopy("Kaynak fotoğrafın yalnızca seçtiğin üretim veya düzenleme işlemini gerçekleştirmek için yetkili hizmet sağlayıcılara aktarılabilir. BirKare AI, fotoğraflarını kendi model eğitimi için kullanmaz."); },
      },
      {
        heading: '4. Saklama ve silme',
        get body() { return translateCopy("Hesabını Ayarlar bölümünde yeniden kimlik doğrulayarak kalıcı olarak silmeye gönderebilirsin. Erişim hemen kapanır; kısa süreli dosya bağlantıları için en az 10 dakika beklenir ve dosya/veri temizliği otomatik yürütülür. Temizlikte geçici hata olursa işlem yeniden denenir. Ücretsiz başlangıç hakkının tekrar verilmesini önlemek için e-posta ve bağlı giriş kimliklerinin anahtarlı özetleri tutulur; bu kayıtta açık e-posta, fotoğraf veya şifre bulunmaz. Varsa mağaza aboneliğin ayrıca mağazadan yönetilmelidir. Yayın öncesi saklama süreleri ve hukuki dayanaklar ayrıca doğrulanmalıdır."); },
      },
      {
        get heading() { return translateCopy("5. Paylaşım ve aktarım"); },
        get body() { return translateCopy("Veriler satılmaz. Barındırma, güvenlik, ödeme ve AI üretimi gibi hizmetleri sağlayan sözleşmeli iş ortakları yalnızca görevleri için gerekli verilere erişebilir."); },
      },
      {
        get heading() { return translateCopy("6. Güvenlik"); },
        get body() { return translateCopy("Yetkisiz erişimi azaltmak için erişim kontrolleri, güvenli iletişim ve operasyonel kayıtlar kullanılır. Hiçbir sistemin mutlak güvenlik garantisi veremeyeceğini bilmelisin."); },
      },
      {
        get heading() { return translateCopy("7. Hakların"); },
        get body() { return translateCopy("Uygulanabilir mevzuat kapsamında verilerine erişme, düzeltme, silme, işlemeyi sınırlandırma veya itiraz etme hakların olabilir. Taleplerini Destek bölümünden iletebilirsin."); },
      },
      {
        get heading() { return translateCopy("8. Değişiklikler ve iletişim"); },
        get body() { return translateCopy("Politika güncellendiğinde yeni tarih bu ekranda gösterilir. Gizlilik soruların için uygulamadaki Destek ve Gizlilik bölümünü kullanabilirsin."); },
      },
    ],
  },
  'ai-policy': {
    get title() { return translateCopy("AI içerik politikası"); },
    get updated() { return translateCopy("2 Eylül 2026"); },
    sections: [
      {
        get heading() { return translateCopy("Şeffaflık"); },
        get body() { return translateCopy("AI ile üretilen veya önemli ölçüde düzenlenen sonuçlar, paylaşım akışında AI içeriği olarak işaretlenir."); },
      },
      {
        get heading() { return translateCopy("Güvenlik"); },
        get body() { return translateCopy("Zararlı, yanıltıcı veya izinsiz içerik talepleri denetlenir ve gerektiğinde engellenir."); },
      },
    ],
  },
  'fan-content': {
    get title() { return translateCopy("Kurgusal karakter açıklaması"); },
    get updated() { return translateCopy("2 Eylül 2026"); },
    sections: [
      {
        heading: 'Kurgusal koleksiyon',
        get body() { return translateCopy("Bu uygulamadaki karakter örnekleri tamamen hayal ürünüdür; gerçek kişiler, gerçek buluşmalar veya gerçek onaylar anlamına gelmez."); },
      },
      {
        get heading() { return translateCopy("Paylaşım"); },
        get body() { return translateCopy("Kurgusal karakter içeren sonuçların AI içeriği açıklamasıyla paylaşılması gerekir."); },
      },
    ],
  },
  community: {
    get title() { return translateCopy("Topluluk kuralları"); },
    get updated() { return translateCopy("2 Eylül 2026"); },
    sections: [
      {
        get heading() { return translateCopy("Saygı ve izin"); },
        get body() { return translateCopy("Başkalarına ait fotoğrafları, kimliği veya kişilik haklarını izinsiz kullanma. Paylaşımlarda açık, dürüst ve saygılı ol."); },
      },
      {
        heading: 'Raporlama',
        get body() { return translateCopy("Uygunsuz veya yanlış yönlendirici bir içerik görürsen destek ekibine raporla."); },
      },
    ],
  },
};

export default function LegalDocumentScreen() {
  const languageRevision = useLanguageRevision();

  const { document } = useLocalSearchParams<{ document: string }>();
  const item = content[document];
  if (!item)
    return (
      <SettingsPage title={translateCopy("Belge bulunamadı")}>
        <SettingsNote warning>{translateCopy("Bu belge mevcut değil. Yasal belgeler ekranından geçerli bir belge seçebilirsin.")}</SettingsNote>
      </SettingsPage>
    );
  return (
    <SettingsPage title={item.title} subtitle={translateCopy("Son güncelleme: {{p0}}", { p0: item.updated })}>
      <SettingsNote warning>{translateCopy("Bu metin uygulama prototipi için hazırlanmış örnek bir taslaktır; yayın öncesinde hukuk uzmanı tarafından incelenmelidir.")}</SettingsNote>
      <GlassSurface radius={25} tone="neutral" glow={false} contentStyle={styles.document}>
        {item.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </GlassSurface>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  document: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  section: { gap: 7 },
  heading: { ...typography.h3, color: colors.textPrimary },
  body: { ...typography.body, color: '#B7B3BF', lineHeight: 25 },
});
