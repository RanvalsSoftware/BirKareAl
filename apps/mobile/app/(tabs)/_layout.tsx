import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { AuthBootScreen } from '@/features/auth/auth-boot-screen';
import { useAuthStore } from '@/features/auth/auth-store';
import { useCopy } from '@/features/settings/language-store';
import { brand } from '@/theme/brand';

/**
 * The system tab bar. Using the native component gives the app the platform's
 * own material, selection animation, accessibility behaviour and iPad
 * adaptation instead of a hand-drawn imitation. Brand colour is applied only
 * as the tint.
 */
export default function TabsLayout() {
  const copy = useCopy();
  const authState = useAuthStore((store) => store.state);
  if (authState === 'booting') return <AuthBootScreen />;
  if (authState !== 'authenticated') return <Redirect href="/(auth)/login" />;

  return (
    <NativeTabs
      tintColor={brand.gold}
      iconColor={{ default: brand.textMuted, selected: brand.gold }}
      labelStyle={{
        default: { color: brand.textMuted },
        selected: { color: brand.gold },
      }}
    >
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'camera', selected: 'camera.fill' }}
          md="photo_camera"
        />
        <NativeTabs.Trigger.Label>{copy('Stüdyo', 'Studio')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="projects">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'folder', selected: 'folder.fill' }}
          md="folder"
        />
        <NativeTabs.Trigger.Label>{copy('Katalog', 'Catalog')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="credits">
        <NativeTabs.Trigger.Icon sf={{ default: 'bolt', selected: 'bolt.fill' }} md="bolt" />
        <NativeTabs.Trigger.Label>{copy('Krediler', 'Credits')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md="account_circle"
        />
        <NativeTabs.Trigger.Label>{copy('Hesap', 'Account')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
