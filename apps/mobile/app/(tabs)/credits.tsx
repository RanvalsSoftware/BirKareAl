import { useLanguageRevision } from '@/i18n/use-language';
import { tr as translateCopy } from '@/i18n/engine';
import { useMemo } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useCopy } from '@/features/settings/language-store';
import { useProductStudioCatalog } from '@/features/studio/useProductStudioCatalog';
import { CreditPackList, useStandardImageCredits } from '@/features/billing/CreditPacks';
import { SubscriptionCard } from '@/features/billing/SubscriptionCard';
import { MOBILE_CREDIT_PRODUCTS } from '@/features/billing/billing-policy';
import { useRevenueCat } from '@/features/billing/revenuecat';
import { useAvailableCredits, useCreditTransactions } from '@/features/billing/use-wallet';
import { settledCreditHistory } from '@/features/billing/transaction-presentation';
import { brand } from '@/theme/brand';
import {
  BrandNav,
  Group,
  Hint,
  Page,
  Row,
  SectionLabel,
  Separator,
  TabHeader,
  useLayout,
} from '@/ui/kit';

export default function CreditsScreen() {
  const languageRevision = useLanguageRevision();

  const router = useRouter();
  const billing = useRevenueCat();
  const availableCredits = useAvailableCredits();
  const transactionQuery = useCreditTransactions();
  const copy = useCopy();
  const { wide } = useLayout();
  const { hdExtraCredits, previewCredits } = useProductStudioCatalog();
  const standardAlternativeCredits = useStandardImageCredits();
  const spendOptions = [
    { label: copy('Önizleme', 'Preview'), cost: Math.max(1, previewCredits) },
    { label: copy('Standart', 'Standard'), cost: standardAlternativeCredits },
    { label: 'HD', cost: standardAlternativeCredits + hdExtraCredits },
  ];
  const transactions = useMemo(
    () => settledCreditHistory(transactionQuery.data?.items ?? [], 4),
    [transactionQuery.data?.items, languageRevision],
  );

  const restore = () =>
    void billing.restore().then((result) => {
      if (result.kind === 'cancelled') return;
      Alert.alert(
        translateCopy('Satın alımları geri yükle'),
        result.kind === 'completed'
          ? translateCopy('Satın alımların kontrol edildi ve hesabın güncellendi.')
          : result.message,
      );
    });

  const balance = (
    <View style={styles.balance}>
      <Text style={styles.balanceLabel}>{translateCopy('Kullanılabilir bakiye')}</Text>
      <View
        accessibilityLabel={translateCopy('{{p0}} kredi', { p0: availableCredits })}
        accessible
        style={styles.amount}
      >
        <Text style={styles.balanceNumber}>{availableCredits}</Text>
        <Text style={styles.balanceUnit}>{translateCopy('kredi')}</Text>
      </View>
      <View style={styles.balanceDivider} />
      <Text style={styles.buysLabel}>
        {copy('Bu bakiyeyle üretebileceğin görsel sayısı', 'Images this balance can produce')}
      </Text>
      <View style={styles.buys}>
        {spendOptions.map((option) => (
          <View
            accessibilityLabel={`${option.label}: ${Math.floor(availableCredits / option.cost)}`}
            accessible
            key={option.label}
            style={styles.buysItem}
          >
            <Text style={styles.buysCount}>{Math.floor(availableCredits / option.cost)}</Text>
            <Text style={styles.buysName}>{option.label}</Text>
            <Text style={styles.buysCost}>
              {copy(`${option.cost} kredi`, `${option.cost} credits`)}
            </Text>
          </View>
        ))}
      </View>
      <Hint>
        {copy(
          'Kesin tutar üretim öncesinde gösterilir.',
          'The exact cost is shown before you generate.',
        )}
      </Hint>
    </View>
  );

  const packs = (
    <>
      <SectionLabel trailing={copy('Tek seferlik · Süresiz', 'One-time · Never expire')}>
        {translateCopy('Kredi paketleri')}
      </SectionLabel>
      <CreditPackList />
      {billing.ready && billing.creditProducts.length !== MOBILE_CREDIT_PRODUCTS.length ? (
        <Hint style={styles.afterGroup}>
          {translateCopy(
            'Satın alma şu an kullanılamıyor. Fiyat ve paket bilgisi gelmeden ücret alınmaz.',
          )}
        </Hint>
      ) : null}
      <Hint style={styles.afterGroup}>
        {translateCopy('Fiyatlar mağazadan alınır ve satın almadan önce gösterilir.')}
      </Hint>
      {billing.testEnvironmentLabel ? (
        <Hint style={styles.afterGroup}>{billing.testEnvironmentLabel}</Hint>
      ) : null}
    </>
  );

  const account = (
    <>
      <Group>
        <Row
          disabled={billing.busy}
          icon="refresh-outline"
          onPress={restore}
          title={translateCopy('Satın alımları geri yükle')}
        />
        <Separator />
        <Row
          icon="receipt-outline"
          onPress={() => router.push('/transactions' as never)}
          title={translateCopy('İşlem geçmişi')}
          value={
            transactions.length
              ? `${transactions[0]!.amount > 0 ? '+' : '−'}${Math.abs(transactions[0]!.amount)}`
              : undefined
          }
        />
      </Group>
      <Hint>
        {translateCopy(
          'Satın alımlar Apple’ın standart lisans sözleşmesine tabidir. Koşullar ve gizlilik politikası Hesap › Ayarlar › Yasal bölümündedir.',
        )}
      </Hint>
    </>
  );

  return (
    <Page width="workspace">
      <BrandNav />
      <TabHeader title={translateCopy('Krediler')} />
      {wide ? (
        <View style={styles.split}>
          <View style={styles.column}>
            {balance}
            <SubscriptionCard />
          </View>
          <View style={styles.column}>
            {packs}
            {account}
          </View>
        </View>
      ) : (
        <>
          {balance}
          {packs}
          <SubscriptionCard />
          {account}
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  split: { alignItems: 'flex-start', flexDirection: 'row', gap: 32 },
  column: { flex: 1, gap: 20, minWidth: 0 },
  balance: { backgroundColor: brand.surface, borderRadius: 24, padding: 20 },
  balanceLabel: { color: brand.textSecondary, fontSize: 15, lineHeight: 20 },
  amount: { alignItems: 'baseline', flexDirection: 'row', gap: 6 },
  balanceNumber: {
    color: brand.text,
    fontSize: 60,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 68,
  },
  balanceUnit: { color: brand.textSecondary, fontSize: 20, fontWeight: '500' },
  balanceDivider: {
    backgroundColor: brand.line,
    height: StyleSheet.hairlineWidth * 2,
    marginBottom: 14,
    marginTop: 12,
  },
  buysLabel: { color: brand.textSecondary, fontSize: 13, lineHeight: 18 },
  buys: { flexDirection: 'row', gap: 8, marginBottom: 10, marginTop: 10 },
  buysItem: {
    backgroundColor: brand.surfaceRaised,
    borderRadius: 14,
    flex: 1,
    gap: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buysCount: {
    color: brand.gold,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    lineHeight: 28,
  },
  buysName: { color: brand.text, fontSize: 15, fontWeight: '500', lineHeight: 20 },
  buysCost: { color: brand.textSecondary, fontSize: 12, lineHeight: 16 },
  packs: { gap: 10 },
  pack: {
    alignItems: 'center',
    backgroundColor: brand.surface,
    borderColor: brand.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  packFeatured: { borderColor: brand.gold },
  packCopy: { flex: 1, gap: 2, minWidth: 0 },
  packNameRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  packName: { color: brand.textSecondary, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  packBadge: {
    backgroundColor: brand.goldTint,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  packBadgeText: { color: brand.goldLight, fontSize: 12, fontWeight: '600', lineHeight: 16 },
  packCredits: {
    color: brand.text,
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    lineHeight: 34,
  },
  packUnit: { color: brand.text, fontSize: 17, fontWeight: '500' },
  packNote: { color: brand.textSecondary, fontSize: 13, lineHeight: 18 },
  packSaving: { color: brand.success, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  buy: {
    alignItems: 'center',
    backgroundColor: brand.surfaceSoft,
    borderRadius: 100,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 96,
    paddingHorizontal: 16,
  },
  buyFeatured: { backgroundColor: brand.gold },
  buyText: {
    color: brand.text,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  buyTextFeatured: { color: brand.onGold },
  afterGroup: { marginTop: -8 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.65 },
});
