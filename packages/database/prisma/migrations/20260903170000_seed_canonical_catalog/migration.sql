-- Seed the catalog UUIDs that the API and mobile create flow submit to Project.
--
-- The catalog tables deliberately have no owner/admin column, so this migration
-- only inserts a fixture when neither its immutable UUID nor its slug is already
-- present. `ON CONFLICT DO NOTHING` makes a repeated deployment safe and, more
-- importantly, leaves an administrator-managed record untouched.
--
-- `previewAssetId` remains NULL: mobile preview artwork is bundled with the app
-- and catalog storage assets are provisioned separately.

INSERT INTO "SceneTemplate" (
  "id",
  "slug",
  "name",
  "description",
  "category",
  "previewAssetId",
  "basePrompt",
  "negativeConstraints",
  "allowedModes",
  "requiredCredits",
  "isPro",
  "enabled",
  "sortOrder",
  "config",
  "updatedAt"
)
VALUES
  (
    'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d101',
    'stadium-night',
    'Gece Stadyumu',
    'Stadyum ışıkları altında güçlü bir kare.',
    'Popüler',
    NULL,
    $stadium$
Place the primary user in a modern professional football stadium at night.
Use realistic floodlights, a softly blurred audience and a tasteful match-day atmosphere.
Do not add team crests, sponsor logos or readable jersey branding.$stadium$,
    'Do not add a real athlete, team crest, sponsor logo, readable text, or documentary claim.',
    ARRAY['FULL_SCENE', 'FAN_MOMENT', 'BACKGROUND_REPLACE']::TEXT[],
    0,
    FALSE,
    TRUE,
    10,
    NULL,
    CURRENT_TIMESTAMP
  ),
  (
    'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d102',
    'award-night',
    'Ödül Gecesi',
    'Zarif ödül töreni atmosferi.',
    'Etkinlik',
    NULL,
    $award$
Place the primary user in an elegant, original awards-night environment.
Use refined warm lighting, a tasteful event entrance and softly blurred guests.
Do not imply a real awards ceremony or include event logos, trophies or readable signage.$award$,
    'Do not add real event branding, trophy likenesses, readable text, or a documentary claim.',
    ARRAY['FULL_SCENE', 'FAN_MOMENT', 'BACKGROUND_REPLACE']::TEXT[],
    0,
    FALSE,
    TRUE,
    20,
    NULL,
    CURRENT_TIMESTAMP
  ),
  (
    'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d103',
    'red-carpet',
    'Kırmızı Halı',
    'Sinematik gala girişi.',
    'Etkinlik',
    NULL,
    $red_carpet$
Place the primary user on an original film-premiere red carpet at night.
Use warm flash photography, velvet barriers and a luxury entrance with blurred photographers.
Do not add real event logos, film titles, brand walls or readable text.$red_carpet$,
    'Do not add real event branding, film titles, logos, readable text, or a documentary claim.',
    ARRAY['FULL_SCENE', 'FAN_MOMENT', 'BACKGROUND_REPLACE']::TEXT[],
    0,
    FALSE,
    TRUE,
    30,
    NULL,
    CURRENT_TIMESTAMP
  ),
  (
    'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d104',
    'luxury-car',
    'Lüks Araç',
    'Şehir ışıkları ve modern otomobil.',
    'Yaşam',
    NULL,
    $luxury_car$
Place the primary user beside a premium unbranded vehicle in a modern city at night.
Use wet-street reflections, controlled bokeh and coherent urban lighting.
Do not show vehicle emblems, plates or branding.$luxury_car$,
    'Do not add vehicle emblems, number plates, branding, readable text, or a documentary claim.',
    ARRAY['FULL_SCENE', 'BACKGROUND_REPLACE']::TEXT[],
    0,
    FALSE,
    TRUE,
    40,
    NULL,
    CURRENT_TIMESTAMP
  ),
  (
    'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d105',
    'istanbul-sunset',
    'İstanbul Gün Batımı',
    'Boğaz kıyısında sıcak ışık.',
    'Seyahat',
    NULL,
    $istanbul$
Place the primary user in an original waterfront city scene at golden hour.
Use warm natural light, a refined skyline and subtle water reflections.
Avoid landmarks, signs or claims that the photograph documents a real event.$istanbul$,
    'Do not add identifiable landmarks, signs, readable text, or a documentary claim.',
    ARRAY['FULL_SCENE', 'FAN_MOMENT', 'BACKGROUND_REPLACE']::TEXT[],
    0,
    FALSE,
    TRUE,
    50,
    NULL,
    CURRENT_TIMESTAMP
  ),
  (
    'ef78bc54-9f6b-4e3c-9d7f-9ba532e4d106',
    'cosmic-camp',
    'Kozmik Kamp',
    'Yıldızlı gökyüzünde özgün sahne.',
    'Sanatsal',
    NULL,
    $cosmic$
Place the primary user in an original cinematic night camp under a star-filled sky.
Use realistic low-light portrait exposure, a warm practical light and natural anatomy.
Do not copy a named science-fiction franchise or add readable text.$cosmic$,
    'Do not copy a named franchise, add readable text, logos, or a documentary claim.',
    ARRAY['FULL_SCENE', 'FAN_MOMENT', 'BACKGROUND_REPLACE']::TEXT[],
    1,
    TRUE,
    TRUE,
    60,
    NULL,
    CURRENT_TIMESTAMP
  )
