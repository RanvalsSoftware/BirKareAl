import type { Readable } from 'node:stream';

export type StorageUploadUrl = { url: string; headers?: Record<string, string> };
export type StorageObjectStat = { sizeBytes: number; contentType?: string };
export type StorageObjectBody = Buffer | Readable;

export interface StorageProvider {
  createUploadUrl(input: {
    key: string;
    contentType: string;
    expiresInSeconds: number;
  }): Promise<StorageUploadUrl>;
  createDownloadUrl(input: { key: string; expiresInSeconds: number }): Promise<string>;
  putObject(input: {
    key: string;
    body: StorageObjectBody;
    contentType: string;
    metadata?: Record<string, string>;
    maxBytes?: number;
  }): Promise<void>;
  getObject(key: string, options?: { maxBytes?: number }): Promise<Buffer>;
  statObject(key: string): Promise<StorageObjectStat>;
  deleteObject(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
