import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSurface, Icon } from '@/components';
import { colors } from '@/theme';

const tabs = [
  { route: '/(tabs)/home', label: 'Ana Sayfa', icon: 'home-outline' },
  { route: '/(tabs)/explore', label: 'Keşfet', icon: 'compass-outline' },
  { route: '/(tabs)/projects', label: 'Projeler', icon: 'images-outline' },
  { route: '/(tabs)/credits', label: 'Krediler', icon: 'flash-outline' },
  { route: '/(tabs)/profile', label: 'Profil', icon: 'person' },
] as const;

/** Real tab destinations for profile subpages outside the tab navigator.
 * A normal-flow footer reserves its own height instead of covering form rows.
 */
export function SettingsTabFooter() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (keyboardVisible) return null;

  return (
    <View
      style={[
        styles.area,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          paddingLeft: Math.max(insets.left, 12),
          paddingRight: Math.max(insets.right, 12),
        },
      ]}
    >
      <GlassSurface radius={32} tone="gold" contentStyle={styles.bar} accessibilityRole="tablist">
        {tabs.map((tab) => {
          const selected = tab.route === '/(tabs)/profile';
          return (
            <Pressable
              key={tab.route}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected }}
              accessibilityHint={`${tab.label} sayfasına git`}
              onPress={() => {
                void Haptics.selectionAsync().catch(() => undefined);
                router.replace(tab.route);
              }}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            >
              <View style={styles.iconSlot}>
                {selected ? (
                  <GlassSurface radius={22} tone="gold" selected style={StyleSheet.absoluteFill} />
                ) : null}
                <Icon
                  name={tab.icon}
                  size={24}
                  color={selected ? colors.accentYellow : '#858584'}
                />
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={[styles.label, selected && styles.selectedLabel]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { backgroundColor: colors.background, paddingTop: 7 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 76,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  tab: { flex: 1, minWidth: 0, minHeight: 62, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  iconSlot: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  label: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    color: '#858584',
    marginTop: 1,
    paddingHorizontal: 2,
  },
  selectedLabel: { color: colors.accentYellow, fontWeight: '700' },
});
