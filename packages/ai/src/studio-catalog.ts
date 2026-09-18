import {
  FASHION_SCENE_IDS,
  NAIL_PRESET_IDS,
  NAIL_TASK_IDS,
  PRODUCT_CATEGORY_IDS,
  PRODUCT_SCENE_IDS,
  PRODUCT_TASK_IDS,
  STUDIO_CATEGORY_IDS,
  TRY_ON_TASK_IDS,
  type FashionSceneId,
  type NailPresetId,
  type NailPreviewSelection,
  type NailTaskId,
  type ProductCategoryId,
  type ProductSceneId,
  type ProductStudioSelection,
  type ProductTaskId,
  type ResolvedNailPreviewSelection,
  type ResolvedProductStudioSelection,
  type ResolvedStudioSelection,
  type ResolvedVirtualTryOnSelection,
  type StudioCategoryId,
  type StudioMode,
  type StudioSelection,
  type TryOnTaskId,
  type VirtualTryOnSelection,
} from '@birkare/shared';

export const STUDIO_PROMPT_VERSION = '2026-09-15-studio-prompts-v1';
export const STUDIO_PRICING_VERSION = '2026-09-15-studio-pricing-v1';
export const STUDIO_CATALOG_VERSION = '2026-09-15-studio-catalog-v2';
export const STUDIO_HD_EXTRA_CREDITS = 2;
export const STUDIO_PREVIEW_CREDITS = 1;

export type StudioModelLane = 'FAST' | 'PREMIUM';

export type StudioCategoryDescriptor = Readonly<{
  id: StudioCategoryId;
  label: string;
  previewImage: string;
  inputMode: 'SINGLE_PRODUCT' | 'PERSON_AND_GARMENT' | 'HAND_PHOTO';
  routeMode: StudioMode;
  /** Public discovery flag; server generation support is checked separately. */
  enabled: boolean;
}>;

type PricedDescriptor = Readonly<{
  label: string;
  previewImage: string | null;
  modelLane: StudioModelLane;
  baseCredits: number;
  hdExtraCredits: typeof STUDIO_HD_EXTRA_CREDITS;
  enabled: boolean;
}>;

export type ProductSceneDescriptor = PricedDescriptor &
  Readonly<{
    id: ProductSceneId;
    type: 'product_scene';
    defaultTaskType: ProductTaskId;
  }>;

export type FashionSceneDescriptor = PricedDescriptor &
  Readonly<{
    id: FashionSceneId;
    type: 'fashion_scene';
    defaultTaskType: TryOnTaskId;
  }>;

export type NailPresetDescriptor = PricedDescriptor &
  Readonly<{
    id: NailPresetId;
    type: 'nail_preset';
    defaultTaskType: NailTaskId;
  }>;

export type StudioPublicCatalog = Readonly<{
  catalogVersion: typeof STUDIO_CATALOG_VERSION;
  promptVersion: typeof STUDIO_PROMPT_VERSION;
  pricingVersion: typeof STUDIO_PRICING_VERSION;
  previewCredits: typeof STUDIO_PREVIEW_CREDITS;
  hdExtraCredits: typeof STUDIO_HD_EXTRA_CREDITS;
  categories: readonly StudioCategoryDescriptor[];
  productScenes: readonly ProductSceneDescriptor[];
  fashionScenes: readonly FashionSceneDescriptor[];
  nailPresets: readonly NailPresetDescriptor[];
}>;

type InternalCategoryDescriptor = StudioCategoryDescriptor &
  Readonly<{ prompt: string | null; generationEnabled: boolean }>;
type InternalProductScene = ProductSceneDescriptor & Readonly<{ prompt: string }>;
type InternalFashionScene = FashionSceneDescriptor & Readonly<{ prompt: string }>;
type InternalNailPreset = NailPresetDescriptor & Readonly<{ prompt: string }>;

const PRODUCT_SYSTEM_PROMPT = `You are BirKare AI Product Studio.

Your job is to transform the user's uploaded product photo into a premium, realistic commercial product photograph.

PRIMARY RULE:
The uploaded product is the source of truth.

PRESERVE EXACTLY:
- product identity
- geometry
- proportions
- silhouette
- original color
- material
- texture
- stitching
- hardware
- packaging structure
- visible logos and brand marks
- legitimate readable text whenever possible

YOU MAY CHANGE:
- background
- scene
- lighting
- product placement
- camera angle only when the product remains faithful
- reflections
- realistic shadow
- depth of field
- surrounding props when the selected scene requires them

DO NOT:
- redesign the product
- invent a new logo
- invent product text
- change the product color
- add extra handles, buttons, zippers, ports, stones, ingredients or accessories
- duplicate the product unless the user explicitly requests multiple units
- distort proportions
- create impossible reflections
- make the result look like CGI when photorealism is requested

QUALITY TARGET:
The final result must look like a professionally photographed e-commerce or advertising image captured with a high-end full-frame camera and studio lighting.

No watermark. No text overlay unless explicitly requested.`;

const VIRTUAL_TRY_ON_MODE_PROMPT = `MODE: VIRTUAL_TRY_ON

INPUT A = person's photo
INPUT B = garment photo

Preserve person:
- identity
- face
- hairstyle
- skin tone
- body proportions
- pose whenever possible

Preserve garment:
- exact color
- pattern
- print
- cut
- hemline
- sleeve length
- neckline
- buttons
- pockets
- seams
- fabric texture

Fit the garment naturally to the person's pose and body.
Generate believable folds, tension and occlusion.
Do not reshape the person's body to fit the clothing.
Do not redesign the garment.`;

const NAIL_PREVIEW_MODE_PROMPT = `MODE: NAIL_PREVIEW

The uploaded hand photo is the source of truth.

Preserve:
- exact number of fingers
- hand anatomy
- finger proportions
- skin tone
- hand pose
- rings
- bracelets
- tattoos and identifying marks unless user asks otherwise

Modify only:
- nail polish color
- nail finish
- nail art
- optionally nail length/shape if explicitly selected

Do not create extra fingers.
Do not merge fingers.
Do not deform knuckles.
Do not remove jewelry.
Maintain realistic cuticles and nail beds.`;

