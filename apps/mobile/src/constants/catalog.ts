import { tr as translateCopy } from '@/i18n/engine';
import type { ImageSourcePropType } from 'react-native';

export type CatalogKind = 'scene' | 'filter' | 'person' | 'tool';

export type CatalogItem = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  kind: CatalogKind;
  category: string;
  palette: readonly [string, string];
  icon: string;
  /** A real visual reference when a catalogue card needs more than an abstract palette. */
  previewSource?: ImageSourcePropType;
  creditCost?: number;
  isPro?: boolean;
  ai?: boolean;
};

export const scenes: CatalogItem[] = [
  {
    id: 'scene-stadium-lights',
    slug: 'stadium-lights',
    get name() { return translateCopy('Gece Stadyumu'); },
    get subtitle() {
      return translateCopy('Işıklar altında güçlü bir kare');
    },
    kind: 'scene',
    category: 'Spor',
    palette: ['#183A4E', '#50621B'],
    icon: '⚽',
    previewSource: require('../../assets/onboarding/images/scenes/stadium.webp'),
    creditCost: 1,
  },
  {
    id: 'scene-award-night',
    slug: 'award-night',
    get name() {
      return translateCopy('Ödül Gecesi');
    },
    get subtitle() {
      return translateCopy('Şehir kıyısında ışıltılı bir davet');
    },
    kind: 'scene',
    category: 'Etkinlik',
    palette: ['#57310F', '#B56A17'],
    icon: '✦',
    previewSource: require('../../assets/onboarding/images/scenes/gift.webp'),
    creditCost: 1,
  },
  {
    id: 'scene-city-glow',
    slug: 'city-glow',
    get name() {
      return translateCopy('Şehir Işıkları');
    },
    get subtitle() {
      return translateCopy('Gece şehir dokusu');
    },
    kind: 'scene',
    category: 'Şehir',
    palette: ['#27104C', '#135E73'],
    icon: '◈',
    previewSource: require('../../assets/onboarding/images/scenes/light-cities.webp'),
    creditCost: 1,
  },
  {
    id: 'scene-coastal-day',
    slug: 'coastal-day',
    get name() {
      return translateCopy('Sahil Günü');
    },
    get subtitle() {
      return translateCopy('Turkuaz koyda Akdeniz terası');
    },
    kind: 'scene',
    category: 'Doğa',
    palette: ['#075B70', '#E2B35B'],
    icon: '☼',
    previewSource: require('../../assets/onboarding/images/scenes/beach.webp'),
    creditCost: 1,
  },
  {
    id: 'scene-studio-ink',
    slug: 'studio-ink',
    get name() {
      return translateCopy('Stüdyo Işığı');
    },
    get subtitle() {
      return translateCopy('Pencere ışığında doğal portre');
    },
    kind: 'scene',
    category: 'Portre',
    palette: ['#202020', '#565656'],
    icon: '◐',
    previewSource: require('../../assets/onboarding/images/scenes/portrait-change.webp'),
    creditCost: 1,
    isPro: true,
  },
  {
    id: 'scene-neon-future',
    slug: 'neon-future',
    get name() { return translateCopy('Neon Gelecek'); },
    get subtitle() {
      return translateCopy('Neon şehirde sinematik otomobil karesi');
    },
    kind: 'scene',
    category: 'Fantastik',
    palette: ['#3B0E5F', '#2C8BA2'],
    icon: '✧',
    previewSource: require('../../assets/onboarding/images/scenes/neon.webp'),
    creditCost: 1,
    isPro: true,
  },
  {
    id: 'scene-alpine-lake',
    slug: 'alpine-lake',
    get name() {
      return translateCopy('Dağ Gölü');
    },
    get subtitle() {
      return translateCopy('Gün batımı, dağlar ve ahşap kulübe');
    },
    kind: 'scene',
    category: 'Doğa',
    palette: ['#18364A', '#E99742'],
    icon: '△',
    previewSource: require('../../assets/onboarding/images/scenes/background-change.webp'),
    creditCost: 1,
  },
];

