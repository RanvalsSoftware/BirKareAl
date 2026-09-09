import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotFoundScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>Bu kare bulunamadı.</Text>
        <Text style={styles.copy}>Aradığınız sayfa taşınmış veya kaldırılmış olabilir.</Text>
        <Link href="/(tabs)/home" style={styles.link}>Ana sayfaya dön</Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: '#050505', flex: 1 },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  copy: { color: '#A7A7A7', fontSize: 15, marginTop: 8, textAlign: 'center' },
  link: { color: '#FFC400', fontSize: 16, fontWeight: '700', marginTop: 22 },
});
