import { useLanguageRevision } from '@/i18n/use-language';
import { tr as translateCopy } from '@/i18n/engine';
import { useRef, useState } from 'react';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Icon } from '@/components';
import { colors, radii, spacing, typography } from '@/theme';
import { AI_DISCLOSURE } from './output';
import { exportGeneratedImage, type ShareDestination } from './native-share';

type ShareAction =
  | {
      destination: Extract<ShareDestination, 'save' | 'other'>;
      label: string;
      icon: React.ComponentProps<typeof Icon>['name'];
      brand?: never;
    }
  | {
      destination: Extract<ShareDestination, 'Instagram' | 'X / Twitter' | 'Facebook'>;
      label: string;
      brand: 'instagram' | 'x-twitter' | 'facebook';
      icon?: never;
    };

const actions: ShareAction[] = [
  { destination: 'save', get label() { return translateCopy("Fotoğrafa Kaydet"); }, icon: 'download-outline' },
  { destination: 'Instagram', label: 'Instagram', brand: 'instagram' },
  { destination: 'X / Twitter', label: 'X / Twitter', brand: 'x-twitter' },
  { destination: 'Facebook', label: 'Facebook', brand: 'facebook' },
  { destination: 'other', get label() { return translateCopy("Diğer"); }, icon: 'ellipsis-horizontal' },
];

const disclosureTags = ['#BirKareAI', '#AIileOlusturuldu', '#DijitalSanat'];

export function GeneratedSharePanel({
  generationId,
  outputId,
  ready,
}: {
  generationId: string;
  outputId?: string;
  ready: boolean;
}) {
  const languageRevision = useLanguageRevision();

  const inFlight = useRef(false);
  const [busy, setBusy] = useState<ShareDestination | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [disclosureOpen, setDisclosureOpen] = useState(true);

  const run = async (destination: ShareDestination) => {
    if (!ready || inFlight.current) return;
    inFlight.current = true;
    setBusy(destination);
    setFeedback(null);
    try {
      await exportGeneratedImage(generationId, outputId, destination);
      if (destination === 'save') setFeedback(translateCopy("Görsel Fotoğraflara kaydedildi."));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : translateCopy("Paylaşım hazırlanamadı. Tekrar dene."));
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.actions}>
        {actions.map((action) => {
          const active = busy === action.destination;
          return (
            <Pressable
              key={action.destination}
              accessibilityRole="button"
              accessibilityLabel={
                action.destination === 'save'
                  ? translateCopy("Fotoğrafı Fotoğraflara kaydet")
                  : translateCopy("{{p0}} için paylaşım menüsünü aç", { p0: action.label.replace('\\n', ' ') })
              }
              accessibilityState={{ disabled: !ready || Boolean(busy), busy: active }}
              disabled={!ready || Boolean(busy)}
              onPress={() => void run(action.destination)}
              style={({ pressed }) => [
                styles.action,
                action.destination === 'save' && styles.saveAction,
                (!ready || Boolean(busy)) && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.iconShell,
                  action.destination === 'save' && styles.saveIconShell,
                  action.destination === 'Facebook' && styles.facebookShell,
                ]}
              >
                {active ? (
                  <ActivityIndicator
                    size="small"
                    color={action.destination === 'save' ? colors.textPrimary : colors.accentYellow}
                  />
                ) : action.brand === 'instagram' ? (
                  <LinearGradient
                    colors={['#833AB4', '#E1306C', '#F77737']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.instagramBadge}
                  >
                    <FontAwesome6
                      name="instagram"
                      iconStyle="brand"
                      size={22}
                      color={colors.textPrimary}
                    />
                  </LinearGradient>
                ) : action.brand ? (
                  <FontAwesome6
                    name={action.brand}
                    iconStyle="brand"
                    size={22}
                    color={
                      action.brand === 'facebook'
                        ? '#FFFFFF'
                        : colors.textPrimary
                    }
                  />
                ) : (
                  <Icon
                    name={action.icon}
                    size={23}
                    color={action.destination === 'save' ? colors.textPrimary : colors.textPrimary}
                  />
                )}
              </View>
              <Text
                numberOfLines={2}
                style={[
                  styles.actionLabel,
                  action.destination === 'save' && styles.saveActionLabel,
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {feedback ? (
        <Text accessibilityLiveRegion="polite" style={styles.feedback}>
          {feedback}
        </Text>
      ) : null}

      <View style={styles.disclosureCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: disclosureOpen }}
          accessibilityLabel={translateCopy("AI açıklamasını göster veya gizle")}
          onPress={() => setDisclosureOpen((value) => !value)}
          style={styles.disclosureHeader}
        >
          <View style={styles.disclosureHeading}>
            <Icon name="sparkles" size={17} color={colors.textPrimary} />
            <Text style={styles.disclosureTitle}>{translateCopy("AI Açıklaması")}</Text>
          </View>
          <Icon
            name={disclosureOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>
        {disclosureOpen ? (
          <View style={styles.disclosureBody}>
            <Text selectable style={styles.disclosureText}>
              {AI_DISCLOSURE}
            </Text>
            <View style={styles.tags}>
              {disclosureTags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      {!ready ? (
        <Text style={styles.unavailable}>{translateCopy("Paylaşım, tamamlanan gerçek üretim hazır olduğunda açılır.")}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  actions: { flexDirection: 'row', gap: 8 },
  action: {
    flex: 1,
    minWidth: 0,
    minHeight: 94,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.025)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 3,
    paddingVertical: 9,
  },
  saveAction: {
    borderColor: 'rgba(255,226,158,0.68)',
    backgroundColor: 'rgba(255,196,0,0.055)',
  },
  iconShell: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.025)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  saveIconShell: {
    borderColor: 'rgba(255,226,158,0.50)',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  facebookShell: {
    borderColor: '#1877F255',
    backgroundColor: '#1877F2',
  },
  instagramBadge: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveActionLabel: { color: colors.textPrimary },
  feedback: {
    ...typography.caption,
    color: colors.accentYellow,
    textAlign: 'center',
    lineHeight: 19,
  },
  disclosureCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#141211',
    overflow: 'hidden',
  },
  disclosureHeader: {
    minHeight: 58,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disclosureHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  disclosureTitle: { ...typography.label, color: colors.textPrimary, fontWeight: '800' },
  disclosureBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 12,
  },
  disclosureText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 20,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tag: {
    minHeight: 30,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  tagText: { ...typography.caption, color: colors.textSecondary, fontSize: 10 },
  unavailable: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.74, transform: [{ scale: 0.98 }] },
});
