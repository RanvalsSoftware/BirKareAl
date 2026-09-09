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
  const router = useRouter();
  return (
    <SettingsPage title="Ayarlar" subtitle="Uygulamayı sana göre düzenle">
      <SettingsSectionTitle>TERCİHLER</SettingsSectionTitle>
      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="color-palette-outline"
          title="Görünüm"
          detail="Koyu tema · Cam efektleri · Animasyon"
          onPress={() => router.push('/settings/appearance' as never)}
        />
        <GlassSettingsRow
          icon="language-outline"
          accent="purple"
          title="Dil"
          value="Türkçe"
          detail="Bu sürüm Türkçe olarak sunuluyor"
        />
        <GlassSettingsRow
          icon="notifications-outline"
          title="Bildirim ve iletişim tercihleri"
          onPress={() => router.push('/settings/notifications' as never)}
          last
        />
      </GlassSettingsPanel>
      <SettingsSectionTitle>HESAP VE VERİLER</SettingsSectionTitle>
      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="person-outline"
          title="Profili düzenle"
          detail="Ad ve soyadını güncelle"
          onPress={() => router.push('/settings/account' as never)}
        />
        <GlassSettingsRow
          icon="shield-checkmark-outline"
          title="Güvenlik ve oturumlar"
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
          title="Hesabı sil"
          danger
          onPress={() => router.push('/settings/delete-account' as never)}
          last
        />
      </GlassSettingsPanel>
      <Text style={styles.version}>BirKare AI · Sürüm {Constants.expoConfig?.version ?? '—'}</Text>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  version: { color: '#77747D', fontSize: 11, textAlign: 'center', marginTop: 23 },
});
