import { useLanguageRevision } from '@/i18n/use-language';
import { tr as translateCopy } from '@/i18n/engine';
import { useLanguage } from '@/i18n/use-language';
import { t } from '@/i18n/engine';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import {
  GlassSettingsPanel,
  GlassSettingsRow,
  SettingsPage,
  SettingsSectionTitle,
} from '@/features/settings/components';

export default function SettingsScreen() {
  const languageRevision = useLanguageRevision();

  const router = useRouter();
  const language = useLanguage();
  return (
    <SettingsPage title={translateCopy("Ayarlar")} subtitle={translateCopy("Uygulamayı sana göre düzenle")}>
      <SettingsSectionTitle>{translateCopy("TERCİHLER")}</SettingsSectionTitle>
      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="color-palette-outline"
          title={translateCopy("Görünüm")}
          detail="Koyu tema · Cam efektleri · Animasyon"
          onPress={() => router.push('/settings/appearance' as never)}
        />
        <GlassSettingsRow
          icon="language-outline"
          accent="purple"
          title="Dil"
          value={language.preference === 'system' ? t('language.system') : language.language === 'tr' ? translateCopy("Türkçe") : 'English'}
          detail={t('language.subtitle')}
          onPress={() => router.push('/settings/language' as never)}
        />
        <GlassSettingsRow
          icon="notifications-outline"
          title={translateCopy("Bildirim ve iletişim tercihleri")}
          onPress={() => router.push('/settings/notifications' as never)}
          last
        />
      </GlassSettingsPanel>
      <SettingsSectionTitle>{translateCopy("HESAP VE VERİLER")}</SettingsSectionTitle>
      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="person-outline"
          title={translateCopy("Profili düzenle")}
          detail={translateCopy("Ad ve soyadını güncelle")}
          onPress={() => router.push('/settings/account' as never)}
        />
        <GlassSettingsRow
          icon="shield-checkmark-outline"
          title={translateCopy("Güvenlik ve oturumlar")}
          onPress={() => router.push('/settings/security' as never)}
        />
        <GlassSettingsRow
          icon="lock-closed-outline"
          accent="purple"
          title="Gizlilik ve verilerim"
          onPress={() => router.push('/settings/privacy' as never)}
        />
        <GlassSettingsRow
          icon="document-text-outline"
          title="Yasal belgeler"
          onPress={() => router.push('/legal' as never)}
        />
        <GlassSettingsRow
          icon="trash-outline"
          title={translateCopy("Hesabı sil")}
          danger
          onPress={() => router.push('/settings/delete-account' as never)}
          last
        />
      </GlassSettingsPanel>
      <Text style={styles.version}>{translateCopy("BirKare AI · Sürüm {{p0}}", { p0: Constants.expoConfig?.version ?? '—' })}</Text>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  version: { color: '#77747D', fontSize: 11, textAlign: 'center', marginTop: 23 },
});
