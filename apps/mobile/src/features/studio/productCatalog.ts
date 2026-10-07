import { tr as translateCopy } from '@/i18n/engine';
import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { ImageSourcePropType } from 'react-native';

export type StudioModelLane = 'FAST' | 'PREMIUM';
export type StudioPalette = readonly [string, string];
export type StudioIconName = ComponentProps<typeof Ionicons>['name'];

type StudioCardBase = {
  id: string;
  name: string;
  description: string;
  creditCost: number;
  modelLane: StudioModelLane | null;
  imageSource?: ImageSourcePropType;
  palette: StudioPalette;
  icon: StudioIconName;
};

export type ProductCategory = StudioCardBase & {
  inputMode: 'SINGLE_PRODUCT';
  promptKey: string;
};

export type StudioPreset = StudioCardBase & {
  hdExtraCredits: 2;
  isPremium: boolean;
  promptKey: string;
};
export const productCategories = [
  {
    id: 'handbag',
    get name() {
      return translateCopy('Çanta');
    },
    get description() {
      return translateCopy('Deri, dikiş ve metal detaylarını koruyan premium ürün çekimi.');
    },
    creditCost: 0,
    modelLane: null,
    imageSource: require('../../../assets/products/ui/categories/handbag.webp'),
    palette: ['#5C4638', '#D7B991'],
    icon: 'bag-handle-outline',
    inputMode: 'SINGLE_PRODUCT',
    promptKey: 'CATEGORY_HANDBAG',
  },
  {
    id: 'shoes',
    get name() {
      return translateCopy('Ayakkabı');
    },
    get description() {
      return translateCopy('Taban, bağcık ve çift simetrisini koruyan katalog karesi.');
    },
    creditCost: 0,
    modelLane: null,
    imageSource: require('../../../assets/products/ui/categories/shoes.webp'),
    palette: ['#C7B9A8', '#F2EEE8'],
    icon: 'footsteps-outline',
    inputMode: 'SINGLE_PRODUCT',
    promptKey: 'CATEGORY_SHOES',
  },
  {
    id: 'food',
    get name() {
      return translateCopy('Yiyecek & İçecek');
    },
    get description() {
      return translateCopy('İştah açıcı ama gerçeğe sadık yiyecek ve içecek fotoğrafı.');
    },
    creditCost: 0,
    modelLane: null,
    imageSource: require('../../../assets/products/ui/categories/food.webp'),
    palette: ['#5E2F1C', '#C88A4B'],
    icon: 'restaurant-outline',
    inputMode: 'SINGLE_PRODUCT',
    promptKey: 'CATEGORY_FOOD_AND_BEVERAGE',
  },
  {
    id: 'cosmetics',
    name: 'Kozmetik',
    get description() {
      return translateCopy('Ambalaj, kapak ve etiketi koruyan temiz beauty çekimi.');
    },
    creditCost: 0,
    modelLane: null,
    imageSource: require('../../../assets/products/ui/categories/cosmetics.webp'),
    palette: ['#B9A994', '#F0E7DB'],
    icon: 'color-palette-outline',
    inputMode: 'SINGLE_PRODUCT',
    promptKey: 'CATEGORY_COSMETICS',
  },
  {
    id: 'furniture',
    name: 'Mobilya & Dekor',
    get description() {
      return translateCopy('Ölçek, malzeme ve perspektifi koruyan iç mekân sunumu.');
    },
    creditCost: 0,
    modelLane: null,
    imageSource: require('../../../assets/products/ui/categories/furniture.webp'),
    palette: ['#725A43', '#D8C3A7'],
    icon: 'bed-outline',
    inputMode: 'SINGLE_PRODUCT',
    promptKey: 'CATEGORY_FURNITURE',
  },
  {
    id: 'jewelry',
    get name() {
      return translateCopy('Takı');
    },
    get description() {
      return translateCopy('Taş sayısı, kesim ve metal rengini koruyan makro çekim.');
    },
    creditCost: 0,
    modelLane: null,
    imageSource: require('../../../assets/products/ui/categories/jewelry.webp'),
    palette: ['#5B101B', '#D7A84A'],
    icon: 'diamond-outline',
    inputMode: 'SINGLE_PRODUCT',
    promptKey: 'CATEGORY_JEWELRY',
  },
  {
    id: 'electronics',
    name: 'Telefon & Elektronik',
    get description() {
      return translateCopy('Kamera, port ve kasa geometrisini koruyan teknoloji çekimi.');
    },
    creditCost: 0,
    modelLane: null,
    imageSource: require('../../../assets/products/ui/categories/electronics.webp'),
    palette: ['#121722', '#4B6082'],
    icon: 'phone-portrait-outline',
    inputMode: 'SINGLE_PRODUCT',
    promptKey: 'CATEGORY_ELECTRONICS',
  },
] as const satisfies readonly ProductCategory[];