export const filters: CatalogItem[] = [
  {
    id: 'filter-natural',
    slug: 'natural-light',
    get name() {
      return translateCopy('Doğal Işık');
    },
    get subtitle() {
      return translateCopy('Sade, dengeli bir görünüm');
    },
    kind: 'filter',
    category: 'Doğal',
    palette: ['#315F54', '#C7B582'],
    icon: '☀',
    previewSource: require('../../assets/onboarding/images/filters/natural.webp'),
    creditCost: 1,
    ai: true,
  },
  {
    id: 'filter-drift',
    slug: 'drift-art',
    get name() {
      return translateCopy('Akışkan Sanat');
    },
    get subtitle() {
      return translateCopy('Canlı renklerle özgün AI stil');
    },
    kind: 'filter',
    category: 'Sanatsal',
    palette: ['#D74673', '#4422A8'],
    icon: '✺',
    previewSource: require('../../assets/onboarding/images/filters/dripart.webp'),
    creditCost: 1,
    ai: true,
    isPro: true,
  },
  {
    id: 'filter-pop',
    slug: 'pop-poster',
    name: 'Pop Poster',
    get subtitle() { return translateCopy('Grafik, cesur ve parlak'); },
    kind: 'filter',
    category: 'Sanatsal',
    palette: ['#FF534B', '#FFB703'],
    icon: '▦',
    previewSource: require('../../assets/onboarding/images/filters/popart.webp'),
    creditCost: 1,
    ai: true,
  },
  {
    id: 'filter-hdr',
    slug: 'hdr-glow',
    name: 'HDR Glow',
    get subtitle() {
      return translateCopy('Daha net ışık ve doku');
    },
    kind: 'filter',
    category: 'Doğal',
    palette: ['#2B3F59', '#C7843E'],
    icon: '◉',
    previewSource: require('../../assets/onboarding/images/filters/hdr.webp'),
    creditCost: 1,
    ai: true,
  },
  {
    id: 'filter-bokeh',
    slug: 'soft-bokeh',
    get name() {
      return translateCopy('Yumuşak Bokeh');
    },
    get subtitle() {
      return translateCopy('Yumuşak arka plan derinliği');
    },
    kind: 'filter',
    category: 'Portre',
    palette: ['#5F243D', '#B78258'],
    icon: '◌',
    previewSource: require('../../assets/onboarding/images/filters/bokeh.webp'),
    creditCost: 1,
    ai: true,
  },
  {
    id: 'filter-cinematic',
    slug: 'cinematic-noir',
    get name() { return translateCopy('Sinematik'); },
    get subtitle() { return translateCopy('Film hissi veren dramatik tonlar'); },
    kind: 'filter',
    category: 'Sinematik',
    palette: ['#0F2138', '#775431'],
    icon: '▰',
    previewSource: require('../../assets/onboarding/images/filters/cinematic.webp'),
    creditCost: 1,
    ai: true,
  },
  {
    id: 'filter-vintage',
    slug: 'warm-vintage',
    name: 'Vintage',
    get subtitle() {
      return translateCopy('Sıcak ve zamansız doku');
    },
    kind: 'filter',
    category: 'Retro',
    palette: ['#6E3B2D', '#C99B57'],
    icon: '◒',
    previewSource: require('../../assets/onboarding/images/filters/vintage.webp'),
    creditCost: 1,
    ai: true,
  },
  {
    id: 'filter-mono',
    slug: 'monochrome',
    get name() { return translateCopy('Monokrom'); },
    get subtitle() {
      return translateCopy('Güçlü siyah beyaz kontrast');
    },
    kind: 'filter',
    category: 'Portre',
    palette: ['#101010', '#8B8B8B'],
    icon: '◑',
    previewSource: require('../../assets/onboarding/images/filters/siyah-beyaz.webp'),
    creditCost: 1,
    ai: true,
  },
  {
    id: 'filter-studio',
    slug: 'warm-studio',
    get name() {
      return translateCopy('Sıcak Stüdyo');
    },
    get subtitle() {
      return translateCopy('Yumuşak, profesyonel stüdyo ışığı');
    },
    kind: 'filter',
    category: 'Portre',
    palette: ['#4A302A', '#D99159'],
    icon: '◐',
    previewSource: require('../../assets/onboarding/images/filters/studio.webp'),
    creditCost: 1,
    ai: true,
  },
  {
    id: 'filter-cyberpunk',
    slug: 'cyberpunk',
    name: 'Cyberpunk',
    get subtitle() {
      return translateCopy('Özgün neon gece atmosferi');
    },
    kind: 'filter',
    category: 'Sinematik',
    palette: ['#3A1C6D', '#00B8D9'],
    icon: '✧',
    previewSource: require('../../assets/onboarding/images/filters/cyberpunk.webp'),
    creditCost: 1,
    ai: true,
  },
  {
    id: 'filter-watercolor',
    slug: 'watercolor',
    get name() { return translateCopy('Suluboya'); },
    get subtitle() {
      return translateCopy('Katmanlı, özgün boya dokusu');
    },
    kind: 'filter',
    category: 'Sanatsal',
    palette: ['#4C8AAA', '#E0AF7A'],
    icon: '✺',
    previewSource: require('../../assets/onboarding/images/filters/watercolor.webp'),
    creditCost: 1,
    ai: true,
  },
  {
    id: 'filter-sketch',
    slug: 'sketch',
    get name() { return translateCopy('Eskiz'); },
    get subtitle() {
      return translateCopy('İnce çizgi ve doğal kâğıt dokusu');
    },
    kind: 'filter',
    category: 'Sanatsal',
    palette: ['#4A4543', '#BEB3A4'],
    icon: '✎',
    previewSource: require('../../assets/onboarding/images/filters/sketch.webp'),
    creditCost: 1,
    ai: true,
  },
  {
    id: 'filter-cartoon',
    slug: 'cartoon',
    name: 'Cartoon',
    get subtitle() {
      return translateCopy('Özgün, temiz çizgili illüstrasyon');
    },
    kind: 'filter',
    category: 'Sanatsal',
    palette: ['#CD4E45', '#F3BB43'],
    icon: '◉',
    previewSource: require('../../assets/onboarding/images/filters/cartoon.webp'),
    creditCost: 1,
    ai: true,
  },
];

