import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme/colors';
import { radius, shadow } from '@/src/theme/metrics';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: IoniconName;
  trailing?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon,
  trailing,
  variant = 'primary',
}: PrimaryButtonProps) {
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const content = (
    <View style={styles.content}>
      {loading ? <ActivityIndicator color={variant === 'primary' ? colors.black : colors.text} /> : null}
      {!loading && icon ? <Ionicons color={variant === 'primary' ? colors.black : colors.text} name={icon} size={19} /> : null}
      <Text style={[styles.label, variant !== 'primary' && styles.secondaryLabel]}>{label}</Text>
      {!loading && trailing ? trailing : null}
      {!loading && !trailing && variant === 'primary' ? (
        <Ionicons color={colors.black} name="arrow-forward" size={19} />
      ) : null}
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.wrapper,
        variant !== 'primary' && styles.secondaryWrapper,
        variant === 'ghost' && styles.ghostWrapper,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient colors={['#FFD84D', colors.accent, '#F2B600']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.gradient}>
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.md,
    minHeight: 56,
    overflow: 'hidden',
    ...shadow.accent,
  },
  secondaryWrapper: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    justifyContent: 'center',
    shadowOpacity: 0,
  },
  ghostWrapper: { backgroundColor: 'transparent', borderColor: 'transparent' },
  gradient: { flex: 1, justifyContent: 'center', minHeight: 56 },
  content: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'center', minHeight: 56, paddingHorizontal: 20 },
  label: { color: colors.black, fontSize: 16, fontWeight: '900', letterSpacing: -0.25 },
  secondaryLabel: { color: colors.text },
  disabled: { opacity: 0.36 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.988 }] },
});
