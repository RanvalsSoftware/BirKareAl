import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CreditBadge, GlassSurface, Icon, Notice, Screen } from '@/components';
import { RequireAuthenticated } from '@/features/auth/require-authenticated';
import { useAvailableCredits } from '@/features/billing/use-wallet';
import { IntensitySlider } from '@/features/beauty/IntensitySlider';
import { intensityDescription } from '@/features/beauty/settings';
import { useCreateFlow } from '@/features/create/createFlow';
import { CreateHeader, FieldLabel, MiniChoice, WizardFooter } from '@/features/create/components';
import { trends } from '@/features/trends/catalog';
import { TrendRail } from '@/features/trends/TrendRail';
import { trendCreationSelection } from '@/features/trends/presets';
import { colors, typography } from '@/theme';

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
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    set({
      ...trendCreationSelection(trend.id, flow),
      filterIntensity: flow.trendPreset ? flow.filterIntensity : 60,
      numberOfImages: 1,
    });
  }, [flow, set, trend.id]);
  const tinted = ['kpop_star', 'pop_icon_80s', 'neon_club_night'].includes(trend.id);
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
        <Text style={styles.hint}>9 özgün fotoğraf estetiği</Text>
        <CreditBadge credits={credits} />
      </View>
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
      <Text style={styles.detail}>{trend.detail}</Text>
      <Text style={styles.small}>
        Örnek yüz kopyalanmaz. Önizleme yalnız renk fikri verir; kıyafet, poz ve ortam dönüşümü AI
        üretiminde uygulanır.
      </Text>

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
          flow.sourceUri && flow.sourceRightsConfirmed ? 'Üretim özetini gör' : 'Fotoğrafını seç'
        }
        disabled={!canContinue}
        onPress={() =>
          router.push(
            (flow.sourceUri && flow.sourceRightsConfirmed
              ? '/create/review'
              : '/create/upload') as never,
          )
        }
        hint={
          canContinue
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
  moreTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 24, marginBottom: 8 },
});