export const STUDIO_GLOBAL_NEGATIVE_PROMPT = `FINAL QUALITY AND SAFETY CONSTRAINTS

No malformed geometry.
No duplicate product.
No extra limbs or fingers.
No unexpected text.
No invented branding.
No misspelled fake labels.
No incorrect reflection.
No floating shadow unless Floating scene is selected.
No excessive HDR.
No plastic CGI look.
No oversharpening.
No heavy skin smoothing.
No body reshaping.
No product redesign.

Maintain physically believable:
- lighting
- contact shadow
- perspective
- reflections
- depth of field
- material response`;

const CATEGORY_PROMPTS: Record<ProductCategoryId, string> = {
  handbag: `CATEGORY: HANDBAG

Treat the uploaded handbag as the only authoritative product reference.

Preserve exactly:
- bag silhouette
- dimensions and proportions
- handle count and handle shape
- shoulder strap
- stitching
- leather/fabric grain
- buckles
- zipper
- clasp
- metal hardware color
- pockets
- original product color

Do not invent logos, charms, straps, pockets or decorative hardware.

Present the bag like a premium fashion e-commerce campaign.
The bag must remain the clear hero object.`,
  shoes: `CATEGORY: SHOES

Preserve the exact uploaded footwear.

Preserve:
- shoe type
- sole shape
- heel height
- heel geometry
- upper construction
- laces
- eyelets
- stitching
- buckle
- decorative stones
- texture
- material
- original color
- pair symmetry

Never create an impossible heel, extra laces, extra straps or mismatched pair.

For a pair of shoes, ensure both shoes are the same model and scale.
Use realistic floor contact and physically correct shadow.`,
  perfume: `CATEGORY: PERFUME

Preserve the perfume bottle precisely.

Preserve:
- bottle silhouette
- glass thickness
- cap design
- neck and atomizer
- liquid color
- label placement
- readable brand elements
- metallic details

Use physically realistic glass, refraction and reflections.
Do not alter the label or invent branding.
Do not deform the cap or bottle edges.

The result should look like premium fragrance advertising photography.`,
  jewelry: `CATEGORY: JEWELRY

Preserve the exact jewelry design.

Preserve:
- stone count
- stone placement
- stone cut
- metal color
- chain thickness
- ring geometry
- setting
- clasp
- engraving when visible
- proportions

Do not add diamonds, remove stones, change metal color or redesign the jewelry.

Use realistic macro product photography.
Highlights must reveal material quality without clipping important details.`,
  cosmetics: `CATEGORY: COSMETICS

Preserve the cosmetic product and packaging exactly.

Preserve:
- bottle/jar/tube geometry
- pump/dropper/cap
- packaging finish
- glass/plastic material
- product color
- label position
- legitimate text whenever readable

Do not invent ingredients, claims, SPF values, logos or text.

Use clean premium skincare/beauty photography.
Keep surfaces hygienic, elegant and realistic.`,
  electronics: `CATEGORY: ELECTRONICS

Preserve the exact electronic device.

Preserve:
- chassis dimensions
- bezels
- screen aspect
- button count and placement
- camera count and placement
- ports
- hinges
- keyboard layout
- material
- finish
- original color

Do not invent cameras, ports, buttons, logos or sensors.
Do not morph the device into a different generation or brand.

Use controlled commercial technology photography with accurate reflections.`,
  furniture: `CATEGORY: FURNITURE

Treat the uploaded furniture item as an exact design reference.

Preserve:
- dimensions
- silhouette
- leg count
- leg design
- upholstery
- fabric texture
- wood type/color
- seams
- cushions
- handles
- doors/drawers
- hardware

Place the furniture into a believable interior at correct scale.
Maintain physically realistic perspective, floor contact and room lighting.`,
  food: `CATEGORY: FOOD_AND_BEVERAGE

Create premium food photography while preserving the recognizable uploaded food or drink.

Preserve:
- core ingredients
- portion type
- primary toppings
- product structure
- beverage color
- container when relevant

Do not add major ingredients that are absent from the source.
Do not radically increase portion size.
Do not create misleading commercial claims.

Improve:
- plating
- light
- freshness appearance
- texture definition
- condensation/steam only when physically plausible

Make the food look appetizing but believable.`,
};

const CATEGORY_PUBLIC: Record<StudioCategoryId, StudioCategoryDescriptor> = {
  handbag: {
    id: 'handbag',
    label: 'Çanta',
    previewImage: 'categories/handbag.webp',
    inputMode: 'SINGLE_PRODUCT',
    routeMode: 'PRODUCT_STUDIO',
    enabled: true,
  },
  shoes: {
    id: 'shoes',
    label: 'Ayakkabı',
    previewImage: 'categories/shoes.webp',
    inputMode: 'SINGLE_PRODUCT',
    routeMode: 'PRODUCT_STUDIO',
    enabled: true,
  },
  perfume: {
    id: 'perfume',
    label: 'Parfüm',
    previewImage: 'categories/perfume.webp',
    inputMode: 'SINGLE_PRODUCT',
    routeMode: 'PRODUCT_STUDIO',
    enabled: false,
  },
  jewelry: {
    id: 'jewelry',
    label: 'Takı',
    previewImage: 'categories/jewelry.webp',
    inputMode: 'SINGLE_PRODUCT',
    routeMode: 'PRODUCT_STUDIO',
    enabled: true,
  },
  cosmetics: {
    id: 'cosmetics',
    label: 'Kozmetik',
    previewImage: 'categories/cosmetics.webp',
    inputMode: 'SINGLE_PRODUCT',
    routeMode: 'PRODUCT_STUDIO',
    enabled: true,
  },
  electronics: {
    id: 'electronics',
    label: 'Telefon & Elektronik',
    previewImage: 'categories/electronics.webp',
    inputMode: 'SINGLE_PRODUCT',
    routeMode: 'PRODUCT_STUDIO',
    enabled: true,
  },
  furniture: {
    id: 'furniture',
    label: 'Mobilya & Dekor',
    previewImage: 'categories/furniture.webp',
    inputMode: 'SINGLE_PRODUCT',
    routeMode: 'PRODUCT_STUDIO',
    enabled: true,
  },
  food: {
    id: 'food',
    label: 'Yiyecek & İçecek',
    previewImage: 'categories/food.webp',
    inputMode: 'SINGLE_PRODUCT',
    routeMode: 'PRODUCT_STUDIO',
    enabled: true,
  },
  fashion: {
    id: 'fashion',
    label: 'Kıyafet & Stil',
    previewImage: 'fashion/modest-premium.webp',
    inputMode: 'PERSON_AND_GARMENT',
    routeMode: 'VIRTUAL_TRY_ON',
    enabled: true,
  },
  nails: {
    id: 'nails',
    label: 'Tırnak & Manikür',
    previewImage: 'nails/classic-red.webp',
    inputMode: 'HAND_PHOTO',
    routeMode: 'NAIL_PREVIEW',
    enabled: true,
  },
};

