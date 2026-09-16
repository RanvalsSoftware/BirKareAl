import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { GlassSurface, Icon, Screen } from '@/components';
import { CreateHeader } from '@/features/create/components';
import { resetStudioFlow, updateStudioFlow, type StudioMode } from '@/features/studio/studioFlow';
import { useStudioCatalog } from '@/features/studio/useStudioCatalog';
import { colors, radii, spacing, typography } from '@/theme';

export default function StudioHomeScreen() {
  const router = useRouter();
  const { fontScale } = useWindowDimensions();
  const { previewCredits, studioModeCards } = useStudioCatalog();
  const cardHeight = Math.round(250 + Math.max(0, fontScale - 1) * 88);

  function openMode(
    entry: string,
    mode: StudioMode,
    defaults: { defaultSceneId?: string; defaultPresetId?: string },
  ) {
    resetStudioFlow(mode);
    updateStudioFlow({
      sceneId: defaults.defaultSceneId ?? null,
      presetId: defaults.defaultPresetId ?? null,
    });
    router.push({ pathname: `/studio/${mode}`, params: { entry } } as never);
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <CreateHeader
        fallback="/(tabs)/home"
        title="BirKare Stüdyo"
        subtitle="Ürününü gerçeğine sadık kalarak sun"
      />

      <LinearGradient colors={['#2B2006', '#111114', '#221235']} style={styles.hero}>
        <View style={styles.heroIcon}>
          <Icon name="camera-outline" size={29} color={colors.accentYellow} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Doğru ürün. Doğru sahne. Kontrollü üretim.</Text>
          <Text style={styles.heroBody}>
            Prompt, model ve kredi hesabı sunucuda seçilir; yüklediğin ürün yeniden tasarlanmaz.
          </Text>
        </View>
      </LinearGradient>

      <Text style={styles.heading}>Ne hazırlamak istersin?</Text>
      <View style={styles.cards}>
        {studioModeCards.map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.name}. ${item.description}`}
            key={item.id}
            onPress={() => openMode(item.id, item.mode, item)}
            style={({ pressed }) => [
              styles.card,
              { height: cardHeight },
              pressed && styles.pressed,
            ]}
          >
            <GlassSurface
              contentStyle={styles.cardInner}
              glow={false}
              radius={radii.xl}
              tone={item.mode === 'fashion' ? 'iridescent' : 'gold'}
              style={StyleSheet.absoluteFill}
            >
              <View style={styles.cardImageWrap}>
                <LinearGradient colors={item.palette} style={StyleSheet.absoluteFill} />
                {item.imageSource ? (
                  <Image source={item.imageSource} resizeMode="cover" style={styles.cardImage} />
                ) : null}
                <LinearGradient
                  colors={['rgba(5,5,5,0)', 'rgba(5,5,5,0.74)']}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.imageBadge}>
                  <Icon name={item.icon} size={16} color={colors.accentYellow} />
                  <Text style={styles.imageBadgeText}>{item.creditCost} krediden başlayan</Text>
                </View>
              </View>
              <View style={styles.cardCopy}>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardDescription}>{item.description}</Text>
                </View>
                <View style={styles.arrow}>
                  <Icon name="arrow-forward" size={20} color={colors.textPrimary} />
                </View>
              </View>
            </GlassSurface>
          </Pressable>
        ))}
      </View>

      <View style={styles.assurance}>
        <Icon name="shield-checkmark-outline" size={22} color="#EFD57B" />
        <Text style={styles.assuranceText}>
          Önizleme {previewCredits} kredi. Üretim başlamazsa veya sonuç teslim edilmezse ayrılan
          kredi iade edilir.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 48 },
  hero: {
    borderColor: 'rgba(255,215,95,0.42)',
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginTop: spacing.lg,
    overflow: 'hidden',
    padding: 17,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,196,0,0.10)',
    borderColor: 'rgba(255,196,0,0.36)',
    borderRadius: 19,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  heroCopy: { flex: 1, minWidth: 0 },
  heroTitle: { ...typography.h3, color: colors.textPrimary, marginTop: 4 },
  heroBody: { ...typography.caption, color: '#C7C2B8', lineHeight: 18, marginTop: 5 },
  heading: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.xl },
  cards: { gap: 12, marginTop: spacing.md },
  card: { borderRadius: radii.xl, minHeight: 218, overflow: 'hidden' },
  cardInner: { flex: 1, padding: 7 },
  cardImageWrap: { aspectRatio: 12 / 5, borderRadius: 21, overflow: 'hidden' },
  cardImage: { height: '100%', width: '100%' },
  imageBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(5,5,5,0.70)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: 'absolute',
    top: 10,
  },
  imageBadgeText: { ...typography.caption, color: colors.textPrimary, fontWeight: '800' },
  cardCopy: { alignItems: 'center', flexDirection: 'row', gap: 12, padding: 12 },
  cardText: { flex: 1, minWidth: 0 },
  cardTitle: { ...typography.h3, color: colors.textPrimary },
  cardDescription: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  arrow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 19,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  assurance: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,196,0,0.045)',
    borderColor: 'rgba(255,196,0,0.18)',
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.lg,
    padding: 14,
  },
  assuranceText: { ...typography.caption, color: colors.textSecondary, flex: 1, lineHeight: 18 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.988 }] },
});
