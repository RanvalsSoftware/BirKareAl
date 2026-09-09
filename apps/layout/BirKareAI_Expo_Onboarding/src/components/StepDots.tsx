import { StyleSheet, View } from 'react-native';

import { colors } from '@/src/theme/colors';

type StepDotsProps = {
  total: number;
  active: number;
  accessibilityLabel?: string;
};

export function StepDots({ total, active, accessibilityLabel }: StepDotsProps) {
  return (
    <View accessibilityLabel={accessibilityLabel ?? `Adım ${active + 1} / ${total}`} style={styles.row}>
      {Array.from({ length: total }, (_, index) => (
        <View key={index} style={[styles.dot, index === active && styles.active]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: 7, justifyContent: 'center' },
  dot: { backgroundColor: '#3A3A3F', borderRadius: 4, height: 6, width: 6 },
  active: { backgroundColor: colors.accent, width: 24 },
});
