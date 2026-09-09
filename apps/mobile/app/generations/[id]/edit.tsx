import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppHeader, CategoryChip, Icon, Notice, Screen, SourcePreview } from '@/components';
import { useCreateFlow } from '@/features/create/createFlow';
import { colors, radii, spacing, typography } from '@/theme';

type Message = { id: string; role: 'ai' | 'user'; text: string };
const starters = ['Daha doğal yap', 'Biraz uzaklaştır', 'Işığı düzelt', 'Yüzümü koru'];

export default function GenerationEditScreen() {
  const router = useRouter();
  const { flow } = useCreateFlow();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'ai',
      text: 'Elbette. Sonucu doğal tutarak neyi değiştirmemi istersin?',
    },
  ]);
  const send = (value = message) => {
    const clean = value.trim();
    if (!clean) return;
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, role: 'user', text: clean },
      {
        id: `${Date.now()}-ai`,
        role: 'ai',
        text: 'Bu düzenleme yeni bir AI varyasyonu olarak hazırlanacak. Onay ekranında kredi maliyetini görebilirsin.',
      },
    ]);
    setMessage('');
  };
  return (
    <Screen
      scroll={false}
      contentContainerStyle={styles.content}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <AppHeader
        back
        title="AI ile düzenle"
        subtitle="Doğal dilde değişiklik iste"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Önce ve sonra karşılaştır"
            onPress={() => router.push('/generations/demo/compare' as never)}
            style={styles.compare}
          >
            <Icon name="git-compare-outline" size={20} />
          </Pressable>
        }
      />
      <View style={styles.preview}>
        <SourcePreview sourceUri={flow.sourceUri} label="Düzenlenen görsel" />
        <LinearGradient
          colors={['rgba(124,58,237,0.32)', 'rgba(255,196,0,0.19)']}
          style={styles.previewTint}
        />
        <View style={styles.previewBadge}>
          <Icon name="sparkles" size={13} color={colors.accentYellow} />
          <Text style={styles.previewBadgeText}>AI düzenleme</Text>
        </View>
      </View>
      <ScrollView
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((item) => (
          <View
            key={item.id}
            style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}
          >
            <Text style={[styles.bubbleText, item.role === 'user' && styles.userBubbleText]}>
              {item.text}
            </Text>
          </View>
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.suggestions}
      >
        {starters.map((item) => (
          <CategoryChip key={item} label={item} onPress={() => send(item)} />
        ))}
      </ScrollView>
      <Notice tone="neutral">
        Her AI düzenlemesi yeni bir versiyon oluşturur; önceki sonucunu her zaman geri alabilirsin.
      </Notice>
      <View style={styles.composer}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="İstediğin değişikliği yaz…"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
          accessibilityLabel="Düzenleme isteği"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Düzenleme isteğini gönder"
          onPress={() => send()}
          style={[styles.send, !message.trim() && styles.sendDisabled]}
          disabled={!message.trim()}
        >
          <Icon name="arrow-up" size={20} color={colors.background} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: 16 },
  compare: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: { height: 177, borderRadius: radii.lg, overflow: 'hidden', position: 'relative' },
  previewTint: { ...StyleSheet.absoluteFill },
  previewBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    minHeight: 26,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.overlay,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewBadgeText: { ...typography.caption, color: colors.textPrimary, fontSize: 10 },
  messages: { flex: 1, marginTop: spacing.md },
  messagesContent: { gap: 9, paddingBottom: 12 },
  bubble: { maxWidth: '86%', paddingHorizontal: 13, paddingVertical: 10, borderRadius: radii.md },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceElevated,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accentPurple,
    borderBottomRightRadius: 4,
  },
  bubbleText: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  userBubbleText: { color: colors.textPrimary },
  suggestions: { gap: 8, paddingBottom: 10, paddingRight: spacing.lg },
  composer: {
    minHeight: 54,
    marginTop: 11,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingLeft: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    maxHeight: 90,
    minHeight: 50,
    ...typography.body,
    color: colors.textPrimary,
    paddingTop: 13,
    paddingBottom: 13,
  },
  send: {
    width: 41,
    height: 41,
    borderRadius: 14,
    backgroundColor: colors.accentYellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  sendDisabled: { opacity: 0.38 },
});
