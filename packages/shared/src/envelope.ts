export type ResponseMeta = { requestId: string; timestamp: string };

export type SuccessEnvelope<T> = {
  success: true;
  data: T;
  meta: ResponseMeta;
};

export type ErrorEnvelope = {
  success: false;
  error: { code: string; message: string; details?: Record<string, unknown> };
  meta: Pick<ResponseMeta, 'requestId'>;
};

export const successEnvelope = <T>(data: T, requestId: string): SuccessEnvelope<T> => ({
  success: true,
  data,
  meta: { requestId, timestamp: nowIso() },
});

export const errorEnvelope = (error: ErrorEnvelope['error'], requestId: string): ErrorEnvelope => ({
  success: false,
  error,
  meta: { requestId },
});

const nowIso = (): string => new Date().toISOString();
