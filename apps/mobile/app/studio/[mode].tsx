import { Redirect, useLocalSearchParams } from 'expo-router';

import { ProductStudioWorkspace } from '@/features/studio/ProductStudioWorkspace';

function firstParam(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Build 12 exposes only the focused product/catalog studio. */
export default function StudioModeScreen() {
  const params = useLocalSearchParams<{ entry?: string; mode?: string }>();
  const mode = firstParam(params.mode);
  if (mode !== 'product') return <Redirect href="/studio" />;
  return <ProductStudioWorkspace entry={firstParam(params.entry)} />;
}
