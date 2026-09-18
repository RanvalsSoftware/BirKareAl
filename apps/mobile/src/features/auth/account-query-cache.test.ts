import { QueryClient } from '@tanstack/react-query';
import { createStore } from 'zustand/vanilla';
import { describe, expect, it, vi } from 'vitest';
import { getCreateFlow, resetCreateFlow, updateCreateFlow } from '../create/createFlow';
import { getStudioFlow, resetStudioFlow, updateStudioFlow } from '../studio/studioFlow';

const mocks = vi.hoisted(() => ({
  clearSubmissionAttempts: vi.fn(),
  clearStudioSubmissionAttempts: vi.fn(),
}));
vi.mock('../create/server', () => ({
  clearSubmissionAttempts: mocks.clearSubmissionAttempts,
}));
vi.mock('../studio/server', () => ({
  clearStudioSubmissionAttempts: mocks.clearStudioSubmissionAttempts,
}));
import { accountQueryKey, bindAccountQueryCache } from './account-query-cache';

describe('account query isolation', () => {
  it('keeps wallet and projects separate for each user and for signed-out screens', () => {
    const client = new QueryClient();
    for (const prefix of [['wallet'], ['projects', 'current-user']]) {
      client.setQueryData(accountQueryKey(prefix, 'alice'), { private: true });
      expect(client.getQueryData(accountQueryKey(prefix, 'bob'))).toBeUndefined();
      expect(client.getQueryData(accountQueryKey(prefix, null))).toBeUndefined();
    }
  });

  it('clears previous-account cache on swap/logout but leaves first sign-in and token refresh alone', () => {
    mocks.clearSubmissionAttempts.mockClear();
    mocks.clearStudioSubmissionAttempts.mockClear();
    resetCreateFlow();
    updateCreateFlow({ sourceUri: 'file:///onboarding.jpg', onboardingDraftPending: true });
    resetStudioFlow('fashion');
    updateStudioFlow({
      primaryUri: 'file:///person.jpg',
      secondaryUri: 'file:///garment.jpg',
      sceneId: 'fashion-studio-catalog',
      userNotes: 'private fitting note',
    });
    const client = new QueryClient();
    const store = createStore<{ state: string; user: { id: string } | null }>(() => ({
      state: 'anonymous',
      user: null,
    }));
    const unbind = bindAccountQueryCache(client, store);
    client.setQueryData(['public-catalog'], ['scene']);
    store.setState({ state: 'authenticated', user: { id: 'alice' } });
    expect(getCreateFlow().sourceUri).toBe('file:///onboarding.jpg');
    expect(getCreateFlow().onboardingDraftPending).toBe(true);
    expect(getStudioFlow()).toMatchObject({
      mode: 'fashion',
      primaryUri: 'file:///person.jpg',
      secondaryUri: 'file:///garment.jpg',
      userNotes: 'private fitting note',
    });
    expect(mocks.clearStudioSubmissionAttempts).not.toHaveBeenCalled();
    expect(client.getQueryData(['public-catalog'])).toEqual(['scene']);
    client.setQueryData(['wallet', 'alice'], 20);
    store.setState({ state: 'authenticated', user: { id: 'alice' } });
    expect(client.getQueryData(['wallet', 'alice'])).toBe(20);
    store.setState({ state: 'authenticated', user: { id: 'bob' } });
    expect(getCreateFlow().sourceUri).toBeNull();
    expect(getCreateFlow().onboardingDraftPending).toBe(false);
    expect(getStudioFlow()).toMatchObject({
      mode: 'product',
      primaryUri: null,
      secondaryUri: null,
      categoryId: null,
      sceneId: null,
      presetId: null,
      userNotes: '',
    });
    expect(mocks.clearSubmissionAttempts).toHaveBeenCalledTimes(1);
    expect(mocks.clearStudioSubmissionAttempts).toHaveBeenCalledTimes(1);
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    client.setQueryData(['wallet', 'bob'], 7);
    store.setState({ state: 'anonymous', user: null });
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(mocks.clearSubmissionAttempts).toHaveBeenCalledTimes(2);
    expect(mocks.clearStudioSubmissionAttempts).toHaveBeenCalledTimes(2);
    unbind();
  });

  it('aborts old-account requests and prevents late results repopulating the cache', async () => {
    const client = new QueryClient();
    const store = createStore<{ state: string; user: { id: string } | null }>(() => ({
      state: 'authenticated',
      user: { id: 'alice' },
    }));
    const unbind = bindAccountQueryCache(client, store);
    let receivedSignal: AbortSignal | undefined;
    let complete: ((result: string) => void) | undefined;
    const request = client
      .fetchQuery({
        queryKey: ['projects', 'alice'],
        queryFn: ({ signal }) => {
          receivedSignal = signal;
          return new Promise<string>((resolve) => {
            complete = resolve;
          });
        },
      })
      .catch(() => undefined);
    store.setState({ state: 'authenticated', user: { id: 'bob' } });
    expect(receivedSignal?.aborted).toBe(true);
    complete?.('alice-private-image');
    await request;
    expect(client.getQueryData(['projects', 'alice'])).toBeUndefined();
    unbind();
  });
});
