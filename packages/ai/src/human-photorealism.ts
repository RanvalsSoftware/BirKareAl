/**
 * Shared preservation rules for photographic transformations.
 *
 * Keep these separate from scene/style directions so every photographic
 * workflow starts from the same source-fidelity contract.
 */
export const HUMAN_SOURCE_FIDELITY_CORE = `SOURCE PHOTOGRAPH AUTHORITY

INPUT IMAGE 1 is the authoritative photographic reference for the actual source subject.

If one or more people are visible, preserve the source-supported:
- recognizable identity and facial geometry
- natural skin tone and individual facial details
- body proportions and visible anatomy
- pose and gesture whenever possible
- camera perspective and facial perspective
- believable clothing fit and fabric behavior

If no person is visible, preserve the actual object's or environment's identity, geometry, proportions, materials, texture, perspective and physically plausible structure. Do not invent a human subject.

For visible people, do not invent, extend or reconstruct unseen body regions merely to satisfy a target pose, shot type or composition.
If the requested scene or art direction asks for a wider, seated, walking, over-the-shoulder or full-body pose that the source does not reliably support, adapt the target to the closest natural framing supported by the source instead.

Never force a new arm position, hand pose, leg pose, seated posture, walking step or body turn when doing so would require guessing major unseen anatomy.
Scene and styling directions must adapt around the source person; the source person must not be rebuilt to fit the scene.

Identity, anatomy and source-supported framing always take priority over a catalogue pose or camera instruction.`;

export const HUMAN_PHOTOREALISM_CORE = `PHOTOGRAPHIC REALISM TARGET

Make the finished result explicitly photorealistic. It must feel like a genuine photograph captured in a real moment with a real camera and physically plausible light, not as AI artwork, CGI, 3D rendering, a game cinematic or a synthetic digital composite.

Favor grounded, authentic, naturally imperfect photography over over-staged perfection. If the selected scene, style or preset explicitly calls for editorial or campaign polish, keep that polish restrained and physically photographed; otherwise avoid glossy campaign perfection, dramatic movie-poster grading and artificial spectacle.

When people are visible, retain real photographic detail where present:
- pores, fine lines and subtle skin-tone variation
- individual and flyaway hair strands
- natural facial asymmetry
- realistic fabric wear, wrinkles, seams and material response
- plausible lens perspective and depth falloff
- physically consistent contact shadows and reflected light

For objects and environments, retain believable material texture, small real-world irregularities, atmospheric depth, surface response, perspective, contact shadows and reflections instead of making surfaces unnaturally perfect.

Avoid:
- plastic or waxy skin
- excessively perfect facial symmetry
- artificial HDR or crunchy local contrast
- exaggerated bloom, glow or lens flare
- uniformly tinted skin from colored lights
- impossible mirror-like reflections
- overly clean cutout edges
- synthetic background bokeh that does not correspond to real light sources
- over-smoothed architecture, water, pavement, fabric or object surfaces

The scene may become more polished, but it must still look physically photographed rather than digitally rendered.`;
