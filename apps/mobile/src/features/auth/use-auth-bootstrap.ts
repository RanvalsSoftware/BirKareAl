import { useEffect } from 'react';
import { useAuthStore } from './auth-store';

/** Root-owned restoration also runs when a deep link skips app/index.tsx. */
export function useAuthBootstrap(): void {
  useEffect(() => {
    // The store owns single-flight restoration and handles rejected storage /
    // network requests. Strict Mode or the launch animation can safely join it.
    void useAuthStore.getState().bootstrap();
  }, []);
}
