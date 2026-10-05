import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { GcsStorageProvider, LocalStorageProvider } from '../../storage/src/index.js';

const mode = process.argv[2];
assert(mode === '--dry-run' || mode === '--apply', 'Use --dry-run or --apply.');
assert(process.env.DATABASE_URL, 'DATABASE_URL is required.');
assert(process.env.GCS_BUCKET, 'GCS_BUCKET is required.');

const prisma = new PrismaClient();
const local = new LocalStorageProvider(process.env.LOCAL_STORAGE_PATH ?? '/srv/app/.local-storage');
const gcs = new GcsStorageProvider({
  GCS_BUCKET: process.env.GCS_BUCKET,
});

const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

try {
  const assets = await prisma.asset.findMany({
    where: { storageProvider: 'local', status: { notIn: ['REJECTED', 'DELETED'] } },
    select: {
      id: true,
      status: true,
      storageKey: true,
      mimeType: true,
      sizeBytes: true,
      sha256: true,
    },
    orderBy: { id: 'asc' },
  });
  let migrated = 0;
  const failures: string[] = [];

  for (const asset of assets) {
    try {
      const hasLocal = await local.exists(asset.storageKey);
      let verifiedDigest: string | null = null;
      if (hasLocal) {
        const source = await local.getObject(asset.storageKey);
        verifiedDigest = digest(source);
        if (source.length !== Number(asset.sizeBytes)) {
          throw new Error('local file size does not match database');
        }
        if (asset.sha256 && verifiedDigest !== asset.sha256.toLowerCase()) {
          throw new Error('local file digest does not match database');
        }

        if (await gcs.exists(asset.storageKey)) {
          const existing = await gcs.getObject(asset.storageKey);
          if (digest(existing) !== verifiedDigest) throw new Error('GCS already has different content');
        } else if (mode === '--apply') {
          await gcs.putObject({ key: asset.storageKey, body: source, contentType: asset.mimeType });
          const uploaded = await gcs.getObject(asset.storageKey);
          if (digest(uploaded) !== verifiedDigest) {
            throw new Error('GCS verification failed after upload');
          }
        }
      } else if (await gcs.exists(asset.storageKey)) {
        const existing = await gcs.getObject(asset.storageKey);
        verifiedDigest = digest(existing);
        if (existing.length !== Number(asset.sizeBytes)) {
          throw new Error('GCS object size does not match database');
        }
        if (asset.sha256 && verifiedDigest !== asset.sha256.toLowerCase()) {
          throw new Error('GCS object digest does not match database');
        }
      } else if (!['PENDING_UPLOAD', 'DELETION_PENDING'].includes(asset.status)) {
        throw new Error('asset bytes are missing from both local storage and GCS');
      }

      if (mode === '--apply') {
        await prisma.asset.update({
          where: { id: asset.id },
          data: { storageProvider: 'gcs', sha256: asset.sha256 ?? verifiedDigest },
        });
      }
      migrated += 1;
    } catch (error) {
      failures.push(`${asset.id}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  console.log(`Mode: ${mode}; local assets checked: ${assets.length}; ${mode === '--apply' ? 'migrated' : 'ready'}: ${migrated}; failed: ${failures.length}.`);
  for (const failure of failures) console.error(failure);
  if (failures.length) process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
