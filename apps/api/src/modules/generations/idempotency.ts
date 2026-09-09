import type { BirKareRepository } from '@birkare/database';
import { hashStable } from '@birkare/shared';

/** Also used for credit reservations, whose idempotency keys are global. */
export function accountIdempotencyKey(
  userId: string,
  clientKey: string,
  route = 'POST:/v1/generations',
): string {
  return `user:${hashStable(JSON.stringify([userId, route, clientKey]))}`;
}

export async function findAccountIdempotency(
  repository: Pick<BirKareRepository, 'getIdempotency'>,
  route: string,
  userId: string,
  clientKey: string,
) {
  const scoped = await repository.getIdempotency(
    route,
    accountIdempotencyKey(userId, clientKey, route),
  );
  if (scoped?.userId === userId) return scoped;
  // Preserve retries created before account-scoped keys were deployed, but
  // never expose another account's cached generation response or existence.
  const legacy = await repository.getIdempotency(route, clientKey);
  return legacy?.userId === userId ? legacy : null;
}
