import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ProPaywallView, type ProPlanDisplay } from './ProPaywallView';
import type { ProPlanId } from './paywall-model';

// Deliberately not PurchasesPackage values. No SDK/API/auth/wallet import here.
const PREVIEW_PLANS: readonly ProPlanDisplay[] = [
  { id: 'monthly', label: 'Aylık', price: '₺299,99', period: '/ ay', note: 'Her ay 80 kredi' },
  {
    id: 'annual',
    label: 'Yıllık',
    price: '₺2.499,99',
    period: '/ yıl',
    note: 'Her ay 80 kredi',
    monthlyEquivalent: 'Aylık karşılığı ₺208,33',
    badge: 'En avantajlı',
  },
  {
    id: 'lifetime',
    label: 'Ömür Boyu',
    price: '₺4.999,99',
    period: 'tek sefer',
    note: '200 başlangıç kredisi · Kalıcı Pro',
  },
];
export function ProPaywallPreview({ initialPlan = 'lifetime' }: { initialPlan?: ProPlanId }) {
  const router = useRouter();
  const [selected, setSelected] = useState<ProPlanId>(initialPlan);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/' as never));
  const explain = () =>
    Alert.alert(
      'Tasarım önizlemesi',
      'Bu ekran ödeme başlatmaz, Pro erişimi açmaz ve kredi yüklemez. Fiyatlar örnek verilerdir.',
    );
  return (
    <ProPaywallView
      preview
      plans={PREVIEW_PLANS}
      selected={selected}
      onSelect={setSelected}
      onClose={close}
      onBuy={explain}
      onRestore={explain}
      onTerms={() => router.push('/legal/terms' as never)}
      onPrivacy={() => router.push('/legal/privacy' as never)}
    />
  );
}
