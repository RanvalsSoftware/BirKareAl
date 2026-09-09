import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme/colors';

type ScreenHeaderProps = {
  step?: string;
  title?: string;
  showBack?: boolean;
  onSkip?: () => void;
};

export function ScreenHeader({ step, title, showBack = true, onSkip }: ScreenHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {showBack ? (
          <Pressable accessibilityLabel="Geri" accessibilityRole="button" hitSlop={12} onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons color={colors.text} name="arrow-back" size={22} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.center}>
        {step ? <Text style={styles.step}>{step}</Text> : null}
        {title ? <Text numberOfLines={1} style={styles.title}>{title}</Text> : null}
      </View>
      <View style={[styles.side, styles.right]}>
        {onSkip ? (
          <Pressable accessibilityRole="button" hitSlop={12} onPress={onSkip} style={styles.skipButton}>
            <Text style={styles.skip}>Geç</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 48 },
  side: { alignItems: 'flex-start', minWidth: 64 },
  right: { alignItems: 'flex-end' },
  center: { alignItems: 'center', flex: 1 },
  iconButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, height: 42, justifyContent: 'center', width: 42 },
  skipButton: { paddingHorizontal: 6, paddingVertical: 8 },
  skip: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  step: { color: colors.accent, fontSize: 11, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 14, fontWeight: '800', marginTop: 1 },
});
