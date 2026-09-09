import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CategoryChip,
  CreditBadge,
  GlassSurface,
  Icon,
  Notice,
  Screen,
  ToggleRow,
} from '@/components';
import { RequireAuthenticated } from '@/features/auth/require-authenticated';
import { useAvailableCredits } from '@/features/billing/use-wallet';
import { beautyOptions, type BeautyOption } from '@/features/beauty/catalog';
import { BeautyRail } from '@/features/beauty/BeautyRail';
import { IntensitySlider } from '@/features/beauty/IntensitySlider';
import {
  beautyIntensity,
  emptyBeautySettings,
  hasBeautyAdjustments,
  intensityDescription,
  toggleBeautyOption,
  withBeautyIntensity,
  type BeautyOptionId,
  type BeautySettings,
} from '@/features/beauty/settings';
import { useCreateFlow } from '@/features/create/createFlow';
import { CreateHeader, FieldLabel, MiniChoice, WizardFooter } from '@/features/create/components';
import { colors, spacing, typography } from '@/theme';

const groups = ['Tümü', 'Rötuş', 'Yüz hatları', 'Makyaj'] as const;
export default function BeautyScreen() {
  return (
    <RequireAuthenticated>
      <BeautyEditor />
    </RequireAuthenticated>
  );
}

