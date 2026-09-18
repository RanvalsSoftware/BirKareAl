import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { apiRequest } from '@/api/client';
import {
  fashionScenes as localFashionScenes,
  nailPresets as localNailPresets,
  productCategories as localProductCategories,
  productScenes as localProductScenes,
  studioModeCards as localStudioModeCards,
  type StudioModeCard,
} from './catalog';

const idSchema = z.string().min(1).max(80);
const versionSchema = z.string().min(1).max(96);
const modelLaneSchema = z.enum(['FAST', 'PREMIUM']);

const categorySchema = z
  .object({
    id: idSchema,
    label: z.string().min(1).max(100),
    previewImage: z.string().min(1).max(180),
    inputMode: z.enum(['SINGLE_PRODUCT', 'PERSON_AND_GARMENT', 'HAND_PHOTO']),
    routeMode: z.enum(['PRODUCT_STUDIO', 'VIRTUAL_TRY_ON', 'NAIL_PREVIEW']),
    enabled: z.boolean(),
  })
  .strict();

const pricedBase = {
  id: idSchema,
  label: z.string().min(1).max(100),
  previewImage: z.string().max(180).nullable(),
  modelLane: modelLaneSchema,
  baseCredits: z.number().int().min(1).max(50),
  hdExtraCredits: z.number().int().min(0).max(20),
  enabled: z.boolean(),
};

const productSceneSchema = z
  .object({
    ...pricedBase,
    type: z.literal('product_scene'),
    defaultTaskType: z.enum([
      'PRODUCT_CATALOG',
      'PRODUCT_PREMIUM',
      'PRODUCT_AD',
      'PRODUCT_LIFESTYLE',
    ]),
  })
  .strict();

const fashionSceneSchema = z
  .object({
    ...pricedBase,
    type: z.literal('fashion_scene'),
    defaultTaskType: z.enum(['TRY_ON_STANDARD', 'TRY_ON_EDITORIAL']),
  })
  .strict();

const nailPresetSchema = z
  .object({
    ...pricedBase,
    type: z.literal('nail_preset'),
    defaultTaskType: z.enum(['NAIL_COLOR', 'NAIL_ART']),
  })
  .strict();

export const studioPublicCatalogSchema = z
  .object({
    catalogVersion: versionSchema,
    promptVersion: versionSchema,
    pricingVersion: versionSchema,
    previewCredits: z.number().int().min(1).max(20),
    hdExtraCredits: z.number().int().min(0).max(20),
    categories: z.array(categorySchema).max(30),
    productScenes: z.array(productSceneSchema).max(40),
    fashionScenes: z.array(fashionSceneSchema).max(40),
    nailPresets: z.array(nailPresetSchema).max(40),
  })
  .strict();

export type StudioPublicCatalog = z.infer<typeof studioPublicCatalogSchema>;

export async function fetchStudioPublicCatalog(): Promise<StudioPublicCatalog> {
  const payload = await apiRequest<unknown>(
    '/v1/catalog/studio',
    { method: 'GET' },
    { authenticated: false },
  );
  return studioPublicCatalogSchema.parse(payload);
}

type PricedServerItem = {
  id: string;
  enabled: boolean;
  baseCredits: number;
  modelLane: 'FAST' | 'PREMIUM';
};

export function mergePricedStudioItems<
  T extends { id: string; creditCost: number; modelLane: 'FAST' | 'PREMIUM' },
>(
  localItems: readonly T[],
  serverItems: readonly PricedServerItem[] | undefined,
): (Omit<T, 'creditCost' | 'modelLane'> &
  Pick<PricedServerItem, 'modelLane'> & { creditCost: number })[] {
  type MergedItem = Omit<T, 'creditCost' | 'modelLane'> &
    Pick<PricedServerItem, 'modelLane'> & { creditCost: number };

  if (!serverItems) return localItems.map((item) => ({ ...item })) as MergedItem[];
  const byId = new Map(serverItems.map((item) => [item.id, item]));
  return localItems.flatMap((item) => {
    const serverItem = byId.get(item.id);
    if (!serverItem?.enabled) return [];
    return [
      {
        ...item,
        creditCost: serverItem.baseCredits,
        modelLane: serverItem.modelLane,
      },
    ];
  }) as MergedItem[];
}

export function mergeStudioCategories(
  serverCategories: StudioPublicCatalog['categories'] | undefined,
) {
  if (!serverCategories) return [...localProductCategories];
  const enabledIds = new Set(
    serverCategories
      .filter((item) => item.enabled && item.routeMode === 'PRODUCT_STUDIO')
      .map((item) => item.id),
  );
  return localProductCategories.filter((item) => enabledIds.has(item.id));
}

export function mergeStudioModeCards(catalog: StudioPublicCatalog | undefined): StudioModeCard[] {
  if (!catalog) return [...localStudioModeCards];
  const productById = new Map(catalog.productScenes.map((item) => [item.id, item]));
  const fashionById = new Map(catalog.fashionScenes.map((item) => [item.id, item]));
  const nailById = new Map(catalog.nailPresets.map((item) => [item.id, item]));
  return localStudioModeCards.flatMap((item) => {
    const defaultPresetId = 'defaultPresetId' in item ? item.defaultPresetId : undefined;
    const defaultSceneId = 'defaultSceneId' in item ? item.defaultSceneId : undefined;
    const priced = defaultPresetId
      ? nailById.get(defaultPresetId)
      : item.mode === 'fashion' && defaultSceneId
        ? fashionById.get(defaultSceneId)
        : defaultSceneId
          ? productById.get(defaultSceneId)
          : undefined;
    if (!priced?.enabled) return [];
    return [{ ...item, creditCost: priced.baseCredits, modelLane: priced.modelLane }];
  });
}

export function useStudioCatalog() {
  const query = useQuery({
    queryKey: ['studio-public-catalog'],
    queryFn: fetchStudioPublicCatalog,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
  const projection = useMemo(
    () => ({
      productCategories: mergeStudioCategories(query.data?.categories),
      productScenes: mergePricedStudioItems(localProductScenes, query.data?.productScenes),
      fashionScenes: mergePricedStudioItems(localFashionScenes, query.data?.fashionScenes),
      nailPresets: mergePricedStudioItems(localNailPresets, query.data?.nailPresets),
      studioModeCards: mergeStudioModeCards(query.data),
      previewCredits: query.data?.previewCredits ?? 1,
      hdExtraCredits: query.data?.hdExtraCredits ?? 2,
    }),
    [query.data],
  );
  return { ...query, ...projection };
}
