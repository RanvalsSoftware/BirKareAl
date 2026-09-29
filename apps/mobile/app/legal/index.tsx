import { useLanguageRevision } from '@/i18n/use-language';
import { tr as translateCopy } from '@/i18n/engine';
import { useRouter } from 'expo-router';

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
    get title() { return translateCopy("Kullanım koşulları"); },
    get detail() { return translateCopy("Hizmetin kullanım kuralları"); },
    icon: 'document-text-outline',
  },
  {
    slug: 'privacy',
    get title() { return translateCopy("Gizlilik politikası"); },
    get detail() { return translateCopy("Veri, fotoğraf ve saklama bilgileri"); },
    icon: 'lock-closed-outline',
  },
  {
    slug: 'ai-policy',
    get title() { return translateCopy("AI içerik politikası"); },
    get detail() { return translateCopy("Güvenli ve şeffaf AI kullanımı"); },
    icon: 'sparkles-outline',
  },
  {
    slug: 'fan-content',
    get title() { return translateCopy("Kurgusal karakter açıklaması"); },
    get detail() { return translateCopy("AI içerik ve gerçeklik bildirimi"); },
    icon: 'people-outline',
  },
  {
    slug: 'community',
    get title() { return translateCopy("Topluluk kuralları"); },
    get detail() { return translateCopy("İzinli ve saygılı paylaşım"); },
    icon: 'heart-outline',
  },
] as const;

export default function LegalScreen() {
  const languageRevision = useLanguageRevision();

  const router = useRouter();
  return (
    <SettingsPage title={translateCopy("Yasal belgeler")} subtitle={translateCopy("Açık, anlaşılır ve her zaman erişilebilir")}>
      <GlassSettingsHero
        icon="shield-checkmark-outline"
        title={translateCopy("Kontrol sende.")}
        description={translateCopy("Fotoğrafların, seçimlerin ve hakların hakkında bilmen gerekenleri tek yerde bul.")}
      />
      <SettingsSectionTitle>{translateCopy("BELGELER")}</SettingsSectionTitle>
      <GlassSettingsPanel>
        {documents.map((document, index) => (
          <GlassSettingsRow
            key={document.slug}
            icon={document.icon}
            title={document.title}
            detail={document.detail}
            accent={index % 2 ? 'purple' : 'gold'}
            last={index === documents.length - 1}
            onPress={() => router.push(`/legal/${document.slug}` as never)}
          />
        ))}
      </GlassSettingsPanel>
      <SettingsNote warning>{translateCopy("Bu belgeler ürün içi bilgilendirme taslaklarıdır. Yayına alınmadan önce hukuk uzmanı tarafından gözden geçirilmelidir.")}</SettingsNote>
      <GlassSettingsPanel tone="neutral">
        <GlassSettingsRow
          icon="help-buoy-outline"
          title={translateCopy("Bir sorunun mu var?")}
          detail={translateCopy("Gizlilik ve kullanım hakları için destek al")}
          onPress={() => router.push('/support' as never)}
          last
        />
      </GlassSettingsPanel>
    </SettingsPage>
  );
}
