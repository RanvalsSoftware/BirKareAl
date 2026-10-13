import { EmailSchema } from '@birkare/contracts';
import type { BirKareConfig } from '@birkare/config';
import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { createHash, timingSafeEqual } from 'node:crypto';
import { ApiError, unauthorized, unavailable } from '@birkare/shared';
import { identityTokenReplayRef, type IdentityTokenReplayRef } from './identity-token-replay.js';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'), {
  cacheMaxAge: 60 * 60 * 1000,
  cooldownDuration: 30_000,
  timeoutDuration: 5_000,
});

export type VerifiedAppleIdentity = {
  subject: string;
  email: string;
  issuedAt?: number;
  /** Single-use identity of this ID token (see identity-token-replay.ts). */
  replay?: IdentityTokenReplayRef;
};

export interface AppleIdentityVerifier {
  /**
   * Sign-in passes `options` (with the raw nonce the client generated, if any)
   * and thereby opts in to nonce binding: a token carrying a `nonce` claim is
   * rejected unless that nonce matches. Callers that omit `options` (in-session
   * re-authentication) keep the previous behaviour.
   */
  verify(idToken: string, options?: { nonce?: string }): Promise<VerifiedAppleIdentity>;
}

function sameText(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * A token minted for a nonce is only valid together with that nonce. Apple
 * echoes whatever the client passed in the authorization request: the
 * recommended SHA-256 (hex) of the raw nonce, or the raw nonce itself.
 */
function nonceMatches(claim: unknown, rawNonce: string | undefined): boolean {
  if (claim === undefined || claim === null) return true;
  if (typeof claim !== 'string' || !claim || !rawNonce) return false;
  const hashed = createHash('sha256').update(rawNonce).digest('hex');
  return sameText(claim.toLowerCase(), hashed) || sameText(claim, rawNonce);
}

/** Verifies Apple's signed identity token against its rotating public keys. */
export class AppleIdTokenService implements AppleIdentityVerifier {
  private readonly audience: string | undefined;

  constructor(
    config: Pick<BirKareConfig, 'APPLE_BUNDLE_ID'>,
    private readonly keyResolver: JWTVerifyGetKey = APPLE_JWKS,
  ) {
    this.audience = config.APPLE_BUNDLE_ID?.trim() || undefined;
  }

  async verify(idToken: string, options?: { nonce?: string }): Promise<VerifiedAppleIdentity> {
    if (!this.audience) {
      throw unavailable(
        'AUTH_APPLE_NOT_CONFIGURED',
        'Apple ile giriş henüz bu ortam için yapılandırılmadı.',
      );
    }

    try {
      const { payload } = await jwtVerify(idToken, this.keyResolver, {
        algorithms: ['RS256'],
        audience: this.audience,
        issuer: APPLE_ISSUER,
        requiredClaims: ['exp', 'iat', 'sub'],
        maxTokenAge: '10m',
        clockTolerance: 5,
      });
      const subject = typeof payload.sub === 'string' ? payload.sub.trim() : '';
      const email = EmailSchema.safeParse(payload.email);
      const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
      if (!subject || subject.length > 255 || !emailVerified || !email.success) {
        throw unauthorized('AUTH_INVALID_APPLE_TOKEN', 'Apple kimliği doğrulanamadı.');
      }
      if (options && !nonceMatches(payload.nonce, options.nonce)) {
        throw unauthorized('AUTH_INVALID_APPLE_TOKEN', 'Apple kimliği doğrulanamadı.');
      }
      return {
        subject,
        email: email.data,
        issuedAt: payload.iat,
        replay: identityTokenReplayRef(idToken, payload),
      };
    } catch (error) {
      if (error instanceof errors.JWTExpired) {
        throw unauthorized(
          'AUTH_APPLE_TOKEN_EXPIRED',
          'Apple oturumunun süresi dolmuş. Apple ile yeniden devam edin.',
        );
      }
      if (error instanceof errors.JWTClaimValidationFailed && error.claim === 'aud') {
        throw unauthorized(
          'AUTH_APPLE_CLIENT_MISMATCH',
          'Apple uygulama kimliği ile sunucu yapılandırması eşleşmiyor.',
        );
      }
      if (error instanceof errors.JWKSTimeout || error instanceof errors.JWKSInvalid) {
        throw unavailable(
          'AUTH_APPLE_VERIFICATION_UNAVAILABLE',
          'Apple kimliği şu an doğrulanamadı. Lütfen tekrar deneyin.',
        );
      }
      if (error instanceof ApiError) throw error;
      if (!(error instanceof errors.JOSEError)) {
        throw unavailable(
          'AUTH_APPLE_VERIFICATION_UNAVAILABLE',
          'Apple kimliği şu an doğrulanamadı. Lütfen tekrar deneyin.',
        );
      }
      throw unauthorized('AUTH_INVALID_APPLE_TOKEN', 'Apple kimliği doğrulanamadı.');
    }
  }
}
