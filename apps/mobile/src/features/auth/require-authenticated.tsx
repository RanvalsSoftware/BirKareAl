import { Redirect } from 'expo-router';
import type { PropsWithChildren } from 'react';

import { useAuthStore } from './auth-store';
import { AuthBootScreen } from './auth-boot-screen';

/** Prevents deep links from exposing account-bound creation or result routes. */
export function RequireAuthenticated({ children }: PropsWithChildren) {
  const authState = useAuthStore((store) => store.state);

  if (authState === 'booting') return <AuthBootScreen />;
  if (authState !== 'authenticated') return <Redirect href="/(auth)/login" />;
  return <>{children}</>;
}
