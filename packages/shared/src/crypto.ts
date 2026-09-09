import { createHash, randomBytes, randomUUID } from 'node:crypto';

export const createId = (): string => randomUUID();

export const createOpaqueToken = (bytes = 48): string => randomBytes(bytes).toString('base64url');

export const hashToken = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');

export const hashStable = (value: string): string => hashToken(value);

export const nowIso = (): string => new Date().toISOString();
