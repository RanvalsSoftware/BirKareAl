import { Stack } from 'expo-router';

import { colors } from '@/src/theme/colors';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
        gestureEnabled: true,
        headerShown: false,
      }}
    />
  );
}
