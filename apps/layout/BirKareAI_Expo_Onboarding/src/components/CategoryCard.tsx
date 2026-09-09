import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CategoryItem } from '@/src/data/categories';
import { colors } from '@/src/theme/colors';
import { radius } from '@/src/theme/metrics';

type CategoryCardProps = {
  item: CategoryItem;
  selected: boolean;
  onPress: () => void;
};

export function CategoryCard({ item, selected, onPress }: CategoryCardProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed]}
    >
      <Image contentFit="cover" source={item.image} style={StyleSheet.absoluteFill} transition={180} />
      <LinearGradient colors={['transparent', 'rgba(5,5,5,0.22)', 'rgba(5,5,5,0.98)']} locations={[0.24, 0.48, 1]} style={StyleSheet.absoluteFill} />
      {item.badge ? (
        <View style={styles.badge}><Text style={styles.badgeText}>{item.badge}</Text></View>
      ) : null}
      {selected ? (
        <View style={styles.check}><Ionicons color={colors.black} name="checkmark" size={16} /></View>
      ) : null}
      <View style={styles.copy}>
        <Text style={styles.title}>{item.title}</Text>
        <Text numberOfLines={2} style={styles.description}>{item.description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, height: 246, overflow: 'hidden', position: 'relative', width: 184 },
  selected: { borderColor: colors.accent, borderWidth: 2 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  badge: { backgroundColor: colors.accent, borderRadius: 999, left: 12, paddingHorizontal: 9, paddingVertical: 5, position: 'absolute', top: 12 },
  badgeText: { color: colors.black, fontSize: 10, fontWeight: '900' },
  check: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 16, height: 30, justifyContent: 'center', position: 'absolute', right: 12, top: 12, width: 30 },
  copy: { bottom: 0, left: 0, padding: 15, position: 'absolute', right: 0 },
  title: { color: colors.text, fontSize: 16, fontWeight: '900', letterSpacing: -0.4, lineHeight: 20 },
  description: { color: colors.textSecondary, fontSize: 11, lineHeight: 15, marginTop: 6 },
});
