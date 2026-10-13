import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCopy } from '@/features/settings/language-store';
import { brand } from '@/theme/brand';
import { CreditPackList } from './CreditPacks';

/**
 * Shown from the bottom when a shoot costs more than the balance: says how
 * many credits are missing and lets the person top up without leaving the plan.
 */
export function LowCreditsSheet({
  visible,
  required,
  available,
  onClose,
  onPurchased,
}: {
  visible: boolean;
  required: number;
  available: number;
  onClose: () => void;
  onPurchased: () => void;
}) {
  const copy = useCopy();
  const missing = Math.max(0, required - available);
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safe}>
        <View style={styles.bar}>
          <Pressable
            accessibilityLabel={copy('Kapat', 'Close')}
            accessibilityRole="button"
            hitSlop={6}
            onPress={onClose}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <Ionicons color={brand.textSecondary} name="close" size={20} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.column}>
            <Text accessibilityRole="header" style={styles.title}>
              {available > 0
                ? copy('Bu çekim için kredin yetmiyor', 'Not enough credits for this shoot')
                : copy('Kredin bitti', 'You are out of credits')}
            </Text>
            <Text style={styles.subtitle}>
              {copy(
                `Bu plan ${required} kredi gerektiriyor, hesabında ${available} kredi var. ${missing} kredi daha gerekiyor.`,
                `This plan needs ${required} credits and you have ${available}. You need ${missing} more.`,
              )}
            </Text>
            <CreditPackList onPurchased={onPurchased} />
            <Text style={styles.note}>
              {copy(
                'Krediler tek seferlik satın alınır ve süresi dolmaz. Fiyatlar mağazadan alınır. Daha az alternatif veya Önizleme kalitesi seçerek de devam edebilirsin.',
                'Credits are a one-time purchase and never expire. Prices come from the store. You can also continue by choosing fewer alternatives or Preview quality.',
              )}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: brand.background, flex: 1 },
  bar: { alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 14 },
  close: {
    alignItems: 'center',
    backgroundColor: brand.surfaceSoft,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  content: { alignItems: 'center', paddingBottom: 24, paddingHorizontal: 20 },
  column: { gap: 16, maxWidth: 520, width: '100%' },
  title: { color: brand.text, fontSize: 28, fontWeight: '700', lineHeight: 34 },
  subtitle: { color: brand.textSecondary, fontSize: 17, lineHeight: 22, marginTop: -8 },
  note: { color: brand.textSecondary, fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.65 },
});
