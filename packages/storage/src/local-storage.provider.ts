import { createWriteStream } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type {
  StorageObjectBody,
  StorageObjectStat,
  StorageProvider,
  StorageUploadUrl,
} from './types.js';

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
    body: StorageObjectBody;
    contentType: string;
    metadata?: Record<string, string>;
    maxBytes?: number;
  }): Promise<void> {
    const target = this.pathFor(input.key);
    await mkdir(dirname(target), { recursive: true });
    const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
    try {
      if (Buffer.isBuffer(input.body)) {
        if (input.maxBytes !== undefined && input.body.length > input.maxBytes) {
          throw new Error('Storage nesnesi izin verilen boyutu aşıyor.');
        }
        await writeFile(temporary, input.body, { mode: 0o600, flag: 'wx' });
      } else {
        let received = 0;
        const byteLimit = new Transform({
          transform(chunk: Buffer | string, _encoding, callback) {
            const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            received += bytes.length;
            if (input.maxBytes !== undefined && received > input.maxBytes) {
              callback(new Error('Storage nesnesi izin verilen boyutu aşıyor.'));
              return;
            }
            callback(null, bytes);
          },
        });
        await pipeline(
          input.body,
          byteLimit,
          createWriteStream(temporary, { mode: 0o600, flags: 'wx' }),
        );
      }
      await rename(temporary, target);
    } catch (error) {
      await rm(temporary, { force: true }).catch(() => undefined);
      throw error;
    }
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