ON CONFLICT DO NOTHING;

INSERT INTO "StylePreset" (
  "id",
  "slug",
  "name",
  "category",
  "engine",
  "previewAssetId",
  "promptModifier",
  "requiredCredits",
  "isPro",
  "supportsIntensity",
  "preserveFaceDefault",
  "enabled",
  "sortOrder",
  "updatedAt"
)
VALUES
  (
    '438b8c54-9f6b-4e3c-9d7f-9ba532e4d101',
    'drip-art',
    'Drip Art',
    'Sanatsal',
    'OPENAI',
    NULL,
    $drip$
Transform the portrait into contemporary original drip-art.
Blend recognisable facial detail with controlled flowing pigment and layered colour texture.
Keep the face silhouette, eyes, nose and mouth undistorted.$drip$,
    1,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    10,
    CURRENT_TIMESTAMP
  ),
  (
    '438b8c54-9f6b-4e3c-9d7f-9ba532e4d102',
    'pop-art',
    'Pop Art',
    'Sanatsal',
    'OPENAI',
    NULL,
    $pop$
Transform the image into bold original pop-art portraiture.
Use clean graphic shapes, vivid colour blocking and screen-print-inspired texture.
Do not copy a specific artist or existing artwork.$pop$,
    1,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    20,
    CURRENT_TIMESTAMP
  ),
  (
    '438b8c54-9f6b-4e3c-9d7f-9ba532e4d103',
    'hdr',
    'HDR',
    'Doğal',
    'OPENAI',
    NULL,
    $hdr$
Apply a restrained high-dynamic-range treatment with detailed shadows, controlled highlights
and realistic skin tone. Avoid halos, oversharpening and unnatural saturation.$hdr$,
    1,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    30,
    CURRENT_TIMESTAMP
  ),
  (
    '438b8c54-9f6b-4e3c-9d7f-9ba532e4d104',
    'bokeh',
    'Bokeh',
    'Portre',
    'OPENAI',
    NULL,
    $bokeh$
Create a refined portrait treatment with natural depth separation and softly defocused lights.
Keep the user's eyes sharply focused and preserve realistic edge detail around hair.$bokeh$,
    1,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    40,
    CURRENT_TIMESTAMP
  ),
  (
    '438b8c54-9f6b-4e3c-9d7f-9ba532e4d105',
    'cinematic',
    'Cinematic',
    'Popüler',
    'OPENAI',
    NULL,
    $cinematic$
Apply a sophisticated cinematic film-still treatment with controlled contrast, soft highlight
roll-off, warm natural skin tones, restrained cool environmental shadows and subtle film grain.$cinematic$,
    1,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    50,
    CURRENT_TIMESTAMP
  ),
  (
    '438b8c54-9f6b-4e3c-9d7f-9ba532e4d106',
    'vintage',
    'Vintage',
    'Popüler',
    'OPENAI',
    NULL,
    $vintage$
Apply premium analog portrait photography with soft highlight bloom, organic grain,
slightly muted saturation and a gentle nostalgic tonal response.$vintage$,
    1,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    60,
    CURRENT_TIMESTAMP
  ),
  (
    '438b8c54-9f6b-4e3c-9d7f-9ba532e4d107',
    'black-white',
    'Siyah Beyaz',
    'Portre',
    'OPENAI',
    NULL,
    $black_white$
Create an elegant black-and-white portrait with a rich, natural tonal range, controlled
contrast and detailed skin texture. Preserve face separation and avoid crushed shadows.$black_white$,
    1,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    70,
    CURRENT_TIMESTAMP
  ),
  (
    '438b8c54-9f6b-4e3c-9d7f-9ba532e4d108',
    'cyberpunk',
    'Cyberpunk',
    'Sinematik',
    'OPENAI',
    NULL,
    $cyberpunk$
Create an original futuristic neon-night treatment with controlled cyan and magenta practical
light, wet-surface reflections and realistic skin detail. Do not add brand marks, signage,
readable text, or copy a named film, game, or franchise.$cyberpunk$,
    1,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    80,
    CURRENT_TIMESTAMP
  ),
  (
    '438b8c54-9f6b-4e3c-9d7f-9ba532e4d109',
    'watercolor',
    'Watercolor',
    'Sanatsal',
    'OPENAI',
    NULL,
    $watercolor$
Transform the image into an original hand-painted watercolor illustration with translucent
layered washes, delicate paper texture and recognisable facial features. Do not imitate a
specific artist or existing artwork.$watercolor$,
    1,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    90,
    CURRENT_TIMESTAMP
  ),
  (
    '438b8c54-9f6b-4e3c-9d7f-9ba532e4d110',
    'sketch',
    'Sketch',
    'Sanatsal',
    'OPENAI',
    NULL,
    $sketch$
Transform the image into an original refined editorial pencil-and-ink sketch with measured line
weight, subtle paper grain and recognisable facial geometry. Do not imitate a specific artist.$sketch$,
    1,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    100,
    CURRENT_TIMESTAMP
  ),
  (
    '438b8c54-9f6b-4e3c-9d7f-9ba532e4d111',
    'cartoon',
    'Cartoon',
    'Sanatsal',
    'OPENAI',
    NULL,
    $cartoon$
Transform the image into an original polished cartoon illustration with clean expressive lines,
coherent shading and a recognisable likeness. Do not copy a named animation studio, character,
or franchise.$cartoon$,
    1,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    110,
    CURRENT_TIMESTAMP
  ),
  (
    'd38b8c54-9f6b-4e3c-9d7f-9ba532e4d101',
    'natural-light',
    'Doğal Işık',
    'Doğal',
    'OPENAI',
    NULL,
    $natural_light$
Use highly realistic natural portrait photography. Keep colours neutral, skin tones accurate
and improvements limited to subtle exposure, white balance and dynamic range.$natural_light$,
    0,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    120,
    CURRENT_TIMESTAMP
  ),
  (
    'd38b8c54-9f6b-4e3c-9d7f-9ba532e4d102',
    'studio',
    'Stüdyo',
    'Portre',
    'OPENAI',
    NULL,
    $studio$
Use a clean professional portrait finish with a neutral charcoal studio background,
realistic three-point lighting and natural skin texture.$studio$,
    0,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    130,
    CURRENT_TIMESTAMP
  )