const CATEGORY_REGISTRY: Record<StudioCategoryId, InternalCategoryDescriptor> = {
  handbag: {
    ...CATEGORY_PUBLIC.handbag,
    prompt: CATEGORY_PROMPTS.handbag,
    generationEnabled: true,
  },
  shoes: { ...CATEGORY_PUBLIC.shoes, prompt: CATEGORY_PROMPTS.shoes, generationEnabled: true },
  perfume: {
    ...CATEGORY_PUBLIC.perfume,
    prompt: CATEGORY_PROMPTS.perfume,
    // Keep the identifier/prompt registered for a future asset rollout, but
    // reject direct API submissions while its client category is unavailable.
    generationEnabled: false,
  },
  jewelry: {
    ...CATEGORY_PUBLIC.jewelry,
    prompt: CATEGORY_PROMPTS.jewelry,
    generationEnabled: true,
  },
  cosmetics: {
    ...CATEGORY_PUBLIC.cosmetics,
    prompt: CATEGORY_PROMPTS.cosmetics,
    generationEnabled: true,
  },
  electronics: {
    ...CATEGORY_PUBLIC.electronics,
    prompt: CATEGORY_PROMPTS.electronics,
    generationEnabled: true,
  },
  furniture: {
    ...CATEGORY_PUBLIC.furniture,
    prompt: CATEGORY_PROMPTS.furniture,
    generationEnabled: true,
  },
  food: { ...CATEGORY_PUBLIC.food, prompt: CATEGORY_PROMPTS.food, generationEnabled: true },
  fashion: { ...CATEGORY_PUBLIC.fashion, prompt: null, generationEnabled: true },
  nails: { ...CATEGORY_PUBLIC.nails, prompt: null, generationEnabled: true },
};

const productScene = (
  id: ProductSceneId,
  label: string,
  previewImage: string,
  modelLane: StudioModelLane,
  baseCredits: number,
  defaultTaskType: ProductTaskId,
  prompt: string,
): InternalProductScene => ({
  id,
  type: 'product_scene',
  label,
  previewImage,
  modelLane,
  baseCredits,
  hdExtraCredits: STUDIO_HD_EXTRA_CREDITS,
  defaultTaskType,
  enabled: true,
  prompt,
});

