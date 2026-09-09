import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { apiRequest } from '@/api/client';
import { useAuthStore } from '@/features/auth/auth-store';

const KEY = 'birkare.appearance.v1';
type Appearance = { glassEffects: boolean; reducedMotion: boolean };
type AppearanceState = Appearance & {
  hydrated: boolean;
  /** Monotonic intent/commit revision, used to reject older account fetches. */
  revision: number;
  hydrate: () => Promise<void>;
  syncFromServer: (preferences: Partial<Appearance>, expectedRevision?: number) => boolean;
  setGlassEffects: (value: boolean) => Promise<void>;
  setReducedMotion: (value: boolean) => Promise<void>;
};

const defaults: Appearance = { glassEffects: true, reducedMotion: false };
let saveQueue = Promise.resolve();
let updateQueue = Promise.resolve();

function currentOwner(): string | null {
  const auth = useAuthStore.getState();
  return auth.state === 'authenticated' ? (auth.user?.id ?? 'authenticated-without-user') : null;
}

function assertOwner(owner: string | null) {
  if (owner !== currentOwner()) {
    throw new Error('Görünüm tercihi kaydedilirken hesap değişti. Geçerli hesabında yeniden dene.');
  }
}

function persist(value: Appearance, owner: string | null) {
  saveQueue = saveQueue
    .catch(() => undefined)
    .then(async () => {
      // A queued write for a signed-out account must not replace the new
      // account's device copy. In-flight writes are ordered before later ones.
      if (owner !== currentOwner()) return;
      await SecureStore.setItemAsync(KEY, JSON.stringify(value));
    });
  return saveQueue;
}

export const useAppearanceStore = create<AppearanceState>((set, get) => {
  const update = (patch: Partial<Appearance>): Promise<void> => {
    const owner = currentOwner();
    // Invalidate a pending GET immediately, not only after its PATCH finishes.
    set((state) => ({ revision: state.revision + 1 }));
    const operation = updateQueue
      .catch(() => undefined)
      .then(async () => {
        assertOwner(owner);
        if (owner !== null) {
          const controller = new AbortController();
          const unsubscribe = useAuthStore.subscribe(() => {
            if (owner !== currentOwner()) controller.abort();
          });
          try {
            // The signal also prevents apiRequest's 401 retry from accidentally
            // replaying an old account's PATCH under a newly signed-in account.
            await apiRequest('/v1/me/preferences', {
              method: 'PATCH',
              body: JSON.stringify({ ...patch, theme: 'dark' }),
              signal: controller.signal,
            });
          } finally {
            unsubscribe();
          }
        }
        assertOwner(owner);
        // Merge at execution time, after the previous update has committed.
        const next = {
          glassEffects: get().glassEffects,
          reducedMotion: get().reducedMotion,
          ...patch,
        };
        // Once acknowledged by the account server, this is the actual setting.
        // A disk error must not leave the screen claiming the opposite value.
        set((state) => ({ ...next, hydrated: true, revision: state.revision + 1 }));
        try {
          await persist(next, owner);
        } catch {
          throw new Error(
            owner !== null
              ? 'Tercihin hesabına kaydedildi ancak bu cihazda saklanamadı. Sonraki girişte hesabından yeniden alınacak.'
              : 'Tercihin bu oturum için uygulandı ancak cihazda saklanamadı. Uygulamayı yeniden açınca tekrar seçmen gerekebilir.',
          );
        }
        assertOwner(owner);
      });
    updateQueue = operation;
    return operation;
  };

  return {
    ...defaults,
    hydrated: false,
    revision: 0,
    async hydrate() {
      const startedAtRevision = get().revision;
      try {
        const saved = await SecureStore.getItemAsync(KEY);
        const parsed: unknown = saved ? JSON.parse(saved) : defaults;
        const value =
          parsed && typeof parsed === 'object' ? (parsed as Partial<Appearance>) : defaults;
        if (!get().hydrated && get().revision === startedAtRevision) {
          // Hydration is not a user mutation: do not invalidate the concurrent
          // authoritative /me request just because its local fallback arrived.
          set({
            glassEffects: typeof value.glassEffects === 'boolean' ? value.glassEffects : true,
            reducedMotion: value.reducedMotion === true,
          });
        }
      } catch {
        // Corrupt/unavailable local preferences cannot block opening the app.
      } finally {
        set({ hydrated: true });
      }
    },
    syncFromServer(preferences, expectedRevision) {
      if (expectedRevision !== undefined && expectedRevision !== get().revision) return false;
      const next = {
        glassEffects: preferences.glassEffects !== false,
        reducedMotion: preferences.reducedMotion === true,
      };
      set((state) => ({ ...next, hydrated: true, revision: state.revision + 1 }));
      void persist(next, currentOwner()).catch(() => undefined);
      return true;
    },
    setGlassEffects: (glassEffects) => update({ glassEffects }),
    setReducedMotion: (reducedMotion) => update({ reducedMotion }),
  };
});
