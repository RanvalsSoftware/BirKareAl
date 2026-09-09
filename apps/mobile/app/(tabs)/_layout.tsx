import * as Haptics from 'expo-haptics';
import { Redirect, Tabs } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { GlassSurface, Icon } from '@/components';
import { useAuthStore } from '@/features/auth/auth-store';
import { AuthBootScreen } from '@/features/auth/auth-boot-screen';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { colors } from '@/theme';

const tabIcons = {
  home: ['home-outline', 'home'] as const,
  explore: ['compass-outline', 'compass'] as const,
  projects: ['images-outline', 'images'] as const,
  credits: ['flash-outline', 'flash'] as const,
  profile: ['person-outline', 'person'] as const,
};

type GlassTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

function GlassTabBar({ state, descriptors, navigation }: GlassTabBarProps) {
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  if (keyboardVisible) return null;
  return (
    <View style={[styles.barArea, { paddingBottom: Math.max(insets.bottom - 5, 8) }]}>
      <GlassSurface radius={32} tone="gold" contentStyle={styles.bar} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const options = descriptors[route.key]?.options;
          const label = typeof options?.tabBarLabel === 'string' ? options.tabBarLabel : options?.title ?? route.name;
          return (
            <GlassTabButton
              key={route.key}
              name={route.name as keyof typeof tabIcons}
              label={label}
              focused={state.index === index}
              accessibilityLabel={options?.tabBarAccessibilityLabel}
              testID={options?.tabBarButtonTestID}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (state.index !== index && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
            />
          );
        })}
      </GlassSurface>
    </View>
  );
}

function GlassTabButton({ name, label, focused, onPress, onLongPress, accessibilityLabel, testID }: {
  name: keyof typeof tabIcons;
  label: string;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
}) {
  const reducedMotion = useReducedMotion();
  const selection = useSharedValue(focused ? 1 : 0);
  const scale = useSharedValue(1);
  useEffect(() => {
    selection.set(reducedMotion ? (focused ? 1 : 0) : withTiming(focused ? 1 : 0, { duration: 220 }));
  }, [focused, reducedMotion, selection]);
  const orbStyle = useAnimatedStyle(() => ({ opacity: selection.value, transform: [{ scale: 0.85 + selection.value * 0.15 }] }));
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const [inactive, active] = tabIcons[name] ?? tabIcons.home;
  return (
    <Animated.View style={[styles.tab, pressStyle]}>
      <Pressable
        accessibilityRole="tab" accessibilityState={{ selected: focused }}
        accessibilityLabel={accessibilityLabel ?? label} testID={testID}
        onLongPress={onLongPress}
        onPressIn={() => { if (!reducedMotion) scale.set(withSpring(0.94)); }}
        onPressOut={() => { scale.set(reducedMotion ? 1 : withSpring(1)); }}
        onPress={() => {
          void Haptics.selectionAsync().catch(() => undefined);
          onPress();
        }}
        style={styles.tabPressable}
      >
        <View style={styles.iconSlot}>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, orbStyle]}>
            <GlassSurface radius={22} tone="gold" selected style={styles.orb} />
          </Animated.View>
          <Icon name={focused ? active : inactive} size={24} color={focused ? colors.accentYellow : '#858584'} />
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[styles.label, focused && styles.selectedLabel]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function TabsLayout() {
  const authState = useAuthStore((store) => store.state);
  if (authState === 'booting') return <AuthBootScreen />;
  if (authState !== 'authenticated') return <Redirect href="/(auth)/login" />;
  return (
    <Tabs tabBar={(props) => <GlassTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}>
      <Tabs.Screen name="home" options={{ title: 'Ana Sayfa' }} />
      <Tabs.Screen name="explore" options={{ title: 'Keşfet' }} />
      <Tabs.Screen name="projects" options={{ title: 'Projeler' }} />
      <Tabs.Screen name="credits" options={{ title: 'Krediler' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barArea: { backgroundColor: colors.background, paddingHorizontal: 12, paddingTop: 7 },
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: 76, paddingHorizontal: 4, paddingVertical: 6 },
  tab: { flex: 1, minWidth: 0 },
  tabPressable: { alignItems: 'center', justifyContent: 'center', minHeight: 62 },
  iconSlot: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  orb: { width: 42, height: 42 },
  label: { fontSize: 10, lineHeight: 14, fontWeight: '600', color: '#858584', marginTop: 1, paddingHorizontal: 2 },
  selectedLabel: { color: colors.accentYellow, fontWeight: '700' },
});
