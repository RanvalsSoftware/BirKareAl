import { Redirect } from 'expo-router';

import { useAuthStore } from '@/features/auth/auth-store';
import { ProductStudioWorkspace } from '@/features/studio/ProductStudioWorkspace';

/** Signed-out trial of the studio: plan a shoot and see the live preview before creating an account. */
export default function TryStudioScreen() {
  const authenticated = useAuthStore((store) => store.state === 'authenticated');
  if (authenticated) return <Redirect href={'/studio/product' as never} />;
  return <ProductStudioWorkspace guest />;
}
