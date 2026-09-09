import { EmailSchema } from '@birkare/contracts';
import type { BirKareConfig } from '@birkare/config';
import { createRemoteJWKSet, errors, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import { unauthorized, unavailable } from '@birkare/shared';

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'), {
  cacheMaxAge: 60 * 60 * 1000,
  cooldownDuration: 30_000,
  timeoutDuration: 5_000,
});

export type VerifiedGoogleIdentity = {
  /** Google's immutable OIDC `sub`; this is the only provider identifier we persist. */
  subject: string;
  email: string;
  givenName?: string;
  familyName?: string;
  /** Verified provider issue time; callers may require a fresh identity for sensitive actions. */
  issuedAt?: number;
};

export interface GoogleIdentityVerifier {
  verify(idToken: string): Promise<VerifiedGoogleIdentity>;
}

const profileClaim = (payload: JWTPayload, key: string): string | undefined => {
  const value = payload[key];
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, 80) : undefined;
};

/**
 * Verifies Google-issued OpenID Connect ID tokens locally against Google's
 * rotating JWKS. No OAuth client secret is involved: native ID-token login is
 * verified with signed claims, issuer, audience and short token lifetime.
 */
export class GoogleIdTokenService implements GoogleIdentityVerifier {
  private readonly audiences: string[];

  constructor(
    config: Pick<
      BirKareConfig,
      'GOOGLE_IOS_CLIENT_ID' | 'GOOGLE_ANDROID_CLIENT_ID' | 'GOOGLE_WEB_CLIENT_ID'
    >,
    private readonly keyResolver: JWTVerifyGetKey = GOOGLE_JWKS,
  ) {
    this.audiences = [
      config.GOOGLE_IOS_CLIENT_ID,
      config.GOOGLE_ANDROID_CLIENT_ID,
      config.GOOGLE_WEB_CLIENT_ID,
    ]
      .filter((value): value is string => Boolean(value?.trim()))
      .map((value) => value.trim());
  }

  async verify(idToken: string): Promise<VerifiedGoogleIdentity> {
    if (this.audiences.length === 0) {
      throw unavailable(
        'AUTH_GOOGLE_NOT_CONFIGURED',
        'Google ile giriş henüz bu ortam için yapılandırılmadı.',
      );
    }

    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(idToken, this.keyResolver, {
        algorithms: ['RS256'],
        audience: this.audiences,
        issuer: GOOGLE_ISSUERS,
        requiredClaims: ['exp', 'iat', 'sub'],
        maxTokenAge: '1h',
        clockTolerance: 5,
      }));
    } catch (error) {
      if (error instanceof errors.JWTExpired) {
        throw unauthorized(
          'AUTH_GOOGLE_TOKEN_EXPIRED',
          'Google oturumunun süresi dolmuş. Google ile yeniden devam edin.',
        );
      }
      if (error instanceof errors.JWTClaimValidationFailed && error.claim === 'aud') {
        throw unauthorized(
          'AUTH_GOOGLE_CLIENT_MISMATCH',
          'Google istemcisi ile sunucu yapılandırması eşleşmiyor. Uygulamayı güncelleyip yeniden deneyin.',
        );
      }
      if (error instanceof errors.JWKSTimeout || error instanceof errors.JWKSInvalid) {
        throw unavailable(
          'AUTH_GOOGLE_VERIFICATION_UNAVAILABLE',
          'Google kimliği şu an doğrulanamadı. Lütfen tekrar deneyin.',
        );
      }
      // Remote JWKS fetch failures are platform errors, not invalid user input.
      if (!(error instanceof errors.JOSEError)) {
        throw unavailable(
          'AUTH_GOOGLE_VERIFICATION_UNAVAILABLE',
          'Google kimliği şu an doğrulanamadı. Lütfen tekrar deneyin.',
        );
      }
      throw unauthorized('AUTH_INVALID_GOOGLE_TOKEN', 'Google kimliği doğrulanamadı.');
    }

    // OIDC requires azp for a multi-audience token. When present it must be a
    // BirKare client ID too; accepting an unrelated authorized party would
    // weaken the audience check above.
    if (
      (Array.isArray(payload.aud) && payload.aud.length > 1 && typeof payload.azp !== 'string') ||
      (payload.azp !== undefined &&
        (typeof payload.azp !== 'string' || !this.audiences.includes(payload.azp)))
    ) {
      throw unauthorized('AUTH_INVALID_GOOGLE_TOKEN', 'Google kimliği doğrulanamadı.');
    }

    const subject = typeof payload.sub === 'string' ? payload.sub.trim() : '';
    const emailResult = EmailSchema.safeParse(payload.email);
    if (
      !subject ||
      subject.length > 255 ||
      payload.email_verified !== true ||
      !emailResult.success
    ) {
      throw unauthorized('AUTH_INVALID_GOOGLE_TOKEN', 'Google kimliği doğrulanamadı.');
    }

    return {
      subject,
      email: emailResult.data,
      issuedAt: payload.iat,
      ...(profileClaim(payload, 'given_name')
        ? { givenName: profileClaim(payload, 'given_name') }
        : {}),
      ...(profileClaim(payload, 'family_name')
        ? { familyName: profileClaim(payload, 'family_name') }
        : {}),
    };
  }
}
