import { afterEach, describe, expect, it } from 'vitest';

import { clearPendingSocialRegistration, withGoogleProfileFallback } from './social-registration';
import { consumePostAuthDestination, stagePostAuthDestination } from './post-auth-destination';

describe('Google social registration handoff', () => {
  afterEach(() => clearPendingSocialRegistration());

  it('uses the Android native profile only when verified token claims are absent', () => {
    expect(
      withGoogleProfileFallback(
        { email: 'user@example.com', firstName: null, lastName: '' },
        { firstName: 'Ada', lastName: 'Lovelace' },
      ),
    ).toEqual({ email: 'user@example.com', firstName: 'Ada', lastName: 'Lovelace' });

    expect(
      withGoogleProfileFallback(
        { email: 'user@example.com', firstName: 'Verified', lastName: 'Name' },
        { firstName: 'Native', lastName: 'Fallback' },
      ),
    ).toEqual({ email: 'user@example.com', firstName: 'Verified', lastName: 'Name' });
  });

  it('consumes the onboarding skip destination once', () => {
    stagePostAuthDestination('/(tabs)/projects');
    expect(consumePostAuthDestination()).toBe('/(tabs)/projects');
    expect(consumePostAuthDestination()).toBeNull();
  });
});
