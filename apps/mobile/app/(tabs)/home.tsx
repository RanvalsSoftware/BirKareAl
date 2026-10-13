import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { apiBaseUrl } from '@/api/client';
import { useAuthStore, type AuthUser } from '@/features/auth/auth-store';
import { useAvailableCredits } from '@/features/billing/use-wallet';
import { useUserProjects } from '@/features/projects/use-user-projects';
import { useCopy } from '@/features/settings/language-store';
import { commerceGoals, type CommerceGoalDefinition } from '@/features/studio/commerceGoals';
import { resetProductStudioFlow, updateProductStudioFlow } from '@/features/studio/productFlow';
import { getLocale as getAppLocale } from '@/i18n/engine';
import { useLanguageRevision } from '@/i18n/use-language';
import { brand } from '@/theme/brand';
import { BrandNav, CreditBadge, Page, PrimaryAction, TabHeader, useLayout } from '@/ui/kit';

const heroPhotograph = require('../../assets/products/ui/hero-tote.webp');

const goalArtwork: Record<CommerceGoalDefinition['id'], ImageSourcePropType> = {
  marketplace: require('../../assets/products/ui/categories/shoes.webp'),
  'product-page': require('../../assets/products/ui/categories/cosmetics.webp'),
  'social-ad': require('../../assets/products/ui/categories/handbag.webp'),
  'web-hero': require('../../assets/products/ui/product-shoot.webp'),
};

const WORKSPACE_WIDTH = 1120;
const GRID_GAP = 12;

function displayFirstName(user: AuthUser | null): string | null {
  const firstName = user?.firstName?.trim();
  if (firstName) return firstName;
  const emailPrefix = user?.email
    .split('@')[0]
    ?.replace(/[._-]+/g, ' ')
    .trim();
  return emailPrefix
    ? emailPrefix.charAt(0).toLocaleUpperCase(getAppLocale()) + emailPrefix.slice(1)
    : null;
}

