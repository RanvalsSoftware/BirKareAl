import { raw, Router } from 'express';
import { AssetParamsSchema, UploadInitiateSchema } from '@birkare/contracts';
import { createId, forbidden, notFound } from '@birkare/shared';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import type { ApiDependencies } from '../../services/dependencies.js';
import { asyncHandler, sendSuccess } from '../../services/http.js';

const extensionForMime = (mimeType: string): string =>
  ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[mimeType] ?? 'bin';

const hasExpectedMagicBytes = (bytes: Buffer, mimeType: string): boolean => {
  if (mimeType === 'image/jpeg')
    return bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mimeType === 'image/png')
    return bytes
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === 'image/webp')
    return (
      bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
      bytes.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  return false;
};

async function ownedAsset(deps: ApiDependencies, userId: string, assetId: string) {
  const asset = await deps.repository.getAssetById(assetId);
  if (!asset) throw notFound('ASSET_NOT_FOUND', 'Görsel bulunamadı.');
  if (asset.ownerId !== userId)
    throw forbidden('ASSET_NOT_OWNED', 'Bu görsele erişim yetkiniz yok.');
  return asset;
}

export function createAssetsRouter(deps: ApiDependencies): Router {
  const router = Router();
  router.use(requireAuth(deps.tokenService, deps.repository));

  router.post(
    '/uploads/initiate',
    validate(UploadInitiateSchema),
    asyncHandler(async (req, res) => {
      const assetId = createId();
      const extension = extensionForMime(req.body.mimeType);
      const category = req.body.purpose === 'AVATAR' ? 'avatars' : 'sources';
      const storageKey = `users/${req.auth!.userId}/${category}/${assetId}/original.${extension}`;
      const asset = await deps.repository.createAsset({
        id: assetId,
        ownerId: req.auth!.userId,
        type: req.body.purpose,
        storageProvider: deps.config.STORAGE_DRIVER,
        storageKey,
        originalName: req.body.fileName,
        mimeType: req.body.mimeType,
        sizeBytes: req.body.sizeBytes,
        sha256: req.body.sha256 ?? null,
      });
      const signed = await deps.storage.createUploadUrl({
        key: storageKey,
        contentType: asset.mimeType,
        expiresInSeconds: 300,
      });
      const isLocal = asset.storageProvider === 'local';
      sendSuccess(
        res,
        req.requestId,
        {
          assetId: asset.id,
          uploadUrl: isLocal ? `/v1/uploads/${asset.id}/content` : signed.url,
          method: 'PUT',
          headers: signed.headers ?? { 'Content-Type': asset.mimeType },
          expiresIn: 300,
        },
        201,
      );
    }),
  );

  router.put(
    '/uploads/:assetId/content',
    validate(AssetParamsSchema, 'params'),
    raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '15mb' }),
    asyncHandler(async (req, res) => {
      const asset = await ownedAsset(deps, req.auth!.userId, req.params.assetId as string);
      if (!(req.body instanceof Buffer) || req.body.length === 0)
        throw forbidden('UPLOAD_BODY_REQUIRED', 'Yüklenecek görsel bulunamadı.');
      if (asset.status !== 'PENDING_UPLOAD' && asset.status !== 'UPLOADED')
        throw forbidden('UPLOAD_NOT_ACCEPTED', 'Bu yükleme artık kabul edilmiyor.');
      if (req.body.length > asset.sizeBytes || req.body.length > 15 * 1024 * 1024)
        throw forbidden('UPLOAD_SIZE_INVALID', 'Yüklenen dosya beklenen boyutu aşıyor.');
      if (req.header('content-type')?.split(';')[0] !== asset.mimeType)
        throw forbidden('UPLOAD_MIME_INVALID', 'Dosya türü beklenen görsel türüyle eşleşmiyor.');
      await deps.storage.putObject({
        key: asset.storageKey,
        body: req.body,
        contentType: asset.mimeType,
      });
      await deps.repository.updateAsset(asset.id, { status: 'UPLOADED' });
      sendSuccess(res, req.requestId, { assetId: asset.id, uploaded: true });
    }),
  );

  router.post(
    '/uploads/:assetId/complete',
    validate(AssetParamsSchema, 'params'),
    asyncHandler(async (req, res) => {
      const asset = await ownedAsset(deps, req.auth!.userId, req.params.assetId as string);
      if (!(await deps.storage.exists(asset.storageKey)))
        throw notFound('UPLOAD_NOT_FOUND', 'Yüklenen dosya depoda bulunamadı.');
      const bytes = await deps.storage.getObject(asset.storageKey);
      if (
        bytes.length === 0 ||
        bytes.length > asset.sizeBytes ||
        !hasExpectedMagicBytes(bytes, asset.mimeType)
      ) {
        await deps.repository.updateAsset(asset.id, { status: 'REJECTED' });
        throw forbidden('UPLOAD_VALIDATION_FAILED', 'Yüklenen dosya doğrulanamadı.');
      }
      const completed = await deps.repository.updateAsset(asset.id, { status: 'READY' });
      sendSuccess(res, req.requestId, { asset: completed });
    }),
  );

  router.get(
    '/assets/:assetId',
    validate(AssetParamsSchema, 'params'),
    asyncHandler(async (req, res) => {
      const asset = await ownedAsset(deps, req.auth!.userId, req.params.assetId as string);
      sendSuccess(res, req.requestId, { asset });
    }),
  );

  router.get(
    '/assets/:assetId/access-url',
    validate(AssetParamsSchema, 'params'),
    asyncHandler(async (req, res) => {
      const asset = await ownedAsset(deps, req.auth!.userId, req.params.assetId as string);
      if (asset.status !== 'READY')
        throw forbidden('ASSET_NOT_READY', 'Görsel henüz kullanıma hazır değil.');
      const url =
        asset.storageProvider === 'local'
          ? `/v1/assets/${asset.id}/content`
          : await deps.storage.createDownloadUrl({ key: asset.storageKey, expiresInSeconds: 300 });
      sendSuccess(res, req.requestId, { url, expiresIn: 300 });
    }),
  );

  router.get(
    '/assets/:assetId/content',
    validate(AssetParamsSchema, 'params'),
    asyncHandler(async (req, res) => {
      const asset = await ownedAsset(deps, req.auth!.userId, req.params.assetId as string);
      if (asset.status !== 'READY')
        throw forbidden('ASSET_NOT_READY', 'Görsel henüz kullanıma hazır değil.');
      const bytes = await deps.storage.getObject(asset.storageKey);
      res.setHeader('content-type', asset.mimeType);
      res.setHeader('cache-control', 'private, no-store');
      res.setHeader('content-disposition', 'inline');
      res.status(200).send(bytes);
    }),
  );

  router.delete(
    '/assets/:assetId',
    validate(AssetParamsSchema, 'params'),
    asyncHandler(async (req, res) => {
      const asset = await ownedAsset(deps, req.auth!.userId, req.params.assetId as string);
      await deps.storage.deleteObject(asset.storageKey);
      await deps.repository.updateAsset(asset.id, { status: 'DELETED', deletedAt: new Date() });
      sendSuccess(res, req.requestId, { deleted: true });
    }),
  );

  router.post(
    '/assets/:assetId/retry-validation',
    validate(AssetParamsSchema, 'params'),
    asyncHandler(async (req, res) => {
      const asset = await ownedAsset(deps, req.auth!.userId, req.params.assetId as string);
      const exists = await deps.storage.exists(asset.storageKey);
      const updated = await deps.repository.updateAsset(asset.id, {
        status: exists ? 'READY' : 'REJECTED',
      });
      sendSuccess(res, req.requestId, { asset: updated });
    }),
  );

  return router;
}
