import type { PendingSocialProfile } from './auth-store';

export type PendingSocialRegistration = {
  pendingToken: string;
  profile: PendingSocialProfile;
  provider?: 'Apple' | 'Google';
};

// The short-lived server token deliberately remains in memory only. Keeping it
// out of route parameters, logs, and persistent storage means an app restart
// safely requires a fresh provider authentication.
let pendingSocialRegistration: PendingSocialRegistration | null = null;

export function setPendingSocialRegistration(input: PendingSocialRegistration): void {
  pendingSocialRegistration = input;
}

export function getPendingSocialRegistration(): PendingSocialRegistration | null {
  return pendingSocialRegistration;
}

export function clearPendingSocialRegistration(): void {
  pendingSocialRegistration = null;
}
