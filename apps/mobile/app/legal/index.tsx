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
    title: 'Kullanım koşulları',
    detail: 'Hizmetin kullanım kuralları',
    icon: 'document-text-outline',
  },
  {
    slug: 'privacy',
    title: 'Gizlilik politikası',
    detail: 'Veri, fotoğraf ve saklama bilgileri',
    icon: 'lock-closed-outline',
  },
  {
    slug: 'ai-policy',
    title: 'AI içerik politikası',
    detail: 'Güvenli ve şeffaf AI kullanımı',
    icon: 'sparkles-outline',
  },
  {
    slug: 'fan-content',
    title: 'Kurgusal karakter açıklaması',
    detail: 'AI içerik ve gerçeklik bildirimi',
    icon: 'people-outline',
  },
  {
    slug: 'community',
    title: 'Topluluk kuralları',
    detail: 'İzinli ve saygılı paylaşım',
    icon: 'heart-outline',
  },
] as const;

export default function LegalScreen() {
  const router = useRouter();
  return (
    <SettingsPage title="Yasal belgeler" subtitle="Açık, anlaşılır ve her zaman erişilebilir">
      <GlassSettingsHero
        icon="shield-checkmark-outline"
        title="Kontrol sende."
        description="Fotoğrafların, seçimlerin ve hakların hakkında bilmen gerekenleri tek yerde bul."
      />
      <SettingsSectionTitle>BELGELER</SettingsSectionTitle>
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
      <SettingsNote warning>
        Bu belgeler ürün içi bilgilendirme taslaklarıdır. Yayına alınmadan önce hukuk uzmanı
        tarafından gözden geçirilmelidir.
      </SettingsNote>
      <GlassSettingsPanel tone="neutral">
        <GlassSettingsRow
          icon="help-buoy-outline"
          title="Bir sorunun mu var?"
          detail="Gizlilik ve kullanım hakları için destek al"
          onPress={() => router.push('/support' as never)}
          last
        />
      </GlassSettingsPanel>
    </SettingsPage>
  );
}
