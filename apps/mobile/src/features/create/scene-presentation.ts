import { scenes } from '@/constants/catalog';
import { experienceScenes } from '@/constants/experience-scenes';

/** Category-only presets share their original artwork without losing the chosen scene label. */
export function getSelectedScene(id: string | null) {
  const scene = scenes.find((item) => item.id === id);
  if (scene) return { name: scene.name, previewSource: scene.previewSource };
  const category = experienceScenes.find((item) => id && item.preset.sceneId === id);
  if (!category) return null;
  return {
    name: id === 'scene-sunset-terrace' ? 'Gün Batımı Terası' : category.title,
    previewSource: category.source,
  };
}
