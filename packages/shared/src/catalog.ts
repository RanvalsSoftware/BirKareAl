export type CatalogItem = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  category: string;
  previewColor: string;
  requiredCredits: number;
  isPro?: boolean;
  enabled: boolean;
  tags: string[];
};

/**
 * Catalog data is trusted server-side configuration. A character reference is
 * never supplied by the mobile client; licensed references can only be loaded
 * through this record after its rights state has been checked.
 */
export type CatalogFeaturedPerson = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  category: string;
  previewColor: string;
  requiredCredits: number;
  enabled: boolean;
  isSelectable: boolean;
  isSearchable?: boolean;
  generationEnabled: boolean;
  requiresDisclosure: boolean;
  requiresWatermark: boolean;
  tags: string[];
  kind: 'FICTIONAL_CHARACTER' | 'LICENSED_PERSON' | 'PUBLIC_FIGURE_FAN_ART' | 'HISTORICAL_FIGURE';
  rightsStatus: 'FICTIONAL' | 'PENDING_REVIEW' | 'LICENSED' | 'LIMITED' | 'EXPIRED' | 'BLOCKED';
  referenceAssetId?: string | null;
  disclosureText?: string;
};

export const catalogFixtures = {
  scenes: [
    {
      id: 'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d101',
      slug: 'stadium-night',
      name: 'Gece Stadyumu',
      description: 'Stadyum ışıkları altında güçlü bir kare.',
      category: 'Popüler',
      previewColor: '#174b6e',
      requiredCredits: 0,
      enabled: true,
      tags: ['spor', 'stadyum', 'gece'],
    },
    {
      id: 'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d102',
      slug: 'award-night',
      name: 'Ödül Gecesi',
      description: 'Zarif ödül töreni atmosferi.',
      category: 'Etkinlik',
      previewColor: '#4b2b3b',
      requiredCredits: 0,
      enabled: true,
      tags: ['ödül', 'kırmızı halı'],
    },
    {
      id: 'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d103',
      slug: 'red-carpet',
      name: 'Kırmızı Halı',
      description: 'Sinematik gala girişi.',
      category: 'Etkinlik',
      previewColor: '#771d2c',
      requiredCredits: 0,
      enabled: true,
      tags: ['gala', 'stil'],
    },
    {
      id: 'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d104',
      slug: 'luxury-car',
      name: 'Lüks Araç',
      description: 'Şehir ışıkları ve modern otomobil.',
      category: 'Yaşam',
      previewColor: '#2b2f38',
      requiredCredits: 0,
      enabled: true,
      tags: ['araba', 'şehir'],
    },
    {
      id: 'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d105',
      slug: 'istanbul-sunset',
      name: 'İstanbul Gün Batımı',
      description: 'Boğaz kıyısında sıcak ışık.',
      category: 'Seyahat',
      previewColor: '#a95021',
      requiredCredits: 0,
      enabled: true,
      tags: ['istanbul', 'gün batımı'],
    },
    {
      id: 'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d106',
      slug: 'cosmic-camp',
      name: 'Kozmik Kamp',
      description: 'Yıldızlı gökyüzünde özgün sahne.',
      category: 'Sanatsal',
      previewColor: '#33205f',
      requiredCredits: 1,
      isPro: true,
      enabled: true,
      tags: ['uzay', 'gece', 'sanat'],
    },
    {
      id: 'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d107',
      slug: 'waterfront-night',
      name: 'Şehir Işıkları',
      description: 'Gece kıyısı, ışıklı köprü ve su yansımaları.',
      category: 'Şehir',
      previewColor: '#142B52',
      requiredCredits: 0,
      isPro: false,
      enabled: true,
      tags: ['şehir', 'köprü', 'gece'],
    },
    {
      id: 'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d108',
      slug: 'coastal-terrace',
      name: 'Sahil Günü',
      description: 'Turkuaz koyda çiçekli Akdeniz terası.',
      category: 'Doğa',
      previewColor: '#087F94',
      requiredCredits: 0,
      isPro: false,
      enabled: true,
      tags: ['sahil', 'teras', 'akdeniz'],
    },
    {
      id: 'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d109',
      slug: 'window-portrait',
      name: 'Stüdyo Işığı',
      description: 'Koyu fonda pencere ışıklı doğal portre.',
      category: 'Portre',
      previewColor: '#303036',
      requiredCredits: 1,
      isPro: true,
      enabled: true,
      tags: ['portre', 'pencere', 'ışık'],
    },
    {
      id: 'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d110',
      slug: 'neon-drive',
      name: 'Neon Gelecek',
      description: 'Neon şehirde ıslak zemin ve özgün spor otomobil.',
      category: 'Fantastik',
      previewColor: '#602099',
      requiredCredits: 1,
      isPro: true,
      enabled: true,
      tags: ['neon', 'otomobil', 'gece'],
    },
    {
      id: 'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d111',
      slug: 'alpine-lake',
      name: 'Dağ Gölü',
      description: 'Gün batımında dağ gölü ve ahşap kulübe.',
      category: 'Doğa',
      previewColor: '#244A63',
      requiredCredits: 0,
      isPro: false,
      enabled: true,
      tags: ['dağ', 'göl', 'gün batımı'],
    },
  ] satisfies CatalogItem[],
  filters: [
    {
      id: '438b8c54-9f6b-4e3c-9d7f-9ba532e4d101',
      slug: 'drip-art',
      name: 'Drip Art',
      description: 'Akışkan boya dokulu özgün stil.',
      category: 'Sanatsal',
      previewColor: '#692aac',
      requiredCredits: 1,
      enabled: true,
      tags: ['art', 'boya'],
    },
    {
      id: '438b8c54-9f6b-4e3c-9d7f-9ba532e4d102',
      slug: 'pop-art',
      name: 'Pop Art',
      description: 'Canlı ve grafik pop art görünümü.',
      category: 'Sanatsal',
      previewColor: '#f04e8c',
      requiredCredits: 1,
      enabled: true,
      tags: ['pop', 'renkli'],
    },
    {
      id: '438b8c54-9f6b-4e3c-9d7f-9ba532e4d103',
      slug: 'hdr',
      name: 'HDR',
      description: 'Yüksek dinamik aralık ve detay.',
      category: 'Doğal',
      previewColor: '#c47b32',
      requiredCredits: 1,
      enabled: true,
      tags: ['detay', 'kontrast'],
    },
    {
      id: '438b8c54-9f6b-4e3c-9d7f-9ba532e4d104',
      slug: 'bokeh',
      name: 'Bokeh',
      description: 'Yumuşak arka plan ve portre odağı.',
      category: 'Portre',
      previewColor: '#315239',
      requiredCredits: 1,
      enabled: true,
      tags: ['portre', 'bulanık'],
    },
    {
      id: '438b8c54-9f6b-4e3c-9d7f-9ba532e4d105',
      slug: 'cinematic',
      name: 'Cinematic',
      description: 'Film benzeri doğal sinematik ton.',
      category: 'Popüler',
      previewColor: '#3d4b5e',
      requiredCredits: 1,
      enabled: true,
      tags: ['film', 'sinema'],
    },
    {
      id: '438b8c54-9f6b-4e3c-9d7f-9ba532e4d106',
      slug: 'vintage',
      name: 'Vintage',
      description: 'Sıcak, nostaljik film görünümü.',
      category: 'Popüler',
      previewColor: '#756441',
      requiredCredits: 1,
      enabled: true,
      tags: ['retro', 'film'],
    },
    {
      id: '438b8c54-9f6b-4e3c-9d7f-9ba532e4d107',
      slug: 'black-white',
      name: 'Siyah Beyaz',
      description: 'Zengin ton aralığıyla zamansız monokrom portre.',
      category: 'Portre',
      previewColor: '#60636a',
      requiredCredits: 1,
      enabled: true,
      tags: ['monokrom', 'portre'],
    },
    {
      id: '438b8c54-9f6b-4e3c-9d7f-9ba532e4d108',
      slug: 'cyberpunk',
      name: 'Cyberpunk',
      description: 'Özgün neon şehir atmosferi ve güçlü renk kontrastı.',
      category: 'Sinematik',
      previewColor: '#503882',
      requiredCredits: 1,
      enabled: true,
      tags: ['neon', 'gece', 'futuristik'],
    },
    {
      id: '438b8c54-9f6b-4e3c-9d7f-9ba532e4d109',
      slug: 'watercolor',
      name: 'Watercolor',
      description: 'Yumuşak katmanlı özgün suluboya yorumu.',
      category: 'Sanatsal',
      previewColor: '#4a7791',
      requiredCredits: 1,
      enabled: true,
      tags: ['suluboya', 'sanat'],
    },
    {
      id: '438b8c54-9f6b-4e3c-9d7f-9ba532e4d110',
      slug: 'sketch',
      name: 'Sketch',
      description: 'İnce çizgi ve doğal doku içeren özgün eskiz stili.',
      category: 'Sanatsal',
      previewColor: '#666261',
      requiredCredits: 1,
      enabled: true,
      tags: ['eskiz', 'çizim'],
    },
    {
      id: '438b8c54-9f6b-4e3c-9d7f-9ba532e4d111',
      slug: 'cartoon',
      name: 'Cartoon',
      description: 'Temiz hatlı, özgün ve neşeli illüstrasyon görünümü.',
      category: 'Sanatsal',
      previewColor: '#d76858',
      requiredCredits: 1,
      enabled: true,
      tags: ['çizgi', 'illüstrasyon'],
    },
  ] satisfies CatalogItem[],
  styles: [
    {
      id: 'd38b8c54-9f6b-4e3c-9d7f-9ba532e4d101',
      slug: 'natural-light',
      name: 'Doğal Işık',
      category: 'Doğal',
      previewColor: '#7a6b4b',
      requiredCredits: 0,
      enabled: true,
      tags: ['natural'],
    },
    {
      id: 'd38b8c54-9f6b-4e3c-9d7f-9ba532e4d102',
      slug: 'studio',
      name: 'Stüdyo',
      category: 'Portre',
      previewColor: '#554950',
      requiredCredits: 0,
      enabled: true,
      tags: ['studio'],
    },
  ] satisfies CatalogItem[],
  featuredPeople: [
    {
      id: 'a18b8c54-9f6b-4e3c-9d7f-9ba532e4d101',
      slug: 'saha-efsanesi',
      name: 'Saha Efsanesi',
      description: 'Kurgusal futbol yıldızı; AI fan sahnesi olarak etiketlenir.',
      category: 'Spor',
      previewColor: '#aa781f',
      requiredCredits: 2,
      enabled: true,
      isSelectable: true,
      isSearchable: true,
      generationEnabled: true,
      requiresDisclosure: true,
      requiresWatermark: false,
      tags: ['fictional', 'spor'],
      kind: 'FICTIONAL_CHARACTER',
      rightsStatus: 'FICTIONAL',
      disclosureText: 'Bu görsel BirKare AI ile oluşturulmuş kurgusal bir fan sahnesidir.',
    },
    {
      id: 'a18b8c54-9f6b-4e3c-9d7f-9ba532e4d102',
      slug: 'sinematik-yildiz',
      name: 'Sinematik Yıldız',
      description: 'Kurgusal kırmızı halı karakteri.',
      category: 'Kültür',
      previewColor: '#7b315a',
      requiredCredits: 2,
      enabled: true,
      isSelectable: true,
      isSearchable: true,
      generationEnabled: true,
      requiresDisclosure: true,
      requiresWatermark: false,
      tags: ['fictional', 'kültür'],
      kind: 'FICTIONAL_CHARACTER',
      rightsStatus: 'FICTIONAL',
      disclosureText: 'Bu görsel BirKare AI ile oluşturulmuş kurgusal bir fan sahnesidir.',
    },
  ] satisfies CatalogFeaturedPerson[],
};

export type FeaturedPersonFixture = CatalogFeaturedPerson;
