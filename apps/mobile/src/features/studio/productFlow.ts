import { useCallback, useSyncExternalStore } from 'react';

export type StudioQuality = 'PREVIEW' | 'STANDARD' | 'HD';
export type StudioAspectRatio = '1:1' | '4:5' | '9:16' | '16:9';
export type StudioCommerceGoal = 'marketplace' | 'product-page' | 'social-ad' | 'web-hero';
export type StudioImageCount = 1 | 2 | 4;

/** The App Store build has one focused, product-only creation state. */
export type ProductStudioFlow = {
  mode: 'product';
  productTitle: string;
  commerceGoal: StudioCommerceGoal;
  numberOfImages: StudioImageCount;
  primaryUri: string | null;
  primaryName: string | null;
  categoryId: string | null;
  sceneId: string | null;
  quality: StudioQuality;
  aspectRatio: StudioAspectRatio;
  rightsConfirmed: boolean;
  userNotes: string;
};

function freshFlow(): ProductStudioFlow {
  return {
    mode: 'product',
    productTitle: '',
    commerceGoal: 'marketplace',
    numberOfImages: 2,
    primaryUri: null,
    primaryName: null,
    categoryId: null,
    sceneId: null,
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

function publish(next: ProductStudioFlow) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function getProductStudioFlow(): ProductStudioFlow {
  return snapshot;
}

export function resetProductStudioFlow(): void {
  publish(freshFlow());
}

export function updateProductStudioFlow(update: Partial<ProductStudioFlow>): void {
  publish({ ...snapshot, ...update, mode: 'product' });
}

/** In-memory only: local product photo URIs and notes are never persisted. */
export function useProductStudioFlow() {
  const flow = useSyncExternalStore(subscribe, getProductStudioFlow, getProductStudioFlow);
  const set = useCallback(
    (update: Partial<ProductStudioFlow>) => updateProductStudioFlow(update),
    [],
  );
  const reset = useCallback(() => resetProductStudioFlow(), []);
  return { flow, set, reset };
}
