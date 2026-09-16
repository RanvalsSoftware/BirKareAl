import Constants from 'expo-constants';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { ProPaywallPreview } from '@/features/billing/ProPaywallPreview';
import { previewAllowed, previewSelection } from '@/features/billing/paywall-display';

/** Deep links cannot enable preview in a release binary or a staging build. */
export default function ProPreviewScreen() {
  const { plan } = useLocalSearchParams<{ plan?: string | string[] }>();
  const env = Constants.expoConfig?.extra?.revenueCat?.appEnv;
  if (!previewAllowed(__DEV__, env)) return <Redirect href="/pro" />;
  return <ProPaywallPreview initialPlan={previewSelection(plan)} />;
}
