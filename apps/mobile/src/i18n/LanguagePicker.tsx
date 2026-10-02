import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t, setLanguagePreference } from './engine';
import { useLanguage } from './use-language';
import type { LanguagePreference } from './resolve-language';

export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const state = useLanguage();
  const options: { value: LanguagePreference; title: string; icon: string }[] = [
    { value: 'system', title: t('language.system'), icon: 'SYS' },
    { value: 'tr', title: 'Türkçe', icon: 'TR' },
    { value: 'en', title: 'English', icon: 'EN' },
    { value: 'de', title: 'Deutsch', icon: 'DE' },
    { value: 'es', title: 'Español', icon: 'ES' },
    { value: 'ar', title: 'العربية', icon: 'AR' },
  ];
  return (
    <View style={[styles.container, compact && styles.compact]}>
      {!compact ? <Text style={styles.title}>{t('language.title')}</Text> : null}
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('language.title')}
        style={compact ? styles.inline : styles.options}
      >
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: state.preference === option.value }}
            onPress={() => {
              void setLanguagePreference(option.value);
            }}
            style={[
              styles.option,
              compact && styles.inlineOption,
              state.preference === option.value && styles.selected,
            ]}
          >
            <View style={styles.optionCopy}>
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={styles.flag}
              >
                <Text style={styles.languageCode}>{option.icon}</Text>
              </View>
              <Text
                style={[styles.label, state.preference === option.value && styles.selectedLabel]}
              >
                {option.title}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
      {!compact ? <Text style={styles.hint}>{t('language.systemHint')}</Text> : null}
      {state.saveFailed ? (
        <View accessibilityLiveRegion="polite">
          <Text style={styles.hint}>{t('language.saveFailed')}</Text>
          <Pressable
            onPress={() => {
              void setLanguagePreference(state.preference);
            }}
            style={styles.option}
          >
            <Text style={styles.selectedLabel}>{t('language.retry')}</Text>
          </Pressable>
        </View>
      ) : !compact ? (
        <Text style={styles.hint}>{t('language.saved')}</Text>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    borderRadius: 22,
    backgroundColor: '#171619',
    borderWidth: 1,
    borderColor: '#373139',
  },
  compact: { padding: 6, backgroundColor: 'transparent', borderWidth: 0 },
  title: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  options: { gap: 9 },
  inline: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  option: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#49444B',
    borderRadius: 14,
    justifyContent: 'center',
  },
  optionCopy: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  flag: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,196,0,0.09)',
    borderColor: 'rgba(255,196,0,0.28)',
    borderRadius: 6,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    width: 28,
  },
  languageCode: { color: '#FFE17C', fontSize: 8, fontWeight: '900', letterSpacing: 0.2 },
  inlineOption: { minHeight: 44, paddingHorizontal: 11, paddingVertical: 9 },
  selected: { borderColor: '#F5C842', backgroundColor: '#30280D' },
  label: { color: '#DEDCE0', fontSize: 14, flexShrink: 1 },
  selectedLabel: { color: '#FFE59C', fontWeight: '700' },
  hint: { color: '#ACA7B1', lineHeight: 20, fontSize: 13 },
});
