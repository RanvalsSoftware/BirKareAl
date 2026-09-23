import { describe, expect, it } from 'vitest';
import { getStudioFlow, resetStudioFlow, updateStudioFlow } from './studioFlow';

describe('studio flow', () => {
  it('clears local image references and cross-mode selections on a new workflow', () => {
    updateStudioFlow({
      primaryUri: 'file:///product.jpg',
      categoryId: 'handbag',
      sceneId: 'white-studio',
      rightsConfirmed: true,
    });
    resetStudioFlow('nails');
    expect(getStudioFlow()).toMatchObject({
      mode: 'nails',
      primaryUri: null,
      secondaryUri: null,
      categoryId: null,
      sceneId: null,
      presetId: null,
      rightsConfirmed: false,
    });
  });

  it('revokes consent when the screen replaces an image', () => {
    resetStudioFlow('fashion');
    updateStudioFlow({ rightsConfirmed: true });
    updateStudioFlow({ primaryUri: 'file:///person.jpg', rightsConfirmed: false });
    expect(getStudioFlow().rightsConfirmed).toBe(false);
  });
});
