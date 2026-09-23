import type { AiToolPreset } from '@birkare/shared';

const TOOL_PROMPTS: Record<AiToolPreset, string> = {
  background: `EDIT INTENT: BACKGROUND REPLACEMENT

CHANGE ONLY: the surrounding environment.
KEEP EVERYTHING ELSE THE SAME: the source person's identity, face, hairstyle, clothing, body proportions, pose, expression, camera angle and source-supported framing.

Place the unchanged source subject naturally into the selected server-approved scene.
Match ground contact, shadow direction and softness, perspective, depth of field, reflected light and color temperature so the result reads as one photorealistic photograph captured in the same moment.
Do not restage the person merely to fit the background.
Do not create cutout halos, pasted edges, floating feet, mismatched light direction, synthetic bokeh or a digitally composited look.`,

  light: `EDIT INTENT: NATURAL RELIGHTING

CHANGE ONLY: exposure, white balance and physically plausible lighting on the existing photograph.
KEEP EVERYTHING ELSE THE SAME: location, objects, people, identity, pose, expression, clothing, camera angle, framing and composition.

Follow the dominant source light direction. Improve shadow readability and recover highlight detail conservatively without flattening the original light structure.
The result should look like the same real photograph captured with better exposure and light balance, not a newly generated scene.
Do not add windows, lamps, furniture, props, makeup, new scenery, dramatic color grading or colored skin casts.`,

  portrait: `EDIT INTENT: PROFESSIONAL PORTRAIT

CHANGE ONLY: the portrait environment and photographic lighting allowed by the selected server-approved portrait style.
KEEP THE PERSON THE SAME: recognizable identity, facial geometry, apparent age, expression, hairstyle, skin tone, clothing, body proportions and source-supported anatomy.

Create a photorealistic portrait that still feels like the same photographed person, not a replacement catalogue model.
Use believable real-camera portrait lighting, natural catchlights, visible skin texture and restrained background separation.
Do not slim the face, reshape features, add makeup, invent formal clothing, add accessories, force a new pose or reconstruct unseen body regions.`,

  extend: `EDIT INTENT: CANVAS EXPANSION / OUTPAINTING

CHANGE ONLY: pixels outside the original visible image bounds that are necessary to reach the requested output aspect ratio.
KEEP THE ORIGINAL IMAGE CONTENT THE SAME.

Do not move, enlarge, stretch, crop, duplicate, restage or reconstruct the existing person or main object.
Generate only a photorealistic continuation beyond the original edges.
Continue horizon lines, ground planes, perspective, texture, lighting, shadows, reflections and depth consistently from the source.
Do not add new people, vehicles, landmarks, balloons, furniture or unrelated scenery merely to fill space.
No blurred filler, mirrored edges, borders, repeated textures or obvious generative seams.`,
};

export function toolPresetPrompt(preset: AiToolPreset | undefined): string | null {
  return preset ? TOOL_PROMPTS[preset] : null;
}
