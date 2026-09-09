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
    title: 'Kullanım koşulları',
    updated: '3 Eylül 2026',
    sections: [
      {
        heading: '1. Kapsam ve kabul',
        body: 'BirKare AI hesabı oluşturarak bu örnek Kullanım Koşulları’nı kabul etmiş olursun. Koşulları kabul etmiyorsan hesap oluşturmamalı veya hizmeti kullanmamalısın.',
      },
      {
        heading: '2. Hesap ve yaş şartı',
        body: 'Hizmet 18 yaş ve üzeri kullanıcılar içindir. Kayıt bilgilerinin doğru tutulmasından, şifrenin korunmasından ve hesabındaki işlemlerden sen sorumlusun.',
      },
      {
        heading: '3. Fotoğraf ve içerik hakları',
        body: 'Yalnızca sana ait olan veya kullanmak için gerekli izne sahip olduğun fotoğraf ve içerikleri yükleyebilirsin. Başkalarının telif, kişilik ve gizlilik haklarına saygı göstermelisin.',
      },
      {
        heading: '4. AI üretimi ve şeffaflık',
        body: 'Üretilen sonuçlar yapay zekâ tarafından oluşturulabilir veya önemli ölçüde değiştirilebilir. Sonuçların hatalı olabileceğini ve paylaşım sırasında AI içeriği olarak belirtilmesi gerekebileceğini kabul edersin.',
      },
      {
        heading: '5. Yasaklanan kullanımlar',
        body: 'İzinsiz kimlik taklidi, aldatma, taciz, yasa dışı içerik, mahrem görüntü, nefret veya güvenliği tehlikeye atan üretimler yasaktır. Bu tür istekler engellenebilir.',
      },
      {
        heading: '6. Krediler ve ücretli özellikler',
        body: 'Bazı üretimler kredi veya ücretli üyelik gerektirebilir. Satın alma öncesinde gösterilen fiyat, kapsam ve varsa yenileme bilgileri ilgili işlem için geçerlidir.',
      },
      {
        heading: '7. Askıya alma ve değişiklikler',
        body: 'Güvenlik, kötüye kullanım veya koşul ihlali durumunda erişim sınırlandırılabilir. Önemli koşul değişiklikleri uygulama içinde duyurulur ve yürürlük tarihi açıkça gösterilir.',
      },
      {
        heading: '8. İletişim',
        body: 'Koşullar, hesap veya içerik haklarıyla ilgili sorularını uygulamadaki Destek bölümünden iletebilirsin.',
      },
    ],
  },
  privacy: {
    title: 'Gizlilik politikası',
    updated: '7 Eylül 2026',
    sections: [
      {
        heading: '1. Toplanan bilgiler',
        body: 'Hesap bilgileri, yüklediğin fotoğraflar, seçtiğin sahne ve filtreler, üretim kayıtları, cihaz bilgileri ve güvenlik günlükleri hizmeti sunmak için işlenebilir.',
      },
      {
        heading: '2. Kullanım amaçları',
        body: 'Bilgiler hesabını oluşturmak, görsel üretim taleplerini yerine getirmek, güvenliği sağlamak, kötüye kullanımı önlemek ve talep ettiğin destek hizmetini sunmak amacıyla kullanılır.',
      },
      {
        heading: '3. Fotoğraflar ve AI sağlayıcıları',
        body: 'Kaynak fotoğrafın yalnızca seçtiğin üretim veya düzenleme işlemini gerçekleştirmek için yetkili hizmet sağlayıcılara aktarılabilir. BirKare AI, fotoğraflarını kendi model eğitimi için kullanmaz.',
      },
      {
        heading: '4. Saklama ve silme',
        body: 'Hesabını Ayarlar bölümünde yeniden kimlik doğrulayarak kalıcı olarak silmeye gönderebilirsin. Erişim hemen kapanır; kısa süreli dosya bağlantıları için en az 10 dakika beklenir ve dosya/veri temizliği otomatik yürütülür. Temizlikte geçici hata olursa işlem yeniden denenir. Ücretsiz başlangıç hakkının tekrar verilmesini önlemek için e-posta ve bağlı giriş kimliklerinin anahtarlı özetleri tutulur; bu kayıtta açık e-posta, fotoğraf veya şifre bulunmaz. Varsa mağaza aboneliğin ayrıca mağazadan yönetilmelidir. Yayın öncesi saklama süreleri ve hukuki dayanaklar ayrıca doğrulanmalıdır.',
      },
      {
        heading: '5. Paylaşım ve aktarım',
        body: 'Veriler satılmaz. Barındırma, güvenlik, ödeme ve AI üretimi gibi hizmetleri sağlayan sözleşmeli iş ortakları yalnızca görevleri için gerekli verilere erişebilir.',
      },
      {
        heading: '6. Güvenlik',
        body: 'Yetkisiz erişimi azaltmak için erişim kontrolleri, güvenli iletişim ve operasyonel kayıtlar kullanılır. Hiçbir sistemin mutlak güvenlik garantisi veremeyeceğini bilmelisin.',
      },
      {
        heading: '7. Hakların',
        body: 'Uygulanabilir mevzuat kapsamında verilerine erişme, düzeltme, silme, işlemeyi sınırlandırma veya itiraz etme hakların olabilir. Taleplerini Destek bölümünden iletebilirsin.',
      },
      {
        heading: '8. Değişiklikler ve iletişim',
        body: 'Politika güncellendiğinde yeni tarih bu ekranda gösterilir. Gizlilik soruların için uygulamadaki Destek ve Gizlilik bölümünü kullanabilirsin.',
      },
    ],
  },
  'ai-policy': {
    title: 'AI içerik politikası',
    updated: '2 Eylül 2026',
    sections: [
      {
        heading: 'Şeffaflık',
        body: 'AI ile üretilen veya önemli ölçüde düzenlenen sonuçlar, paylaşım akışında AI içeriği olarak işaretlenir.',
      },
      {
        heading: 'Güvenlik',
        body: 'Zararlı, yanıltıcı veya izinsiz içerik talepleri denetlenir ve gerektiğinde engellenir.',
      },
    ],
  },
  'fan-content': {
    title: 'Kurgusal karakter açıklaması',
    updated: '2 Eylül 2026',
    sections: [
      {
        heading: 'Kurgusal koleksiyon',
        body: 'Bu uygulamadaki karakter örnekleri tamamen hayal ürünüdür; gerçek kişiler, gerçek buluşmalar veya gerçek onaylar anlamına gelmez.',
      },
      {
        heading: 'Paylaşım',
        body: 'Kurgusal karakter içeren sonuçların AI içeriği açıklamasıyla paylaşılması gerekir.',
      },
    ],
  },
  community: {
    title: 'Topluluk kuralları',
    updated: '2 Eylül 2026',
    sections: [
      {
        heading: 'Saygı ve izin',
        body: 'Başkalarına ait fotoğrafları, kimliği veya kişilik haklarını izinsiz kullanma. Paylaşımlarda açık, dürüst ve saygılı ol.',
      },
      {
        heading: 'Raporlama',
        body: 'Uygunsuz veya yanlış yönlendirici bir içerik görürsen destek ekibine raporla.',
      },
    ],
  },
};

export default function LegalDocumentScreen() {
  const { document } = useLocalSearchParams<{ document: string }>();
  const item = content[document];
  if (!item)
    return (
      <SettingsPage title="Belge bulunamadı">
        <SettingsNote warning>
          Bu belge mevcut değil. Yasal belgeler ekranından geçerli bir belge seçebilirsin.
        </SettingsNote>
      </SettingsPage>
    );
  return (
    <SettingsPage title={item.title} subtitle={`Son güncelleme: ${item.updated}`}>
      <SettingsNote warning>
        Bu metin uygulama prototipi için hazırlanmış örnek bir taslaktır; yayın öncesinde hukuk
        uzmanı tarafından incelenmelidir.
      </SettingsNote>
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
