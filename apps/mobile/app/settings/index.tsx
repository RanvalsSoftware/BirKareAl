import { useLanguageRevision } from '@/i18n/use-language';
import { tr as translateCopy } from '@/i18n/engine';
import { getLocale as getAppLocale, t } from '@/i18n/engine';
import { useLanguage } from '@/i18n/use-language';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text } from 'react-native';

import { useAuthStore, type AuthUser } from '@/features/auth/auth-store';
import { useCopy } from '@/features/settings/language-store';
import {
  GlassSettingsPanel,
  GlassSettingsRow,
  SettingsAccountCard,
  SettingsNote,
  SettingsPage,
  SettingsSectionTitle,
} from '@/features/settings/components';
import { openAppleStandardEula, openBirkarePrivacyPolicy } from '@/constants/legal-links';

function fullName(user: AuthUser | null | undefined): string {
  const name = [user?.firstName?.trim(), user?.lastName?.trim()].filter(Boolean).join(' ');
  if (name) return name;
  return user?.email.split('@')[0]?.replace(/[._-]+/g, ' ') || translateCopy('BirKare kullanıcısı');
}

function avatarInitials(user: AuthUser | null | undefined): string {
  return (
    [user?.firstName, user?.lastName]
      .map((name) => name?.trim().charAt(0).toLocaleUpperCase(getAppLocale()) ?? '')
      .join('')
      .slice(0, 2) ||
    user?.email.charAt(0).toLocaleUpperCase(getAppLocale()) ||
    'BK'
  );
}

export default function SettingsScreen() {
  const languageRevision = useLanguageRevision();

  const router = useRouter();
  const copy = useCopy();
  const language = useLanguage();
  const user = useAuthStore((store) => store.user);
  const languageName = {
    tr: 'Türkçe',
    en: 'English',
    de: 'Deutsch',
    es: 'Español',
    ar: 'العربية',
  }[language.language];

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
    <SettingsPage backLabel={translateCopy('Hesap')} title={translateCopy('Ayarlar')}>
      <SettingsAccountCard
        initials={avatarInitials(user)}
        name={fullName(user)}
        email={user?.email}
        onPress={() => router.push('/settings/account' as never)}
      />

      <SettingsSectionTitle>{translateCopy('TERCİHLER')}</SettingsSectionTitle>
      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="layers-outline"
          title={translateCopy('Görünüm')}
          value={copy('Koyu', 'Dark')}
          onPress={() => router.push('/settings/appearance' as never)}
        />
        <GlassSettingsRow
          icon="language-outline"
          title={translateCopy('Dil')}
          value={language.preference === 'system' ? t('language.system') : languageName}
          onPress={() => router.push('/settings/language' as never)}
        />
        <GlassSettingsRow
          icon="notifications-outline"
          title={translateCopy('Bildirimler')}
          onPress={() => router.push('/settings/notifications' as never)}
          last
        />
      </GlassSettingsPanel>

      <SettingsSectionTitle>{translateCopy('HESAP VE VERİLER')}</SettingsSectionTitle>
      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="person-outline"
          title={translateCopy('Profili düzenle')}
          onPress={() => router.push('/settings/account' as never)}
        />
        <GlassSettingsRow
          icon="key-outline"
          title={translateCopy('Güvenlik ve oturumlar')}
          onPress={() => router.push('/settings/security' as never)}
        />
        <GlassSettingsRow
          icon="shield-checkmark-outline"
          title={translateCopy('Gizlilik ve verilerim')}
          onPress={() => router.push('/settings/privacy' as never)}
        />
        <GlassSettingsRow
          icon="receipt-outline"
          title={translateCopy('İşlem geçmişi')}
          onPress={() => router.push('/settings/history' as never)}
          last
        />
      </GlassSettingsPanel>

      <SettingsSectionTitle>{copy('YASAL', 'LEGAL')}</SettingsSectionTitle>
      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="document-text-outline"
          title={translateCopy('Kullanım koşulları')}
          onPress={() => router.push('/legal/terms' as never)}
        />
        <GlassSettingsRow
          icon="lock-closed-outline"
          title={translateCopy('Gizlilik politikası')}
          onPress={() => router.push('/legal/privacy' as never)}
        />
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
        />
        <GlassSettingsRow
          icon="library-outline"
          title={translateCopy('Yasal belgeler')}
          detail={copy('Aydınlatma, açık rıza ve AI politikası', 'Notice, consent and AI policy')}
          onPress={() => router.push('/legal' as never)}
          last
        />
      </GlassSettingsPanel>
      <SettingsNote>
        {copy(
          'Uygulama içi satın almalar Apple’ın standart EULA’sına tabidir. Gizlilik politikası ve veri hakların uygulama içinde ve web sitesinde aynıdır.',
          'In-app purchases are subject to Apple’s standard EULA. The privacy policy and your data rights are identical in the app and on the website.',
        )}
      </SettingsNote>

      <SettingsSectionTitle>{copy('DESTEK', 'SUPPORT')}</SettingsSectionTitle>
      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="help-circle-outline"
          title={translateCopy('Yardım ve destek')}
          onPress={() => router.push('/support' as never)}
          last
        />
      </GlassSettingsPanel>

      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="trash-outline"
          title={translateCopy('Hesabı sil')}
          danger
          onPress={() => router.push('/settings/delete-account' as never)}
          last
        />
      </GlassSettingsPanel>

      <Text style={styles.version}>
        {translateCopy('BirKare Studio · Sürüm {{p0}}', {
          p0: Constants.expoConfig?.version ?? '—',
        })}
        {Constants.expoConfig?.ios?.buildNumber ? ` (${Constants.expoConfig.ios.buildNumber})` : ''}
      </Text>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  version: { color: '#7A7260', fontSize: 12, textAlign: 'center' },
});
