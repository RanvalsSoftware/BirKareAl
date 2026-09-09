import { Image } from 'react-native';
import { fictionalPeople } from '@/constants/catalog';
import type { CreateFlow } from './createFlow';

/** Bundled fictional artwork is the PRIMARY source, not an added celebrity. */
export function fictionalSourceSelection(id: string): Partial<CreateFlow> | null {
  const person = fictionalPeople.find((item) => item.id === id);
  if (!person?.previewSource) return null;
  const source = Image.resolveAssetSource(person.previewSource);
  if (!source?.uri) return null;
  return {
    sourceKind: 'fictional',
    sourceCharacterId: id,
    sourceUri: source.uri,
    sourceName: `${person.slug}.png`,
    personId: null,
    sourceRightsConfirmed: false,
  };
}
