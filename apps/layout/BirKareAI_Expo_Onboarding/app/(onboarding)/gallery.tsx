import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/src/components/PrimaryButton';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { StepDots } from '@/src/components/StepDots';
import { useOnboarding } from '@/src/context/OnboardingContext';
import { demoGalleryImages } from '@/src/data/scenes';
import { usePhotoPicker } from '@/src/hooks/usePhotoPicker';
import { colors } from '@/src/theme/colors';
import { radius } from '@/src/theme/metrics';
import { resolvePhotoSource } from '@/src/utils/images';

const fallbackImage = require('../../assets/images/onboarding/before-portrait.jpg');

export default function GalleryScreen() {
  const { selectedPhoto, setSelectedPhoto } = useOnboarding();
  const onSelected = useCallback((photo: Parameters<typeof setSelectedPhoto>[0]) => setSelectedPhoto(photo), [setSelectedPhoto]);
  const { busy, selectFromGallery, takePhoto } = usePhotoPicker({ onSelected });

  const selectDemo = (id: string) => {
    const item = demoGalleryImages.find((candidate) => candidate.id === id);
    if (!item) return;
    setSelectedPhoto({ kind: 'demo', id: item.id, source: item.image });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <ScreenHeader onSkip={() => router.replace('/(auth)/login')} showBack={false} step="1 / 5" title="Fotoğraf seçimi" />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(480)}>
            <Text accessibilityRole="header" style={styles.title}>Önce bir fotoğraf seç.</Text>
            <Text style={styles.subtitle}>Galerinden bir selfie veya portre seçebilir, kamerayla yenisini çekebilir ya da demo görsellerden biriyle akışı deneyebilirsin.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(110).duration(520)} style={styles.previewCard}>
            <Image contentFit="cover" source={resolvePhotoSource(selectedPhoto, fallbackImage)} style={StyleSheet.absoluteFill} transition={180} />
            <LinearGradient colors={['transparent', 'rgba(5,5,5,0.08)', 'rgba(5,5,5,0.82)']} style={StyleSheet.absoluteFill} />
            <View style={styles.previewTop}>
              <View style={styles.privateBadge}><Ionicons color={colors.accent} name="shield-checkmark-outline" size={15} /><Text style={styles.privateText}>Önizleme</Text></View>
              {selectedPhoto ? <View style={styles.selectedBadge}><Ionicons color={colors.black} name="checkmark" size={15} /><Text style={styles.selectedText}>Seçildi</Text></View> : null}
            </View>
            <View style={styles.previewBottom}>
              <Text style={styles.previewTitle}>{selectedPhoto ? 'Fotoğrafın hazır' : 'Bir fotoğraf seçerek başla'}</Text>
              <Text style={styles.previewSubtitle}>{selectedPhoto?.kind === 'device' ? selectedPhoto.fileName ?? 'Galeriden seçilen fotoğraf' : selectedPhoto ? 'Demo fotoğrafı' : '4:5 portre fotoğrafı önerilir'}</Text>
            </View>
          </Animated.View>

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={busy} onPress={selectFromGallery} style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}>
              <View style={styles.actionIcon}><Ionicons color={colors.accent} name="images-outline" size={24} /></View>
              <View style={styles.actionCopy}><Text style={styles.actionTitle}>Galeriden seç</Text><Text style={styles.actionSubtitle}>Telefonundaki fotoğrafları aç</Text></View>
              <Ionicons color={colors.textMuted} name="chevron-forward" size={20} />
            </Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={takePhoto} style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}>
              <View style={styles.actionIcon}><Ionicons color={colors.accent} name="camera-outline" size={24} /></View>
              <View style={styles.actionCopy}><Text style={styles.actionTitle}>Fotoğraf çek</Text><Text style={styles.actionSubtitle}>Kamerayla yeni bir kare oluştur</Text></View>
              <Ionicons color={colors.textMuted} name="chevron-forward" size={20} />
            </Pressable>
          </View>

          <View style={styles.demoHeader}>
            <Text style={styles.sectionTitle}>Demo fotoğrafları</Text>
            <Text style={styles.sectionHint}>Birini seç</Text>
          </View>
          <ScrollView contentContainerStyle={styles.demoRow} horizontal showsHorizontalScrollIndicator={false}>
            {demoGalleryImages.map((item) => {
              const active = selectedPhoto?.kind === 'demo' && selectedPhoto.id === item.id;
              return (
                <Pressable accessibilityRole="radio" accessibilityState={{ checked: active }} key={item.id} onPress={() => selectDemo(item.id)} style={[styles.demoCard, active && styles.demoActive]}>
                  <Image contentFit="cover" source={item.image} style={StyleSheet.absoluteFill} transition={150} />
                  {active ? <View style={styles.demoCheck}><Ionicons color={colors.black} name="checkmark" size={14} /></View> : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.notice}>
            <Ionicons color={colors.textSecondary} name="lock-closed-outline" size={17} />
            <Text style={styles.noticeText}>Bu demo akışında seçtiğin fotoğraf yalnızca cihazındaki önizlemede kullanılır. Backend yüklemesi henüz bağlı değildir.</Text>
          </View>
        </ScrollView>

        <View style={styles.bottom}>
          <StepDots active={0} total={5} />
          <PrimaryButton disabled={!selectedPhoto} label="Fotoğrafla devam et" loading={busy} onPress={() => router.push('/(onboarding)/welcome')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },
  content: { paddingBottom: 28, paddingTop: 22 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', letterSpacing: -1.15, lineHeight: 36 },
  subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 11 },
  previewCard: { backgroundColor: colors.surface, borderColor: colors.borderStrong, borderRadius: radius.xl, borderWidth: 1, height: 330, marginTop: 24, overflow: 'hidden' },
  previewTop: { flexDirection: 'row', justifyContent: 'space-between', left: 14, position: 'absolute', right: 14, top: 14 },
  privateBadge: { alignItems: 'center', backgroundColor: 'rgba(5,5,5,0.76)', borderColor: colors.borderStrong, borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 7 },
  privateText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  selectedBadge: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 999, flexDirection: 'row', gap: 5, paddingHorizontal: 10, paddingVertical: 7 },
  selectedText: { color: colors.black, fontSize: 11, fontWeight: '900' },
  previewBottom: { bottom: 0, left: 0, padding: 18, position: 'absolute', right: 0 },
  previewTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  previewSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  actions: { gap: 10, marginTop: 14 },
  actionCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 70, paddingHorizontal: 14 },
  actionIcon: { alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: 13, height: 44, justifyContent: 'center', width: 44 },
  actionCopy: { flex: 1 },
  actionTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  actionSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  demoHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 26 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  sectionHint: { color: colors.accent, fontSize: 11, fontWeight: '800' },
  demoRow: { gap: 10, paddingRight: 20, paddingTop: 12 },
  demoCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, height: 116, overflow: 'hidden', position: 'relative', width: 90 },
  demoActive: { borderColor: colors.accent, borderWidth: 2 },
  demoCheck: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 13, height: 25, justifyContent: 'center', position: 'absolute', right: 6, top: 6, width: 25 },
  notice: { alignItems: 'flex-start', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: 10, marginTop: 22, padding: 14 },
  noticeText: { color: colors.textMuted, flex: 1, fontSize: 11, lineHeight: 16 },
  bottom: { gap: 15, paddingBottom: 8, paddingTop: 10 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
});
