import { tr as translateCopy } from '@/i18n/engine';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { type ComponentProps } from 'react';

import { brand } from '@/theme/brand';

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

/** The screen's main action at the standard control height: a filled accent button. */
export function AppleGlassButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  accessibilityHint,
  style,
  testID,
}: AppleGlassButtonProps) {
  const unavailable = disabled || loading;
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: unavailable }}
      disabled={unavailable}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        void onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        unavailable && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
      testID={testID}
    >
      {loading ? <ActivityIndicator color={brand.onGold} size="small" /> : null}
      <Text numberOfLines={1} style={styles.label}>
        {loading ? translateCopy('Hazırlanıyor…') : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: brand.gold,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
    width: '100%',
  },
  label: { color: brand.onGold, flexShrink: 1, fontSize: 17, fontWeight: '600' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.65 },
});
