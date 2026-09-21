import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';

import { apiRequest } from '@/api/client';
import { useAuthStore } from '@/features/auth/auth-store';
import { accountQueryKey } from '@/features/auth/account-query-cache';

export const CREDIT_WALLET_QUERY_KEY = ['wallet'] as const;
export const INITIAL_CREDIT_PLACEHOLDER = 21;

export type CreditWallet = {
  available: number;
  reserved: number;
  unlimited: boolean;
};

export type CreditTransaction = {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  referenceId: string | null;
  referenceType: string | null;
  availableAfter: number | null;
  reservedAfter: number | null;
  createdAt: string;
  completedAt: string | null;
};

/**
 * One authoritative balance source for every screen. Refetching on focus keeps
 * the badge in sync immediately after a generation reserves or spends credit.
 */
export function useCreditWallet() {
  const authenticated = useAuthStore((store) => store.state === 'authenticated');
  const userId = useAuthStore((store) => store.user?.id);
  const query = useQuery({
    queryKey: accountQueryKey(CREDIT_WALLET_QUERY_KEY, userId),
    queryFn: ({ signal }) => apiRequest<CreditWallet>('/v1/billing/wallet', { signal }),
    enabled: authenticated && Boolean(userId),
    staleTime: 0,
  });
  const { refetch } = query;

  useFocusEffect(
    useCallback(() => {
      if (authenticated) void refetch();
    }, [authenticated, refetch]),
  );

  return query;
}

export function useAvailableCredits(): number {
  return useCreditWallet().data?.available ?? INITIAL_CREDIT_PLACEHOLDER;
}

export function useCreditTransactions() {
  const authenticated = useAuthStore((store) => store.state === 'authenticated');
  const userId = useAuthStore((store) => store.user?.id);
  const query = useQuery({
    queryKey: accountQueryKey(['credit-transactions'], userId),
    queryFn: ({ signal }) =>
      apiRequest<{ items: CreditTransaction[] }>('/v1/billing/transactions', { signal }),
    enabled: authenticated && Boolean(userId),
    staleTime: 0,
  });
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (authenticated) void refetch();
    }, [authenticated, refetch]),
  );
  return query;
}
