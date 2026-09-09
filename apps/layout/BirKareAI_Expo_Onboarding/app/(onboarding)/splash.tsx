import { router } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedPhotoCloud } from '@/src/components/AnimatedPhotoCloud';
import { BrandWordmark } from '@/src/components/BrandWordmark';
import { demoGalleryImages } from '@/src/data/scenes';
import { colors } from '@/src/theme/colors';

const INTRO_DURATION_MS = 4600;

export default function SplashScreen() {
  const navigated = useRef(false);
  const progress = useSharedValue(0);

  const continueToGallery = useCallback(() => {
    if (navigated.current) return;
    navigated.current = true;
    router.replace('/(onboarding)/gallery');
  }, []);

  useEffect(() => {
    progress.value = withTiming(1, { duration: INTRO_DURATION_MS - 250 });
    const timer = setTimeout(continueToGallery, INTRO_DURATION_MS);
    return () => clearTimeout(timer);
  }, [continueToGallery, progress]);

  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  const center = demoGalleryImages[3]?.image ?? require('../../assets/images/onboarding/gallery-04.jpg');
  const surrounding = demoGalleryImages
    .filter((item) => item.id !== 'demo-4')
    .slice(0, 4)
    .map((item) => item.image);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Pressable accessibilityRole="button" onPress={continueToGallery} style={styles.pressable}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.brandWrap}>
          <BrandWordmark centered />
        </Animated.View>

        <AnimatedPhotoCloud centerSource={center} surroundingSources={surrounding} />

        <Animated.View entering={FadeInDown.delay(480).duration(560)} style={styles.copy}>
          <Text accessibilityRole="header" style={styles.title}>Hayalindeki kareye gir.</Text>
          <Text style={styles.subtitle}>Bir fotoğraf seç. Sahneni belirle. Gerisini BirKare AI oluştursun.</Text>
        </Animated.View>

        <View style={styles.footer}>
          <View style={styles.track}>
            <Animated.View style={[styles.progress, progressStyle]} />
          </View>
          <Text style={styles.tap}>Devam etmek için dokun</Text>
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  pressable: { flex: 1, paddingHorizontal: 18 },
  brandWrap: { paddingTop: 8 },
  copy: { alignItems: 'center', marginTop: -6, paddingHorizontal: 20 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', letterSpacing: -1.15, textAlign: 'center' },
  subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 10, maxWidth: 320, textAlign: 'center' },
  footer: { alignItems: 'center', marginTop: 'auto', paddingBottom: 8 },
  track: { backgroundColor: '#232327', borderRadius: 99, height: 4, overflow: 'hidden', width: 148 },
  progress: { backgroundColor: colors.accent, borderRadius: 99, height: 4, width: 148 },
  tap: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 12 },
});
