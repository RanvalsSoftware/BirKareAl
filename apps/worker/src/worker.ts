import {
  createImageGenerationProvider,
  createModerationProvider,
  runGeneration,
} from '@birkare/ai';
import { getConfig } from '@birkare/config';
import { createRepository } from '@birkare/database';
import { createLogger } from '@birkare/logger';
import { createStorageProvider } from '@birkare/storage';

type WorkerLike = {
  close: () => Promise<void>;
  on: (event: string, callback: (...args: any[]) => void) => void;
};

async function main(): Promise<void> {
  const config = getConfig();
  const logger = createLogger({ ...config, APP_NAME: `${config.APP_NAME} Worker` });
  const repository = await createRepository(config, logger);
  const storage = createStorageProvider(config);

  if (config.QUEUE_DRIVER === 'memory') {
    logger.warn(
      'QUEUE_DRIVER=memory: API development inline worker işleyecek; ayrı worker kuyruğu dinlemiyor.',
    );
    return;
  }

  const bullmqModuleName = 'bullmq';
  const ioredisModuleName = 'ioredis';
  const [{ Worker }, redisImport] = await Promise.all([
    import(bullmqModuleName) as Promise<any>,
    import(ioredisModuleName) as Promise<any>,
  ]);
  const Redis = redisImport.default ?? redisImport;
  const connection = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  const imageProvider = createImageGenerationProvider(config);
  const moderationProvider = createModerationProvider(config);
  let stopping = false;

  const worker: WorkerLike = new Worker(
    'generation-render',
    async (job: { data: { generationId: string; requestId: string } }) => {
      await runGeneration(job.data, {
        repository,
        storage,
        imageProvider,
        moderationProvider,
        config,
        logger,
      });
    },
    {
      connection,
      concurrency: config.GENERATION_WORKER_CONCURRENCY,
      limiter: { max: config.OPENAI_MAX_JOBS_PER_WINDOW, duration: config.OPENAI_RATE_WINDOW_MS },
    },
  );
  worker.on('completed', (job: { id?: string }) =>
    logger.info({ jobId: job.id }, 'Generation job tamamlandı.'),
  );
  worker.on('failed', (job: { id?: string }) =>
    logger.error({ jobId: job?.id }, 'Generation job başarısız.'),
  );
  logger.info(
    { concurrency: config.GENERATION_WORKER_CONCURRENCY },
    'BirKare AI BullMQ worker hazır.',
  );

  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    logger.info({ signal }, 'Worker güvenli şekilde kapatılıyor.');
    await worker.close();
    await connection.quit();
    await repository.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch(() => {
  // Do not log config values, provider errors or secrets.
  console.error('BirKare AI worker başlatılamadı.');
  process.exit(1);
});
