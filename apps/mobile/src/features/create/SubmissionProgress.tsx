import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { GlassSurface, Icon } from '@/components';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { submissionStageLabels, type SubmissionStage } from './server';

const stages: SubmissionStage[] = [
  'CHECKING',
  'READING',
  'UPLOADING',
  'CREATING',
  'QUEUEING',
  'QUEUED',
];

/** Stage-based feedback, not an invented byte-upload percentage. */
export function SubmissionProgress({ stage }: { stage: SubmissionStage }) {
  const reducedMotion = useReducedMotion();
  const [fill] = useState(() => new Animated.Value(0));
  const index = stages.indexOf(stage);
  useEffect(() => {
    fill.stopAnimation();
    const target = index / (stages.length - 1);
    if (reducedMotion) {
      fill.setValue(target);
      return;
    }
    const animation = Animated.timing(fill, {
      toValue: target,
      duration: 520,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [fill, index, reducedMotion]);
  return (
    <GlassSurface radius={20} tone="gold" glow={false} contentStyle={styles.content}>
      <View style={styles.heading}>
        <Icon
          name={stage === 'QUEUED' ? 'checkmark-circle-outline' : 'cloud-upload-outline'}
          color="#FFE8A6"
          size={21}
        />
        <Text style={styles.title} accessibilityLiveRegion="polite">
          {submissionStageLabels[stage]}
        </Text>
      </View>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 5, now: index, text: submissionStageLabels[stage] }}
      >
        <Animated.View
          style={[
            styles.fill,
            { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        >
          <LinearGradient
            colors={['#FFF2C3', '#D2A52D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
      <Text style={styles.detail}>
        Yükleme ve başlatma aşamaları tamamlandıkça ilerler. Tekrar dokunmana gerek yok.
      </Text>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  content: { padding: 15, gap: 11 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: { color: '#FFF4D8', fontSize: 13, fontWeight: '600', flex: 1 },
  track: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  fill: { position: 'absolute', top: 0, left: 0, bottom: 0, borderRadius: 4, overflow: 'hidden' },
  detail: { fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 16 },
});
