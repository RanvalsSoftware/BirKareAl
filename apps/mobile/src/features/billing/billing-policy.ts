export const MOBILE_PRO_PRICE_POLICY = {
  monthly: 299.99,
  annual: 2499.99,
  lifetime: 4999.99,
} as const;

export const MOBILE_CREDIT_PRODUCTS = [
  {
    id: 'credits.20',
    label: 'Başlangıç',
    credits: 20,
    productId: 'com.birkareai.credits.20',
    expectedTryPrice: 99.99,
  },
  {
    id: 'credits.60',
    label: 'Yaratıcı',
    credits: 60,
    productId: 'com.birkareai.credits.60',
    expectedTryPrice: 249.99,
  },
  {
    id: 'credits.150',
    label: 'Stüdyo',
    credits: 150,
    productId: 'com.birkareai.credits.150',
    expectedTryPrice: 599.99,
  },
] as const;

export function expectedTryPriceMatches(
  price: number | null | undefined,
  currencyCode: string | null | undefined,
  expectedTryPrice: number,
): boolean {
  if (currencyCode !== 'TRY' || typeof price !== 'number' || !Number.isFinite(price)) return true;
  return Math.abs(price - expectedTryPrice) < 0.01;
}
