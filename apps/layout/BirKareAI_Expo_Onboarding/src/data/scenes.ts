import type { AppImageSource } from '@/src/types/image';

export type SceneItem = {
  id: string;
  title: string;
  category: 'fan' | 'luxury' | 'cinematic' | 'travel';
  image: AppImageSource;
};

export const scenes: SceneItem[] = [
  { id: 'fan-stadium-01', title: 'Stadyum Selfie', category: 'fan', image: require('../../assets/images/scenes/fan-selfie-stadium-01.jpg') },
  { id: 'fan-stadium-02', title: 'Maç Sonrası', category: 'fan', image: require('../../assets/images/scenes/fan-selfie-stadium-02.jpg') },
  { id: 'fan-celebration', title: 'Kutlama Karesi', category: 'fan', image: require('../../assets/images/scenes/fan-selfie-celebration.jpg') },
  { id: 'red-carpet', title: 'Kırmızı Halı', category: 'cinematic', image: require('../../assets/images/scenes/red-carpet.jpg') },
  { id: 'stadium-night', title: 'Gece Stadyumu', category: 'cinematic', image: require('../../assets/images/scenes/stadium-night.jpg') },
  { id: 'city-night', title: 'Gece Işıkları', category: 'cinematic', image: require('../../assets/images/scenes/city-night.jpg') },
  { id: 'luxury-villa', title: 'Lüks Villa', category: 'luxury', image: require('../../assets/images/scenes/luxury-villa.jpg') },
  { id: 'gala-lounge', title: 'Gala Salonu', category: 'luxury', image: require('../../assets/images/scenes/gala-lounge.jpg') },
  { id: 'private-suite', title: 'Özel Süit', category: 'luxury', image: require('../../assets/images/scenes/private-suite.jpg') },
  { id: 'yacht-sunset', title: 'Gün Batımı Yatı', category: 'travel', image: require('../../assets/images/scenes/yacht-sunset.jpg') },
  { id: 'mountain-chalet', title: 'Dağ Evi', category: 'travel', image: require('../../assets/images/scenes/mountain-chalet.jpg') },
  { id: 'historic-gala', title: 'Tarihî Gala', category: 'cinematic', image: require('../../assets/images/scenes/historic-gala.jpg') },
];

export const demoGalleryImages: { id: string; image: AppImageSource }[] = [
  { id: 'demo-1', image: require('../../assets/images/onboarding/gallery-01.jpg') },
  { id: 'demo-2', image: require('../../assets/images/onboarding/gallery-02.jpg') },
  { id: 'demo-3', image: require('../../assets/images/onboarding/gallery-03.jpg') },
  { id: 'demo-4', image: require('../../assets/images/onboarding/gallery-04.jpg') },
  { id: 'demo-5', image: require('../../assets/images/onboarding/gallery-05.jpg') },
];
