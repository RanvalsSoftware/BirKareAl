import type { CreateFlow, CreateMode } from './createFlow';

type RoutingSelection = Pick<
  CreateFlow,
  'mode' | 'sceneId' | 'sourceUri' | 'toolId' | 'beauty' | 'transformation' | 'trendPreset'
>;

export function needsSceneSelection(flow: Pick<CreateFlow, 'mode' | 'sceneId'>) {
  return ['scene', 'background', 'character'].includes(flow.mode) && !flow.sceneId;
}

/** A preselected scene/filter survives photo selection. No forced character/style pages. */
export function afterSourcePath(flow: RoutingSelection) {
  if (!flow.sourceUri) return '/create/upload';
  if (flow.beauty) return '/beauty';
  if (flow.transformation) return '/gender-change';
  if (flow.trendPreset) return `/trends/${flow.trendPreset}` as const;
  if (needsSceneSelection(flow)) return '/create/scene';
  return '/create/settings';
}

/** Compatibility for older links; new source -> editor flow uses afterSourcePath. */
export function afterQualityPath(
  mode: CreateMode,
  toolId?: string | null,
  sceneId?: string | null,
) {
  if (toolId || !needsSceneSelection({ mode, sceneId: sceneId ?? null })) return '/create/settings';
  return '/create/scene';
}

export function afterScenePath(_mode?: CreateMode) {
  return '/create/settings';
}

export function modeName(mode: CreateMode) {
  return {
    scene: 'Yeni sahne',
    character: 'Kurgusal karakter',
    filter: 'AI filtre',
    portrait: 'Profesyonel portre',
    background: 'Arka plan değiştir',
  }[mode];
}
