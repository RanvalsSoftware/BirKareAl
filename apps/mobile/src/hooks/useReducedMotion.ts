import { AccessibilityInfo } from 'react-native';
import { useEffect, useState } from 'react';
import { useAppearanceStore } from '@/features/settings/appearance-store';

/** Reflects the system "Reduce Motion" preference for non-essential motion. */
export function useReducedMotion() {
  const appReducedMotion = useAppearanceStore((state) => state.reducedMotion);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotion(value);
    }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion || appReducedMotion;
}