const PRODUCT_SCENE_REGISTRY: Record<ProductSceneId, InternalProductScene> = {
  'white-studio': productScene(
    'white-studio',
    'Beyaz Stüdyo',
    'scenes/white-studio.webp',
    'FAST',
    5,
    'PRODUCT_CATALOG',
    `SCENE: CLEAN WHITE STUDIO

Place the uploaded product in a seamless bright white commercial studio.
Use neutral 5500K softbox lighting.
Background should transition smoothly from wall to floor.
Create a soft realistic contact shadow directly below the product.

Composition:
- centered hero product
- clean negative space
- no decorative props
- no text
- no clutter

Target:
Trendyol / marketplace / clean e-commerce catalog appearance.
The product must remain fully faithful to the uploaded source.`,
  ),
  'gray-catalog': productScene(
    'gray-catalog',
    'Gri Katalog',
    'scenes/gray-catalog.webp',
    'FAST',
    5,
    'PRODUCT_CATALOG',
    `SCENE: SOFT GRAY CATALOG

Create a neutral soft-gray studio backdrop with a subtle floor gradient.
Use broad diffused commercial lighting and delicate edge separation.

The product should appear centered, clean and premium.
Add a physically believable soft contact shadow.

Avoid:
- dramatic effects
- colored lights
- busy props

Target:
modern marketplace catalog and brand product page.`,
  ),
  'beige-premium': productScene(
    'beige-premium',
    'Bej Premium',
    'scenes/beige-premium.webp',
    'FAST',
    5,
    'PRODUCT_LIFESTYLE',
    `SCENE: BEIGE PREMIUM

Place the product in a warm premium beige studio.
Use limestone/travertine-inspired neutral textures, soft daylight and long elegant shadows.

Keep decorative objects only at the outer edges.
Do not obscure the product.

Look:
minimal luxury editorial,
warm cream tones,
natural sunlight,
premium lifestyle catalog.`,
  ),
  'black-premium': productScene(
    'black-premium',
    'Siyah Premium',
    'scenes/black-premium.webp',
    'PREMIUM',
    7,
    'PRODUCT_PREMIUM',
    `SCENE: BLACK PREMIUM

Create a deep matte-black luxury studio with extremely restrained warm-gold accents.

Use controlled rim lighting to separate the product from the dark background.
Preserve dark product details; do not crush shadows.

Use a dark reflective or satin floor only when suitable for the product material.

Target:
luxury fragrance, jewelry, electronics, premium fashion campaign.`,
  ),
  marble: productScene(
    'marble',
    'Mermer',
    'scenes/marble.webp',
    'FAST',
    5,
    'PRODUCT_LIFESTYLE',
    `SCENE: LIGHT MARBLE

Place the product on or near a premium white marble surface with subtle natural veining.

Use soft architectural daylight.
Keep the marble pattern elegant and not distracting.
Create realistic reflection only if physically appropriate.

Best for:
cosmetics, perfume, jewelry, handbag, premium food packaging.`,
  ),
  'glass-surface': productScene(
    'glass-surface',
    'Cam Yüzey',
    'scenes/glass-surface.webp',
    'PREMIUM',
    7,
    'PRODUCT_PREMIUM',
    `SCENE: GLASS SURFACE

Place the product on a crystal-clear premium glass/acrylic platform.

Generate physically correct transparency, refraction, reflection and contact shadow.
The reflection must correspond to the exact source product.

Environment:
bright modern studio,
cool-neutral highlights,
minimal architectural details,
high-end commercial look.

Do not duplicate the product through impossible reflections.`,
  ),
  floating: productScene(
    'floating',
    'Floating',
    'scenes/floating.webp',
    'PREMIUM',
    7,
    'PRODUCT_PREMIUM',
    `SCENE: FLOATING PRODUCT

Create a premium advertising composition where the product appears to float naturally above a minimal platform.

Maintain exact product geometry and orientation.
Use realistic directional shadow underneath to establish depth.

Keep motion subtle and premium.
No surreal deformation.
No duplicate product.

Background:
warm neutral luxury studio with clean negative space.`,
  ),
  'luxury-gold': productScene(
    'luxury-gold',
    'Luxury Gold',
    'scenes/luxury-gold.webp',
    'PREMIUM',
    7,
    'PRODUCT_PREMIUM',
    `SCENE: LUXURY GOLD

Create an elegant black-and-gold luxury advertising set.

Use:
- warm golden rim light
- tasteful dark marble
- subtle metallic architectural trims
- a clean central pedestal

Gold must remain secondary to the uploaded product.
Do not recolor the product gold.

Target:
premium perfume, watches, jewelry, luxury electronics and accessories.`,
  ),
  'neon-tech': productScene(
    'neon-tech',
    'Neon Tech',
    'scenes/neon-tech.webp',
    'PREMIUM',
    7,
    'PRODUCT_PREMIUM',
    `SCENE: NEON TECH

Create a modern dark technology studio using controlled cyan-blue and purple neon accent lighting.

Use:
- reflective dark floor
- geometric light strips
- deep navy/black background
- premium futuristic ambience

Keep product colors accurate.
Colored lights may cast reflections but must not permanently recolor the source product.

Best for:
electronics, sneakers, gaming accessories and modern objects.`,
  ),
  spotlight: productScene(
    'spotlight',
    'Spotlight',
    'scenes/spotlight.webp',
    'PREMIUM',
    7,
    'PRODUCT_PREMIUM',
    `SCENE: SPOTLIGHT

Place the product on a dark stone pedestal under one focused overhead spotlight.

Use deep black surroundings with controlled atmospheric falloff.
The spotlight should produce realistic highlights and a grounded shadow.

Composition:
hero object centered,
cinematic but minimal,
large negative space,
no additional product props.

Best for:
jewelry, perfume, electronics, premium shoes and awards.`,
  ),
  'spa-beauty': productScene(
    'spa-beauty',
    'Spa Beauty',
    'scenes/spa-beauty.webp',
    'FAST',
    5,
    'PRODUCT_LIFESTYLE',
    `SCENE: SPA BEAUTY

Place the product in a premium wellness/spa environment.

Use:
- warm cream travertine
- soft sunlight
- folded neutral towels
- a restrained number of smooth stones
- eucalyptus/olive leaves
- subtle natural shadows

Keep the central product area uncluttered.

Best for:
skincare, cosmetics, fragrance, wellness products and towels.`,
  ),
  desktop: productScene(
    'desktop',
    'Masa Üstü',
    'scenes/desktop.webp',
    'FAST',
    5,
    'PRODUCT_LIFESTYLE',
    `SCENE: PREMIUM DESKTOP

Place the product on a clean premium work desk in warm natural daylight.

Use restrained props at the edges:
- notebook
- ceramic cup
- pen holder
- minimal plant

The product area must remain clear.
Do not hide the product behind props.

Best for:
electronics, stationery, glasses, accessories, small decor and lifestyle products.`,
  ),
  boutique: productScene(
    'boutique',
    'Butik',
    'scenes/boutique.webp',
    'PREMIUM',
    7,
    'PRODUCT_PREMIUM',
    `SCENE: LUXURY BOUTIQUE

Place the product inside a refined warm-beige luxury boutique.

Use:
- limestone/travertine
- soft shelf lighting
- subtle arches
- neutral clothing or bags only in the distant background
- clean polished floor

The uploaded product remains the foreground hero.
Background merchandise must never visually compete with it.

Best for:
handbags, shoes, fashion accessories, perfume and jewelry.`,
  ),
  'flat-lay': productScene(
    'flat-lay',
    'Flat Lay',
    'scenes/flat-lay.webp',
    'FAST',
    5,
    'PRODUCT_LIFESTYLE',
    `SCENE: PREMIUM FLAT LAY

Camera angle:
exactly top-down / 90 degrees.

Place the uploaded product in the central composition on a warm neutral textured surface.

Props may appear only around the outer perimeter.
Use balanced whitespace and editorial spacing.

Keep the entire product clearly visible.
Avoid perspective distortion.

Best for:
cosmetics, jewelry, accessories, packaged food, small electronics and stationery.`,
  ),
  'ad-poster': productScene(
    'ad-poster',
    'Reklam Poster',
    'scenes/ad-poster.webp',
    'PREMIUM',
    7,
    'PRODUCT_AD',
    `SCENE: ADVERTISING POSTER

Create a polished hero advertising composition designed to leave usable negative space for later graphic design.

Place the product prominently on a premium stone/marble pedestal.
Use dramatic but tasteful directional light.
Create strong visual hierarchy.

IMPORTANT:
Do not generate slogans, logos, prices or fake campaign text.
Leave clear negative space in the upper or side region for UI/post-production text.

Target:
Instagram ad, campaign poster, e-commerce banner and launch creative.`,
  ),
};

