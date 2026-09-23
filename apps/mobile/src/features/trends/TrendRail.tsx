import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme';
import { featuredTrends } from './catalog';
import { isEightiesTrend, type TrendPresetId } from './presets';

export function TrendRail({
  selected,
  onSelect,
}: {
  selected?: TrendPresetId | null;
  onSelect: (id: TrendPresetId) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
    >
      {featuredTrends.map((trend, index) => {
        const isSelected =
          selected === trend.id || (trend.id === 'pop_icon_80s' && isEightiesTrend(selected));
        return (
          <Pressable
            key={trend.id}
            accessibilityRole="button"
            accessibilityLabel={`${trend.name}. ${trend.description}`}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(trend.id)}
            style={({ pressed }) => [
              styles.card,
              isSelected && styles.selected,
              pressed && styles.pressed,
            ]}
          >
            <Image source={trend.source} style={styles.image} resizeMode="cover" />
            <LinearGradient colors={['transparent', 'rgba(5,5,5,.94)']} style={styles.shade} />
            <View style={styles.number}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>
            <View style={styles.copy}>
              <Text style={styles.name}>{trend.name}</Text>
              <Text style={styles.hint} numberOfLines={2}>
                {trend.description}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  rail: { gap: 12, paddingVertical: 8, paddingRight: 4 },
  card: {
    width: 170,
    height: 220,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.2)',
    backgroundColor: '#161418',
    overflow: 'hidden',
  },
  selected: { borderWidth: 2, borderColor: colors.accentYellow },
  pressed: { opacity: 0.76 },
  image: { width: '100%', height: '100%' },
  shade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 105 },
  number: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 15,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B0A09C9',
    borderWidth: 1,
    borderColor: '#FFFFFF80',
  },
  numberText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  copy: { position: 'absolute', bottom: 13, left: 12, right: 10 },
  name: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  hint: { color: '#D4CFCC', fontSize: 11, lineHeight: 15 },
});
