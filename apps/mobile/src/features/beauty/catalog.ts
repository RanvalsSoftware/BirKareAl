import type { ImageSourcePropType } from 'react-native';
import type { BeautyOptionId } from './settings';

export type BeautyOption = {
  id: BeautyOptionId;
  number: number;
  name: string;
  description: string;
  group: 'Rötuş' | 'Yüz hatları' | 'Makyaj';
  defaultIntensity: number;
  isPro?: boolean;
  source: ImageSourcePropType;
};

/** Thumbnails are illustrative; they are never submitted as the user's source. */
export const beautyOptions: BeautyOption[] = [
  {
    id: 'naturalBalance',
    number: 1,
    name: 'Doğal',
    description: 'Işık ve beyaz dengesine doğal bir dokunuş.',
    group: 'Rötuş',
    defaultIntensity: 35,
    source: require('../../../assets/beauty/natural.png'),
  },
  {
    id: 'blemishRemoval',
    number: 2,
    name: 'Sivilce & Leke',
    description: 'Geçici sivilce ve kızarıklıkları azaltır.',
    group: 'Rötuş',
    defaultIntensity: 65,
    source: require('../../../assets/beauty/blemish.png'),
  },
  {
    id: 'skinSmoothing',
    number: 3,
    name: 'Pürüzsüz Cilt',
    description: 'Doğal dokuyu kaybetmeden kontrollü yumuşatma.',
    group: 'Rötuş',
    defaultIntensity: 30,
    source: require('../../../assets/beauty/smooth.png'),
  },
  {
    id: 'underEyeCorrection',
    number: 4,
    name: 'Göz Altı',
    description: 'Göz şeklini koruyarak yorgun görünümü hafifletir.',
    group: 'Rötuş',
    defaultIntensity: 35,
    source: require('../../../assets/beauty/under-eye.png'),
  },
  {
    id: 'skinGlow',
    number: 5,
    name: 'Cilt Işıltısı',
    description: 'Cilt tonunu koruyan yumuşak, doğal aydınlık.',
    group: 'Rötuş',
    defaultIntensity: 30,
    source: require('../../../assets/beauty/glow.png'),
  },
  {
    id: 'faceContour',
    number: 6,
    name: 'Yüz Kontürü',
    description: 'Yüz hatlarına ışık ve gölgeyle hafif belirginlik.',
    group: 'Yüz hatları',
    defaultIntensity: 20,
    isPro: true,
    source: require('../../../assets/beauty/contour.png'),
  },
  {
    id: 'youthfulLook',
    number: 7,
    name: 'Genç Görünüm',
    description: 'Yetişkin görünümü koruyarak ince çizgileri hafifletir.',
    group: 'Yüz hatları',
    defaultIntensity: 20,
    isPro: true,
    source: require('../../../assets/beauty/youthful.png'),
  },
  // Ten settings, nine beauty images: the gender reference is intentionally separate.
  // Nude shares the natural portrait until its dedicated reference is supplied.
  {
    id: 'nude',
    number: 8,
    name: 'Makyaj 1 · Nude',
    description: 'Günlük, hafif ve doğal makyaj görünümü.',
    group: 'Makyaj',
    defaultIntensity: 40,
    source: require('../../../assets/beauty/natural.png'),
  },
  {
    id: 'soft-glam',
    number: 9,
    name: 'Makyaj 2 · Soft Glam',
    description: 'Stüdyo portreleri için dengeli glam makyaj.',
    group: 'Makyaj',
    defaultIntensity: 50,
    isPro: true,
    source: require('../../../assets/beauty/soft-glam.png'),
  },
  {
    id: 'evening-glam',
    number: 10,
    name: 'Makyaj 3 · Gece',
    description: 'Gece ve davet kareleri için belirgin makyaj.',
    group: 'Makyaj',
    defaultIntensity: 60,
    isPro: true,
    source: require('../../../assets/beauty/evening-glam.png'),
  },
];

export const genderPreview = require('../../../assets/beauty/gender-change.png');
