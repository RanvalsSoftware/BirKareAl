import { QueryClient } from '@tanstack/react-query';
import { createStore } from 'zustand/vanilla';
import { describe, expect, it, vi } from 'vitest';
import { getCreateFlow, resetCreateFlow, updateCreateFlow } from '../create/createFlow';
vi.mock('../create/server', () => ({ clearSubmissionAttempts: vi.fn() }));
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
    resetCreateFlow();
    updateCreateFlow({ sourceUri: 'file:///onboarding.jpg', onboardingDraftPending: true });
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
    expect(client.getQueryData(['public-catalog'])).toEqual(['scene']);
    client.setQueryData(['wallet', 'alice'], 20);
    store.setState({ state: 'authenticated', user: { id: 'alice' } });
    expect(client.getQueryData(['wallet', 'alice'])).toBe(20);
    store.setState({ state: 'authenticated', user: { id: 'bob' } });
    expect(getCreateFlow().sourceUri).toBeNull();
    expect(getCreateFlow().onboardingDraftPending).toBe(false);
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    client.setQueryData(['wallet', 'bob'], 7);
    store.setState({ state: 'anonymous', user: null });
    expect(client.getQueryCache().getAll()).toHaveLength(0);
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
