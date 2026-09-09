import type { BirKareRepository } from '@birkare/database';
import type { StorageProvider } from '@birkare/storage';
import { badRequest, forbidden, notFound } from '@birkare/shared';
import type { GoogleIdentityVerifier } from '../auth/google-id-token.service.js';
import type { PasswordService } from '../../services/password.service.js';

export class AccountDeletionService {
  constructor(
    private readonly repository: BirKareRepository,
    private readonly storage: StorageProvider,
    private readonly passwordService: Pick<PasswordService, 'verify'>,
    private readonly google: GoogleIdentityVerifier,
  ) {}

  async preview(userId: string) {
    const user = await this.repository.getUserById(userId);
    if (!user) throw notFound('USER_NOT_FOUND', 'Kullanıcı bulunamadı.');
    const providers = await this.repository.listAuthProviders(userId);
    return {
      canVerifyPassword: Boolean(user.passwordHash),
      canVerifyGoogle: providers.includes('GOOGLE'),
      cleanupDelayMinutes: 10,
    };
  }

  async request(
    userId: string,
    input: { confirmation: string; password?: string; googleIdToken?: string },
  ) {
    if (
      input.confirmation !== 'HESABIMI SIL' ||
      Boolean(input.password) === Boolean(input.googleIdToken)
    )
      throw badRequest(
        'DELETION_CONFIRMATION_REQUIRED',
        'Silme onayı ve yeniden kimlik doğrulaması gereklidir.',
      );
    const user = await this.repository.getUserById(userId);
    if (!user || user.status !== 'ACTIVE')
      throw forbidden('ACCOUNT_UNAVAILABLE', 'Hesap bu işlem için kullanılamıyor.');
    if (input.password) {
      if (
        !user.passwordHash ||
        !(await this.passwordService.verify(user.passwordHash, input.password))
      )
        throw forbidden('DELETION_REAUTH_FAILED', 'Şifren doğrulanamadı.');
    } else {
      const identity = await this.google.verify(input.googleIdToken!);
      const linked = await this.repository.getUserByAuthAccount('GOOGLE', identity.subject);
      if (linked?.id !== userId)
        throw forbidden(
          'DELETION_REAUTH_FAILED',
          'Hesabına bağlı Google kimliğiyle yeniden doğrula.',
        );
      if (
        !identity.issuedAt ||
        identity.issuedAt < Math.floor(Date.now() / 1000) - 300 ||
        identity.issuedAt > Math.floor(Date.now() / 1000) + 5
      )
        throw forbidden(
          'DELETION_REAUTH_STALE',
          'Güncel bir Google doğrulaması gerekli. Google oturumunu yeniden açıp tekrar dene.',
        );
    }
    const record = await this.repository.requestAccountDeletion(
      userId,
      input.password ? { expectedPasswordHash: user.passwordHash! } : undefined,
    );
    return {
      deletionRequested: true,
      cleanupNotBefore: record.notBefore.toISOString(),
      reversible: false,
    };
  }

  /** Persisted jobs survive API restarts. Keep the manifest until every object and DB row is removed. */
  async cleanup(now = new Date()) {
    const requests = await this.repository.listPendingAccountDeletions(now, 20);
    let completed = 0;
    let failed = 0;
    for (const request of requests) {
      try {
        for (const key of request.storageKeys) await this.storage.deleteObject(key);
        await this.repository.completeAccountDeletion(request.userId);
        completed++;
      } catch {
        failed++; /* Retry next sweep; never falsely mark a partial deletion complete. */
      }
    }
    return { completed, failed };
  }
}
