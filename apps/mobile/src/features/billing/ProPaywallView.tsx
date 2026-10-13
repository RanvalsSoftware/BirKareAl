import { useLanguageRevision } from '@/i18n/use-language';
import { tr as translateCopy } from '@/i18n/engine';
import { Ionicons } from '@expo/vector-icons';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { brand } from '@/theme/brand';
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
const assets = {
  first: require('../../../assets/products/ui/categories/shoes.webp'),
  second: require('../../../assets/products/ui/categories/cosmetics.webp'),
  third: require('../../../assets/products/ui/categories/handbag.webp'),
};

/**
 * Plan picker in the shape people know from the App Store: what the plan
 * gives, the plans as a radio list with store prices, and one pinned action
 * with restore and legal links directly under it.
 */
export function ProPaywallView(props: ProPaywallViewProps) {
  useLanguageRevision();

  const benefits = [
    `${translateCopy('Plan kredileri')} ${translateCopy('hesabına tanımlanır')}`,
    `${translateCopy('Ürün projelerinde')} ${translateCopy('kullanılır')}`,
    `${translateCopy('Aboneliğini')} ${translateCopy('mağazadan yönet')}`,
  ];
  const unavailable = Boolean(props.disabled || props.busy);
  return (
    <SafeAreaView
      edges={props.sheet ? ['bottom', 'left', 'right'] : ['top', 'bottom', 'left', 'right']}
      style={s.safe}
    >
      <StatusBar style="light" />
      {props.sheet ? <View pointerEvents="none" style={s.handle} /> : null}
      <View style={s.bar}>
        <Pressable
          accessibilityLabel={translateCopy('Pro ekranını kapat')}
          accessibilityRole="button"
          hitSlop={6}
          onPress={props.onClose}
          style={({ pressed }) => [s.close, pressed && s.pressed]}
        >
          <Ionicons color={brand.textSecondary} name="close" size={20} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.column}>
          <Text accessibilityRole="header" style={s.title}>
            BirKare Pro
          </Text>
          <Text style={s.subtitle}>
            {translateCopy('Planına göre tanımlanan kredileri ürün{{p0}}projelerinde kullan.', {
              p0: ' ',
            })}
          </Text>

          <View style={s.gallery}>
            {[assets.first, assets.second, assets.third].map((image, index) => (
              <Image
                accessibilityIgnoresInvertColors
                accessible={false}
                key={index}
                resizeMode="cover"
                source={image}
                style={s.galleryImage}
              />
            ))}
          </View>

          <View style={s.benefits}>
            {benefits.map((benefit) => (
              <View key={benefit} style={s.benefit}>
                <Ionicons color={brand.gold} name="checkmark-circle" size={20} />
                <Text style={s.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>

          {props.preview ? (
            <Text style={s.banner} testID="paywall-preview-label">
              {translateCopy('TASARIM ÖNİZLEMESİ · ÖRNEK FİYATLAR · ÖDEME YAPMAZ')}
            </Text>
          ) : null}
          {!props.preview && props.banner ? <Text style={s.banner}>{props.banner}</Text> : null}

          {props.active ? (
            <View style={s.active}>
              <Ionicons color={brand.gold} name="checkmark-circle" size={30} />
              <View style={s.flex}>
                <Text style={s.planTitle}>{translateCopy('BirKare Pro aktif')}</Text>
                <Text style={s.planNote}>{props.activeNote}</Text>
              </View>
            </View>
          ) : (
            <View
              accessibilityLabel={translateCopy('BirKare Pro paketleri')}
              accessibilityRole="radiogroup"
              style={s.plans}
            >
              {props.plans.map((plan) => {
                const selected = props.selected === plan.id;
                return (
                  <Pressable
                    accessibilityLabel={`${plan.label}, ${plan.price}, ${plan.period}, ${plan.note}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected, disabled: unavailable }}
                    disabled={unavailable}
                    key={plan.id}
                    onPress={() => props.onSelect(plan.id)}
                    style={({ pressed }) => [
                      s.plan,
                      selected && s.planSelected,
                      pressed && s.pressed,
                    ]}
                    testID={`paywall-plan-${plan.id}`}
                  >
                    <Ionicons
                      color={selected ? brand.gold : brand.textMuted}
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={24}
                    />
                    <View style={s.flex}>
                      <View style={s.planHead}>
                        <Text style={s.planTitle}>{plan.label}</Text>
                        {plan.badge ? (
                          <View style={s.badge}>
                            <Text style={s.badgeText}>{plan.badge}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={s.planNote}>{plan.note}</Text>
                      {plan.monthlyEquivalent ? (
                        <Text style={s.planNote}>{plan.monthlyEquivalent}</Text>
                      ) : null}
                    </View>
                    <View style={s.priceBlock}>
                      <Text style={s.price}>{plan.price}</Text>
                      <Text style={s.period}>{plan.period}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {props.message ? <View>{props.message}</View> : null}
        </View>
      </ScrollView>

      <View style={s.footer}>
        <View style={s.column}>
          <Pressable
            accessibilityLabel={
              props.preview
                ? translateCopy('Pro’ya geç — yalnızca tasarım önizlemesi')
                : props.active
                  ? translateCopy('Aboneliği yönet')
                  : translateCopy('Pro’ya geç')
            }
            accessibilityRole="button"
            accessibilityState={{ busy: Boolean(props.busy), disabled: unavailable }}
            disabled={unavailable}
            onPress={props.onBuy}
            style={({ pressed }) => [s.cta, unavailable && s.disabled, pressed && s.pressed]}
            testID="paywall-purchase"
          >
            {props.busy ? (
              <ActivityIndicator color={brand.onGold} />
            ) : (
              <Text style={s.ctaText}>
                {props.active ? translateCopy('Aboneliği yönet') : translateCopy('Pro’ya geç')}
              </Text>
            )}
          </Pressable>
          <View style={s.links}>
            <Pressable
              accessibilityRole="button"
              disabled={props.restoreDisabled || props.busy}
              onPress={props.onRestore}
              style={s.link}
            >
              <Text style={[s.linkText, (props.restoreDisabled || props.busy) && s.disabled]}>
                {translateCopy('Geri yükle')}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="link" onPress={props.onTerms} style={s.link}>
              <Text style={s.linkText}>{translateCopy('Şartlar')}</Text>
            </Pressable>
            <Pressable accessibilityRole="link" onPress={props.onPrivacy} style={s.link}>
              <Text style={s.linkText}>{translateCopy('Gizlilik')}</Text>
            </Pressable>
          </View>
          <Text style={s.terms}>
            {translateCopy(
              'Aylık ve yıllık planlar iptal edilmedikçe yenilenir. Ömür Boyu tek ödemedir. AI üretimleri kredi kullanır; sınırsız üretim içermez.',
            )}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { backgroundColor: brand.background, flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  handle: {
    alignSelf: 'center',
    backgroundColor: brand.textMuted,
    borderRadius: 3,
    height: 5,
    marginTop: 8,
    width: 36,
  },
  bar: { alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 8 },
  close: {
    alignItems: 'center',
    backgroundColor: brand.surfaceSoft,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  scroll: { alignItems: 'center', paddingBottom: 16, paddingHorizontal: 20 },
  column: { gap: 16, maxWidth: 520, width: '100%' },
  title: { color: brand.text, fontSize: 34, fontWeight: '700', lineHeight: 41, textAlign: 'center' },
  subtitle: {
    color: brand.textSecondary,
    fontSize: 17,
    lineHeight: 22,
    marginTop: -8,
    textAlign: 'center',
  },
  gallery: { flexDirection: 'row', gap: 8 },
  galleryImage: {
    aspectRatio: 3 / 4,
    backgroundColor: brand.surface,
    borderRadius: 14,
    flex: 1,
    height: undefined,
  },
  benefits: { gap: 10 },
  benefit: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  benefitText: { color: brand.text, flex: 1, fontSize: 15, lineHeight: 20 },
  banner: { color: brand.textMuted, fontSize: 11, lineHeight: 15, textAlign: 'center' },
  active: {
    alignItems: 'center',
    backgroundColor: brand.surface,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  plans: { gap: 10 },
  plan: {
    alignItems: 'center',
    backgroundColor: brand.surface,
    borderColor: brand.surface,
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 12,
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  planSelected: { backgroundColor: brand.surfaceRaised, borderColor: brand.gold },
  planHead: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  planTitle: { color: brand.text, fontSize: 17, fontWeight: '600', lineHeight: 22 },
  planNote: { color: brand.textSecondary, fontSize: 13, lineHeight: 18 },
  badge: {
    backgroundColor: brand.goldTint,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: brand.goldLight, fontSize: 12, fontWeight: '600', lineHeight: 16 },
  priceBlock: { alignItems: 'flex-end' },
  price: {
    color: brand.text,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    lineHeight: 22,
  },
  period: { color: brand.textSecondary, fontSize: 13, lineHeight: 18 },
  footer: {
    alignItems: 'center',
    borderTopColor: brand.line,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    paddingBottom: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  cta: {
    alignItems: 'center',
    backgroundColor: brand.gold,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 52,
  },
  ctaText: { color: brand.onGold, fontSize: 17, fontWeight: '600' },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginVertical: -10 },
  link: { justifyContent: 'center', minHeight: 44 },
  linkText: { color: brand.text, fontSize: 15 },
  terms: { color: brand.textMuted, fontSize: 11, lineHeight: 15, textAlign: 'center' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.65 },
});
