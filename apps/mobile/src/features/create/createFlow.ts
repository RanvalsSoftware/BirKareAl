import { useCallback, useSyncExternalStore } from 'react';
import type { BeautySettings, GenderTransformation } from '@/features/beauty/settings';
import type { TrendPresetId } from '@/features/trends/presets';

export type CreateMode = 'scene' | 'character' | 'filter' | 'portrait' | 'background';
export type Composition = 'Yakın' | 'Orta' | 'Uzak' | 'Selfie';
export type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9';
export type GenerationQuality = 'Önizleme' | 'Standart' | 'HD';

export type CreateFlow = {
  beauty?: BeautySettings | null;
  transformation?: GenderTransformation | null;
  trendPreset?: TrendPresetId | null;
  /** Local route hint; allowlisted AI tool IDs are serialized as server-owned toolPreset values. */
  toolId?: string | null;
  sourceKind?: 'photo' | 'fictional';
  sourceCharacterId?: string | null;
  mode: CreateMode;
  sourceUri: string | null;
  sourceName: string | null;
  sceneId: string | null;
  personId: string | null;
  styleId: string | null;
  composition: Composition;
  aspectRatio: AspectRatio;
  quality: GenerationQuality;
  numberOfImages: number;
  /** 0–100 strength sent to the server with the selected AI filter. */
  filterIntensity: number;
  preserveFace: boolean;
  preserveClothes: boolean;
  saveSource: boolean;
  /** Must be reconfirmed whenever the selected source image changes. */
  sourceRightsConfirmed: boolean;
  /** A one-session handoff from the unauthenticated onboarding experience. */
  onboardingDraftPending: boolean;
  customInstruction: string;
};

const initialFlow: CreateFlow = {
  beauty: null,
  transformation: null,
  trendPreset: null,
  toolId: null,
  sourceKind: 'photo',
  sourceCharacterId: null,
  mode: 'scene',
  sourceUri: null,
  sourceName: null,
  sceneId: null,
  personId: null,
  styleId: null,
  composition: 'Orta',
  aspectRatio: '4:5',
  quality: 'Standart',
  numberOfImages: 1,
  filterIntensity: 60,
  preserveFace: true,
  preserveClothes: true,
  saveSource: true,
  sourceRightsConfirmed: false,
  onboardingDraftPending: false,
  customInstruction: '',
};

let snapshot: CreateFlow = initialFlow;
const listeners = new Set<() => void>();

function publish(next: CreateFlow) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCreateFlow() {
  return snapshot;
}

export function updateCreateFlow(update: Partial<CreateFlow>) {
  publish({ ...snapshot, ...update });
}

/** An explicit ordinary creation intent must not inherit a beauty or gender draft. */
export function standardCreationSelection(update: Partial<CreateFlow> = {}): Partial<CreateFlow> {
  return {
    toolId: null,
    filterIntensity: 60,
    ...update,
    beauty: null,
    transformation: null,
    trendPreset: null,
    preserveFace: true,
    preserveClothes: true,
  };
}

export function resetCreateFlow() {
  publish(initialFlow);
}

/** True only while a new-user selection awaits an authenticated creation screen. */
export function hasPendingOnboardingCreateDraft() {
  return snapshot.onboardingDraftPending;
}

/** Keep the selection itself, but consume the automatic post-login redirect. */
export function consumePendingOnboardingCreateDraft() {
  if (!snapshot.onboardingDraftPending) return null;
  const draft = snapshot;
  publish({ ...draft, onboardingDraftPending: false });
  return draft;
}

/** A tiny in-memory workflow store; source image URIs and secrets are never persisted. */
export function useCreateFlow() {
  const flow = useSyncExternalStore(subscribe, getCreateFlow, getCreateFlow);
  const set = useCallback((update: Partial<CreateFlow>) => updateCreateFlow(update), []);
  const reset = useCallback(() => resetCreateFlow(), []);
  return { flow, set, reset };
}
