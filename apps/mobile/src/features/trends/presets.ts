import type { CreateFlow } from '@/features/create/createFlow';

/** Only supported preset IDs reach the API; the server owns every model prompt. */
export const trendPresets = [
  {
    id: 'kpop_star',
    name: 'K-Pop Star',
    description: 'Modern konser ışıkları, gerçek sahne fotoğrafı ve güçlü performans stili.',
    detail:
      'Premium ama giyilebilir siyah sahne stili, doğal yüz dokusu, gerçek konser ışığı ve dinamik fakat anatomik poz.',
  },
  {
    id: 'pop_icon_80s',
    name: '80’ler Retro',
    description: '80’ler sahnesi, analog doku ve daha geniş retro kadraj.',
    detail:
      'Bel veya diz üstüne kadar nefes alan kadraj, hacimli saç, deri detaylar ve pembe-mavi analog sahne ışığı.',
  },
  {
    id: 'romantic_dinner_80s',
    name: 'Şık Akşam Yemeği',
    description: 'Mum ışığı, zarif 80’ler daveti; tek kişi veya iki ayrı fotoğraftan iki kişi.',
    detail:
      'Tek kişilik şık yemek portresi ya da iki ayrı kaynak fotoğraftaki kişiyi kimliklerini koruyarak aynı masada birleştiren doğal 80’ler gecesi.',
  },
  {
    id: 'romantic_closeup_80s',
    name: 'Yakın Retro Portre',
    description: 'Denim, deri ve analog flaş; tek kişi veya iki ayrı fotoğraftan iki kişi.',
    detail:
      'Retro lokanta atmosferinde doğal yakın plan; ikinci fotoğraf eklenirse iki kişiyi yüz ve beden kimliklerini karıştırmadan aynı karede birleştirir.',
  },
  {
    id: 'analog_90s',
    name: '90’lar Analog',
    description: '90’lar kompakt kamera hissi, doğrudan flaş ve rahat sokak stili.',
    detail:
      'Başın tamamı kadrajda kalacak şekilde daha geniş, gündelik bir sokak karesi; rahat denim, doğrudan flaş ve gerçek analog film dokusu.',
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
    description: 'Doğal duruş, zamansız kıyafet ve sade pencere ışığı.',
    detail:
      'Kaynak yüz ve baş-boyun hizasını koruyan klasik okuma odası portresi; krem-lacivert tonlar, doğal pencere ışığı ve 50–85 mm portre hissi.',
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
    description: 'Modern kulüp gecesi; temiz dijital kamera görünümü ve canlı ışıklar.',
    detail:
      '80’lerden ayrı olarak analog film tanesi veya retro saç/kıyafet yok: modern gece stili, telefon/kamera flaşı, pembe-camgöbeği ışık ve doğal sosyal an.',
  },
] as const;

export type TrendPresetId = (typeof trendPresets)[number]['id'];

export const EIGHTIES_TREND_IDS = [
  'pop_icon_80s',
  'romantic_dinner_80s',
  'romantic_closeup_80s',
] as const satisfies readonly TrendPresetId[];

export const DUAL_PERSON_TREND_IDS = [
  'romantic_dinner_80s',
  'romantic_closeup_80s',
] as const satisfies readonly TrendPresetId[];

export function supportsSecondPersonTrend(
  id: string | null | undefined,
): id is (typeof DUAL_PERSON_TREND_IDS)[number] {
  return DUAL_PERSON_TREND_IDS.some((presetId) => presetId === id);
}

export function isEightiesTrend(id: string | null | undefined): id is TrendPresetId {
  return EIGHTIES_TREND_IDS.some((presetId) => presetId === id);
}

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
