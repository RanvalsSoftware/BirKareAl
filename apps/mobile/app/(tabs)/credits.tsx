import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppHeader,
  CreditBadge,
  Icon,
  PrimaryButton,
  ProBadge,
  SectionHeader,
  SettingRow,
} from '@/components';
import { colors, gradients, radii, spacing, typography } from '@/theme';
import { useAvailableCredits } from '@/features/billing/use-wallet';

const packs = [
  { title: 'Başlangıç', credits: 12, price: '₺79,99', note: 'Tek seferlik' },
  {
    title: 'Yaratıcı',
    credits: 40,
    price: '₺199,99',
    note: 'En çok tercih edilen',
    featured: true,
  },
  { title: 'Stüdyo', credits: 100, price: '₺429,99', note: 'Daha fazla üretim' },
];

export default function CreditsScreen() {
  const availableCredits = useAvailableCredits();
  const approximateStandardGenerations = Math.floor(availableCredits / 3);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          title="Krediler"
          subtitle="Üretim gücünüz"
          right={<CreditBadge credits={availableCredits} />}
        />
        <LinearGradient colors={gradients.midnight} style={styles.balanceCard}>
          <View>
            <Text style={styles.balanceEyebrow}>MEVCUT BAKİYE</Text>
            <Text style={styles.balance}>
              <Text style={styles.balanceNumber}>{availableCredits}</Text> kredi
            </Text>
            <Text style={styles.balanceText}>
              Yaklaşık {approximateStandardGenerations} standart üretim için yeterli.
            </Text>
          </View>
          <View style={styles.balanceIcon}>
            <Icon name="flash" size={31} color={colors.accentYellow} />
          </View>
        </LinearGradient>

        <View style={styles.proCard}>
          <View style={styles.proTop}>
            <View>
              <ProBadge label="BirKare Pro" />
              <Text style={styles.proTitle}>Her ay yaratmak için daha çok alan.</Text>
              <Text style={styles.proText}>
                Aylık 80 kredi, öncelikli sıra ve Pro koleksiyonları.
              </Text>
            </View>
            <View style={styles.proIcon}>
              <Icon name="sparkles" size={24} color={colors.accentYellow} />
            </View>
          </View>
          <PrimaryButton
            label="Pro’yu incele"
            icon="arrow-forward"
            onPress={() =>
              Alert.alert(
                'BirKare Pro',
                'Mağaza bağlantısı gerçek ödeme entegrasyonu eklendiğinde burada açılacak.',
              )
            }
          />
        </View>

        <SectionHeader title="Kredi paketleri" />
        <View style={styles.packList}>
          {packs.map((pack) => (
            <View key={pack.title} style={[styles.pack, pack.featured && styles.packFeatured]}>
              {pack.featured ? (
                <View style={styles.packPopular}>
                  <Text style={styles.packPopularText}>EN ÇOK SEÇİLEN</Text>
                </View>
              ) : null}
              <View>
                <Text style={styles.packTitle}>{pack.title}</Text>
                <Text style={styles.packCredits}>{pack.credits} kredi</Text>
                <Text style={styles.packNote}>{pack.note}</Text>
              </View>
              <View style={styles.packAction}>
                <Text style={styles.packPrice}>{pack.price}</Text>
                <PrimaryButton
                  label="Seç"
                  onPress={() =>
                    Alert.alert(
                      'Paket seçildi',
                      `${pack.title} paketi için mağaza akışı hazır olduğunda ödeme ekranı açılacak.`,
                    )
                  }
                  style={styles.selectButton}
                />
              </View>
            </View>
          ))}
        </View>

        <SectionHeader title="Hesap hareketleri" />
        <View style={styles.history}>
          <SettingRow
            icon="sparkles-outline"
            title="Şehir ışıkları"
            detail="AI üretim · Bugün"
            value="−2"
          />
          <SettingRow icon="gift-outline" title="Hoş geldin kredisi" detail="2 Eylül" value="+10" />
          <SettingRow
            icon="color-filter-outline"
            title="Sinematik filtre"
            detail="1 Eylül"
            value="−1"
          />
        </View>
        <Text style={styles.restore}>Satın alımları geri yükle</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 40 },
  balanceCard: {
    minHeight: 162,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceEyebrow: { ...typography.overline, color: colors.accentYellow, fontSize: 10 },
  balance: { ...typography.h3, color: colors.textPrimary, marginTop: 4 },
  balanceNumber: { fontSize: 42, lineHeight: 46, fontWeight: '900' },
  balanceText: { ...typography.caption, color: colors.textSecondary, marginTop: 7 },
  balanceIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: colors.accentYellowSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,196,0,0.31)',
  },
  proTop: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  proTitle: { ...typography.h3, color: colors.textPrimary, marginTop: 9, maxWidth: 255 },
  proText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    maxWidth: 270,
    lineHeight: 18,
  },
  proIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentPurpleSoft,
  },
  packList: { gap: 10 },
  pack: {
    minHeight: 106,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  packFeatured: { borderColor: colors.accentYellow },
  packPopular: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: colors.accentYellow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
  },
  packPopularText: { ...typography.overline, fontSize: 8, color: colors.background },
  packTitle: { ...typography.label, color: colors.textPrimary },
  packCredits: { ...typography.h3, color: colors.accentYellow, marginTop: 4 },
  packNote: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  packAction: { alignItems: 'flex-end', justifyContent: 'flex-end' },
  packPrice: { ...typography.label, color: colors.textPrimary, marginBottom: 7 },
  selectButton: { minHeight: 34, paddingHorizontal: 13, borderRadius: 10 },
  history: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  restore: {
    ...typography.label,
    color: colors.accentYellow,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
