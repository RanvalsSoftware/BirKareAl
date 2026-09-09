import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme/colors';

type BrandWordmarkProps = {
  compact?: boolean;
  centered?: boolean;
};

export function BrandWordmark({ compact = false, centered = false }: BrandWordmarkProps) {
  return (
    <View style={[styles.row, centered && styles.centered]}>
      <View style={[styles.mark, compact && styles.compactMark]}>
        <Text style={[styles.markText, compact && styles.compactMarkText]}>B</Text>
      </View>
      <Text style={[styles.wordmark, compact && styles.compactWordmark]}>
        BirKare <Text style={styles.accent}>AI</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  centered: { justifyContent: 'center' },
  mark: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.accentBorder,
    borderRadius: 13,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  compactMark: { borderRadius: 10, height: 34, width: 34 },
  markText: { color: colors.accent, fontSize: 21, fontWeight: '900' },
  compactMarkText: { fontSize: 17 },
  wordmark: { color: colors.text, fontSize: 21, fontWeight: '900', letterSpacing: -0.65 },
  compactWordmark: { fontSize: 18 },
  accent: { color: colors.accent },
});