const fashionScene = (
  id: FashionSceneId,
  label: string,
  baseCredits: number,
  defaultTaskType: TryOnTaskId,
  prompt: string,
): InternalFashionScene => ({
  id,
  type: 'fashion_scene',
  label,
  previewImage: null,
  modelLane: 'PREMIUM',
  baseCredits,
  hdExtraCredits: STUDIO_HD_EXTRA_CREDITS,
  defaultTaskType,
  enabled: true,
  prompt,
});

const FASHION_SCENE_REGISTRY: Record<FashionSceneId, InternalFashionScene> = {
  'fashion-white-studio': fashionScene(
    'fashion-white-studio',
    'Beyaz Moda Stüdyosu',
    8,
    'TRY_ON_STANDARD',
    `Place the dressed person in a seamless white high-fashion studio.
Use soft full-body catalog lighting.
Show the complete garment clearly from head to toe.
Neutral pose, realistic body proportions, clean shadow.
No distracting props.`,
  ),
  'fashion-beige-editorial': fashionScene(
    'fashion-beige-editorial',
    'Bej Editorial Stüdyo',
    8,
    'TRY_ON_STANDARD',
    `Place the dressed person in a warm beige minimalist editorial studio.
Use architectural curves, soft daylight and muted stone textures.
Keep the garment as the visual focus.
Premium fashion campaign quality.`,
  ),
  'fashion-luxury-boutique': fashionScene(
    'fashion-luxury-boutique',
    'Lüks Butik',
    10,
    'TRY_ON_EDITORIAL',
    `Place the dressed person inside a premium luxury fashion boutique.
Use warm shelf lighting, beige stone, elegant mirrors and distant clothing racks.
Keep the background subtle.
Create a realistic boutique campaign photograph.`,
  ),
  'fashion-minimal-interior': fashionScene(
    'fashion-minimal-interior',
    'Minimal İç Mekân',
    8,
    'TRY_ON_STANDARD',
    `Place the model in a bright modern minimalist interior.
Neutral cream walls, natural daylight, refined furniture at the edges.
Keep body anatomy and garment fit natural.`,
  ),
  'fashion-street-day': fashionScene(
    'fashion-street-day',
    'Sokak Stili Gündüz',
    9,
    'TRY_ON_STANDARD',
    `Create a modern daylight street-style fashion photo.
Use clean urban architecture and realistic natural sunlight.
Avoid recognizable brand signage.
Preserve garment color and exact silhouette.`,
  ),
  'fashion-city-night': fashionScene(
    'fashion-city-night',
    'Gece Şehir',
    10,
    'TRY_ON_EDITORIAL',
    `Create a premium night-city fashion editorial.
Wet pavement reflections, tasteful neon and warm storefront bokeh.
Keep face identity and garment color accurate despite colored lighting.`,
  ),
  'fashion-golden-hour': fashionScene(
    'fashion-golden-hour',
    'Golden Hour',
    9,
    'TRY_ON_STANDARD',
    `Create a warm golden-hour fashion photograph outdoors.
Use low-angle sunlight, soft backlight and natural background separation.
Keep skin tone realistic and garment details intact.`,
  ),
  'fashion-hotel-lobby': fashionScene(
    'fashion-hotel-lobby',
    'Otel Lobisi',
    10,
    'TRY_ON_EDITORIAL',
    `Place the dressed person inside a modern five-star hotel lobby.
Use dark stone, brass details and warm architectural lighting.
Elegant standing pose.
Luxury editorial photography.`,
  ),
  'fashion-runway': fashionScene(
    'fashion-runway',
    'Runway',
    10,
    'TRY_ON_EDITORIAL',
    `Place the dressed person on a clean contemporary fashion runway.
Use focused runway lighting and a dark audience-free background.
Show the complete outfit.
Do not change garment cut to look more theatrical.`,
  ),
  'fashion-magazine-editorial': fashionScene(
    'fashion-magazine-editorial',
    'Dergi Editorial',
    10,
    'TRY_ON_EDITORIAL',
    `Create a high-fashion magazine editorial image.
Sophisticated studio lighting, strong composition and premium posing.
No magazine logo or text.
Keep outfit construction exactly faithful to the input garment.`,
  ),
  'fashion-red-carpet': fashionScene(
    'fashion-red-carpet',
    'Red Carpet',
    10,
    'TRY_ON_EDITORIAL',
    `Place the person in an elegant fictional gala environment with a clean red carpet.
Soft flash photography, warm event lights and tasteful barriers.
No real-world trademarks, celebrity branding or event logos.`,
  ),
  'fashion-cafe': fashionScene(
    'fashion-cafe',
    'Kafe Lifestyle',
    9,
    'TRY_ON_STANDARD',
    `Create a candid premium cafe lifestyle fashion photograph.
Use warm window light and refined neutral interior design.
Pose should feel relaxed and believable.
Garment remains fully visible.`,
  ),
  'fashion-istanbul-street': fashionScene(
    'fashion-istanbul-street',
    'İstanbul Sokak',
    9,
    'TRY_ON_STANDARD',
    `Create an elegant Istanbul-inspired street fashion photograph.
Use generic historic stone architecture, warm city light and refined urban ambience.
Do not reproduce protected business logos or signs.
Focus on the outfit.`,
  ),
  'fashion-modest-premium': fashionScene(
    'fashion-modest-premium',
    'Modest Premium',
    9,
    'TRY_ON_STANDARD',
    `Create a premium modest-fashion campaign image.
Respect the uploaded garment's intended coverage, length and silhouette.
Use an elegant neutral architectural environment and graceful natural posing.
Do not shorten, tighten or make the outfit more revealing.`,
  ),
  'fashion-event': fashionScene(
    'fashion-event',
    'Düğün / Özel Gün',
    10,
    'TRY_ON_EDITORIAL',
    `Create an elegant formal-event fashion photograph.
Use soft floral decor, refined architecture and flattering warm light.
Maintain the exact garment design.
Do not convert the outfit into bridal wear unless the source garment is bridal.`,
  ),
};

