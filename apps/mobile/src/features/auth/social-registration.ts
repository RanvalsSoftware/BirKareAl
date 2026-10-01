import type { PendingSocialProfile } from './auth-store';
import type { GoogleProfileHint } from './google-sign-in';

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

export function withGoogleProfileFallback(
  profile: PendingSocialProfile,
  hint: GoogleProfileHint,
): PendingSocialProfile {
  return {
    ...profile,
    firstName: profile.firstName?.trim() || hint.firstName?.trim() || null,
    lastName: profile.lastName?.trim() || hint.lastName?.trim() || null,
  };
}
