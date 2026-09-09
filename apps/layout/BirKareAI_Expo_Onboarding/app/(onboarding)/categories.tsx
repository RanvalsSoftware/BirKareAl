import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryCard } from '@/src/components/CategoryCard';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { StepDots } from '@/src/components/StepDots';
import { useOnboarding } from '@/src/context/OnboardingContext';
import { categories } from '@/src/data/categories';
import { colors } from '@/src/theme/colors';

export default function CategoriesScreen() {
  const { selectedCategoryId, setSelectedCategoryId } = useOnboarding();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <ScreenHeader onSkip={() => router.replace('/(auth)/login')} step="3 / 5" title="Sahne seçimi" />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(480)}>
            <Text accessibilityRole="header" style={styles.title}>Nasıl bir kare{`\n`}oluşturmak istersin?</Text>
            <Text style={styles.subtitle}>Bir kategori seç. Uygulama daha sonra o kategoriye uygun sahne, kompozisyon ve filtre seçeneklerini gösterecek.</Text>
          </Animated.View>

          <ScrollView contentContainerStyle={styles.cards} horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((item, index) => (
              <Animated.View entering={FadeInDown.delay(100 + index * 75).duration(470)} key={item.id}>
                <CategoryCard
                  item={item}
                  onPress={() => {
                    setSelectedCategoryId(item.id);
                    void Haptics.selectionAsync();
                  }}
                  selected={item.id === selectedCategoryId}
                />
              </Animated.View>
            ))}
          </ScrollView>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Seçili kategori</Text>
            <Text style={styles.infoValue}>{categories.find((item) => item.id === selectedCategoryId)?.title}</Text>
            <Text style={styles.infoText}>{selectedCategoryId === 'fan-selfie' ? 'Fan sahnelerinde yalnızca özgün veya gerekli kullanım hakları doğrulanmış karakterler kullanılmalıdır.' : 'Bu seçim onboarding demosunda saklanır ve filtre önerilerini kişiselleştirmek için kullanılabilir.'}</Text>
          </View>
        </ScrollView>

        <View style={styles.bottom}>
          <StepDots active={2} total={5} />
          <PrimaryButton label="Filtreleri dene" onPress={() => router.push('/(onboarding)/filters')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },
  content: { paddingBottom: 26, paddingTop: 22 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', letterSpacing: -1.15, lineHeight: 36 },
  subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 11 },
  cards: { gap: 12, paddingRight: 20, paddingTop: 26 },
  infoBox: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, marginTop: 22, padding: 16 },
  infoTitle: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  infoValue: { color: colors.accent, fontSize: 16, fontWeight: '900', marginTop: 6 },
  infoText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 8 },
  bottom: { gap: 15, paddingBottom: 8, paddingTop: 10 },
});