/** All people are clearly fictional showcase characters, never real people. */
export const fictionalPeople: CatalogItem[] = [
  {
    id: 'persona-aras',
    slug: 'deniz-aras',
    name: 'Deniz Aras',
    get subtitle() { return translateCopy('Kurgusal spor hikâyesi'); },
    kind: 'person',
    category: 'Kurgusal karakter',
    palette: ['#195982', '#203543'],
    icon: 'DA',
    previewSource: require('../../assets/onboarding/images/demos/demo-01.webp'),
    creditCost: 2,
    ai: true,
  },
  {
    id: 'persona-nova',
    slug: 'mira-nova',
    name: 'Mira Nova',
    get subtitle() {
      return translateCopy('Kurgusal müzik evreni');
    },
    kind: 'person',
    category: 'Kurgusal karakter',
    palette: ['#7B1E67', '#EC5E98'],
    icon: 'MN',
    previewSource: require('../../assets/onboarding/images/demos/demo-02.webp'),
    creditCost: 2,
    ai: true,
  },
  {
    id: 'persona-kaya',
    slug: 'atlas-kaya',
    name: 'Atlas Kaya',
    get subtitle() { return translateCopy('Kurgusal sinema evreni'); },
    kind: 'person',
    category: 'Kurgusal karakter',
    palette: ['#664213', '#B37938'],
    icon: 'AK',
    previewSource: require('../../assets/onboarding/images/demos/demo-03.webp'),
    creditCost: 2,
    ai: true,
  },
  {
    id: 'persona-luma',
    slug: 'luma-veren',
    name: 'Luma Veren',
    get subtitle() { return translateCopy('Kurgusal moda hikâyesi'); },
    kind: 'person',
    category: 'Kurgusal karakter',
    palette: ['#373A74', '#9E7BC3'],
    icon: 'LV',
    previewSource: require('../../assets/onboarding/images/demos/demo-04.webp'),
    creditCost: 2,
    ai: true,
  },
  {
    id: 'persona-ela',
    slug: 'ela-serra',
    name: 'Ela Serra',
    get subtitle() {
      return translateCopy('Kurgusal doğa hikâyesi');
    },
    kind: 'person',
    category: 'Kurgusal karakter',
    palette: ['#3D4E2A', '#B78B45'],
    icon: 'ES',
    previewSource: require('../../assets/onboarding/images/demos/demo-05.webp'),
    creditCost: 2,
    ai: true,
  },
];

