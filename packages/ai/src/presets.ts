import type { CatalogFeaturedPerson, CatalogItem } from '@birkare/shared';
import type { LegacyGenerationRecipe, ProjectRecord } from '@birkare/database';

/** Catalog slugs map to fixed prompt fragments; display names are never interpolated into a prompt. */
const SCENE_PRESETS: Record<string, string> = {
  'stadium-night':
    'A large modern football stadium at night: tiered stands, natural green pitch, roof trusses, white floodlights and an indistinct distant crowd. Position the subject on a plausible foreground concourse or touchline with the pitch behind them. Match cool overhead light with soft facial fill, realistic catchlights and contact shadows. Preserve stadium scale; never enlarge spectators into extra subjects. No real athletes, tournament symbols, team crests, sponsors or readable jersey branding.',
  'award-night':
    'An original elegant evening reception on a waterfront terrace, with a night skyline, illuminated bridge and warm city lights reflected on dark water. Suggest a refined awards-night atmosphere with discreet warm practical lighting and distant indistinct guests, not a trophy. Keep the face naturally exposed against deep navy surroundings with accurate glass and water reflections. No real ceremony, branded backdrop, trophy, celebrity, readable signage or claim that an actual prize was won.',
  'red-carpet':
    'A believable fictional red-carpet entrance at night photographed like a real event arrival, with simple velvet barriers, a practical venue entrance and a small number of distant indistinct photographers. Preserve the source-supported pose and framing instead of forcing a walking or over-the-shoulder pose. Use restrained direct-flash highlights mixed with warm practical venue light, slight real-world exposure falloff and natural background depth. Keep skin texture and fabric response photographic rather than glossy or airbrushed. Avoid excessive bloom, perfect luxury-ad lighting, synthetic bokeh or an over-designed premiere set. No real event logos, film titles, brand walls or readable text.',
  'luxury-car':
    'A modern city at night with one parked, unbranded premium vehicle beside the subject. Use localized wet-street reflections and controlled distant bokeh. Keep the car at realistic scale with consistent wheel geometry, ground contact and reflected light. Use a soft neutral key on the face and subtle street-light rims. No body merged into the car, purple skin, plastic paint, vehicle emblems or readable plates.',
  'istanbul-sunset':
    'A refined waterfront city terrace at golden hour, with a layered skyline, peach-gold clouds and subtle water reflections. Place low sunset light to one side with soft skylight fill and plausible cast shadows. Keep the subject at terrace scale and preserve natural skin rather than covering everything in orange. Keep distant architecture quieter than the face. No readable signs, branding or documentary claim.',
  'cosmic-camp':
    'A quiet rocky night campsite under a plausible star field, with a small unbranded tent and a warm lantern. Balance lantern light with cool sky fill so facial detail remains legible. Keep tent scale, ground contact, shadows and depth coherent. No flames touching the subject, giant planets, duplicated stars, franchise objects or readable text.',
  'waterfront-night':
    'A real-looking public waterfront promenade during blue hour, with an ordinary modern skyline, a believable illuminated suspension bridge and naturally uneven city window lights in the distance. Keep reflections restrained, broken by real water movement rather than long perfect mirror streaks. Preserve slightly imperfect real-world architecture, atmospheric depth and practical urban lighting instead of creating a futuristic skyline or luxury advertising set. Use a soft neutral nearby practical light on the subject with subtle cool ambient sky fill, retaining natural skin color and realistic shadow falloff. Keep architectural verticals plausible, bridge cables coherent, and railings and the waterline behind the subject without intersecting the body. Avoid exaggerated neon, excessive bloom, artificial HDR and overly cinematic blue-orange grading.',
  'coastal-terrace':
    'A shaded Mediterranean stone terrace above a clear turquoise cove, framed by a wooden pergola and pink bougainvillea. Include restrained linen seating, distant white sailboats and sunlit coastal hills. Use bright natural daylight softened by overhead shade, warm reflected light from stone and realistic blue water bounce. Keep the horizon level, boats distant and the subject at believable terrace scale. Do not place furniture or plants across the face or limbs; avoid artificial tropical oversaturation.',
  'window-portrait':
    "A minimal charcoal-gray portrait setting with directional window light from one side and broad, soft architectural shadows on the wall. Keep the eyes clearly visible, gentle catchlights, a soft shadow transition across the face and fine natural skin and hair texture. Separate dark clothing from the background with restrained ambient fill. No new furniture, accessories or decorative props. Preserve the original person's identity; do not borrow the face, age, gender or clothes of a catalogue example.",
  'neon-drive':
    'An original futuristic waterfront city after rain, with magenta and cyan architectural lights, a distant illuminated bridge and one unbranded dark sports coupe. Place the subject safely beside the parked vehicle, with believable size and contact shadows; never merge the body with the car or its windows. Use directional neon rim light, neutral facial fill and localized reflections on wet pavement rather than a global purple skin tint. Keep vehicle geometry, wheels and perspective coherent. No emblems, readable number plates, racing action or recognizable franchise elements.',
  'alpine-lake':
    'A tranquil alpine lake at sunset, with snow-capped mountains, dense evergreen forest, a small timber cabin with warm windows and a modest wooden jetty. Place the subject on a safe lakeside foreground with a believable ground plane, not floating on the water. Match low warm sunlight from the horizon with cool sky fill, subtle lake reflections and atmospheric depth in distant peaks. Keep the cabin small relative to the landscape and preserve reflected light direction. Render natural rock, timber and water texture without excessive HDR, repeated trees or impossible mountain reflections.',
};

