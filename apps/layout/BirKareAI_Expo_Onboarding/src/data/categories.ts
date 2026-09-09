import type { AppImageSource } from '@/src/types/image';
import type { CategoryId } from '@/src/types/onboarding';

export type CategoryItem = {
  id: CategoryId;
  title: string;
  shortTitle: string;
  description: string;
  badge?: string;
  image: AppImageSource;
};

export const categories: CategoryItem[] = [
  {
    id: 'fan-selfie',
    title: 'Ünlü ile selfie sahnesi',
    shortTitle: 'Fan Selfie',
    description: 'Kurgusal veya lisanslı yıldız karakterlerle fan karesi oluştur.',
    badge: 'Popüler',
    image: require('../../assets/images/categories/fan-selfie.jpg'),
  },
  {
    id: 'background',
    title: 'Arka plan dönüşümü',
    shortTitle: 'Arka Plan',
    description: 'Sade bir fotoğrafı lüks, özel veya seyahat temalı bir sahneye taşı.',
    image: require('../../assets/images/categories/background-change.png'),
  },
  {
    id: 'art-filter',
    title: 'Filtre ve sanat stili',
    shortTitle: 'Sanat Stili',
    description: 'Pop art, drip art, çizim, cyberpunk ve daha fazlasını dene.',
    image: require('../../assets/images/categories/art-style.jpg'),
  },
  {
    id: 'professional',
    title: 'Profesyonel portre',
    shortTitle: 'Profesyonel',
    description: 'LinkedIn, öz geçmiş ve kurumsal profil için stüdyo görünümü.',
    image: require('../../assets/images/categories/professional-portrait.jpg'),
  },
  {
    id: 'cinematic',
    title: 'Sinematik sahne',
    shortTitle: 'Sinematik',
    description: 'Gece ışıkları, kırmızı halı, stadyum ve gala atmosferleri.',
    image: require('../../assets/images/categories/cinematic-scene.jpg'),
  },
];
