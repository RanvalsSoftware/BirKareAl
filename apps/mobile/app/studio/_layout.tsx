import { useLanguageRevision } from '@/i18n/use-language';
import { Stack } from 'expo-router';

import { RequireAuthenticated } from '@/features/auth/require-authenticated';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function StudioLayout() {
  const languageRevision = useLanguageRevision();

  const reducedMotion = useReducedMotion();
  return (
    <RequireAuthenticated>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: reducedMotion ? 'none' : 'slide_from_right',
        }}
      />
    </RequireAuthenticated>
  );
}
