import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

const SAFE_REQUEST_ID = /^[A-Za-z0-9_-]{8,128}$/;

export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const supplied = req.header('x-request-id');
  req.requestId = supplied && SAFE_REQUEST_ID.test(supplied) ? supplied : `req_${randomUUID()}`;
  res.setHeader('x-request-id', req.requestId);
  next();
};
