import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandWordmark } from '@/src/components/BrandWordmark';
import { SectionTitle } from '@/src/components/SectionTitle';
import { categories } from '@/src/data/categories';
import { scenes } from '@/src/data/scenes';
import { colors } from '@/src/theme/colors';
import { radius } from '@/src/theme/metrics';

const hero = require('../../assets/images/categories/cinematic-scene.jpg');

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BrandWordmark compact />
          <View style={styles.headerActions}>
            <View style={styles.credit}><Ionicons color={colors.accent} name="sparkles" size={14} /><Text style={styles.creditText}>24</Text></View>
            <Pressable accessibilityRole="button" style={styles.avatar}><Ionicons color={colors.text} name="person" size={20} /></Pressable>
          </View>
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/create')} style={styles.hero}>
          <Image contentFit="cover" source={hero} style={StyleSheet.absoluteFill} transition={180} />
          <LinearGradient colors={['rgba(5,5,5,0.02)', 'rgba(5,5,5,0.35)', 'rgba(5,5,5,0.96)']} style={StyleSheet.absoluteFill} />
          <View style={styles.heroBadge}><Ionicons color={colors.black} name="sparkles" size={14} /><Text style={styles.heroBadgeText}>Yeni</Text></View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Hayalindeki sahneyi oluştur.</Text>
            <Text style={styles.heroText}>Fotoğrafını yükle, kategorini seç ve AI üretimini başlat.</Text>
            <View style={styles.heroButton}><Text style={styles.heroButtonText}>Hemen dene</Text><Ionicons color={colors.black} name="arrow-forward" size={17} /></View>
          </View>
        </Pressable>

        <SectionTitle action="Tümünü gör" title="Popüler kategoriler" />
        <ScrollView contentContainerStyle={styles.horizontal} horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((item) => (
            <Pressable accessibilityRole="button" key={item.id} onPress={() => router.push('/(tabs)/create')} style={styles.categoryCard}>
              <Image contentFit="cover" source={item.image} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['transparent', 'rgba(5,5,5,0.92)']} style={StyleSheet.absoluteFill} />
              <Text style={styles.categoryTitle}>{item.shortTitle}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionTitle action="12 sahne" title="Sahne fikirleri" />
        <View style={styles.sceneGrid}>
          {scenes.slice(3, 9).map((item) => (
            <Pressable accessibilityRole="button" key={item.id} onPress={() => router.push('/(tabs)/create')} style={styles.sceneCard}>
              <Image contentFit="cover" source={item.image} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['transparent', 'rgba(5,5,5,0.84)']} style={StyleSheet.absoluteFill} />
              <Text style={styles.sceneTitle}>{item.title}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  content: { gap: 22, paddingBottom: 34, paddingHorizontal: 18 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  credit: { alignItems: 'center', backgroundColor: colors.accentSoft, borderColor: colors.accentBorder, borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 5, paddingHorizontal: 10, paddingVertical: 8 },
  creditText: { color: colors.accent, fontSize: 12, fontWeight: '900' },
  avatar: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 17, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
  hero: { backgroundColor: colors.surface, borderColor: colors.borderStrong, borderRadius: radius.xl, borderWidth: 1, height: 330, overflow: 'hidden', position: 'relative' },
  heroBadge: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 999, flexDirection: 'row', gap: 5, left: 14, paddingHorizontal: 10, paddingVertical: 7, position: 'absolute', top: 14 },
  heroBadgeText: { color: colors.black, fontSize: 10, fontWeight: '900' },
  heroCopy: { bottom: 0, left: 0, padding: 18, position: 'absolute', right: 0 },
  heroTitle: { color: colors.text, fontSize: 25, fontWeight: '900', letterSpacing: -0.8 },
  heroText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 7, maxWidth: 290 },
  heroButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: 13, flexDirection: 'row', gap: 8, marginTop: 15, paddingHorizontal: 14, paddingVertical: 11 },
  heroButtonText: { color: colors.black, fontSize: 12, fontWeight: '900' },
  horizontal: { gap: 10, paddingRight: 18 },
  categoryCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 18, borderWidth: 1, height: 178, overflow: 'hidden', position: 'relative', width: 135 },
  categoryTitle: { bottom: 13, color: colors.text, fontSize: 13, fontWeight: '900', left: 12, position: 'absolute', right: 8 },
  sceneGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sceneCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 17, borderWidth: 1, height: 155, overflow: 'hidden', position: 'relative', width: '48.5%' },
  sceneTitle: { bottom: 11, color: colors.text, fontSize: 12, fontWeight: '900', left: 11, position: 'absolute', right: 8 },
});
