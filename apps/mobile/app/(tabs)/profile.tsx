import { useLanguageRevision } from '@/i18n/use-language';
import { getLocale as getAppLocale } from '@/i18n/engine';
import { tr as translateCopy } from '@/i18n/engine';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from '@/api/client';
import { useAuthStore, type AuthUser } from '@/features/auth/auth-store';
import { useCreditWallet } from '@/features/billing/use-wallet';
import { useUserProjects } from '@/features/projects/use-user-projects';
import { useCopy } from '@/features/settings/language-store';
import {
  GlassSettingsPanel,
  GlassSettingsRow,
  SettingsAccountCard,
  SettingsPage,
  SettingsSectionTitle,
} from '@/features/settings/components';
import { brand } from '@/theme/brand';

type MeResponse = {
  user: AuthUser;
  wallet: { available: number; reserved: number; unlimited: boolean };
};

function fullName(user: AuthUser | null | undefined): string {
  const name = [user?.firstName?.trim(), user?.lastName?.trim()].filter(Boolean).join(' ');
  if (name) return name;
  return user?.email.split('@')[0]?.replace(/[._-]+/g, ' ') || translateCopy("BirKare kullanıcısı");
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

export default function ProfileScreen() {
  const languageRevision = useLanguageRevision();

  const router = useRouter();
  const copy = useCopy();
  const queryClient = useQueryClient();
  const sessionUser = useAuthStore((store) => store.user);
  const signOut = useAuthStore((store) => store.signOut);
  const { data: liveWallet } = useCreditWallet();
  const { data: me } = useQuery({
    queryKey: ['me', sessionUser?.id],
    queryFn: ({ signal }) => apiRequest<MeResponse>('/v1/me', { signal }),
    enabled: Boolean(sessionUser),
  });
  const projectsQuery = useUserProjects();
  const products = projectsQuery.data?.filter((item) => item.mode === 'PRODUCT_STUDIO');
  const user = me?.user ?? sessionUser;
  const wallet = liveWallet ?? me?.wallet;
  const verified = Boolean(user?.emailVerified);

  async function logout() {
    try {
      await signOut();
    } catch {
      // signOut clears the device session in its own finally block even when
      // the server is unreachable. Do not turn a completed local logout into
      // an unhandled promise rejection.
    } finally {
      queryClient.clear();
      router.replace('/(auth)/login' as never);
    }
  }

  return (
    <SettingsPage
      title={translateCopy("Hesap")}
      subtitle={copy('Sana ait çalışma alanı.', 'Your own workspace.')}
      credits={wallet?.available}
      back={false}
    >
      <SettingsAccountCard
        initials={avatarInitials(user)}
        name={fullName(user)}
        email={user?.email ?? translateCopy("Hesap bilgileri yükleniyor…")}
        caption={verified ? translateCopy("E-posta doğrulandı") : translateCopy("Doğrulama bekleniyor")}
        verified={verified}
        onPress={() => router.push('/settings/account' as never)}
      />

      <View style={styles.stats}>
        <Stat value={products ? String(products.length) : '—'} label={copy('Ürün', 'Products')} />
        <Stat
          value={products ? String(products.filter((item) => item.outputAssetId).length) : '—'}
          label={copy('Hazır görsel', 'Ready')}
        />
        <Stat accent value={wallet ? String(wallet.available) : '—'} label={translateCopy("Kredi")} />
      </View>

      <SettingsSectionTitle>{translateCopy("BAKİYE VE HAREKETLER")}</SettingsSectionTitle>
      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="flash-outline"
          title={translateCopy("Kredi bakiyem")}
          value={wallet ? translateCopy('{{p0}} kredi', { p0: wallet.available }) : translateCopy("Yükleniyor")}
          onPress={() => router.push('/(tabs)/credits' as never)}
        />
        <GlassSettingsRow
          icon="time-outline"
          title={translateCopy("İşlem geçmişi")}
          onPress={() => router.push('/settings/history' as never)}
          last
        />
      </GlassSettingsPanel>

      <SettingsSectionTitle>{translateCopy("HESABIM")}</SettingsSectionTitle>
      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="storefront-outline"
          title={copy('Marka kiti', 'Brand kit')}
          detail={copy('Mağaza adı, logo ve iletişim', 'Shop name, logo and contact')}
          onPress={() => router.push('/settings/brand' as never)}
        />
        <GlassSettingsRow
          icon="options-outline"
          title={translateCopy("Ayarlar")}
          detail={copy('Tercihler, dil ve bildirimler', 'Preferences, language and notifications')}
          onPress={() => router.push('/settings' as never)}
        />
        <GlassSettingsRow
          icon="layers-outline"
          title={translateCopy("Görünüm")}
          value={copy('Koyu', 'Dark')}
          onPress={() => router.push('/settings/appearance' as never)}
        />
        <GlassSettingsRow
          icon="shield-checkmark-outline"
          title={translateCopy("Gizlilik ve güvenlik")}
          onPress={() => router.push('/settings/privacy' as never)}
        />
        <GlassSettingsRow
          icon="help-circle-outline"
          title={translateCopy("Yardım ve destek")}
          onPress={() => router.push('/support' as never)}
        />
        <GlassSettingsRow
          icon="document-text-outline"
          title={translateCopy("Yasal belgeler")}
          onPress={() => router.push('/legal' as never)}
          last
        />
      </GlassSettingsPanel>

      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="log-out-outline"
          title={translateCopy("Çıkış yap")}
          danger
          last
          onPress={() =>
            Alert.alert(translateCopy("Çıkış yap"), translateCopy("Bu cihazdaki oturumun güvenle kapatılacak."), [
              { text: translateCopy("Vazgeç"), style: 'cancel' },
              {
                text: translateCopy("Çıkış yap"),
                style: 'destructive',
                onPress: () => {
                  void logout();
                },
              },
            ])
          }
        />
      </GlassSettingsPanel>
    </SettingsPage>
  );
}

function Stat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  const languageRevision = useLanguageRevision();

  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 12 },
  stat: { backgroundColor: brand.surface, borderRadius: 16, flex: 1, gap: 6, padding: 16 },
  statValue: { color: brand.text, fontSize: 26, fontVariant: ['tabular-nums'], fontWeight: '700' },
  statValueAccent: { color: brand.gold },
  statLabel: { color: brand.textSecondary, fontSize: 13 },
});
