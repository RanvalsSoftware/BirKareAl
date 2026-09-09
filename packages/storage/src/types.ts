export type StorageUploadUrl = { url: string; headers?: Record<string, string> };

export interface StorageProvider {
  createUploadUrl(input: {
    key: string;
    contentType: string;
    expiresInSeconds: number;
  }): Promise<StorageUploadUrl>;
  createDownloadUrl(input: { key: string; expiresInSeconds: number }): Promise<string>;
  putObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
    metadata?: Record<string, string>;
  }): Promise<void>;
  getObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
