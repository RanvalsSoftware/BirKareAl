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
  beforePortrait: require('../../../assets/onboarding/images/demos/demo-01.webp'),
  afterCinematic: require('../../../assets/onboarding/images/categories/cinematic.webp'),

  /** Selectable demo portraits for “Fotoğrafını seç”. */
  gallery: [
    require('../../../assets/onboarding/images/demos/demo-01.webp'),
    require('../../../assets/onboarding/images/demos/demo-02.webp'),
    require('../../../assets/onboarding/images/demos/demo-03.webp'),
    require('../../../assets/onboarding/images/demos/demo-04.webp'),
    require('../../../assets/onboarding/images/demos/demo-05.webp'),
  ] as ImageSourcePropType[],
  /**
   * Decorative material shown before the practical four-step experience.
   */
  showcase: [
    require('../../../assets/onboarding/images/photos/showcase-01.webp'),
    require('../../../assets/onboarding/images/photos/showcase-02.webp'),
    require('../../../assets/onboarding/images/photos/showcase-03.webp'),
    require('../../../assets/onboarding/images/photos/showcase-04.webp'),
    require('../../../assets/onboarding/images/photos/showcase-05.webp'),
    require('../../../assets/onboarding/images/photos/showcase-06.webp'),
    require('../../../assets/onboarding/images/photos/showcase-07.webp'),
    require('../../../assets/onboarding/images/photos/showcase-08.webp'),
    require('../../../assets/onboarding/images/photos/showcase-09.webp'),
    require('../../../assets/onboarding/images/photos/showcase-10.webp'),
    require('../../../assets/onboarding/images/photos/showcase-11.webp'),
    require('../../../assets/onboarding/images/photos/showcase-12.webp'),
    require('../../../assets/onboarding/images/photos/showcase-13.webp'),
    require('../../../assets/onboarding/images/photos/showcase-14.webp'),
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
    source: require('../../../assets/onboarding/images/filters/natural.webp'),
  },
  {
    id: 'warm-studio',
    title: 'Stüdyo',
    group: 'professional',
    source: require('../../../assets/onboarding/images/filters/studio.webp'),
  },
  {
    id: 'cinematic',
    title: 'Cinematic',
    group: 'cinematic',
    source: require('../../../assets/onboarding/images/filters/cinematic.webp'),
  },
  {
    id: 'pop-art',
    title: 'Pop Art',
    group: 'art',
    source: require('../../../assets/onboarding/images/filters/popart.webp'),
  },
  {
    id: 'drip-art',
    title: 'Drip Art',
    group: 'art',
    source: require('../../../assets/onboarding/images/filters/dripart.webp'),
  },
  {
    id: 'hdr',
    title: 'HDR',
    group: 'natural',
    source: require('../../../assets/onboarding/images/filters/hdr.webp'),
  },
  {
    id: 'black-white',
    title: 'Siyah Beyaz',
    group: 'professional',
    source: require('../../../assets/onboarding/images/filters/siyah-beyaz.webp'),
  },
  {
    id: 'vintage',
    title: 'Vintage',
    group: 'cinematic',
    source: require('../../../assets/onboarding/images/filters/vintage.webp'),
  },
  {
    id: 'bokeh',
    title: 'Bokeh',
    group: 'professional',
    source: require('../../../assets/onboarding/images/filters/bokeh.webp'),
  },
  {
    id: 'cyberpunk',
    title: 'Cyberpunk',
    group: 'cinematic',
    source: require('../../../assets/onboarding/images/filters/cyberpunk.webp'),
  },
  {
    id: 'watercolor',
    title: 'Watercolor',
    group: 'art',
    source: require('../../../assets/onboarding/images/filters/watercolor.webp'),
  },
  {
    id: 'sketch',
    title: 'Sketch',
    group: 'art',
    source: require('../../../assets/onboarding/images/filters/sketch.webp'),
  },
  {
    id: 'cartoon',
    title: 'Cartoon',
    group: 'art',
    source: require('../../../assets/onboarding/images/filters/cartoon.webp'),
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
    source: require('../../../assets/onboarding/images/scenes/stadium.webp'),
  },
  {
    id: 'fan-stadium-02',
    title: 'Maç Sonrası',
    source: require('../../../assets/onboarding/images/scenes/stadium.webp'),
  },
  {
    id: 'fan-celebration',
    title: 'Kutlama Karesi',
    source: require('../../../assets/onboarding/images/scenes/stadium.webp'),
  },
];

export function resolveOnboardingPhoto(
  photo: OnboardingPhoto | null,
  fallback: ImageSourcePropType = onboardingImages.gallery[1] ?? onboardingImages.beforePortrait,
): ImageSourcePropType {
  if (!photo) return fallback;
  return photo.kind === 'device' ? { uri: photo.uri } : photo.source;
}
