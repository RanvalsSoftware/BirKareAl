import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { colors } from '@/src/theme/colors';

type TabIconName = keyof typeof Ionicons.glyphMap;

function icon(name: TabIconName) {
  return ({ color, size }: { color: string; size: number }) => <Ionicons color={color} name={name} size={size} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800', paddingBottom: 2 },
        tabBarStyle: {
          backgroundColor: '#0A0A0C',
          borderTopColor: colors.border,
          height: 76,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen name="home" options={{ tabBarIcon: icon('home-outline'), title: 'Ana Sayfa' }} />
      <Tabs.Screen name="create" options={{ tabBarIcon: icon('sparkles-outline'), title: 'Oluştur' }} />
      <Tabs.Screen name="projects" options={{ tabBarIcon: icon('images-outline'), title: 'Projeler' }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: icon('person-outline'), title: 'Profil' }} />
    </Tabs>
  );
}
