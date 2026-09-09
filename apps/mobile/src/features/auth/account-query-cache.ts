import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { resetCreateFlow } from '../create/createFlow';
import { clearSubmissionAttempts } from '../create/server';

type AccountState = { state: string; user: { id: string } | null };
type AccountStore = {
  getState: () => AccountState;
  subscribe: (listener: (state: AccountState, previous: AccountState) => void) => () => void;
};

export function accountQueryKey(prefix: QueryKey, userId: string | null | undefined): QueryKey {
  return [...prefix, userId ?? null];
}

/**
 * Destroy authenticated queries synchronously when leaving an account. Query
 * destruction cancels in-flight fetches too, so a late response cannot restore
 * another user's projects or wallet. Anonymous onboarding drafts survive the
 * first sign-in; drafts belonging to an account are cleared when leaving it.
 */
export function bindAccountQueryCache(queryClient: QueryClient, store: AccountStore): () => void {
  return store.subscribe((state, previous) => {
    const previousId = previous.state === 'authenticated' ? previous.user?.id : null;
    const nextId = state.state === 'authenticated' ? state.user?.id : null;
    if (previousId && previousId !== nextId) {
      queryClient.clear();
      resetCreateFlow();
      clearSubmissionAttempts();
    }
  });
}