export const aiTools: CatalogItem[] = [
  {
    id: 'tool-background',
    previewSource: require('../../assets/onboarding/images/scenes/background-change.webp'),
    slug: 'background',
    get name() {
      return translateCopy('Arka plan değiştir');
    },
    get subtitle() {
      return translateCopy('Kendinizi yepyeni bir sahneye taşıyın');
    },
    kind: 'tool',
    category: 'AI araçları',
    palette: ['#31175D', '#7550A4'],
    icon: '◫',
    creditCost: 1,
    ai: true,
  },
  {
    id: 'tool-light',
    previewSource: require('../../assets/onboarding/images/scenes/light-change.webp'),
    slug: 'light',
    get name() {
      return translateCopy('Işığı düzelt');
    },
    get subtitle() {
      return translateCopy('Gölgeleri ve sıcaklığı dengeleyin');
    },
    kind: 'tool',
    category: 'AI araçları',
    palette: ['#754517', '#D5A340'],
    icon: '☼',
    creditCost: 1,
    ai: true,
  },
  {
    id: 'tool-portrait',
    previewSource: require('../../assets/onboarding/images/scenes/portrait-change.webp'),
    slug: 'portrait',
    get name() {
      return translateCopy('Portre değiştir');
    },
    get subtitle() {
      return translateCopy('Doğal ayrıntıları koruyun');
    },
    kind: 'tool',
    category: 'AI araçları',
    palette: ['#264A58', '#71A7A4'],
    icon: '◎',
    creditCost: 2,
    ai: true,
  },
  {
    id: 'tool-extend',
    previewSource: require('../../assets/onboarding/images/scenes/photo-size-change.webp'),
    slug: 'extend',
    get name() {
      return translateCopy('Fotoğrafı genişlet');
    },
    get subtitle() {
      return translateCopy('Yeni bir kadraj oluşturun');
    },
    kind: 'tool',
    category: 'AI araçları',
    palette: ['#52264B', '#9D6086'],
    icon: '↗',
    creditCost: 2,
    ai: true,
  },
  {
    id: 'tool-gender-change',
    slug: 'gender-change',
    get name() {
      return translateCopy('Cinsiyet değiştirme');
    },
    get subtitle() {
      return translateCopy('Seçtiğin kadınsı veya erkeksi AI görünümü');
    },
    kind: 'tool',
    category: 'AI araçları',
    palette: ['#18151D', '#BBA476'],
    icon: '✧',
    ai: true,
    previewSource: require('../../assets/beauty/gender-change.webp'),
  },
];

export const allCatalogItems = [...scenes, ...filters, ...fictionalPeople, ...aiTools];

export const filterCategories = [
  'Tümü',
  'Popüler',
  'Sanatsal',
  'Doğal',
  'Retro',
  'Sinematik',
  'Portre',
];
export const projectCategories = [
  'Tümü',
  'Favoriler',
  'Sahneler',
  'Filtreler',
  'Ürünler',
  'Kıyafet',
  'Tırnak',
];
