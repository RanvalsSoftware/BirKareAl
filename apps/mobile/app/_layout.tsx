import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Appearance, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppearanceStore } from '@/features/settings/appearance-store';
import { useAuthStore } from '@/features/auth/auth-store';
import { useAuthBootstrap } from '@/features/auth/use-auth-bootstrap';
import { bindAccountQueryCache } from '@/features/auth/account-query-cache';
import { apiRequest } from '@/api/client';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { RevenueCatBootstrap } from '@/features/billing/revenuecat';

// Keep the native black-and-gold mark on screen until the first React frame is
// actually laid out. Calling this at module scope is important on a cold start.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ duration: 360, fade: true });

function Providers({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000 },
          mutations: { retry: 0 },
        },
      }),
  );

  useEffect(() => bindAccountQueryCache(queryClient, useAuthStore), [queryClient]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#050505' }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <RevenueCatBootstrap />
          {children}
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  useAuthBootstrap();
  const splashHidden = useRef(false);
  const reducedMotion = useReducedMotion();
  const userId = useAuthStore((state) => state.user?.id);
  useEffect(() => {
    Appearance.setColorScheme('dark');
    void useAppearanceStore.getState().hydrate();
  }, []);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const revision = useAppearanceStore.getState().revision;
    void apiRequest<{ preferences: { glassEffects?: boolean; reducedMotion?: boolean } }>('/v1/me')
      .then(({ preferences }) => {
        if (active) useAppearanceStore.getState().syncFromServer(preferences, revision);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [userId]);

  const hideNativeSplash = useCallback(() => {
    if (splashHidden.current) return;

    splashHidden.current = true;
    requestAnimationFrame(() => SplashScreen.hide());
  }, []);

  return (
    <Providers>
      <View onLayout={hideNativeSplash} style={{ flex: 1, backgroundColor: '#050505' }}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: reducedMotion ? 'none' : 'fade',
            contentStyle: { backgroundColor: '#050505' },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="create"
            options={{ animation: reducedMotion ? 'none' : 'slide_from_right' }}
          />
          <Stack.Screen
            name="filters"
            options={{ animation: reducedMotion ? 'none' : 'slide_from_right' }}
          />
          <Stack.Screen
            name="generations"
            options={{ animation: reducedMotion ? 'none' : 'slide_from_right' }}
          />
          <Stack.Screen
            name="projects"
            options={{ animation: reducedMotion ? 'none' : 'slide_from_right' }}
          />
          <Stack.Screen
            name="settings"
            options={{ animation: reducedMotion ? 'none' : 'slide_from_right' }}
          />
          <Stack.Screen
            name="support"
            options={{ animation: reducedMotion ? 'none' : 'slide_from_right' }}
          />
          <Stack.Screen
            name="legal"
            options={{ animation: reducedMotion ? 'none' : 'slide_from_right' }}
          />
        </Stack>
      </View>
    </Providers>
  );
}
