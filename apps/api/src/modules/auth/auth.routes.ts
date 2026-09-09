import { Router } from 'express';
import {
  ForgotPasswordSchema,
  LoginSchema,
  LogoutSchema,
  RefreshSchema,
  RegisterSchema,
  ResetPasswordSchema,
  SessionParamsSchema,
  SocialLoginSchema,
  SocialProfileCompletionSchema,
  VerifyEmailSchema,
} from '@birkare/contracts';
import { notFound } from '@birkare/shared';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { authRateLimit } from '../../middleware/rate-limit.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import type { ApiDependencies } from '../../services/dependencies.js';
import { asyncHandler, getRequestContext, sendSuccess } from '../../services/http.js';

export function createAuthRouter(deps: ApiDependencies): Router {
  const router = Router();

  router.post(
    '/register',
    authRateLimit,
    validate(RegisterSchema),
    asyncHandler(async (req, res) => {
      const data = await deps.authService.register(req.body, getRequestContext(req));
      sendSuccess(res, req.requestId, data, 201);
    }),
  );

  router.post(
    '/login',
    authRateLimit,
    validate(LoginSchema),
    asyncHandler(async (req, res) => {
      const data = await deps.authService.login(req.body, getRequestContext(req));
      sendSuccess(res, req.requestId, data);
    }),
  );

  router.post(
    '/refresh',
    authRateLimit,
    validate(RefreshSchema),
    asyncHandler(async (req, res) => {
      const data = await deps.authService.refresh(req.body, getRequestContext(req));
      sendSuccess(res, req.requestId, data);
    }),
  );

  router.post(
    '/logout',
    validate(LogoutSchema),
    asyncHandler(async (req, res) => {
      await deps.authService.logout(req.body.refreshToken);
      sendSuccess(res, req.requestId, { loggedOut: true });
    }),
  );

  router.post(
    '/logout-all',
    requireAuth(deps.tokenService, deps.repository),
    asyncHandler(async (req, res) => {
      await deps.authService.logoutAll(req.auth!.userId);
      sendSuccess(res, req.requestId, { loggedOut: true });
    }),
  );

  router.post(
    '/forgot-password',
    authRateLimit,
    validate(ForgotPasswordSchema),
    asyncHandler(async (req, res) => {
      const result = await deps.authService.forgotPassword(req.body.email);
      // Request acceptance is not a delivery claim; remain identical for known,
      // unknown and undeliverable addresses to avoid account enumeration.
      sendSuccess(res, req.requestId, { accepted: true, delivery: 'unconfirmed', ...result });
    }),
  );

  router.post(
    '/reset-password',
    authRateLimit,
    validate(ResetPasswordSchema),
    asyncHandler(async (req, res) => {
      await deps.authService.resetPassword(req.body.token, req.body.password);
      sendSuccess(res, req.requestId, { passwordReset: true });
    }),
  );

  router.post(
    '/verify-email',
    authRateLimit,
    validate(VerifyEmailSchema),
    asyncHandler(async (req, res) => {
      await deps.authService.verifyEmail(req.body.token);
      sendSuccess(res, req.requestId, { verified: true });
    }),
  );

  router.post(
    '/resend-verification',
    authRateLimit,
    validate(ForgotPasswordSchema),
    asyncHandler(async (req, res) => {
      const result = await deps.authService.resendVerification(req.body.email);
      sendSuccess(res, req.requestId, { accepted: true, delivery: 'unconfirmed', ...result });
    }),
  );

  router.post(
    '/google',
    authRateLimit,
    validate(SocialLoginSchema),
    asyncHandler(async (req, res) => {
      const data = await deps.authService.googleLogin(req.body, getRequestContext(req));
      sendSuccess(res, req.requestId, data);
    }),
  );

  router.post(
    '/google/link',
    authRateLimit,
    requireAuth(deps.tokenService, deps.repository),
    validate(SocialLoginSchema),
    asyncHandler(async (req, res) => {
      const data = await deps.authService.linkGoogle(req.auth!.userId, req.body);
      sendSuccess(res, req.requestId, data);
    }),
  );

  router.post(
    '/social/complete',
    authRateLimit,
    validate(SocialProfileCompletionSchema),
    asyncHandler(async (req, res) => {
      const data = await deps.authService.completeSocialRegistration(
        req.body,
        getRequestContext(req),
      );
      sendSuccess(res, req.requestId, data);
    }),
  );

  router.post(
    '/apple',
    authRateLimit,
    validate(SocialLoginSchema),
    asyncHandler(async (_req, _res) => {
      await deps.authService.socialLogin();
    }),
  );

  router.get(
    '/sessions',
    requireAuth(deps.tokenService, deps.repository),
    asyncHandler(async (req, res) => {
      const sessions = await deps.repository.listSessions(req.auth!.userId);
      sendSuccess(res, req.requestId, {
        items: sessions.map((session) => ({
          id: session.id,
          deviceId: session.deviceId,
          deviceName: session.deviceName,
          platform: session.platform,
          appVersion: session.appVersion,
          lastUsedAt: session.lastUsedAt,
          expiresAt: session.expiresAt,
          revokedAt: session.revokedAt,
          current: session.id === req.auth!.sessionId,
        })),
      });
    }),
  );

  router.delete(
    '/sessions/:sessionId',
    requireAuth(deps.tokenService, deps.repository),
    validate(SessionParamsSchema, 'params'),
    asyncHandler(async (req, res) => {
      const sessions = await deps.repository.listSessions(req.auth!.userId);
      const sessionId = req.params.sessionId as string;
      if (!sessions.some((session) => session.id === sessionId))
        throw notFound('SESSION_NOT_FOUND', 'Oturum bulunamadı.');
      await deps.repository.revokeSession(sessionId, 'USER_REVOKED');
      sendSuccess(res, req.requestId, { revoked: true });
    }),
  );

  return router;
}
