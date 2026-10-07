import type { StudioAspectRatio, StudioCommerceGoal } from './productFlow';

export type CommerceGoalDefinition = {
  id: StudioCommerceGoal;
  titleTr: string;
  titleEn: string;
  descriptionTr: string;
  descriptionEn: string;
  sceneId: string;
  aspectRatio: StudioAspectRatio;
  icon: 'storefront-outline' | 'bag-handle-outline' | 'megaphone-outline' | 'desktop-outline';
};

/**
 * These are workflow shortcuts, not marketplace-compliance guarantees. Each
 * choice maps to a real server-owned product scene and a supported ratio.
 */
export const commerceGoals: readonly CommerceGoalDefinition[] = [
  {
    id: 'marketplace',
    titleTr: 'Pazaryeri kataloğu',
    titleEn: 'Marketplace catalog',
    descriptionTr: 'Temiz fonda, ürünü öne çıkaran listeleme görseli.',
    descriptionEn: 'A clean listing visual that keeps the product front and center.',
    sceneId: 'white-studio',
    aspectRatio: '1:1',
    icon: 'storefront-outline',
  },
  {
    id: 'product-page',
    titleTr: 'Ürün sayfası',
    titleEn: 'Product page',
    descriptionTr: 'Malzeme ve formu koruyan premium ürün karesi.',
    descriptionEn: 'A premium product frame that preserves material and shape.',
    sceneId: 'beige-premium',
    aspectRatio: '4:5',
    icon: 'bag-handle-outline',
  },
  {
    id: 'social-ad',
    titleTr: 'Sosyal medya ilanı',
    titleEn: 'Social ad',
    descriptionTr: 'Metin alanı bırakabilen, dikkat çekici kampanya görseli.',
    descriptionEn: 'An attention-ready campaign visual with room for copy.',
    sceneId: 'ad-poster',
    aspectRatio: '4:5',
    icon: 'megaphone-outline',
  },
  {
    id: 'web-hero',
    titleTr: 'Web vitrin görseli',
    titleEn: 'Web hero',
    descriptionTr: 'Mağaza ve kampanya sayfaları için yatay kompozisyon.',
    descriptionEn: 'A wide composition for storefront and campaign pages.',
    sceneId: 'desktop',
    aspectRatio: '16:9',
    icon: 'desktop-outline',
  },
] as const;

export function commerceGoalById(id: StudioCommerceGoal): CommerceGoalDefinition {
  return commerceGoals.find((goal) => goal.id === id) ?? commerceGoals[0];
}
