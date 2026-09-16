import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MOBILE_PRO_PRICE_POLICY, expectedTryPriceMatches } from './billing-policy';
import { ProPaywallView } from './ProPaywallView';
import { toDisplayPlans } from './paywall-display';
import { useRevenueCat } from './revenuecat';
import type { BillingResult } from './revenuecat-client';
import { planById, plansFromOffering, preferredPlanId, type ProPlanId } from './paywall-model';

/** Real purchase controller. Never falls back to screenshot/demo packages. */
export function CustomProPaywall() {
  const router = useRouter();
  const billing = useRevenueCat();
  const plans = useMemo(() => plansFromOffering(billing.offering), [billing.offering]);
  const displayPlans = useMemo(() => toDisplayPlans(plans), [plans]);
  const [selected, setSelected] = useState<ProPlanId | null>(null);
  const selectedPlan = planById(plans, selected) ?? planById(plans, preferredPlanId(plans));
  const resolvedSelected = selectedPlan?.id ?? null;
  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/credits' as never);
  }, [router]);
  const notify = useCallback(
    (result: BillingResult, restoring = false) => {
      if (result.kind === 'cancelled') return;
      if (result.kind === 'pending' || result.kind === 'error') {
        Alert.alert(result.kind === 'pending' ? 'Onay bekleniyor' : 'BirKare Pro', result.message);
        return;
      }
      if (result.isPro) {
        Alert.alert(
          'BirKare Pro',
          restoring ? 'Pro erişiminiz geri yüklendi.' : 'Pro erişiminiz aktif.',
          [{ text: 'Tamam', onPress: close }],
        );
      } else {
        Alert.alert(
          'BirKare Pro',
          restoring
            ? 'Bu hesapta aktif Pro hakkı bulunamadı. Satın aldığınız hesapla giriş yaptığınızdan emin olun.'
            : 'İşlem tamamlandı ancak Pro hakkı henüz doğrulanamadı. Tekrar satın almayın; durumu yenileyin.',
        );
      }
    },
    [close],
  );
  const purchase = async () => {
    if (!billing.ready || billing.busy) return;
    if (billing.isPro) {
      const result = await billing.presentCustomerCenter();
      if (result.kind === 'error' || result.kind === 'pending') notify(result);
      return;
    }
    const plan = selectedPlan;
    if (!plan) return;
    notify(await billing.purchase(plan.package));
  };
  const expiredAt = billing.entitlement?.expirationDate;
  const date =
    expiredAt && Number.isFinite(Date.parse(expiredAt))
      ? new Date(expiredAt).toLocaleDateString('tr-TR')
      : null;
  const activeNote = date
    ? `${billing.entitlement?.willRenew ? 'Yenileme' : 'Erişim bitişi'}: ${date}`
    : 'Kalıcı Pro erişimi · AI üretimleri kredi kullanır.';
  const priceMismatch =
    billing.appEnv !== 'production'
      ? plans.find(
          (plan) =>
            !expectedTryPriceMatches(
              plan.package.product.price,
              plan.package.product.currencyCode,
              MOBILE_PRO_PRICE_POLICY[plan.id],
            ),
        )
      : undefined;
  const priceWarning = priceMismatch
    ? `${priceMismatch.label} App Store fiyatı politika ile eşleşmiyor. Beklenen TRY fiyatı ₺${MOBILE_PRO_PRICE_POLICY[
        priceMismatch.id
      ].toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
    : null;
  const status =
    priceWarning ||
    billing.error ||
    (!billing.ready
      ? billing.status === 'signed_out'
        ? 'Paketleri satın almak için hesabınıza giriş yapın.'
        : 'Mağaza bağlantısı hazırlanıyor…'
      : plans.length === 0 && !billing.isPro
        ? 'birkare_pro teklifindeki ürünler bulunamadı.'
        : null);
  return (
    <View style={s.modal} testID="pro-bottom-sheet-host">
      <Pressable
        testID="pro-sheet-backdrop"
        accessibilityRole="button"
        accessibilityLabel="Pro ekranını kapat"
        onPress={close}
        style={s.backdrop}
      />
      <View testID="pro-bottom-sheet" accessibilityViewIsModal style={s.sheet}>
        <ProPaywallView
          sheet
          plans={displayPlans}
          selected={resolvedSelected}
          onSelect={setSelected}
          onClose={close}
          onBuy={() => {
            void purchase();
          }}
          onRestore={() => {
            void billing.restore().then((result) => notify(result, true));
          }}
          onTerms={() => router.push('/legal/terms' as never)}
          onPrivacy={() => router.push('/legal/privacy' as never)}
          busy={billing.busy}
          active={billing.isPro}
          activeNote={activeNote}
          disabled={!billing.ready || (!billing.isPro && !selectedPlan)}
          restoreDisabled={!billing.ready}
          banner={billing.testEnvironmentLabel ?? undefined}
          message={
            <View>
              {status ? (
                <Text accessibilityRole="alert" style={s.message}>
                  {status}
                </Text>
              ) : null}
              {billing.error ? (
                <Pressable
                  onPress={() => {
                    void billing.refresh();
                  }}
                  disabled={billing.busy}
                  style={s.link}
                  accessibilityRole="button"
                >
                  <Text style={s.linkText}>Tekrar dene</Text>
                </Pressable>
              ) : null}
            </View>
          }
        />
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  sheet: {
    height: '94%',
    overflow: 'hidden',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,215,120,0.34)',
    backgroundColor: '#050505',
    shadowColor: '#000',
    shadowOpacity: 0.68,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -12 },
    elevation: 24,
  },
  message: { color: '#E0C17A', fontSize: 12, lineHeight: 18, textAlign: 'center', padding: 8 },
  link: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  linkText: { color: '#B5A3C9', fontSize: 11, textDecorationLine: 'underline' },
});
