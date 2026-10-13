import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { accountQueryKey } from '@/features/auth/account-query-cache';
import { useAuthStore } from '@/features/auth/auth-store';
import { useCopy } from '@/features/settings/language-store';
import { useProductStudioCatalog } from '@/features/studio/useProductStudioCatalog';
import { getLocale as getAppLocale, tr as translateCopy } from '@/i18n/engine';
import { brand } from '@/theme/brand';
import { MOBILE_CREDIT_PRODUCTS, expectedTryPriceMatches } from './billing-policy';
import { syncBilling, useRevenueCat } from './revenuecat';
import { CREDIT_WALLET_QUERY_KEY } from './use-wallet';

/** Used for the "about N" estimates only until the server's scene prices have loaded. */
const FALLBACK_ALTERNATIVE_CREDITS = 5;
const FEATURED_PACK_ID = 'credits.60';

/** Credits one standard image costs: the cheapest scene, so estimates never over-promise. */
export function useStandardImageCredits(): number {
  const { productScenes } = useProductStudioCatalog();
  const cheapest = Math.min(
    ...productScenes.map((scene) => scene.creditCost).filter((cost) => cost > 0),
  );
  return Number.isFinite(cheapest) && cheapest > 0 ? cheapest : FALLBACK_ALTERNATIVE_CREDITS;
}

/**
 * The three credit packs with live store prices. Every buy button goes through
 * one guarded purchase: a second tap while the store sheet is open does nothing.
 */
export function CreditPackList({ onPurchased }: { onPurchased?: () => void }) {
  const copy = useCopy();
  const queryClient = useQueryClient();
  const billing = useRevenueCat();
  const userId = useAuthStore((store) => store.user?.id);
  const standardAlternativeCredits = useStandardImageCredits();
  const purchasing = useRef(false);
  const productsById = useMemo(
    () => new Map(billing.creditProducts.map((product) => [product.identifier, product])),
    [billing.creditProducts],
  );

  async function purchaseCredits(productId: string, credits: number) {
    if (purchasing.current) return;
    const product = productsById.get(productId);
    if (!product) {
      Alert.alert(
        translateCopy('Kredi paketi bulunamadı'),
        translateCopy('Bu paket şu anda mağazada kullanılamıyor. Lütfen biraz sonra tekrar dene.'),
      );
      return;
    }
    purchasing.current = true;
    let result;
    try {
      result = await billing.purchaseCredit(product);
    } finally {
      purchasing.current = false;
    }
    if (result.kind === 'cancelled') return;
    if (result.kind === 'pending' || result.kind === 'error') {
      Alert.alert(
        result.kind === 'pending'
          ? translateCopy('Onay bekleniyor')
          : translateCopy('Kredi satın alma'),
        result.message,
      );
      return;
    }
    try {
      // The customer has paid: retry a failed sync before telling them to wait.
      const sync = await syncBilling([2_000, 5_000, 15_000]);
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
        queryClient.refetchQueries({
          queryKey: accountQueryKey(['credit-transactions'], userId),
          type: 'active',
        }),
      ]);
      Alert.alert(
        translateCopy('Krediler hazır'),
        sync.creditPackCreditsGranted && sync.creditPackCreditsGranted > 0
          ? translateCopy('{{p0}} kredi hesabınıza eklendi.', { p0: sync.creditPackCreditsGranted })
          : translateCopy('{{p0}} kredilik satın alma doğrulandı. Bakiyeniz yenilendi.', {
              p0: credits,
            }),
      );
      onPurchased?.();
    } catch {
      Alert.alert(
        translateCopy('Satın alma alındı'),
        translateCopy(
          'Mağaza işlemi tamamlandı. Bakiyen birkaç dakika içinde güncellenecek; lütfen tekrar satın alma.',
        ),
      );
    }
  }

  // Savings are derived from the live store prices, never from a hard-coded claim.
  const basePack = MOBILE_CREDIT_PRODUCTS[0];
  const baseProduct = productsById.get(basePack.productId);
  const baseUnitPrice = baseProduct ? baseProduct.price / basePack.credits : null;
  function savingLabel(price: number | undefined, credits: number): string | null {
    if (!baseUnitPrice || typeof price !== 'number') return null;
    const saving = 1 - price / credits / baseUnitPrice;
    if (!Number.isFinite(saving) || saving < 0.01) return null;
    const percent = new Intl.NumberFormat(getAppLocale(), {
      maximumFractionDigits: 0,
      style: 'percent',
    }).format(saving);
    return copy(`${percent} avantajlı`, `Save ${percent}`);
  }
  return (
    <View style={styles.packs}>
      {MOBILE_CREDIT_PRODUCTS.map((pack) => {
        const featured = pack.id === FEATURED_PACK_ID;
        const product = productsById.get(pack.productId);
        const price = product?.priceString ?? null;
        const saving = savingLabel(product?.price, pack.credits);
        const alternatives = Math.floor(pack.credits / standardAlternativeCredits);
        const priceMismatch =
          billing.appEnv !== 'production' &&
          product &&
          !expectedTryPriceMatches(product.price, product.currencyCode, pack.expectedTryPrice);
        const disabled = billing.busy || !billing.ready || !product;
        return (
          <View key={pack.id} style={[styles.pack, featured && styles.packFeatured]}>
            <View style={styles.packCopy}>
              <View style={styles.packNameRow}>
                <Text style={styles.packName}>{translateCopy(pack.label)}</Text>
                {featured ? (
                  <View style={styles.packBadge}>
                    <Text style={styles.packBadgeText}>
                      {translateCopy('En çok tercih edilen')}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.amount}>
                <Text style={styles.packCredits}>{pack.credits}</Text>
                <Text style={styles.packUnit}>{translateCopy('kredi')}</Text>
              </View>
              <Text style={styles.packNote}>
                {copy(
                  `Yaklaşık ${alternatives} standart alternatif`,
                  `About ${alternatives} standard alternatives`,
                )}
              </Text>
              {saving ? <Text style={styles.packSaving}>{saving}</Text> : null}
              {priceMismatch ? (
                <Text style={styles.packNote}>
                  {translateCopy(
                    'Test uyarısı: mağaza fiyatı politika ile eşleşmiyor. Beklenen TRY fiyatı ₺ {{p0}}.',
                    {
                      p0: pack.expectedTryPrice.toLocaleString(getAppLocale(), {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }),
                    },
                  )}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityLabel={translateCopy('{{p0}}, {{p1}} kredi, {{p2}}', {
                p0: translateCopy(pack.label),
                p1: pack.credits,
                p2: price ?? '',
              })}
              accessibilityRole="button"
              accessibilityState={{ busy: billing.busy, disabled }}
              disabled={disabled}
              hitSlop={4}
              onPress={() => void purchaseCredits(pack.productId, pack.credits)}
              style={({ pressed }) => [
                styles.buy,
                featured && styles.buyFeatured,
                disabled && styles.disabled,
                pressed && !disabled && styles.pressed,
              ]}
            >
              {billing.busy || !billing.ready ? (
                <ActivityIndicator color={featured ? brand.onGold : brand.text} size="small" />
              ) : (
                <Text style={[styles.buyText, featured && styles.buyTextFeatured]}>
                  {price ?? translateCopy('Mağazada yok')}
                </Text>
              )}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  amount: { alignItems: 'baseline', flexDirection: 'row', gap: 6 },
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
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.65 },
});
