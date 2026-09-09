import { createRequire } from 'node:module';

// Bounded, read-only dependency probe; never log connection strings or SDK errors.
const workerRequire = createRequire(new URL('../../apps/worker/package.json', import.meta.url));
const databaseRequire = createRequire(
  new URL('../../packages/database/package.json', import.meta.url),
);
const Redis = workerRequire('ioredis');
const { PrismaClient } = databaseRequire('@prisma/client');
const deadline = setTimeout(() => process.exit(1), 8000);
const redis = new Redis(process.env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 0,
  retryStrategy: () => null,
  connectTimeout: 3000,
});
redis.on('error', () => {});
const database = new PrismaClient({ log: [] });
try {
  if (!process.env.REDIS_URL || !process.env.DATABASE_URL) throw new Error('Missing configuration');
  await redis.connect();
  await Promise.all([redis.ping(), database.$queryRaw`SELECT 1`]);
  process.exitCode = 0;
} catch {
  process.exitCode = 1;
} finally {
  redis.disconnect();
  await database.$disconnect();
  clearTimeout(deadline);
}
