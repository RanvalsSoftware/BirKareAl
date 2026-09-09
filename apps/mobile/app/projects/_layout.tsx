import { Stack } from 'expo-router';

import { RequireAuthenticated } from '@/features/auth/require-authenticated';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function ProjectsLayout() {
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
