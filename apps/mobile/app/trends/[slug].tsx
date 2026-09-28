import { useEffect, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CreditBadge, GlassSurface, Icon, Notice, Screen } from '@/components';
import { RequireAuthenticated } from '@/features/auth/require-authenticated';
import { useAvailableCredits } from '@/features/billing/use-wallet';
import { IntensitySlider } from '@/features/beauty/IntensitySlider';
import { intensityDescription } from '@/features/beauty/settings';
import { useCreateFlow } from '@/features/create/createFlow';
import { CreateHeader, FieldLabel, MiniChoice, WizardFooter } from '@/features/create/components';
import { eightiesTrends, trends } from '@/features/trends/catalog';
import { TrendRail } from '@/features/trends/TrendRail';
import {
  isEightiesTrend,
  supportsSecondPersonTrend,
  trendCreationSelection,
} from '@/features/trends/presets';
import { colors, radii, spacing, typography } from '@/theme';

const MAX_TREND_SOURCE_BYTES = 15 * 1024 * 1024;

export default function TrendScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const trend = trends.find((entry) => entry.id === slug);
  const router = useRouter();
  return (
    <RequireAuthenticated>
      {trend ? (
        <TrendEditor key={trend.id} trend={trend} />
      ) : (
        <Screen>
          <CreateHeader title="Akım bulunamadı" />
          <Notice tone="neutral">
            Bu akım henüz koleksiyonda değil. Ana sayfadan başka bir görünüm seçebilirsin.
          </Notice>
          <WizardFooter
            label="Ana sayfaya dön"
            onPress={() => router.replace('/(tabs)/home' as never)}
          />
        </Screen>
      )}
    </RequireAuthenticated>
  );
}

