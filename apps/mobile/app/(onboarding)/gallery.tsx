import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback } from 'react';
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldButton, OnboardingHeader, PhotoChip } from '@/features/onboarding/components';
import { galleryPhotos, resolveOnboardingPhoto } from '@/features/onboarding/data';
import { useOnboarding } from '@/features/onboarding/context';
import { useOnboardingPhotoPicker } from '@/features/onboarding/use-photo-picker';
import { colors, radii, shadows } from '@/theme';

/**
 * An Image that is absolutely positioned by itself can be laid out as `cover`
 * by iOS after a hot reload. Keeping the Image as a normal 100% × 100% child
 * makes `contain` deterministic and preserves every selected photo's ratio.
 */
function FittedPhotoImage({ source }: { source: ImageSourcePropType }) {
  return (
    <View pointerEvents="none" style={styles.fittedPhotoCanvas}>
      <Image fadeDuration={0} source={source} style={styles.fittedPhotoImage} />
    </View>
  );
}

export default function GalleryScreen() {
  const { selectedPhoto, setSelectedPhoto } = useOnboarding();
  const handleSelected = useCallback(
    (photo: Parameters<typeof setSelectedPhoto>[0]) => setSelectedPhoto(photo),
    [setSelectedPhoto],
  );
  const { busy, selectFromGallery, takePhoto } = useOnboardingPhotoPicker({
    onSelected: handleSelected,
  });

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <View style={styles.container}>
        <OnboardingHeader
          onBack={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(onboarding)/consent');
          }}
          onSkip={() => router.replace('/(auth)/login')}
          step="FOTOĞRAF SEÇİMİ"
          title="Bir fotoğraf seç"
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(440)}>
            <Text accessibilityRole="header" style={styles.title}>
              Bir fotoğrafla{`\n`}başlayalım.
            </Text>
            <Text style={styles.subtitle}>
              Galerinden net bir selfie veya portre seç. Dilersen kamerayla yeni bir kare de
              oluşturabilirsin.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(520)} style={styles.previewCard}>
            <FittedPhotoImage source={resolveOnboardingPhoto(selectedPhoto)} />
            <LinearGradient
              colors={['rgba(5,5,5,0.05)', 'rgba(5,5,5,0.10)', 'rgba(5,5,5,0.90)']}
              locations={[0, 0.42, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.previewTop}>
              <PhotoChip icon="expand-outline">Orijinal oran korunur</PhotoChip>
              {selectedPhoto ? (
                <View style={styles.selectedBadge}>
                  <Ionicons color={colors.background} name="checkmark" size={15} />
                  <Text style={styles.selectedText}>Seçildi</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.previewBottom}>
              <Text style={styles.previewTitle}>
                {selectedPhoto ? 'Fotoğrafın hazır' : 'İlk kareni seç'}
              </Text>
              <Text style={styles.previewSubtitle}>
                {selectedPhoto?.kind === 'device'
                  ? (selectedPhoto.fileName ?? 'Galeriden seçilen fotoğraf')
                  : selectedPhoto
                    ? 'Demo portre seçildi'
                    : 'Seçtiğin fotoğraf cihazında kalır; üretim için sonra yüklenir.'}
              </Text>
            </View>
          </Animated.View>

          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={selectFromGallery}
              style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
            >
              <View style={styles.actionIcon}>
                <Ionicons color={colors.accentYellow} name="images-outline" size={24} />
              </View>
              <Text style={styles.actionText}>Galeriden seç</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={takePhoto}
              style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
            >
              <View style={styles.actionIcon}>
                <Ionicons color={colors.accentYellow} name="camera-outline" size={24} />
              </View>
              <Text style={styles.actionText}>Fotoğraf çek</Text>
            </Pressable>
          </View>

          <View style={styles.demoHeader}>
            <Text style={styles.sectionTitle}>Demo fotoğrafları</Text>
            <Text style={styles.sectionHint}>Akışı denemek için seç</Text>
          </View>
          <ScrollView
            contentContainerStyle={styles.demoRow}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {galleryPhotos.map((item, index) => {
              const active = selectedPhoto?.kind === 'demo' && selectedPhoto.id === item.id;
              return (
                <Animated.View
                  entering={FadeInDown.delay(150 + index * 55).duration(400)}
                  key={item.id}
                >
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    onPress={() =>
                      setSelectedPhoto({ kind: 'demo', id: item.id, source: item.source })
                    }
                    style={[styles.demoCard, active && styles.demoCardActive]}
                  >
                    <FittedPhotoImage source={item.source} />
                    {active ? (
                      <View style={styles.demoCheck}>
                        <Ionicons color={colors.background} name="checkmark" size={15} />
                      </View>
                    ) : null}
                  </Pressable>
                </Animated.View>
              );
            })}
          </ScrollView>

          <View style={styles.notice}>
            <Ionicons color={colors.accentYellow} name="lock-closed-outline" size={18} />
            <Text style={styles.noticeText}>
              Sadece kendi fotoğrafını veya kullanma iznine sahip olduğun bir görseli seç. AI
              önizlemeleri açıkça etiketlenir.
            </Text>
          </View>
        </ScrollView>
        <View style={styles.bottom}>
          <GoldButton
            disabled={!selectedPhoto}
            label="Fotoğrafla devam et"
            loading={busy}
            onPress={() => router.push('/(onboarding)/welcome')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },
  content: { paddingBottom: 24, paddingTop: 18 },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1.15,
    lineHeight: 36,
  },
  subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 11 },
  previewCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    height: 282,
    marginTop: 23,
    overflow: 'hidden',
    ...shadows.floating,
  },
  fittedPhotoCanvas: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  fittedPhotoImage: { height: '100%', resizeMode: 'contain', width: '100%' },
  previewTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 14,
    position: 'absolute',
    right: 14,
    top: 14,
  },
  selectedBadge: {
    alignItems: 'center',
    backgroundColor: colors.accentYellow,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  selectedText: { color: colors.background, fontSize: 10, fontWeight: '900' },
  previewBottom: { bottom: 0, left: 0, padding: 17, position: 'absolute', right: 0 },
  previewTitle: { color: colors.textPrimary, fontSize: 19, fontWeight: '900' },
  previewSubtitle: { color: '#D0D0D2', fontSize: 11, lineHeight: 16, marginTop: 5 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    minHeight: 88,
    justifyContent: 'center',
    padding: 10,
  },
  actionIcon: {
    alignItems: 'center',
    backgroundColor: colors.accentYellowSoft,
    borderRadius: 13,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  actionText: { color: colors.textPrimary, fontSize: 12, fontWeight: '800' },
  demoHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 23,
  },
  sectionTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '900' },
  sectionHint: { color: colors.accentYellow, fontSize: 10, fontWeight: '800' },
  demoRow: { gap: 10, paddingRight: 20, paddingTop: 11 },
  // Each supplied demo is a 4:5 portrait. The matching card keeps the full
  // composition visible rather than cutting off the lower part of the image.
  demoCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 15,
    borderWidth: 1,
    height: 98,
    overflow: 'hidden',
    width: 78,
  },
  demoCardActive: { borderColor: colors.accentYellow, borderWidth: 2 },
  demoCheck: {
    alignItems: 'center',
    backgroundColor: colors.accentYellow,
    borderRadius: 14,
    height: 27,
    justifyContent: 'center',
    position: 'absolute',
    right: 6,
    top: 6,
    width: 27,
  },
  notice: {
    alignItems: 'flex-start',
    backgroundColor: '#15130D',
    borderColor: 'rgba(255,196,0,0.30)',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginTop: 21,
    padding: 13,
  },
  noticeText: { color: '#C9BFA7', flex: 1, fontSize: 11, lineHeight: 16 },
  bottom: { paddingBottom: 8, paddingTop: 10 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
