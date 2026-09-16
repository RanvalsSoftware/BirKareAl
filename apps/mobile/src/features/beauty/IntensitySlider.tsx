import { useMemo, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components';
import { colors } from '@/theme';

/** Native responder + accessibility adjustments; dragging never triggers a network request. */
export function IntensitySlider({
  value,
  onChange,
  disabled = false,
  label = 'Güzellik yoğunluğu',
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
}) {
  const [width, setWidth] = useState(1);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !disabled && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: (event) =>
          onChange(
            Math.max(
              0,
              Math.min(100, Math.round((event.nativeEvent.locationX / width) * 100)),
            ),
          ),
        onPanResponderMove: (event) =>
          onChange(
            Math.max(
              0,
              Math.min(100, Math.round((event.nativeEvent.locationX / width) * 100)),
            ),
          ),
      }),
    [disabled, onChange, width],
  );
  return (
    <View style={[styles.row, disabled && styles.disabled]}>
      <Pressable
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Yoğunluğu azalt"
        onPress={() => onChange(Math.max(0, value - 5))}
        style={styles.adjust}
      >
        <Icon name="remove" size={18} />
      </Pressable>
      <View
        style={styles.hitArea}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        {...responder.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        accessibilityValue={{ min: 0, max: 100, now: value, text: `Yüzde ${value}` }}
        accessibilityActions={[
          { name: 'increment', label: 'Artır' },
          { name: 'decrement', label: 'Azalt' },
        ]}
        onAccessibilityAction={(event) => {
          if (!disabled)
            onChange(
              Math.max(
                0,
                Math.min(100, value + (event.nativeEvent.actionName === 'increment' ? 5 : -5)),
              ),
            );
        }}
      >
        <View pointerEvents="none" style={styles.track}>
          <LinearGradient
            colors={['#8F6920', '#FFE08C', '#FFC400']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fill, { width: `${value}%` }]}
          />
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            { left: Math.max(0, Math.min(width - 24, (value / 100) * (width - 24))) },
          ]}
        />
      </View>
      <Pressable
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Yoğunluğu artır"
        onPress={() => onChange(Math.min(100, value + 5))}
        style={styles.adjust}
      >
        <Text style={styles.plus}>+</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  disabled: { opacity: 0.4 },
  adjust: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  plus: { fontSize: 26, color: '#fff' },
  hitArea: { height: 48, flex: 1, justifyContent: 'center' },
  track: { height: 5, backgroundColor: '#353332', borderRadius: 3, overflow: 'hidden' },
  fill: { height: 5 },
  thumb: {
    position: 'absolute',
    height: 24,
    width: 24,
    borderRadius: 12,
    backgroundColor: '#FFF1CB',
    borderWidth: 3,
    borderColor: colors.accentYellow,
    shadowColor: '#FBC02D',
    shadowOpacity: 0.55,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
  },
});