export const productScenes = [
  {
    id: 'white-studio',
    get name() {
      return translateCopy('Beyaz Stüdyo');
    },
    get description() {
      return translateCopy('Temiz e-ticaret kataloğu.');
    },
    creditCost: 5,
    modelLane: 'FAST',
    imageSource: require('../../../assets/products/ui/scenes/white-studio.webp'),
    palette: ['#D9D9D7', '#FFFFFF'],
    icon: 'camera-outline',
    hdExtraCredits: 2,
    isPremium: false,
    promptKey: 'PRODUCT_SCENE_WHITE_STUDIO',
  },
  {
    id: 'gray-catalog',
    name: 'Gri Katalog',
    get description() {
      return translateCopy('Nötr gri fonda dengeli ışık.');
    },
    creditCost: 5,
    modelLane: 'FAST',
    imageSource: require('../../../assets/products/ui/scenes/gray-catalog.webp'),
    palette: ['#45484E', '#A8ABB0'],
    icon: 'albums-outline',
    hdExtraCredits: 2,
    isPremium: false,
    promptKey: 'PRODUCT_SCENE_GRAY_CATALOG',
  },
  {
    id: 'beige-premium',
    name: 'Bej Premium',
    get description() {
      return translateCopy('Sıcak taş tonlarında rafine sunum.');
    },
    creditCost: 5,
    modelLane: 'FAST',
    imageSource: require('../../../assets/products/ui/scenes/beige-premium.webp'),
    palette: ['#8B735C', '#D8C4A9'],
    icon: 'sunny-outline',
    hdExtraCredits: 2,
    isPremium: false,
    promptKey: 'PRODUCT_SCENE_BEIGE_PREMIUM',
  },
  {
    id: 'black-premium',
    name: 'Siyah Premium',
    get description() {
      return translateCopy('Siyah ve altın detaylı lüks sahne.');
    },
    creditCost: 7,
    modelLane: 'PREMIUM',
    imageSource: require('../../../assets/products/ui/scenes/black-premium.webp'),
    palette: ['#080808', '#6E5325'],
    icon: 'moon-outline',
    hdExtraCredits: 2,
    isPremium: true,
    promptKey: 'PRODUCT_SCENE_BLACK_PREMIUM',
  },
  {
    id: 'marble',
    name: 'Mermer',
    get description() {
      return translateCopy('Gerçekçi mermer yüzey ve yumuşak gölge.');
    },
    creditCost: 5,
    modelLane: 'FAST',
    imageSource: require('../../../assets/products/ui/scenes/marble.webp'),
    palette: ['#8D8176', '#D9D1CA'],
    icon: 'square-outline',
    hdExtraCredits: 2,
    isPremium: false,
    promptKey: 'PRODUCT_SCENE_MARBLE',
  },
  {
    id: 'glass-surface',
    get name() {
      return translateCopy('Cam Yüzey');
    },
    get description() {
      return translateCopy('Kontrollü yansımalı modern vitrin.');
    },
    creditCost: 7,
    modelLane: 'PREMIUM',
    imageSource: require('../../../assets/products/ui/scenes/glass-surface.webp'),
    palette: ['#39464F', '#A7D4DC'],
    icon: 'contrast-outline',
    hdExtraCredits: 2,
    isPremium: true,
    promptKey: 'PRODUCT_SCENE_GLASS_SURFACE',
  },
  {
    id: 'floating',
    name: 'Floating',
    get description() {
      return translateCopy('Dengeli, gerçekçi yüzen ürün kompozisyonu.');
    },
    creditCost: 7,
    modelLane: 'PREMIUM',
    imageSource: require('../../../assets/products/ui/scenes/floating.webp'),
    palette: ['#756652', '#DED2BC'],
    icon: 'arrow-up-outline',
    hdExtraCredits: 2,
    isPremium: true,
    promptKey: 'PRODUCT_SCENE_FLOATING',
  },
  {
    id: 'luxury-gold',
    name: 'Luxury Gold',
    get description() {
      return translateCopy('Altın vurgulu premium reklam karesi.');
    },
    creditCost: 7,
    modelLane: 'PREMIUM',
    imageSource: require('../../../assets/products/ui/scenes/luxury-gold.webp'),
    palette: ['#211507', '#B98222'],
    icon: 'diamond-outline',
    hdExtraCredits: 2,
    isPremium: true,
    promptKey: 'PRODUCT_SCENE_LUXURY_GOLD',
  },
  {
    id: 'neon-tech',
    name: 'Neon Tech',
    get description() {
      return translateCopy('Teknoloji ürünleri için neon gece ışığı.');
    },
    creditCost: 7,
    modelLane: 'PREMIUM',
    imageSource: require('../../../assets/products/ui/scenes/neon-tech.webp'),
    palette: ['#26104E', '#087C99'],
    icon: 'flash-outline',
    hdExtraCredits: 2,
    isPremium: true,
    promptKey: 'PRODUCT_SCENE_NEON_TECH',
  },
  {
    id: 'spotlight',
    name: 'Spotlight',
    get description() {
      return translateCopy('Karanlık fonda kontrollü kahraman ışığı.');
    },
    creditCost: 7,
    modelLane: 'PREMIUM',
    imageSource: require('../../../assets/products/ui/scenes/spotlight.webp'),
    palette: ['#090909', '#6E6559'],
    icon: 'sunny-outline',
    hdExtraCredits: 2,
    isPremium: true,
    promptKey: 'PRODUCT_SCENE_SPOTLIGHT',
  },
  {
    id: 'spa-beauty',
    name: 'Spa Beauty',
    get description() {
      return translateCopy('Kozmetik için doğal ve hijyenik spa düzeni.');
    },
    creditCost: 5,
    modelLane: 'FAST',
    imageSource: require('../../../assets/products/ui/scenes/spa-beauty.webp'),
    palette: ['#58644C', '#D6CDB6'],
    icon: 'leaf-outline',
    hdExtraCredits: 2,
    isPremium: false,
    promptKey: 'PRODUCT_SCENE_SPA_BEAUTY',
  },
  {
    id: 'desktop',
    get name() {
      return translateCopy('Masa Üstü');
    },
    get description() {
      return translateCopy('Gün ışıklı gerçekçi çalışma masası.');
    },
    creditCost: 5,
    modelLane: 'FAST',
    imageSource: require('../../../assets/products/ui/scenes/desktop.webp'),
    palette: ['#74563C', '#D6B889'],
    icon: 'desktop-outline',
    hdExtraCredits: 2,
    isPremium: false,
    promptKey: 'PRODUCT_SCENE_DESKTOP',
  },
  {
    id: 'boutique',
    name: 'Butik',
    get description() {
      return translateCopy('Moda ürünleri için sıcak lüks mağaza.');
    },
    creditCost: 7,
    modelLane: 'PREMIUM',
    imageSource: require('../../../assets/products/ui/scenes/boutique.webp'),
    palette: ['#4D3827', '#C9985C'],
    icon: 'storefront-outline',
    hdExtraCredits: 2,
    isPremium: true,
    promptKey: 'PRODUCT_SCENE_BOUTIQUE',
  },
  {
    id: 'flat-lay',
    name: 'Flat Lay',
    get description() {
      return translateCopy('Üstten bakışlı düzenli katalog kompozisyonu.');
    },
    creditCost: 5,
    modelLane: 'FAST',
    imageSource: require('../../../assets/products/ui/scenes/flat-lay.webp'),
    palette: ['#856F56', '#DCCBB2'],
    icon: 'grid-outline',
    hdExtraCredits: 2,
    isPremium: false,
    promptKey: 'PRODUCT_SCENE_FLAT_LAY',
  },
  {
    id: 'ad-poster',
    name: 'Reklam Poster',
    get description() {
      return translateCopy('Kampanya kullanımı için güçlü hero sahnesi.');
    },
    creditCost: 7,
    modelLane: 'PREMIUM',
    imageSource: require('../../../assets/products/ui/scenes/ad-poster.webp'),
    palette: ['#815823', '#E5BF79'],
    icon: 'megaphone-outline',
    hdExtraCredits: 2,
    isPremium: true,
    promptKey: 'PRODUCT_SCENE_AD_POSTER',
  },
] as const satisfies readonly StudioPreset[];
