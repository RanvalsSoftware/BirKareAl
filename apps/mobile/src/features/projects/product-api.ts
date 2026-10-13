import { apiRequest } from '@/api/client';

export type ListingTone = 'neutral' | 'friendly' | 'premium';

/** Seller-facing copy the server writes for one product project. */
export type ProductListing = {
  title: string;
  description: string;
  highlights: string[];
  hashtags: string[];
  language: string;
  tone: string;
  generatedAt: string;
};

/** Commerce fields every project object carries; all null until the seller fills them. */
export type ProductCommerce = {
  priceAmount: number | null;
  priceCurrency: string | null;
  listing: ProductListing | null;
};

export const PRICE_CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'] as const;
export type PriceCurrency = (typeof PRICE_CURRENCIES)[number];

export function updateProjectPrice(
  projectId: string,
  price: { priceAmount: number | null; priceCurrency: string | null },
): Promise<{ project: ProductCommerce }> {
  return apiRequest(`/v1/projects/${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    body: JSON.stringify(price),
  });
}

export function writeProjectListing(
  projectId: string,
  options: { language: string; tone: ListingTone },
): Promise<{ listing: ProductListing }> {
  return apiRequest(`/v1/projects/${encodeURIComponent(projectId)}/listing`, {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

/** Accepts "1.249,90", "1249.9" and "1249,9"; null when the text is not a valid price. */
export function parsePriceInput(text: string): number | null {
  const trimmed = text.trim().replace(/\s/g, '');
  if (!trimmed) return null;
  const lastSeparator = Math.max(trimmed.lastIndexOf(','), trimmed.lastIndexOf('.'));
  const decimals = lastSeparator >= 0 ? trimmed.length - lastSeparator - 1 : 0;
  // A trailing group of exactly three digits is a thousands separator, not cents.
  const hasDecimalPart = lastSeparator >= 0 && decimals > 0 && decimals <= 2;
  const whole = (hasDecimalPart ? trimmed.slice(0, lastSeparator) : trimmed).replace(/[.,]/g, '');
  const fraction = hasDecimalPart ? trimmed.slice(lastSeparator + 1) : '';
  if (!/^\d+$/.test(whole) || (fraction && !/^\d+$/.test(fraction))) return null;
  const value = Number(`${whole}.${fraction || '0'}`);
  return Number.isFinite(value) && value >= 0 && value <= 99_999_999.99 ? value : null;
}

export function formatPrice(
  amount: number | null | undefined,
  currency: string | null | undefined,
  locale: string,
): string | null {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return null;
  try {
    return new Intl.NumberFormat(locale, {
      currency: currency || 'TRY',
      style: 'currency',
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency ?? ''}`.trim();
  }
}

/** The whole listing as plain text, ready to paste into a marketplace form or a chat. */
export function listingAsText(
  listing: ProductListing,
  extras: { price?: string | null; signature?: string | null } = {},
): string {
  return [
    listing.title,
    extras.price ?? null,
    listing.description,
    listing.highlights.map((item) => `• ${item}`).join('\n'),
    listing.hashtags.join(' '),
    extras.signature ?? null,
  ]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join('\n\n');
}
