import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'node:crypto';
import type { BirKareConfig } from '@birkare/config';
import type { UserRecord } from '@birkare/database';
import { unauthorized } from '@birkare/shared';

export type AuthenticatedPrincipal = {
  userId: string;
  sessionId: string;
  role: UserRecord['role'];
  email: string;
};

export class TokenService {
  private readonly key: Uint8Array;

  constructor(
    private readonly config: Pick<
      BirKareConfig,
      'JWT_ACCESS_SECRET' | 'JWT_ISSUER' | 'JWT_USER_AUDIENCE' | 'JWT_ACCESS_TTL_SECONDS'
    >,
  ) {
    this.key = new TextEncoder().encode(config.JWT_ACCESS_SECRET);
  }

  async issueAccessToken(
    user: UserRecord,
    sessionId: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const accessToken = await new SignJWT({ role: user.role, email: user.email, sid: sessionId })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setIssuer(this.config.JWT_ISSUER)
      .setAudience(this.config.JWT_USER_AUDIENCE)
      .setSubject(user.id)
      .setJti(randomUUID())
      .setExpirationTime(`${this.config.JWT_ACCESS_TTL_SECONDS}s`)
      .sign(this.key);
    return { accessToken, expiresIn: this.config.JWT_ACCESS_TTL_SECONDS };
  }

  async verifyAccessToken(token: string): Promise<AuthenticatedPrincipal> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        issuer: this.config.JWT_ISSUER,
        audience: this.config.JWT_USER_AUDIENCE,
        algorithms: ['HS256'],
      });
      if (
        !payload.sub ||
        typeof payload.sid !== 'string' ||
        typeof payload.role !== 'string' ||
        typeof payload.email !== 'string'
      ) {
        throw unauthorized('AUTH_INVALID_TOKEN');
      }
      return {
        userId: payload.sub,
        sessionId: payload.sid,
        role: payload.role as UserRecord['role'],
        email: payload.email,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') throw error;
      throw unauthorized('AUTH_INVALID_TOKEN');
    }
  }
}
