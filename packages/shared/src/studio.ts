/**
 * Public studio identifiers only. Prompt text, model routing and prices belong
 * to the server-side `@birkare/ai` registry.
 */
export const STUDIO_MODES = ['PRODUCT_STUDIO', 'VIRTUAL_TRY_ON', 'NAIL_PREVIEW'] as const;
export type StudioMode = (typeof STUDIO_MODES)[number];

/** `PRODUCT_STUDIO` is the discriminator persisted inside a studio recipe. */
export const STUDIO_SELECTION_KINDS = ['PRODUCT_STUDIO', 'VIRTUAL_TRY_ON', 'NAIL_PREVIEW'] as const;
export type StudioSelectionKind = (typeof STUDIO_SELECTION_KINDS)[number];

export const PRODUCT_CATEGORY_IDS = [
  'handbag',
  'shoes',
  'perfume',
  'jewelry',
  'cosmetics',
  'electronics',
  'furniture',
  'food',
] as const;
export type ProductCategoryId = (typeof PRODUCT_CATEGORY_IDS)[number];

/** Includes the two entry cards that route to their own dedicated workflows. */
export const STUDIO_CATEGORY_IDS = [...PRODUCT_CATEGORY_IDS, 'fashion', 'nails'] as const;
export type StudioCategoryId = (typeof STUDIO_CATEGORY_IDS)[number];

export const PRODUCT_SCENE_IDS = [
  'white-studio',
  'gray-catalog',
  'beige-premium',
  'black-premium',
  'marble',
  'glass-surface',
  'floating',
  'luxury-gold',
  'neon-tech',
  'spotlight',
  'spa-beauty',
  'desktop',
  'boutique',
  'flat-lay',
  'ad-poster',
] as const;
export type ProductSceneId = (typeof PRODUCT_SCENE_IDS)[number];

export const FASHION_SCENE_IDS = [
  'fashion-white-studio',
  'fashion-beige-editorial',
  'fashion-luxury-boutique',
  'fashion-minimal-interior',
  'fashion-street-day',
  'fashion-city-night',
  'fashion-golden-hour',
  'fashion-hotel-lobby',
  'fashion-runway',
  'fashion-magazine-editorial',
  'fashion-red-carpet',
  'fashion-cafe',
  'fashion-istanbul-street',
  'fashion-modest-premium',
  'fashion-event',
] as const;
export type FashionSceneId = (typeof FASHION_SCENE_IDS)[number];

export const NAIL_PRESET_IDS = [
  'nail-nude-clean',
  'nail-classic-red',
  'nail-french',
  'nail-milky-white',
  'nail-burgundy',
  'nail-emerald',
  'nail-black',
  'nail-champagne-chrome',
  'nail-soft-pink',
  'nail-lavender',
  'nail-baby-blue',
  'nail-gold-line',
  'nail-pearl-glazed',
  'nail-cat-eye',
  'nail-editorial-gem',
] as const;
export type NailPresetId = (typeof NAIL_PRESET_IDS)[number];

export const PRODUCT_TASK_IDS = [
  'PRODUCT_CATALOG',
  'PRODUCT_PREMIUM',
  'PRODUCT_AD',
  'PRODUCT_LIFESTYLE',
] as const;
export type ProductTaskId = (typeof PRODUCT_TASK_IDS)[number];

export const TRY_ON_TASK_IDS = ['TRY_ON_STANDARD', 'TRY_ON_EDITORIAL'] as const;
export type TryOnTaskId = (typeof TRY_ON_TASK_IDS)[number];

export const NAIL_TASK_IDS = ['NAIL_COLOR', 'NAIL_ART'] as const;
export type NailTaskId = (typeof NAIL_TASK_IDS)[number];

export const STUDIO_TASK_IDS = [...PRODUCT_TASK_IDS, ...TRY_ON_TASK_IDS, ...NAIL_TASK_IDS] as const;
export type StudioTaskId = (typeof STUDIO_TASK_IDS)[number];

export type ProductStudioSelection = {
  kind: 'PRODUCT_STUDIO';
  categoryId: ProductCategoryId;
  sceneId: ProductSceneId;
};

export type VirtualTryOnSelection = {
  kind: 'VIRTUAL_TRY_ON';
  sceneId: FashionSceneId;
};

export type NailPreviewSelection = {
  kind: 'NAIL_PREVIEW';
  presetId: NailPresetId;
};

/** Exact public shape accepted inside a server-validated generation recipe. */
export type StudioSelection = ProductStudioSelection | VirtualTryOnSelection | NailPreviewSelection;

export type ResolvedProductStudioSelection = ProductStudioSelection & {
  taskType: ProductTaskId;
};

export type ResolvedVirtualTryOnSelection = VirtualTryOnSelection & {
  taskType: TryOnTaskId;
};

export type ResolvedNailPreviewSelection = NailPreviewSelection & {
  taskType: NailTaskId;
};

/** Server-resolved recipe shape; task routing is never accepted from a client. */
export type ResolvedStudioSelection =
  ResolvedProductStudioSelection | ResolvedVirtualTryOnSelection | ResolvedNailPreviewSelection;
