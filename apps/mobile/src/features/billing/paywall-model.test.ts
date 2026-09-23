import { describe, expect, it } from 'vitest';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { planById, plansFromOffering, preferredPlanId } from './paywall-model';

const monthly = {
  identifier: '$rc_monthly',
  product: { identifier: 'com.birkareai.pro.monthly', priceString: '₺199,99' },
} as PurchasesPackage;
const annual = {
  identifier: '$rc_annual',
  product: { identifier: 'com.birkareai.pro.yearly', priceString: '₺1.499,99' },
} as PurchasesPackage;
const lifetime = {
  identifier: '$rc_lifetime',
  product: { identifier: 'com.birkareai.pro.lifetime', priceString: '₺2.999,99' },
} as PurchasesPackage;

describe('custom BirKare Pro paywall model', () => {
  it('maps RevenueCat package slots without hardcoding storefront prices', () => {
    const plans = plansFromOffering({ monthly, annual, lifetime } as PurchasesOffering);
    expect(plans.map((plan) => [plan.id, plan.package.product.priceString])).toEqual([
      ['monthly', '₺199,99'],
      ['annual', '₺1.499,99'],
      ['lifetime', '₺2.999,99'],
    ]);
  });

  it('keeps the agreed credit copy separate from storefront prices', () => {
    const plans = plansFromOffering({ monthly, annual, lifetime } as PurchasesOffering);
    expect(plans.map((plan) => [plan.id, plan.note])).toEqual([
      ['monthly', 'Her ay 80 kredi'],
      ['annual', 'Her ay 80 kredi'],
      ['lifetime', '200 başlangıç kredisi · Kalıcı Pro'],
    ]);
  });

  it('prefers annual while falling back to the first available package', () => {
    const all = plansFromOffering({ monthly, annual, lifetime } as PurchasesOffering);
    expect(preferredPlanId(all)).toBe('annual');
    expect(preferredPlanId(plansFromOffering({ monthly } as PurchasesOffering))).toBe('monthly');
    expect(preferredPlanId([])).toBeNull();
  });

  it('does not invent missing packages', () => {
    const plans = plansFromOffering({ monthly, lifetime } as PurchasesOffering);
    expect(plans.map((plan) => plan.id)).toEqual(['monthly', 'lifetime']);
    expect(planById(plans, 'annual')).toBeNull();
  });
});
