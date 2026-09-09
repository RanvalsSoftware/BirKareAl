import type { RequestHandler, Response } from 'express';
import { successEnvelope } from '@birkare/shared';

export const asyncHandler =
  (handler: RequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

export const sendSuccess = <T>(res: Response, requestId: string, data: T, status = 200): void => {
  res.status(status).json(successEnvelope(data, requestId));
};

export const getRequestContext = (req: {
  header: (name: string) => string | undefined;
  ip?: string;
}): { ip?: string; userAgent?: string } => ({
  ip: req.ip,
  userAgent: req.header('user-agent'),
});