function BeautyEditor() {
  const router = useRouter();
  const { selected } = useLocalSearchParams<{ selected?: string }>();
  const { flow, set } = useCreateFlow();
  const credits = useAvailableCredits();
  const initialized = useRef(false);
  const [selectedId, setSelectedId] = useState<BeautyOptionId>();
  const [group, setGroup] = useState<(typeof groups)[number]>('Tümü');
  const [showOriginal, setShowOriginal] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const option = beautyOptions.find((entry) => entry.id === selectedId);
  const previewOption = option ?? beautyOptions[0]!;
  const settings = flow.beauty ?? emptyBeautySettings();
  const intensity = selectedId ? beautyIntensity(settings, selectedId) : 0;
  const activeOptions = beautyOptions.filter((entry) => beautyIntensity(settings, entry.id) > 0);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const initialOption = beautyOptions.find((entry) => entry.id === selected);
    const next = flow.beauty ?? withBeautyIntensity(emptyBeautySettings(), 'naturalBalance', 35);
    const beauty =
      !flow.beauty && initialOption && !initialOption.isPro
        ? withBeautyIntensity(
            next,
            initialOption.id,
            beautyIntensity(next, initialOption.id) || initialOption.defaultIntensity,
          )
        : next;
    setSelectedId(
      initialOption?.isPro
        ? initialOption.id
        : (beautyOptions.find(
            (entry) => entry.id === initialOption?.id && beautyIntensity(beauty, entry.id) > 0,
          )?.id ?? beautyOptions.find((entry) => beautyIntensity(beauty, entry.id) > 0)?.id),
    );
    set({
      mode: 'filter',
      toolId: 'beauty',
      beauty,
      transformation: null,
      trendPreset: null,
      sceneId: null,
      personId: null,
      styleId: 'filter-natural',
      preserveFace: true,
      preserveClothes: true,
      filterIntensity: 0,
      customInstruction: '',
    });
    if (flow.sourceKind === 'fictional')
      set({
        sourceKind: 'photo',
        sourceCharacterId: null,
        sourceUri: null,
        sourceName: null,
        sourceRightsConfirmed: false,
      });
  }, [flow.beauty, flow.sourceKind, selected, set]);

  function update(settings: BeautySettings) {
    set({ beauty: settings });
  }
  function selectOption(next: BeautyOption) {
    setShowOriginal(false);
    if (next.isPro) {
      setSelectedId(selectedId === next.id ? undefined : next.id);
      return;
    }
    const enabled = beautyIntensity(settings, next.id) > 0;
    setSelectedId(enabled ? undefined : next.id);
    update(toggleBeautyOption(settings, next.id, next.defaultIntensity));
  }
  function reset() {
    update(emptyBeautySettings());
    setSelectedId(undefined);
    setShowOriginal(false);
  }
  const visibleOptions =
    group === 'Tümü' ? beautyOptions : beautyOptions.filter((entry) => entry.group === group);
  const previewLight = Math.min(
    0.15,
    settings.adjustments.naturalBalance * 0.00045 + settings.adjustments.skinGlow * 0.001,
  );

  return (
    <Screen contentContainerStyle={styles.content}>
      <CreateHeader
        title="Güzellik Stüdyosu"
        subtitle="Sana ait, doğal dokunuşlar"
        step={flow.sourceUri ? 2 : undefined}
        fallback="/(tabs)/home"
      />
      <View style={styles.toolbar}>
        <Text style={styles.hint}>10 görünüm · Katmanlı düzenleme</Text>
        <CreditBadge credits={credits} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Orijinali görmek için basılı tut"
        onPressIn={() => setShowOriginal(true)}
        onPressOut={() => setShowOriginal(false)}
        style={styles.preview}
      >
        <LinearGradient
          pointerEvents="none"
          colors={['#393028', '#29241F', '#171513']}
          style={StyleSheet.absoluteFill}
        />
        <Image
          source={flow.sourceUri ? { uri: flow.sourceUri } : previewOption.source}
          style={styles.previewImage}
          resizeMode="contain"
        />
        {flow.sourceUri && !showOriginal && previewLight > 0 ? (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: '#FFF2DB', opacity: previewLight }]}
          />
        ) : null}
        <View style={styles.previewBadge}>
          <Icon
            name={showOriginal ? 'eye-outline' : 'sparkles-outline'}
            size={13}
            color={colors.accentYellow}
          />
          <Text style={styles.previewBadgeText}>
            {!flow.sourceUri
              ? 'Temsili görünüm'
              : showOriginal || !activeOptions.length
                ? 'Orijinal fotoğraf'
                : 'Yerel ışık önizlemesi'}
          </Text>
        </View>
      </Pressable>
      <View style={styles.previewActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/create/upload' as never)}
          style={styles.action}
        >
          <Icon name="camera-outline" size={16} color={colors.accentYellow} />
          <Text style={styles.actionText}>
            {flow.sourceUri ? 'Fotoğrafı değiştir' : 'Fotoğrafını seç'}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={reset} style={styles.action}>
          <Icon name="refresh-outline" size={15} />
          <Text style={styles.hint}>Sıfırla</Text>
        </Pressable>
      </View>
      <Text style={styles.previewHint}>
        {flow.sourceUri
          ? 'Orijinali görmek için basılı tut. Cilt, kontür ve makyaj düzenlemeleri oluşturduğunda AI ile uygulanır.'
          : 'Kartlar örnektir; üretim için kendi fotoğrafını yükle. Referansın kıyafeti ve yüzü fotoğrafına kopyalanmaz.'}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.groups}
      >
        {groups.map((entry) => (
          <CategoryChip
            key={entry}
            label={entry}
            selected={group === entry}
            onPress={() => setGroup(entry)}
          />
        ))}
      </ScrollView>
      <BeautyRail
        options={visibleOptions}
        selectedId={selectedId}
        settings={settings}
        onSelect={selectOption}
      />
      {option && selectedId ? (
        <GlassSurface
          tone="gold"
          glow={false}
          radius={24}
          style={styles.controls}
          contentStyle={styles.controlsContent}
        >
          <View style={styles.controlHeading}>
            <View style={styles.flex}>
              <Text style={styles.optionName}>{option.name}</Text>
              <Text style={styles.hint}>{option.description}</Text>
            </View>
            <Text style={styles.value}>{option.isPro ? 'PRO' : `%${intensity}`}</Text>
          </View>
          {option.isPro ? (
            <Text style={styles.proHint}>
              PRO yakında. Bu görünüm henüz üretime açık değil; standart seçeneklerle devam
              edebilirsin.
            </Text>
          ) : null}
          <IntensitySlider
            value={intensity}
            disabled={option.isPro}
            onChange={(value) => update(withBeautyIntensity(settings, selectedId, value))}
          />
          <View style={styles.levels}>
            {[20, 50, 80].map((value, index) => (
              <Pressable
                key={value}
                disabled={option.isPro}
                onPress={() => update(withBeautyIntensity(settings, selectedId, value))}
                style={[styles.level, intensity === value && styles.levelSelected]}
              >
                <Text style={styles.hint}>{['Hafif', 'Dengeli', 'Belirgin'][index]}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.previewHint}>
            {intensityDescription(intensity)} · Yüzde, güvenli etki aralığındaki yoğunluğu ifade
            eder.
          </Text>
        </GlassSurface>
      ) : (
        <View style={styles.noSelection}>
          <Icon name="remove-circle-outline" size={20} color={colors.accentYellow} />
          <View style={styles.flex}>
            <Text style={styles.optionName}>
              {activeOptions.length ? 'Dokunuş kaldırıldı' : 'Filtre seçili değil'}
            </Text>
            <Text style={styles.hint}>
              {activeOptions.length
                ? 'Diğer aktif dokunuşların korunuyor. Yeni bir kart seçerek devam edebilirsin.'
                : 'Bir görünüm seç. Aktif karta tekrar dokunarak etkisini kaldırabilirsin.'}
            </Text>
          </View>
        </View>
      )}
      {activeOptions.length ? (
        <View style={styles.activeSummary}>
          <Text style={styles.hint}>{activeOptions.length} aktif dokunuş</Text>
          <Text style={styles.summaryText}>
            {activeOptions
              .map((entry) => `${entry.name} %${beautyIntensity(settings, entry.id)}`)
              .join(' · ')}
          </Text>
        </View>
      ) : null}
      <View style={styles.preservation}>
        <ToggleRow
          icon="water-outline"
          title="Doğal cilt dokusunu koru"
          value={settings.preserveSkinTexture}
          onValueChange={(value) => update({ ...settings, preserveSkinTexture: value })}
        />
        <ToggleRow
          icon="sunny-outline"
          title="Benleri ve çilleri koru"
          value={settings.preserveFrecklesAndMoles}
          onValueChange={(value) => update({ ...settings, preserveFrecklesAndMoles: value })}
        />
        <View style={styles.identity}>
          <Icon name="shield-checkmark-outline" size={18} color={colors.accentYellow} />
          <Text style={styles.hint}>
            Yüz kimliği, cilt tonu ve temel yüz hatları her zaman korunur.
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: advanced }}
        onPress={() => setAdvanced(!advanced)}
        style={styles.output}
      >
        <Text style={styles.optionName}>Görsel ayarları</Text>
        <Text style={styles.hint}>
          {flow.aspectRatio} · {flow.quality}
        </Text>
        <Icon name={advanced ? 'chevron-up' : 'chevron-down'} size={17} />
      </Pressable>
      {advanced ? (
        <>
          <FieldLabel>Çıktı oranı</FieldLabel>
          <View style={styles.row}>
            {(['1:1', '4:5', '9:16'] as const).map((ratio) => (
              <MiniChoice
                key={ratio}
                label={ratio}
                selected={flow.aspectRatio === ratio}
                onPress={() => set({ aspectRatio: ratio })}
              />
            ))}
          </View>
          <FieldLabel>Çıktı kalitesi</FieldLabel>
          <View style={styles.row}>
            {(['Önizleme', 'Standart', 'HD'] as const).map((quality) => (
              <MiniChoice
                key={quality}
                label={quality}
                selected={flow.quality === quality}
                onPress={() => set({ quality })}
              />
            ))}
          </View>
        </>
      ) : null}
      <Notice tone="neutral">
        Seçimlerini birleştirip orijinal fotoğrafından tek AI düzenlemesi oluştururuz. Kaydırırken
        kredi harcanmaz. Sonuçlar değişiklik gösterebilir.
      </Notice>
      <WizardFooter
        label={!flow.sourceUri ? 'Fotoğrafını seç' : 'AI üretim özetini gör'}
        disabled={Boolean(option?.isPro) || !hasBeautyAdjustments(settings)}
        onPress={() => {
          if (option?.isPro) {
            Alert.alert('PRO yakında', 'Bu görünüm henüz üretime açık değil.');
            return;
          }
          if (!hasBeautyAdjustments(settings)) return;
          router.push(
            (flow.sourceUri && flow.sourceRightsConfirmed
              ? '/create/review'
              : '/create/upload') as never,
          );
        }}
        hint={
          option?.isPro
            ? 'Standart bir görünüm seçerek devam et.'
            : !hasBeautyAdjustments(settings)
              ? 'Devam etmek için en az bir görünüm seç.'
              : 'Kredi maliyeti sonraki ekranda onayına sunulur.'
        }
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { paddingBottom: 42 },
  toolbar: {
    marginTop: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  hint: { ...typography.caption, color: colors.textSecondary },
  preview: {
    height: 315,
    borderRadius: 30,
    backgroundColor: '#29241F',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.18)',
    overflow: 'hidden',
  },
  previewImage: { height: '100%', width: '100%', backgroundColor: 'transparent' },
  previewBadge: {
    position: 'absolute',
    left: 13,
    bottom: 13,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: '#090909DB',
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  previewBadgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 42 },
  actionText: { ...typography.caption, color: colors.accentYellow, fontWeight: '600' },
  previewHint: { fontSize: 11, lineHeight: 16, color: colors.textMuted, marginTop: 6 },
  groups: { gap: 8, paddingTop: 16, paddingBottom: 4 },
  controls: { marginTop: 12 },
  controlsContent: { padding: 15, borderRadius: 24, backgroundColor: '#211D18' },
  noSelection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    marginTop: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#4A3B28',
    backgroundColor: '#211D18',
  },
  controlHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  optionName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 3 },
  value: { color: colors.accentYellow, fontSize: 22, fontWeight: '600' },
  levels: { flexDirection: 'row', gap: 8 },
  level: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#2B251D',
  },
  levelSelected: { backgroundColor: '#FFC40019' },
  proHint: { color: colors.accentYellow, fontSize: 12, lineHeight: 18, marginTop: 10 },
  activeSummary: { marginVertical: 14, gap: 5 },
  summaryText: { color: '#E8DABB', fontSize: 12, lineHeight: 19 },
  preservation: { marginTop: 12 },
  identity: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12 },
  output: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  row: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
});
