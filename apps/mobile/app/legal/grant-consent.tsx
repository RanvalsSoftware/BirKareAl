import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { apiRequest } from '@/api/client';
import { GlassSurface, Icon } from '@/components';
import { explicitConsentSections } from '@/features/legal/privacy-notice';
import { clearPendingImageProcessingConsent } from '@/features/legal/image-processing-consent';
import { SettingsPage, SettingsNote } from '@/features/settings/components';
import { colors, spacing, typography } from '@/theme';
import { tr as translateCopy } from '@/i18n/engine';

export default function GrantImageConsentScreen() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function grant() {
    if (!accepted || saving) return;
    setSaving(true);
    setError(null);
    try {
      await apiRequest('/v1/me/consents/image-processing', {
        method: 'POST',
        body: JSON.stringify({ accepted: true }),
      });
      await clearPendingImageProcessingConsent();
      if (router.canGoBack()) router.back();
      else router.replace('/create/upload' as never);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translateCopy('Açık rıza kaydedilemedi.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsPage
      title={translateCopy('Açık Rıza Metni')}
      subtitle={translateCopy('Fotoğraf işlemeden önce ayrı izin')}
      back
    >
      <GlassSurface radius={24} tone="neutral" glow={false} contentStyle={styles.document}>
        {explicitConsentSections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </GlassSurface>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        onPress={() => setAccepted((value) => !value)}
        style={styles.choice}
      >
        <Icon
          name={accepted ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={accepted ? colors.accentYellow : colors.textSecondary}
        />
        <Text style={styles.choiceText}>
          {translateCopy("Açık Rıza Metni'ni okudum, izin veriyorum.")}
        </Text>
      </Pressable>
      {error ? <SettingsNote warning>{error}</SettingsNote> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !accepted || saving }}
        disabled={!accepted || saving}
        onPress={() => void grant()}
        style={[styles.button, (!accepted || saving) && styles.disabled]}
      >
        <Text style={styles.buttonText}>
          {saving ? translateCopy('Kaydediliyor…') : translateCopy('Onayla ve devam et')}
        </Text>
      </Pressable>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  document: { gap: spacing.lg, padding: spacing.lg },
  section: { gap: 7 },
  heading: { ...typography.h3, color: colors.textPrimary },
  body: { ...typography.body, color: '#B7B3BF', lineHeight: 24 },
  choice: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: spacing.md },
  choiceText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  button: {
    alignItems: 'center',
    backgroundColor: colors.accentYellow,
    borderRadius: 18,
    minHeight: 54,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  disabled: { opacity: 0.45 },
  buttonText: { color: colors.background, fontSize: 15, fontWeight: '900' },
});
