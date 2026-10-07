import { useLanguageRevision } from '@/i18n/use-language';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { apiRequest } from '@/api/client';
import {
  productCategories as localProductCategories,
  productScenes as localProductScenes,
} from './productCatalog';

const idSchema = z.string().min(1).max(80);
const modelLaneSchema = z.enum(['FAST', 'PREMIUM']);
const categorySchema = z
  .object({
    id: idSchema,
    label: z.string().min(1).max(100),
    previewImage: z.string().min(1).max(180),
    inputMode: z.literal('SINGLE_PRODUCT'),
    routeMode: z.literal('PRODUCT_STUDIO'),
    enabled: z.boolean(),
  })
  .strict();
const productSceneSchema = z
  .object({
    id: idSchema,
    label: z.string().min(1).max(100),
    previewImage: z.string().max(180).nullable(),
    modelLane: modelLaneSchema,
    baseCredits: z.number().int().min(1).max(50),
    hdExtraCredits: z.number().int().min(0).max(20),
    enabled: z.boolean(),
    type: z.literal('product_scene'),
    defaultTaskType: z.enum([
      'PRODUCT_CATALOG',
      'PRODUCT_PREMIUM',
      'PRODUCT_AD',
      'PRODUCT_LIFESTYLE',
    ]),
  })
  .strict();
const productCatalogResponseSchema = z
  .object({
    previewCredits: z.number().int().min(1).max(20),
    hdExtraCredits: z.number().int().min(0).max(20),
    categories: z.array(categorySchema).max(30),
    productScenes: z.array(productSceneSchema).max(40),
  })
  .strip();

type ProductCatalogResponse = z.infer<typeof productCatalogResponseSchema>;
type PricedServerItem = {
  id: string;
  enabled: boolean;
  baseCredits: number;
  modelLane: 'FAST' | 'PREMIUM';
};

async function fetchProductStudioCatalog(): Promise<ProductCatalogResponse> {
  const payload = await apiRequest<unknown>(
    '/v1/catalog/studio/product',
    { method: 'GET' },
    { authenticated: false },
  );
  return productCatalogResponseSchema.parse(payload);
}

function mergeProductCategories(
  serverCategories: ProductCatalogResponse['categories'] | undefined,
) {
  if (!serverCategories) return [...localProductCategories];
  const enabledIds = new Set(
    serverCategories.filter((item) => item.enabled).map((item) => item.id),
  );
  return localProductCategories.filter((item) => enabledIds.has(item.id));
}

function mergeProductScenes(serverItems: readonly PricedServerItem[] | undefined) {
  if (!serverItems) return localProductScenes.map((item) => ({ ...item }));
  const byId = new Map(serverItems.map((item) => [item.id, item]));
  return localProductScenes.flatMap((item) => {
    const serverItem = byId.get(item.id);
    if (!serverItem?.enabled) return [];
    return [
      {
        ...item,
        creditCost: serverItem.baseCredits,
        modelLane: serverItem.modelLane,
      },
    ];
  });
}

/** Product-only projection keeps archived fashion/nail assets out of the App Store bundle. */
export function useProductStudioCatalog() {
  const languageRevision = useLanguageRevision();
  const query = useQuery({
    queryKey: ['product-studio-public-catalog'],
    queryFn: fetchProductStudioCatalog,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
  const projection = useMemo(() => {
    // Rebuild translated getters when the user changes the app language.
    void languageRevision;
    return {
      productCategories: mergeProductCategories(query.data?.categories),
      productScenes: mergeProductScenes(query.data?.productScenes),
      previewCredits: query.data?.previewCredits ?? 1,
      hdExtraCredits: query.data?.hdExtraCredits ?? 2,
    };
  }, [query.data, languageRevision]);
  return { ...query, ...projection };
}
