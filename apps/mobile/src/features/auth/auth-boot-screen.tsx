import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

/** A visible, lightweight gate while authentication is restored on cold links. */
export function AuthBootScreen() {
  return (
    <View style={styles.screen} accessibilityLiveRegion="polite">
      <ActivityIndicator color="#FFC400" size="large" accessibilityLabel="Oturum yükleniyor" />
      <Text style={styles.title}>BirKare AI</Text>
      <Text style={styles.detail}>Oturumun hazırlanıyor…</Text>
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