const nailPreset = (
  id: NailPresetId,
  label: string,
  modelLane: StudioModelLane,
  baseCredits: number,
  defaultTaskType: NailTaskId,
  prompt: string,
): InternalNailPreset => ({
  id,
  type: 'nail_preset',
  label,
  previewImage: null,
  modelLane,
  baseCredits,
  hdExtraCredits: STUDIO_HD_EXTRA_CREDITS,
  defaultTaskType,
  enabled: true,
  prompt,
});

const NAIL_PRESET_REGISTRY: Record<NailPresetId, InternalNailPreset> = {
  'nail-nude-clean': nailPreset(
    'nail-nude-clean',
    'Nude Clean',
    'FAST',
    4,
    'NAIL_COLOR',
    `Apply a clean glossy nude-beige manicure.
Preserve the user's natural nail length and shape.
Use realistic salon-quality polish with subtle highlights.
Do not modify hand pose or jewelry.`,
  ),
  'nail-classic-red': nailPreset(
    'nail-classic-red',
    'Classic Red',
    'FAST',
    4,
    'NAIL_COLOR',
    `Apply a deep classic glossy red manicure.
Color must be even and physically realistic.
Preserve cuticle shape, hand anatomy and current nail shape.`,
  ),
  'nail-french': nailPreset(
    'nail-french',
    'French Manicure',
    'FAST',
    5,
    'NAIL_COLOR',
    `Create a refined classic French manicure:
natural translucent pink nail bed,
thin clean white tips,
high-gloss professional finish.
Preserve nail length unless explicitly requested otherwise.`,
  ),
  'nail-milky-white': nailPreset(
    'nail-milky-white',
    'Milky White',
    'FAST',
    4,
    'NAIL_COLOR',
    `Apply a semi-translucent milky white manicure with soft glossy finish.
Maintain realistic nail-bed translucency.
No artificial plastic appearance.`,
  ),
  'nail-burgundy': nailPreset(
    'nail-burgundy',
    'Burgundy Gloss',
    'FAST',
    4,
    'NAIL_COLOR',
    `Apply a sophisticated deep burgundy glossy manicure.
Preserve the original nail shape and hand pose.
Use luxury beauty photography reflections.`,
  ),
  'nail-emerald': nailPreset(
    'nail-emerald',
    'Emerald Green',
    'FAST',
    4,
    'NAIL_COLOR',
    `Apply a rich emerald-green high-gloss manicure.
Color should appear deep and elegant, not neon.
Preserve all rings and bracelets.`,
  ),
  'nail-black': nailPreset(
    'nail-black',
    'Black Gloss',
    'FAST',
    4,
    'NAIL_COLOR',
    `Apply an elegant glossy black manicure.
Retain visible nail edge definition so nails do not merge with dark surroundings.
Preserve anatomy exactly.`,
  ),
  'nail-champagne-chrome': nailPreset(
    'nail-champagne-chrome',
    'Champagne Chrome',
    'PREMIUM',
    6,
    'NAIL_ART',
    `Apply a premium champagne-gold chrome manicure.
Generate smooth metallic reflections that follow each nail's curvature.
Avoid mirror artifacts and duplicated reflections.`,
  ),
  'nail-soft-pink': nailPreset(
    'nail-soft-pink',
    'Soft Pink',
    'FAST',
    4,
    'NAIL_COLOR',
    `Apply a soft blush-pink glossy manicure with a clean beauty-campaign finish.
Keep the effect natural, feminine and realistic.`,
  ),
  'nail-lavender': nailPreset(
    'nail-lavender',
    'Lavender Pastel',
    'FAST',
    4,
    'NAIL_COLOR',
    `Apply a soft pastel lavender manicure.
Maintain smooth glossy coverage and realistic highlights.
No changes to fingers or skin.`,
  ),
  'nail-baby-blue': nailPreset(
    'nail-baby-blue',
    'Baby Blue',
    'FAST',
    4,
    'NAIL_COLOR',
    `Apply a refined pale baby-blue glossy manicure.
Keep saturation gentle and commercial-beauty appropriate.`,
  ),
  'nail-gold-line': nailPreset(
    'nail-gold-line',
    'Minimal Gold Line',
    'FAST',
    5,
    'NAIL_COLOR',
    `Create a nude manicure with one minimal fine metallic-gold line accent per nail.
Lines must follow nail geometry consistently.
Avoid random or asymmetrical artifacts.`,
  ),
  'nail-pearl-glazed': nailPreset(
    'nail-pearl-glazed',
    'Pearl / Glazed',
    'PREMIUM',
    6,
    'NAIL_ART',
    `Create a translucent pearlescent glazed manicure with subtle ivory-pink iridescence.
Highlights must remain soft and realistic.
Avoid glitter noise.`,
  ),
  'nail-cat-eye': nailPreset(
    'nail-cat-eye',
    'Dark Cat Eye',
    'PREMIUM',
    6,
    'NAIL_ART',
    `Apply a dark magnetic cat-eye manicure with a controlled luminous diagonal highlight.
Effect must be consistent across nails and follow their 3D curvature.`,
  ),
  'nail-editorial-gem': nailPreset(
    'nail-editorial-gem',
    'Editorial Gem',
    'PREMIUM',
    6,
    'NAIL_ART',
    `Create a premium editorial nail design using a restrained number of tiny crystal accents.

Rules:
- maximum 1–3 small stones per accent nail
- not every nail requires stones
- maintain realistic attachment to the nail surface
- preserve finger anatomy
- no oversized fantasy jewels

Luxury beauty campaign appearance.`,
  ),
};

function publicCategory(value: InternalCategoryDescriptor): StudioCategoryDescriptor {
  return {
    id: value.id,
    label: value.label,
    previewImage: value.previewImage,
    inputMode: value.inputMode,
    routeMode: value.routeMode,
    enabled: value.enabled,
  };
}

