import type { AuthenticatedPrincipal } from '../services/token.service.js';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: AuthenticatedPrincipal;
    }
  }
}

export {};
