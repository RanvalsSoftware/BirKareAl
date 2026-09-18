import type { ComponentProps } from 'react';
import type { Icon } from '@/components';
import type { CreditTransaction } from './use-wallet';

export type TransactionFilter = 'all' | 'earned' | 'spent' | 'returned';

export const transactionLabels: Record<string, string> = {
  PURCHASE: 'Kredi satın alımı',
  SUBSCRIPTION_GRANT: 'Pro üyelik kredisi',
  GENERATION_RESERVATION: 'Üretim için ayrıldı',
  GENERATION_CAPTURE: 'AI görsel üretimi',
  GENERATION_RELEASE: 'Üretim kredisi iade edildi',
  REFUND: 'Kredi iadesi',
  BONUS: 'Hoş geldin kredisi',
  ADMIN_ADJUSTMENT: 'Bakiye düzenlemesi',
  CHARGEBACK: 'Ödeme iptali',
};

export function transactionTitle(item: CreditTransaction): string {
  const description = item.description?.trim();
  const technicalDescriptions: Record<string, string> = {
    MODERATION_BLOCKED: 'Güvenlik kontrolü iadesi',
    PROVIDER_REJECTED: 'Sağlayıcı reddi sonrası iade',
    GENERATION_FAILED: 'Başarısız üretim iadesi',
  };
  if (description && technicalDescriptions[description]) return technicalDescriptions[description];
  if (description && !/^[A-Z0-9_:-]+$/.test(description)) return description;
  return transactionLabels[item.type] || 'Kredi hareketi';
}

export function transactionIcon(type: string): ComponentProps<typeof Icon>['name'] {
  if (type === 'BONUS' || type === 'SUBSCRIPTION_GRANT') return 'gift-outline';
  if (type === 'PURCHASE') return 'card-outline';
  if (type === 'REFUND' || type === 'GENERATION_RELEASE') return 'refresh-outline';
  if (type === 'CHARGEBACK' || type === 'GENERATION_CAPTURE') return 'flash-outline';
  return 'sparkles-outline';
}

export function transactionStatus(status: string): string {
  if (status === 'COMPLETED') return 'Tamamlandı';
  if (status === 'PENDING') return 'Bekliyor';
  if (status === 'REVERSED') return 'Geri alındı';
  if (status === 'FAILED') return 'Başarısız';
  return status;
}

export function settledCreditHistory(
  items: readonly CreditTransaction[],
  limit?: number,
): CreditTransaction[] {
  const settled = new Set(
    items
      .filter((item) => ['GENERATION_CAPTURE', 'GENERATION_RELEASE'].includes(item.type))
      .map((item) => item.referenceId)
      .filter((value): value is string => Boolean(value)),
  );
  const visible = items.filter(
    (item) =>
      item.type !== 'GENERATION_RESERVATION' || !item.referenceId || !settled.has(item.referenceId),
  );
  return limit === undefined ? visible : visible.slice(0, limit);
}

export function filterTransactions(
  items: readonly CreditTransaction[],
  filter: TransactionFilter,
): CreditTransaction[] {
  if (filter === 'earned') return items.filter((item) => item.amount > 0);
  if (filter === 'spent') return items.filter((item) => item.amount < 0);
  if (filter === 'returned')
    return items.filter((item) => item.type === 'REFUND' || item.type === 'GENERATION_RELEASE');
  return [...items];
}
