import type { BirKareConfig } from '@birkare/config';
import { LocalStorageProvider } from './local-storage.provider.js';
import { R2StorageProvider } from './r2-storage.provider.js';
import type { StorageProvider } from './types.js';

export function createStorageProvider(config: BirKareConfig): StorageProvider {
  if (config.STORAGE_DRIVER === 'r2') return new R2StorageProvider(config);
  return new LocalStorageProvider(config.LOCAL_STORAGE_PATH);
}

export * from './local-storage.provider.js';
export * from './r2-storage.provider.js';
export * from './types.js';
