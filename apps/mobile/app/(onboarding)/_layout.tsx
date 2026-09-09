import { Stack } from 'expo-router';

import { OnboardingProvider } from '@/features/onboarding/context';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { colors } from '@/theme';

export default function OnboardingLayout() {
  const reducedMotion = useReducedMotion();
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: reducedMotion ? 'none' : 'slide_from_right',
          contentStyle: { backgroundColor: colors.background },
          gestureEnabled: true,
        }}
      />
    </OnboardingProvider>
  );
}
