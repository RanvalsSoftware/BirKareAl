import { File, FileMode, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { apiBaseUrl, apiRequest, captureSessionRequestScope } from '@/api/client';
import { useAuthStore } from '@/features/auth/auth-store';
import {
  hasImageSignature,
  selectedShareOutput,
  shareDownloadRequest,
  shareFileType,
  type ShareGeneration,
} from './output';

export type ShareDestination = 'Instagram' | 'X / Twitter' | 'Facebook' | 'other' | 'save';

/** Fresh, owner-authorized result metadata on every export; no public URLs or source-photo fallback. */
export async function exportGeneratedImage(
  generationId: string,
  outputId: string | undefined,
  destination: ShareDestination,
) {
  if (Platform.OS === 'web')
    throw new Error('Görsel paylaşımı için iOS veya Android uygulamasını kullan.');
  const scope = captureSessionRequestScope();
  if (destination !== 'save' && !(await Sharing.isAvailableAsync())) {
    throw new Error(
      'Bu cihazda paylaşım menüsü kullanılamıyor. Görseli Fotoğraflara kaydedebilirsin.',
    );
  }
  scope.assertCurrent();
  if (destination === 'save') {
    const permission = await requestPermissionsAsync(true, ['photo']);
    scope.assertCurrent();
    if (!permission.granted)
      throw new Error(
        'Kaydetmek için Fotoğraflara ekleme izni gerekiyor. İzni cihaz ayarlarından açabilirsin.',
      );
  }
  const generation = await apiRequest<ShareGeneration>(
    `/v1/generations/${encodeURIComponent(generationId)}`,
  );
  scope.assertCurrent();
  const output = selectedShareOutput(generation, outputId);
  const type = shareFileType(output.asset.mimeType);
  const request = shareDownloadRequest(
    output.asset.accessUrl!,
    apiBaseUrl,
    useAuthStore.getState().accessToken,
  );
  // Only app-created cache files are touched. A new filename prevents concurrent exports from colliding.
  const file = new File(
    Paths.cache,
    `birkare-ai-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${type.extension}`,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  let handedToShareSheet = false;
  try {
    await File.downloadFileAsync(request.url, file, {
      headers: request.headers,
      signal: controller.signal,
      onProgress: ({ bytesWritten }) => {
        if (bytesWritten > 32 * 1024 * 1024) controller.abort();
      },
    });
    clearTimeout(timeout);
    scope.assertCurrent();
    if (!file.exists || !file.size || file.size > 32 * 1024 * 1024)
      throw new Error('Görsel dosyası indirilemedi veya çok büyük.');
    const handle = file.open(FileMode.ReadOnly);
    try {
      if (!hasImageSignature(handle.readBytes(12), output.asset.mimeType))
        throw new Error('İndirilen dosya geçerli bir görsel değil.');
    } finally {
      handle.close();
    }
    scope.assertCurrent();
    if (destination === 'save') {
      await Asset.create(file.uri);
    } else {
      await Sharing.shareAsync(file.uri, {
        mimeType: output.asset.mimeType,
        UTI: type.uti,
        dialogTitle:
          destination === 'other'
            ? 'AI görselini paylaş'
            : `${destination} uygulamasını paylaşım menüsünden seç`,
      });
      handedToShareSheet = true;
    }
  } finally {
    clearTimeout(timeout);
    const removeTemporaryFile = () => {
      try {
        if (file.exists) file.delete();
      } catch {
        /* The OS may already have purged its cache. */
      }
    };
    // Some Android receivers read the granted URI after the chooser resolves.
    // Keep successful shares briefly; failed/partial downloads and saves clean up immediately.
    if (handedToShareSheet) setTimeout(removeTemporaryFile, 15 * 60 * 1000);
    else removeTemporaryFile();
  }
}
