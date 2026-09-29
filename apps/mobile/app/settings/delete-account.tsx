import { useLanguageRevision } from '@/i18n/use-language';
import { tr as translateCopy } from '@/i18n/engine';
import { useRef, useState } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon, TextField } from '@/components';
import { GlassSurface } from '@/components/GlassSurface';
import { apiRequest } from '@/api/client';
import { useAuthStore } from '@/features/auth/auth-store';
import { clearRefreshToken } from '@/features/auth/token-store';
import {
  GoogleSignInButton,
  signOutOfNativeGoogleIfAvailable,
} from '@/features/auth/google-sign-in';
import { useRevenueCat } from '@/features/billing/revenuecat';
import { resetCreateFlow } from '@/features/create/createFlow';
import {
  GlassSettingsPanel,
  GlassSettingsRow,
  SettingsNote,
  SettingsPage,
  SettingsSectionTitle,
} from '@/features/settings/components';
import { colors } from '@/theme';

type DeletionPreview = {
  canVerifyPassword: boolean;
  canVerifyGoogle: boolean;
  canVerifyApple: boolean;
  recoveryDays: number;
};
const CONFIRMATION = 'HESABIMI SIL';

export default function DeleteAccountScreen() {
  const languageRevision = useLanguageRevision();

  const router = useRouter();
  const queryClient = useQueryClient();
  const billing = useRevenueCat();
  const userId = useAuthStore((state) => state.user?.id);
  const preview = useQuery({
    queryKey: ['account-deletion', userId],
    queryFn: () => apiRequest<DeletionPreview>('/v1/me/deletion'),
    enabled: Boolean(userId),
  });
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const canConfirm = acknowledged && confirmation === CONFIRMATION && !busy;

  async function submit(
    credentials: { password: string } | { googleIdToken: string } | { appleIdToken: string },
  ) {
    if (!canConfirm || busy || submitting.current) return;
    submitting.current = true;
    const confirmed = await new Promise<boolean>((resolve) =>
      Alert.alert(
        translateCopy("Hesabın kalıcı olarak silinsin mi?"),
        translateCopy("Hesabına erişim hemen kapanır. 30 gün içinde yeniden giriş yaparak silme isteğinden vazgeçebilirsin."),
        [
          { text: translateCopy("Vazgeç"), style: 'cancel', onPress: () => resolve(false) },
          { text: translateCopy("Hesabımı sil"), style: 'destructive', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      ),
    );
    if (!confirmed) {
      submitting.current = false;
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiRequest('/v1/me', {
        method: 'DELETE',
        body: JSON.stringify({ confirmation: CONFIRMATION, ...credentials }),
      });
      setPassword('');
      await clearRefreshToken().catch(() => undefined);
      await signOutOfNativeGoogleIfAvailable();
      useAuthStore.getState().clearSession();
      queryClient.clear();
      resetCreateFlow();
      router.replace('/(auth)/login' as never);
      Alert.alert(
        translateCopy("Silme işlemi planlandı"),
        translateCopy("Hesabına erişim kapatıldı. 30 gün içinde yeniden giriş yaparsan hesabını geri getirebilirsin. Süre dolunca veriler kalıcı olarak silinir."),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translateCopy("Silme başlatılamadı. Hesabın değişmedi."));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function manageSubscription() {
    setError(null);
    const result = await billing.presentCustomerCenter();
    if (result.kind === 'error') {
      if (billing.managementUrl) {
        await Linking.openURL(billing.managementUrl);
        await billing.refreshFresh();
        return;
      }
      setError(result.message);
      return;
    }
    if (result.kind === 'pending') {
      setError(result.message);
      return;
    }
    await billing.refreshFresh();
  }

  async function verifyWithAppleAndDelete() {
    if (!canConfirm || busy || Platform.OS !== 'ios') return;
    setError(null);
    try {
      const credential = await AppleAuthentication.signInAsync({ requestedScopes: [] });
      if (!credential.identityToken) {
        setError(translateCopy("Apple kimlik belirteci alınamadı. Lütfen yeniden dene."));
        return;
      }
      await submit({ appleIdToken: credential.identityToken });
    } catch (cause) {
      const code = (cause as { code?: unknown } | null)?.code;
      if (code === 'ERR_REQUEST_CANCELED') return;
      setError(cause instanceof Error ? cause.message : translateCopy("Apple doğrulaması tamamlanamadı."));
    }
  }

  return (
    <SettingsPage
      title={translateCopy("Hesabı sil")}
      subtitle={translateCopy("Kalıcı işlem ve veri yönetimi")}
      back
      navigation={false}
    >
      <GlassSurface
        tone="iridescent"
        radius={26}
        style={styles.hero}
        contentStyle={styles.heroContent}
      >
        <View style={styles.dangerOrb}>
          <Icon name="trash-outline" size={35} color="#FF726B" />
        </View>
        <View style={styles.copy}>
          <Text style={styles.heading}>{translateCopy("Silmeden önce")}</Text>
          <Text style={styles.body}>{translateCopy("Projelerin, kaynak fotoğrafların, oluşturulan görsellerin ve hesap bilgilerin silinir.")}</Text>
          <Text style={styles.dangerText}>{translateCopy("30 gün içinde geri alınabilir.")}</Text>
        </View>
      </GlassSurface>
      <GlassSettingsPanel>
        <SettingsSectionTitle>{translateCopy("Neler etkilenecek")}</SettingsSectionTitle>
        <GlassSettingsRow
          icon="folder-outline"
          title={translateCopy("Projeler ve görseller")}
          detail={translateCopy("Taslaklar, kaynaklar ve kayıtlı üretimler kaldırılır.")}
          accent="purple"
        />
        <GlassSettingsRow
          icon="flash-outline"
          title={translateCopy("Krediler")}
          detail={translateCopy("Kullanılmamış bakiyene erişim sona erer.")}
        />
        <GlassSettingsRow
          icon="diamond-outline"
          title={translateCopy("Mağaza abonelikleri")}
          detail={
            billing.subscriptionCancelled
              ? translateCopy("Yenileme kapalı. Mevcut Pro erişimin dönem sonuna kadar devam eder.")
              : translateCopy("Hesabı silmek mağaza aboneliğini otomatik iptal etmez.")
          }
          accent="purple"
        />
        {billing.isPro && billing.entitlement?.expirationDate ? (
          <Pressable
            accessibilityRole="button"
            disabled={!billing.ready || billing.busy}
            onPress={() => void manageSubscription()}
            style={[styles.subscriptionAction, (!billing.ready || billing.busy) && styles.disabled]}
          >
            <GlassSurface radius={18} tone="neutral" contentStyle={styles.subscriptionActionContent}>
              <Icon name="card-outline" size={19} color={colors.accentYellow} />
              <Text style={styles.goldText}>
                {billing.subscriptionCancelled ? translateCopy("Abonelik durumunu aç") : translateCopy("Aboneliği yönet / iptal et")}
              </Text>
            </GlassSurface>
          </Pressable>
        ) : null}
        <GlassSettingsRow
          icon="person-outline"
          title={translateCopy("Hesap bilgileri")}
          detail={translateCopy("Profil, oturumlar ve kişisel tercihler kaldırılır.")}
          last
        />
      </GlassSettingsPanel>
      <GlassSettingsPanel tone="gold">
        <SettingsSectionTitle>{translateCopy("Güvenli doğrulama")}</SettingsSectionTitle>
        <GlassSettingsRow
          icon="lock-closed-outline"
          title={translateCopy("Hesabını yeniden doğrula")}
          detail={translateCopy("Bu işlem için şifren veya bağlı Google/Apple hesabın gerekir.")}
          last
        />
        {preview.isPending ? (
          <Text style={styles.body}>{translateCopy("Doğrulama seçenekleri yükleniyor…")}</Text>
        ) : null}
        {preview.isError ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void preview.refetch()}
            style={styles.retry}
          >
            <Text style={styles.goldText}>{translateCopy("Seçenekler alınamadı · Yeniden dene")}</Text>
          </Pressable>
        ) : null}
        {preview.data?.canVerifyPassword ? (
          <View style={styles.passwordRow}>
            <TextField
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!visible}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={translateCopy("Şifreni gir")}
              textContentType="password"
              accessibilityLabel={translateCopy("Hesap şifren")}
              containerStyle={styles.passwordContainer}
              style={styles.password}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={visible ? translateCopy("Şifreyi gizle") : translateCopy("Şifreyi göster")}
              onPress={() => setVisible((value) => !value)}
              style={styles.eye}
            >
              <Icon name={visible ? 'eye-off-outline' : 'eye-outline'} size={21} />
            </Pressable>
          </View>
        ) : null}
        <Text style={styles.confirmLabel}>{translateCopy("Onaylamak için aşağıya {{p0}} yaz.", { p0: CONFIRMATION })}</Text>
        <TextField
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={CONFIRMATION}
          accessibilityLabel={translateCopy("Kalıcı silme onay metni")}
        />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acknowledged }}
          onPress={() => setAcknowledged((value) => !value)}
          style={styles.checkboxRow}
        >
          <View style={[styles.checkbox, acknowledged && styles.checked]}>
            {acknowledged ? <Icon name="checkmark" color="#050505" size={17} /> : null}
          </View>
          <Text style={styles.checkLabel}>{translateCopy("30 günlük geri alma süresi sonunda verilerin kalıcı olarak silineceğini anladım.")}</Text>
        </Pressable>
      </GlassSettingsPanel>
      <SettingsNote warning>{translateCopy("Hesabına erişim hemen kapanır. Silme isteğinden sonraki 30 gün boyunca hesabın geri getirilebilir durumda tutulur. Bu sürede yeniden giriş yapıp silme isteğinden vazgeçebilirsin. Süre dolunca dosyalar ve hesap verileri kalıcı olarak temizlenir. Hoş geldin hakkının tekrar verilmesini önlemek için geri döndürülemeyen, anahtarlı kimlik özetleri saklanabilir.")}</SettingsNote>
      {preview.data &&
      !preview.data.canVerifyGoogle &&
      !preview.data.canVerifyApple &&
      !preview.data.canVerifyPassword ? (
        <SettingsNote warning>{translateCopy("Bu hesap için desteklenen bir yeniden doğrulama yöntemi bulunamadı. Yardım ve destek üzerinden bize ulaş.")}</SettingsNote>
      ) : null}
      {preview.data?.canVerifyApple && Platform.OS !== 'ios' ? (
        <SettingsNote warning>{translateCopy("Apple ile yeniden doğrulama iOS üzerinde yapılır. Bu cihazda hesabını silmek için web silme sayfasını kullanabilirsin.")}<Text
            style={styles.goldText}
            onPress={() => void Linking.openURL('https://ai.ranvals.com/birkare/hesap-silme/')}
          >{translateCopy("{{p0}}Web hesabı silme sayfasını aç", { p0: ' ' })}</Text>
        </SettingsNote>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {preview.data?.canVerifyGoogle ? (
        <GoogleSignInButton
          label={translateCopy("Google ile doğrula ve sil")}
          forceReauthentication
          disabled={!canConfirm}
          onError={(cause) => setError(cause.message)}
          onSuccess={(googleIdToken) => submit({ googleIdToken })}
        />
      ) : null}
      {preview.data?.canVerifyApple && Platform.OS === 'ios' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canConfirm || busy }}
          disabled={!canConfirm || busy}
          onPress={() => void verifyWithAppleAndDelete()}
          style={[styles.appleAction, (!canConfirm || busy) && styles.disabled]}
        >
          <Icon name="logo-apple" size={21} color="#111111" />
          <Text style={styles.appleActionText}>{translateCopy("Apple ile doğrula ve sil")}</Text>
        </Pressable>
      ) : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          disabled={busy}
          style={styles.action}
        >
          <GlassSurface radius={23} tone="neutral" contentStyle={styles.actionContent}>
            <Text style={styles.actionLabel}>{translateCopy("Vazgeç")}</Text>
          </GlassSurface>
        </Pressable>
        {preview.data?.canVerifyPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canConfirm || !password, busy }}
            disabled={!canConfirm || !password}
            onPress={() => void submit({ password })}
            style={[styles.action, (!canConfirm || !password) && styles.disabled]}
          >
            <View style={styles.deleteAction}>
              <Icon name="trash-outline" size={21} color="#FF8C83" />
              <Text style={[styles.actionLabel, styles.dangerText]}>
                {busy ? translateCopy("İşleniyor…") : translateCopy("Kalıcı sil")}
              </Text>
            </View>
          </Pressable>
        ) : null}
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: 5, marginBottom: 18 },
  heroContent: { padding: 20, flexDirection: 'row', gap: 16, alignItems: 'center' },
  dangerOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: '#F27671',
    backgroundColor: 'rgba(140,20,24,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF514A',
    shadowOpacity: 0.25,
    shadowRadius: 17,
    shadowOffset: { width: 0, height: 0 },
  },
  copy: { flex: 1 },
  heading: { color: '#FFF', fontSize: 23, fontWeight: '700' },
  body: { color: '#ABA8AF', fontSize: 13, lineHeight: 20, marginTop: 8 },
  dangerText: { color: '#FF786F', fontWeight: '700', marginTop: 4 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  passwordContainer: { flex: 1 },
  password: { flex: 1, paddingRight: 48 },
  eye: {
    position: 'absolute',
    right: 0,
    width: 46,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLabel: { color: '#ABA8AF', fontSize: 12, lineHeight: 18, marginVertical: 12 },
  checkboxRow: {
    minHeight: 65,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 14,
  },
  checkbox: {
    width: 25,
    height: 25,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.accentYellow },
  checkLabel: { color: '#C0BCC4', flex: 1, fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  action: { flex: 1 },
  actionContent: { minHeight: 65, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  deleteAction: {
    minHeight: 65,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#EB6F60',
    backgroundColor: 'rgba(113,22,26,0.35)',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.38 },
  error: { color: '#FF8C83', fontSize: 13, lineHeight: 20, marginVertical: 12 },
  retry: { paddingVertical: 14 },
  subscriptionAction: { marginTop: 12 },
  subscriptionActionContent: {
    minHeight: 50,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleAction: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  appleActionText: { color: '#111111', fontSize: 15, fontWeight: '700' },
  goldText: { color: colors.accentYellow },
});