const STYLE_PRESETS: Record<string, string> = {
  'drip-art':
    'Original contemporary drip-art with controlled flowing pigment mainly around clothing and background, following gravity. Retain recognizable facial geometry, distinct eyes and mouth, and intentional negative space. Do not cover the face with blobs or turn drips into extra anatomy.',
  'pop-art':
    'Original pop-art with a limited vivid palette, clean contour shapes and fine screen-print halftones at consistent scale. Keep facial planes and expression legible and preserve composition. No speech bubbles, poster lettering, new props or imitation of an existing artwork.',
  hdr: 'Restrained high dynamic range: detailed shadows, controlled highlights and accurate skin tones. Recover tonal separation without inventing texture or flattening light direction. Keep subtle pores and smooth gradients. No halos, crunchy hair, oversharpening, local-contrast outlines or excessive saturation.',
  bokeh:
    'Natural optical depth separation with eyes and eyelashes in crisp focus. Defocus according to scene depth, preserving clean hair strands, glasses, ear edges and gaps between fingers. Do not replace the environment, blur facial features or add light discs where no light source exists.',
  cinematic:
    'A cinematic film-still finish with controlled contrast, soft highlight roll-off, natural warm skin, restrained cool environmental shadows and subtle fine grain. Keep the selected environment, time of day and dominant light source. No film bars, teal skin, smoke or unrelated night scenery.',
  vintage:
    'An understated analog film response with gentle highlight bloom, organic fine grain, slightly muted saturation and warm midtones. Preserve clean facial detail and neutral whites. No sepia blanket, simulated damage, date stamp or film-frame border.',
  'black-white':
    'Elegant black-and-white photography with a rich luminance range and natural skin texture. Separate hair, clothing and backdrop through soft midtones; retain eye catchlights. No crushed shadows, chalky highlights, selective colored objects or excessive microcontrast.',
  cyberpunk:
    'Controlled cyan and magenta accent lighting in the existing scene, with reflected color only on physically compatible surfaces and neutral facial fill. Preserve objects and setting in a filter edit; do not invent a car, wet road or skyline. No brand marks, signage, readable text or recognizable franchise elements.',
  watercolor:
    'Original hand-painted watercolor with translucent layered washes, delicate cold-press paper texture and controlled pigment edges. Keep eyes, lips and silhouette defined while peripheral detail softens. Preserve facial geometry. No drips across eyes, unrelated objects, lettering or imitation of a specific artist.',
  sketch:
    'An original editorial pencil-and-ink sketch with measured line weight, subtle paper grain and hatching that describes form. Keep eyes, mouth and facial geometry precise. No doubled contours, marks resembling scars, unrelated annotations, signatures or imitation of a specific artist.',
  cartoon:
    'An original polished cartoon illustration with clean expressive contours and coherent soft cel shading. Simplify details while retaining original age, face proportions, expression, hairstyle and clothing silhouette. No enlarged eyes, tiny nose, doll-like skin, extra fingers or imitation of a named animation studio or character.',
  'natural-light':
    'A restrained natural photographic finish with neutral colors and accurate skin tones. Limit changes to subtle exposure, white balance and dynamic range unless an explicit localized edit is requested. Preserve texture, small imperfections and the setting. No artificial makeup, age changes or reshaping. For landscapes and objects, preserve structure without inventing a person.',
  studio:
    'A warm professional studio lighting finish: a broad softbox-like key from 45 degrees, gently warm highlights, neutral skin midtones, restrained opposite-side fill and a subtle warm hair rim where physically plausible. Shape the face through lighting rather than changing facial geometry. Preserve pores, hair strands and natural catchlights without plastic smoothing. The selected scene controls the background; this style must not replace it.',
};

