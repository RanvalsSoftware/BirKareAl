import { useLanguageRevision } from '@/i18n/use-language';
import { tr as translateCopy } from '@/i18n/engine';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ProPaywallView, type ProPlanDisplay } from './ProPaywallView';
import type { ProPlanId } from './paywall-model';
import { openBirkarePrivacyPolicy } from '@/constants/legal-links';

// Deliberately not PurchasesPackage values. No SDK/API/auth/wallet import here.
const PREVIEW_PLANS: readonly ProPlanDisplay[] = [
  { id: 'monthly', get label() { return translateCopy("Aylık"); }, price: '₺299,99', get period() { return translateCopy('/ ay'); }, get note() { return translateCopy('Her ay 80 kredi'); } },
  {
    id: 'annual',
    get label() { return translateCopy("Yıllık"); },
    price: '₺2.499,99',
    get period() { return translateCopy('/ yıl'); },
    get note() { return translateCopy('Her ay 80 kredi'); },
    get monthlyEquivalent() { return translateCopy('Aylık karşılığı ₺208,33'); },
    get badge() { return translateCopy('En avantajlı'); },
  },
  {
    id: 'lifetime',
    get label() { return translateCopy("Ömür Boyu"); },
    price: '₺4.999,99',
    get period() { return translateCopy('tek sefer'); },
    get note() { return translateCopy('200 başlangıç kredisi · Kalıcı Pro'); },
  },
];
export function ProPaywallPreview({ initialPlan = 'lifetime' }: { initialPlan?: ProPlanId }) {
  const languageRevision = useLanguageRevision();

  const router = useRouter();
  const [selected, setSelected] = useState<ProPlanId>(initialPlan);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/' as never));
  const explain = () =>
    Alert.alert(
      translateCopy("Tasarım önizlemesi"),
      translateCopy("Bu ekran ödeme başlatmaz, Pro erişimi açmaz ve kredi yüklemez. Fiyatlar örnek verilerdir."),
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
      onPrivacy={() => {
        void openBirkarePrivacyPolicy();
      }}
    />
  );
}
