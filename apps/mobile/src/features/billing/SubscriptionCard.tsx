import { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import type { PurchasesPackage } from 'react-native-purchases';
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
  const offering = billing.offering;
  // These are RevenueCat package slots, NOT store product IDs. Android base
  // plan/product IDs may differ; purchase the original package with its context.
  const plans = [
    { label: 'Aylık', note: 'Her ay yenilenir', pkg: offering?.monthly },
    { label: 'Yıllık', note: 'Her yıl yenilenir', pkg: offering?.annual },
    { label: 'Ömür boyu', note: 'Tek ödeme · Yenilenmez', pkg: offering?.lifetime },
  ].filter((plan): plan is { label: string; note: string; pkg: PurchasesPackage } =>
    Boolean(plan.pkg),
  );
  const disabled = !billing.ready || billing.busy;
  const expiration = billing.entitlement?.expirationDate;
  const expiresText =
    expiration && Number.isFinite(Date.parse(expiration))
      ? new Date(expiration).toLocaleDateString('tr-TR')
      : null;

  return (
    <View style={styles.card}>
      <ProBadge label={billing.isPro ? 'BirKare Pro · Aktif' : 'BirKare Pro'} />
      <Text style={styles.title}>
        {billing.isPro ? 'Pro hesabınız' : 'Size uygun Pro planını seçin.'}
      </Text>
      {billing.isTestStore ? (
        <Text style={styles.test}>TEST ORTAMI · Gerçek ücret alınmaz.</Text>
      ) : null}
      <Text style={styles.text}>
        Pro erişimi ve üretim kredileri ayrı yönetilir. Bu satın alma bağlantısı kredi bakiyesine
        otomatik yükleme yapmaz.
      </Text>
      {billing.isPro && expiresText ? (
        <Text style={styles.text}>
          {billing.entitlement?.willRenew ? 'Yenileme tarihi' : 'Erişim bitişi'}: {expiresText}
        </Text>
      ) : null}
      {billing.isPro && !expiration ? (
        <Text style={styles.text}>Süresiz Pro erişimi · Otomatik yenileme yok.</Text>
      ) : null}
      {billing.status === 'connecting' ? (
        <Text style={styles.text}>Mağaza hazırlanıyor…</Text>
      ) : null}
      {billing.status === 'signed_out' ? (
        <Text style={styles.text}>Paketleri görmek için hesabınıza giriş yapın.</Text>
      ) : null}
      {billing.error ? (
        <Text accessibilityRole="alert" style={styles.warning}>
          {billing.error}
        </Text>
      ) : null}

      {!billing.isPro
        ? plans.map(({ label, note, pkg }) => (
            <Pressable
              key={pkg.identifier}
              accessibilityRole="button"
              accessibilityLabel={`${label}, ${pkg.product.priceString}, ${note}`}
              disabled={disabled}
              style={[styles.plan, disabled && styles.disabled]}
              onPress={() => {
                void billing.purchase(pkg).then((result) => notify(result));
              }}
            >
              <View style={styles.planDescription}>
                <Text style={styles.planTitle}>{label}</Text>
                <Text style={styles.text}>{note}</Text>
              </View>
              <Text style={styles.price}>{pkg.product.priceString}</Text>
            </Pressable>
          ))
        : null}
      {!billing.isPro && billing.ready && offering && plans.length === 0 ? (
        <Text style={styles.warning}>
          Current offering içinde Monthly, Annual veya Lifetime paket türü bulunamadı.
        </Text>
      ) : null}
      {!billing.isPro ? (
        <Pressable
          accessibilityRole="button"
          disabled={disabled || !offering}
          style={[styles.primary, (disabled || !offering) && styles.disabled]}
          onPress={() => {
            void billing.presentPaywall().then((result) => notify(result));
          }}
        >
          <Text style={styles.primaryText}>
            {billing.busy ? 'İşlem sürüyor…' : 'Pro teklifini aç'}
          </Text>
        </Pressable>
      ) : null}
      <View style={styles.links}>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          style={styles.linkButton}
          onPress={() => {
            void billing.restore().then((result) => notify(result, true));
          }}
        >
          <Text style={[styles.link, disabled && styles.disabled]}>Satın alımları geri yükle</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          style={styles.linkButton}
          onPress={() => {
            void billing.presentCustomerCenter().then((result) => {
              if (result.kind === 'error' || result.kind === 'pending') notify(result);
            });
          }}
        >
          <Text style={[styles.link, disabled && styles.disabled]}>Aboneliği yönet</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={billing.busy}
          style={styles.linkButton}
          onPress={() => {
            void refresh();
          }}
        >
          <Text style={styles.link}>Durumu yenile</Text>
        </Pressable>
      </View>
      <Text style={styles.finePrint}>
        Aylık ve yıllık planlar mağazadan iptal edilmedikçe yenilenir. Ömür boyu plan tek
        seferliktir. Toplam fiyat ve satın alma koşulları mağazanın onay ekranında gösterilir.
      </Text>
      <Pressable
        accessibilityRole="link"
        style={styles.linkButton}
        onPress={() => router.push('/legal')}
      >
        <Text style={styles.link}>Kullanım koşulları ve gizlilik</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,196,0,0.31)',
  },
  title: { ...typography.h3, color: colors.textPrimary, marginTop: 12, marginBottom: 8 },
  text: { ...typography.caption, color: colors.textSecondary, lineHeight: 19 },
  test: { ...typography.label, color: colors.accentYellow, marginBottom: 8 },
  warning: { ...typography.caption, color: colors.accentYellow, lineHeight: 19, marginTop: 10 },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
    borderColor: colors.border,
    borderWidth: 1,
    minHeight: 68,
  },
  planDescription: { flex: 1 },
  planTitle: { ...typography.label, color: colors.textPrimary, marginBottom: 3 },
  price: { ...typography.label, color: colors.accentYellow, flexShrink: 1 },
  primary: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.accentYellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingHorizontal: 12,
  },
  primaryText: { ...typography.label, color: colors.background },
  links: { marginTop: 8 },
  linkButton: { minHeight: 44, justifyContent: 'center' },
  link: { ...typography.label, color: colors.accentYellow },
  finePrint: { ...typography.caption, color: colors.textMuted, lineHeight: 18, marginTop: 10 },
  disabled: { opacity: 0.45 },
});
