import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader, CategoryChip, CreditBadge, GlassSurface, Icon, Screen } from '@/components';
import { RequireAuthenticated } from '@/features/auth/require-authenticated';
import {
  filterTransactions,
  settledCreditHistory,
  transactionIcon,
  transactionStatus,
  transactionTitle,
  type TransactionFilter,
} from '@/features/billing/transaction-presentation';
import {
  useAvailableCredits,
  useCreditTransactions,
  type CreditTransaction,
} from '@/features/billing/use-wallet';
import { colors, spacing, typography } from '@/theme';

const filters: { id: TransactionFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'earned', label: 'Eklenen' },
  { id: 'spent', label: 'Harcanan' },
  { id: 'returned', label: 'İadeler' },
];

function dateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Tarih bilgisi yok';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function statusColor(status: string) {
  if (status === 'COMPLETED') return '#7BE495';
  if (status === 'FAILED' || status === 'REVERSED') return '#FF8178';
  return '#FFD86B';
}

function TransactionRow({ item }: { item: CreditTransaction }) {
  const positive = item.amount > 0;
  return (
    <GlassSurface tone={positive ? 'gold' : 'iridescent'} glow={false} radius={22}>
      <View style={styles.transaction}>
        <View style={styles.transactionTop}>
          <View style={styles.transactionIcon}>
            <Icon name={transactionIcon(item.type)} size={23} color="#FFDA70" />
          </View>
          <View style={styles.transactionCopy}>
            <Text style={styles.transactionTitle}>{transactionTitle(item)}</Text>
            <Text style={styles.transactionDate}>{dateTime(item.createdAt)}</Text>
          </View>
          <Text style={[styles.amount, positive && styles.amountPositive]}>
            {positive ? '+' : '−'}
            {Math.abs(item.amount)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Durum</Text>
          <View style={styles.status}>
            <View style={[styles.statusDot, { backgroundColor: statusColor(item.status) }]} />
            <Text
              numberOfLines={1}
              style={[styles.statusText, { color: statusColor(item.status) }]}
            >
              {transactionStatus(item.status)}
            </Text>
          </View>
        </View>
        {item.availableAfter != null ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>İşlem sonrası bakiye</Text>
            <Text style={styles.detailValue}>{item.availableAfter} kredi</Text>
          </View>
        ) : null}
        {item.reservedAfter != null && item.reservedAfter > 0 ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Üretim için ayrılan</Text>
            <Text style={styles.detailValue}>{item.reservedAfter} kredi</Text>
          </View>
        ) : null}
        {item.referenceType ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>İşlem türü</Text>
            <Text numberOfLines={1} style={styles.detailValue}>
              {item.referenceType}
            </Text>
          </View>
        ) : null}
        <Text selectable style={styles.transactionId}>
          İşlem no: {item.id}
        </Text>
      </View>
    </GlassSurface>
  );
}

function TransactionsContent() {
  const credits = useAvailableCredits();
  const query = useCreditTransactions();
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const all = useMemo(() => settledCreditHistory(query.data?.items ?? []), [query.data?.items]);
  const items = useMemo(() => filterTransactions(all, filter), [all, filter]);
  const earned = all.reduce((sum, item) => sum + Math.max(item.amount, 0), 0);
  const spent = all.reduce((sum, item) => sum + Math.abs(Math.min(item.amount, 0)), 0);

  return (
    <Screen contentContainerStyle={styles.content}>
      <AppHeader
        back
        title="Hesap hareketleri"
        subtitle="Kredi geçmişin ve işlem ayrıntıları"
        right={<CreditBadge credits={credits} />}
      />
      <View style={styles.summaryRow}>
        <GlassSurface
          radius={20}
          tone="gold"
          glow={false}
          style={styles.summaryCard}
          contentStyle={styles.summaryContent}
        >
          <Icon name="arrow-down-circle-outline" size={19} color="#7BE495" />
          <Text style={styles.summaryValue}>+{earned}</Text>
          <Text style={styles.summaryLabel}>Toplam eklenen</Text>
        </GlassSurface>
        <GlassSurface
          radius={20}
          tone="iridescent"
          glow={false}
          style={styles.summaryCard}
          contentStyle={styles.summaryContent}
        >
          <Icon name="flash-outline" size={19} color="#C5A5EF" />
          <Text style={styles.summaryValue}>−{spent}</Text>
          <Text style={styles.summaryLabel}>Toplam kullanılan</Text>
        </GlassSurface>
      </View>
      <ScrollView
        horizontal
        style={styles.filterScroll}
        contentContainerStyle={styles.filters}
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
      >
        {filters.map((entry) => (
          <CategoryChip
            key={entry.id}
            label={entry.label}
            selected={filter === entry.id}
            onPress={() => setFilter(entry.id)}
          />
        ))}
      </ScrollView>
      <View style={styles.heading}>
        <Text style={styles.headingTitle}>İşlemler</Text>
        <Text style={styles.headingCount}>{items.length} hareket</Text>
      </View>
      {query.isLoading ? (
        <View style={styles.state}>
          <Icon name="hourglass-outline" size={25} color={colors.accentYellow} />
          <Text style={styles.stateText}>Hesap hareketleri yükleniyor…</Text>
        </View>
      ) : query.isError ? (
        <Pressable onPress={() => void query.refetch()} style={styles.state}>
          <Icon name="refresh-outline" size={25} color={colors.accentYellow} />
          <Text style={styles.stateText}>Hareketler alınamadı. Yeniden dene.</Text>
        </Pressable>
      ) : items.length ? (
        <View style={styles.list}>
          {items.map((item) => (
            <TransactionRow key={item.id} item={item} />
          ))}
        </View>
      ) : (
        <View style={styles.state}>
          <Icon name="receipt-outline" size={25} color={colors.accentYellow} />
          <Text style={styles.stateText}>Bu kategoride henüz hesap hareketi yok.</Text>
        </View>
      )}
    </Screen>
  );
}

export default function TransactionsScreen() {
  return (
    <RequireAuthenticated>
      <TransactionsContent />
    </RequireAuthenticated>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 54 },
  summaryRow: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  summaryCard: { flex: 1 },
  summaryContent: { padding: 15, minHeight: 104 },
  summaryValue: { ...typography.h2, color: colors.textPrimary, marginTop: 8 },
  summaryLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  filterScroll: { flexGrow: 0, marginHorizontal: -spacing.lg, marginTop: 16 },
  filters: { gap: 8, paddingHorizontal: spacing.lg, paddingVertical: 6 },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 12,
  },
  headingTitle: { ...typography.h3, color: colors.textPrimary },
  headingCount: { ...typography.caption, color: colors.textMuted },
  list: { gap: 11 },
  transaction: { padding: 15 },
  transactionTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  transactionIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#21190B',
    borderWidth: 1,
    borderColor: 'rgba(255,211,88,.22)',
  },
  transactionCopy: { flex: 1, minWidth: 0 },
  transactionTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  transactionDate: { ...typography.caption, color: colors.textSecondary, marginTop: 3 },
  amount: { ...typography.h3, color: '#C1A8E7' },
  amountPositive: { color: '#7BE495' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 12 },
  detailRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailLabel: { ...typography.caption, color: colors.textMuted },
  detailValue: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    maxWidth: '58%',
  },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { ...typography.caption, fontWeight: '700' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  transactionId: { ...typography.caption, color: '#69656F', fontSize: 9, marginTop: 8 },
  state: {
    minHeight: 128,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
  },
  stateText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});
