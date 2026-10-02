import { readFile } from 'node:fs/promises';
import { SignJWT, importPKCS8, type KeyLike } from 'jose';
import type { BirKareConfig } from '@birkare/config';
import { unavailable } from '@birkare/shared';

const APPLE_AUDIENCE = 'https://appleid.apple.com';
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_REVOKE_URL = 'https://appleid.apple.com/auth/revoke';

export interface AppleTokenRevoker {
  revoke(authorizationCode: string): Promise<void>;
}

type AppleRevocationConfig = Pick<
  BirKareConfig,
  | 'APPLE_BUNDLE_ID'
  | 'APPLE_TEAM_ID'
  | 'APPLE_KEY_ID'
  | 'APPLE_PRIVATE_KEY_FILE'
  | 'APPLE_PRIVATE_KEY_BASE64'
>;

function decodePrivateKey(value: string): string {
  const decoded = Buffer.from(value, 'base64').toString('utf8').trim();
  if (
    !decoded.startsWith('-----BEGIN PRIVATE KEY-----') ||
    !decoded.endsWith('-----END PRIVATE KEY-----')
  ) {
    throw new Error('Invalid Apple PKCS#8 private key');
  }
  return decoded;
}

export class AppleTokenRevocationService implements AppleTokenRevoker {
  private signingKey: Promise<KeyLike> | undefined;

  constructor(
    private readonly config: AppleRevocationConfig,
    private readonly request: typeof fetch = fetch,
    private readonly loadPrivateKey: (path: string) => Promise<string> = async (path) =>
      readFile(path, 'utf8'),
  ) {}

  private configured() {
    const {
      APPLE_BUNDLE_ID,
      APPLE_TEAM_ID,
      APPLE_KEY_ID,
      APPLE_PRIVATE_KEY_FILE,
      APPLE_PRIVATE_KEY_BASE64,
    } = this.config;
    if (
      !APPLE_BUNDLE_ID ||
      !APPLE_TEAM_ID ||
      !APPLE_KEY_ID ||
      (!APPLE_PRIVATE_KEY_FILE && !APPLE_PRIVATE_KEY_BASE64)
    ) {
      throw unavailable(
        'AUTH_APPLE_REVOCATION_NOT_CONFIGURED',
        'Apple hesap bağlantısı şu an güvenli biçimde kaldırılamıyor. Lütfen destekle iletişime geçin.',
      );
    }
    return {
      clientId: APPLE_BUNDLE_ID,
      teamId: APPLE_TEAM_ID,
      keyId: APPLE_KEY_ID,
      privateKeyFile: APPLE_PRIVATE_KEY_FILE,
      privateKeyBase64: APPLE_PRIVATE_KEY_BASE64,
    };
  }

  private async clientSecret(): Promise<string> {
    const values = this.configured();
    this.signingKey ??= (
      values.privateKeyBase64
        ? Promise.resolve(decodePrivateKey(values.privateKeyBase64))
        : this.loadPrivateKey(values.privateKeyFile!)
    ).then((pem) => importPKCS8(pem.trim(), 'ES256'));
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: values.keyId })
      .setIssuer(values.teamId)
      .setSubject(values.clientId)
      .setAudience(APPLE_AUDIENCE)
      .setIssuedAt(now)
      .setExpirationTime(now + 300)
      .sign(await this.signingKey);
  }

  async revoke(authorizationCode: string): Promise<void> {
    const { clientId } = this.configured();
    const clientSecret = await this.clientSecret().catch(() => {
      throw unavailable(
        'AUTH_APPLE_REVOCATION_UNAVAILABLE',
        'Apple hesap bağlantısı şu an kaldırılamıyor. Lütfen daha sonra tekrar deneyin.',
      );
    });
    const exchange = await this.request(APPLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: authorizationCode,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    if (!exchange?.ok) {
      throw unavailable(
        'AUTH_APPLE_REVOCATION_UNAVAILABLE',
        'Apple hesap bağlantısı şu an kaldırılamıyor. Apple ile yeniden doğrulayıp tekrar deneyin.',
      );
    }
    const tokens = (await exchange.json().catch(() => null)) as {
      refresh_token?: unknown;
      access_token?: unknown;
    } | null;
    const refreshToken =
      typeof tokens?.refresh_token === 'string' && tokens.refresh_token
        ? tokens.refresh_token
        : null;
    const accessToken =
      typeof tokens?.access_token === 'string' && tokens.access_token ? tokens.access_token : null;
    const token = refreshToken ?? accessToken;
    if (!token) {
      throw unavailable(
        'AUTH_APPLE_REVOCATION_UNAVAILABLE',
        'Apple hesap bağlantısı şu an kaldırılamıyor. Apple ile yeniden doğrulayıp tekrar deneyin.',
      );
    }
    const revoked = await this.request(APPLE_REVOKE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        token,
        token_type_hint: refreshToken ? 'refresh_token' : 'access_token',
      }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    if (!revoked?.ok) {
      throw unavailable(
        'AUTH_APPLE_REVOCATION_UNAVAILABLE',
        'Apple hesap bağlantısı şu an kaldırılamıyor. Lütfen daha sonra tekrar deneyin.',
      );
    }
  }
}
