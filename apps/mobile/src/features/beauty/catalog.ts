import { tr as translateCopy } from '@/i18n/engine';
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
    get name() { return translateCopy("Doğal"); },
    get description() { return translateCopy("Işık ve beyaz dengesine doğal bir dokunuş."); },
    group: 'Rötuş',
    defaultIntensity: 35,
    source: require('../../../assets/beauty/natural.webp'),
  },
  {
    id: 'blemishRemoval',
    number: 2,
    name: 'Sivilce & Leke',
    get description() { return translateCopy("Geçici sivilce ve kızarıklıkları azaltır."); },
    group: 'Rötuş',
    defaultIntensity: 65,
    source: require('../../../assets/beauty/blemish.webp'),
  },
  {
    id: 'skinSmoothing',
    number: 3,
    get name() { return translateCopy("Pürüzsüz Cilt"); },
    get description() { return translateCopy("Doğal dokuyu kaybetmeden kontrollü yumuşatma."); },
    group: 'Rötuş',
    defaultIntensity: 30,
    source: require('../../../assets/beauty/smooth.webp'),
  },
  {
    id: 'underEyeCorrection',
    number: 4,
    get name() { return translateCopy("Göz Altı"); },
    get description() { return translateCopy("Göz şeklini koruyarak yorgun görünümü hafifletir."); },
    group: 'Rötuş',
    defaultIntensity: 35,
    source: require('../../../assets/beauty/under-eye.webp'),
  },
  {
    id: 'skinGlow',
    number: 5,
    get name() { return translateCopy("Cilt Işıltısı"); },
    get description() { return translateCopy("Cilt tonunu koruyan yumuşak, doğal aydınlık."); },
    group: 'Rötuş',
    defaultIntensity: 30,
    source: require('../../../assets/beauty/glow.webp'),
  },
  {
    id: 'faceContour',
    number: 6,
    get name() { return translateCopy("Yüz Kontürü"); },
    get description() { return translateCopy("Yüz hatlarına ışık ve gölgeyle hafif belirginlik."); },
    group: 'Yüz hatları',
    defaultIntensity: 20,
    isPro: true,
    source: require('../../../assets/beauty/contour.webp'),
  },
  {
    id: 'youthfulLook',
    number: 7,
    get name() { return translateCopy("Genç Görünüm"); },
    get description() { return translateCopy("Yetişkin görünümü koruyarak ince çizgileri hafifletir."); },
    group: 'Yüz hatları',
    defaultIntensity: 20,
    isPro: true,
    source: require('../../../assets/beauty/youthful.webp'),
  },
  // Ten settings, nine beauty images: the gender reference is intentionally separate.
  // Nude shares the natural portrait until its dedicated reference is supplied.
  {
    id: 'nude',
    number: 8,
    name: 'Makyaj 1 · Nude',
    get description() { return translateCopy("Günlük, hafif ve doğal makyaj görünümü."); },
    group: 'Makyaj',
    defaultIntensity: 40,
    source: require('../../../assets/beauty/natural.webp'),
  },
  {
    id: 'soft-glam',
    number: 9,
    name: 'Makyaj 2 · Soft Glam',
    get description() { return translateCopy("Stüdyo portreleri için dengeli glam makyaj."); },
    group: 'Makyaj',
    defaultIntensity: 50,
    isPro: true,
    source: require('../../../assets/beauty/soft-glam.webp'),
  },
  {
    id: 'evening-glam',
    number: 10,
    name: 'Makyaj 3 · Gece',
    get description() { return translateCopy("Gece ve davet kareleri için belirgin makyaj."); },
    group: 'Makyaj',
    defaultIntensity: 60,
    isPro: true,
    source: require('../../../assets/beauty/evening-glam.webp'),
  },
];

export const genderPreview = require('../../../assets/beauty/gender-change.webp');
