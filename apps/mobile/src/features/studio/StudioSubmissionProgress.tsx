import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { GlassSurface, Icon } from '@/components';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  studioSubmissionLabels,
  type StudioSubmissionStage,
} from '@/features/studio/server';

const stages: StudioSubmissionStage[] = [
  'CHECKING',
  'READING_PRIMARY',
  'UPLOADING_PRIMARY',
  'READING_SECONDARY',
  'UPLOADING_SECONDARY',
  'CREATING',
  'QUEUEING',
  'QUEUED',
];

export function StudioSubmissionProgress({ stage }: { stage: StudioSubmissionStage }) {
  const reducedMotion = useReducedMotion();
  const [fill] = useState(() => new Animated.Value(0));
  const index = Math.max(0, stages.indexOf(stage));

  useEffect(() => {
    fill.stopAnimation();
    const animation = Animated.timing(fill, {
      toValue: index / (stages.length - 1),
      duration: reducedMotion ? 0 : 420,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [fill, index, reducedMotion]);

  return (
    <GlassSurface contentStyle={styles.content} glow={false} radius={20} tone="gold">
      <View style={styles.row}>
        <Icon name="cloud-upload-outline" size={20} color="#FFE59A" />
        <Text accessibilityLiveRegion="polite" style={styles.title}>
          {studioSubmissionLabels[stage]}
        </Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: stages.length - 1, now: index }}
        style={styles.track}
      >
        <Animated.View
          style={[
            styles.fill,
            { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        >
          <LinearGradient
            colors={['#FFF1B8', '#FFC400', '#9B53F5']}
            end={{ x: 1, y: 0 }}
            start={{ x: 0, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
      <Text style={styles.detail}>Her görsel bir kez yüklenir; aynı isteğe tekrar dokunma.</Text>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  content: { gap: 10, padding: 14 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  title: { color: '#FFF2CD', flex: 1, fontSize: 13, fontWeight: '700' },
  track: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.13)',
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    height: 8,
    overflow: 'hidden',
  },
  fill: { bottom: 0, left: 0, overflow: 'hidden', position: 'absolute', top: 0 },
  detail: { color: 'rgba(255,255,255,0.50)', fontSize: 11, lineHeight: 16 },
});
