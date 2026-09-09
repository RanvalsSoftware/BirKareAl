import { Image } from 'react-native';

import { getCreateFlow, standardCreationSelection, updateCreateFlow } from '@/features/create/createFlow';

import {
  categories,
  type OnboardingCategoryId,
  type OnboardingFilterId,
  type OnboardingPhoto,
} from './data';

/**
 * These are local create-flow IDs, not prompts. The server translates them to
 * enabled catalog IDs and compiles the final prompt after the user signs in.
 */
const FILTER_TO_CREATE_STYLE: Record<OnboardingFilterId, string> = {
  natural: 'filter-natural',
  'warm-studio': 'filter-studio',
  cinematic: 'filter-cinematic',
  'pop-art': 'filter-pop',
  'drip-art': 'filter-drift',
  hdr: 'filter-hdr',
  'black-white': 'filter-mono',
  vintage: 'filter-vintage',
  bokeh: 'filter-bokeh',
  cyberpunk: 'filter-cyberpunk',
  watercolor: 'filter-watercolor',
  sketch: 'filter-sketch',
  cartoon: 'filter-cartoon',
};

export function stageOnboardingCreateDraft(input: {
  photo: OnboardingPhoto;
  sceneId: OnboardingCategoryId;
  filterId: OnboardingFilterId;
  filterIntensity: number;
}) {
  const selectedScene = categories.find((scene) => scene.id === input.sceneId);
  if (!selectedScene) return;

  const scene = selectedScene.preset;
  const demoUri =
    input.photo.kind === 'demo' ? Image.resolveAssetSource(input.photo.source)?.uri : null;
  const source =
    input.photo.kind === 'device'
      ? {
          sourceUri: input.photo.uri,
          sourceName: input.photo.fileName ?? 'onboarding-photo.jpg',
        }
      : {
          sourceUri: demoUri,
          sourceName: demoUri ? `onboarding-${input.photo.id}.jpg` : null,
        };

  updateCreateFlow(standardCreationSelection({
    ...scene,
    ...source,
    styleId: FILTER_TO_CREATE_STYLE[input.filterId],
    filterIntensity: Math.max(0, Math.min(100, Math.round(input.filterIntensity))),
    aspectRatio: '4:5',
    quality: 'Önizleme',
    numberOfImages: 1,
    preserveFace: true,
    preserveClothes: true,
    saveSource: true,
    // Consent is collected on the next screen. Do not make an image eligible
    // for upload until that explicit confirmation has completed.
    sourceRightsConfirmed: false,
    onboardingDraftPending: true,
    customInstruction: scene.customInstruction,
  }));
}

/** Called only after the user has checked the photo-rights consent. */
export function confirmOnboardingCreateDraftRights() {
  if (!getCreateFlow().onboardingDraftPending) return;
  updateCreateFlow({ sourceRightsConfirmed: true });
}