/** Operational, style-specific strength targets. These are not provider quality or credit tiers. */
const STYLE_INTENSITY: Record<string, readonly [string, string, string]> = {
  studio: [
    'Keep the source light almost intact. Add only a faint warm key-light lift, very soft cheek shadow separation and barely visible hair rim; do not create dramatic studio contrast.',
    'Use clearly visible soft warm key light and balanced neutral fill. Add moderate cheek and jaw shadow shaping, warm catchlights and a restrained hair rim; retain detail on the shadow side.',
    'Use the complete warm-studio treatment: pronounced golden soft-key highlights, richer controlled shadow shaping, noticeably stronger warm hair rim and clear subject separation. Keep skin midtones natural and the face fully readable, without an orange wash or clipped highlights.',
  ],
  'natural-light': [
    'Make only tiny exposure and white-balance corrections; preserve nearly all source contrast and color.',
    'Make a visible but natural daylight correction, lift underexposed midtones and balance cool or warm casts while preserving believable shadow depth.',
    'Use the full natural-light correction: clean luminous midtones, recovered highlight detail, open readable shadows and crisp natural color separation. The effect must be visibly stronger than a light touch without HDR halos or beauty retouching.',
  ],
  cinematic: [
    'Use faint film-like highlight roll-off and almost imperceptible cool shadows; retain original saturation and contrast.',
    'Use a visible film color grade with moderate cool-shadow/warm-highlight separation, shaped contrast and fine restrained grain.',
    'Use the full cinematic grade: deep but legible cool shadows, luminous warm highlights, stronger tonal separation and subtle film grain. Preserve the scene time of day and natural facial color.',
  ],
  vintage: [
    'Add a delicate warm film tint with barely visible grain, keeping the original black point and saturation.',
    'Add clearly noticeable warm midtones, moderately muted saturation, a gentle lifted black point and fine analog grain.',
    'Use the complete vintage film response with rich warm midtones, visibly muted colors, lifted blacks, soft highlight bloom and organic grain; no damage, sepia blanket or loss of facial detail.',
  ],
  'black-white': [
    'Use a light partial desaturation, retaining most original color and only slightly strengthening luminance separation.',
    'Use a predominantly monochrome treatment with only a faint trace of original color and moderate luminance contrast.',
    'Convert fully to true neutral black-and-white with no remaining color; use rich, separated midtones and stronger controlled luminance contrast while retaining eyes and shadow detail.',
  ],
  hdr: [
    'Recover just a little shadow and highlight detail; avoid changing the overall source contrast.',
    'Recover a clearly visible balanced range of shadow and highlight detail with moderate local tonal separation.',
    'Use the full HDR treatment with substantially recovered dynamic range and strong but clean texture separation; preserve light direction and never create halos or crunchy oversharpening.',
  ],
  bokeh: [
    'Apply only a faint additional background defocus, leaving the setting easy to read.',
    'Use noticeable optical background separation while keeping major environmental forms recognizable.',
    'Use the complete strong optical bokeh treatment with a distinctly defocused distant background and crisp eyes, hair edges and facial detail. Do not blur the subject or invent light discs.',
  ],
  cyberpunk: [
    'Add a faint cyan or magenta edge-light accent only; retain most original color and light.',
    'Use visible cyan and magenta accents with moderate reflected color and neutral facial fill.',
    'Use the full expressive cyan-magenta lighting grade with strong localized rim lights and deep separated shadows, keeping skin neutrally filled and all existing objects recognizable.',
  ],
  'drip-art': [
    'Retain predominantly photographic detail with a few restrained pigment accents at the background and clothing edges.',
    'Use a clear mixed-media treatment with moderate pigment flow on background and clothing while the face remains finely described.',
    'Use the complete expressive drip-art treatment with rich layered flowing pigment and bold negative-space composition; keep eyes and mouth clear and never turn paint into extra anatomy.',
  ],
  'pop-art': [
    'Retain mainly photographic shading with a faint palette simplification and a few delicate halftone accents.',
    'Use clearly visible graphic color regions, moderate contour definition and consistent fine halftone texture.',
    'Use the complete pop-art treatment with bold clean contour shapes, strongly simplified vivid color planes and expressive screen-print halftones; no lettering or poster layout.',
  ],
  watercolor: [
    'Retain photographic structure with only a light translucent wash and very subtle paper texture.',
    'Use clearly visible translucent watercolor washes and softened peripheral edges, retaining precise eyes and lips.',
    'Use the complete watercolor illustration with layered washes, visible pigment behavior and paper texture, simplifying peripheral detail while keeping the source facial geometry.',
  ],
  sketch: [
    'Retain most photographic tone with a few faint pencil contours and delicate paper grain.',
    'Use a visible pencil-and-ink interpretation with moderate hatching and preserved tonal modeling.',
    'Use the complete editorial sketch interpretation with strong intentional line work, confident form-following hatching and paper texture, without doubled contours or loss of identity.',
  ],
  cartoon: [
    'Retain mostly photographic shading with a little contour cleanup and restrained color simplification.',
    'Use a clear semi-illustrated treatment with visible clean contours and moderate soft cel shading.',
    'Use the complete polished cartoon treatment with simplified clean color planes and expressive soft cel shading; preserve original facial proportions, age and recognizable identity.',
  ],
};

