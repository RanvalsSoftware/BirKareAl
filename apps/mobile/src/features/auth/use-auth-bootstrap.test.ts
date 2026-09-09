import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ bootstrap: vi.fn(), effects: [] as (() => void)[] }));
vi.mock('react', () => ({
  useEffect: (effect: () => void) => {
    mocks.effects.push(effect);
  },
}));
vi.mock('./auth-store', () => ({
  useAuthStore: { getState: () => ({ bootstrap: mocks.bootstrap }) },
}));

describe('root authentication bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.effects.length = 0;
    mocks.bootstrap.mockResolvedValue(undefined);
  });

  it('starts restoration on root mount without relying on the index route', async () => {
    const { useAuthBootstrap } = await import('./use-auth-bootstrap');
    useAuthBootstrap();
    expect(mocks.bootstrap).not.toHaveBeenCalled();
    expect(mocks.effects).toHaveLength(1);
    mocks.effects[0]!();
    expect(mocks.bootstrap).toHaveBeenCalledOnce();
  });
});
