import { describe, expect, it } from 'vitest';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { plansFromOffering, preferredPlanId } from './paywall-model';
import { previewAllowed, previewSelection, toDisplayPlans } from './paywall-display';
const pkg = (identifier: string, product: string, price: number, currency = 'TRY') => ({
  identifier,
  product: { identifier: product, price, priceString: `STORE:${currency}:${price}`, currencyCode: currency },
} as unknown as PurchasesPackage);
const offering = (packages: PurchasesPackage[]) => ({
  availablePackages: packages, monthly: null, annual: null, lifetime: null,
} as unknown as PurchasesOffering);

describe('reference paywall isolation and real storefront data', () => {
  it('resolves custom Yearly package by its exact Apple product ID', () => {
    const yearly = pkg('Yearly', 'com.birkareai.pro.yearly', 1499.99);
    const plans = plansFromOffering(offering([yearly]));
    expect(plans.map((plan) => plan.id)).toEqual(['annual']);
    expect(plans[0]?.package).toBe(yearly);
  });

  it('resolves current Google Play subscription base-plan identifiers', () => {
    const packages = [
      pkg('Monthly Android', 'com.birkareai.pro.monthly:monthly-autorenewing', 299.99),
      pkg('Yearly Android', 'com.birkareai.pro.yearly:yearly-autorenewing', 2499.99),
      pkg('Lifetime Android', 'com.birkareai.pro.lifetime', 4999.99),
    ];

    expect(plansFromOffering(offering(packages)).map((plan) => plan.id)).toEqual([
      'monthly',
      'annual',
      'lifetime',
    ]);
  });
  it('resolves Test Store products without synthesizing purchasable packages', () => {
    const packages = [pkg('M','monthly',199.99),pkg('Y','yearly',1499.99),pkg('L','lifetime',2999.99)];
    const plans = plansFromOffering(offering(packages));
    expect(plans.map((plan) => plan.id)).toEqual(['monthly','annual','lifetime']);
    plans.forEach((plan, index) => expect(plan.package).toBe(packages[index]));
  });
  it('never fabricates prices or plans when the offering is unavailable', () => {
    expect(plansFromOffering(null)).toEqual([]);
    expect(toDisplayPlans([])).toEqual([]);
  });
  it('does not accept an unrelated product as a custom yearly package', () => {
    expect(plansFromOffering(offering([pkg('Yearly','other.product',1)]))).toEqual([]);
  });
  it('keeps annual selected by default in the real controller', () => {
    expect(preferredPlanId(plansFromOffering(offering([pkg('Y','yearly',1499)])))).toBe('annual');
  });
  it('preserves the exact localized storefront price string', () => {
    const plans = plansFromOffering(offering([pkg('M','monthly',99,'USD')]));
    expect(toDisplayPlans(plans)[0]?.price).toBe('STORE:USD:99');
  });
  it('shows annual comparison only when the same currency supports it', () => {
    const plans = plansFromOffering(offering([pkg('M','monthly',199.99),pkg('Y','yearly',1499.99)]));
    const display = toDisplayPlans(plans,'tr-TR');
    expect(display[1]?.badge).toBe('En avantajlı');
    expect(display[1]?.monthlyEquivalent).toContain('125,00');
  });
  it('does not compare prices across different storefront currencies', () => {
    const plans = plansFromOffering(offering([pkg('M','monthly',199.99,'TRY'),pkg('Y','yearly',29.99,'USD')]));
    expect(toDisplayPlans(plans)[1]?.badge).toBeUndefined();
  });
  it('does not show a savings badge for an expensive annual price', () => {
    const plans = plansFromOffering(offering([pkg('M','monthly',10),pkg('Y','yearly',150)]));
    expect(toDisplayPlans(plans)[1]?.badge).toBeUndefined();
  });
  it('denies preview in release binaries even with development env', () => {
    expect(previewAllowed(false,'development')).toBe(false);
    expect(previewAllowed(false,undefined)).toBe(false);
  });
  it('denies preview in staging and production even with development JS', () => {
    expect(previewAllowed(true,'staging')).toBe(false);
    expect(previewAllowed(true,'production')).toBe(false);
    expect(previewAllowed(true,'typo')).toBe(false);
  });
  it('allows a development preview with no server configuration', () => {
    expect(previewAllowed(true,'development')).toBe(true);
    expect(previewAllowed(true,undefined)).toBe(true);
  });
  it('accepts only the three display-only initial selections', () => {
    expect(previewSelection('monthly')).toBe('monthly');
    expect(previewSelection('annual')).toBe('annual');
    expect(previewSelection('lifetime')).toBe('lifetime');
    expect(previewSelection('invalid')).toBe('lifetime');
    expect(previewSelection(['monthly'])).toBe('lifetime');
  });
});