function publicProductScene(value: InternalProductScene): ProductSceneDescriptor {
  return {
    id: value.id,
    type: value.type,
    label: value.label,
    previewImage: value.previewImage,
    modelLane: value.modelLane,
    baseCredits: value.baseCredits,
    hdExtraCredits: value.hdExtraCredits,
    defaultTaskType: value.defaultTaskType,
    enabled: value.enabled,
  };
}

function publicFashionScene(value: InternalFashionScene): FashionSceneDescriptor {
  return {
    id: value.id,
    type: value.type,
    label: value.label,
    previewImage: value.previewImage,
    modelLane: value.modelLane,
    baseCredits: value.baseCredits,
    hdExtraCredits: value.hdExtraCredits,
    defaultTaskType: value.defaultTaskType,
    enabled: value.enabled,
  };
}

function publicNailPreset(value: InternalNailPreset): NailPresetDescriptor {
  return {
    id: value.id,
    type: value.type,
    label: value.label,
    previewImage: value.previewImage,
    modelLane: value.modelLane,
    baseCredits: value.baseCredits,
    hdExtraCredits: value.hdExtraCredits,
    defaultTaskType: value.defaultTaskType,
    enabled: value.enabled,
  };
}

/** Returns fresh prompt-free objects; internal registry records are never shared with a client. */
export function listStudioCatalog(): StudioPublicCatalog {
  return {
    catalogVersion: STUDIO_CATALOG_VERSION,
    promptVersion: STUDIO_PROMPT_VERSION,
    pricingVersion: STUDIO_PRICING_VERSION,
    previewCredits: STUDIO_PREVIEW_CREDITS,
    hdExtraCredits: STUDIO_HD_EXTRA_CREDITS,
    categories: STUDIO_CATEGORY_IDS.map((id) => publicCategory(CATEGORY_REGISTRY[id])),
    productScenes: PRODUCT_SCENE_IDS.map((id) => publicProductScene(PRODUCT_SCENE_REGISTRY[id])),
    fashionScenes: FASHION_SCENE_IDS.map((id) => publicFashionScene(FASHION_SCENE_REGISTRY[id])),
    nailPresets: NAIL_PRESET_IDS.map((id) => publicNailPreset(NAIL_PRESET_REGISTRY[id])),
  };
}

type StudioPlanMetadata = Readonly<{
  selectionLabel: string;
  previewImage: string | null;
  modelLane: StudioModelLane;
  baseCredits: number;
  hdExtraCredits: typeof STUDIO_HD_EXTRA_CREDITS;
  catalogVersion: typeof STUDIO_CATALOG_VERSION;
  promptVersion: typeof STUDIO_PROMPT_VERSION;
  pricingVersion: typeof STUDIO_PRICING_VERSION;
}>;

export type ResolvedProductStudioPlan = ResolvedProductStudioSelection &
  StudioPlanMetadata &
  Readonly<{ categoryLabel: string }>;
export type ResolvedVirtualTryOnPlan = ResolvedVirtualTryOnSelection & StudioPlanMetadata;
export type ResolvedNailPreviewPlan = ResolvedNailPreviewSelection & StudioPlanMetadata;
export type ResolvedStudioPlan =
  ResolvedProductStudioPlan | ResolvedVirtualTryOnPlan | ResolvedNailPreviewPlan;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function includesId<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

function metadata(value: PricedDescriptor): StudioPlanMetadata {
  if (!value.enabled) throw new Error('Studio selection is disabled');
  return {
    selectionLabel: value.label,
    previewImage: value.previewImage,
    modelLane: value.modelLane,
    baseCredits: value.baseCredits,
    hdExtraCredits: value.hdExtraCredits,
    catalogVersion: STUDIO_CATALOG_VERSION,
    promptVersion: STUDIO_PROMPT_VERSION,
    pricingVersion: STUDIO_PRICING_VERSION,
  };
}

/**
 * Resolves all chargeable and model-routing fields from server-owned records.
 * Any client-supplied `taskType`, price, lane or prompt-like extra field is ignored.
 */
export function getStudioSelection(input: unknown): ResolvedStudioPlan {
  if (!isRecord(input) || typeof input.kind !== 'string') {
    throw new Error('Invalid studio selection');
  }

  if (input.kind === 'PRODUCT_STUDIO') {
    if (
      !includesId(PRODUCT_CATEGORY_IDS, input.categoryId) ||
      !includesId(PRODUCT_SCENE_IDS, input.sceneId)
    ) {
      throw new Error('Unknown product studio category or scene');
    }
    const category = CATEGORY_REGISTRY[input.categoryId];
    const scene = PRODUCT_SCENE_REGISTRY[input.sceneId];
    if (!category.generationEnabled) throw new Error('Studio category generation is disabled');
    return {
      kind: 'PRODUCT_STUDIO',
      categoryId: input.categoryId,
      sceneId: input.sceneId,
      taskType: scene.defaultTaskType,
      categoryLabel: category.label,
      ...metadata(scene),
    };
  }

  if (input.kind === 'VIRTUAL_TRY_ON') {
    if (!includesId(FASHION_SCENE_IDS, input.sceneId)) {
      throw new Error('Unknown virtual try-on scene');
    }
    const scene = FASHION_SCENE_REGISTRY[input.sceneId];
    return {
      kind: 'VIRTUAL_TRY_ON',
      sceneId: input.sceneId,
      taskType: scene.defaultTaskType,
      ...metadata(scene),
    };
  }

  if (input.kind === 'NAIL_PREVIEW') {
    if (!includesId(NAIL_PRESET_IDS, input.presetId)) {
      throw new Error('Unknown nail preview preset');
    }
    const preset = NAIL_PRESET_REGISTRY[input.presetId];
    return {
      kind: 'NAIL_PREVIEW',
      presetId: input.presetId,
      taskType: preset.defaultTaskType,
      ...metadata(preset),
    };
  }

  throw new Error('Unknown studio selection kind');
}

export function resolveStudioPlan(input: unknown): ResolvedStudioPlan {
  return getStudioSelection(input);
}

export function tryGetStudioSelection(input: unknown): ResolvedStudioPlan | null {
  try {
    return getStudioSelection(input);
  } catch {
    return null;
  }
}

