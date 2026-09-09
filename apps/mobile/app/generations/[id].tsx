import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppHeader, Icon, PrimaryButton, Screen } from '@/components';
import { colors, gradients, radii, spacing, typography } from '@/theme';

export default function GenerationDetailScreen() {
  const router = useRouter();
  return (
    <Screen contentContainerStyle={styles.content}>
      <AppHeader back title="Üretim" subtitle="Sonuçlar hazır" />
      <LinearGradient colors={gradients.midnight} style={styles.card}>
        <View style={styles.icon}>
          <Icon name="checkmark" size={31} color={colors.background} />
        </View>
        <Text style={styles.title}>Karelerin hazır.</Text>
        <Text style={styles.text}>
          2 varyasyon oluşturuldu ve projen olarak güvenle kaydedildi.
        </Text>
        <PrimaryButton
          label="Sonuçları görüntüle"
          icon="images-outline"
          onPress={() => router.replace('/generations/demo/results' as never)}
          style={styles.button}
        />
      </LinearGradient>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 42 },
  card: {
    minHeight: 330,
    marginTop: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  icon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { ...typography.h1, color: colors.textPrimary, textAlign: 'center' },
  text: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 7 },
  button: { alignSelf: 'stretch', marginTop: spacing.xl },
});
