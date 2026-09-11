import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ProBadge } from '@/components';
import { colors, radii, spacing, typography } from '@/theme';
import { useRevenueCat } from './revenuecat';
import type { BillingResult } from './revenuecat-client';

function notify(result: BillingResult, restoring = false) {
  if (result.kind === 'cancelled') return;
  if (result.kind === 'pending' || result.kind === 'error') {
    Alert.alert(result.kind === 'pending' ? 'Onay bekleniyor' : 'BirKare Pro', result.message);
    return;
  }
  Alert.alert(
    'BirKare Pro',
    result.isPro
      ? restoring
        ? 'Pro erişiminiz geri yüklendi.'
        : 'Pro erişiminiz aktif.'
      : 'Bu hesap için aktif Pro hakkı bulunamadı. Yeni bir ödeme yaptıysanız tekrar satın almayın; biraz sonra durumu yenileyin.',
  );
}

export function SubscriptionCard() {
  const billing = useRevenueCat();
  const { refresh } = billing;

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const expiration = billing.entitlement?.expirationDate;
  const expiresText =
    expiration && Number.isFinite(Date.parse(expiration))
      ? new Date(expiration).toLocaleDateString('tr-TR')
      : null;
  const disabled = billing.busy || (!billing.ready && billing.status !== 'connecting');

  return (
    <LinearGradient colors={['#17130A', '#111111', '#171019']} style={styles.card}>
      <View style={styles.header}>
        <ProBadge label={billing.isPro ? 'BirKare Pro · Aktif' : 'BirKare Pro'} />
        <View style={styles.statusIcon}>
          <Ionicons
            name={billing.isPro ? 'checkmark' : 'star'}
            size={20}
            color={colors.accentYellow}
          />
        </View>
      </View>

      <Text style={styles.title}>
        {billing.isPro ? 'Pro hesabınız hazır.' : 'Premium sahnelerin kilidini açın.'}
      </Text>
      <Text style={styles.text}>
        {billing.isPro
          ? expiresText
            ? `${billing.entitlement?.willRenew ? 'Yenileme tarihi' : 'Erişim bitişi'}: ${expiresText}`
            : 'Süresiz Pro erişimi · Otomatik yenileme yok.'
          : 'Aylık, yıllık ve ömür boyu seçeneklerini mağazanın güncel yerel fiyatlarıyla inceleyin.'}
      </Text>

      {billing.isTestStore ? (
        <Text style={styles.test}>TEST ORTAMI · Gerçek ücret alınmaz.</Text>
      ) : null}
      {billing.status === 'connecting' ? <Text style={styles.text}>Mağaza hazırlanıyor…</Text> : null}
      {billing.error ? (
        <Text accessibilityRole="alert" style={styles.warning}>
          {billing.error}
        </Text>
      ) : null}

      {!billing.isPro ? (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          onPress={() => router.push('/pro' as never)}
        >
          <Text style={styles.primaryText}>Pro’yu incele</Text>
          <Ionicons name="arrow-forward" size={22} color={colors.background} />
        </Pressable>
      ) : (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            style={({ pressed }) => [
              styles.secondary,
              disabled && styles.disabled,
              pressed && !disabled && styles.pressed,
            ]}
            onPress={() => {
              void billing.presentCustomerCenter().then((result) => {
                if (result.kind === 'error' || result.kind === 'pending') notify(result);
              });
            }}
          >
            <Text style={styles.secondaryText}>Aboneliği yönet</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            style={({ pressed }) => [
              styles.linkButton,
              disabled && styles.disabled,
              pressed && !disabled && styles.pressed,
            ]}
            onPress={() => void billing.restore().then((result) => notify(result, true))}
          >
            <Text style={styles.link}>Satın alımları geri yükle</Text>
          </Pressable>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,196,0,0.32)',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accentYellowSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.h3, color: colors.textPrimary, marginTop: 14 },
  text: { ...typography.caption, color: colors.textSecondary, lineHeight: 19, marginTop: 6 },
  test: { ...typography.overline, color: colors.accentYellow, marginTop: 10 },
  warning: { ...typography.caption, color: colors.accentYellow, lineHeight: 19, marginTop: 10 },
  primary: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: colors.accentYellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  primaryText: { ...typography.bodyStrong, color: colors.background },
  actions: { marginTop: 14, gap: 4 },
  secondary: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accentYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { ...typography.label, color: colors.accentYellow },
  linkButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  link: { ...typography.label, color: colors.textSecondary },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
});
