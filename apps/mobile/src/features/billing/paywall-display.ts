import type { ProPlan, ProPlanId } from './paywall-model';
import type { ProPlanDisplay } from './ProPaywallView';

/** Display models cannot be passed as native PurchasesPackage objects. */
export function toDisplayPlan(plan: ProPlan, locale?: string): ProPlanDisplay {
  let monthlyEquivalent: string | undefined;
  const product = plan.package.product;
  if (plan.id === 'annual' && Number.isFinite(product.price) && product.price > 0 && product.currencyCode) {
    try {
      monthlyEquivalent = 'Aylık karşılığı ' + new Intl.NumberFormat(locale, {
        style: 'currency', currency: product.currencyCode,
      }).format(product.price / 12);
    } catch {
      // Keep the store-supplied total price; an optional comparison may be absent.
    }
  }
  return {
    id: plan.id, label: plan.label, price: product.priceString,
    period: plan.id === 'lifetime' ? 'tek sefer' : plan.id === 'annual' ? '/ yıl' : '/ ay',
    note: plan.note, monthlyEquivalent,
  };
}

export function previewAllowed(developmentBuild: boolean, appEnv: unknown): boolean {
  return developmentBuild && (appEnv === undefined || appEnv === 'development');
}

export function previewSelection(value: string | string[] | undefined): ProPlanId {
  return value === 'monthly' || value === 'annual' || value === 'lifetime' ? value : 'lifetime';
}

/** A price-comparison badge is shown only when supported by storefront prices. */
export function toDisplayPlans(plans: readonly ProPlan[], locale?: string): ProPlanDisplay[] {
  const month = plans.find((plan) => plan.id === 'monthly')?.package.product;
  return plans.map((plan) => {
    const display = toDisplayPlan(plan, locale);
    const year = plan.package.product;
    if (plan.id === 'annual' && month && month.currencyCode === year.currencyCode &&
      Number.isFinite(month.price) && month.price > 0 && Number.isFinite(year.price) &&
      year.price > 0 && year.price < month.price * 12) display.badge = 'En avantajlı';
    return display;
  });
}
