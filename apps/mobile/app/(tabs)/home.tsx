import { getLocale as getAppLocale } from '@/i18n/engine';
import { useLanguageRevision } from '@/i18n/use-language';
import { useRouter } from 'expo-router';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiBaseUrl } from '@/api/client';
import { CreditBadge, Icon } from '@/components';
import { useAuthStore, type AuthUser } from '@/features/auth/auth-store';
import { useAvailableCredits } from '@/features/billing/use-wallet';
import { useUserProjects } from '@/features/projects/use-user-projects';
import {
  commerceGoals,
  commerceGoalById,
  type CommerceGoalDefinition,
} from '@/features/studio/commerceGoals';
import {
  resetProductStudioFlow,
  updateProductStudioFlow,
} from '@/features/studio/productFlow';
import { useCopy } from '@/features/settings/language-store';
import { colors, radii, spacing, typography } from '@/theme';

const goalArtwork: Record<CommerceGoalDefinition['id'], ImageSourcePropType> = {
  marketplace: require('../../assets/products/ui/scenes/white-studio.webp'),
  'product-page': require('../../assets/products/ui/product-shoot.webp'),
  'social-ad': require('../../assets/products/ui/scenes/ad-poster.webp'),
  'web-hero': require('../../assets/products/ui/scenes/desktop.webp'),
};

function displayFirstName(user: AuthUser | null): string | null {
  const firstName = user?.firstName?.trim();
  if (firstName) return firstName;
  const emailPrefix = user?.email.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
  return emailPrefix
    ? emailPrefix.charAt(0).toLocaleUpperCase(getAppLocale()) + emailPrefix.slice(1)
    : null;
}

function projectOutputUri(assetId: string | null): string | null {
  return assetId ? `${apiBaseUrl}/v1/assets/${encodeURIComponent(assetId)}/content` : null;
}

