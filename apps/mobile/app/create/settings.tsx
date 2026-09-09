import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';

import { Icon, Notice, Screen, TextField, ToggleRow } from '@/components';
import { GlassSurface } from '@/components/GlassSurface';
import { filters } from '@/constants/catalog';
import {
  useCreateFlow,
  type AspectRatio,
  type Composition,
  type GenerationQuality,
} from '@/features/create/createFlow';
import { CreateHeader, FieldLabel, MiniChoice, WizardFooter } from '@/features/create/components';
import { needsSceneSelection } from '@/features/create/workflow';
import { getSelectedScene } from '@/features/create/scene-presentation';
import { FilterPreview } from '@/features/filters/FilterPreview';
import { FILTER_INTENSITIES, nearestIntensityValue } from '@/features/filters/intensity';
import { colors, radii, spacing, typography } from '@/theme';

const ratios: AspectRatio[] = ['1:1', '4:5', '9:16', '16:9'];
const qualityOptions: GenerationQuality[] = ['Önizleme', 'Standart', 'HD'];
const compositions: Composition[] = ['Yakın', 'Orta', 'Uzak', 'Selfie'];
const MAX_CUSTOM_INSTRUCTION_LENGTH = 1000;

export default function GenerationSettingsScreen() {
  const router = useRouter();
  const { flow, set } = useCreateFlow();
  const [advanced, setAdvanced] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const scene = getSelectedScene(flow.sceneId);
  const filterId = flow.styleId ?? (flow.mode === 'portrait' ? 'filter-studio' : 'filter-natural');
  const selectedFilter = filters.find((item) => item.id === filterId);
  const [width, height] = flow.aspectRatio.split(':').map(Number);
  if (!flow.sourceUri || !flow.sourceRightsConfirmed) return <Redirect href="/create/upload" />;
  if (flow.beauty) return <Redirect href={'/beauty' as never} />;
  if (flow.transformation) return <Redirect href={'/gender-change' as never} />;
  if (flow.trendPreset) return <Redirect href={`/trends/${flow.trendPreset}` as never} />;
  if (needsSceneSelection(flow)) return <Redirect href="/create/scene" />;

  return (
    <Screen contentContainerStyle={styles.content}>
      <CreateHeader
        title="Görselini düzenle"
        subtitle="Filtre, kadraj ve ayarlar tek yerde"
        step={2}
      />
      <View style={styles.preview}>
        <FilterPreview
          sourceUri={flow.sourceUri}
          filterId={filterId}
          intensity={flow.filterIntensity}
          aspectRatio={width / height}
          showOriginal={showOriginal}
        />
      </View>
      <View style={styles.previewActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Orijinal fotoğrafı karşılaştır"
          accessibilityState={{ selected: showOriginal }}
          onPress={() => setShowOriginal((value) => !value)}
          style={styles.textAction}
        >
          <Icon name="contrast-outline" size={17} color={colors.accentYellow} />
          <Text style={styles.actionText}>
            {showOriginal ? 'Filtreyi göster' : 'Orijinali göster'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/create/crop' as never)}
          style={styles.textAction}
        >
          <Icon name="crop-outline" size={17} color={colors.accentYellow} />
          <Text style={styles.actionText}>Kadrajı düzenle</Text>
        </Pressable>
      </View>

      <FieldLabel>Filtre · {selectedFilter?.name ?? 'Doğal Işık'}</FieldLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRail}
        accessibilityRole="radiogroup"
      >
        {filters.map((filter) => {
          const selected = filter.id === filterId;
          return (
            <Pressable
              key={filter.id}
              accessibilityRole="radio"
              accessibilityLabel={filter.name}
              accessibilityState={{ selected }}
              onPress={() => {
                set({ styleId: filter.id });
                setShowOriginal(false);
              }}
              style={[styles.filter, selected && styles.filterSelected]}
            >
              {filter.previewSource ? (
                <Image
                  source={filter.previewSource}
                  style={styles.filterImage}
                  resizeMode="cover"
                />
              ) : null}
              <Text numberOfLines={2} style={[styles.filterName, selected && styles.selectedText]}>
                {filter.name}
              </Text>
              {selected ? (
                <View style={styles.check}>
                  <Icon name="checkmark" size={13} color="#050505" />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
      <FieldLabel>Filtre yoğunluğu · %{flow.filterIntensity}</FieldLabel>
      <View style={styles.choiceRow} accessibilityRole="radiogroup">
        {FILTER_INTENSITIES.map((level) => (
          <MiniChoice
            key={level.value}
            label={level.label}
            selected={nearestIntensityValue(flow.filterIntensity) === level.value}
            onPress={() => {
              set({ filterIntensity: level.value });
              setShowOriginal(false);
            }}
          />
        ))}
      </View>
      <Text style={styles.hint}>
        Önizleme yaklaşık renk ve ışık etkisini gösterir. Sahne ve AI dönüşümü, oluşturduğunda
        uygulanır.
      </Text>

      {scene ? (
        <GlassSurface
          radius={20}
          tone="neutral"
          glow={false}
          style={styles.scene}
          contentStyle={styles.sceneContent}
        >
          {scene.previewSource ? (
            <Image source={scene.previewSource} style={styles.sceneImage} />
          ) : null}
          <View style={styles.sceneCopy}>
            <Text style={styles.hint}>Seçili sahne</Text>
            <Text style={styles.sceneTitle}>{scene.name}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Seçili sahneyi değiştir"
            onPress={() => router.push('/create/scene' as never)}
            style={styles.textAction}
          >
            <Text style={styles.actionText}>Değiştir</Text>
          </Pressable>
        </GlassSurface>
      ) : null}

      <FieldLabel>Görsel oranı</FieldLabel>
      <View style={styles.choiceRow} accessibilityRole="radiogroup">
        {ratios.map((ratio) => (
          <MiniChoice
            key={ratio}
            label={ratio}
            selected={flow.aspectRatio === ratio}
            onPress={() => set({ aspectRatio: ratio })}
          />
        ))}
      </View>
      <Text style={styles.hint}>
        Çerçeve çıktı oranını gösterir; kaynak esnetilmez. AI, seçtiğin orana göre görüntüyü yeniden
        düzenler.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: advanced }}
        onPress={() => setAdvanced((value) => !value)}
        style={styles.advancedToggle}
      >
        <Icon name="options-outline" size={20} color={colors.accentYellow} />
        <View style={styles.sceneCopy}>
          <Text style={styles.sceneTitle}>Gelişmiş ayarlar</Text>
          <Text style={styles.hint}>
            {flow.quality} · {flow.numberOfImages} görsel
            {flow.mode !== 'filter' && flow.mode !== 'background'
              ? ` · ${flow.composition} kadraj`
              : ''}
          </Text>
        </View>
        <Icon name={advanced ? 'chevron-up' : 'chevron-down'} size={19} />
      </Pressable>
      {advanced ? (
        <>
          {flow.mode !== 'filter' && flow.mode !== 'background' ? (
            <>
              <FieldLabel>Kadraj yakınlığı</FieldLabel>
              <View style={styles.choiceRow} accessibilityRole="radiogroup">
                {compositions.map((composition) => (
                  <MiniChoice
                    key={composition}
                    label={composition}
                    selected={flow.composition === composition}
                    onPress={() => set({ composition })}
                  />
                ))}
              </View>
            </>
          ) : null}
          <FieldLabel>Çıktı kalitesi</FieldLabel>
          <View style={styles.choiceRow} accessibilityRole="radiogroup">
            {qualityOptions.map((quality) => (
              <MiniChoice
                key={quality}
                label={quality}
                caption={
                  quality === 'HD' ? 'Ayrıntılı' : quality === 'Standart' ? 'Dengeli' : 'Hızlı'
                }
                selected={flow.quality === quality}
                onPress={() => set({ quality })}
              />
            ))}
          </View>
          <FieldLabel>Varyasyon sayısı</FieldLabel>
          <View style={styles.choiceRow} accessibilityRole="radiogroup">
            {[1, 2, 3, 4].map((number) => (
              <MiniChoice
                key={number}
                label={`${number} görsel`}
                selected={flow.numberOfImages === number}
                onPress={() => set({ numberOfImages: number })}
              />
            ))}
          </View>
          <View style={styles.toggles}>
            <ToggleRow
              icon="person-outline"
              title="Yüzü koru"
              detail="Kaynak görseldeki yüz ayrıntılarına öncelik ver."
              value={flow.preserveFace}
              onValueChange={(preserveFace) => set({ preserveFace })}
            />
            <ToggleRow
              icon="shirt-outline"
              title="Kıyafeti koru"
              detail="Kıyafet ve ana silueti mümkün olduğunca koru."
              value={flow.preserveClothes}
              onValueChange={(preserveClothes) => set({ preserveClothes })}
            />
          </View>
          <FieldLabel>
            Özel talimat <Text style={styles.hint}>opsiyonel</Text>
          </FieldLabel>
          <TextField
            value={flow.customInstruction}
            onChangeText={(customInstruction) =>
              set({ customInstruction: customInstruction.slice(0, MAX_CUSTOM_INSTRUCTION_LENGTH) })
            }
            maxLength={MAX_CUSTOM_INSTRUCTION_LENGTH}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholder="Örn. Işık daha yumuşak, kamerayı biraz uzak tut."
            style={styles.instruction}
            accessibilityLabel="Özel üretim talimatı"
          />
          <Text accessibilityLiveRegion="polite" style={styles.characterCount}>
            {flow.customInstruction.length} / {MAX_CUSTOM_INSTRUCTION_LENGTH}
          </Text>
        </>
      ) : null}
      <Notice tone="neutral" title="Kontrol sende">
        Kredi tutarını bir sonraki ekranda göreceksin. Oluşturmayı onaylamadan kredi düşülmez.
      </Notice>
      <WizardFooter
        label="Üretimi gözden geçir"
        onPress={() => router.push('/create/review' as never)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 42 },
  preview: { marginTop: spacing.lg, borderRadius: radii.xl, overflow: 'hidden' },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  textAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 3,
  },
  actionText: { ...typography.caption, color: colors.accentYellow, fontWeight: '700' },
  filterRail: { gap: 10, paddingVertical: 4 },
  filter: {
    width: 86,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: '#111113',
  },
  filterSelected: { borderColor: colors.accentYellow },
  filterImage: { width: '100%', height: 98 },
  filterName: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 3,
    paddingVertical: 9,
    minHeight: 44,
  },
  selectedText: { color: colors.accentYellow },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accentYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceRow: { flexDirection: 'row', gap: 8 },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  scene: { marginTop: spacing.lg },
  sceneContent: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sceneImage: { width: 48, height: 60, borderRadius: 10 },
  sceneCopy: { flex: 1 },
  sceneTitle: { ...typography.label, color: colors.textPrimary },
  advancedToggle: {
    marginTop: spacing.lg,
    paddingVertical: 15,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  toggles: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  instruction: { minHeight: 94, paddingTop: 13, paddingBottom: 13 },
  characterCount: { color: colors.textMuted, fontSize: 12, marginTop: 6, textAlign: 'right' },
});
