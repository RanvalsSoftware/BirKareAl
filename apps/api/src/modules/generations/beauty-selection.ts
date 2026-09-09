import {
  badRequest,
  forbidden,
  premiumBeautySelections,
  type BeautySettings,
  type GenderTransformation,
} from '@birkare/shared';
import type { AssetRecord, CatalogSnapshot, ProjectRecord } from '@birkare/database';

/** Fail closed until server-verified store entitlements exist; credits do not imply PRO. */
export function assertBeautyAccess(input: {
  mode: string;
  beauty?: BeautySettings;
  transformation?: GenderTransformation;
  sceneTemplateId?: string | null;
  featuredPersonId?: string | null;
}) {
  if (!input.beauty && !input.transformation) return;
  if (
    input.mode !== 'AI_FILTER' ||
    input.sceneTemplateId ||
    input.featuredPersonId ||
    (input.beauty && input.transformation)
  ) {
    throw badRequest(
      'BEAUTY_SELECTION_INVALID',
      'Güzellik ve görünüm dönüşümü ayrı, yalnız fotoğrafa uygulanan araçlardır.',
    );
  }
  if (input.beauty && premiumBeautySelections(input.beauty).length) {
    throw forbidden(
      'BEAUTY_PRO_UNAVAILABLE',
      'Bu PRO güzellik seçeneği henüz kullanıma açılmadı. Diğer rötuşları kullanabilirsiniz.',
    );
  }
}

export function assertBeautySource(
  input: { beauty?: BeautySettings; transformation?: GenderTransformation },
  source: AssetRecord,
  project: ProjectRecord,
  stylePresetId: string | null | undefined,
  catalog: CatalogSnapshot,
) {
  if (!input.beauty && !input.transformation) return;
  if (
    source.type !== 'USER_SOURCE' ||
    source.deletedAt ||
    (project.sourceAssetId && project.sourceAssetId !== source.id)
  ) {
    throw badRequest(
      'BEAUTY_ORIGINAL_REQUIRED',
      'Bu araç için projeye ait özgün fotoğrafı yükleyin; üretilmiş sonuç üzerine katman eklenemez.',
    );
  }
  assertBeautyStyle(input, stylePresetId, catalog);
}

export function assertBeautyStyle(
  input: { beauty?: BeautySettings; transformation?: GenderTransformation },
  stylePresetId: string | null | undefined,
  catalog: CatalogSnapshot,
) {
  if (!input.beauty && !input.transformation) return;
  const style = [...catalog.styles, ...catalog.filters].find((item) => item.id === stylePresetId);
  if (style?.slug !== 'natural-light') {
    throw badRequest(
      'BEAUTY_STYLE_INVALID',
      'Güzellik düzenlemesi farklı bir sanatsal filtreyle birleştirilemez.',
    );
  }
}