function outputUri(assetId: string | null): string | null {
  return assetId ? `${apiBaseUrl}/v1/assets/${encodeURIComponent(assetId)}/content` : null;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(getAppLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default function HomeScreen() {
  useLanguageRevision();
  const copy = useCopy();
  const router = useRouter();
  const user = useAuthStore((store) => store.user);
  const accessToken = useAuthStore((store) => store.accessToken);
  const availableCredits = useAvailableCredits();
  const projectsQuery = useUserProjects();
  const firstName = displayFirstName(user);
  const { wide, width, gutter } = useLayout();
  const columns = wide ? 4 : 2;
  const contentWidth = Math.min(width - gutter * 2, WORKSPACE_WIDTH);
  const tileWidth = Math.floor((contentWidth - GRID_GAP * (columns - 1)) / columns);
  const recentProjects = (projectsQuery.data ?? [])
    .filter((project) => project.mode === 'PRODUCT_STUDIO')
    .slice(0, 4);

  function startProject() {
    resetProductStudioFlow();
    router.push('/studio/product' as never);
  }

  /** Skips the "where will you use it" step: the shortcut already answers it. */
  function startWithGoal(goal: CommerceGoalDefinition) {
    resetProductStudioFlow();
    updateProductStudioFlow({
      commerceGoal: goal.id,
      sceneId: goal.sceneId,
      aspectRatio: goal.aspectRatio,
      numberOfImages: 2,
    });
    router.push({ pathname: '/studio/product', params: { entry: goal.id } } as never);
  }

  const goalCards = commerceGoals.map((goal) => (
    <Pressable
      accessibilityHint={copy(goal.descriptionTr, goal.descriptionEn)}
      accessibilityLabel={`${copy(goal.titleTr, goal.titleEn)}, ${goal.aspectRatio}`}
      accessibilityRole="button"
      key={goal.id}
      onPress={() => startWithGoal(goal)}
      style={({ pressed }) => [wide ? styles.goalWide : styles.goal, pressed && styles.pressed]}
    >
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={goalArtwork[goal.id]}
        style={[styles.goalImage, wide && styles.goalImageWide]}
      />
      <View style={styles.tileCopy}>
        <Text numberOfLines={2} style={styles.tileTitle}>
          {copy(goal.titleTr, goal.titleEn)}
        </Text>
        <Text style={styles.tileMeta}>{goal.aspectRatio}</Text>
      </View>
    </Pressable>
  ));

  return (
    <Page width="workspace">
      <BrandNav
        trailing={
          <CreditBadge
            accessibilityLabel={copy(
              `${availableCredits} kredi, kredileri aç`,
              `${availableCredits} credits, open credits`,
            )}
            amount={availableCredits}
            onPress={() => router.push('/(tabs)/credits' as never)}
          />
        }
      />
      <TabHeader
        subtitle={
          firstName
            ? copy(`Merhaba, ${firstName}`, `Hello, ${firstName}`)
            : copy('Merhaba', 'Hello')
        }
        title={copy('Stüdyo', 'Studio')}
      />

      <View style={[styles.hero, wide && styles.heroWide]}>
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel={copy(
            'Taş bir kaide üzerinde keten çanta örnek ürün fotoğrafı',
            'Sample product photo of a linen bag on a stone plinth',
          )}
          resizeMode="cover"
          source={heroPhotograph}
          style={wide ? styles.heroImageWide : styles.heroImage}
        />
        <View style={[styles.heroBody, wide && styles.heroBodyWide]}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>
              {copy('Tek fotoğraf, dört satış formatı.', 'One photo, four sales formats.')}
            </Text>
            <Text style={styles.heroSubtitle}>
              {copy(
                'Katalog, ürün sayfası, sosyal ilan ve web vitrini için tutarlı alternatifler üret.',
                'Create consistent alternatives for catalogs, product pages, social ads, and web heroes.',
              )}
            </Text>
          </View>
          <PrimaryAction
            icon="camera"
            label={copy('Yeni ürün çekimi', 'New product shoot')}
            onPress={startProject}
            style={wide ? styles.heroActionWide : undefined}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeading
          subtitle={copy(
            'Görseli nerede kullanacaksan oradan başla.',
            'Start from where the image will be used.',
          )}
          title={copy('Hızlı başlat', 'Quick start')}
        />
        {wide ? (
          <View style={styles.goalRow}>{goalCards}</View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.goalShelf, { paddingHorizontal: gutter }]}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -gutter }}
          >
            {goalCards}
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeading
          action={
            recentProjects.length ? (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => router.push('/(tabs)/projects' as never)}
                style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
              >
                <Text style={styles.seeAllText}>{copy('Tümünü gör', 'See all')}</Text>
                <Ionicons color={brand.gold} name="chevron-forward" size={15} />
              </Pressable>
            ) : null
          }
          title={copy('Son projeler', 'Recent projects')}
        />

        {projectsQuery.isLoading ? (
          <View style={styles.grid}>
            {Array.from({ length: columns }, (_, index) => (
              <View key={index} style={[styles.projectVisual, { width: tileWidth }]} />
            ))}
          </View>
        ) : recentProjects.length ? (
          <View style={styles.grid}>
            {recentProjects.map((project) => {
              const source = outputUri(project.outputAssetId);
              const title = project.title?.trim() || copy('Ürün projesi', 'Product project');
              return (
                <Pressable
                  accessibilityLabel={title}
                  accessibilityRole="button"
                  key={project.id}
                  onPress={() => router.push(`/projects/${project.id}` as never)}
                  style={({ pressed }) => [{ width: tileWidth }, pressed && styles.pressed]}
                >
                  <View style={styles.projectVisual}>
                    {source ? (
                      <Image
                        accessibilityIgnoresInvertColors
                        resizeMode="cover"
                        source={{
                          uri: source,
                          headers: accessToken
                            ? { authorization: `Bearer ${accessToken}` }
                            : undefined,
                        }}
                        style={StyleSheet.absoluteFill}
                      />
                    ) : (
                      <Ionicons color={brand.textMuted} name="hourglass-outline" size={28} />
                    )}
                  </View>
                  <View style={styles.tileCopy}>
                    <Text numberOfLines={1} style={styles.tileTitle}>
                      {title}
                    </Text>
                    <Text numberOfLines={1} style={styles.tileMeta}>
                      {source ? formatDate(project.updatedAt) : copy('Hazırlanıyor', 'Preparing')}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons color={brand.textMuted} name="images-outline" size={28} />
            <Text style={styles.emptyTitle}>{copy('Henüz proje yok', 'No projects yet')}</Text>
            <Text style={styles.emptyText}>
              {copy(
                'İlk ürün çekimin, sahneleri ve alternatifleriyle birlikte burada görünecek.',
                'Your first product shoot will appear here with its scenes and alternatives.',
              )}
            </Text>
          </View>
        )}
      </View>
    </Page>
  );
}

function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: brand.surface,
    borderRadius: 24,
    overflow: 'hidden',
  },
  heroWide: { flexDirection: 'row-reverse' },
  heroImage: { aspectRatio: 3 / 2, height: undefined, width: '100%' },
  heroImageWide: { flex: 1.1, height: '100%', minHeight: 340, width: undefined },
  heroBody: { gap: 20, padding: 20 },
  heroBodyWide: { flex: 1, justifyContent: 'center', padding: 32 },
  heroCopy: { gap: 8 },
  heroActionWide: { alignSelf: 'flex-start', minWidth: 280 },
  heroTitle: { color: brand.text, fontSize: 28, fontWeight: '700', lineHeight: 34 },
  heroSubtitle: { color: brand.textSecondary, fontSize: 15, lineHeight: 21 },
  section: { gap: 14, marginTop: 8 },
  sectionHeader: { alignItems: 'flex-end', flexDirection: 'row', gap: 12 },
  sectionCopy: { flex: 1, gap: 2, minWidth: 0 },
  sectionTitle: { color: brand.text, fontSize: 22, fontWeight: '700', lineHeight: 28 },
  sectionSubtitle: { color: brand.textSecondary, fontSize: 15, lineHeight: 20 },
  seeAll: { alignItems: 'center', flexDirection: 'row', gap: 2, minHeight: 28 },
  seeAllText: { color: brand.gold, fontSize: 15 },
  goalShelf: { gap: GRID_GAP },
  goalRow: { flexDirection: 'row', gap: GRID_GAP },
  goal: { width: 148 },
  goalWide: { flex: 1 },
  goalImage: {
    aspectRatio: 1,
    backgroundColor: brand.surfaceRaised,
    borderRadius: 16,
    height: undefined,
    width: '100%',
  },
  goalImageWide: { aspectRatio: 3 / 2 },
  tileCopy: { gap: 2, paddingHorizontal: 2, paddingTop: 8 },
  tileTitle: { color: brand.text, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  tileMeta: {
    color: brand.textSecondary,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    lineHeight: 18,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, rowGap: 18 },
  projectVisual: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: brand.surface,
    borderRadius: 16,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: brand.surface,
    borderRadius: 20,
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  emptyTitle: { color: brand.text, fontSize: 17, fontWeight: '600', marginTop: 4 },
  emptyText: { color: brand.textSecondary, fontSize: 15, lineHeight: 20, textAlign: 'center' },
  pressed: { opacity: 0.65 },
});
