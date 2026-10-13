import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { brand } from '@/theme/brand';
import { Group, InfoNote, SectionLabel, SelectionMark, Separator } from '@/ui/kit';
import { t, setLanguagePreference, tr as translateCopy } from './engine';
import { useLanguage } from './use-language';
import type { LanguagePreference } from './resolve-language';

const languages: { value: Exclude<LanguagePreference, 'system'>; title: string; code: string }[] = [
  { value: 'tr', title: 'Türkçe', code: 'TR' },
  { value: 'en', title: 'English', code: 'EN' },
  { value: 'de', title: 'Deutsch', code: 'DE' },
  { value: 'es', title: 'Español', code: 'ES' },
  { value: 'ar', title: 'العربية', code: 'AR' },
];

/**
 * Language selection. The full layout is used on the Language settings page;
 * `compact` renders a wrapping row of chips for the authentication screens.
 */
export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const state = useLanguage();
  const select = (value: LanguagePreference) => {
    void setLanguagePreference(value);
  };

  if (compact) {
    const options: { value: LanguagePreference; title: string; code: string }[] = [
      { value: 'system', title: t('language.system'), code: 'SYS' },
      ...languages,
    ];
    return (
      <View
        accessibilityLabel={t('language.title')}
        accessibilityRole="radiogroup"
        style={styles.inline}
      >
        {options.map((option) => {
          const selected = state.preference === option.value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={option.value}
              onPress={() => select(option.value)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={styles.code}>{option.code}</Text>
              <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                {option.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  const systemSelected = state.preference === 'system';
  return (
    <View accessibilityLabel={t('language.title')} accessibilityRole="radiogroup" style={styles.stack}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: systemSelected }}
        onPress={() => select('system')}
      >
        <Group selected={systemSelected} style={styles.systemRow}>
          <Ionicons color={brand.gold} name="globe-outline" size={24} />
          <View style={styles.copy}>
            <Text style={styles.rowTitle}>{t('language.system')}</Text>
            <Text style={styles.rowDetail}>{t('language.systemHint')}</Text>
          </View>
          <SelectionMark selected={systemSelected} />
        </Group>
      </Pressable>

      <SectionLabel>{translateCopy('Uygulama dili')}</SectionLabel>
      <Group>
        {languages.map((language, index) => {
          const selected = state.preference === language.value;
          return (
            <View key={language.value} style={styles.languageWrap}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => select(language.value)}
                style={({ pressed }) => [styles.languageRow, pressed && styles.pressed]}
              >
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={styles.badge}
                >
                  <Text style={styles.code}>{language.code}</Text>
                </View>
                <Text style={[styles.rowTitle, styles.copy]}>{language.title}</Text>
                <SelectionMark selected={selected} />
              </Pressable>
              {index === languages.length - 1 ? null : <Separator />}
            </View>
          );
        })}
      </Group>

      {state.saveFailed ? (
        <View accessibilityLiveRegion="polite" style={styles.stack}>
          <InfoNote icon="alert-circle-outline" tone="warning">
            {t('language.saveFailed')}
          </InfoNote>
          <Pressable onPress={() => select(state.preference)} style={styles.retry}>
            <Text style={styles.retryText}>{t('language.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <InfoNote title={translateCopy('Tercihin bu cihazda saklanır')}>
          {t('language.saved')}
        </InfoNote>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 20 },
  inline: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: {
    alignItems: 'center',
    backgroundColor: brand.surfaceRaised,
    borderColor: brand.line,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  chipSelected: { borderColor: brand.gold },
  chipLabel: { color: brand.text, fontSize: 13 },
  chipLabelSelected: { color: brand.goldLight, fontWeight: '600' },
  systemRow: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  copy: { flex: 1, minWidth: 0 },
  rowTitle: { color: brand.text, fontSize: 16, fontWeight: '500', lineHeight: 22 },
  rowDetail: { color: brand.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 3 },
  languageWrap: { gap: 10 },
  languageRow: { alignItems: 'center', flexDirection: 'row', gap: 14, minHeight: 48 },
  badge: {
    alignItems: 'center',
    backgroundColor: brand.surfaceSoft,
    borderRadius: 8,
    height: 28,
    justifyContent: 'center',
    width: 32,
  },
  code: { color: brand.goldLight, fontSize: 11, fontWeight: '700' },
  retry: { alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  retryText: { color: brand.gold, fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.65 },
});
