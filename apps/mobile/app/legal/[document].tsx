import { useLanguageRevision } from '@/i18n/use-language';
import { tr as translateCopy } from '@/i18n/engine';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppleGlassButton, GlassSurface } from '@/components';
import { openBirkarePrivacyPolicy } from '@/constants/legal-links';
import {
  explicitConsentSections,
  privacyNoticeSections,
  privacyPolicySections,
  termsSections,
} from '@/features/legal/privacy-notice';
import { SettingsNote, SettingsPage } from '@/features/settings/components';
import { colors, spacing, typography } from '@/theme';

const content: Record<
  string,
  { title: string; updated: string; sections: readonly { heading: string; body: string }[] }
> = {
  terms: {
    get title() {
      return translateCopy('Kullanım koşulları');
    },
    get updated() {
      return translateCopy('2 Ekim 2026');
    },
    sections: termsSections,
  },
  'ai-policy': {
    get title() {
      return translateCopy('AI içerik politikası');
    },
    get updated() {
      return translateCopy('2 Eylül 2026');
    },
    sections: [
      {
        get heading() {
          return translateCopy('Şeffaflık');
        },
        get body() {
          return translateCopy(
            'AI ile üretilen veya önemli ölçüde düzenlenen sonuçlar, paylaşım akışında AI içeriği olarak işaretlenir.',
          );
        },
      },
      {
        get heading() {
          return translateCopy('Güvenlik');
        },
        get body() {
          return translateCopy(
            'Zararlı, yanıltıcı veya izinsiz içerik talepleri denetlenir ve gerektiğinde engellenir.',
          );
        },
      },
    ],
  },
  'fan-content': {
    get title() {
      return translateCopy('Kurgusal karakter açıklaması');
    },
    get updated() {
      return translateCopy('2 Eylül 2026');
    },
    sections: [
      {
        get heading() {
          return translateCopy('Kurgusal koleksiyon');
        },
        get body() {
          return translateCopy(
            'Bu uygulamadaki karakter örnekleri tamamen hayal ürünüdür; gerçek kişiler, gerçek buluşmalar veya gerçek onaylar anlamına gelmez.',
          );
        },
      },
      {
        get heading() {
          return translateCopy('Paylaşım');
        },
        get body() {
          return translateCopy(
            'Kurgusal karakter içeren sonuçların AI içeriği açıklamasıyla paylaşılması gerekir.',
          );
        },
      },
    ],
  },
  community: {
    get title() {
      return translateCopy('Topluluk kuralları');
    },
    get updated() {
      return translateCopy('2 Eylül 2026');
    },
    sections: [
      {
        get heading() {
          return translateCopy('Saygı ve izin');
        },
        get body() {
          return translateCopy(
            'Başkalarına ait fotoğrafları, kimliği veya kişilik haklarını izinsiz kullanma. Paylaşımlarda açık, dürüst ve saygılı ol.',
          );
        },
      },
      {
        get heading() {
          return translateCopy('Raporlama');
        },
        get body() {
          return translateCopy(
            'Uygunsuz veya yanlış yönlendirici bir içerik görürsen destek ekibine raporla.',
          );
        },
      },
    ],
  },
};

export default function LegalDocumentScreen() {
  const languageRevision = useLanguageRevision();

  const { document } = useLocalSearchParams<{ document: string }>();
  if (document === 'privacy') return <PrivacyPolicyScreen />;
  if (document === 'notice')
    return <LegalTextScreen title="Aydınlatma Metni" sections={privacyNoticeSections} />;
  if (document === 'explicit-consent')
    return <LegalTextScreen title="Açık Rıza Metni" sections={explicitConsentSections} />;
  const item = content[document];
  if (!item)
    return (
      <SettingsPage title={translateCopy('Belge bulunamadı')}>
        <SettingsNote warning>
          {translateCopy(
            'Bu belge mevcut değil. Yasal belgeler ekranından geçerli bir belge seçebilirsin.',
          )}
        </SettingsNote>
      </SettingsPage>
    );
  return (
    <SettingsPage
      title={item.title}
      subtitle={translateCopy('Son güncelleme: {{p0}}', { p0: item.updated })}
    >
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

function LegalTextScreen({
  title,
  sections,
}: {
  title: string;
  sections: readonly { heading: string; body: string }[];
}) {
  const languageRevision = useLanguageRevision();
  return (
    <SettingsPage
      title={title}
      subtitle={translateCopy('Son güncelleme: {{p0}}', { p0: '2 Ekim 2026' })}
    >
      <GlassSurface radius={25} tone="neutral" glow={false} contentStyle={styles.document}>
        {sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </GlassSurface>
      {title === 'Açık Rıza Metni' ? (
        <SettingsNote>
          {translateCopy(
            'Açık rıza, yalnızca bu metni okuyup ayrı olarak izin verdiğinde alınır. Onay vermemen hesap açmanı engellemez; bu izne bağlı görsel üretim kullanılamayabilir.',
          )}
        </SettingsNote>
      ) : null}
    </SettingsPage>
  );
}

function PrivacyPolicyScreen() {
  const languageRevision = useLanguageRevision();
  return (
    <SettingsPage
      title={translateCopy('Gizlilik politikası')}
      subtitle={translateCopy('Kişisel veriler ve uygulama kullanımı')}
    >
      <GlassSurface radius={25} tone="neutral" glow={false} contentStyle={styles.document}>
        {privacyPolicySections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </GlassSurface>
      <AppleGlassButton
        label={translateCopy('Gizlilik politikasının web sürümünü aç')}
        icon="open-outline"
        onPress={() => {
          void openBirkarePrivacyPolicy();
        }}
      />
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
