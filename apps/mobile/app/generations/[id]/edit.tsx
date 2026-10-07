import { useLanguageRevision } from '@/i18n/use-language';
import { tr as translateCopy } from '@/i18n/engine';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiBaseUrl, apiRequest, captureSessionRequestScope } from '@/api/client';
import { AppHeader, Icon, Screen } from '@/components';
import { useAuthStore } from '@/features/auth/auth-store';
import { uploadSourceAsset } from '@/features/create/server';
import { shareAspectRatio } from '@/features/sharing/output';
import { colors, radii, spacing, typography } from '@/theme';

type GenerationOutput = {
  id: string;
  selected: boolean;
  asset: { accessUrl: string | null } | null;
};

type Generation = {
  id: string;
  projectId: string;
  status: string;
  aspectRatio: string;
  outputs: GenerationOutput[];
};
type ProjectModeResponse = { project: { mode: string } };
type ServerMessage = {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
};
type LocalReference = { uri: string; fileName: string };

const productStarterKeys = [
  'Ürünü ve etiketi değiştirme',
  'Arka planı beyazlat',
  'Gölgeyi yumuşat',
  'Ürünün sağında metin alanı bırak',
  'Renk sıcaklığını dengele',
  'Kadrajı biraz genişlet',
];
const legacyStarterKeys = [
  'Daha doğal yap',
  'Biraz uzaklaştır',
  'Işığı düzelt',
  'Arka planı sadeleştir',
  'Renkleri dengele',
  'Sinematik bir stil uygula',
];
const productToolItems = [
  {
    get label() {
      return translateCopy('Ürünü koru');
    },
    icon: 'cube-outline',
    prompt: 'Ürünü, etiketi, logoyu, malzemeyi ve geometriyi değiştirme.',
  },
  { label: 'Arka plan', icon: 'image-outline', prompt: 'Arka planı temiz ve beyaz yap.' },
  {
    get label() {
      return translateCopy('Gölge');
    },
    icon: 'contrast-outline',
    prompt: 'Ürünün gölgesini daha yumuşak ve doğal yap.',
  },
  { label: 'Kadraj', icon: 'scan-outline', prompt: 'Ürünün sağında metin için boş alan bırak.' },
  {
    label: 'Renk',
    icon: 'color-palette-outline',
    prompt: 'Ürünü değiştirmeden renk sıcaklığını dengele.',
  },
] as const;
const legacyToolItems = [
  {
    get label() {
      return translateCopy('Yüzü koru');
    },
    icon: 'person-outline',
    prompt: 'Yüzümü ve kimliğimi koruyarak düzenle.',
  },
  { label: 'Arka plan', icon: 'image-outline', prompt: 'Arka planı sadeleştir' },
  {
    get label() {
      return translateCopy('Işık');
    },
    icon: 'sunny-outline',
    prompt: 'Işığı düzelt',
  },
  { label: 'Renk', icon: 'color-palette-outline', prompt: 'Renkleri dengele' },
  { label: 'Stil', icon: 'sparkles-outline', prompt: 'Sinematik bir stil uygula' },
] as const;

