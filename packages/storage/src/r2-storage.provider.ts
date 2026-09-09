import { Client } from 'minio';
import type { BirKareConfig } from '@birkare/config';
import type { StorageProvider, StorageUploadUrl } from './types.js';

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream)
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

/**
 * Cloudflare R2 uses an S3-compatible protocol, but this adapter uses the MinIO
 * client and does not require an AWS account, bucket, or SDK.
 */
export class R2StorageProvider implements StorageProvider {
  private readonly client: Client;
  private readonly bucket: string;

  constructor(
    config: Pick<
      BirKareConfig,
      'R2_ENDPOINT' | 'R2_BUCKET' | 'R2_ACCESS_KEY_ID' | 'R2_SECRET_ACCESS_KEY'
    >,
  ) {
    if (
      !config.R2_ENDPOINT ||
      !config.R2_BUCKET ||
      !config.R2_ACCESS_KEY_ID ||
      !config.R2_SECRET_ACCESS_KEY
    ) {
      throw new Error('R2 storage yapılandırması eksik.');
    }
    const endpoint = new URL(config.R2_ENDPOINT);
    this.client = new Client({
      endPoint: endpoint.hostname,
      port: endpoint.port ? Number(endpoint.port) : endpoint.protocol === 'https:' ? 443 : 80,
      useSSL: endpoint.protocol === 'https:',
      accessKey: config.R2_ACCESS_KEY_ID,
      secretKey: config.R2_SECRET_ACCESS_KEY,
      region: 'auto',
    });
    this.bucket = config.R2_BUCKET;
  }

  async createUploadUrl(input: {
    key: string;
    contentType: string;
    expiresInSeconds: number;
  }): Promise<StorageUploadUrl> {
    const url = await this.client.presignedPutObject(
      this.bucket,
      input.key,
      input.expiresInSeconds,
    );
    return { url, headers: { 'Content-Type': input.contentType } };
  }

  async createDownloadUrl(input: { key: string; expiresInSeconds: number }): Promise<string> {
    return this.client.presignedGetObject(this.bucket, input.key, input.expiresInSeconds);
  }

  async putObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
    metadata?: Record<string, string>;
  }): Promise<void> {
    await this.client.putObject(this.bucket, input.key, input.body, input.body.length, {
      'Content-Type': input.contentType,
      ...input.metadata,
    });
  }

  async getObject(key: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, key);
    return streamToBuffer(stream);
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucket, key);
      return true;
    } catch {
      return false;
    }
  }
}
