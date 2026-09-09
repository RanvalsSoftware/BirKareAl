import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';

import { Notice, Screen } from '@/components';
import { useCreateFlow, type AspectRatio } from '@/features/create/createFlow';
import { CreateHeader, FieldLabel, MiniChoice, WizardFooter } from '@/features/create/components';
import { afterSourcePath } from '@/features/create/workflow';
import { colors, radii, spacing } from '@/theme';

const ratios: AspectRatio[] = ['1:1', '4:5', '9:16', '16:9'];

export default function CropScreen() {
  const router = useRouter();
  const { flow, set } = useCreateFlow();
  const [rotation, setRotation] = useState(0);
  const [ratio, setRatio] = useState(flow.aspectRatio);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [width, height] = ratio.split(':').map(Number);
  if (!flow.sourceUri) return <Redirect href="/create/upload" />;

  const save = async () => {
    if (saving || !flow.sourceUri) return;
    setSaving(true);
    setError(null);
    try {
      const normalizedRotation = ((rotation % 360) + 360) % 360;
      const rotated = normalizedRotation
        ? await ImageManipulator.manipulateAsync(flow.sourceUri, [{ rotate: normalizedRotation }], {
            compress: 0.95,
            format: ImageManipulator.SaveFormat.JPEG,
          })
        : null;
      const selection = {
        ...flow,
        aspectRatio: ratio,
        ...(rotated ? { sourceUri: rotated.uri, sourceName: 'birkare-rotated.jpg' } : {}),
      };
      set(selection);
      router.dismissTo(afterSourcePath(selection) as never);
    } catch {
      setError('Döndürme kaydedilemedi. Kaynak görsel değişmedi; tekrar deneyebilirsin.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <CreateHeader title="Kadrajı düzenle" subtitle="Orijinal dosyan değişmez" step={2} />
      <View style={[styles.previewWrap, { aspectRatio: width / height }]}>
        <Image
          source={{ uri: flow.sourceUri }}
          resizeMode="contain"
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [
                { rotate: `${rotation}deg` },
                {
                  scale: Math.abs(rotation / 90) % 2 ? Math.min(width / height, height / width) : 1,
                },
              ],
            },
          ]}
        />
      </View>
      <FieldLabel>Çıktı oranı</FieldLabel>
      <View style={styles.choiceRow} accessibilityRole="radiogroup">
        {ratios.map((option) => (
          <MiniChoice
            key={option}
            label={option}
            selected={ratio === option}
            onPress={() => setRatio(option)}
          />
        ))}
      </View>
      <FieldLabel>Fotoğrafı döndür</FieldLabel>
      <View style={styles.choiceRow}>
        <MiniChoice
          label="↶ 90°"
          selected={false}
          onPress={() => setRotation((value) => value - 90)}
        />
        <MiniChoice
          label="↷ 90°"
          selected={false}
          onPress={() => setRotation((value) => value + 90)}
        />
        <MiniChoice label="Sıfırla" selected={false} onPress={() => setRotation(0)} />
      </View>
      <View style={styles.note}>
        <Notice tone="neutral" title="Kaynak korunur">
          Döndürme, üretime gönderilecek kopyaya uygulanır. Çerçeve çıktı oranını gösterir; AI bu
          orana göre yeniden kadrajlar veya genişletir. Bu ekran elle kırpma yapmaz.
        </Notice>
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <WizardFooter label="Kadrajı uygula" onPress={save} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 42 },
  previewWrap: {
    marginTop: spacing.lg,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: '#141416',
    borderColor: colors.border,
    borderWidth: 1,
  },
  choiceRow: { flexDirection: 'row', gap: 8 },
  note: { marginTop: spacing.lg },
  error: { color: colors.textSecondary, marginTop: spacing.md },
});