const PRODUCT_TASK_PROMPTS: Record<ProductTaskId, string> = {
  PRODUCT_CATALOG:
    'TASK: PRODUCT_CATALOG\nProduce a clean, conversion-ready catalog photograph with the product fully visible and easy to inspect.',
  PRODUCT_PREMIUM:
    'TASK: PRODUCT_PREMIUM\nProduce a premium commercial hero photograph with refined material rendering and controlled luxury art direction.',
  PRODUCT_AD:
    'TASK: PRODUCT_AD\nProduce an advertising-ready hero composition while leaving any requested negative space free of generated campaign copy.',
  PRODUCT_LIFESTYLE:
    'TASK: PRODUCT_LIFESTYLE\nPlace the unchanged product naturally into the selected believable lifestyle environment.',
};

const TRY_ON_TASK_PROMPTS: Record<TryOnTaskId, string> = {
  TRY_ON_STANDARD:
    'TASK: TRY_ON_STANDARD\nPrioritize a natural, useful garment try-on result with clear fit, construction and full outfit visibility.',
  TRY_ON_EDITORIAL:
    'TASK: TRY_ON_EDITORIAL\nCreate premium editorial presentation without sacrificing identity, body proportions or exact garment construction.',
};

const NAIL_TASK_PROMPTS: Record<NailTaskId, string> = {
  NAIL_COLOR:
    'TASK: NAIL_COLOR\nApply the selected salon finish locally to the existing nails and preserve their natural geometry.',
  NAIL_ART:
    'TASK: NAIL_ART\nRender the selected detailed nail finish consistently on the existing nails without changing hand anatomy.',
};

const VIRTUAL_TRY_ON_SYSTEM_PROMPT = `You are BirKare AI Virtual Try-On Studio.

Use the consented person's photo as INPUT A and the uploaded garment as INPUT B. The two inputs are authoritative references, not permission to invent a different person or garment. Produce one realistic fashion photograph.`;

const NAIL_SYSTEM_PROMPT = `You are BirKare AI Nail Preview Studio.

Perform a localized manicure edit on the uploaded hand photograph. The source hand is authoritative. Produce one realistic finished beauty photograph, not a collage or a replacement hand.`;

export type StudioPromptParts = Readonly<{
  plan: ResolvedStudioPlan;
  globalPrompt: string;
  modePrompt: string;
  categoryPrompt: string | null;
  selectionPrompt: string;
  preservationPrompt: string;
}>;

/** Internal server helper. It is intentionally not re-exported by the package barrel. */
export function resolveStudioPromptParts(input: ResolvedStudioSelection): StudioPromptParts {
  const derivedPlan = getStudioSelection(input);
  let plan: ResolvedStudioPlan;
  if (input.kind === 'PRODUCT_STUDIO' && derivedPlan.kind === 'PRODUCT_STUDIO') {
    if (!includesId(PRODUCT_TASK_IDS, input.taskType)) {
      throw new Error('Unknown snapshotted product studio task');
    }
    plan = { ...derivedPlan, taskType: input.taskType };
  } else if (input.kind === 'VIRTUAL_TRY_ON' && derivedPlan.kind === 'VIRTUAL_TRY_ON') {
    if (!includesId(TRY_ON_TASK_IDS, input.taskType)) {
      throw new Error('Unknown snapshotted virtual try-on task');
    }
    plan = { ...derivedPlan, taskType: input.taskType };
  } else if (input.kind === 'NAIL_PREVIEW' && derivedPlan.kind === 'NAIL_PREVIEW') {
    if (!includesId(NAIL_TASK_IDS, input.taskType)) {
      throw new Error('Unknown snapshotted nail preview task');
    }
    plan = { ...derivedPlan, taskType: input.taskType };
  } else {
    throw new Error('Studio snapshot kind does not match its resolved plan');
  }

  if (plan.kind === 'PRODUCT_STUDIO') {
    const category = CATEGORY_REGISTRY[plan.categoryId];
    const scene = PRODUCT_SCENE_REGISTRY[plan.sceneId];
    return {
      plan,
      globalPrompt: PRODUCT_SYSTEM_PROMPT,
      modePrompt: `MODE: PRODUCT_STUDIO\n${PRODUCT_TASK_PROMPTS[plan.taskType]}`,
      categoryPrompt: category.prompt,
      selectionPrompt: scene.prompt,
      preservationPrompt:
        'PRESERVATION LOCK: The uploaded product remains the only authoritative product reference. Scene, lighting and props may change only where allowed above; product identity, geometry, color, material, labels and legitimate brand marks may not be redesigned.',
    };
  }

  if (plan.kind === 'VIRTUAL_TRY_ON') {
    const scene = FASHION_SCENE_REGISTRY[plan.sceneId];
    return {
      plan,
      globalPrompt: VIRTUAL_TRY_ON_SYSTEM_PROMPT,
      modePrompt: `${VIRTUAL_TRY_ON_MODE_PROMPT}\n\n${TRY_ON_TASK_PROMPTS[plan.taskType]}`,
      categoryPrompt: null,
      selectionPrompt: scene.prompt,
      preservationPrompt:
        "PRESERVATION LOCK: Keep the source person's recognizable identity, face, hair, natural skin tone, body proportions and anatomy. Keep the uploaded garment's exact color, print, cut, length, seams, closures and fabric character. Do not add people, replace the face, reshape the body or redesign the garment.",
    };
  }

  const preset = NAIL_PRESET_REGISTRY[plan.presetId];
  return {
    plan,
    globalPrompt: NAIL_SYSTEM_PROMPT,
    modePrompt: `${NAIL_PREVIEW_MODE_PROMPT}\n\n${NAIL_TASK_PROMPTS[plan.taskType]}`,
    categoryPrompt: null,
    selectionPrompt: preset.prompt,
    preservationPrompt:
      'PRESERVATION LOCK: Change only the selected nail appearance. Preserve finger count, hand anatomy, skin tone, pose, cuticles, nail beds, jewelry, tattoos and identifying marks. Do not regenerate or replace the hand.',
  };
}
