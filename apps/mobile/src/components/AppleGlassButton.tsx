import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { type ComponentProps } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { GlassSurface } from './GlassSurface';

type AppleGlassButtonProps = {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  icon?: ComponentProps<typeof Ionicons>['name'];
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Real dark glass, a continuous thin rim and a recessed glass arrow lens. */
export function AppleGlassButton({
  label, onPress, disabled = false, loading = false, icon = 'arrow-forward',
  accessibilityHint, style, testID,
}: AppleGlassButtonProps) {
  const reducedMotion = useReducedMotion();
  const press = useSharedValue(0);
  const unavailable = disabled || loading;
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.025 }] }));
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: press.value * 2 }] }));

  function animate(pressed: boolean) {
    if (reducedMotion) { press.value = 0; return; }
    press.value = withSpring(pressed ? 1 : 0, { damping: 18, stiffness: 310, mass: 0.55 });
  }

  return (
    <Animated.View style={[styles.container, unavailable && styles.disabled, animatedStyle, style]}>
      <Pressable
        accessibilityRole="button" accessibilityLabel={label} accessibilityHint={accessibilityHint}
        accessibilityState={{ busy: loading, disabled: unavailable }}
        disabled={unavailable} testID={testID}
        onPressIn={() => animate(true)} onPressOut={() => animate(false)}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
          void onPress();
        }}
        style={styles.pressable}
      >
        <GlassSurface radius={44} tone="iridescent" glow={!unavailable} style={styles.surface} contentStyle={styles.content}>
          <View style={styles.labelWrap}>
            {loading ? <ActivityIndicator color="#FFFFFF" size="small" style={styles.loader} /> : null}
            <Text adjustsFontSizeToFit minimumFontScale={0.76} numberOfLines={1} style={styles.label}>
              {loading ? 'Hazırlanıyor…' : label}
            </Text>
          </View>
          {!loading ? (
            <Animated.View style={[styles.arrowWrap, arrowStyle]}>
              <GlassSurface radius={32} tone="iridescent" glow={false} style={styles.arrow} contentStyle={styles.arrowContent}>
                <Ionicons color="#FFFFFF" name={icon} size={30} />
              </GlassSurface>
            </Animated.View>
          ) : null}
        </GlassSurface>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', minHeight: 80, borderRadius: 44 },
  disabled: { opacity: 0.42 },
  pressable: { flex: 1, borderRadius: 44 },
  surface: { flex: 1, minHeight: 80 },
  content: { flex: 1, minHeight: 80, justifyContent: 'center', paddingLeft: 24, paddingRight: 83, paddingVertical: 18 },
  labelWrap: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  label: { color: '#FFFFFF', fontSize: 21, fontWeight: '600', letterSpacing: -0.3, textAlign: 'center' },
  loader: { marginRight: 8 },
  arrowWrap: { position: 'absolute', right: 10, top: 9, bottom: 9, justifyContent: 'center' },
  arrow: { width: 62, height: 62 },
  arrowContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
