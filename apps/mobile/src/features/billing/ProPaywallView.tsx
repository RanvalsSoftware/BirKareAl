import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ProPlanId } from './paywall-model';

/** Presentational only: no SDK, API, authentication or wallet imports. */
export type ProPlanDisplay = {
  id: ProPlanId;
  label: string;
  price: string;
  period: string;
  note: string;
  monthlyEquivalent?: string;
  badge?: string;
};
export type ProPaywallViewProps = {
  plans: readonly ProPlanDisplay[];
  selected: ProPlanId | null;
  onSelect: (id: ProPlanId) => void;
  onClose: () => void;
  onBuy: () => void;
  onRestore: () => void;
  onTerms: () => void;
  onPrivacy: () => void;
  busy?: boolean;
  disabled?: boolean;
  restoreDisabled?: boolean;
  active?: boolean;
  activeNote?: string;
  preview?: boolean;
  sheet?: boolean;
  banner?: string;
  message?: ReactNode;
};
const GOLD = '#F7D778';
const BLACK = '#050505';
const assets = {
  logo: require('../../../assets/onboarding/images/brand/logo-gold-icon.png'),
  city: require('../../../assets/paywall/reference/scene-galata.png'),
  balloons: require('../../../assets/paywall/reference/scene-cappadocia.png'),
  portrait: require('../../../assets/paywall/reference/scene-portrait.png'),
  infinity: require('../../../assets/paywall/reference/icon-infinity.png'),
  people: require('../../../assets/paywall/reference/icon-people.png'),
  wand: require('../../../assets/paywall/reference/icon-wand.png'),
};

