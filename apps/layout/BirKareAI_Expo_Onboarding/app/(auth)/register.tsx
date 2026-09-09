import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthInput } from '@/src/components/AuthInput';
import { BrandWordmark } from '@/src/components/BrandWordmark';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { colors } from '@/src/theme/colors';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');

  const valid = useMemo(
    () => name.trim().length >= 2 && email.includes('@') && password.length >= 8 && password === repeatPassword,
    [email, name, password, repeatPassword],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <Pressable accessibilityLabel="Geri" accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Ionicons color={colors.text} name="arrow-back" size={22} /></Pressable>
            <BrandWordmark compact />
            <View style={styles.spacer} />
          </View>

          <Text accessibilityRole="header" style={styles.title}>Hesap oluştur.</Text>
          <Text style={styles.subtitle}>BirKare AI’ye katıl, seçtiğin sahneleri ve oluşturduğun projeleri tek yerde sakla.</Text>

          <View style={styles.form}>
            <AuthInput autoCapitalize="words" icon="person-outline" label="Ad Soyad" onChangeText={setName} placeholder="Adınız ve soyadınız" value={name} />
            <AuthInput icon="mail-outline" keyboardType="email-address" label="E-posta" onChangeText={setEmail} placeholder="ornek@mail.com" value={email} />
            <AuthInput icon="lock-closed-outline" label="Şifre" onChangeText={setPassword} password placeholder="En az 8 karakter" value={password} />
            <AuthInput icon="shield-checkmark-outline" label="Şifre tekrar" onChangeText={setRepeatPassword} password placeholder="Şifrenizi tekrar yazın" value={repeatPassword} />
          </View>

          <View style={styles.passwordHint}>
            <Ionicons color={password.length >= 8 ? colors.success : colors.textMuted} name={password.length >= 8 ? 'checkmark-circle' : 'ellipse-outline'} size={16} />
            <Text style={styles.passwordHintText}>En az 8 karakter kullan</Text>
            <Ionicons color={password && password === repeatPassword ? colors.success : colors.textMuted} name={password && password === repeatPassword ? 'checkmark-circle' : 'ellipse-outline'} size={16} />
            <Text style={styles.passwordHintText}>Şifreler eşleşsin</Text>
          </View>

          <View style={styles.ctaWrap}>
            <PrimaryButton disabled={!valid} label="Kayıt ol" onPress={() => router.replace('/(tabs)/home')} />
          </View>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Zaten hesabın var mı?</Text>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/(auth)/login')}><Text style={styles.loginLink}> Giriş yap</Text></Pressable>
          </View>
          <Text style={styles.legal}>Kayıt olarak Kullanım Koşulları’nı ve Gizlilik Politikası’nı kabul etmiş olursunuz.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: 28, paddingHorizontal: 22 },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
  back: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, height: 42, justifyContent: 'center', width: 42 },
  spacer: { width: 42 },
  title: { color: colors.text, fontSize: 31, fontWeight: '900', letterSpacing: -1.15, marginTop: 40 },
  subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 11 },
  form: { gap: 14, marginTop: 26 },
  passwordHint: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 },
  passwordHintText: { color: colors.textMuted, fontSize: 10, marginRight: 8 },
  ctaWrap: { marginTop: 24 },
  loginRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  loginText: { color: colors.textSecondary, fontSize: 13 },
  loginLink: { color: colors.accent, fontSize: 13, fontWeight: '900' },
  legal: { color: colors.textMuted, fontSize: 10, lineHeight: 16, marginTop: 18, paddingHorizontal: 16, textAlign: 'center' },
});
