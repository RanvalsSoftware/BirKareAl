import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/src/components/PrimaryButton';
import { SectionTitle } from '@/src/components/SectionTitle';
import { useOnboarding } from '@/src/context/OnboardingContext';
import { categories } from '@/src/data/categories';
import { filters } from '@/src/data/filters';
import { scenes } from '@/src/data/scenes';
import { usePhotoPicker } from '@/src/hooks/usePhotoPicker';
import { colors } from '@/src/theme/colors';
import { radius } from '@/src/theme/metrics';
import { resolvePhotoSource } from '@/src/utils/images';

const fallback = require('../../assets/images/onboarding/before-portrait.jpg');

export default function CreateScreen() {
  const {
    selectedPhoto,
    selectedCategoryId,
    selectedFilterId,
    setSelectedCategoryId,
    setSelectedFilterId,
    setSelectedPhoto,
  } = useOnboarding();

  const onSelected = useCallback((photo: Parameters<typeof setSelectedPhoto>[0]) => setSelectedPhoto(photo), [setSelectedPhoto]);
  const { busy, selectFromGallery, takePhoto } = usePhotoPicker({ onSelected });
  const selectedCategory = categories.find((item) => item.id === selectedCategoryId) ?? categories[0];
  const selectedFilter = filters.find((item) => item.id === selectedFilterId) ?? filters[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>YENİ PROJE</Text><Text accessibilityRole="header" style={styles.title}>Bir kare oluştur.</Text></View>
          <View style={styles.credit}><Ionicons color={colors.accent} name="sparkles" size={14} /><Text style={styles.creditText}>24 kredi</Text></View>
        </View>

        <View style={styles.photoCard}>
          <Image contentFit="cover" source={resolvePhotoSource(selectedPhoto, fallback)} style={StyleSheet.absoluteFill} transition={180} />
          <LinearGradient colors={['transparent', 'rgba(5,5,5,0.85)']} style={StyleSheet.absoluteFill} />
          <View style={styles.photoBottom}>
            <View><Text style={styles.photoTitle}>{selectedPhoto ? 'Fotoğraf seçildi' : 'Örnek fotoğraf'}</Text><Text style={styles.photoMeta}>4:5 portre · yüz görünür olmalı</Text></View>
            <Pressable accessibilityRole="button" disabled={busy} onPress={selectFromGallery} style={styles.changeButton}><Ionicons color={colors.black} name="images-outline" size={17} /><Text style={styles.changeText}>Değiştir</Text></Pressable>
          </View>
        </View>

        <View style={styles.quickActions}>
          <Pressable accessibilityRole="button" onPress={selectFromGallery} style={styles.quickAction}><Ionicons color={colors.accent} name="images-outline" size={21} /><Text style={styles.quickText}>Galeri</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={takePhoto} style={styles.quickAction}><Ionicons color={colors.accent} name="camera-outline" size={21} /><Text style={styles.quickText}>Kamera</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => {}} style={styles.quickAction}><Ionicons color={colors.accent} name="crop-outline" size={21} /><Text style={styles.quickText}>Kırp</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => {}} style={styles.quickAction}><Ionicons color={colors.accent} name="shield-checkmark-outline" size={21} /><Text style={styles.quickText}>Yüz koru</Text></Pressable>
        </View>

        <SectionTitle action={selectedCategory?.shortTitle} title="Kategori" />
        <ScrollView contentContainerStyle={styles.horizontal} horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((item) => {
            const active = item.id === selectedCategoryId;
            return (
              <Pressable accessibilityRole="radio" accessibilityState={{ checked: active }} key={item.id} onPress={() => setSelectedCategoryId(item.id)} style={[styles.category, active && styles.activeBorder]}>
                <Image contentFit="cover" source={item.image} style={StyleSheet.absoluteFill} />
                <LinearGradient colors={['transparent', 'rgba(5,5,5,0.92)']} style={StyleSheet.absoluteFill} />
                <Text style={styles.categoryText}>{item.shortTitle}</Text>
                {active ? <View style={styles.check}><Ionicons color={colors.black} name="checkmark" size={13} /></View> : null}
              </Pressable>
            );
          })}
        </ScrollView>

        <SectionTitle action={selectedFilter?.title} title="Filtre" />
        <ScrollView contentContainerStyle={styles.horizontal} horizontal showsHorizontalScrollIndicator={false}>
          {filters.slice(0, 9).map((item) => {
            const active = item.id === selectedFilterId;
            return (
              <Pressable accessibilityRole="radio" accessibilityState={{ checked: active }} key={item.id} onPress={() => setSelectedFilterId(item.id)} style={styles.filterItem}>
                <View style={[styles.filterImage, active && styles.activeBorder]}><Image contentFit="cover" source={item.image} style={StyleSheet.absoluteFill} /></View>
                <Text numberOfLines={1} style={[styles.filterText, active && styles.filterTextActive]}>{item.title}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <SectionTitle action="Tümünü gör" title="Sahne" />
        <ScrollView contentContainerStyle={styles.horizontal} horizontal showsHorizontalScrollIndicator={false}>
          {scenes.slice(0, 8).map((item) => (
            <Pressable accessibilityRole="radio" key={item.id} style={styles.scene}>
              <Image contentFit="cover" source={item.image} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['transparent', 'rgba(5,5,5,0.9)']} style={StyleSheet.absoluteFill} />
              <Text style={styles.sceneText}>{item.title}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.summary}>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Kategori</Text><Text style={styles.summaryValue}>{selectedCategory?.shortTitle}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Filtre</Text><Text style={styles.summaryValue}>{selectedFilter?.title}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Önizleme</Text><Text style={styles.summaryValue}>2 görsel · 2 kredi</Text></View>
        </View>

        <PrimaryButton label="Önizlemeleri oluştur" loading={busy} onPress={() => {}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  content: { gap: 19, paddingBottom: 34, paddingHorizontal: 18, paddingTop: 8 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  credit: { alignItems: 'center', backgroundColor: colors.accentSoft, borderColor: colors.accentBorder, borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 11, paddingVertical: 9 },
  creditText: { color: colors.accent, fontSize: 11, fontWeight: '900' },
  photoCard: { backgroundColor: colors.surface, borderColor: colors.borderStrong, borderRadius: radius.xl, borderWidth: 1, height: 330, overflow: 'hidden', position: 'relative' },
  photoBottom: { alignItems: 'center', bottom: 0, flexDirection: 'row', justifyContent: 'space-between', left: 0, padding: 16, position: 'absolute', right: 0 },
  photoTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  photoMeta: { color: colors.textSecondary, fontSize: 10, marginTop: 4 },
  changeButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 13, flexDirection: 'row', gap: 6, paddingHorizontal: 11, paddingVertical: 9 },
  changeText: { color: colors.black, fontSize: 11, fontWeight: '900' },
  quickActions: { flexDirection: 'row', gap: 8 },
  quickAction: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 15, borderWidth: 1, flex: 1, gap: 6, justifyContent: 'center', minHeight: 70 },
  quickText: { color: colors.textSecondary, fontSize: 9, fontWeight: '800' },
  horizontal: { gap: 10, paddingRight: 18 },
  category: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, height: 150, overflow: 'hidden', position: 'relative', width: 118 },
  activeBorder: { borderColor: colors.accent, borderWidth: 2 },
  categoryText: { bottom: 11, color: colors.text, fontSize: 11, fontWeight: '900', left: 10, position: 'absolute', right: 8 },
  check: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 13, height: 25, justifyContent: 'center', position: 'absolute', right: 7, top: 7, width: 25 },
  filterItem: { width: 82 },
  filterImage: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 15, borderWidth: 1, height: 100, overflow: 'hidden', width: 82 },
  filterText: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', marginTop: 7, textAlign: 'center' },
  filterTextActive: { color: colors.accent },
  scene: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 17, borderWidth: 1, height: 155, overflow: 'hidden', position: 'relative', width: 122 },
  sceneText: { bottom: 10, color: colors.text, fontSize: 10, fontWeight: '900', left: 10, position: 'absolute', right: 8 },
  summary: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: 12, padding: 15 },
  summaryRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  summaryValue: { color: colors.text, fontSize: 11, fontWeight: '900' },
});
