import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components';
import { colors, typography } from '@/theme';
import { beautyOptions, type BeautyOption } from './catalog';
import { beautyIntensity, type BeautySettings, type BeautyOptionId } from './settings';

export function BeautyRail({
  options = beautyOptions,
  selectedId,
  settings,
  proUnlocked = false,
  onSelect,
}: {
  options?: BeautyOption[];
  selectedId?: BeautyOptionId;
  settings?: BeautySettings;
  proUnlocked?: boolean;
  onSelect: (option: BeautyOption) => void;
}) {
  return (
    <ScrollView
      horizontal
      style={styles.scroll}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
    >
      {options.map((option) => {
        const intensity = settings ? beautyIntensity(settings, option.id) : 0;
        // The gold ring means an applied layer, not merely the last inspected card.
        const selected = settings ? intensity > 0 : option.id === selectedId;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityLabel={`${option.number}. ${option.name}${option.isPro ? (proUnlocked ? ', PRO' : ', PRO kilitli') : ''}${intensity ? `, yoğunluk yüzde ${intensity}` : ''}`}
            accessibilityState={{ selected }}
            accessibilityHint={
              settings && (!option.isPro || proUnlocked)
                ? intensity > 0
                  ? 'Bu dokunuşu kaldırmak için dokun.'
                  : 'Bu dokunuşu uygulamak için dokun.'
                : undefined
            }
            onPress={() => onSelect(option)}
            style={({ pressed }) => [
              styles.card,
              selected && styles.selected,
              pressed && styles.pressed,
            ]}
          >
            <LinearGradient
              pointerEvents="none"
              colors={
                selected ? ['#403426', '#29231D', '#161513'] : ['#302A25', '#211E1B', '#141312']
              }
              style={StyleSheet.absoluteFill}
            />
            <Image source={option.source} style={styles.image} resizeMode="cover" />
            <LinearGradient colors={['transparent', 'rgba(5,5,5,.92)']} style={styles.shade} />
            <View style={styles.number}>
              <Text style={styles.numberText}>{option.number}</Text>
            </View>
            {option.isPro ? (
              <View style={styles.pro}>
                <Icon
                  name={proUnlocked ? 'sparkles' : 'lock-closed'}
                  size={9}
                  color={colors.accentYellow}
                />
                <Text style={styles.proText}>PRO</Text>
              </View>
            ) : null}
            <View style={styles.copy}>
              <Text numberOfLines={2} style={styles.name}>
                {option.name}
              </Text>
              <Text style={styles.caption}>
                {intensity
                  ? `%${intensity} aktif`
                  : settings
                    ? 'Kapalı · Dokun ve seç'
                    : 'Temsili görünüm'}
              </Text>
            </View>
            {intensity > 0 ? (
              <View style={styles.active}>
                <Icon name="checkmark" size={12} color={colors.background} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0 },
  rail: { gap: 10, paddingVertical: 8, paddingRight: 4 },
  card: {
    width: 124,
    height: 166,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#211E1B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.19)',
  },
  selected: { borderColor: colors.accentYellow, borderWidth: 2 },
  pressed: { opacity: 0.78 },
  image: { width: '100%', height: '100%', backgroundColor: 'transparent' },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 85 },
  number: {
    position: 'absolute',
    left: 8,
    top: 8,
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: 'rgba(8,8,8,.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  pro: {
    position: 'absolute',
    right: 7,
    top: 10,
    flexDirection: 'row',
    gap: 3,
    backgroundColor: '#19140CEB',
    padding: 4,
    borderRadius: 7,
  },
  proText: { fontSize: 9, fontWeight: '800', color: colors.accentYellow },
  copy: { position: 'absolute', bottom: 10, left: 10, right: 9 },
  name: { color: '#fff', fontSize: 12, fontWeight: '700', lineHeight: 15 },
  caption: { ...typography.caption, fontSize: 9, color: '#C9C5C0', marginTop: 3 },
  active: {
    position: 'absolute',
    top: 40,
    right: 9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accentYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
