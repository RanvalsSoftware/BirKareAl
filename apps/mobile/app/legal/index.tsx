import { useLanguageRevision } from '@/i18n/use-language';
import { tr as translateCopy } from '@/i18n/engine';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { openAppleStandardEula, openBirkarePrivacyPolicy } from '@/constants/legal-links';
import { useCopy } from '@/features/settings/language-store';
import {
  GlassSettingsHero,
  GlassSettingsPanel,
  GlassSettingsRow,
  SettingsNote,
  SettingsPage,
  SettingsSectionTitle,
} from '@/features/settings/components';

const documents = [
  {
    slug: 'terms',
    get title() {
      return translateCopy('Kullanım koşulları');
    },
    get detail() {
      return translateCopy('Hizmetin kullanım kuralları');
    },
    icon: 'document-text-outline',
  },
  {
    slug: 'privacy',
    get title() {
      return translateCopy('Gizlilik politikası');
    },
    get detail() {
      return translateCopy('Veri, fotoğraf ve saklama bilgileri');
    },
    icon: 'lock-closed-outline',
  },
  {
    slug: 'notice',
    get title() {
      return translateCopy('Aydınlatma Metni');
    },
    get detail() {
      return translateCopy('Kişisel verilerin nasıl işlendiği ve hakların');
    },
    icon: 'information-circle-outline',
  },
  {
    slug: 'explicit-consent',
    get title() {
      return translateCopy('Açık Rıza Metni');
    },
    get detail() {
      return translateCopy('Fotoğrafın AI işlemede kullanımı için ayrı izin');
    },
    icon: 'checkbox-outline',
  },
  {
    slug: 'ai-policy',
    get title() {
      return translateCopy('AI içerik politikası');
    },
    get detail() {
      return translateCopy('Güvenli ve şeffaf AI kullanımı');
    },
    icon: 'document-text-outline',
  },
] as const satisfies readonly {
  slug: string;
  title: string;
  detail: string;
  icon: string;
}[];

export default function LegalScreen() {
  const languageRevision = useLanguageRevision();

  const router = useRouter();
  const copy = useCopy();

  function openExternal(action: () => Promise<void>) {
    action().catch((error: unknown) => {
      Alert.alert(
        copy('Bağlantı açılamadı', 'Could not open link'),
        error instanceof Error
          ? error.message
          : copy('Lütfen daha sonra tekrar dene.', 'Please try again later.'),
      );
    });
  }

  return (
    <SettingsPage backLabel={translateCopy('Ayarlar')} title={translateCopy('Yasal belgeler')}>
      <GlassSettingsHero
        icon="shield-checkmark-outline"
        title={translateCopy('Kontrol sende.')}
        description={translateCopy(
          'Fotoğrafların, seçimlerin ve hakların hakkında bilmen gerekenleri tek yerde bul.',
        )}
      />
      <SettingsSectionTitle>{translateCopy('BELGELER')}</SettingsSectionTitle>
      <GlassSettingsPanel>
        {documents.map((document, index) => (
          <GlassSettingsRow
            key={document.slug}
            icon={document.icon}
            title={document.title}
            detail={document.detail}
            last={index === documents.length - 1}
            onPress={() => {
              router.push(`/legal/${document.slug}` as never);
            }}
          />
        ))}
      </GlassSettingsPanel>

      <SettingsSectionTitle>{copy('SÖZLEŞMELER VE BAĞLANTILAR', 'AGREEMENTS AND LINKS')}</SettingsSectionTitle>
      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="ribbon-outline"
          title={copy('Lisans sözleşmesi (EULA)', 'License agreement (EULA)')}
          detail={copy('Apple standart son kullanıcı sözleşmesi', 'Apple standard end user license agreement')}
          external
          onPress={() => openExternal(openAppleStandardEula)}
        />
        <GlassSettingsRow
          icon="open-outline"
          title={copy('Gizlilik politikası (web)', 'Privacy policy (web)')}
          detail="ai.ranvals.com"
          external
          onPress={() => openExternal(openBirkarePrivacyPolicy)}
          last
        />
      </GlassSettingsPanel>
      <SettingsNote>
        {copy(
          'Uygulama içi satın almalar ve abonelikler Apple’ın standart son kullanıcı lisans sözleşmesine tabidir.',
          'In-app purchases and subscriptions are subject to Apple’s standard end user license agreement.',
        )}
      </SettingsNote>

      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="help-buoy-outline"
          title={translateCopy('Bir sorunun mu var?')}
          detail={translateCopy('Gizlilik ve kullanım hakları için destek al')}
          onPress={() => router.push('/support' as never)}
          last
        />
      </GlassSettingsPanel>
    </SettingsPage>
  );
}
