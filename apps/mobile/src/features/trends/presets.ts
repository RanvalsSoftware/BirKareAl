import type { CreateFlow } from '@/features/create/createFlow';

/** Only supported preset IDs reach the API; the server owns every model prompt. */
export const trendPresets = [
  {
    id: 'kpop_star',
    name: 'K-Pop Star',
    description: 'Parlak konser ışıkları ve özgün sahne stili.',
    detail:
      'Pembe ve lavanta konser ışıkları, özgün siyah sahne kıyafeti ve dinamik üç çeyrek açı.',
  },
  {
    id: 'pop_icon_80s',
    name: '80’ler Pop İkonu',
    description: 'Hacimli saçlar, deri detaylar ve retro sahne ışıkları.',
    detail: 'Omuz üzerinden bakış, siyah deri ceket, mor ve mavi ışıklarla retro müzik stüdyosu.',
  },
  {
    id: 'analog_90s',
    name: '90’lar Analog',
    description: 'Doğrudan flaş, film dokusu ve rahat sokak stili.',
    detail: 'Akşam kaldırımında rahat denim, doğrudan flaş ve kontrollü analog film dokusu.',
  },
  {
    id: 'y2k_celebrity',
    name: 'Y2K Işıltısı',
    description: 'Metalik moda ve 2000’ler flaş estetiği.',
    detail: 'Gece araçtan inerken omuz üzerinden bakış, gümüş stil ve parlak fotoğraf flaşları.',
  },
  {
    id: 'red_carpet_glam',
    name: 'Kırmızı Halı',
    description: 'Flaşlar altında şık ve sinematik bir giriş.',
    detail: 'Kurgusal bir davette kırmızı halı, siyah resmi kıyafet ve sıcak mimari ışıklar.',
  },
  {
    id: 'editorial_cover',
    name: 'Editoryal Kapak',
    description: 'Güçlü poz, heykelsi kıyafet ve sade stüdyo.',
    detail:
      'Açık stüdyo fonunda güçlü oturma pozu ve hacimli siyah kumaş. Dergi yazısı veya logo eklenmez.',
  },
  {
    id: 'old_money_portrait',
    name: 'Sade Lüks',
    description: 'Zamansız kıyafetler ve doğal pencere ışığı.',
    detail:
      'Klasik okuma odasında krem ve lacivert tonlar, doğal pencere ışığı ve sakin bir portre.',
  },
  {
    id: 'streetwear_editorial',
    name: 'Şehir Editoryali',
    description: 'Gece sokaklarında güçlü bir moda karesi.',
    detail: 'Taş şehir mimarisi, deri ceket, geniş denim ve ıslak zeminde editoryal flaş.',
  },
  {
    id: 'neon_club_night',
    name: 'Neon Gece',
    description: 'Renkli müzik ışıkları ve enerjik gece atmosferi.',
    detail: 'Pembe ve mavi ışıklar, disko topu ve doğal bir yakın selfie kompozisyonu.',
  },
] as const;

export type TrendPresetId = (typeof trendPresets)[number]['id'];
export function getTrendPreset(id: string | null | undefined) {
  return trendPresets.find((preset) => preset.id === id) ?? null;
}
export function trendCreationSelection(
  id: TrendPresetId,
  source?: Pick<CreateFlow, 'sourceKind' | 'sourceCharacterId'>,
): Partial<CreateFlow> {
  return {
    mode: 'filter',
    toolId: 'trend',
    trendPreset: id,
    beauty: null,
    transformation: null,
    sourceKind: 'photo',
    sourceCharacterId: null,
    sceneId: null,
    personId: null,
    styleId: 'filter-natural',
    preserveFace: true,
    preserveClothes: false,
    customInstruction: '',
    filterIntensity: 60,
    ...(source?.sourceKind === 'fictional' || source?.sourceCharacterId
      ? { sourceUri: null, sourceName: null, sourceRightsConfirmed: false }
      : {}),
  };
}
