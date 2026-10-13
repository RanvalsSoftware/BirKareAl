import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { brand } from '@/theme/brand';

export type GlassSurfaceProps = ViewProps & {
  radius?: number;
  /** Kept for existing call sites; content surfaces are no longer tinted. */
  tone?: 'gold' | 'iridescent' | 'neutral';
  selected?: boolean;
  glow?: boolean;
  intensity?: number;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * A plain content surface. Glass is left to the system's own navigation and
 * control layer; content sits on an opaque surface with no rim or glow, and a
 * selected surface is marked by a single accent outline.
 */
export function GlassSurface({
  children,
  radius = 20,
  selected = false,
  style,
  contentStyle,
  // Decorative options of the former material; accepted and ignored.
  tone: _tone,
  glow: _glow,
  intensity: _intensity,
  ...props
}: GlassSurfaceProps) {
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: brand.surface,
          borderColor: selected ? brand.gold : 'transparent',
          borderRadius: radius,
          borderWidth: 1.5,
        },
        style,
      ]}
    >
      <View style={contentStyle}>{children}</View>
    </View>
  );
}