ON CONFLICT DO NOTHING;

INSERT INTO "FeaturedPerson" (
  "id",
  "slug",
  "displayName",
  "category",
  "kind",
  "rightsStatus",
  "promptDescriptor",
  "referenceAssetId",
  "isHistorical",
  "isPoliticalOrSensitive",
  "minimumAge",
  "allowedCountries",
  "blockedCountries",
  "allowedSceneSlugs",
  "blockedUseCases",
  "disclosureText",
  "isSelectable",
  "isSearchable",
  "generationEnabled",
  "requiresDisclosure",
  "requiresWatermark",
  "enabled",
  "sortOrder",
  "updatedAt"
)
VALUES
  (
    'a18b8c54-9f6b-4e3c-9d7f-9ba532e4d101',
    'saha-efsanesi',
    'Saha Efsanesi',
    'Spor',
    'FICTIONAL_CHARACTER'::"FeaturedPersonKind",
    'FICTIONAL'::"RightsStatus",
    'An original fictional football star with a distinctive, non-celebrity appearance. Never resemble a real athlete or public figure.',
    NULL,
    FALSE,
    FALSE,
    NULL,
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'Bu görsel BirKare AI ile oluşturulmuş kurgusal bir fan sahnesidir.',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    TRUE,
    10,
    CURRENT_TIMESTAMP
  ),
  (
    'a18b8c54-9f6b-4e3c-9d7f-9ba532e4d102',
    'sinematik-yildiz',
    'Sinematik Yıldız',
    'Kültür',
    'FICTIONAL_CHARACTER'::"FeaturedPersonKind",
    'FICTIONAL'::"RightsStatus",
    'An original fictional red-carpet character with a distinctive, non-celebrity appearance. Never resemble a real actor, musician, or public figure.',
    NULL,
    FALSE,
    FALSE,
    NULL,
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'Bu görsel BirKare AI ile oluşturulmuş kurgusal bir fan sahnesidir.',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    TRUE,
    20,
    CURRENT_TIMESTAMP
  )
ON CONFLICT DO NOTHING;
