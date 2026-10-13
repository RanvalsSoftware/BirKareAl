import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAuthStore } from '@/features/auth/auth-store';
import { setOnboardingCompleted } from '@/features/onboarding/storage';

/** TEMPORARY development-only screenshot driver. Remove before release. */
type Command = {
  seq: number;
  login?: { email: string; password: string };
  logout?: boolean;
  onboardingCompleted?: boolean;
  route?: string;
  flow?: Record<string, unknown>;
  step?: string;
};

export function ScreenshotDriver() {
  const lastSeq = useRef(0);
  useEffect(() => {
    if (!__DEV__) return undefined;
    let active = true;
    const tick = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8099/driver.json?t=${Date.now()}`);
        if (!response.ok) return;
        const command = (await response.json()) as Command;
        if (!active || command.seq === lastSeq.current) return;
        lastSeq.current = command.seq;
        const store = useAuthStore.getState();
        if (command.onboardingCompleted !== undefined)
          await setOnboardingCompleted(command.onboardingCompleted);
        if (command.logout) await store.signOut().catch(() => undefined);
        if (command.login && useAuthStore.getState().state !== 'authenticated')
          await store.signIn(command.login);
        if (command.step !== undefined)
          (globalThis as { __devStep?: string }).__devStep = command.step;
        if (command.flow) {
          const { updateProductStudioFlow } = await import('@/features/studio/productFlow');
          updateProductStudioFlow(command.flow as never);
        }
        if (command.route) {
          if (router.canDismiss()) router.dismissAll();
          router.replace(command.route as never);
        }
      } catch {
        // best effort
      }
    };
    const interval = setInterval(() => void tick(), 1_500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);
  return null;
}
