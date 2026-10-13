import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Image } from 'react-native';

import { apiBaseUrl, apiRequest, captureSessionRequestScope } from '@/api/client';
import { useAuthStore } from '@/features/auth/auth-store';
import { tr as translateCopy } from '@/i18n/engine';
import {
  selectedShareOutput,
  shareDownloadRequest,
  shareFileType,
  type ShareGeneration,
} from './output';

/** The sizes sellers are asked for most often, one per sales channel. */
export const SALES_FORMATS = [
  { id: 'catalog', ratio: '1:1', width: 1080, height: 1080 },
  { id: 'product-page', ratio: '4:5', width: 1080, height: 1350 },
  { id: 'story', ratio: '9:16', width: 1080, height: 1920 },
  { id: 'web', ratio: '16:9', width: 1920, height: 1080 },
] as const;

export type SalesFormat = (typeof SALES_FORMATS)[number];
export type SalesFormatId = SalesFormat['id'];

export type DownloadedOutput = { uri: string; width: number; height: number };

export type CropRect = { originX: number; originY: number; width: number; height: number };

/** The largest centred rectangle of the target shape that fits inside the source. */
export function centeredCrop(
  source: { width: number; height: number },
  target: { width: number; height: number },
): CropRect {
  const targetAspect = target.width / target.height;
  const sourceAspect = source.width / source.height;
  const width =
    sourceAspect > targetAspect ? Math.round(source.height * targetAspect) : source.width;
  const height =
    sourceAspect > targetAspect ? source.height : Math.round(source.width / targetAspect);
  return {
    originX: Math.max(0, Math.round((source.width - width) / 2)),
    originY: Math.max(0, Math.round((source.height - height) / 2)),
    width: Math.min(width, source.width),
    height: Math.min(height, source.height),
  };
}

/** How much of the source a format keeps, from 0 to 1. Low values mean a heavy crop. */
export function keptShare(
  source: { width: number; height: number },
  target: { width: number; height: number },
): number {
  const crop = centeredCrop(source, target);
  return (crop.width * crop.height) / (source.width * source.height);
}

function imageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) =>
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject),
  );
}

/** Downloads one owner-authorized result into the cache so it can be cropped locally. */
export async function downloadGeneratedOutput(
  generationId: string,
  outputId: string | undefined,
): Promise<DownloadedOutput> {
  const scope = captureSessionRequestScope();
  const generation = await apiRequest<ShareGeneration>(
    `/v1/generations/${encodeURIComponent(generationId)}`,
  );
  const output = selectedShareOutput(generation, outputId);
  const type = shareFileType(output.asset.mimeType);
  const request = shareDownloadRequest(
    output.asset.accessUrl!,
    apiBaseUrl,
    useAuthStore.getState().accessToken,
  );
  const file = new File(
    Paths.cache,
    `birkare-source-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${type.extension}`,
  );
  await File.downloadFileAsync(request.url, file, { headers: request.headers });
  scope.assertCurrent();
  if (!file.exists || !file.size)
    throw new Error(translateCopy('Görsel dosyası indirilemedi veya çok büyük.'));
  return { uri: file.uri, ...(await imageSize(file.uri)) };
}

/** Crops the result to one sales format and writes a JPEG into the cache. */
export async function renderSalesFormat(
  source: DownloadedOutput,
  format: SalesFormat,
): Promise<string> {
  const crop = centeredCrop(source, format);
  const context = ImageManipulator.manipulate(source.uri).crop(crop);
  // Never enlarge: a smaller crop is exported at its own size.
  if (crop.width > format.width) context.resize({ width: format.width });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.92, format: SaveFormat.JPEG });
  return saved.uri;
}

/** Deletes files this module wrote to the cache. */
export function discardCachedImages(uris: readonly string[]): void {
  for (const uri of uris) {
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch {
      /* The OS may already have purged its cache. */
    }
  }
}

export async function saveFormatsToPhotos(uris: readonly string[]): Promise<void> {
  const permission = await requestPermissionsAsync(true, ['photo']);
  if (!permission.granted)
    throw new Error(
      translateCopy(
        'Kaydetmek için Fotoğraflara ekleme izni gerekiyor. İzni cihaz ayarlarından açabilirsin.',
      ),
    );
  for (const uri of uris) await Asset.create(uri);
}

export async function shareFormat(uri: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error(
      translateCopy(
        'Bu cihazda paylaşım menüsü kullanılamıyor. Görseli Fotoğraflara kaydedebilirsin.',
      ),
    );
  await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg' });
}