const DEFAULT_COMPOSITION: LegacyGenerationRecipe['composition'] = {
  shotType: 'PORTRAIT',
  cameraAngle: 'EYE_LEVEL',
  subjectPosition: 'CENTER',
  backgroundDepth: 'BALANCED',
};

/**
 * The exact catalog IDs captured when a generation was submitted. Older jobs
 * have no snapshot and deliberately fall back to their project once, while
 * every new job is immutable.
 */
export type ResolvedGenerationSelection = {
  sceneTemplateId: string | null;
  stylePresetId: string | null;
  featuredPersonId: string | null;
};

export function resolveGenerationSelection(
  recipe: LegacyGenerationRecipe | null,
  project: ProjectRecord,
): ResolvedGenerationSelection {
  if (recipe?.selection) {
    return {
      sceneTemplateId: recipe.selection.sceneTemplateId ?? null,
      stylePresetId: recipe.selection.stylePresetId ?? null,
      featuredPersonId: recipe.selection.featuredPersonId ?? null,
    };
  }
  return {
    sceneTemplateId: project.sceneTemplateId,
    stylePresetId: project.stylePresetId,
    featuredPersonId: project.featuredPersonId,
  };
}

export function recipeFromLegacyComposition(
  composition: ProjectRecord['composition'],
): LegacyGenerationRecipe['composition'] {
  switch (composition) {
    case 'SELFIE':
      return { ...DEFAULT_COMPOSITION, shotType: 'CLOSE_SELFIE', backgroundDepth: 'SHALLOW' };
    case 'CLOSE':
      return { ...DEFAULT_COMPOSITION, shotType: 'PORTRAIT', backgroundDepth: 'SHALLOW' };
    case 'MEDIUM':
      return { ...DEFAULT_COMPOSITION, shotType: 'HALF_BODY' };
    case 'WIDE':
      return { ...DEFAULT_COMPOSITION, shotType: 'FULL_BODY', backgroundDepth: 'DEEP' };
    default:
      return { ...DEFAULT_COMPOSITION };
  }
}

