import { Stack } from 'expo-router';

import { RequireAuthenticated } from '@/features/auth/require-authenticated';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function GenerationsLayout() {
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
