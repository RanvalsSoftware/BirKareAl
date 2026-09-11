import type { BirKareRepository, GenerationRecipe, ProjectRecord } from '@birkare/database';
import type { BirKareConfig } from '@birkare/config';
import { createRevenueCatService, type RevenueCatService } from './revenuecat.service.js';

const services = new WeakMap<BirKareRepository, RevenueCatService>();

function service(config: BirKareConfig, repository: BirKareRepository): RevenueCatService {
  const existing = services.get(repository);
  if (existing) return existing;
  const created = createRevenueCatService({ config, repository });
  services.set(repository, created);
  return created;
}

/**
 * Enforces Pro on the server immediately before credit reservation and queueing.
 * A client-side entitlement flag is never trusted for protected scenes, styles,
 * character flows or professional portraits.
 */
export async function assertProGenerationAccess(input: {
  config: BirKareConfig;
  repository: BirKareRepository;
  userId: string;
  project: ProjectRecord;
  selection: NonNullable<GenerationRecipe['selection']> | ProjectRecord;
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
    Boolean(scene?.isPro) ||
    Boolean(style?.isPro);

  if (requiresPro) {
    await service(input.config, input.repository).assertActive(input.userId);
  }
}
