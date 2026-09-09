import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { AppHeader, Icon, Notice, PrimaryButton, Screen, SettingRow, VisualTile } from '@/components';
import { colors, radii, spacing, typography } from '@/theme';

const versions = [
  { id: 'v1', title: 'İlk üretim', palette: ['#27104C', '#135E73'] as const, icon: '◈', date: 'Bugün · 14:32' },
  { id: 'v2', title: 'Işık düzenlemesi', palette: ['#3C235B', '#C49630'] as const, icon: '✦', date: 'Bugün · 14:35' },
  { id: 'v3', title: 'Son versiyon', palette: ['#19576A', '#AB762B'] as const, icon: '◉', date: 'Bugün · 14:37' }
];

export default function ProjectDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const title = id === 'soft-bokeh' ? 'Yumuşak bokeh' : id === 'award-evening' ? 'Ödül gecesi' : 'Şehir ışıkları';
  return (
    <Screen contentContainerStyle={styles.content}>
      <AppHeader back title={title} subtitle="Bugün · 14:37" />
      <LinearGradient colors={['#27104C', '#135E73']} style={styles.preview}><View style={styles.previewOrb}><Text style={styles.previewGlyph}>◈</Text></View><View style={styles.aiBadge}><Icon name="sparkles" size={12} color={colors.accentYellow} /><Text style={styles.aiBadgeText}>AI ile oluşturuldu</Text></View></LinearGradient>
      <View style={styles.actions}><PrimaryButton label="Düzenlemeye devam et" icon="sparkles-outline" onPress={() => router.push('/generations/demo/edit' as never)} style={styles.actionPrimary} /><IconAction name="download-outline" label="İndir" onPress={() => router.push('/generations/demo/export' as never)} /><IconAction name="share-outline" label="Paylaş" onPress={() => router.push('/generations/demo/export' as never)} /></View>
      <Text style={styles.sectionTitle}>Sürüm geçmişi</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.versions}>{versions.map((version) => <VisualTile key={version.id} size="small" title={version.title} subtitle={version.date} palette={version.palette} icon={version.icon} badge={version.id === 'v3' ? 'AKTİF' : undefined} onPress={() => router.push('/generations/demo/results' as never)} />)}</ScrollView>
      <Text style={styles.sectionTitle}>Proje ayrıntıları</Text>
      <View style={styles.details}><SettingRow icon="images-outline" title="Şablon" detail="Şehir Işıkları" /><SettingRow icon="color-filter-outline" title="Tarz" detail="Sinematik" /><SettingRow icon="flash-outline" title="Kullanılan kredi" value="−2" /></View>
      <Notice tone="neutral">Orijinal kaynak dosyan hiçbir zaman bu sonuçla üzerine yazılmaz. Versiyonlar arasından dilediğine dönebilirsin.</Notice>
      <Text accessibilityRole="button" onPress={() => Alert.alert('Projeyi sil', 'Bu demo akışında proje silinmez. Gerçek uygulamada geri alınamaz onayı gösterilir.')} style={styles.delete}>Projeyi sil</Text>
    </Screen>
  );
}

function IconAction({ name, label, onPress }: { name: React.ComponentProps<typeof Icon>['name']; label: string; onPress: () => void }) {
  return <View accessibilityRole="button" accessibilityLabel={label} onTouchEnd={onPress} style={styles.iconAction}><Icon name={name} size={20} color={colors.textPrimary} /></View>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 42 },
  preview: { height: 315, borderRadius: radii.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  previewOrb: { width: 128, height: 128, borderRadius: 64, backgroundColor: 'rgba(0,0,0,0.24)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.37)', alignItems: 'center', justifyContent: 'center' },
  previewGlyph: { color: colors.textPrimary, fontSize: 46, fontWeight: '900' },
  aiBadge: { position: 'absolute', left: 12, bottom: 12, minHeight: 28, paddingHorizontal: 9, borderRadius: radii.pill, backgroundColor: colors.overlay, flexDirection: 'row', alignItems: 'center', gap: 4 },
  aiBadgeText: { ...typography.caption, fontSize: 10, color: colors.textPrimary, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 9, marginTop: spacing.md },
  actionPrimary: { flex: 1 },
  iconAction: { width: 50, height: 48, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.sm },
  versions: { gap: 10, paddingRight: spacing.lg },
  details: { backgroundColor: colors.surface, paddingHorizontal: 12, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
  delete: { ...typography.label, color: colors.danger, textAlign: 'center', marginTop: spacing.xl }
});
