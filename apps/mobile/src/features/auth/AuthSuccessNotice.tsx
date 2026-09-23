import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCopy } from '@/features/settings/language-store';

type Props = { title: string; message: string; onDismiss: () => void };

/** Inline and dismissible: never place a touch-blocking overlay above the form. */
export function AuthSuccessNotice({ title, message, onDismiss }: Props) {
  const copy = useCopy();
  return (
    <View testID="auth-success-notice" accessibilityLiveRegion="polite" style={styles.banner}>
      <View style={styles.icon}><Ionicons color="#0A1C11" name="checkmark" size={17} /></View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      <Pressable testID="dismiss-auth-notice" accessibilityRole="button"
        accessibilityLabel={copy('Bildirimi kapat', 'Dismiss notification')}
        onPress={onDismiss} style={styles.close}>
        <Ionicons name="close" size={18} color="#B8C8BE" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { alignItems: 'center', backgroundColor: 'rgba(52,199,89,0.09)', borderColor: 'rgba(72,220,112,0.28)', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 11, marginVertical: 8, paddingLeft: 13, paddingRight: 4, paddingVertical: 12 },
  icon: { alignItems: 'center', backgroundColor: '#57E58C', borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  copy: { flex: 1 },
  title: { color: '#8FF0B0', fontSize: 13, fontWeight: '900' },
  message: { color: '#B8C8BE', fontSize: 11, lineHeight: 16, marginTop: 2 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
