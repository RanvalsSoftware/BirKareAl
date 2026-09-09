import type { RequestHandler } from 'express';
import { forbidden, unauthorized } from '@birkare/shared';
import type { TokenService } from '../services/token.service.js';
import type { BirKareRepository } from '@birkare/database';

export function requireAuth(
  tokenService: TokenService,
  repository: Pick<BirKareRepository, 'getUserById' | 'listSessions'>,
): RequestHandler {
  return async (req, _res, next) => {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) return next(unauthorized());
    try {
      const principal = await tokenService.verifyAccessToken(header.slice(7));
      const [user, sessions] = await Promise.all([
        repository.getUserById(principal.userId),
        repository.listSessions(principal.userId),
      ]);
      // A valid signature does not make a logged-out or deleted account active.
      if (
        !user ||
        user.deletedAt ||
        user.status === 'DELETION_PENDING' ||
        user.status === 'DELETED'
      )
        throw unauthorized('AUTH_ACCOUNT_UNAVAILABLE', 'Bu hesap artık kullanılamıyor.');
      if (user.status === 'SUSPENDED')
        throw forbidden('AUTH_ACCOUNT_SUSPENDED', 'Hesabınız geçici olarak askıya alınmış.');
      if (user.status !== 'ACTIVE' || !user.emailVerifiedAt)
        throw forbidden('AUTH_EMAIL_NOT_VERIFIED', 'Devam etmek için e-postanızı doğrulayın.');
      const session = sessions.find(
        (entry) => entry.id === principal.sessionId && entry.userId === user.id,
      );
      if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now())
        throw unauthorized(
          'AUTH_SESSION_REVOKED',
          'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.',
        );
      // Permission changes take effect immediately, not at the JWT expiry boundary.
      req.auth = { ...principal, role: user.role, email: user.email };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireRole(
  ...roles: Array<NonNullable<Express.Request['auth']>['role']>
): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) return next(unauthorized());
    if (!roles.includes(req.auth.role)) return next(forbidden());
    next();
  };
}