export default function GenerationEditScreen() {
  const languageRevision = useLanguageRevision();
  const insets = useSafeAreaInsets();
  const viewport = useWindowDimensions();

  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const generationId = Array.isArray(rawId) ? rawId[0] : rawId;
  const accessToken = useAuthStore((store) => store.accessToken);
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [projectMode, setProjectMode] = useState<{
    generationId: string;
    mode: string;
  } | null>(null);
  const [serverMessages, setServerMessages] = useState<ServerMessage[]>([]);
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState<LocalReference | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allSuggestions, setAllSuggestions] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const messagesRef = useRef<ScrollView>(null);
  const isProductProject =
    projectMode !== null &&
    projectMode.generationId === generationId &&
    projectMode.mode === 'PRODUCT_STUDIO';
  const starters = useMemo(
    () =>
      (isProductProject ? productStarterKeys : legacyStarterKeys).map((item) =>
        translateCopy(item),
      ),
    [isProductProject, languageRevision],
  );
  const tools = isProductProject ? productToolItems : legacyToolItems;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (!generationId) return;
    let active = true;
    void (async () => {
      try {
        const [generationResult, messageResult] = await Promise.all([
          apiRequest<Generation>(`/v1/generations/${encodeURIComponent(generationId)}`),
          apiRequest<{ items: ServerMessage[] }>(
            `/v1/generations/${encodeURIComponent(generationId)}/messages`,
          ),
        ]);
        if (!active) return;
        setGeneration(generationResult);
        setServerMessages(messageResult.items);
        try {
          const projectResult = await apiRequest<ProjectModeResponse>(
            `/v1/projects/${encodeURIComponent(generationResult.projectId)}`,
          );
          if (active) {
            setProjectMode({ generationId, mode: projectResult.project.mode });
          }
        } catch {
          // The editor remains usable with its legacy-safe copy if project
          // metadata cannot be loaded independently from the generation.
          if (active) setProjectMode({ generationId, mode: 'UNKNOWN' });
        }
      } catch (reason) {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : translateCopy('Düzenleme açılamadı.'));
      }
    })();
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
  const previewAspectRatio = shareAspectRatio(generation?.aspectRatio);
  const availablePreviewWidth = Math.min(720, Math.max(240, viewport.width - spacing.lg * 2));
  const targetPreviewHeight = Math.min(420, Math.max(260, viewport.height * 0.38));
  const previewWidth = Math.min(availablePreviewWidth, targetPreviewHeight * previewAspectRatio);
  const previewHeight = previewWidth / previewAspectRatio;

  const chooseReference = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(translateCopy('Referans eklemek için fotoğraf arşivi izni gerekiyor.'));
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
      setError(
        reason instanceof Error ? reason.message : translateCopy('Düzenleme başlatılamadı.'),
      );
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
        title={translateCopy(isProductProject ? 'Ürün çıktısını düzenle' : 'AI ile düzenle')}
        subtitle={translateCopy(
          isProductProject
            ? 'Ürünü koruyan kontrollü bir değişiklik iste'
            : 'Doğal dilde değişiklik iste',
        )}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={translateCopy('Önce ve sonra karşılaştır')}
            disabled={!generationId}
            onPress={() => router.push(`/generations/${generationId}/compare` as never)}
            style={styles.compare}
          >
            <Icon name="git-compare-outline" size={20} />
          </Pressable>
        }
      />
      <View style={[styles.preview, { height: previewHeight, width: previewWidth }]}>
        {imageSource ? (
          <Image source={imageSource} resizeMode="contain" style={styles.previewImage} />
        ) : (
          <View style={styles.previewLoading}>
            <ActivityIndicator color={colors.accentYellow} />
          </View>
        )}
        <View style={styles.previewBadge}>
          <Icon name="sparkles" size={14} color={colors.accentYellow} />
          <Text style={styles.previewBadgeText}>{translateCopy('AI düzenleme')}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={translateCopy('Görseli büyüt')}
          disabled={!imageSource}
          onPress={() => setExpanded(true)}
          style={styles.expand}
        >
          <Icon name="expand-outline" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>
      <Modal visible={expanded} transparent onRequestClose={() => setExpanded(false)}>
        <View style={styles.fullscreen}>
          {imageSource && (
            <Image source={imageSource} resizeMode="contain" style={StyleSheet.absoluteFill} />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={translateCopy('Kapat')}
            onPress={() => setExpanded(false)}
            style={styles.fullscreenClose}
          >
            <Icon name="close" size={28} />
          </Pressable>
        </View>
      </Modal>
      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ScrollView
          ref={messagesRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <View style={styles.assistantCard}>
            <View style={styles.purpleIcon}>
              <Icon name="sparkles" size={24} color={colors.accentPurple} />
            </View>
            <Text style={[styles.bubbleText, { flex: 1 }]}>
              {translateCopy(
                isProductProject
                  ? 'Ürünün etiketini, malzemesini ve geometrisini koruyarak neyi değiştirmemi istersin?'
                  : 'Elbette. Sonucu doğal tutarak neyi değiştirmemi istersin?',
              )}
            </Text>
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
          <View style={styles.sectionHeading}>
            <Text style={styles.suggestionLabel}>{translateCopy('Önerilen düzenlemeler')}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setAllSuggestions(!allSuggestions)}
            >
              <Text style={styles.link}>
                {translateCopy(allSuggestions ? 'Daha az göster' : 'Tümünü gör')}
              </Text>
            </Pressable>
          </View>
          <View style={styles.suggestions}>
            {starters.slice(0, allSuggestions ? undefined : 4).map((item, index) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                onPress={() => setMessage(item)}
                style={[styles.suggestionChip, index % 2 === 0 && styles.goldBorder]}
              >
                <Icon
                  name={
                    (
                      [
                        'leaf-outline',
                        'crop-outline',
                        'sunny-outline',
                        'image-outline',
                        'color-palette-outline',
                        'sparkles-outline',
                      ] as const
                    )[index]!
                  }
                  size={22}
                  color={index % 2 === 0 ? colors.accentYellow : colors.textPrimary}
                />
                <Text style={styles.chipText}>{item}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.assistantCard}>
            <View style={styles.purpleIcon}>
              <Icon name="layers" size={24} color={colors.accentPurple} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.chipText}>
                {translateCopy('Her düzenleme yeni bir sürüm oluşturur')}
              </Text>
              <Text style={styles.bubbleText}>
                {translateCopy('Önceki sonuçlara her zaman geri dönebilirsin.')}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={!generation?.projectId}
              onPress={() => router.push(`/projects/${generation?.projectId}` as never)}
            >
              <Text style={styles.link}>{translateCopy('Sürümleri gör')} ›</Text>
            </Pressable>
          </View>
          <Text style={styles.suggestionLabel}>{translateCopy('Akıllı araçlar')}</Text>
          <View style={styles.tools}>
            {tools.map((tool) => (
              <Pressable
                key={tool.label}
                accessibilityRole="button"
                onPress={() => setMessage(translateCopy(tool.prompt))}
                style={styles.tool}
              >
                <Icon name={tool.icon} size={24} color={colors.accentYellow} />
                <Text style={styles.toolLabel}>{translateCopy(tool.label)}</Text>
              </Pressable>
            ))}
          </View>
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
              <Text style={styles.referenceTitle}>{translateCopy('Görsel referansı eklendi')}</Text>
              <Text numberOfLines={1} style={styles.referenceName}>
                {reference.fileName}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={translateCopy('Referansı kaldır')}
              onPress={() => setReference(null)}
            >
              <Icon name="close-circle" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
        ) : null}
        <View
          style={[
            styles.composerDock,
            { paddingBottom: keyboardVisible ? 18 : Math.max(insets.bottom, 10) },
          ]}
        >
          <View style={styles.composer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={translateCopy('Referans fotoğraf ekle')}
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
              placeholder={translateCopy('İstediğin değişikliği yaz…')}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
              accessibilityLabel={translateCopy('Düzenleme isteği')}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={translateCopy('Düzenleme isteğini gönder')}
              onPress={() => void submitRevision()}
              style={[
                styles.send,
                (!message.trim() || busy || !sourceOutput) && styles.sendDisabled,
              ]}
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
  content: {
    alignSelf: 'center',
    maxWidth: 900,
    paddingBottom: 10,
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
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
    alignSelf: 'center',
    maxWidth: 720,
    borderRadius: radii.xl,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#080808',
    borderWidth: 1,
    borderColor: colors.accentYellow,
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
  suggestions: { gap: 8, flexDirection: 'row', flexWrap: 'wrap' },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  link: { ...typography.caption, color: '#B880FF', fontWeight: '600' },
  suggestionChip: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#716A77',
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#19171C',
  },
  goldBorder: { borderColor: '#BBA34E' },
  chipText: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
  assistantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#8752B9',
    backgroundColor: '#191323',
    borderRadius: 18,
    padding: 14,
    marginVertical: 4,
  },
  purpleIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2B1D40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tools: { flexDirection: 'row', gap: 6 },
  tool: {
    flex: 1,
    minHeight: 70,
    paddingVertical: 10,
    gap: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#59535D',
    backgroundColor: '#19171C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolLabel: { fontSize: 11, textAlign: 'center', color: colors.textSecondary },
  expand: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: '#00000088',
    padding: 10,
    borderRadius: 24,
  },
  fullscreen: { flex: 1, backgroundColor: '#000' },
  fullscreenClose: {
    position: 'absolute',
    top: 60,
    right: 24,
    padding: 12,
    backgroundColor: '#333',
    borderRadius: 26,
  },
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
