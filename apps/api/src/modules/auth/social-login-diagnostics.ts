import type { Request } from 'express';
import { decodeJwt } from 'jose';
import type { Logger } from '@birkare/logger';

type Provider = 'google' | 'apple';

/**
 * Public, non-identifying claims of an (unverified) provider token. Client IDs
 * are public app identifiers; `sub`, `email` and the token itself never leave
 * this function, so the log stays useful for "which OAuth client sent this?".
 */
function publicClaims(idToken: unknown) {
  if (typeof idToken !== 'string') return { decodable: false };
  try {
    const claims = decodeJwt(idToken);
    const now = Math.floor(Date.now() / 1000);
    return {
      decodable: true,
      iss: claims.iss,
      aud: claims.aud,
      azp: typeof claims.azp === 'string' ? claims.azp : undefined,
      ageSeconds: typeof claims.iat === 'number' ? now - claims.iat : undefined,
      expiresInSeconds: typeof claims.exp === 'number' ? claims.exp - now : undefined,
      emailVerified: claims.email_verified,
    };
  } catch {
    return { decodable: false };
  }
}

/** Logs every social sign-in attempt so operators can see why a device login fails. */
export async function withSocialLoginDiagnostics<T>(
  logger: Logger | undefined,
  provider: Provider,
  action: 'login' | 'link',
  req: Request,
  run: () => Promise<T>,
): Promise<T> {
  const body = (req.body ?? {}) as { idToken?: unknown; platform?: unknown; appVersion?: unknown };
  const context = {
    provider,
    action,
    requestId: req.requestId,
    platform: typeof body.platform === 'string' ? body.platform : undefined,
    appVersion: typeof body.appVersion === 'string' ? body.appVersion : undefined,
    claims: publicClaims(body.idToken),
  };
  try {
    const result = await run();
    logger?.info(context, 'Sosyal giriş başarılı.');
    return result;
  } catch (error) {
    logger?.warn(
      {
        ...context,
        code: (error as { code?: unknown })?.code,
        statusCode: (error as { statusCode?: unknown })?.statusCode,
      },
      'Sosyal giriş reddedildi.',
    );
    throw error;
  }
}
