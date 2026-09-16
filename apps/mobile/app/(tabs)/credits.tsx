import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { apiRequest } from '@/api/client';
import { AppHeader, CreditBadge, GlassSurface, Icon } from '@/components';
import { accountQueryKey } from '@/features/auth/account-query-cache';
import { useAuthStore } from '@/features/auth/auth-store';
import { SubscriptionCard } from '@/features/billing/SubscriptionCard';
import { MOBILE_CREDIT_PRODUCTS, expectedTryPriceMatches } from '@/features/billing/billing-policy';
import { useRevenueCat } from '@/features/billing/revenuecat';
import {
  CREDIT_WALLET_QUERY_KEY,
  useAvailableCredits,
  useCreditTransactions,
} from '@/features/billing/use-wallet';
import {
  settledCreditHistory,
  transactionIcon,
  transactionStatus,
  transactionTitle,
} from '@/features/billing/transaction-presentation';
import { colors, layout, radii, spacing, typography } from '@/theme';

const packPresentation = {
  'credits.20': {
    note: 'Tek seferlik · Süresiz kredi',
    icon: 'albums-outline' as const,
    featured: false,
  },
  'credits.60': {
    note: 'En çok tercih edilen',
    icon: 'diamond-outline' as const,
    featured: true,
  },
  'credits.150': {
    note: 'En yüksek kredi paketi',
    icon: 'camera-outline' as const,
    featured: false,
  },
} as const;

type RevenueCatSyncResponse = {
  creditPackCreditsGranted?: number;
};

