import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ value: 'booting' }));
vi.mock('./auth-store', () => ({
  useAuthStore: (selector: (store: { state: string }) => unknown) =>
    selector({ state: state.value }),
}));
vi.mock('./auth-boot-screen', () => ({ AuthBootScreen: () => null }));
vi.mock('expo-router', () => ({ Redirect: () => null }));

describe('protected deep-link entry', () => {
  beforeEach(() => {
    state.value = 'booting';
  });

  it('shows a visible authentication gate instead of returning a blank screen', async () => {
    const { RequireAuthenticated } = await import('./require-authenticated');
    const { AuthBootScreen } = await import('./auth-boot-screen');
    expect(RequireAuthenticated({ children: 'private beauty editor' }).type).toBe(AuthBootScreen);
  });

  it('does not expose editor content to anonymous deep links', async () => {
    state.value = 'anonymous';
    const { RequireAuthenticated } = await import('./require-authenticated');
    const result = RequireAuthenticated({ children: 'private beauty editor' });
    expect(result.props.href).toBe('/(auth)/login');
    expect(result.props.children).toBeUndefined();
  });

  it('keeps authenticated users on the requested editor route', async () => {
    state.value = 'authenticated';
    const { RequireAuthenticated } = await import('./require-authenticated');
    expect(RequireAuthenticated({ children: 'private beauty editor' }).props.children).toBe(
      'private beauty editor',
    );
  });
});
