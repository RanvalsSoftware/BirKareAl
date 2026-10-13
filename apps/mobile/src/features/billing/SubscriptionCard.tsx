import { useLanguageRevision } from '@/i18n/use-language';
import { getLocale as getAppLocale } from '@/i18n/engine';
import { tr as translateCopy } from '@/i18n/engine';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { brand } from '@/theme/brand';
import { Group, PrimaryAction, SecondaryAction, StatusPill } from '@/ui/kit';
import { useRevenueCat } from './revenuecat';
import type { BillingResult } from './revenuecat-client';

function notify(result: BillingResult, restoring = false) {
  if (result.kind === 'cancelled') return;
  if (result.kind === 'pending' || result.kind === 'error') {
    Alert.alert(result.kind === 'pending' ? translateCopy("Onay bekleniyor") : 'BirKare Pro', result.message);
    return;
  }
  Alert.alert(
    'BirKare Pro',
    result.isPro
      ? restoring
        ? translateCopy("Pro erişiminiz geri yüklendi.")
        : translateCopy("Pro erişiminiz aktif.")
      : translateCopy("Bu hesap için aktif Pro hakkı bulunamadı. Yeni bir ödeme yaptıysanız tekrar satın almayın; biraz sonra durumu yenileyin."),
  );
}

export function SubscriptionCard() {
  const languageRevision = useLanguageRevision();

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
      ? new Date(expiration).toLocaleDateString(getAppLocale())
      : null;
  const cancelled = billing.subscriptionCancelled;
  const disabled = billing.busy || (!billing.ready && billing.status !== 'connecting');

  const badgeLabel = cancelled
    ? translateCopy("BirKare Pro · İptal edildi")
    : billing.isPro
      ? 'BirKare Pro · Aktif'
      : 'BirKare Pro';

  const title = cancelled
    ? translateCopy("Aboneliğiniz iptal edildi.")
    : billing.isPro
      ? translateCopy("Pro hesabınız hazır.")
      : translateCopy("Üretimini planla.");

  const description = cancelled
    ? expiresText
      ? translateCopy("Pro erişiminiz {{p0}} tarihine kadar devam eder. Bu tarihten sonra otomatik yenileme yapılmaz.", { p0: expiresText })
      : translateCopy("Otomatik yenileme kapatıldı.")
    : billing.isPro
      ? expiresText
        ? translateCopy('{{p0}}: {{p1}}', { p0: translateCopy(billing.entitlement?.willRenew ? 'Yenileme tarihi' : 'Erişim bitişi'), p1: expiresText })
        : translateCopy("Süresiz Pro erişimi · Otomatik yenileme yok.")
      : translateCopy("Aylık, yıllık veya ömür boyu seçeneklerini mağazanın güncel koşullarıyla incele.");

  return (
    <Group padding={20} style={styles.card}>
      <StatusPill>{badgeLabel}</StatusPill>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{description}</Text>

      {cancelled ? (
        <View accessibilityRole="alert" style={styles.cancelledBox}>
          <Ionicons name="close-circle" size={18} color={brand.danger} />
          <Text style={styles.cancelledText}>{expiresText ? translateCopy('İptal edildi · {{p0}} tarihine kadar kullanabilirsiniz.', { p0: expiresText }) : translateCopy('İptal edildi')}</Text>
        </View>
      ) : null}

      {billing.testEnvironmentLabel ? (
        <Text style={styles.test}>{billing.testEnvironmentLabel}</Text>
      ) : null}
      {billing.status === 'connecting' ? (
        <Text style={styles.text}>{translateCopy("Mağaza hazırlanıyor…")}</Text>
      ) : null}
      {billing.error ? (
        <Text accessibilityRole="alert" style={styles.text}>
          {billing.error}
        </Text>
      ) : null}

      {!billing.isPro ? (
        billing.error ? (
          <SecondaryAction
            icon="refresh"
            label={translateCopy('Fiyatları yeniden yükle')}
            loading={billing.busy}
            onPress={() => void billing.refreshFresh()}
          />
        ) : (
          <PrimaryAction
            label={translateCopy("Pro’yu incele")}
            onPress={() => router.push('/pro' as never)}
            trailingIcon="arrow-forward"
          />
        )
      ) : (
        <SecondaryAction
          disabled={disabled}
          label={billing.busy ? translateCopy("Mağaza güncelleniyor…") : translateCopy("Aboneliği yönet")}
          onPress={() => {
            void billing.presentCustomerCenter().then(async (result) => {
              if (result.kind === 'error' || result.kind === 'pending') {
                notify(result);
                return;
              }
              await billing.refreshFresh();
            });
          }}
        />
      )}
    </Group>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  title: { color: brand.text, fontSize: 22, fontWeight: '600', lineHeight: 28 },
  text: { color: brand.textSecondary, fontSize: 14, lineHeight: 20 },
  cancelledBox: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  cancelledText: { color: brand.danger, flex: 1, fontSize: 13, lineHeight: 18 },
  test: { color: brand.textMuted, fontSize: 11, lineHeight: 15 },
});
