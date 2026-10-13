import { createHash } from 'node:crypto';
import type { JWTPayload } from 'jose';

/** Identity of one provider ID token for the single-use registry. */
export type IdentityTokenReplayRef = {
  /** `jti:<provider jti>` when the provider issues one, else `sha256:<hex>`. */
  key: string;
  /** The token's own expiry; the registry row is kept until then. */
  expiresAt: Date;
};

const FALLBACK_LIFETIME_MS = 24 * 60 * 60 * 1000;

/**
 * Hashes the SIGNED part of the JWT (`header.payload`). The signature segment
 * is deliberately excluded: lenient base64url decoders accept several
 * spellings of the same signature, which would otherwise let one token be
 * presented under several different hashes.
 */
function signedContentHash(idToken: string): string {
  const [header = '', payload = ''] = idToken.trim().split('.');
  const signed = payload ? `${header}.${payload}` : idToken.trim();
  return createHash('sha256').update(signed).digest('hex');
}

export function identityTokenReplayRef(
  idToken: string,
  payload?: Pick<JWTPayload, 'jti' | 'exp'>,
): IdentityTokenReplayRef {
  const jti = typeof payload?.jti === 'string' ? payload.jti.trim() : '';
  const expiresAt =
    typeof payload?.exp === 'number' && Number.isFinite(payload.exp)
      ? new Date(payload.exp * 1000)
      : new Date(Date.now() + FALLBACK_LIFETIME_MS);
  return {
    key: jti && jti.length <= 200 ? `jti:${jti}` : `sha256:${signedContentHash(idToken)}`,
    expiresAt,
  };
}
