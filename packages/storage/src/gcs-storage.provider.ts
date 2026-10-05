import { Storage } from '@google-cloud/storage';
import { createWriteStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { BirKareConfig } from '@birkare/config';
import type {
  StorageObjectBody,
  StorageObjectStat,
  StorageProvider,
  StorageUploadUrl,
} from './types.js';

async function streamToBuffer(
  stream: NodeJS.ReadableStream,
  maxBytes = Number.MAX_SAFE_INTEGER,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of stream) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += bytes.length;
    if (totalBytes > maxBytes) {
      if ('destroy' in stream && typeof stream.destroy === 'function') stream.destroy();
      throw new Error('Storage nesnesi izin verilen boyutu aşıyor.');
    }
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}

/** Private Google Cloud Storage adapter using Application Default Credentials. */
export class GcsStorageProvider implements StorageProvider {
  private readonly client: Storage;
  private readonly bucketName: string;

  constructor(config: Pick<BirKareConfig, 'GCS_BUCKET'>) {
    if (!config.GCS_BUCKET) throw new Error('GCS_BUCKET yapılandırması eksik.');
    this.client = new Storage();
    this.bucketName = config.GCS_BUCKET;
  }

  private file(key: string) {
    return this.client.bucket(this.bucketName).file(key);
  }

  async createUploadUrl(input: {
    key: string;
    contentType: string;
    expiresInSeconds: number;
  }): Promise<StorageUploadUrl> {
    const [url] = await this.file(input.key).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + input.expiresInSeconds * 1000,
      contentType: input.contentType,
    });
    return { url, headers: { 'Content-Type': input.contentType } };
  }

  async createDownloadUrl(input: { key: string; expiresInSeconds: number }): Promise<string> {
    const [url] = await this.file(input.key).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + input.expiresInSeconds * 1000,
    });
    return url;
  }

  async putObject(input: {
    key: string;
    body: StorageObjectBody;
    contentType: string;
    metadata?: Record<string, string>;
    maxBytes?: number;
  }): Promise<void> {
    const body = input.body;
    const byteLength = Buffer.isBuffer(body) ? body.length : undefined;
    if (byteLength !== undefined && input.maxBytes !== undefined && byteLength > input.maxBytes) {
      throw new Error('Storage nesnesi izin verilen boyutu aşıyor.');
    }

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
      Buffer.isBuffer(body) ? Readable.from([body]) : body,
      byteLimit,
      this.file(input.key).createWriteStream({
        // Resumable uploads improve reliability for streams and larger objects.
        resumable: byteLength === undefined || byteLength > 5 * 1024 * 1024,
        validation: 'crc32c',
        metadata: {
          contentType: input.contentType,
          ...(input.metadata ? { metadata: input.metadata } : {}),
        },
      }),
    );
  }

  async getObject(key: string, options?: { maxBytes?: number }): Promise<Buffer> {
    return streamToBuffer(this.file(key).createReadStream(), options?.maxBytes);
  }

  async statObject(key: string): Promise<StorageObjectStat> {
    const [metadata] = await this.file(key).getMetadata();
    return {
      sizeBytes: Number(metadata.size ?? 0),
      ...(metadata.contentType ? { contentType: metadata.contentType } : {}),
    };
  }

  async deleteObject(key: string): Promise<void> {
    await this.file(key).delete({ ignoreNotFound: true });
  }

  async exists(key: string): Promise<boolean> {
    const [exists] = await this.file(key).exists();
    return exists;
  }
}
