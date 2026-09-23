import { standardCreationSelection, type CreateFlow } from './createFlow';

/**
 * Safe server-owned AI tool selections.
 *
 * Mobile only chooses bounded mode/catalog IDs. The actual edit prompt for
 * background/light/portrait/extend is compiled on the API from the tool preset
 * ID and is never authored by the client.
 */
const toolPresets: Record<string, Partial<CreateFlow>> = {
  background: {
    mode: 'background',
    sceneId: 'scene-alpine-lake',
    styleId: 'filter-natural',
  },
  light: {
    mode: 'filter',
    styleId: 'filter-natural',
    filterIntensity: 35,
  },
  portrait: {
    mode: 'portrait',
    styleId: 'filter-studio',
    composition: 'Yakın',
  },
  extend: {
    mode: 'filter',
    styleId: 'filter-natural',
    aspectRatio: '16:9',
    filterIntensity: 10,
  },
};

export function getToolPreset(slug: string): Partial<CreateFlow> | null {
  if (!Object.hasOwn(toolPresets, slug)) return null;
  return standardCreationSelection({
    toolId: slug,
    sceneId: null,
    personId: null,
    styleId: null,
    preserveFace: true,
    preserveClothes: true,
    customInstruction: '',
    ...toolPresets[slug],
  });
}
