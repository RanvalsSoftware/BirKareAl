import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

export const AUTH_NOTICE_DURATION_MS = 4_000;

/** Transient UI feedback, never an authentication or verification flag. */
export function useAuthNotice<T>(durationMs = AUTH_NOTICE_DURATION_MS) {
  const [notice, updateNotice] = useState<T | null>(null);
  const focused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const dismissNotice = useCallback(() => {
    clearTimer();
    updateNotice(null);
  }, [clearTimer]);
  const setNotice = useCallback((value: T | null) => {
    clearTimer();
    // A late network response must not leave success feedback on a hidden screen.
    if (!focused.current) return;
    updateNotice(value);
    if (value !== null) {
      timer.current = setTimeout(() => {
        timer.current = null;
        if (focused.current) updateNotice(null);
      }, durationMs);
    }
  }, [clearTimer, durationMs]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => {
      focused.current = false;
      dismissNotice();
    };
  }, [dismissNotice]));

  return { notice, setNotice, dismissNotice };
}

/** Consume a navigation hint once; coming back must not replay an old success. */
export function useRouteAuthNotice(
  param: 'verified' | 'registered' | 'passwordReset',
  value: string | string[] | undefined,
) {
  const { notice, setNotice, dismissNotice } = useAuthNotice<true>();
  useFocusEffect(useCallback(() => {
    if (value !== '1') return;
    setNotice(true);
    // Use a consumed value instead of relying on null/undefined param removal.
    // setParams updates this route without adding another history entry.
    router.setParams({ [param]: '0' });
  }, [param, value, setNotice]));
  return { visible: notice === true, dismiss: dismissNotice };
}
