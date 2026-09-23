import { describe, expect, it, vi } from 'vitest';

import {
  mergePricedStudioItems,
  mergeStudioCategories,
  mergeStudioModeCards,
  studioPublicCatalogSchema,
  type StudioPublicCatalog,
} from './useStudioCatalog';

vi.mock('@/api/client', () => ({ apiRequest: vi.fn() }));
vi.mock('./catalog', () => ({
  fashionScenes: [],
  nailPresets: [],
  productCategories: [
    { id: 'handbag', creditCost: 0, modelLane: null, name: 'Çanta' },
    { id: 'shoes', creditCost: 0, modelLane: null, name: 'Ayakkabı' },
  ],
  productScenes: [
    {
      id: 'beige-premium',
      creditCost: 7,
      modelLane: 'PREMIUM',
      name: 'Bej Premium',
    },
  ],
  studioModeCards: [
    {
      id: 'product-shoot',
      mode: 'product',
      defaultSceneId: 'beige-premium',
      creditCost: 7,
      modelLane: 'PREMIUM',
    },
  ],
}));

const emptyCatalog: StudioPublicCatalog = {
  catalogVersion: 'catalog-v1',
  promptVersion: 'prompt-v1',
  pricingVersion: 'pricing-v1',
  previewCredits: 1,
  hdExtraCredits: 2,
  categories: [],
  productScenes: [],
  fashionScenes: [],
  nailPresets: [],
};

describe('server-owned studio catalog projection', () => {
  it('rejects unexpected prompt-like public fields', () => {
    expect(() =>
      studioPublicCatalogSchema.parse({ ...emptyCatalog, systemPrompt: 'must never ship' }),
    ).toThrow();
  });

  it('filters disabled IDs and overrides display price and lane from the server', () => {
    const local = [
      { id: 'first', creditCost: 99, modelLane: 'FAST' as const, label: 'First' },
      { id: 'second', creditCost: 99, modelLane: 'FAST' as const, label: 'Second' },
    ];
    expect(
      mergePricedStudioItems(local, [
        { id: 'first', enabled: true, baseCredits: 7, modelLane: 'PREMIUM' },
        { id: 'second', enabled: false, baseCredits: 5, modelLane: 'FAST' },
      ]),
    ).toEqual([{ id: 'first', creditCost: 7, modelLane: 'PREMIUM', label: 'First' }]);
  });

  it('shows only enabled product categories announced by the API', () => {
    const categories: StudioPublicCatalog['categories'] = [
      {
        id: 'handbag',
        label: 'Çanta',
        previewImage: 'categories/handbag.webp',
        inputMode: 'SINGLE_PRODUCT',
        routeMode: 'PRODUCT_STUDIO',
        enabled: false,
      },
      {
        id: 'shoes',
        label: 'Ayakkabı',
        previewImage: 'categories/shoes.webp',
        inputMode: 'SINGLE_PRODUCT',
        routeMode: 'PRODUCT_STUDIO',
        enabled: true,
      },
    ];
    expect(mergeStudioCategories(categories).map((item) => item.id)).toEqual(['shoes']);
  });

  it('derives hub badge cost from each server default instead of local constants', () => {
    const catalog: StudioPublicCatalog = {
      ...emptyCatalog,
      productScenes: [
        {
          id: 'beige-premium',
          type: 'product_scene',
          label: 'Bej Premium',
          previewImage: 'scenes/beige-premium.webp',
          modelLane: 'PREMIUM',
          baseCredits: 11,
          hdExtraCredits: 2,
          defaultTaskType: 'PRODUCT_PREMIUM',
          enabled: true,
        },
      ],
    };
    expect(mergeStudioModeCards(catalog)).toMatchObject([
      { id: 'product-shoot', creditCost: 11, modelLane: 'PREMIUM' },
    ]);
  });
});
