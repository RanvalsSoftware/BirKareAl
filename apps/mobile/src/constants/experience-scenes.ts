import type { ImageSourcePropType } from 'react-native';

import type { Composition, CreateMode } from '@/features/create/createFlow';

export type ExperienceSceneId =
  'fan-selfie' | 'background' | 'art-filter' | 'professional' | 'cinematic' | 'face';

export type ExperienceScenePreset = {
  mode: CreateMode;
  sceneId: string | null;
  personId: string | null;
  styleId: string | null;
  composition: Composition;
  preserveFace: boolean;
  preserveClothes: boolean;
  customInstruction: string;
};

export type ExperienceScene = {
  id: ExperienceSceneId;
  title: string;
  shortTitle: string;
  description: string;
  badge?: string;
  icon:
    | 'people-outline'
    | 'layers-outline'
    | 'color-palette-outline'
    | 'person-outline'
    | 'film-outline'
    | 'sparkles-outline';
  source: ImageSourcePropType;
  palette: readonly [string, string];
  /** Preview/one-image estimate; the API remains authoritative at checkout. */
  creditCost: number;
  preset: ExperienceScenePreset;
};

/**
 * The canonical scene rail used by both onboarding step 2 and Home.
 * Keeping presentation and allow-listed create presets together prevents a
 * card from ever opening a different production mode than the one it shows.
 */
export const experienceScenes: readonly ExperienceScene[] = [
  {
    id: 'fan-selfie',
    title: 'Ünlü ile Selfie',
    shortTitle: 'Ünlü Selfie',
    description: 'Kurgusal veya lisanslı karakterlerle güvenli fan karesi.',
    badge: 'Popüler',
    icon: 'people-outline',
    source: require('../../assets/onboarding/images/categories/talent.png'),
    palette: ['#121D31', '#3E6A47'],
    creditCost: 4,
    preset: {
      mode: 'character',
      sceneId: 'scene-stadium-lights',
      personId: 'persona-aras',
      styleId: null,
      composition: 'Selfie',
      preserveFace: true,
      preserveClothes: true,
      customInstruction:
        'Stadyumda, ışıklar altında, kurgusal veya kullanım hakkı doğrulanmış bir spor karakteriyle doğal ve enerjik bir selfie karesi.',
    },
  },
  {
    id: 'background',
    title: 'Arka Plan Dönüşümü',
    shortTitle: 'Arka Plan',
    description: 'Fotoğrafını yeni bir atmosferle buluştur.',
    icon: 'layers-outline',
    source: require('../../assets/onboarding/images/categories/background.png'),
    palette: ['#422516', '#E39A51'],
    creditCost: 2,
    preset: {
      mode: 'background',
      sceneId: 'scene-sunset-terrace',
      personId: null,
      styleId: null,
      composition: 'Orta',
      preserveFace: true,
      preserveClothes: true,
      customInstruction:
        'Kişinin yüzünü, pozunu ve kıyafetini koruyarak arka planı sıcak gün batımı ışığında zarif bir şehir terasına dönüştür.',
    },
  },
  {
    id: 'art-filter',
    title: 'Filtre & Sanat',
    shortTitle: 'Sanat',
    description: 'Pop art, çizim ve özgün AI dokuları.',
    icon: 'color-palette-outline',
    source: require('../../assets/onboarding/images/categories/sanatsal.png'),
    palette: ['#007B96', '#ED297D'],
    creditCost: 2,
    preset: {
      mode: 'filter',
      sceneId: null,
      personId: null,
      styleId: 'filter-pop',
      composition: 'Orta',
      preserveFace: true,
      preserveClothes: true,
      customInstruction:
        'Yüz kimliğini ve ana kompozisyonu koruyarak seçilen sanatsal filtreyi dengeli, temiz ve özgün biçimde uygula.',
    },
  },
  {
    id: 'professional',
    title: 'Profesyonel Portre',
    shortTitle: 'Portre',
    description: 'Stüdyo ışığında temiz bir portre görünümü.',
    icon: 'person-outline',
    source: require('../../assets/onboarding/images/categories/portre.png'),
    palette: ['#15151B', '#52647A'],
    creditCost: 3,
    preset: {
      mode: 'portrait',
      sceneId: null,
      personId: null,
      styleId: 'filter-studio',
      composition: 'Yakın',
      preserveFace: true,
      preserveClothes: true,
      customInstruction:
        'Yüz kimliğini koruyan, dengeli stüdyo ışıklı ve temiz arka planlı profesyonel bir portre oluştur.',
    },
  },
  {
    id: 'cinematic',
    title: 'Sinematik Sahne',
    shortTitle: 'Sinematik',
    description: 'Gece ışıkları ve güçlü sahne atmosferi.',
    icon: 'film-outline',
    source: require('../../assets/onboarding/images/categories/cinematic.png'),
    palette: ['#101923', '#6B431F'],
    creditCost: 3,
    preset: {
      mode: 'scene',
      sceneId: 'scene-city-glow',
      personId: null,
      styleId: 'filter-cinematic',
      composition: 'Uzak',
      preserveFace: true,
      preserveClothes: true,
      customInstruction:
        'Yağmurlu gece şehrinde sinematik ışık, doğal perspektif ve güçlü ama gerçekçi bir tam sahne oluştur.',
    },
  },
  {
    id: 'face',
    title: 'Yüz Dönüşümü',
    shortTitle: 'Yüz',
    description: 'Yüzünü koruyan, yakın plan ve dengeli bir portre görünümü.',
    icon: 'sparkles-outline',
    source: require('../../assets/onboarding/images/categories/face.png'),
    palette: ['#6A422A', '#E0B17F'],
    creditCost: 3,
    preset: {
      mode: 'portrait',
      sceneId: null,
      personId: null,
      styleId: 'filter-natural',
      composition: 'Yakın',
      preserveFace: true,
      preserveClothes: true,
      customInstruction:
        'Kişinin yüz kimliğini ve doğal cilt dokusunu koruyarak yumuşak ışıklı, dengeli bir yakın plan bakım portresi oluştur.',
    },
  },
] as const;
