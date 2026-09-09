import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { badRequest } from '@birkare/shared';

export type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodTypeAny, target: ValidationTarget = 'body'): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req[target]);
    if (!parsed.success) {
      return next(
        badRequest('VALIDATION_ERROR', 'Gönderilen bilgiler geçerli değil.', {
          fields: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        }),
      );
    }
    req[target] = parsed.data;
    next();
  };
}
