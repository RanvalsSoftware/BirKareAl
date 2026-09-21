export const BIRKARE_REVENUECAT_ENTITLEMENT_ID = 'create_an_app_called_birkare_pro' as const;
export const BIRKARE_REVENUECAT_OFFERING_ID = 'birkare_pro' as const;

export const BIRKARE_PRO_PRODUCTS = {
  monthly: {
    id: 'pro.monthly',
    packageIdentifier: '$rc_monthly',
    productId: 'com.birkareai.pro.monthly',
    creditsPerPeriod: 80,
    expectedTryPrice: 299.99,
  },
  annual: {
    id: 'pro.annual',
    packageIdentifier: '$rc_annual',
    productId: 'com.birkareai.pro.yearly',
    creditsPerPeriod: 80,
    expectedTryPrice: 2499.99,
  },
  lifetime: {
    id: 'pro.lifetime',
    packageIdentifier: '$rc_lifetime',
    productId: 'com.birkareai.pro.lifetime',
    startingCredits: 200,
    expectedTryPrice: 4999.99,
  },
} as const;

export const BIRKARE_CREDIT_PRODUCTS = [
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
    expectedTryPrice: 499.99,
  },
] as const;

export type BirKareCreditProduct = (typeof BIRKARE_CREDIT_PRODUCTS)[number];

export function birKareCreditProductByStoreId(productId: string): BirKareCreditProduct | null {
  return BIRKARE_CREDIT_PRODUCTS.find((item) => item.productId === productId) ?? null;
}

export function expectedTryPriceMatches(
  price: number | null | undefined,
  currencyCode: string | null | undefined,
  expectedTryPrice: number,
): boolean {
  if (currencyCode !== 'TRY' || typeof price !== 'number' || !Number.isFinite(price)) return true;
  return Math.abs(price - expectedTryPrice) < 0.01;
}
