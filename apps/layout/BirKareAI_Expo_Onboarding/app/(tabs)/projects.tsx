import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { scenes } from '@/src/data/scenes';
import { colors } from '@/src/theme/colors';
import { radius } from '@/src/theme/metrics';

export default function ProjectsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><View><Text style={styles.eyebrow}>KÜTÜPHANE</Text><Text accessibilityRole="header" style={styles.title}>Projelerim</Text></View><Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/create')} style={styles.add}><Ionicons color={colors.black} name="add" size={23} /></Pressable></View>
        <View style={styles.tabs}><View style={[styles.tab, styles.tabActive]}><Text style={styles.tabActiveText}>Tümü</Text></View><View style={styles.tab}><Text style={styles.tabText}>Favoriler</Text></View><View style={styles.tab}><Text style={styles.tabText}>Fan</Text></View><View style={styles.tab}><Text style={styles.tabText}>Filtreler</Text></View></View>
        <View style={styles.grid}>
          {scenes.slice(0, 8).map((item, index) => (
            <Pressable accessibilityRole="button" key={item.id} style={styles.card}>
              <Image contentFit="cover" source={item.image} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['transparent', 'rgba(5,5,5,0.9)']} style={StyleSheet.absoluteFill} />
              <Pressable accessibilityLabel="Favoriye ekle" accessibilityRole="button" style={styles.favorite}><Ionicons color={index % 3 === 0 ? colors.accent : colors.text} name={index % 3 === 0 ? 'star' : 'star-outline'} size={15} /></Pressable>
              <View style={styles.cardBottom}><Text numberOfLines={1} style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardMeta}>Demo proje</Text></View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: 34, paddingHorizontal: 18, paddingTop: 10 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: colors.text, fontSize: 29, fontWeight: '900', letterSpacing: -1 },
  add: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 16, height: 44, justifyContent: 'center', width: 44 },
  tabs: { flexDirection: 'row', gap: 7, marginTop: 22 },
  tab: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8 },
  tabActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { color: colors.textSecondary, fontSize: 10, fontWeight: '800' },
  tabActiveText: { color: colors.black, fontSize: 10, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, height: 230, overflow: 'hidden', position: 'relative', width: '48.5%' },
  favorite: { alignItems: 'center', backgroundColor: 'rgba(5,5,5,0.68)', borderColor: colors.borderStrong, borderRadius: 14, borderWidth: 1, height: 30, justifyContent: 'center', position: 'absolute', right: 9, top: 9, width: 30 },
  cardBottom: { bottom: 0, left: 0, padding: 12, position: 'absolute', right: 0 },
  cardTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  cardMeta: { color: colors.textMuted, fontSize: 9, marginTop: 3 },
});