export function normalizeGenerationRecipe(
  recipe: LegacyGenerationRecipe | null,
  legacyComposition: ProjectRecord['composition'],
): LegacyGenerationRecipe {
  if (!recipe) {
    return {
      version: 1,
      filterIntensity: 60,
      composition: recipeFromLegacyComposition(legacyComposition),
      character: null,
    };
  }
  return {
    version: 1,
    ...(recipe.selection
      ? {
          selection: {
            sceneTemplateId: recipe.selection.sceneTemplateId ?? null,
            stylePresetId: recipe.selection.stylePresetId ?? null,
            featuredPersonId: recipe.selection.featuredPersonId ?? null,
          },
        }
      : {}),
    filterIntensity: Number.isFinite(recipe.filterIntensity)
      ? Math.max(0, Math.min(100, Math.round(recipe.filterIntensity)))
      : 60,
    composition: { ...DEFAULT_COMPOSITION, ...recipe.composition },
    character: recipe.character,
    ...(recipe.beauty ? { beauty: recipe.beauty } : {}),
    ...(recipe.transformation ? { transformation: recipe.transformation } : {}),
    ...(recipe.trendPreset ? { trendPreset: recipe.trendPreset } : {}),
    ...(recipe.toolPreset ? { toolPreset: recipe.toolPreset } : {}),
  };
}

export function scenePrompt(item: CatalogItem | null, mode: ProjectRecord['mode']): string {
  // Environment fragments never override the edit's preservation scope.
  if (mode === 'AI_FILTER' || mode === 'PRO_PORTRAIT') return safeSceneFallback(mode);
  const environment = item ? SCENE_PRESETS[item.slug] : null;
  return [safeSceneFallback(mode), environment].filter(Boolean).join('\n');
}

function safeSceneFallback(mode: ProjectRecord['mode']): string {
  if (mode === 'BACKGROUND_REPLACE') {
    return `
Perform a background-focused edit. Preserve the primary user's original face, hairstyle, clothing,
pose and expression. Replace only the surrounding environment and match lighting, contact shadows,
reflections and depth of field without halos or cutout edges.`;
  }
  if (mode === 'AI_FILTER') {
    return `
Keep the original setting, objects, pose, expression and internal composition. Apply only the
selected visual treatment or requested localized edit. If canvas expansion is explicitly
requested, extend the existing environment beyond the edges without moving, stretching or
replacing the original subject. Do not introduce unrelated people, scenery or props.`;
  }
  if (mode === 'PRO_PORTRAIT') {
    return `
Create a premium professional business portrait with a neutral charcoal or warm-gray studio background,
flattering realistic light and natural skin texture. Use the selected framing; preserve expression,
age and hairstyle. Do not invent a suit or accessories when clothing preservation is enabled.`;
  }
  return `
Build the selected environment around the source subject with believable scale and perspective.
Treat the source person's existing pose, visible anatomy and source-supported framing as the photographic anchor.
Adapt the environment and requested composition around that anchor rather than rebuilding the person to fit a catalogue pose.
If no environment is specified, retain the original setting. Scene descriptions define setting,
not a new identity or mandatory wardrobe. No real event, brand, public figure or documentary claim.`;
}

export function stylePrompt(item: CatalogItem | null): string {
  return item
    ? (STYLE_PRESETS[item.slug] ?? STYLE_PRESETS['natural-light']!)
    : STYLE_PRESETS['natural-light']!;
}