export default function CreditsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const billing = useRevenueCat();
  const userId = useAuthStore((store) => store.user?.id);
  const availableCredits = useAvailableCredits();
  const transactionQuery = useCreditTransactions();
  const approximateStandardGenerations = Math.floor(availableCredits / 4);
  const transactions = useMemo(
    () => settledCreditHistory(transactionQuery.data?.items ?? [], 4),
    [transactionQuery.data?.items],
  );
  const productsById = useMemo(
    () => new Map(billing.creditProducts.map((product) => [product.identifier, product])),
    [billing.creditProducts],
  );

  async function purchaseCredits(productId: string, credits: number) {
    const product = productsById.get(productId);
    if (!product) {
      Alert.alert(
        'Kredi paketi bulunamadı',
        'Bu ürün App Store / RevenueCat kataloğundan alınamadı. Ürün ID ve mağaza durumunu kontrol edin.',
      );
      return;
    }
    const result = await billing.purchaseCredit(product);
    if (result.kind === 'cancelled') return;
    if (result.kind === 'pending' || result.kind === 'error') {
      Alert.alert(result.kind === 'pending' ? 'Onay bekleniyor' : 'Kredi satın alma', result.message);
      return;
    }
    try {
      const sync = await apiRequest<RevenueCatSyncResponse>('/v1/billing/revenuecat/sync', {
        method: 'POST',
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: accountQueryKey(CREDIT_WALLET_QUERY_KEY, userId),
        }),
        queryClient.invalidateQueries({
          queryKey: accountQueryKey(['credit-transactions'], userId),
        }),
      ]);
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: accountQueryKey(CREDIT_WALLET_QUERY_KEY, userId),
          type: 'active',
        }),
        transactionQuery.refetch(),
      ]);
      Alert.alert(
        'Krediler hazır',
        sync.creditPackCreditsGranted && sync.creditPackCreditsGranted > 0
          ? `${sync.creditPackCreditsGranted} kredi hesabınıza eklendi.`
          : `${credits} kredilik satın alma doğrulandı. Bakiyeniz yenilendi.`,
      );
    } catch {
      Alert.alert(
        'Satın alma alındı',
        'Mağaza işlemi tamamlandı. Sunucu doğrulaması henüz sonuçlanmadıysa tekrar satın almayın; bakiye kısa süre içinde RevenueCat üzerinden eşitlenecek.',
      );
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.topArc} />
        <View style={styles.bottomArc} />
      </View>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centered}>
          <AppHeader
            title="Krediler"
            subtitle="Üretim gücünüz"
            right={<CreditBadge credits={availableCredits} />}
          />

          <LinearGradient
            colors={['#17140D', '#100E0B', '#372708']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <View style={styles.balanceCopy}>
              <Text style={styles.balanceEyebrow}>MEVCUT BAKİYE</Text>
              <Text style={styles.balance}>
                <Text style={styles.balanceNumber}>{availableCredits}</Text> kredi
              </Text>
              <Text style={styles.balanceText}>
                Yaklaşık {approximateStandardGenerations} standart üretim için yeterli.
              </Text>
            </View>
            <LinearGradient colors={['#21180A', '#5A3A00']} style={styles.balanceIcon}>
              <Icon name="flash" size={38} color={colors.accentYellow} />
            </LinearGradient>
          </LinearGradient>

          <SubscriptionCard />

          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Kredi </Text>
            <Text style={styles.sectionTitleGold}>paketleri</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Fiyatlar App Store / RevenueCat üzerinden canlı gelir. Kredi miktarı backend politikasıdır.
          </Text>
          {billing.testEnvironmentLabel ? (
            <Text style={styles.testBanner}>{billing.testEnvironmentLabel}</Text>
          ) : null}

          <View style={styles.packList}>
            {MOBILE_CREDIT_PRODUCTS.map((pack) => {
              const presentation = packPresentation[pack.id];
              const product = productsById.get(pack.productId);
              const price = product?.priceString ?? (billing.ready ? 'Mağazada yok' : 'Yükleniyor…');
              const priceMismatch =
                billing.appEnv !== 'production' &&
                product &&
                !expectedTryPriceMatches(product.price, product.currencyCode, pack.expectedTryPrice);
              const disabled = billing.busy || !billing.ready || !product;
              return (
                <GlassSurface
                  key={pack.id}
                  tone={presentation.featured ? 'iridescent' : 'gold'}
                  selected={presentation.featured}
                  radius={24}
                  style={presentation.featured ? styles.packGlow : undefined}
                  contentStyle={styles.pack}
                >
                  {presentation.featured ? (
                    <LinearGradient colors={['#6D18D9', '#9C25E8']} style={styles.packPopular}>
                      <Text style={styles.packPopularText}>EN ÇOK SEÇİLEN</Text>
                    </LinearGradient>
                  ) : null}
                  <View style={[styles.packIcon, presentation.featured && styles.packIconFeatured]}>
                    <Icon name={presentation.icon} size={30} color="#FFD866" />
                  </View>
                  <View style={styles.packCopy}>
                    <Text style={styles.packTitle}>{pack.label}</Text>
                    <Text style={styles.packCredits}>{pack.credits} kredi</Text>
                    <Text style={styles.packNote}>{presentation.note}</Text>
                    {priceMismatch ? (
                      <Text style={styles.priceWarning}>
                        Test uyarısı: mağaza fiyatı politika ile eşleşmiyor. Beklenen TRY fiyatı ₺
                        {pack.expectedTryPrice.toLocaleString('tr-TR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}.
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.packAction}>
                    <Text style={styles.packPrice}>{price}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${pack.label}, ${pack.credits} kredi, ${price}`}
                      accessibilityState={{ disabled }}
                      disabled={disabled}
                      onPress={() => void purchaseCredits(pack.productId, pack.credits)}
                      style={({ pressed }) => [
                        styles.select,
                        disabled && styles.disabled,
                        pressed && !disabled && styles.pressed,
                      ]}
                    >
                      <LinearGradient
                        colors={['#FFE49A', '#F5B91C']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.selectFill}
                      >
                        <Text style={styles.selectText}>{billing.busy ? 'İşleniyor' : 'Satın al'}</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </GlassSurface>
              );
            })}
          </View>

          {billing.ready && billing.creditProducts.length !== MOBILE_CREDIT_PRODUCTS.length ? (
            <Text accessibilityRole="alert" style={styles.catalogWarning}>
              Kredi ürünlerinin tamamı mağazadan gelmedi. RevenueCat / App Store Connect içinde
              com.birkareai.credits.20, .60 ve .150 ürünlerini kontrol edin.
            </Text>
          ) : null}

          <View style={styles.historyHeading}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Hesap </Text>
              <Text style={styles.sectionTitleGold}>hareketleri</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tüm hesap hareketlerini gör"
              onPress={() => router.push('/transactions' as never)}
              style={({ pressed }) => [styles.historyAll, pressed && styles.pressed]}
            >
              <Text style={styles.historyAllText}>Tümünü gör</Text>
              <Icon name="chevron-forward" size={15} color={colors.accentYellow} />
            </Pressable>
          </View>
          <GlassSurface tone="iridescent" radius={24} contentStyle={styles.history}>
            {transactions.length ? (
              transactions.map((item, index) => (
                <View
                  key={item.id}
                  style={[styles.historyRow, index === transactions.length - 1 && styles.lastRow]}
                >
                  <View style={styles.historyIcon}>
                    <Icon name={transactionIcon(item.type)} size={23} color="#FFDD78" />
                  </View>
                  <View style={styles.historyCopy}>
                    <Text style={styles.historyTitle}>{transactionTitle(item)}</Text>
                    <Text style={styles.historyDetail}>
                      {new Date(item.createdAt).toLocaleDateString('tr-TR')} ·{' '}
                      {transactionStatus(item.status)}
                    </Text>
                  </View>
                  <Text style={[styles.historyValue, item.amount > 0 && styles.positive]}>
                    {item.amount > 0 ? '+' : '−'}
                    {Math.abs(item.amount)}
                  </Text>
                </View>
              ))
            ) : (
              <Pressable
                disabled={!transactionQuery.isError}
                onPress={() => void transactionQuery.refetch()}
                style={styles.emptyHistory}
              >
                <Icon name="receipt-outline" size={24} color={colors.accentYellow} />
                <Text style={styles.historyTitle}>
                  {transactionQuery.isLoading
                    ? 'Hareketler yükleniyor…'
                    : transactionQuery.isError
                      ? 'Hareketler alınamadı · Yeniden dene'
                      : 'Henüz kredi hareketi yok'}
                </Text>
              </Pressable>
            )}
          </GlassSurface>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
  screen: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 44 },
  centered: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
  topArc: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 165,
    borderWidth: 2,
    borderColor: 'rgba(255,196,0,.3)',
    top: -230,
    right: -165,
    shadowColor: '#FFB900',
    shadowOpacity: 0.5,
    shadowRadius: 22,
  },
  bottomArc: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    borderWidth: 2,
    borderColor: 'rgba(160,48,255,.25)',
    bottom: -315,
    right: -210,
  },
  balanceCard: {
    minHeight: 132,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,207,61,.55)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  balanceCopy: { flex: 1, paddingRight: 10 },
  balanceEyebrow: { ...typography.overline, color: colors.accentYellow, fontSize: 10 },
  balance: { ...typography.h3, color: colors.textPrimary, marginTop: 4 },
  balanceNumber: { fontSize: 42, lineHeight: 46, fontWeight: '900' },
  balanceText: { ...typography.caption, color: colors.textSecondary, marginTop: 7 },
  balanceIcon: {
    width: 70,
    height: 70,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,218,113,.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleRow: { flexDirection: 'row', marginTop: 34, alignItems: 'baseline' },
  historyHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  historyAll: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 8 },
  historyAllText: { ...typography.caption, color: colors.accentYellow, fontWeight: '700' },
  sectionTitle: { ...typography.h1, color: colors.textPrimary },
  sectionTitleGold: { ...typography.h1, color: '#FFD86B' },
  sectionSubtitle: { ...typography.body, color: colors.textSecondary, marginTop: 5 },
  testBanner: {
    ...typography.overline,
    color: colors.accentYellow,
    borderWidth: 1,
    borderColor: 'rgba(255,215,120,.34)',
    borderRadius: 10,
    padding: 8,
    marginTop: 10,
    textAlign: 'center',
  },
  packList: { gap: 12, marginTop: 18 },
  packGlow: { shadowColor: '#B34DFF', shadowOpacity: 0.3, shadowRadius: 18 },
  pack: {
    minHeight: 126,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  packPopular: {
    position: 'absolute',
    right: 10,
    top: 0,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderBottomLeftRadius: 13,
    borderBottomRightRadius: 13,
  },
  packPopularText: { ...typography.overline, fontSize: 8, color: '#F8EBFF' },
  packIcon: {
    width: 60,
    height: 60,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,214,104,.55)',
    backgroundColor: '#17120B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packIconFeatured: { borderColor: '#B64EFF' },
  packCopy: { flex: 1, minWidth: 0 },
  packTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  packCredits: { ...typography.h2, color: '#FFD76C', marginTop: 1 },
  packNote: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
  priceWarning: { color: '#FFB36B', fontSize: 9, lineHeight: 13, marginTop: 4 },
  packAction: { alignItems: 'flex-end', justifyContent: 'center', gap: 9 },
  packPrice: { ...typography.bodyStrong, color: colors.textPrimary, textAlign: 'right' },
  select: { borderRadius: 15, overflow: 'hidden', minWidth: 86 },
  selectFill: {
    minHeight: 42,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectText: { ...typography.bodyStrong, color: '#100D06' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.78 },
  catalogWarning: {
    ...typography.caption,
    color: '#FFB36B',
    lineHeight: 18,
    marginTop: 12,
    textAlign: 'center',
  },
  history: { paddingHorizontal: 16 },
  historyRow: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,.13)',
  },
  lastRow: { borderBottomWidth: 0 },
  historyIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#21190B',
    borderWidth: 1,
    borderColor: 'rgba(255,206,71,.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyCopy: { flex: 1, minWidth: 0 },
  historyTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  historyDetail: { ...typography.caption, color: colors.textSecondary, marginTop: 3 },
  historyValue: { ...typography.h3, color: '#AAA4C8' },
  positive: { color: '#79E66D' },
  emptyHistory: { minHeight: 100, flexDirection: 'row', gap: 12, alignItems: 'center' },
});
