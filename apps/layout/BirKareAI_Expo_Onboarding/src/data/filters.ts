import type { AppImageSource } from '@/src/types/image';
import type { FilterGroup, FilterId } from '@/src/types/onboarding';

export type FilterItem = {
  id: FilterId;
  title: string;
  group: Exclude<FilterGroup, 'all'>;
  creditLabel: string;
  image: AppImageSource;
};

export const filterGroups: { id: FilterGroup; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'natural', label: 'Doğal' },
  { id: 'art', label: 'Sanatsal' },
  { id: 'cinematic', label: 'Sinematik' },
  { id: 'professional', label: 'Profesyonel' },
];

export const filters: FilterItem[] = [
  { id: 'natural', title: 'Doğal', group: 'natural', creditLabel: 'Hızlı', image: require('../../assets/images/filters/natural.jpg') },
  { id: 'warm-studio', title: 'Stüdyo', group: 'professional', creditLabel: 'AI', image: require('../../assets/images/filters/warm-studio.jpg') },
  { id: 'cinematic', title: 'Cinematic', group: 'cinematic', creditLabel: 'AI', image: require('../../assets/images/filters/cinematic.jpg') },
  { id: 'pop-art', title: 'Pop Art', group: 'art', creditLabel: 'AI', image: require('../../assets/images/filters/pop-art.jpg') },
  { id: 'drip-art', title: 'Drip Art', group: 'art', creditLabel: 'AI', image: require('../../assets/images/filters/drip-art.jpg') },
  { id: 'hdr', title: 'HDR', group: 'natural', creditLabel: 'Hızlı', image: require('../../assets/images/filters/hdr.jpg') },
  { id: 'black-white', title: 'Siyah Beyaz', group: 'professional', creditLabel: 'Hızlı', image: require('../../assets/images/filters/black-white.jpg') },
  { id: 'vintage', title: 'Vintage', group: 'cinematic', creditLabel: 'AI', image: require('../../assets/images/filters/vintage.jpg') },
  { id: 'bokeh', title: 'Bokeh', group: 'professional', creditLabel: 'AI', image: require('../../assets/images/filters/bokeh.jpg') },
  { id: 'cyberpunk', title: 'Cyberpunk', group: 'cinematic', creditLabel: 'AI', image: require('../../assets/images/filters/cyberpunk.jpg') },
  { id: 'watercolor', title: 'Watercolor', group: 'art', creditLabel: 'AI', image: require('../../assets/images/filters/watercolor.jpg') },
  { id: 'sketch', title: 'Sketch', group: 'art', creditLabel: 'AI', image: require('../../assets/images/filters/sketch.jpg') },
  { id: 'cartoon', title: 'Cartoon', group: 'art', creditLabel: 'AI', image: require('../../assets/images/filters/cartoon.jpg') },
];