export function intensityPrompt(value: number, style: CatalogItem | null = null): string {
  const bounded = Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 60;
  if (bounded === 0)
    return 'STYLE STRENGTH 0/100: Do not apply the optional style treatment. Still perform the selected scene or explicit editing task; retain original photographic color and texture.';
  const tier = bounded <= 40 ? 0 : bounded <= 75 ? 1 : 2;
  const slug = style?.slug ?? 'natural-light';
  const directions = Object.hasOwn(STYLE_INTENSITY, slug)
    ? STYLE_INTENSITY[slug]!
    : STYLE_INTENSITY['natural-light']!;
  return [
    `STYLE STRENGTH ${bounded}/100 (${['LOW', 'MEDIUM', 'HIGH'][tier]}).`,
    directions[tier],
    'Scale the treatment continuously toward this target. Low must remain close to the source, medium must be clearly intermediate, and high is the complete selected treatment; do not render all strengths identically.',
    'Intensity controls style, color, light and texture, never identity, anatomy, output quality, or how completely the requested scene is applied. Do not blend unrelated scenes or add people at high intensity.',
  ].join(' ');
}

export function compositionPrompt(composition: LegacyGenerationRecipe['composition']): string {
  const shot = {
    CLOSE_SELFIE:
      'Prefer a close handheld smartphone selfie composition when the source framing supports it. Preserve natural, undistorted facial perspective and do not invent a new extended arm or phone when neither is supported by the source.',
    PORTRAIT:
      'Prefer a chest-up portrait with comfortable headroom when supported by the source. If the source is tighter, preserve the closest natural source-supported portrait framing rather than inventing unseen torso anatomy.',
    HALF_BODY:
      'Use a waist-up composition only when the source provides enough visible body information to preserve anatomy faithfully. Otherwise use the closest natural source-supported framing and adapt the scene around it.',
    FULL_BODY:
      'Use a full-body composition only when the source contains enough visible body information to reconstruct it faithfully. Otherwise use the closest natural source-supported framing; never invent major unseen body regions merely to satisfy full-body framing.',
  }[composition.shotType];
  const angle = {
    EYE_LEVEL: 'Use an eye-level camera angle.',
    SLIGHTLY_LOW: 'Use a subtly low camera angle without distorting the subject.',
    SLIGHTLY_HIGH: 'Use a subtly high camera angle while keeping the face natural.',
  }[composition.cameraAngle];
  const placement = {
    CENTER: 'Place the primary user near the visual centre.',
    LEFT: 'Place the primary user in the left third while keeping the face in the mobile safe area.',
    RIGHT:
      'Place the primary user in the right third while keeping the face in the mobile safe area.',
  }[composition.subjectPosition];
  const depth = {
    SHALLOW: 'Use a shallow, natural depth of field.',
    BALANCED: 'Use balanced foreground and background detail.',
    DEEP: 'Keep a deeper environmental field of view while retaining a clear primary subject.',
  }[composition.backgroundDepth];
  const secondary = composition.secondarySubjectPosition
    ? `If a permitted secondary character is present, place them ${composition.secondarySubjectPosition
        .toLowerCase()
        .replace('_', ' ')} with believable scale and spacing.`
    : '';
  return [shot, angle, placement, depth, secondary].filter(Boolean).join(' ');
}

export function characterPrompt(person: CatalogFeaturedPerson | null): string {
  if (!person) return 'Do not add a secondary character, public figure or celebrity.';
  if (person.kind === 'FICTIONAL_CHARACTER' && person.rightsStatus === 'FICTIONAL') {
    return `
Add one original fictional secondary character appropriate for the selected scene.
The character must have a unique original face and must not closely reproduce a real athlete,
celebrity, actor, musician, politician or historical public figure. This is an AI-generated fan
creation, not evidence of a real meeting, endorsement or event.`;
  }
  if (person.kind === 'LICENSED_PERSON' && person.rightsStatus === 'LICENSED') {
    return `
Input image 2 contains the approved licensed reference for the secondary subject. Use it only to
represent that approved subject, adapting pose, lighting and perspective to the selected scene.
Do not depict endorsement, advertising, a real news event or documentary evidence.`;
  }
  // Route and worker rights checks fail before this branch; keep the prompt fail-closed too.
  return 'Do not add a secondary character, public figure or celebrity.';
}