export function ProPaywallView(props: ProPaywallViewProps) {
  const { width, fontScale } = useWindowDimensions();
  const maxWidth = Math.min(width, 440);
  const compact = maxWidth < 360;
  const stacked = maxWidth < 360 || fontScale > 1.25;
  const heroHeight = Math.round((maxWidth - 32) * 0.48);
  const features = [
    { image: assets.infinity, title: 'Krediyle AI', detail: 'üretimi' },
    { image: assets.people, title: 'Premium', detail: 'karakterler ve sahneler' },
    { image: assets.wand, title: 'Pro araçlar', detail: 've daha fazlası' },
  ];
  const scenes = [
    { image: assets.city, label: 'Hayal Et', rotate: '-3deg' },
    { image: assets.balloons, label: 'Keşfet', rotate: '0deg' },
    { image: assets.portrait, label: 'Yarat', rotate: '3deg' },
  ];
  return (
    <SafeAreaView
      edges={props.sheet ? ['bottom', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}
      style={[s.safe, props.sheet && s.sheetSafe]}
    >
      <StatusBar style="light" />
      {props.sheet ? <View pointerEvents="none" style={s.handle} /> : null}
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={[s.page, { width: '100%', maxWidth }]}>
          <View pointerEvents="none" style={s.topGlow} />
          <View style={s.brandRow}>
            <Image source={assets.logo} style={s.logo} resizeMode="contain" accessible={false} />
            <View style={s.brandCopy}>
              <Text style={[s.brand, compact && s.brandCompact]}>
                BirKare <Text style={s.gold}>PRO</Text>
              </Text>
              <Text style={s.tagline}>hayalindeki kareye adım at</Text>
            </View>
            <Pressable
              onPress={props.onClose}
              accessibilityRole="button"
              accessibilityLabel="Pro ekranını kapat"
              style={s.close}
              hitSlop={4}
            >
              <Ionicons name="close" size={24} color="#CAC9D2" />
            </Pressable>
          </View>

          <Text accessibilityRole="header" style={[s.title, compact && s.titleCompact]}>
            BirKare <Text style={s.gold}>Pro’yu aç</Text>
          </Text>
          <Text style={s.subtitle}>
            Sahneleri, karakterleri ve premium üretim{'\n'}araçlarını keşfet.
          </Text>

          <View style={[s.scenes, { height: heroHeight + 10 }]}>
            {scenes.map((scene) => (
              <View
                key={scene.label}
                style={[s.scene, { height: heroHeight, transform: [{ rotate: scene.rotate }] }]}
              >
                <Image
                  source={scene.image}
                  style={s.sceneImage}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                  accessibilityLabel={scene.label + ' — örnek üretim'}
                />
                <Text style={s.sceneLabel}>{scene.label}</Text>
              </View>
            ))}
          </View>

          <View style={s.features}>
            {features.map((feature) => (
              <View key={feature.title} style={s.feature}>
                <Image
                  source={feature.image}
                  style={s.featureIcon}
                  resizeMode="contain"
                  accessible={false}
                />
                <Text style={s.featureText}>
                  {feature.title}
                  {'\n'}
                  {feature.detail}
                </Text>
              </View>
            ))}
          </View>

          {props.preview ? (
            <Text testID="paywall-preview-label" style={s.preview}>
              TASARIM ÖNİZLEMESİ · ÖRNEK FİYATLAR · ÖDEME YAPMAZ
            </Text>
          ) : null}
          {!props.preview && props.banner ? <Text style={s.preview}>{props.banner}</Text> : null}
          {props.active ? (
            <View style={s.activeBox}>
              <Ionicons name="checkmark-circle" size={32} color={GOLD} />
              <View style={s.flex}>
                <Text style={s.planTitle}>BirKare Pro aktif</Text>
                <Text style={s.planNote}>{props.activeNote}</Text>
              </View>
            </View>
          ) : (
            <View style={s.plans} accessibilityLabel="BirKare Pro paketleri">
              {props.plans.map((plan) => {
                const selected = props.selected === plan.id;
                return (
                  <Pressable
                    key={plan.id}
                    testID={`paywall-plan-${plan.id}`}
                    accessibilityRole="radio"
                    accessibilityLabel={`${plan.label}, ${plan.price}, ${plan.period}, ${plan.note}`}
                    accessibilityState={{
                      checked: selected,
                      disabled: Boolean(props.disabled || props.busy),
                    }}
                    disabled={props.disabled || props.busy}
                    onPress={() => props.onSelect(plan.id)}
                    style={({ pressed }) => [
                      s.planOuter,
                      selected && s.selectedGlow,
                      pressed && s.pressed,
                    ]}
                  >
                    <LinearGradient
                      colors={
                        selected
                          ? ['#FBE7A1', '#E4B551', '#BA51F6']
                          : ['#37323F', '#252431', '#393042']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={s.planBorder}
                    >
                      <LinearGradient
                        colors={
                          selected
                            ? ['#342710', '#141015', '#20141B']
                            : ['#111014', '#0C0C10', '#101015']
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[s.planInner, compact && s.planInnerCompact]}
                      >
                        <Ionicons
                          name={plan.id === 'lifetime' ? 'infinite-outline' : 'calendar-outline'}
                          size={compact ? 26 : 30}
                          color={GOLD}
                          style={s.planIcon}
                        />
                        <View style={s.flex}>
                          <Text style={s.planTitle}>{plan.label}</Text>
                          <Text style={s.planPrice}>
                            {plan.price}
                            <Text style={s.period}> {plan.period}</Text>
                          </Text>
                          <View style={[s.noteRow, stacked && s.noteRowStack]}>
                            <Text style={s.planNote}>{plan.note}</Text>
                            {plan.badge ? (
                              <LinearGradient colors={['#361362', '#942EFF']} style={s.badge}>
                                <Text style={s.badgeText}>{plan.badge}</Text>
                              </LinearGradient>
                            ) : null}
                          </View>
                          {plan.monthlyEquivalent ? (
                            <Text style={s.equivalent}>{plan.monthlyEquivalent}</Text>
                          ) : null}
                        </View>
                        <View style={[s.radio, selected && s.radioSelected]}>
                          {selected ? (
                            <Ionicons name="checkmark" size={18} color="#231705" />
                          ) : null}
                        </View>
                      </LinearGradient>
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </View>
          )}

          {props.message ? <View style={s.message}>{props.message}</View> : null}
          <Pressable
            testID="paywall-purchase"
            accessibilityRole="button"
            accessibilityLabel={
              props.preview
                ? 'Pro’ya geç — yalnızca tasarım önizlemesi'
                : props.active
                  ? 'Aboneliği yönet'
                  : 'Pro’ya geç'
            }
            accessibilityState={{ disabled: Boolean(props.disabled || props.busy) }}
            disabled={props.disabled || props.busy}
            onPress={props.onBuy}
            style={({ pressed }) => [
              s.cta,
              (props.disabled || props.busy) && s.disabled,
              pressed && s.pressed,
            ]}
          >
            <LinearGradient
              colors={['#FFEDA1', '#E5B052', '#F9D77C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.ctaFill}
            >
              {props.busy ? (
                <ActivityIndicator color="#0A0804" />
              ) : (
                <>
                  <Text style={s.ctaText}>{props.active ? 'Aboneliği yönet' : 'Pro’ya geç'}</Text>
                  <Ionicons name="arrow-forward" size={26} color="#0A0804" />
                </>
              )}
            </LinearGradient>
          </Pressable>
          <Pressable onPress={props.onClose} accessibilityRole="button" style={s.free}>
            <Text style={s.freeText}>{props.active ? 'Uygulamaya dön' : 'Ücretsiz devam et'}</Text>
          </Pressable>
          <Text style={s.termsNote}>
            Aylık ve yıllık planlar iptal edilmedikçe yenilenir. Ömür Boyu tek ödemedir. AI
            üretimleri kredi kullanır; sınırsız üretim içermez.
          </Text>
          <View style={s.footer}>
            <Pressable
              disabled={props.restoreDisabled || props.busy}
              onPress={props.onRestore}
              accessibilityRole="button"
              style={s.footerButton}
            >
              <Text style={[s.footerText, (props.restoreDisabled || props.busy) && s.disabled]}>
                Geri yükle
              </Text>
            </Pressable>
            <Text style={s.divider}>|</Text>
            <Pressable onPress={props.onTerms} accessibilityRole="link" style={s.footerButton}>
              <Text style={s.footerText}>Şartlar</Text>
            </Pressable>
            <Text style={s.divider}>|</Text>
            <Pressable onPress={props.onPrivacy} accessibilityRole="link" style={s.footerButton}>
              <Text style={s.footerText}>Gizlilik</Text>
            </Pressable>
          </View>
          <View pointerEvents="none" style={s.bottomGlow} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BLACK },
  sheetSafe: { borderTopLeftRadius: 29, borderTopRightRadius: 29 },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#77727E',
    marginTop: 9,
    marginBottom: 3,
  },
  scroll: { alignItems: 'center', paddingBottom: 12 },
  page: { paddingHorizontal: 18, paddingTop: 6, overflow: 'hidden' },
  flex: { flex: 1, minWidth: 0 },
  gold: { color: GOLD },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 18 },
  logo: { width: 46, height: 46 },
  brandCopy: { flex: 1 },
  brand: { color: '#FFF', fontSize: 23, fontWeight: '800' },
  brandCompact: { fontSize: 21 },
  tagline: { color: '#9A98A5', fontSize: 10.5, marginTop: 3 },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#39363D',
    backgroundColor: '#141317',
  },
  title: {
    color: '#FFF',
    textAlign: 'center',
    fontSize: 32,
    lineHeight: 37,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  titleCompact: { fontSize: 28, lineHeight: 34 },
  subtitle: {
    color: '#B3B0BA',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 9,
    marginBottom: 14,
  },
  scenes: { flexDirection: 'row', gap: 3, alignItems: 'center', marginHorizontal: -5 },
  scene: { flex: 1, minWidth: 0 },
  sceneImage: { width: '100%', height: '100%' },
  sceneLabel: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    right: 3,
    fontSize: 17,
    fontStyle: 'italic',
    color: '#F5EFD8',
    textShadowColor: '#000',
    textShadowRadius: 5,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 17,
    gap: 4,
  },
  feature: { flex: 1, alignItems: 'center' },
  featureIcon: { width: 48, height: 48 },
  featureText: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    color: '#DEDBDF',
  },
  preview: {
    borderWidth: 1,
    borderColor: '#5F4930',
    color: '#D9BE80',
    textAlign: 'center',
    fontSize: 8,
    lineHeight: 13,
    letterSpacing: 0.6,
    padding: 7,
    borderRadius: 10,
    marginBottom: 10,
  },
  plans: { gap: 8 },
  planOuter: { borderRadius: 15 },
  selectedGlow: {
    shadowColor: '#FCD875',
    shadowOpacity: 0.38,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  planBorder: { padding: 1.2, borderRadius: 15 },
  planInner: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 79,
  },
  planInnerCompact: { gap: 8, paddingHorizontal: 10 },
  planIcon: { width: 32 },
  planTitle: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: '#F7F6F8' },
  planPrice: { fontSize: 16, fontWeight: '700', lineHeight: 22, color: '#FFF', marginTop: 2 },
  period: { fontSize: 13, fontWeight: '400' },
  planNote: { color: '#B4AFBE', fontSize: 10.5, lineHeight: 15, flexShrink: 1 },
  noteRow: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 3 },
  noteRowStack: { alignItems: 'flex-start' },
  equivalent: { color: '#C3B08B', fontSize: 10, marginTop: 2 },
  badge: {
    borderRadius: 12,
    borderWidth: 0.7,
    borderColor: '#A36ADC',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { color: '#F6E6FF', fontSize: 9 },
  radio: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderColor: '#8A8394',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { backgroundColor: '#F4D174', borderColor: '#FFF0B9' },
  cta: {
    borderRadius: 29,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FFEAA1',
    overflow: 'hidden',
  },
  ctaFill: {
    minHeight: 54,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13,
  },
  ctaText: { color: '#080604', fontSize: 24, lineHeight: 30, fontWeight: '900' },
  free: { minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  freeText: { color: '#BBB6C5', textDecorationLine: 'underline', fontSize: 14 },
  termsNote: {
    color: '#918799',
    fontSize: 9,
    lineHeight: 13,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  footerButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  footerText: { color: '#AAA3B4', fontSize: 11 },
  divider: { color: '#665D70' },
  activeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A17E36',
    borderRadius: 15,
  },
  message: { marginTop: 8 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
  topGlow: {
    position: 'absolute',
    top: -300,
    right: -240,
    width: 420,
    height: 420,
    borderRadius: 210,
    borderWidth: 1,
    borderColor: '#775527',
    shadowColor: '#E2A338',
    shadowOpacity: 0.8,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  bottomGlow: {
    height: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#543476',
    borderRadius: 200,
    marginHorizontal: -60,
    marginTop: -12,
    transform: [{ rotate: '-9deg' }],
    opacity: 0.75,
  },
});