export default function HomeScreen() {
  useLanguageRevision();
  const copy = useCopy();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tablet = width >= 768;
  const user = useAuthStore((store) => store.user);
  const accessToken = useAuthStore((store) => store.accessToken);
  const availableCredits = useAvailableCredits();
  const projectsQuery = useUserProjects();
  const firstName = displayFirstName(user);
  const recentProducts = (projectsQuery.data ?? [])
    .filter((project) => project.mode === 'PRODUCT_STUDIO')
    .slice(0, tablet ? 4 : 3);

  function startGoal(goalId: CommerceGoalDefinition['id']) {
    const goal = commerceGoalById(goalId);
    resetProductStudioFlow();
    updateProductStudioFlow({
      commerceGoal: goal.id,
      sceneId: goal.sceneId,
      aspectRatio: goal.aspectRatio,
      numberOfImages: 2,
    });
    router.push({ pathname: '/studio/product', params: { entry: goal.id } } as never);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: insets.top + spacing.sm,
          paddingBottom: Math.max(insets.bottom, spacing.md) + 92,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.page}>
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Icon name="cube-outline" size={22} color="#0A2118" />
            </View>
            <View>
              <Text style={styles.brandName}>BirKare Studio</Text>
              <Text style={styles.brandCaption}>
                {copy('Ürün görsel çalışma alanın', 'Your product-image workspace')}
              </Text>
            </View>
          </View>
          <CreditBadge credits={availableCredits} />
        </View>

        <View style={[styles.hero, tablet && styles.heroTablet]}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>{copy('ÜRÜN STÜDYOSU', 'PRODUCT STUDIO')}</Text>
            <Text style={styles.heroTitle}>
              {firstName
                ? copy(
                    `${firstName}, ürününü satışa hazırla.`,
                    `${firstName}, get your product ready to sell.`,
                  )
                : copy('Ürününü satışa hazırla.', 'Get your product ready to sell.')}
            </Text>
            <Text style={styles.heroBody}>
              {copy(
                'Tek bir ürün fotoğrafından katalog, ürün sayfası ve kampanya alternatifleri üret.',
                'Turn one product photo into catalog, product-page, and campaign alternatives.',
              )}
            </Text>
            <View style={styles.heroActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => startGoal('marketplace')}
                style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
              >
                <Icon name="add" size={21} color="#0A2118" />
                <Text style={styles.primaryActionText}>
                  {copy('Yeni ürün çekimi', 'New product shoot')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/(tabs)/projects' as never)}
                style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryActionText}>
                  {copy('Kataloğu aç', 'Open catalog')}
                </Text>
                <Icon name="arrow-forward" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>
          <View style={[styles.heroVisual, tablet && styles.heroVisualTablet]}>
            <Image
              accessibilityIgnoresInvertColors
              source={require('../../assets/products/ui/catalog-shoot.webp')}
              resizeMode="cover"
              style={styles.heroImage}
            />
            <View style={styles.heroImageBadge}>
              <Icon name="shield-checkmark-outline" size={16} color="#C8F6D9" />
              <Text style={styles.heroImageBadgeText}>
                {copy('Ürün kimliğini koruyan akış', 'Product-preserving workflow')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.steps}>
          {[
            [copy('1 · Yükle', '1 · Upload'), copy('Net bir ürün fotoğrafı', 'One clear product photo')],
            [copy('2 · Planla', '2 · Plan'), copy('Amaç, sahne ve format', 'Goal, scene, and format')],
            [copy('3 · Üret', '3 · Generate'), copy('1, 2 veya 4 alternatif', '1, 2, or 4 alternatives')],
          ].map(([title, detail]) => (
            <View key={title} style={styles.step}>
              <Text style={styles.stepTitle}>{title}</Text>
              <Text style={styles.stepDetail}>{detail}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>
              {copy('Nerede kullanacaksın?', 'Where will you use it?')}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {copy(
                'Seçimin sahne ve format için başlangıç ayarını yapar.',
                'Your choice sets a starting scene and format.',
              )}
            </Text>
          </View>
        </View>

        <View style={[styles.goalGrid, tablet && styles.goalGridTablet]}>
          {commerceGoals.map((goal) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy(goal.titleTr, goal.titleEn)}
              key={goal.id}
              onPress={() => startGoal(goal.id)}
              style={({ pressed }) => [
                styles.goalCard,
                tablet && styles.goalCardTablet,
                pressed && styles.pressed,
              ]}
            >
              <Image source={goalArtwork[goal.id]} resizeMode="cover" style={styles.goalImage} />
              <View style={styles.goalCopy}>
                <View style={styles.goalIcon}>
                  <Icon name={goal.icon} size={18} color="#C8F6D9" />
                </View>
                <View style={styles.goalText}>
                  <Text style={styles.goalTitle}>{copy(goal.titleTr, goal.titleEn)}</Text>
                  <Text numberOfLines={2} style={styles.goalDescription}>
                    {copy(goal.descriptionTr, goal.descriptionEn)}
                  </Text>
                  <Text style={styles.goalMeta}>
                    {goal.aspectRatio} · {copy('2 alternatifle başla', 'Start with 2 alternatives')}
                  </Text>
                </View>
                <Icon name="chevron-forward" size={19} color={colors.textMuted} />
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>
              {copy('Son ürün projeleri', 'Recent product projects')}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {copy(
                'Çekimlerine ve versiyonlarına kaldığın yerden devam et.',
                'Continue your shoots and versions where you left off.',
              )}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/(tabs)/projects' as never)} hitSlop={8}>
            <Text style={styles.inlineAction}>{copy('Tümü', 'See all')}</Text>
          </Pressable>
        </View>

        {recentProducts.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.projectRail}
          >
            {recentProducts.map((project) => {
              const outputUri = projectOutputUri(project.outputAssetId);
              return (
                <Pressable
                  accessibilityRole="button"
                  key={project.id}
                  onPress={() => router.push(`/projects/${project.id}` as never)}
                  style={({ pressed }) => [styles.projectCard, pressed && styles.pressed]}
                >
                  {outputUri ? (
                    <Image
                      source={{
                        uri: outputUri,
                        headers: accessToken
                          ? { authorization: `Bearer ${accessToken}` }
                          : undefined,
                      }}
                      resizeMode="cover"
                      style={styles.projectImage}
                    />
                  ) : (
                    <View style={styles.projectPlaceholder}>
                      <Icon name="hourglass-outline" size={26} color={colors.textMuted} />
                    </View>
                  )}
                  <Text numberOfLines={1} style={styles.projectTitle}>
                    {project.title || copy('Ürün çekimi', 'Product shoot')}
                  </Text>
                  <Text style={styles.projectStatus}>
                    {project.outputAssetId
                      ? copy('Çıktı hazır', 'Output ready')
                      : copy('Hazırlanıyor', 'In progress')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => startGoal('product-page')}
            style={({ pressed }) => [styles.emptyCatalog, pressed && styles.pressed]}
          >
            <View style={styles.emptyIcon}>
              <Icon name="albums-outline" size={24} color="#C8F6D9" />
            </View>
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyTitle}>
                {copy('İlk ürününü kataloğa ekle', 'Add your first product to the catalog')}
              </Text>
              <Text style={styles.emptyDetail}>
                {copy(
                  'Ürün adı, kaynak fotoğrafı, sahne ve çıktı formatıyla düzenli bir proje oluştur.',
                  'Create an organized project with a product name, source photo, scene, and output format.',
                )}
              </Text>
            </View>
            <Icon name="arrow-forward" size={20} color={colors.textSecondary} />
          </Pressable>
        )}

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0F0D' },
  scrollContent: { paddingHorizontal: spacing.lg },
  page: { alignSelf: 'center', maxWidth: 1080, width: '100%' },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
  },
  brand: { alignItems: 'center', flexDirection: 'row', flexShrink: 1, gap: 11 },
  brandMark: {
    alignItems: 'center',
    backgroundColor: '#A9EBC2',
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  brandName: { color: '#F5F8F6', fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  brandCaption: { color: '#89958E', fontSize: 11, lineHeight: 15, marginTop: 1 },
  hero: {
    backgroundColor: '#15201B',
    borderColor: '#263A30',
    borderRadius: 28,
    borderWidth: 1,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  heroTablet: { flexDirection: 'row', minHeight: 390 },
  heroCopy: { flex: 1, justifyContent: 'center', padding: 24 },
  eyebrow: { ...typography.overline, color: '#A9EBC2' },
  heroTitle: {
    color: '#F5F8F6',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1.1,
    lineHeight: 40,
    marginTop: 13,
    maxWidth: 540,
  },
  heroBody: { color: '#B7C2BC', fontSize: 16, lineHeight: 24, marginTop: 13, maxWidth: 520 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 24 },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: '#A9EBC2',
    borderRadius: 15,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 18,
  },
  primaryActionText: { color: '#0A2118', fontSize: 15, fontWeight: '800' },
  secondaryAction: {
    alignItems: 'center',
    borderColor: '#3C5046',
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 17,
  },
  secondaryActionText: { color: '#F5F8F6', fontSize: 15, fontWeight: '700' },
  heroVisual: {
    borderRadius: 22,
    height: 245,
    margin: 8,
    marginTop: 0,
    overflow: 'hidden',
  },
  heroVisualTablet: { flex: 0.78, height: undefined, marginLeft: 0, marginTop: 8 },
  heroImage: { height: '100%', width: '100%' },
  heroImageBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(8,18,13,0.84)',
    borderColor: 'rgba(200,246,217,0.20)',
    borderRadius: 14,
    borderWidth: 1,
    bottom: 12,
    flexDirection: 'row',
    gap: 7,
    left: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
    position: 'absolute',
    right: 12,
  },
  heroImageBadgeText: { color: '#E6F1EA', flex: 1, fontSize: 12, fontWeight: '700' },
  steps: {
    backgroundColor: '#101613',
    borderColor: '#232E28',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 12,
    overflow: 'hidden',
  },
  step: { flex: 1, minWidth: 0, paddingHorizontal: 12, paddingVertical: 15 },
  stepTitle: { color: '#D9E3DD', fontSize: 12, fontWeight: '800' },
  stepDetail: { color: '#75837B', fontSize: 11, lineHeight: 15, marginTop: 3 },
  sectionHeading: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 13,
    marginTop: 30,
  },
  sectionTitle: { color: '#F5F8F6', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  sectionSubtitle: { color: '#89958E', fontSize: 13, lineHeight: 18, marginTop: 4 },
  inlineAction: { color: '#A9EBC2', fontSize: 14, fontWeight: '800', paddingBottom: 2 },
  goalGrid: { gap: 11 },
  goalGridTablet: { flexDirection: 'row', flexWrap: 'wrap' },
  goalCard: {
    backgroundColor: '#111815',
    borderColor: '#25322B',
    borderRadius: 21,
    borderWidth: 1,
    overflow: 'hidden',
  },
  goalCardTablet: { flexBasis: '48%', flexGrow: 1, minWidth: 340 },
  goalImage: { height: 126, width: '100%' },
  goalCopy: { alignItems: 'center', flexDirection: 'row', gap: 11, padding: 14 },
  goalIcon: {
    alignItems: 'center',
    backgroundColor: '#1C2D25',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  goalText: { flex: 1, minWidth: 0 },
  goalTitle: { color: '#EEF4F0', fontSize: 16, fontWeight: '800' },
  goalDescription: { color: '#909C95', fontSize: 12, lineHeight: 17, marginTop: 3 },
  goalMeta: { color: '#A9EBC2', fontSize: 11, fontWeight: '700', marginTop: 7 },
  projectRail: { gap: 11, paddingRight: spacing.lg },
  projectCard: {
    backgroundColor: '#111815',
    borderColor: '#25322B',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: 12,
    width: 174,
  },
  projectImage: { height: 145, width: '100%' },
  projectPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#18211D',
    height: 145,
    justifyContent: 'center',
    width: '100%',
  },
  projectTitle: {
    color: '#EEF4F0',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 10,
    paddingHorizontal: 11,
  },
  projectStatus: { color: '#849088', fontSize: 11, marginTop: 3, paddingHorizontal: 11 },
  emptyCatalog: {
    alignItems: 'center',
    backgroundColor: '#111815',
    borderColor: '#2A3B32',
    borderRadius: 20,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    padding: 17,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: '#1C2D25',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  emptyCopy: { flex: 1 },
  emptyTitle: { color: '#EDF4EF', fontSize: 15, fontWeight: '800' },
  emptyDetail: { color: '#87948C', fontSize: 12, lineHeight: 17, marginTop: 4 },
  legacyTools: {
    alignItems: 'center',
    borderColor: '#222B26',
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 30,
    padding: 15,
  },
  legacyIcon: {
    alignItems: 'center',
    backgroundColor: '#171D1A',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  legacyCopy: { flex: 1 },
  legacyTitle: { color: '#C1CBC5', fontSize: 14, fontWeight: '700' },
  legacyDetail: { color: '#707C75', fontSize: 11, lineHeight: 16, marginTop: 3 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
