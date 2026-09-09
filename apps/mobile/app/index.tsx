import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuthStore } from '@/features/auth/auth-store';
import { GuidedSplash, LogoIntro, PhotoPrelude } from '@/features/onboarding/launch-experience';
import { getOnboardingCompleted, setOnboardingCompleted } from '@/features/onboarding/storage';
import { clearRefreshToken } from '@/features/auth/token-store';
import { colors } from '@/theme';

type OnboardingStatus = 'loading' | 'new' | 'complete';

/**
 * Coordinates the two-part launch experience without changing the existing
 * onboarding route tree. Authentication and persisted onboarding state are
 * loaded while the logo animation is playing.
 */
export default function LaunchScreen() {
  const { reset } = useLocalSearchParams<{ reset?: string }>();
  const authState = useAuthStore((store) => store.state);
  const bootstrap = useAuthStore((store) => store.bootstrap);
  const clearSession = useAuthStore((store) => store.clearSession);
  const [onboarding, setOnboarding] = useState<OnboardingStatus>('loading');
  const [logoFinished, setLogoFinished] = useState(false);
  const [photoPreludeFinished, setPhotoPreludeFinished] = useState(false);
  const navigated = useRef(false);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      // A simulator-only reset path keeps real users' data untouched while
      // allowing the complete first-run experience to be checked repeatedly.
      if (__DEV__ && reset === '1') {
        await Promise.all([clearRefreshToken(), setOnboardingCompleted(false)]);
        clearSession();
      }

      await bootstrap();
      const completed = await getOnboardingCompleted();
      if (mounted) setOnboarding(completed ? 'complete' : 'new');
    })();

    return () => {
      mounted = false;
    };
  }, [bootstrap, clearSession, reset]);

  const navigateOnce = useCallback(
    (href: '/(tabs)/home' | '/(auth)/login' | '/(onboarding)/consent') => {
      if (navigated.current) return;
      navigated.current = true;
      router.replace(href);
    },
    [],
  );

  const finishLogoIntro = useCallback(() => setLogoFinished(true), []);
  const finishPhotoPrelude = useCallback(() => setPhotoPreludeFinished(true), []);
  const finishGuidedSplash = useCallback(
    () => navigateOnce('/(onboarding)/consent'),
    [navigateOnce],
  );

  useEffect(() => {
    if (!logoFinished || authState === 'booting' || onboarding === 'loading') return;

    if (authState === 'authenticated') {
      navigateOnce('/(tabs)/home');
      return;
    }

    if (onboarding === 'complete') {
      navigateOnce('/(auth)/login');
    }
  }, [authState, logoFinished, navigateOnce, onboarding]);

  const readyForOnboarding = logoFinished && authState !== 'booting' && onboarding === 'new';
  const showPhotoPrelude = readyForOnboarding && !photoPreludeFinished;
  const showGuidedSplash = readyForOnboarding && photoPreludeFinished;

  return (
    <View style={styles.screen}>
      {showGuidedSplash ? (
        <GuidedSplash onFinished={finishGuidedSplash} />
      ) : showPhotoPrelude ? (
        <PhotoPrelude onFinished={finishPhotoPrelude} />
      ) : (
        <LogoIntro onFinished={finishLogoIntro} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
