import type { BirKareConfig } from '@birkare/config';
import { GcsStorageProvider } from './gcs-storage.provider.js';
import { LocalStorageProvider } from './local-storage.provider.js';
import type { StorageProvider } from './types.js';

export function createStorageProvider(config: BirKareConfig): StorageProvider {
  if (config.STORAGE_DRIVER === 'gcs') return new GcsStorageProvider(config);
  return new LocalStorageProvider(config.LOCAL_STORAGE_PATH);
}

export * from './gcs-storage.provider.js';
export * from './local-storage.provider.js';
export * from './types.js';
