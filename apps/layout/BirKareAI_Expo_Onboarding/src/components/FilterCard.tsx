import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { FilterItem } from '@/src/data/filters';
import { colors } from '@/src/theme/colors';
import { radius } from '@/src/theme/metrics';

type FilterCardProps = {
  item: FilterItem;
  selected: boolean;
  onPress: () => void;
};

export function FilterCard({ item, selected, onPress }: FilterCardProps) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}>
      <View style={[styles.imageWrap, selected && styles.selected]}>
        <Image contentFit="cover" source={item.image} style={StyleSheet.absoluteFill} transition={160} />
        {selected ? <View style={styles.check}><Ionicons color={colors.black} name="checkmark" size={14} /></View> : null}
      </View>
      <Text numberOfLines={1} style={[styles.title, selected && styles.titleSelected]}>{item.title}</Text>
      <Text style={styles.meta}>{item.creditLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 108 },
  imageWrap: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, height: 132, overflow: 'hidden', position: 'relative', width: 108 },
  selected: { borderColor: colors.accent, borderWidth: 2 },
  check: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 14, height: 26, justifyContent: 'center', position: 'absolute', right: 8, top: 8, width: 26 },
  title: { color: colors.text, fontSize: 12, fontWeight: '800', marginTop: 9 },
  titleSelected: { color: colors.accent },
  meta: { color: colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: 3 },
  pressed: { opacity: 0.78 },
});