function TrendEditor({ trend }: { trend: (typeof trends)[number] }) {
  const router = useRouter();
  const { flow, set } = useCreateFlow();
  const initialized = useRef(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const credits = useAvailableCredits();
  const isEighties = isEightiesTrend(trend.id);
  const supportsSecondPerson = supportsSecondPersonTrend(trend.id);
  const secondaryReady =
    !flow.secondarySourceUri || Boolean(flow.secondarySourceRightsConfirmed);

  async function chooseSecondPerson() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
        selectionLimit: 1,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_TREND_SOURCE_BYTES) {
        Alert.alert(
          'Dosya büyük',
          'İkinci kişi fotoğrafı en fazla 15 MB olabilir. Daha küçük bir görsel seç.',
        );
        return;
      }
      if (asset.uri === flow.sourceUri) {
        Alert.alert('Farklı fotoğraf seç', 'İkinci kişi için farklı bir kaynak fotoğraf kullan.');
        return;
      }
      set({
        secondarySourceUri: asset.uri,
        secondarySourceName: asset.fileName?.trim() || 'İkinci kişi fotoğrafı',
        secondarySourceRightsConfirmed: false,
      });
    } catch {
      Alert.alert('Fotoğraf seçilemedi', 'İkinci kişi fotoğrafını tekrar seçmeyi dene.');
    }
  }

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    set({
      ...trendCreationSelection(trend.id, flow),
      filterIntensity: flow.trendPreset ? flow.filterIntensity : 60,
      numberOfImages: 1,
    });
  }, [flow, set, trend.id]);
  const tinted = [
    'kpop_star',
    'pop_icon_80s',
    'romantic_dinner_80s',
    'romantic_closeup_80s',
    'neon_club_night',
  ].includes(trend.id);
  const canContinue = flow.filterIntensity > 0;

  return (
    <Screen contentContainerStyle={styles.content}>
      <CreateHeader
        title={trend.name}
        subtitle="Akımlar · Yüzün sana ait kalır"
        step={flow.sourceUri ? 2 : undefined}
        fallback="/(tabs)/home"
      />
      <View style={styles.toolbar}>
        <Text style={styles.hint}>
          {isEighties ? '3 özgün 80’ler görünümü' : '9 akım koleksiyonu'}
        </Text>
        <CreditBadge credits={credits} />
      </View>
      {isEighties ? (
        <View style={styles.collection}>
          <View style={styles.collectionHeading}>
            <View>
              <Text style={styles.collectionTitle}>80’ler koleksiyonu</Text>
              <Text style={styles.small}>Görünümü seç · seçim üretimden önce değiştirilebilir</Text>
            </View>
            <View style={styles.collectionCount}>
              <Text style={styles.collectionCountText}>3 stil</Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.variantRail}
          >
            {eightiesTrends.map((variant) => {
              const selected = variant.id === trend.id;
              return (
                <Pressable
                  key={variant.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${variant.name}. ${variant.description}`}
                  accessibilityState={{ selected }}
                  onPress={() => router.replace(`/trends/${variant.id}` as never)}
                  style={({ pressed }) => [
                    styles.variantCard,
                    selected && styles.variantSelected,
                    pressed && styles.variantPressed,
                  ]}
                >
                  <Image source={variant.source} style={styles.variantImage} resizeMode="cover" />
                  <LinearGradient
                    colors={['transparent', 'rgba(5,5,5,.98)']}
                    style={styles.variantShade}
                  />
                  {selected ? (
                    <View style={styles.variantCheck}>
                      <Icon name="checkmark" size={13} color="#171000" />
                    </View>
                  ) : null}
                  <Text style={styles.variantName} numberOfLines={2}>
                    {variant.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Kaynak fotoğrafı görmek için basılı tut"
        onPressIn={() => setShowOriginal(true)}
        onPressOut={() => setShowOriginal(false)}
        style={styles.preview}
      >
        <Image
          source={flow.sourceUri ? { uri: flow.sourceUri } : trend.source}
          style={styles.image}
          resizeMode={flow.sourceUri ? 'contain' : 'cover'}
        />
        {flow.sourceUri && !showOriginal ? (
          <LinearGradient
            pointerEvents="none"
            colors={tinted ? ['#CA60EB', '#387DBD'] : ['#E3BA82', '#3C3530']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { opacity: flow.filterIntensity * 0.002 }]}
          />
        ) : null}
        <View style={styles.previewLabel}>
          <Icon
            name={showOriginal ? 'eye-outline' : 'sparkles-outline'}
            size={13}
            color={colors.accentYellow}
          />
          <Text style={styles.previewLabelText}>
            {!flow.sourceUri
              ? 'Temsili akım görseli'
              : showOriginal
                ? 'Orijinal fotoğrafın'
                : 'Yaklaşık renk önizlemesi'}
          </Text>
        </View>
        {flow.sourceUri ? (
          <Image
            source={trend.source}
            style={styles.referenceThumb}
            accessibilityLabel="Akımın temsili stil referansı"
          />
        ) : null}
      </Pressable>
      <View style={styles.previewActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/create/upload' as never)}
          style={styles.changePhoto}
        >
          <Icon name="camera-outline" size={17} color={colors.accentYellow} />
          <Text style={styles.link}>
            {flow.sourceUri ? 'Fotoğrafı değiştir' : 'Kendi fotoğrafını seç'}
          </Text>
        </Pressable>
        <Text style={styles.small}>AI ile uygulanır</Text>
      </View>
      {supportsSecondPerson ? (
        <View style={styles.secondaryCard}>
          <View style={styles.secondaryHeading}>
            <View style={styles.secondaryHeadingCopy}>
              <Text style={styles.title}>İkinci kişi (isteğe bağlı)</Text>
              <Text style={styles.small}>
                Yan yana çekilmiş fotoğraf gerekmez. İki ayrı kişiyi tek sahnede doğal biçimde
                birleştiririz.
              </Text>
            </View>
            <View style={styles.secondaryCost}>
              <Text style={styles.secondaryCostText}>+1 kredi / görsel</Text>
            </View>
          </View>
          {flow.secondarySourceUri ? (
            <>
              <View style={styles.secondarySourceRow}>
                <Image
                  source={{ uri: flow.secondarySourceUri }}
                  resizeMode="cover"
                  style={styles.secondaryThumb}
                />
                <View style={styles.secondarySourceCopy}>
                  <Text style={styles.secondarySourceTitle}>İkinci kişi seçildi</Text>
                  <Text style={styles.small} numberOfLines={1}>
                    {flow.secondarySourceName || 'İkinci kişi fotoğrafı'}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="İkinci kişi fotoğrafını kaldır"
                  onPress={() =>
                    set({
                      secondarySourceUri: null,
                      secondarySourceName: null,
                      secondarySourceRightsConfirmed: false,
                    })
                  }
                  style={styles.secondaryRemove}
                >
                  <Icon name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: Boolean(flow.secondarySourceRightsConfirmed) }}
                onPress={() =>
                  set({
                    secondarySourceRightsConfirmed: !flow.secondarySourceRightsConfirmed,
                  })
                }
                style={[
                  styles.rightsRow,
                  flow.secondarySourceRightsConfirmed && styles.rightsRowChecked,
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    flow.secondarySourceRightsConfirmed && styles.checkboxChecked,
                  ]}
                >
                  {flow.secondarySourceRightsConfirmed ? (
                    <Icon name="checkmark" size={15} color="#171000" />
                  ) : null}
                </View>
                <Text style={styles.rightsText}>
                  Bu ikinci fotoğrafı kullanma hakkım var ve görseldeki kişinin izni bulunuyor.
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => void chooseSecondPerson()}
                style={styles.secondaryChange}
              >
                <Icon name="images-outline" size={17} color={colors.accentYellow} />
                <Text style={styles.link}>İkinci fotoğrafı değiştir</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => void chooseSecondPerson()}
              style={styles.secondaryAdd}
            >
              <Icon name="add" size={20} color="#171000" />
              <Text style={styles.secondaryAddText}>Ayrı fotoğraftan kişi ekle</Text>
            </Pressable>
          )}
          <Text style={styles.secondaryFootnote}>
            Kimlikler ayrı ayrı korunur; yüzler karıştırılmaz. İkinci kişi yalnızca bu iki 80’ler
            görünümünde desteklenir.
          </Text>
        </View>
      ) : null}
      <Text style={styles.detail}>{trend.detail}</Text>
      <Text style={styles.small}>
        Örnek yüz kopyalanmaz. Önizleme yalnız renk fikri verir; kıyafet, poz ve ortam dönüşümü AI
        üretiminde uygulanır.
      </Text>

      <View style={styles.instructionCard}>
        <Text style={styles.title}>İsteğe bağlı sahne notu</Text>
        <Text style={styles.small}>
          Arka planı, ortamı veya küçük stil ayrıntılarını değiştirebilirsin. Kimlik ve doğal anatomi
          her zaman korunur.
        </Text>
        <TextInput
          accessibilityLabel="Akım için özel sahne talimatı"
          value={flow.customInstruction}
          onChangeText={(customInstruction) => set({ customInstruction })}
          placeholder="Örn. arka planı yağmurlu İstanbul gecesi yap…"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={1000}
          style={styles.instructionInput}
        />
      </View>

      <GlassSurface
        radius={24}
        tone="gold"
        glow={false}
        style={styles.control}
        contentStyle={styles.controlContent}
      >
        <View style={styles.controlTitle}>
          <Text style={styles.title}>Akım yoğunluğu</Text>
          <Text style={styles.value}>%{flow.filterIntensity}</Text>
        </View>
        <IntensitySlider
          label="Akım yoğunluğu"
          value={flow.filterIntensity}
          onChange={(filterIntensity) => {
            set({ filterIntensity });
            setShowOriginal(false);
          }}
        />
        <View style={styles.row}>
          {[25, 60, 100].map((value, index) => (
            <MiniChoice
              key={value}
              label={['Hafif', 'Dengeli', 'Belirgin'][index]}
              selected={flow.filterIntensity === value}
              onPress={() => set({ filterIntensity: value })}
            />
          ))}
        </View>
        <Text style={styles.small}>
          {intensityDescription(flow.filterIntensity)} · Düşük yoğunluk kaynak görünümünü daha fazla
          korur; yüksek yoğunluk seçilen stili daha belirgin uygular.
        </Text>
      </GlassSurface>
      <Notice tone="warning" title="Bu akım neleri değiştirir?">
        Yüz kimliğin ve doğal cilt tonun korunur. Akıma göre kıyafet, aksesuarlar, saçın
        şekillendirilmesi, poz, makyaj ve arka plan değişebilir. Gerçek bir ünlü veya etkinlik
        taklit edilmez.
      </Notice>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: advanced }}
        onPress={() => setAdvanced(!advanced)}
        style={styles.output}
      >
        <View>
          <Text style={styles.title}>Görsel ayarları</Text>
          <Text style={styles.hint}>
            {flow.aspectRatio} · {flow.quality} · 1 görsel
          </Text>
        </View>
        <Icon name={advanced ? 'chevron-up' : 'chevron-down'} size={18} />
      </Pressable>
      {advanced ? (
        <>
          <FieldLabel>Çıktı oranı</FieldLabel>
          <View style={styles.row}>
            {(['1:1', '4:5', '9:16'] as const).map((aspectRatio) => (
              <MiniChoice
                key={aspectRatio}
                label={aspectRatio}
                selected={flow.aspectRatio === aspectRatio}
                onPress={() => set({ aspectRatio })}
              />
            ))}
          </View>
          <FieldLabel>Kalite</FieldLabel>
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
      <WizardFooter
        label={
          flow.sourceUri && flow.sourceRightsConfirmed
            ? secondaryReady
              ? 'Üretim özetini gör'
              : 'İkinci fotoğrafı onayla'
            : 'Fotoğrafını seç'
        }
        disabled={!canContinue || !secondaryReady}
        onPress={() =>
          router.push(
            (flow.sourceUri && flow.sourceRightsConfirmed && secondaryReady
              ? '/create/review'
              : '/create/upload') as never,
          )
        }
        hint={
          !secondaryReady
            ? 'İkinci fotoğraf için kullanım hakkını onayla.'
            : canContinue
              ? 'Kaydırmak ücretsizdir. Üretim maliyetini bir sonraki ekranda onaylarsın.'
              : 'Bir etki uygulamak için yoğunluğu artır.'
        }
      />
      <Text style={styles.moreTitle}>Diğer akımlar</Text>
      <TrendRail selected={trend.id} onSelect={(id) => router.replace(`/trends/${id}` as never)} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { paddingBottom: 42 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 14,
    marginBottom: 14,
  },
  hint: { ...typography.caption, color: colors.textSecondary },
  small: { fontSize: 11, lineHeight: 17, color: colors.textMuted },
  collection: {
    marginBottom: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F5C8422E',
  },
  collectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  collectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  collectionCount: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F5C84218',
    borderWidth: 1,
    borderColor: '#F5C84266',
  },
  collectionCountText: { color: colors.accentYellow, fontSize: 11, fontWeight: '700' },
  variantRail: { gap: 10, paddingRight: 4 },
  variantCard: {
    width: 116,
    height: 154,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFFFFF2B',
    backgroundColor: '#171619',
  },
  variantSelected: {
    borderWidth: 2,
    borderColor: colors.accentYellow,
  },
  variantPressed: { opacity: 0.78 },
  variantImage: { width: '100%', height: '100%' },
  variantShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 78 },
  variantName: {
    position: 'absolute',
    left: 9,
    right: 8,
    bottom: 9,
    color: '#fff',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  variantCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 23,
    height: 23,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentYellow,
  },
  preview: {
    height: 380,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#171619',
    borderWidth: 1,
    borderColor: '#FFFFFF29',
  },
  image: { height: '100%', width: '100%' },
  previewLabel: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: '#080808DF',
    borderRadius: 16,
    padding: 9,
  },
  previewLabelText: { color: '#fff', fontWeight: '600', fontSize: 11 },
  referenceThumb: {
    position: 'absolute',
    top: 12,
    right: 12,
    height: 82,
    width: 62,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#FFF3',
  },
  previewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  changePhoto: { minHeight: 44, flexDirection: 'row', gap: 7, alignItems: 'center' },
  link: { color: colors.accentYellow, fontSize: 12, fontWeight: '600' },
  detail: { color: '#E8E3DD', fontSize: 14, lineHeight: 22, marginBottom: 7 },
  control: { marginVertical: 18 },
  controlContent: { padding: 16 },
  controlTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#fff', fontSize: 16, fontWeight: '600' },
  value: { color: colors.accentYellow, fontSize: 22, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  output: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 12,
  },
  secondaryCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#F5C8423D',
    backgroundColor: '#171619',
    gap: 11,
  },
  secondaryHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  secondaryHeadingCopy: { flex: 1, gap: 4 },
  secondaryCost: {
    borderRadius: radii.pill,
    backgroundColor: '#F5C84218',
    borderWidth: 1,
    borderColor: '#F5C8425C',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  secondaryCostText: { color: colors.accentYellow, fontSize: 10, fontWeight: '800' },
  secondarySourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 9,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
  },
  secondaryThumb: { width: 56, height: 68, borderRadius: 11 },
  secondarySourceCopy: { flex: 1 },
  secondarySourceTitle: { ...typography.label, color: colors.textPrimary, marginBottom: 3 },
  secondaryRemove: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryAdd: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.accentYellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 14,
  },
  secondaryAddText: { ...typography.label, color: '#171000', fontWeight: '800' },
  secondaryChange: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
  },
  secondaryFootnote: { fontSize: 10, lineHeight: 15, color: colors.textMuted },
  rightsRow: {
    minHeight: 58,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 10,
  },
  rightsRowChecked: {
    borderColor: colors.accentYellow,
    backgroundColor: colors.accentYellowSoft,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.accentYellow, borderColor: colors.accentYellow },
  rightsText: { flex: 1, ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  instructionCard: {
    marginTop: spacing.md,
    padding: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 7,
  },
  instructionInput: {
    minHeight: 86,
    maxHeight: 140,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    ...typography.body,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  moreTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 24, marginBottom: 8 },
});
