import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { apiBaseUrl, captureSessionRequestScope } from '@/api/client';
import { useAuthStore } from '@/features/auth/auth-store';
import { tr as translateCopy } from '@/i18n/engine';
import {
  buildCatalogHtml,
  type CatalogBrand,
  type CatalogEntry,
  type CatalogLabels,
  type CatalogLayout,
} from './catalog-html';

export const MAX_CATALOG_PRODUCTS = 40;

export type CatalogProduct = {
  assetId: string;
  title: string;
  price: string | null;
  description: string | null;
};

function removeFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    /* The OS may already have purged its cache. */
  }
}

/** Print-sized, compressed copy of an image as a data URI. */
async function embeddedImage(uri: string, width: number): Promise<string> {
  const rendered = await ImageManipulator.manipulate(uri).resize({ width }).renderAsync();
  const saved = await rendered.saveAsync({
    base64: true,
    compress: 0.82,
    format: SaveFormat.JPEG,
  });
  removeFile(saved.uri);
  if (!saved.base64) throw new Error(translateCopy('Görsel dosyası indirilemedi veya çok büyük.'));
  return `data:image/jpeg;base64,${saved.base64}`;
}

async function productImage(assetId: string): Promise<string> {
  const token = useAuthStore.getState().accessToken;
  const file = new File(
    Paths.cache,
    `birkare-catalog-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  );
  try {
    await File.downloadFileAsync(
      `${apiBaseUrl}/v1/assets/${encodeURIComponent(assetId)}/content`,
      file,
      { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
    );
    return await embeddedImage(file.uri, 1000);
  } finally {
    try {
      if (file.exists) file.delete();
    } catch {
      /* The OS may already have purged its cache. */
    }
  }
}

/** Builds the catalog on the device and returns the PDF's file URI. */
export async function createCatalogPdf(
  products: readonly CatalogProduct[],
  brand: Omit<CatalogBrand, 'logo'> & { logoUri: string | null },
  labels: CatalogLabels,
  options: {
    layout?: CatalogLayout;
    cover?: boolean;
    rightToLeft?: boolean;
    onProgress?: (done: number, total: number) => void;
  } = {},
): Promise<string> {
  // A catalog started by one account is never finished or shared under another.
  const scope = captureSessionRequestScope();
  const entries: CatalogEntry[] = [];
  for (const [index, product] of products.entries()) {
    entries.push({
      title: product.title,
      price: product.price,
      description: product.description,
      image: await productImage(product.assetId),
    });
    scope.assertCurrent();
    options.onProgress?.(index + 1, products.length);
  }
  const logo = brand.logoUri ? await embeddedImage(brand.logoUri, 240).catch(() => null) : null;
  const html = buildCatalogHtml(entries, { ...brand, logo }, labels, {
    cover: options.cover,
    layout: options.layout,
    rightToLeft: options.rightToLeft,
  });
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  scope.assertCurrent();
  return uri;
}

export async function shareCatalogPdf(uri: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error(translateCopy('Bu cihazda paylaşım menüsü kullanılamıyor.'));
  try {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  } finally {
    // The catalog holds prices; keep it only while a receiving app may still read it.
    setTimeout(() => removeFile(uri), 15 * 60 * 1000);
  }
}
