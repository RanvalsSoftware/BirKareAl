import type { AiToolPreset } from '@birkare/shared';

const TOOL_PROMPTS: Record<AiToolPreset, string> = {
  background: `EDIT INTENT: BACKGROUND REPLACEMENT

Replace only the surrounding environment with the selected server-approved scene.
Preserve the source person's face, hairstyle, clothing, pose, expression and source-supported framing.
Match ground contact, shadow direction, perspective, depth of field, reflected light and color temperature so the subject belongs naturally in the new environment.
Do not create cutout halos, pasted edges, floating feet, mismatched light direction or a synthetic composite look.`,

  light: `EDIT INTENT: NATURAL RELIGHTING

Improve lighting only.
Preserve the existing location, objects, people, pose, expression, clothing, camera angle and framing.
Follow the dominant source light direction while balancing exposure, white balance and shadow detail.
Recover highlights and dark regions conservatively without flattening the original light structure.
Do not add windows, lamps, furniture, props, makeup, new scenery or colored skin casts.
The result should look like the same photograph captured with better natural exposure, not a newly generated scene.`,

  portrait: `EDIT INTENT: PROFESSIONAL PORTRAIT

Create a source-faithful professional portrait using the selected server-approved portrait style.
Preserve recognizable identity, facial geometry, apparent age, expression, hairstyle, clothing and source-supported anatomy.
Use realistic portrait lighting, natural catchlights, visible skin texture and restrained background separation.
Do not slim the face, reshape features, add makeup, invent formal clothing, add accessories or rebuild unseen body regions.
The final result must remain recognizably the same photographed person rather than a catalogue model.`,

  extend: `EDIT INTENT: CANVAS EXPANSION / OUTPAINTING

Expand only the outer canvas needed to reach the requested output aspect ratio.
Keep the original visible image content as unchanged as possible.
Do not move, enlarge, stretch, crop, duplicate or reconstruct the existing person or main object.
Generate only a physically plausible continuation beyond the original image boundaries.
Continue horizon lines, ground planes, perspective, texture, lighting, shadows and reflections seamlessly from the source.
Do not add new people, vehicles, landmarks, balloons, furniture or unrelated scenery merely to fill space.
No blurred filler, mirrored edges, borders or obvious generative seams.`,
};

export function toolPresetPrompt(preset: AiToolPreset | undefined): string | null {
  return preset ? TOOL_PROMPTS[preset] : null;
}
