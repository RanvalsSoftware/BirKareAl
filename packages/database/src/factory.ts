import { MemoryRepository } from './memory.repository.js';
import { connectPrismaRepository } from './prisma.repository.js';
import type { BirKareRepository } from './types.js';

type LogLike = { warn: (payload: unknown, message?: string) => void };
type RepositoryConfig = {
  DATABASE_PROVIDER: 'memory' | 'prisma';
  NODE_ENV: 'development' | 'test' | 'staging' | 'production';
  PASSWORD_PEPPER?: string;
};

export async function createRepository(
  config: RepositoryConfig,
  logger?: LogLike,
): Promise<BirKareRepository> {
  if (config.DATABASE_PROVIDER === 'memory') return new MemoryRepository(config.PASSWORD_PEPPER);

  try {
    return await connectPrismaRepository(config.PASSWORD_PEPPER);
  } catch (error) {
    if (config.NODE_ENV === 'production' || config.NODE_ENV === 'staging') throw error;
    logger?.warn(
      { err: error },
      'PostgreSQL kullanılamıyor; development memory repository etkinleştirildi.',
    );
    return new MemoryRepository(config.PASSWORD_PEPPER);
  }
}
