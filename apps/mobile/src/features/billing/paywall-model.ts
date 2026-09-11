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
    note: 'Her ay 100 kredi',
    featured: true,
  },
  lifetime: {
    label: 'Ömür Boyu',
    note: '200 başlangıç kredisi · Kalıcı Pro',
    featured: false,
  },
};

export function plansFromOffering(offering: PurchasesOffering | null): ProPlan[] {
  if (!offering) return [];

  const packages: Partial<Record<ProPlanId, PurchasesPackage | null>> = {
    monthly: offering.monthly,
    annual: offering.annual,
    lifetime: offering.lifetime,
  };

  return (Object.keys(PLAN_COPY) as ProPlanId[]).flatMap((id) => {
    const pkg = packages[id];
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
