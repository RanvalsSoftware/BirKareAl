import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthInput } from '@/src/components/AuthInput';
import { BrandWordmark } from '@/src/components/BrandWordmark';
import { PrimaryButton } from '@/src/components/PrimaryButton';
import { colors } from '@/src/theme/colors';
import { radius } from '@/src/theme/metrics';

const background = require('../../assets/images/categories/cinematic-scene.jpg');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const valid = useMemo(() => email.includes('@') && password.length >= 6, [email, password]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Image contentFit="cover" source={background} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['rgba(5,5,5,0.2)', 'rgba(5,5,5,0.88)', colors.background]} style={StyleSheet.absoluteFill} />
            <View style={styles.brand}><BrandWordmark /></View>
            <Text style={styles.heroTitle}>Hayalindeki kareye{`\n`}geri dön.</Text>
            <Text style={styles.heroText}>Projelerine, filtrelerine ve oluşturduğun sahnelere eriş.</Text>
          </View>

          <View style={styles.form}>
            <AuthInput icon="mail-outline" keyboardType="email-address" label="E-posta" onChangeText={setEmail} placeholder="ornek@mail.com" value={email} />
            <AuthInput icon="lock-closed-outline" label="Şifre" onChangeText={setPassword} password placeholder="En az 6 karakter" value={password} />

            <Pressable accessibilityRole="button" onPress={() => {}} style={styles.forgot}><Text style={styles.forgotText}>Şifremi unuttum</Text></Pressable>
            <PrimaryButton disabled={!valid} label="Giriş yap" onPress={() => router.replace('/(tabs)/home')} />

            <View style={styles.divider}><View style={styles.line} /><Text style={styles.dividerText}>veya</Text><View style={styles.line} /></View>

            <PrimaryButton icon="logo-apple" label="Apple ile devam et" onPress={() => router.replace('/(tabs)/home')} variant="secondary" />
            <PrimaryButton icon="logo-google" label="Google ile devam et" onPress={() => router.replace('/(tabs)/home')} variant="secondary" />

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Hesabın yok mu?</Text>
              <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/register')}><Text style={styles.registerLink}> Kayıt ol</Text></Pressable>
            </View>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/(tabs)/home')} style={styles.demoButton}><Text style={styles.demoText}>Demo olarak devam et</Text><Ionicons color={colors.textSecondary} name="arrow-forward" size={16} /></Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: 24 },
  hero: { height: 320, justifyContent: 'flex-end', overflow: 'hidden', paddingHorizontal: 22, paddingBottom: 28 },
  brand: { left: 22, position: 'absolute', top: 16 },
  heroTitle: { color: colors.text, fontSize: 31, fontWeight: '900', letterSpacing: -1.15, lineHeight: 37 },
  heroText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: 310 },
  form: { gap: 14, paddingHorizontal: 22 },
  forgot: { alignSelf: 'flex-end', marginTop: -2, paddingVertical: 3 },
  forgotText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  divider: { alignItems: 'center', flexDirection: 'row', gap: 12, marginVertical: 5 },
  line: { backgroundColor: colors.borderStrong, flex: 1, height: 1 },
  dividerText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  registerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  registerText: { color: colors.textSecondary, fontSize: 13 },
  registerLink: { color: colors.accent, fontSize: 13, fontWeight: '900' },
  demoButton: { alignItems: 'center', alignSelf: 'center', borderRadius: radius.md, flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  demoText: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
});
