import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

export type ProPlanId = 'monthly' | 'annual' | 'lifetime';

export type ProPlan = {
  id: ProPlanId;
  label: string;
  note: string;
  package: PurchasesPackage;
  featured: boolean;
};

const PLAN_COPY: Record<ProPlanId, Omit<ProPlan, 'id' | 'package'>> = {
  monthly: {
    label: 'Aylık',
    note: 'Her ay 80 kredi',
    featured: false,
  },
  annual: {
    label: 'Yıllık',
    note: 'Her ay 80 kredi',
    featured: true,
  },
  lifetime: {
    label: 'Ömür Boyu',
    note: '200 başlangıç kredisi · Kalıcı Pro',
    featured: false,
  },
};

function matchesStoreProduct(productId: string, knownIds: readonly string[]): boolean {
  // New Google Play subscriptions are exposed by RevenueCat as
  // `<subscription-id>:<base-plan-id>`. The subscription id remains the
  // server-owned BirKare identifier; Apple and legacy Google products have no
  // suffix. Never infer a plan from the base-plan text alone.
  const subscriptionId = productId.split(':', 1)[0] ?? productId;
  return knownIds.includes(productId) || knownIds.includes(subscriptionId);
}

export function plansFromOffering(offering: PurchasesOffering | null): ProPlan[] {
  if (!offering) return [];

  const packages: Partial<Record<ProPlanId, PurchasesPackage | null>> = {
    monthly: offering.monthly,
    annual: offering.annual,
    lifetime: offering.lifetime,
  };

  return (Object.keys(PLAN_COPY) as ProPlanId[]).flatMap((id) => {
    // A custom package named 'Yearly' has no offering.annual slot. Resolve only
    // known product IDs from this offering; never invent or cross-store fetch.
    const productIds: Record<ProPlanId, readonly string[]> = {
      monthly: ['monthly', 'com.birkareai.pro.monthly'],
      annual: ['yearly', 'com.birkareai.pro.yearly'],
      lifetime: ['lifetime', 'com.birkareai.pro.lifetime'],
    };
    const pkg =
      packages[id] ??
      offering.availablePackages?.find((candidate) =>
        matchesStoreProduct(candidate.product.identifier, productIds[id]),
      );
    return pkg ? [{ id, package: pkg, ...PLAN_COPY[id] }] : [];
  });
}

export function preferredPlanId(plans: ProPlan[]): ProPlanId | null {
  if (plans.some((plan) => plan.id === 'annual')) return 'annual';
  return plans[0]?.id ?? null;
}

export function planById(plans: ProPlan[], id: ProPlanId | null): ProPlan | null {
  return plans.find((plan) => plan.id === id) ?? null;
}
