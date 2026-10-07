import { useLanguageRevision } from '@/i18n/use-language';
import { tr as translateCopy } from '@/i18n/engine';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

/** A visible, lightweight gate while authentication is restored on cold links. */
export function AuthBootScreen() {
  const languageRevision = useLanguageRevision();

  return (
    <View style={styles.screen} accessibilityLiveRegion="polite">
      <ActivityIndicator color="#FFC400" size="large" accessibilityLabel={translateCopy("Oturum yükleniyor")} />
      <Text style={styles.title}>BirKare Studio</Text>
      <Text style={styles.detail}>{translateCopy("Oturumun hazırlanıyor…")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050505',
    padding: 24,
    gap: 14,
  },
  title: { color: '#F8E5A3', fontSize: 23, fontWeight: '600', marginTop: 8 },
  detail: { color: '#ADADAF', fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
