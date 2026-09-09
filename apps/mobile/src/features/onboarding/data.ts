import type { ImageSourcePropType } from 'react-native';

import { experienceScenes, type ExperienceSceneId } from '@/constants/experience-scenes';

export type OnboardingPhoto =
  | {
      kind: 'device';
      uri: string;
      width?: number;
      height?: number;
      fileName?: string | null;
    }
  | {
      kind: 'demo';
      id: string;
      source: ImageSourcePropType;
    };

export type OnboardingCategoryId = ExperienceSceneId;

export type OnboardingSceneId = 'fan-stadium-01' | 'fan-stadium-02' | 'fan-celebration';

export type OnboardingFilterId =
  | 'natural'
  | 'warm-studio'
  | 'cinematic'
  | 'pop-art'
  | 'drip-art'
  | 'hdr'
  | 'black-white'
  | 'vintage'
  | 'bokeh'
  | 'cyberpunk'
  | 'watercolor'
  | 'sketch'
  | 'cartoon';

export type FilterGroup = 'all' | 'natural' | 'art' | 'cinematic' | 'professional';

/** Local launch artwork used by the intro, photo picker, and style previews. */
export const onboardingImages = {
  /** Gold visual identity supplied for the BirKare AI launch. */
  brandMark: require('../../../assets/onboarding/images/brand/logo-gold-icon.png'),
  /** Cropped from the supplied wordmark so it stays crisp in small headers. */
  brandWordmark: require('../../../assets/onboarding/images/brand/logo-wordmark.png'),

  // First-step assets are kept separate from the decorative opening rail so
  // every selectable demo portrait is shown at its original 4:5 ratio.
  beforePortrait: require('../../../assets/onboarding/images/demos/demo-01.png'),
  afterCinematic: require('../../../assets/onboarding/images/categories/cinematic.png'),

  /** Selectable demo portraits for “Fotoğrafını seç”. */
  gallery: [
    require('../../../assets/onboarding/images/demos/demo-01.png'),
    require('../../../assets/onboarding/images/demos/demo-02.png'),
    require('../../../assets/onboarding/images/demos/demo-03.png'),
    require('../../../assets/onboarding/images/demos/demo-04.png'),
    require('../../../assets/onboarding/images/demos/demo-05.png'),
  ] as ImageSourcePropType[],
  /**
   * Decorative material shown before the practical four-step experience.
   */
  showcase: [
    require('../../../assets/onboarding/images/photos/showcase-01.png'),
    require('../../../assets/onboarding/images/photos/showcase-02.png'),
    require('../../../assets/onboarding/images/photos/showcase-03.png'),
    require('../../../assets/onboarding/images/photos/showcase-04.png'),
    require('../../../assets/onboarding/images/photos/showcase-05.png'),
    require('../../../assets/onboarding/images/photos/showcase-06.png'),
    require('../../../assets/onboarding/images/photos/showcase-07.png'),
    require('../../../assets/onboarding/images/photos/showcase-08.png'),
    require('../../../assets/onboarding/images/photos/showcase-09.png'),
    require('../../../assets/onboarding/images/photos/showcase-10.png'),
    require('../../../assets/onboarding/images/photos/showcase-11.png'),
    require('../../../assets/onboarding/images/photos/showcase-12.png'),
    require('../../../assets/onboarding/images/photos/showcase-13.png'),
    require('../../../assets/onboarding/images/photos/showcase-14.png'),
  ] as ImageSourcePropType[],
} as const;

export const galleryPhotos: { id: string; source: ImageSourcePropType }[] =
  onboardingImages.gallery.map((source, index) => ({ id: `demo-${index + 1}`, source }));

export const showcasePhotos: { id: string; source: ImageSourcePropType }[] =
  onboardingImages.showcase.map((source, index) => ({ id: `showcase-${index + 1}`, source }));

// Step 2 uses the supplied category artwork directly.
export const categories = experienceScenes;

export const filterGroups: { id: FilterGroup; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'natural', label: 'Doğal' },
  { id: 'art', label: 'Sanatsal' },
  { id: 'cinematic', label: 'Sinematik' },
  { id: 'professional', label: 'Portre' },
];

export const filters: {
  id: OnboardingFilterId;
  title: string;
  group: Exclude<FilterGroup, 'all'>;
  source: ImageSourcePropType;
}[] = [
  {
    id: 'natural',
    title: 'Doğal',
    group: 'natural',
    source: require('../../../assets/onboarding/images/filters/natural.png'),
  },
  {
    id: 'warm-studio',
    title: 'Stüdyo',
    group: 'professional',
    source: require('../../../assets/onboarding/images/filters/studio.png'),
  },
  {
    id: 'cinematic',
    title: 'Cinematic',
    group: 'cinematic',
    source: require('../../../assets/onboarding/images/filters/cinematic.png'),
  },
  {
    id: 'pop-art',
    title: 'Pop Art',
    group: 'art',
    source: require('../../../assets/onboarding/images/filters/popart.png'),
  },
  {
    id: 'drip-art',
    title: 'Drip Art',
    group: 'art',
    source: require('../../../assets/onboarding/images/filters/dripart.png'),
  },
  {
    id: 'hdr',
    title: 'HDR',
    group: 'natural',
    source: require('../../../assets/onboarding/images/filters/hdr.png'),
  },
  {
    id: 'black-white',
    title: 'Siyah Beyaz',
    group: 'professional',
    source: require('../../../assets/onboarding/images/filters/siyah-beyaz.png'),
  },
  {
    id: 'vintage',
    title: 'Vintage',
    group: 'cinematic',
    source: require('../../../assets/onboarding/images/filters/vintage.png'),
  },
  {
    id: 'bokeh',
    title: 'Bokeh',
    group: 'professional',
    source: require('../../../assets/onboarding/images/filters/bokeh.png'),
  },
  {
    id: 'cyberpunk',
    title: 'Cyberpunk',
    group: 'cinematic',
    source: require('../../../assets/onboarding/images/filters/cyberpunk.png'),
  },
  {
    id: 'watercolor',
    title: 'Watercolor',
    group: 'art',
    source: require('../../../assets/onboarding/images/filters/watercolor.png'),
  },
  {
    id: 'sketch',
    title: 'Sketch',
    group: 'art',
    source: require('../../../assets/onboarding/images/filters/sketch.png'),
  },
  {
    id: 'cartoon',
    title: 'Cartoon',
    group: 'art',
    source: require('../../../assets/onboarding/images/filters/cartoon.png'),
  },
];

// Scene klasöründeki dosyalar var olduğu için burası aynen kalabilir
export const fanScenes: {
  id: OnboardingSceneId;
  title: string;
  source: ImageSourcePropType;
}[] = [
  {
    id: 'fan-stadium-01',
    title: 'Stadyum Selfie',
    source: require('../../../assets/onboarding/images/scenes/stadium.png'),
  },
  {
    id: 'fan-stadium-02',
    title: 'Maç Sonrası',
    source: require('../../../assets/onboarding/images/scenes/stadium.png'),
  },
  {
    id: 'fan-celebration',
    title: 'Kutlama Karesi',
    source: require('../../../assets/onboarding/images/scenes/stadium.png'),
  },
];

export function resolveOnboardingPhoto(
  photo: OnboardingPhoto | null,
  fallback: ImageSourcePropType = onboardingImages.gallery[1] ?? onboardingImages.beforePortrait,
): ImageSourcePropType {
  if (!photo) return fallback;
  return photo.kind === 'device' ? { uri: photo.uri } : photo.source;
}
