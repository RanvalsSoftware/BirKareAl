import { createServer } from 'node:http';
import { createApp } from './app.js';
import { createApiDependencies } from './services/dependencies.js';
import { AccountDeletionService } from './modules/users/account-deletion.service.js';
import { GoogleIdTokenService } from './modules/auth/google-id-token.service.js';
import { AppleIdTokenService } from './modules/auth/apple-id-token.service.js';

async function main(): Promise<void> {
  const deps = await createApiDependencies();
  const app = createApp(deps);
  const server = createServer(app);
  let shuttingDown = false;
  const deletion = new AccountDeletionService(
    deps.repository,
    deps.storage,
    deps.passwordService,
    new GoogleIdTokenService(deps.config),
    new AppleIdTokenService(deps.config),
  );
  let deletionSweepRunning = false;
  const sweepAccountDeletions = async () => {
    if (deletionSweepRunning || shuttingDown) return;
    deletionSweepRunning = true;
    try {
      const counts = await deletion.cleanup();
      if (counts.completed || counts.failed)
        deps.logger.info(counts, 'Hesap verisi temizliği işlendi.');
    } catch {
      deps.logger.warn({}, 'Hesap temizliği sonraki turda tekrar denenecek.');
    } finally {
      deletionSweepRunning = false;
    }
  };
  // Do not block HTTP startup on object storage; jobs persist across restarts.
  void sweepAccountDeletions();
  const deletionCleanupTimer = setInterval(() => {
    void sweepAccountDeletions();
  }, 60_000);
  deletionCleanupTimer.unref();

  // Pending social-registration records contain only verified profile claims
  // and a hash of the opaque handoff token. They are short-lived; prune them
  // at startup and in bounded batches so abandoned/consumed records do not
  // become an indefinite PII store.
  const purgePendingSocialLogins = async () => {
    try {
      const deleted = await deps.repository.purgePendingSocialLogins({
        before: new Date(),
        limit: 500,
      });
      if (deleted > 0) deps.logger.info({ deleted }, 'Süresi geçmiş sosyal kayıtlar temizlendi.');
    } catch (error) {
      deps.logger.warn({ err: error }, 'Sosyal kayıt temizliği tamamlanamadı.');
    }
  };
  await purgePendingSocialLogins();
  const socialLoginCleanupTimer = setInterval(
    () => {
      void purgePendingSocialLogins();
    },
    15 * 60 * 1000,
  );
  socialLoginCleanupTimer.unref();

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    deps.logger.info({ signal }, 'API güvenli şekilde kapatılıyor.');
    clearInterval(socialLoginCleanupTimer);
    clearInterval(deletionCleanupTimer);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await deps.generationQueue.close();
    await deps.emailSecurityService.close();
    await deps.repository.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  server.listen(deps.config.API_PORT, deps.config.API_HOST, () => {
    deps.logger.info(
      {
        host: deps.config.API_HOST,
        port: deps.config.API_PORT,
        repository: deps.repository.kind,
        queue: deps.config.QUEUE_DRIVER,
      },
      'BirKare AI API hazır.',
    );
  });
}

main().catch((error: unknown) => {
  const detail = error instanceof Error ? error.message : 'Bilinmeyen başlangıç hatası.';
  const safeDetail = detail
    .replace(/(postgres(?:ql)?:\/\/)[^\s]+/gi, '$1<redacted>')
    .replace(/(redis:\/\/)[^\s]+/gi, '$1<redacted>')
    .replace(/(Bearer\s+)[^\s]+/gi, '$1<redacted>');
  console.error(`BirKare AI API başlatılamadı: ${safeDetail}`);
  process.exit(1);
});
