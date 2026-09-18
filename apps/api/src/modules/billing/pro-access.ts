import type { BirKareRepository, LegacyGenerationRecipe, ProjectRecord } from '@birkare/database';
import { premiumBeautySelections } from '@birkare/shared';
import type { RevenueCatService } from './revenuecat.service.js';

/**
 * Enforces Pro on the server immediately before credit reservation and queueing.
 * A client-side entitlement flag is never trusted for protected scenes, styles,
 * character flows or professional portraits.
 */
export async function assertProGenerationAccess(input: {
  repository: BirKareRepository;
  revenueCatService: RevenueCatService;
  userId: string;
  project: ProjectRecord;
  recipe: LegacyGenerationRecipe;
  selection: NonNullable<LegacyGenerationRecipe['selection']> | ProjectRecord;
}): Promise<void> {
  const catalog = await input.repository.getCatalog();
  const scene = input.selection.sceneTemplateId
    ? catalog.scenes.find((item) => item.id === input.selection.sceneTemplateId)
    : null;
  const style = input.selection.stylePresetId
    ? [...catalog.styles, ...catalog.filters].find(
        (item) => item.id === input.selection.stylePresetId,
      )
    : null;

  const requiresPro =
    input.project.mode === 'PRO_PORTRAIT' ||
    input.project.mode === 'FAN_MOMENT' ||
    Boolean(input.selection.featuredPersonId) ||
    Boolean(input.recipe.beauty && premiumBeautySelections(input.recipe.beauty).length) ||
    Boolean(scene?.isPro) ||
    Boolean(style?.isPro);

  if (requiresPro) {
    await input.revenueCatService.assertActive(input.userId);
  }
}
