import { useLanguageRevision } from '@/i18n/use-language';
import { tr as translateCopy } from '@/i18n/engine';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { apiBaseUrl, apiRequest, captureSessionRequestScope } from '@/api/client';
import { AppHeader, CategoryChip, Icon, Notice, Screen } from '@/components';
import { useAuthStore } from '@/features/auth/auth-store';
import { uploadSourceAsset } from '@/features/create/server';
import { colors, radii, spacing, typography } from '@/theme';

type GenerationOutput = {
  id: string;
  selected: boolean;
  asset: { accessUrl: string | null } | null;
};

type Generation = { id: string; status: string; outputs: GenerationOutput[] };
type ServerMessage = {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
};
type LocalReference = { uri: string; fileName: string };

const starters = ['Daha doğal yap', 'Biraz uzaklaştır', 'Işığı düzelt'];

export default function GenerationEditScreen() {
  const languageRevision = useLanguageRevision();

  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const generationId = Array.isArray(rawId) ? rawId[0] : rawId;
  const accessToken = useAuthStore((store) => store.accessToken);
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [serverMessages, setServerMessages] = useState<ServerMessage[]>([]);
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState<LocalReference | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!generationId) return;
    let active = true;
    void Promise.all([
      apiRequest<Generation>(`/v1/generations/${encodeURIComponent(generationId)}`),
      apiRequest<{ items: ServerMessage[] }>(
        `/v1/generations/${encodeURIComponent(generationId)}/messages`,
      ),
    ])
      .then(([generationResult, messageResult]) => {
        if (!active) return;
        setGeneration(generationResult);
        setServerMessages(messageResult.items);
      })
      .catch((reason) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : translateCopy("Düzenleme açılamadı."));
      });
    return () => {
      active = false;
    };
  }, [generationId]);

  const sourceOutput = useMemo(
    () => generation?.outputs.find((output) => output.selected) ?? generation?.outputs[0] ?? null,
    [generation?.outputs, languageRevision],
  );
  const sourceUrl = sourceOutput?.asset?.accessUrl;
  const imageUri = sourceUrl?.startsWith('/') ? `${apiBaseUrl}${sourceUrl}` : sourceUrl;
  const imageSource = imageUri
    ? {
        uri: imageUri,
        headers:
          sourceUrl?.startsWith('/') && accessToken
            ? { authorization: `Bearer ${accessToken}` }
            : undefined,
      }
    : null;

  const chooseReference = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(translateCopy("Referans eklemek için fotoğraf arşivi izni gerekiyor."));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      selectionLimit: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setReference({
      uri: asset.uri,
      fileName: asset.fileName?.trim() || `duzenleme-referansi-${Date.now()}.jpg`,
    });
  };

  const submitRevision = async (value = message) => {
    const instruction = value.trim();
    if (!instruction || !generationId || !sourceOutput || busy) return;
    setBusy(true);
    setError(null);
    try {
      const scope = captureSessionRequestScope();
      const uploadedReference = reference
        ? await uploadSourceAsset(
            { sourceUri: reference.uri, sourceName: reference.fileName },
            scope.assertCurrent,
          )
        : null;
      scope.assertCurrent();
      const result = await apiRequest<{ generationId: string }>(
        `/v1/generations/${encodeURIComponent(generationId)}/revisions`,
        {
          method: 'POST',
          body: JSON.stringify({
            instruction,
            sourceOutputId: sourceOutput.id,
            quality: 'STANDARD',
            referenceAssetId: uploadedReference?.assetId,
          }),
        },
      );
      setMessage('');
      setReference(null);
      router.replace({
        pathname: '/create/progress',
        params: { generationId: result.generationId },
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : translateCopy("Düzenleme başlatılamadı."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      scroll={false}
      contentContainerStyle={styles.content}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <AppHeader
        back
        title={translateCopy("AI ile düzenle")}
        subtitle={translateCopy("Doğal dilde değişiklik iste")}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={translateCopy("Önce ve sonra karşılaştır")}
            disabled={!generationId}
            onPress={() => router.push(`/generations/${generationId}/compare` as never)}
            style={styles.compare}
          >
            <Icon name="git-compare-outline" size={20} />
          </Pressable>
        }
      />
      <View style={styles.preview}>
        {imageSource ? (
          <Image source={imageSource} resizeMode="cover" style={styles.previewImage} />
        ) : (
          <View style={styles.previewLoading}>
            <ActivityIndicator color={colors.accentYellow} />
          </View>
        )}
        <View style={styles.previewBadge}>
          <Icon name="sparkles" size={14} color={colors.accentYellow} />
          <Text style={styles.previewBadgeText}>{translateCopy("AI düzenleme")}</Text>
        </View>
      </View>
      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          ref={messagesRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onContentSizeChange={() => messagesRef.current?.scrollToEnd({ animated: true })}
        >
          <View style={[styles.bubble, styles.aiBubble]}>
            <Text style={styles.bubbleText}>{translateCopy("Elbette. Sonucu doğal tutarak neyi değiştirmemi istersin?")}</Text>
          </View>
          {serverMessages
            .filter((item) => item.role !== 'SYSTEM')
            .map((item) => (
              <View
                key={item.id}
                style={[styles.bubble, item.role === 'USER' ? styles.userBubble : styles.aiBubble]}
              >
                <Text style={[styles.bubbleText, item.role === 'USER' && styles.userBubbleText]}>
                  {item.content}
                </Text>
              </View>
            ))}
          <Text style={styles.suggestionLabel}>{translateCopy("Önerilen düzenlemeler")}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.suggestions}
          >
            {starters.map((item) => (
              <CategoryChip key={item} label={item} onPress={() => setMessage(item)} />
            ))}
          </ScrollView>
          <Notice tone="neutral">{translateCopy("Her AI düzenlemesi yeni bir sürüm oluşturur; önceki sonucunu her zaman geri alabilirsin.")}</Notice>
        </ScrollView>
        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {reference ? (
          <View style={styles.referenceRow}>
            <Image source={{ uri: reference.uri }} style={styles.referenceThumb} />
            <View style={styles.referenceCopy}>
              <Text style={styles.referenceTitle}>{translateCopy("Görsel referansı eklendi")}</Text>
              <Text numberOfLines={1} style={styles.referenceName}>
                {reference.fileName}
              </Text>
            </View>
            <Pressable accessibilityLabel={translateCopy("Referansı kaldır")} onPress={() => setReference(null)}>
              <Icon name="close-circle" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
        ) : null}
        <View style={styles.composerDock}>
          <View style={styles.composer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={translateCopy("Referans fotoğraf ekle")}
              disabled={busy}
              onPress={chooseReference}
              style={styles.attach}
            >
              <Icon name="attach" size={24} color={colors.textSecondary} />
            </Pressable>
            <TextInput
              value={message}
              editable={!busy}
              onChangeText={setMessage}
              onFocus={() =>
                setTimeout(() => messagesRef.current?.scrollToEnd({ animated: true }), 120)
              }
              onSubmitEditing={() => void submitRevision()}
              returnKeyType="send"
              submitBehavior="submit"
              placeholder={translateCopy("İstediğin değişikliği yaz…")}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
              accessibilityLabel={translateCopy("Düzenleme isteği")}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={translateCopy("Düzenleme isteğini gönder")}
              onPress={() => void submitRevision()}
              style={[styles.send, (!message.trim() || busy || !sourceOutput) && styles.sendDisabled]}
              disabled={!message.trim() || busy || !sourceOutput}
            >
              {busy ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Icon name="arrow-up" size={21} color={colors.background} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: 10 },
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
  preview: {
    height: 230,
    borderRadius: radii.xl,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#080808',
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewImage: { ...StyleSheet.absoluteFill },
  previewLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.overlay,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  previewBadgeText: { ...typography.caption, color: colors.textPrimary, fontWeight: '700' },
  keyboardArea: { flex: 1, minHeight: 0 },
  messages: { flex: 1, marginTop: spacing.md },
  messagesContent: { gap: 10, paddingBottom: 12 },
  bubble: { maxWidth: '86%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: radii.md },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceElevated,
    borderColor: 'rgba(124,58,237,0.55)',
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accentPurple,
    borderBottomRightRadius: 4,
  },
  bubbleText: { ...typography.caption, color: colors.textSecondary, lineHeight: 20 },
  userBubbleText: { color: colors.textPrimary },
  suggestionLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  suggestions: { gap: 8, paddingRight: spacing.lg },
  error: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: radii.md,
    marginBottom: 8,
    padding: 10,
  },
  errorText: { ...typography.caption, color: colors.danger },
  referenceRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: 'rgba(124,58,237,0.55)',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    padding: 8,
  },
  referenceThumb: { width: 42, height: 42, borderRadius: 10 },
  referenceCopy: { flex: 1 },
  referenceTitle: { ...typography.caption, color: colors.textPrimary, fontWeight: '700' },
  referenceName: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
  composerDock: {
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 8 : 10,
    backgroundColor: colors.background,
  },
  composer: {
    minHeight: 60,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  attach: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    maxHeight: 96,
    minHeight: 54,
    ...typography.body,
    color: colors.textPrimary,
    paddingTop: 14,
    paddingBottom: 14,
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accentYellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  sendDisabled: { opacity: 0.38 },
});
