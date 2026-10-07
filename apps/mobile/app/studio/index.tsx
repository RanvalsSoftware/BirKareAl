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
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components';
import { useCopy } from '@/features/settings/language-store';
import {
  commerceGoals,
  commerceGoalById,
  type CommerceGoalDefinition,
} from '@/features/studio/commerceGoals';
import { resetProductStudioFlow, updateProductStudioFlow } from '@/features/studio/productFlow';
import { spacing } from '@/theme';

const goalArtwork: Record<CommerceGoalDefinition['id'], ImageSourcePropType> = {
  marketplace: require('../../assets/products/ui/scenes/white-studio.webp'),
  'product-page': require('../../assets/products/ui/scenes/beige-premium.webp'),
  'social-ad': require('../../assets/products/ui/scenes/ad-poster.webp'),
  'web-hero': require('../../assets/products/ui/scenes/desktop.webp'),
};

export default function StudioHomeScreen() {
  const router = useRouter();
  const copy = useCopy();
  const { width } = useWindowDimensions();
  const tablet = width >= 768;

  function openGoal(goalId: CommerceGoalDefinition['id']) {
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
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.page}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel={copy('Geri', 'Back')}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace('/(tabs)/home' as never)
              }
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <Icon name="chevron-back" size={24} color="#EEF5F0" />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>
                {copy('Yeni ürün projesi', 'New product project')}
              </Text>
              <Text style={styles.headerSubtitle}>
                {copy('Önce kullanım amacını seç', 'Start with the intended use')}
              </Text>
            </View>
          </View>

          <View style={styles.intro}>
            <View style={styles.introIcon}>
              <Icon name="scan-outline" size={28} color="#B8F1CD" />
            </View>
            <View style={styles.introCopy}>
              <Text style={styles.introTitle}>
                {copy(
                  'Bir fotoğraf, düzenli bir ürün akışı',
                  'One photo, one organized product workflow',
                )}
              </Text>
              <Text style={styles.introBody}>
                {copy(
                  'Seçimin ilk sahneyi ve oranı hazırlar. Sonraki adımda her ayarı değiştirebilirsin.',
                  'Your choice prepares the first scene and ratio. You can change every setting next.',
                )}
              </Text>
            </View>
          </View>

          <View style={[styles.grid, tablet && styles.gridTablet]}>
            {commerceGoals.map((goal) => (
              <Pressable
                accessibilityRole="button"
                key={goal.id}
                onPress={() => openGoal(goal.id)}
                style={({ pressed }) => [
                  styles.card,
                  tablet && styles.cardTablet,
                  pressed && styles.pressed,
                ]}
              >
                <Image source={goalArtwork[goal.id]} resizeMode="cover" style={styles.cardImage} />
                <View style={styles.cardBody}>
                  <View style={styles.cardIcon}>
                    <Icon name={goal.icon} size={19} color="#B8F1CD" />
                  </View>
                  <View style={styles.cardCopy}>
                    <Text style={styles.cardTitle}>{copy(goal.titleTr, goal.titleEn)}</Text>
                    <Text style={styles.cardDescription}>
                      {copy(goal.descriptionTr, goal.descriptionEn)}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {copy('Başlangıç formatı', 'Starting format')} · {goal.aspectRatio}
                    </Text>
                  </View>
                  <Icon name="arrow-forward" size={20} color="#839087" />
                </View>
              </Pressable>
            ))}
          </View>

          <View style={styles.assurance}>
            <Icon name="shield-checkmark-outline" size={21} color="#B8F1CD" />
            <Text style={styles.assuranceText}>
              {copy(
                'Ürün kategorisi, sahne, kalite, alternatif sayısı ve kredi tutarı oluşturma öncesinde açıkça gösterilir.',
                'Category, scene, quality, alternative count, and credit cost are shown before generation.',
              )}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#0B0F0D', flex: 1 },
  scrollContent: { paddingBottom: 50, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  page: { alignSelf: 'center', maxWidth: 1040, width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 58 },
  backButton: {
    alignItems: 'center',
    borderColor: '#29332E',
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerCopy: { flex: 1 },
  headerTitle: { color: '#F2F7F4', fontSize: 21, fontWeight: '800' },
  headerSubtitle: { color: '#849088', fontSize: 12, marginTop: 2 },
  intro: {
    alignItems: 'center',
    backgroundColor: '#15201B',
    borderColor: '#2A3D33',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginTop: 20,
    padding: 17,
  },
  introIcon: {
    alignItems: 'center',
    backgroundColor: '#1D3026',
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  introCopy: { flex: 1 },
  introTitle: { color: '#EDF5F0', fontSize: 17, fontWeight: '800' },
  introBody: { color: '#96A39B', fontSize: 13, lineHeight: 19, marginTop: 4 },
  grid: { gap: 12, marginTop: 18 },
  gridTablet: { flexDirection: 'row', flexWrap: 'wrap' },
  card: {
    backgroundColor: '#111815',
    borderColor: '#28342D',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardTablet: { flexBasis: '48%', flexGrow: 1, minWidth: 360 },
  cardImage: { height: 150, width: '100%' },
  cardBody: { alignItems: 'center', flexDirection: 'row', gap: 12, padding: 15 },
  cardIcon: {
    alignItems: 'center',
    backgroundColor: '#1C2D25',
    borderRadius: 13,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  cardCopy: { flex: 1 },
  cardTitle: { color: '#EEF5F0', fontSize: 16, fontWeight: '800' },
  cardDescription: { color: '#909D95', fontSize: 12, lineHeight: 17, marginTop: 3 },
  cardMeta: { color: '#B8F1CD', fontSize: 11, fontWeight: '700', marginTop: 7 },
  assurance: {
    alignItems: 'center',
    borderColor: '#28342D',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    marginTop: 20,
    padding: 15,
  },
  assuranceText: { color: '#909D95', flex: 1, fontSize: 12, lineHeight: 18 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
