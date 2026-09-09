import { badRequest, TREND_PRESET_IDS, type TrendPreset } from '@birkare/shared';
import type { AssetRecord, CatalogSnapshot, ProjectRecord } from '@birkare/database';

type TrendSelection = {
  mode: string;
  trendPreset?: TrendPreset;
  beauty?: unknown;
  transformation?: unknown;
  sceneTemplateId?: string | null;
  featuredPersonId?: string | null;
  characterMode?: string;
};

/** Quote, create and preview all validate the same fixed, non-combinable preset. */
export function assertTrendSelection(
  input: TrendSelection,
  stylePresetId: string | null | undefined,
  catalog: CatalogSnapshot,
) {
  if (!input.trendPreset) return;
  if (
    !TREND_PRESET_IDS.includes(input.trendPreset) ||
    input.mode !== 'AI_FILTER' ||
    input.sceneTemplateId ||
    input.featuredPersonId ||
    input.characterMode ||
    input.beauty ||
    input.transformation
  )
    throw badRequest(
      'TREND_SELECTION_INVALID',
      'Akım yalnızca kendi fotoğrafına, diğer araçlardan ayrı uygulanır.',
    );
  const style = [...catalog.styles, ...catalog.filters].find(
    (item) => item.id === stylePresetId && item.enabled,
  );
  if (style?.slug !== 'natural-light')
    throw badRequest('TREND_STYLE_INVALID', 'Akım başka bir sanatsal filtreyle birleştirilemez.');
}

export function assertTrendSource(
  input: { trendPreset?: TrendPreset },
  source: AssetRecord,
  project: ProjectRecord,
) {
  if (!input.trendPreset) return;
  if (
    source.type !== 'USER_SOURCE' ||
    source.deletedAt ||
    (project.sourceAssetId && project.sourceAssetId !== source.id)
  )
    throw badRequest('TREND_ORIGINAL_REQUIRED', 'Akım için projeye ait özgün fotoğrafını yükle.');
}
