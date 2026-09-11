import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii, shadows, typography } from '@/theme';
import { useRevenueCat } from './revenuecat';
import type { BillingResult } from './revenuecat-client';
import { planById, plansFromOffering, preferredPlanId, type ProPlanId } from './paywall-model';

const ENTITLEMENT_NAME = 'BirKare Pro';

function purchaseMessage(result: BillingResult): string | null {
  if (result.kind === 'cancelled') return null;
  if (result.kind === 'pending' || result.kind === 'error') return result.message;
  return result.isPro
    ? 'BirKare Pro erişiminiz aktif.'
    : 'Ödeme tamamlandı ancak Pro hakkı henüz doğrulanamadı. Tekrar satın almayın; durumu yenileyin.';
}

function Benefit({
  icon,
  title,
  detail,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
}) {
  return (
    <View style={styles.benefit}>
      <LinearGradient colors={['#211C0B', '#121214']} style={styles.benefitIcon}>
        <Ionicons name={icon} size={25} color={colors.accentYellow} />
      </LinearGradient>
      <Text style={styles.benefitTitle}>{title}</Text>
      <Text style={styles.benefitDetail}>{detail}</Text>
    </View>
  );
}

export function CustomProPaywall() {
  const router = useRouter();
  const billing = useRevenueCat();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(Math.max(width, 300), 402);
  const compact = contentWidth < 360;
  const plans = useMemo(() => plansFromOffering(billing.offering), [billing.offering]);
  const [selectedPlanId, setSelectedPlanId] = useState<ProPlanId | null>(null);
  const selectedPlan = planById(plans, selectedPlanId);

  useEffect(() => {
    if (selectedPlanId && plans.some((plan) => plan.id === selectedPlanId)) return;
    setSelectedPlanId(preferredPlanId(plans));
  }, [plans, selectedPlanId]);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/credits' as never);
  }, [router]);

  const notify = useCallback(
    (result: BillingResult, restored = false) => {
      const message = purchaseMessage(result);
      if (!message) return;
      if (result.kind === 'completed' && result.isPro) {
        Alert.alert(
          ENTITLEMENT_NAME,
          restored ? 'Pro erişiminiz geri yüklendi.' : message,
          [{ text: 'Tamam', onPress: close }],
        );
        return;
      }
      Alert.alert(result.kind === 'pending' ? 'Onay bekleniyor' : ENTITLEMENT_NAME, message);
    },
    [close],
  );

  const buy = useCallback(async () => {
    if (!selectedPlan) {
      Alert.alert(ENTITLEMENT_NAME, 'Satın almak için bir plan seçin.');
      return;
    }
    notify(await billing.purchase(selectedPlan.package));
  }, [billing, notify, selectedPlan]);

  const restore = useCallback(async () => {
    notify(await billing.restore(), true);
  }, [billing, notify]);

  const manage = useCallback(async () => {
    const result = await billing.presentCustomerCenter();
    if (result.kind === 'error' || result.kind === 'pending') notify(result);
  }, [billing, notify]);

  const disabled = !billing.ready || billing.busy;
  const isSandboxBuild = billing.appEnv !== 'production';
  const expiration = billing.entitlement?.expirationDate;
  const expirationText =
    expiration && Number.isFinite(Date.parse(expiration))
      ? new Date(expiration).toLocaleDateString('tr-TR')
      : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={[styles.content, { width: contentWidth }]}>
          <View style={[styles.hero, compact && styles.heroCompact]}>
            <View style={styles.brandRow}>
              <Image
                source={require('../../../assets/onboarding/images/brand/logo-gold-icon.png')}
                style={styles.logo}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
              <View style={styles.brandCopy}>
                <View style={styles.brandTitleRow}>
                  <Text style={styles.brand}>BirKare</Text>
                  <View style={styles.proBadge}>
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                </View>
                <Text style={styles.tagline}>hayalindeki kareye adım at</Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pro ekranını kapat"
              hitSlop={10}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
              onPress={close}
            >
              <Ionicons name="close" size={28} color="#D7D7DC" />
            </Pressable>

            <View style={[styles.heroCopy, compact && styles.heroCopyCompact]}>
              <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>BirKare</Text>
              <Text style={[styles.heroTitleGold, compact && styles.heroTitleCompact]}>Pro’ya Geç</Text>
              <Text style={styles.heroSubtitle}>
                Premium sahneler, özel filtreler ve daha fazla üretim gücüyle yaratıcılığını yükselt.
              </Text>
            </View>

            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel="BirKare Pro ile sunulan sinematik sahne ve portre örnekleri"
              style={[styles.collage, compact && styles.collageCompact]}
            >
              <View style={[styles.photoCard, styles.cityCard]}>
                <Image
                  source={require('../../../assets/trends/neon.png')}
                  resizeMode="cover"
                  style={styles.photo}
                  accessibilityIgnoresInvertColors
                />
              </View>
              <View style={[styles.photoCard, styles.sceneCard]}>
                <Image
                  source={require('../../../assets/home/images/slider/background.png')}
                  resizeMode="cover"
                  style={styles.photo}
                  accessibilityIgnoresInvertColors
                />
                <View style={styles.photoProBadge}>
                  <Ionicons name="star" size={12} color={colors.accentYellow} />
                  <Text style={styles.photoProText}>PRO</Text>
                </View>
              </View>
              <View style={[styles.photoCard, styles.portraitCard]}>
                <Image
                  source={require('../../../assets/home/images/slider/beauty.png')}
                  resizeMode="cover"
                  style={styles.photo}
                  accessibilityIgnoresInvertColors
                />
              </View>
            </View>

            <View style={styles.benefitsRow}>
              <Benefit icon="image-outline" title="Pro sahneler" detail="Özel karakter paketleri" />
              <Benefit icon="sparkles" title="Premium filtreler" detail="Gelişmiş AI araçları" />
              <Benefit icon="flash" title="Daha hızlı üretim" detail="Öncelikli erişim" />
            </View>
          </View>

          <View style={styles.panel}>
            {billing.isTestStore || isSandboxBuild ? (
              <View style={styles.testBanner}>
                <Ionicons name="flask-outline" size={17} color={colors.accentYellow} />
                <Text style={styles.testText}>
                  {billing.isTestStore
                    ? 'REVENUECAT TEST STORE · GERÇEK ÜCRET ALINMAZ'
                    : 'APPLE SANDBOX / TEST DERLEMESİ'}
                </Text>
              </View>
            ) : null}

            {billing.isPro ? (
              <View style={styles.activeCard}>
                <View style={styles.activeIcon}>
                  <Ionicons name="checkmark" size={24} color={colors.background} />
                </View>
                <View style={styles.activeCopy}>
                  <Text style={styles.activeTitle}>BirKare Pro aktif</Text>
                  <Text style={styles.planNote}>
                    {expirationText
                      ? `${billing.entitlement?.willRenew ? 'Yenileme' : 'Erişim bitişi'}: ${expirationText}`
                      : 'Süresiz Pro erişimi · Otomatik yenileme yok'}
                  </Text>
                </View>
              </View>
            ) : (
              <>
                {plans.map((plan) => {
                  const selected = plan.id === selectedPlanId;
                  return (
                    <Pressable
                      key={`${plan.id}:${plan.package.product.identifier}`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected, disabled }}
                      accessibilityLabel={`${plan.label}, ${plan.package.product.priceString}, ${plan.note}`}
                      disabled={disabled}
                      onPress={() => setSelectedPlanId(plan.id)}
                      style={({ pressed }) => [
                        styles.plan,
                        selected && styles.planSelected,
                        disabled && styles.disabled,
                        pressed && !disabled && styles.pressed,
                      ]}
                    >
                      <View style={[styles.radio, selected && styles.radioSelected]}>
                        {selected ? (
                          <Ionicons name="checkmark" size={16} color={colors.background} />
                        ) : null}
                      </View>
                      <View style={styles.planCopy}>
                        <View style={styles.planTitleRow}>
                          <Text style={styles.planTitle}>{plan.label}</Text>
                          {plan.featured ? (
                            <View style={styles.featuredBadge}>
                              <Ionicons name="star" size={11} color={colors.background} />
                              <Text style={styles.featuredText}>EN AVANTAJLI</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={[styles.planNote, selected && styles.planNoteSelected]}>
                          {plan.note}
                        </Text>
                      </View>
                      <Text
                        numberOfLines={2}
                        adjustsFontSizeToFit
                        minimumFontScale={0.76}
                        style={[styles.price, selected && styles.priceSelected]}
                      >
                        {plan.package.product.priceString}
                      </Text>
                    </Pressable>
                  );
                })}

                {billing.status === 'connecting' ? (
                  <View style={styles.statusRow}>
                    <ActivityIndicator size="small" color={colors.accentYellow} />
                    <Text style={styles.statusText}>Mağaza ürünleri hazırlanıyor…</Text>
                  </View>
                ) : null}
                {billing.status === 'signed_out' ? (
                  <Text style={styles.warning}>Paketleri görmek için hesabınıza giriş yapın.</Text>
                ) : null}
                {billing.error ? (
                  <View style={styles.errorBox}>
                    <Text accessibilityRole="alert" style={styles.warning}>
                      {billing.error}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      disabled={billing.busy}
                      style={styles.retryButton}
                      onPress={() => void billing.refresh()}
                    >
                      <Text style={styles.retryText}>Tekrar dene</Text>
                    </Pressable>
                  </View>
                ) : null}
                {billing.ready && plans.length === 0 ? (
                  <Text style={styles.warning}>
                    `birkare_pro` offering içinde Monthly, Annual veya Lifetime paketi bulunamadı.
                  </Text>
                ) : null}
              </>
            )}

            <Pressable
              accessibilityRole="button"
              disabled={billing.isPro ? disabled : disabled || !selectedPlan}
              style={({ pressed }) => [
                styles.cta,
                (billing.isPro ? disabled : disabled || !selectedPlan) && styles.disabled,
                pressed && !disabled && styles.pressed,
              ]}
              onPress={() => void (billing.isPro ? manage() : buy())}
            >
              <LinearGradient
                colors={['#FFB800', '#FFD45A', '#FFB000']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.ctaGradient}
              >
                {billing.busy ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <>
                    <Text style={styles.ctaText}>
                      {billing.isPro ? 'Aboneliği yönet' : 'Pro’ya geç'}
                    </Text>
                    <Ionicons name="arrow-forward" size={23} color={colors.background} />
                  </>
                )}
              </LinearGradient>
            </Pressable>

            {!billing.isPro ? (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.freeButton, pressed && styles.pressed]}
                onPress={close}
              >
                <Text style={styles.freeText}>Ücretsiz devam et</Text>
              </Pressable>
            ) : null}

            <Text style={styles.finePrint}>
              Aylık ve yıllık planlar mağazadan iptal edilmedikçe otomatik yenilenir. Ömür boyu
              plan tek seferliktir. AI üretimleri mevcut kredi bakiyesinden düşer.
            </Text>

            <View style={styles.footerLinks}>
              <Pressable
                accessibilityRole="button"
                disabled={disabled}
                hitSlop={8}
                onPress={() => void restore()}
              >
                <Text style={[styles.footerLink, disabled && styles.disabled]}>Geri yükle</Text>
              </Pressable>
              <Text style={styles.separator}>|</Text>
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => router.push('/legal/terms' as never)}
              >
                <Text style={styles.footerLink}>Şartlar</Text>
              </Pressable>
              <Text style={styles.separator}>|</Text>
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => router.push('/legal/privacy' as never)}
              >
                <Text style={styles.footerLink}>Gizlilik</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1, backgroundColor: colors.background },
  scrollContent: { alignItems: 'center', paddingBottom: 24 },
  content: { maxWidth: 402, backgroundColor: colors.background },
  hero: {
    minHeight: 620,
    paddingHorizontal: 20,
    paddingTop: 12,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  heroCompact: { minHeight: 600, paddingHorizontal: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 54 },
  logo: { width: 50, height: 50, borderRadius: 12 },
  brandCopy: { marginLeft: 10, flex: 1 },
  brandTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brand: { fontSize: 25, lineHeight: 29, fontWeight: '900', color: '#FFE07A' },
  proBadge: {
    borderWidth: 1,
    borderColor: colors.accentYellow,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  proBadgeText: { fontSize: 12, fontWeight: '900', color: '#FFE07A' },
  tagline: { ...typography.caption, color: '#88878E', marginTop: 2 },
  close: {
    position: 'absolute',
    top: 10,
    right: 14,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(24,24,27,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    zIndex: 20,
  },
  heroCopy: { width: '56%', marginTop: 48, zIndex: 6 },
  heroCopyCompact: { marginTop: 42 },
  heroTitle: { fontSize: 43, lineHeight: 45, fontWeight: '900', color: colors.textPrimary },
  heroTitleGold: { fontSize: 43, lineHeight: 47, fontWeight: '900', color: '#FFE07A' },
  heroTitleCompact: { fontSize: 38, lineHeight: 41 },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
    color: '#A6A5AD',
    marginTop: 14,
  },
  collage: {
    position: 'absolute',
    right: -18,
    top: 86,
    width: '58%',
    height: 390,
    zIndex: 3,
  },
  collageCompact: { right: -28, width: '60%' },
  photoCard: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(195,71,240,0.72)',
    backgroundColor: '#171719',
    ...shadows.floating,
  },
  photo: { width: '100%', height: '100%' },
  cityCard: { width: 142, height: 205, right: 30, top: 0, transform: [{ rotate: '4deg' }] },
  sceneCard: {
    width: 170,
    height: 270,
    right: 12,
    top: 82,
    zIndex: 5,
    transform: [{ rotate: '-2deg' }],
  },
  portraitCard: {
    width: 118,
    height: 235,
    right: -22,
    top: 124,
    zIndex: 7,
    transform: [{ rotate: '4deg' }],
  },
  photoProBadge: {
    position: 'absolute',
    top: 10,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accentYellow,
    backgroundColor: 'rgba(8,8,8,0.90)',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  photoProText: { fontSize: 11, fontWeight: '900', color: '#FFE07A' },
  benefitsRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  benefit: { width: '32%', alignItems: 'center' },
  benefitIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,196,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTitle: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 9,
  },
  benefitDetail: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    color: '#A6A5AD',
    textAlign: 'center',
    marginTop: 2,
  },
  panel: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 12 },
  testBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.accentYellowSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  testText: { ...typography.overline, color: colors.accentYellow, fontSize: 9 },
  plan: {
    minHeight: 78,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: '#171719',
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 9,
  },
  planSelected: {
    borderColor: colors.accentYellow,
    borderWidth: 2,
    backgroundColor: '#211A06',
  },
  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#9697A0',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioSelected: { backgroundColor: colors.accentYellow, borderColor: colors.accentYellow },
  planCopy: { flex: 1, minWidth: 0 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  planTitle: { fontSize: 20, lineHeight: 24, fontWeight: '800', color: colors.textPrimary },
  planNote: { ...typography.caption, color: '#8F8F95', marginTop: 4 },
  planNoteSelected: { color: '#F0C45A' },
  price: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'right',
    width: 116,
  },
  priceSelected: { color: '#FFE18A' },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.pill,
    backgroundColor: '#F6C54A',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  featuredText: { fontSize: 9, lineHeight: 11, fontWeight: '900', color: colors.background },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  statusText: { ...typography.caption, color: colors.textSecondary },
  warning: { ...typography.caption, color: '#F4C85D', lineHeight: 18, textAlign: 'center' },
  errorBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,196,0,0.25)',
    backgroundColor: 'rgba(255,196,0,0.07)',
    padding: 12,
    marginBottom: 10,
  },
  retryButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  retryText: { ...typography.label, color: colors.accentYellow },
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.accentYellow,
    backgroundColor: '#211A06',
    padding: 16,
  },
  activeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCopy: { flex: 1 },
  activeTitle: { ...typography.h3, color: colors.textPrimary },
  cta: { marginTop: 15, borderRadius: radii.pill, overflow: 'hidden', ...shadows.yellow },
  ctaGradient: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  ctaText: { fontSize: 20, lineHeight: 24, fontWeight: '900', color: colors.background },
  freeButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  freeText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: '#A7A7AE',
    textDecorationLine: 'underline',
  },
  finePrint: {
    ...typography.caption,
    color: '#817A69',
    lineHeight: 17,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  footerLinks: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 4,
  },
  footerLink: { ...typography.caption, color: '#9C9CA3' },
  separator: { ...typography.caption, color: '#5E5E63' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
});
