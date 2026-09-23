import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { GlassSurface, Icon } from '@/components';
import { apiRequest } from '@/api/client';
import { useAuthStore, type AuthUser } from '@/features/auth/auth-store';
import { useCreditWallet } from '@/features/billing/use-wallet';
import { useAppearanceStore } from '@/features/settings/appearance-store';
import {
  GlassSettingsPanel,
  GlassSettingsRow,
  SettingsPage,
  SettingsSectionTitle,
} from '@/features/settings/components';
import { colors, typography } from '@/theme';

type MeResponse = {
  user: AuthUser;
  wallet: { available: number; reserved: number; unlimited: boolean };
};

function fullName(user: AuthUser | null | undefined): string {
  const name = [user?.firstName?.trim(), user?.lastName?.trim()].filter(Boolean).join(' ');
  if (name) return name;
  return user?.email.split('@')[0]?.replace(/[._-]+/g, ' ') || 'BirKare kullanıcısı';
}

function avatarInitials(user: AuthUser | null | undefined): string {
  return (
    [user?.firstName, user?.lastName]
      .map((name) => name?.trim().charAt(0).toLocaleUpperCase('tr-TR') ?? '')
      .join('')
      .slice(0, 2) ||
    user?.email.charAt(0).toLocaleUpperCase('tr-TR') ||
    'BK'
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionUser = useAuthStore((store) => store.user);
  const signOut = useAuthStore((store) => store.signOut);
  const glassEffects = useAppearanceStore((store) => store.glassEffects);
  const { data: liveWallet } = useCreditWallet();
  const { data: me } = useQuery({
    queryKey: ['me', sessionUser?.id],
    queryFn: ({ signal }) => apiRequest<MeResponse>('/v1/me', { signal }),
    enabled: Boolean(sessionUser),
  });
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
      title="Profil"
      subtitle="Hesabın ve tercihlerin"
      credits={wallet?.unlimited ? '∞' : wallet?.available}
      back={false}
    >
      <GlassSurface
        radius={29}
        tone="iridescent"
        style={styles.hero}
        contentStyle={styles.heroContent}
      >
        {glassEffects ? (
          <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
            <View style={styles.goldArc} />
            <View style={styles.purpleArc} />
          </View>
        ) : null}
        <View style={styles.heroTop}>
          <GlassSurface
            radius={999}
            tone="gold"
            selected
            style={styles.avatar}
            contentStyle={styles.center}
          >
            <Text style={styles.initials}>{avatarInitials(user)}</Text>
          </GlassSurface>
          <View style={styles.copy}>
            <Text style={styles.name}>{fullName(user)}</Text>
            <View style={styles.verification}>
              <Icon
                name={verified ? 'checkmark-circle' : 'time-outline'}
                size={14}
                color={verified ? '#70DC94' : '#E9BA65'}
              />
              <Text style={[styles.verifiedText, { color: verified ? '#70DC94' : '#E9BA65' }]}>
                {verified ? 'E-posta doğrulandı' : 'Doğrulama bekleniyor'}
              </Text>
            </View>
            <Text numberOfLines={2} style={styles.email}>
              {user?.email ?? 'Hesap bilgileri yükleniyor…'}
            </Text>
          </View>
        </View>
        <View style={styles.heroFooter}>
          <Text style={styles.heroMotto}>Her karede biraz sen.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profili düzenle"
            accessibilityHint="Hesabındaki ad ve soyadını güncelle"
            onPress={() => router.push('/settings/account' as never)}
            style={({ pressed }) => [styles.editAction, pressed && styles.editPressed]}
          >
            <GlassSurface radius={22} tone="gold" glow={false} contentStyle={styles.editContent}>
              <Icon name="create-outline" size={16} color="#F0D481" />
              <Text style={styles.editLabel}>Profili düzenle</Text>
            </GlassSurface>
          </Pressable>
        </View>
      </GlassSurface>

      <View style={styles.stats}>
        <Stat value={wallet ? String(wallet.available) : '—'} label="Kredi" icon="flash-outline" />
        <Stat value={wallet ? String(wallet.reserved) : '—'} label="Ayrılmış" icon="time-outline" />
        <Stat value={verified ? '✓' : '—'} label="Doğrulama" icon="shield-checkmark-outline" />
      </View>

      <SettingsSectionTitle>BAKİYE VE HAREKETLER</SettingsSectionTitle>
      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="flash-outline"
          title="Kredi bakiyem"
          detail="Kullanılabilir ve ayrılmış krediler"
          value={wallet ? `${wallet.available} kredi` : 'Yükleniyor'}
          onPress={() => router.push('/(tabs)/credits' as never)}
        />
        <GlassSettingsRow
          icon="receipt-outline"
          accent="purple"
          title="İşlem geçmişi"
          detail="Hesabına ait gerçek kredi hareketleri"
          onPress={() => router.push('/settings/history' as never)}
          last
        />
      </GlassSettingsPanel>

      <SettingsSectionTitle>HESABIM</SettingsSectionTitle>
      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="color-palette-outline"
          title="Görünüm"
          detail="Koyu tema, cam efektleri ve animasyon"
          onPress={() => router.push('/settings/appearance' as never)}
        />
        <GlassSettingsRow
          icon="settings-outline"
          accent="purple"
          title="Ayarlar"
          detail="Uygulamayı sana göre düzenle"
          onPress={() => router.push('/settings' as never)}
        />
        <GlassSettingsRow
          icon="shield-checkmark-outline"
          title="Gizlilik ve güvenlik"
          onPress={() => router.push('/settings/privacy' as never)}
        />
        <GlassSettingsRow
          icon="help-buoy-outline"
          accent="purple"
          title="Yardım ve destek"
          onPress={() => router.push('/support' as never)}
        />
        <GlassSettingsRow
          icon="document-text-outline"
          title="Yasal belgeler"
          onPress={() => router.push('/legal' as never)}
          last
        />
      </GlassSettingsPanel>
      <GlassSettingsPanel tone="neutral">
        <GlassSettingsRow
          icon="log-out-outline"
          title="Çıkış yap"
          danger
          last
          onPress={() =>
            Alert.alert('Çıkış yap', 'Bu cihazdaki oturumun güvenle kapatılacak.', [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'Çıkış yap',
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

function Stat({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: React.ComponentProps<typeof Icon>['name'];
}) {
  return (
    <GlassSurface
      radius={21}
      tone="iridescent"
      glow={false}
      style={styles.stat}
      contentStyle={styles.statContent}
    >
      <Icon name={icon} size={17} color={colors.accentYellow} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: 7 },
  heroContent: { minHeight: 216, padding: 20, gap: 23, borderRadius: 29, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 90 },
  avatar: { width: 78, height: 78, borderRadius: 999 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 29, fontWeight: '600', color: '#F9DA7C' },
  goldArc: {
    position: 'absolute',
    width: 380,
    height: 235,
    top: -158,
    left: -70,
    borderRadius: 220,
    borderWidth: 1,
    borderColor: 'rgba(239,195,84,0.16)',
    transform: [{ rotate: '-24deg' }],
  },
  purpleArc: {
    position: 'absolute',
    width: 280,
    height: 190,
    bottom: -146,
    right: -51,
    borderRadius: 190,
    borderWidth: 1,
    borderColor: 'rgba(172,123,220,0.2)',
    transform: [{ rotate: '-31deg' }],
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 17,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(241,226,182,0.12)',
  },
  heroMotto: { color: '#938F87', fontSize: 11, lineHeight: 17, flex: 1 },
  editAction: { flexShrink: 0 },
  editPressed: { opacity: 0.75 },
  editContent: {
    minHeight: 44,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editLabel: { color: '#E8DBB8', fontSize: 12, fontWeight: '600' },
  copy: { flex: 1, minWidth: 0 },
  name: { ...typography.h3, color: colors.textPrimary },
  verification: { flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 6 },
  verifiedText: { fontSize: 10, lineHeight: 15 },
  email: { fontSize: 11, lineHeight: 17, color: '#929097', marginTop: 5 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 12 },
  stat: { flex: 1 },
  statContent: {
    minHeight: 93,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 10,
  },
  statValue: { color: '#F8F7F9', fontSize: 23, lineHeight: 29, fontWeight: '600' },
  statLabel: { color: '#8F8D95', fontSize: 11, lineHeight: 16 },
});
