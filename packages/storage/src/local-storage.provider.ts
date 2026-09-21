import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { StorageObjectStat, StorageProvider, StorageUploadUrl } from './types.js';

function assertSafeStorageKey(key: string): string {
  if (!key || key.startsWith('/') || key.includes('\0')) {
    throw new Error('Geçersiz storage anahtarı.');
  }
  const segments = key.split('/');
  if (
    segments.some(
      (segment) => !segment || segment === '.' || segment === '..' || segment.includes('\\'),
    )
  ) {
    throw new Error('Geçersiz storage anahtarı.');
  }
  return key;
}

/** Private filesystem adapter for development and test. It never creates public URLs. */
export class LocalStorageProvider implements StorageProvider {
  readonly rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = resolve(rootPath);
  }

  private pathFor(key: string): string {
    const safeKey = assertSafeStorageKey(key);
    const path = resolve(this.rootPath, safeKey);
    if (!path.startsWith(`${this.rootPath}${sep}`)) {
      throw new Error('Storage path root dışına çıktı.');
    }
    return path;
  }

  async createUploadUrl(input: {
    key: string;
    contentType: string;
    expiresInSeconds: number;
  }): Promise<StorageUploadUrl> {
    assertSafeStorageKey(input.key);
    // The API converts this opaque URL to an authenticated local upload endpoint.
    return {
      url: `local-upload://${encodeURIComponent(input.key)}`,
      headers: { 'Content-Type': input.contentType },
    };
  }

  async createDownloadUrl(input: { key: string; expiresInSeconds: number }): Promise<string> {
    assertSafeStorageKey(input.key);
    return `local-download://${encodeURIComponent(input.key)}`;
  }

  async putObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
    metadata?: Record<string, string>;
  }): Promise<void> {
    const target = this.pathFor(input.key);
    await mkdir(dirname(target), { recursive: true });
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, input.body, { mode: 0o600 });
    await rename(temporary, target);
  }

  async getObject(key: string, options?: { maxBytes?: number }): Promise<Buffer> {
    const path = this.pathFor(key);
    if (options?.maxBytes !== undefined) {
      const details = await stat(path);
      if (details.size > options.maxBytes) {
        throw new Error('Storage nesnesi izin verilen boyutu aşıyor.');
      }
    }
    const bytes = await readFile(path);
    if (options?.maxBytes !== undefined && bytes.length > options.maxBytes) {
      throw new Error('Storage nesnesi izin verilen boyutu aşıyor.');
    }
    return bytes;
  }

  async statObject(key: string): Promise<StorageObjectStat> {
    const details = await stat(this.pathFor(key));
    return { sizeBytes: details.size };
  }

  async deleteObject(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await stat(this.pathFor(key));
      return true;
    } catch {
      return false;
    }
  }
}
