import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ApiError, errorEnvelope } from '@birkare/shared';
import type { Logger } from '@birkare/logger';

export const notFoundMiddleware: RequestHandler = (req, res) => {
  res
    .status(404)
    .json(
      errorEnvelope(
        { code: 'ROUTE_NOT_FOUND', message: 'İstenen API yolu bulunamadı.' },
        req.requestId ?? 'unknown',
      ),
    );
};

/**
 * Operators need the underlying failure (e.g. a GCS IAM denial) to diagnose a 500.
 * Query strings are dropped so signed URLs or tokens never reach the logs.
 */
function summarizeCause(error: unknown) {
  if (!(error instanceof Error)) return { type: typeof error };
  const status = (error as { code?: unknown }).code;
  return {
    name: error.name,
    message: error.message.replace(/\?\S*/g, '?[REDACTED]').slice(0, 500),
    ...(typeof status === 'string' || typeof status === 'number' ? { status } : {}),
  };
}

export function createErrorMiddleware(logger: Logger, isProduction: boolean): ErrorRequestHandler {
  return (error, req, res, _next) => {
    const apiError =
      error instanceof ApiError
        ? error
        : (error as { type?: string })?.type === 'entity.parse.failed'
          ? new ApiError({
              statusCode: 400,
              code: 'INVALID_JSON',
              message: 'İstek gövdesi geçerli JSON olmalıdır.',
            })
          : (error as { type?: string })?.type === 'entity.too.large'
            ? new ApiError({
                statusCode: 413,
                code: 'REQUEST_TOO_LARGE',
                message: 'İstek gövdesi izin verilen boyutu aşıyor.',
              })
            : new ApiError({
                statusCode: 500,
                code: 'INTERNAL_ERROR',
                message: 'Beklenmeyen bir hata oluştu.',
                expose: false,
              });
    if (apiError.statusCode >= 500) {
      logger.error(
        {
          code: apiError.code,
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          ...(error instanceof ApiError ? {} : { cause: summarizeCause(error) }),
        },
        'API request başarısız oldu.',
      );
    } else {
      logger.warn(
        { code: apiError.code, requestId: req.requestId, method: req.method, path: req.path },
        'API request reddedildi.',
      );
    }
    const message =
      !apiError.expose && isProduction ? 'Beklenmeyen bir hata oluştu.' : apiError.message;
    res.status(apiError.statusCode).json(
      errorEnvelope(
        {
          code: apiError.code,
          message,
          ...(apiError.details ? { details: apiError.details } : {}),
        },
        req.requestId ?? 'unknown',
      ),
    );
  };
}
