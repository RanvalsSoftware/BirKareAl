import { useLanguageRevision } from '@/i18n/use-language';
import { Stack } from 'expo-router';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function AuthLayout() {
  const languageRevision = useLanguageRevision();

  const reducedMotion = useReducedMotion();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: reducedMotion ? 'none' : 'fade_from_bottom',
        animationDuration: reducedMotion ? 0 : 260,
        gestureEnabled: true,
        contentStyle: { backgroundColor: '#050505' },
      }}
    />
  );
}
