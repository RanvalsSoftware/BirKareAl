import {
  createImageGenerationProvider,
  createModerationProvider,
  runGeneration,
} from '@birkare/ai';
import type { BirKareConfig } from '@birkare/config';
import type { BirKareRepository } from '@birkare/database';
import type { Logger } from '@birkare/logger';
import type { StorageProvider } from '@birkare/storage';

export type GenerationJobPayload = {
  generationId: string;
  userId: string;
  requestId: string;
  attempt: number;
};

export interface GenerationQueue {
  enqueue(payload: GenerationJobPayload): Promise<void>;
  ready(): Promise<boolean>;
  close(): Promise<void>;
}

export async function createGenerationQueue(input: {
  config: BirKareConfig;
  repository: BirKareRepository;
  storage: StorageProvider;
  logger: Logger;
}): Promise<GenerationQueue> {
  const { config, repository, storage, logger } = input;
  if (config.QUEUE_DRIVER === 'memory') {
    const imageProvider = createImageGenerationProvider(config);
    const moderationProvider = createModerationProvider(config);
    return {
      async enqueue(payload) {
        if (!config.ENABLE_INLINE_WORKER) {
          logger.info(
            { generationId: payload.generationId },
            'Memory queue job kaydedildi; inline worker devre dışı.',
          );
          return;
        }
        const timer = setTimeout(() => {
          void runGeneration(payload, {
            repository,
            storage,
            imageProvider,
            moderationProvider,
            config,
            logger,
          }).catch(() => {
            logger.error(
              { generationId: payload.generationId, requestId: payload.requestId },
              'Inline generation sonuçlandırılamadı; yeniden üretim başlatılmadı.',
            );
          });
        }, 20);
        timer.unref();
      },
      async ready() {
        return true;
      },
      async close() {},
    };
  }

  const bullmqModuleName = 'bullmq';
  const ioredisModuleName = 'ioredis';
  const [{ Queue }, redisImport] = await Promise.all([
    import(bullmqModuleName) as Promise<any>,
    import(ioredisModuleName) as Promise<any>,
  ]);
  const Redis = redisImport.default ?? redisImport;
  const connection = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  const queue = new Queue('generation-render', { connection });
  return {
    async enqueue(payload) {
      await queue.add('render', payload, {
        jobId: `generation-${payload.generationId}-render-v1`,
        attempts: 4,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 1_000,
        removeOnFail: 5_000,
      });
    },
    async ready() {
      try {
        return (await connection.ping()) === 'PONG';
      } catch {
        return false;
      }
    },
    async close() {
      await queue.close();
      await connection.quit();
    },
  };
}
