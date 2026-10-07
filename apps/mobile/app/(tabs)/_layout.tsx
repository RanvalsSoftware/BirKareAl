import * as Haptics from 'expo-haptics';
import { Redirect, Tabs } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components';
import { AuthBootScreen } from '@/features/auth/auth-boot-screen';
import { useAuthStore } from '@/features/auth/auth-store';
import { useCopy } from '@/features/settings/language-store';

const tabIcons = {
  home: ['storefront-outline', 'storefront'] as const,
  projects: ['albums-outline', 'albums'] as const,
  credits: ['flash-outline', 'flash'] as const,
  profile: ['person-circle-outline', 'person-circle'] as const,
};

type CommerceTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

function CommerceTabBar({ state, descriptors, navigation }: CommerceTabBarProps) {
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
  const activeRouteKey = state.routes[state.index]?.key;
  const visibleRoutes = state.routes.filter((route) => route.name !== 'explore');

  return (
    <View style={[styles.barArea, { paddingBottom: Math.max(insets.bottom, 9) }]}>
      <View style={styles.bar} accessibilityRole="tablist">
        {visibleRoutes.map((route) => {
          const options = descriptors[route.key]?.options;
          const focused = activeRouteKey === route.key;
          const label =
            typeof options?.tabBarLabel === 'string'
              ? options.tabBarLabel
              : (options?.title ?? route.name);
          const [inactiveIcon, activeIcon] =
            tabIcons[route.name as keyof typeof tabIcons] ?? tabIcons.home;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options?.tabBarAccessibilityLabel ?? label}
              key={route.key}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              onPress={() => {
                void Haptics.selectionAsync().catch(() => undefined);
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented)
                  navigation.navigate(route.name, route.params);
              }}
              style={({ pressed }) => [
                styles.tab,
                focused && styles.tabSelected,
                pressed && styles.tabPressed,
              ]}
              testID={options?.tabBarButtonTestID}
            >
              <Icon
                name={focused ? activeIcon : inactiveIcon}
                size={22}
                color={focused ? '#B8F1CD' : '#76817B'}
              />
              <Text numberOfLines={1} style={[styles.label, focused && styles.labelSelected]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const copy = useCopy();
  const authState = useAuthStore((store) => store.state);
  if (authState === 'booting') return <AuthBootScreen />;
  if (authState !== 'authenticated') return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      tabBar={(props) => <CommerceTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#0B0F0D' } }}
    >
      <Tabs.Screen name="home" options={{ title: copy('Stüdyo', 'Studio') }} />
      <Tabs.Screen name="projects" options={{ title: copy('Katalog', 'Catalog') }} />
      <Tabs.Screen name="credits" options={{ title: copy('Krediler', 'Credits') }} />
      <Tabs.Screen name="profile" options={{ title: copy('Hesap', 'Account') }} />
      <Tabs.Screen name="explore" options={{ href: null, title: copy('Diğer araçlar', 'Other tools') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barArea: {
    backgroundColor: '#0B0F0D',
    borderTopColor: '#202A24',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  bar: {
    alignSelf: 'center',
    backgroundColor: '#111815',
    borderColor: '#27322C',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    maxWidth: 680,
    minHeight: 62,
    padding: 5,
    width: '100%',
  },
  tab: {
    alignItems: 'center',
    borderRadius: 17,
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    minHeight: 50,
    minWidth: 0,
  },
  tabSelected: { backgroundColor: '#1B2A22' },
  tabPressed: { opacity: 0.72 },
  label: { color: '#76817B', fontSize: 10, fontWeight: '700', lineHeight: 13 },
  labelSelected: { color: '#D7F7E3' },
});
