import { useRef, useState } from 'react';
import { FontAwesome6 } from '@expo/vector-icons';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { GlassSurface, Icon } from '@/components';
import { colors, spacing, typography } from '@/theme';
import { AI_DISCLOSURE } from './output';
import { exportGeneratedImage, type ShareDestination } from './native-share';

const networks = [
  { name: 'Instagram', icon: 'instagram', color: '#ED7BB0' },
  { name: 'X / Twitter', icon: 'x-twitter', color: '#FFFFFF' },
  { name: 'Facebook', icon: 'facebook', color: '#438EFF' },
] as const;

export function GeneratedSharePanel({
  generationId,
  outputId,
  ready,
}: {
  generationId: string;
  outputId?: string;
  ready: boolean;
}) {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState<ShareDestination | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const run = async (destination: ShareDestination) => {
    if (!ready || inFlight.current) return;
    inFlight.current = true;
    setBusy(destination);
    setFeedback(null);
    try {
      await exportGeneratedImage(generationId, outputId, destination);
      if (destination === 'save') setFeedback('Görsel Fotoğraflara kaydedildi.');
      // Opening/dismissing the OS sheet is not proof of publication.
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Paylaşım hazırlanamadı. Tekrar dene.');
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };
  const shareText = async () => {
    try {
      await Share.share({ message: AI_DISCLOSURE });
    } catch {
      Alert.alert('Açıklama paylaşılamadı', 'Lütfen tekrar dene.');
    }
  };
  return (
    <GlassSurface tone="gold" contentStyle={styles.panel}>
      <View style={styles.heading}>
        <Icon name="share-social-outline" size={22} color={colors.accentYellow} />
        <Text accessibilityRole="header" style={styles.title}>
          Kareyi paylaş
        </Text>
      </View>
      <Text style={styles.description}>
        Seçtiğin AI görseli, orijinal çıktı kalitesiyle paylaşılır.
      </Text>
      <View style={styles.networks}>
        {networks.map((network) => (
          <Pressable
            key={network.name}
            disabled={!ready || Boolean(busy)}
            accessibilityRole="button"
            accessibilityLabel={`${network.name} için görsel paylaşım menüsünü aç`}
            accessibilityState={{ disabled: !ready || Boolean(busy), busy: busy === network.name }}
            onPress={() => void run(network.name)}
            style={({ pressed }) => [
              styles.network,
              (!ready || Boolean(busy)) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.networkIcon, { borderColor: `${network.color}60` }]}>
              <FontAwesome6 name={network.icon} iconStyle="brand" size={25} color={network.color} />
            </View>
            <Text style={styles.networkLabel}>{network.name}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>
        Telefonunun paylaşım menüsü açılır; paylaşmak istediğin uygulamayı sen seçersin. Uygulama
        görünmüyorsa görseli kaydedip oradan yükleyebilirsin.
      </Text>
      <View style={styles.actions}>
        <Pressable
          disabled={!ready || Boolean(busy)}
          accessibilityRole="button"
          onPress={() => void run('save')}
          style={[styles.action, (!ready || Boolean(busy)) && styles.disabled]}
        >
          <Icon name="download-outline" size={18} />
          <Text style={styles.actionText}>Fotoğraflara kaydet</Text>
        </Pressable>
        <Pressable
          disabled={!ready || Boolean(busy)}
          accessibilityRole="button"
          onPress={() => void run('other')}
          style={[styles.action, (!ready || Boolean(busy)) && styles.disabled]}
        >
          <Icon name="ellipsis-horizontal" size={18} />
          <Text style={styles.actionText}>Diğer</Text>
        </Pressable>
      </View>
      {busy ? (
        <View accessibilityLiveRegion="polite" style={styles.loading}>
          <ActivityIndicator size="small" color={colors.accentYellow} />
          <Text style={styles.hint}>Görsel hazırlanıyor…</Text>
        </View>
      ) : null}
      {feedback ? (
        <Text accessibilityLiveRegion="polite" style={styles.feedback}>
          {feedback}
        </Text>
      ) : null}
      {!ready ? (
        <Text style={styles.hint}>Bu alan yalnızca tamamlanan gerçek üretimlerde açılır.</Text>
      ) : null}
      <View style={styles.disclosure}>
        <Text style={styles.disclosureTitle}>AI açıklamasını eklemeyi unutma</Text>
        <Text selectable style={styles.hint}>
          {AI_DISCLOSURE}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void shareText()}
          style={styles.textAction}
        >
          <Text style={styles.textActionLabel}>Açıklama metnini paylaş</Text>
          <Icon name="arrow-up-outline" size={16} color={colors.accentYellow} />
        </Pressable>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  panel: { padding: spacing.lg, gap: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: { ...typography.h3, color: colors.textPrimary },
  description: { ...typography.body, color: colors.textSecondary },
  networks: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  network: {
    flex: 1,
    alignItems: 'center',
    gap: 9,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  networkIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  networkLabel: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
  hint: { ...typography.caption, color: colors.textSecondary, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 8 },
  action: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 6,
  },
  actionText: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  feedback: { ...typography.caption, color: colors.accentYellow, lineHeight: 20 },
  disclosure: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 14,
    gap: 8,
  },
  disclosureTitle: { ...typography.label, color: colors.textPrimary },
  textAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  textActionLabel: { ...typography.caption, fontWeight: '700', color: colors.accentYellow },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
});
