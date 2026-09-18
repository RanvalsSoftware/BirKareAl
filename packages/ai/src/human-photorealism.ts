/**
 * Shared preservation rules for human-photo transformations.
 *
 * Keep these separate from scene/style directions so every photographic human
 * workflow starts from the same source-fidelity contract.
 */
export const HUMAN_SOURCE_FIDELITY_CORE = `SOURCE PHOTOGRAPH AUTHORITY

INPUT IMAGE 1 is the authoritative photographic reference for the primary subject.

Preserve the source-supported:
- recognizable identity and facial geometry
- natural skin tone and individual facial details
- body proportions and visible anatomy
- pose and gesture whenever possible
- camera perspective and facial perspective
- believable clothing fit and fabric behavior

Do not invent, extend or reconstruct unseen body regions merely to satisfy a target pose, shot type or composition.
If the requested scene or art direction asks for a wider, seated, walking, over-the-shoulder or full-body pose that the source does not reliably support, adapt the target to the closest natural framing supported by the source instead.

Never force a new arm position, hand pose, leg pose, seated posture, walking step or body turn when doing so would require guessing major unseen anatomy.
Scene and styling directions must adapt around the source person; the source person must not be rebuilt to fit the scene.

Identity, anatomy and source-supported framing always take priority over a catalogue pose or camera instruction.`;

export const HUMAN_PHOTOREALISM_CORE = `PHOTOGRAPHIC REALISM TARGET

The final result must read as a genuine photograph captured with a real camera and physically plausible lighting, not as AI artwork, CGI, 3D rendering, a game cinematic or a synthetic digital composite.

Retain natural photographic imperfections and fine detail where visible:
- skin pores and subtle tonal variation
- individual and flyaway hair strands
- realistic fabric wrinkles, seams and material response
- natural facial asymmetry
- plausible lens perspective and depth falloff
- physically consistent contact shadows, reflected light and surface reflections

Avoid:
- plastic or waxy skin
- excessively perfect facial symmetry
- artificial HDR or crunchy local contrast
- exaggerated bloom, glow or lens flare
- uniformly tinted skin from colored lights
- impossible mirror-like reflections
- overly clean cutout edges
- synthetic background bokeh that does not correspond to real light sources
- over-smoothed architecture, water, pavement or fabric

Prefer restrained, imperfect real-world lighting over glossy advertising-render lighting unless the selected workflow explicitly requests a stylized illustration.`;
