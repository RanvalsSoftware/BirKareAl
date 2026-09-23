import { useCallback, useSyncExternalStore } from 'react';

export type StudioMode = 'product' | 'fashion' | 'nails';
export type StudioQuality = 'PREVIEW' | 'STANDARD' | 'HD';
export type StudioAspectRatio = '1:1' | '4:5' | '9:16' | '16:9';

export type StudioFlow = {
  mode: StudioMode;
  primaryUri: string | null;
  primaryName: string | null;
  secondaryUri: string | null;
  secondaryName: string | null;
  categoryId: string | null;
  sceneId: string | null;
  presetId: string | null;
  quality: StudioQuality;
  aspectRatio: StudioAspectRatio;
  rightsConfirmed: boolean;
  userNotes: string;
};

function freshFlow(mode: StudioMode = 'product'): StudioFlow {
  return {
    mode,
    primaryUri: null,
    primaryName: null,
    secondaryUri: null,
    secondaryName: null,
    categoryId: null,
    sceneId: null,
    presetId: null,
    quality: 'STANDARD',
    aspectRatio: '4:5',
    rightsConfirmed: false,
    userNotes: '',
  };
}

let snapshot = freshFlow();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(next: StudioFlow) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function getStudioFlow(): StudioFlow {
  return snapshot;
}

export function resetStudioFlow(mode: StudioMode = 'product'): void {
  publish(freshFlow(mode));
}

export function updateStudioFlow(update: Partial<StudioFlow>): void {
  publish({ ...snapshot, ...update });
}

/** In-memory only: local photo URIs and user notes are never persisted. */
export function useStudioFlow() {
  const flow = useSyncExternalStore(subscribe, getStudioFlow, getStudioFlow);
  const set = useCallback((update: Partial<StudioFlow>) => updateStudioFlow(update), []);
  const reset = useCallback((mode: StudioMode = 'product') => resetStudioFlow(mode), []);
  return { flow, set, reset };
}
