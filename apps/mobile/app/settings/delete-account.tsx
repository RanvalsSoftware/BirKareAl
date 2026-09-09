import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
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
  cleanupDelayMinutes: number;
};
const CONFIRMATION = 'HESABIMI SIL';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
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

  async function submit(credentials: { password: string } | { googleIdToken: string }) {
    if (!canConfirm || busy || submitting.current) return;
    submitting.current = true;
    const confirmed = await new Promise<boolean>((resolve) =>
      Alert.alert(
        'Hesabın kalıcı olarak silinsin mi?',
        'Bu işlem geri alınamaz. Projelerine, görsellerine ve kullanılmamış kredilerine erişimin kapanacak.',
        [
          { text: 'Vazgeç', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Hesabımı sil', style: 'destructive', onPress: () => resolve(true) },
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
        'Silme işlemi başlatıldı',
        'Hesabına erişim kapatıldı. Kısa süreli dosya bağlantıları geçersiz olduktan sonra veri temizliği otomatik tamamlanır; işlem geri alınamaz.',
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Silme başlatılamadı. Hesabın değişmedi.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <SettingsPage
      title="Hesabı sil"
      subtitle="Kalıcı işlem ve veri yönetimi"
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
          <Text style={styles.heading}>Silmeden önce</Text>
          <Text style={styles.body}>
            Projelerin, kaynak fotoğrafların, oluşturulan görsellerin ve hesap bilgilerin silinir.
          </Text>
          <Text style={styles.dangerText}>Geri alınamaz.</Text>
        </View>
      </GlassSurface>
      <GlassSettingsPanel>
        <SettingsSectionTitle>Neler etkilenecek</SettingsSectionTitle>
        <GlassSettingsRow
          icon="folder-outline"
          title="Projeler ve görseller"
          detail="Taslaklar, kaynaklar ve kayıtlı üretimler kaldırılır."
          accent="purple"
        />
        <GlassSettingsRow
          icon="flash-outline"
          title="Krediler"
          detail="Kullanılmamış bakiyene erişim sona erer."
        />
        <GlassSettingsRow
          icon="diamond-outline"
          title="Mağaza abonelikleri"
          detail="Varsa aboneliğini App Store veya Google Play üzerinden ayrıca yönet."
          accent="purple"
        />
        <GlassSettingsRow
          icon="person-outline"
          title="Hesap bilgileri"
          detail="Profil, oturumlar ve kişisel tercihler kaldırılır."
          last
        />
      </GlassSettingsPanel>
      <GlassSettingsPanel tone="gold">
        <SettingsSectionTitle>Güvenli doğrulama</SettingsSectionTitle>
        <GlassSettingsRow
          icon="lock-closed-outline"
          title="Hesabını yeniden doğrula"
          detail="Bu işlem için şifren veya bağlı Google hesabın gerekir."
          last
        />
        {preview.isPending ? (
          <Text style={styles.body}>Doğrulama seçenekleri yükleniyor…</Text>
        ) : null}
        {preview.isError ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void preview.refetch()}
            style={styles.retry}
          >
            <Text style={styles.goldText}>Seçenekler alınamadı · Yeniden dene</Text>
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
              placeholder="Şifreni gir"
              textContentType="password"
              accessibilityLabel="Hesap şifren"
              containerStyle={styles.passwordContainer}
              style={styles.password}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
              onPress={() => setVisible((value) => !value)}
              style={styles.eye}
            >
              <Icon name={visible ? 'eye-off-outline' : 'eye-outline'} size={21} />
            </Pressable>
          </View>
        ) : null}
        <Text style={styles.confirmLabel}>Onaylamak için aşağıya {CONFIRMATION} yaz.</Text>
        <TextField
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={CONFIRMATION}
          accessibilityLabel="Kalıcı silme onay metni"
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
          <Text style={styles.checkLabel}>
            Veri kaybını ve işlemin geri alınamayacağını anladım.
          </Text>
        </Pressable>
      </GlassSettingsPanel>
      <SettingsNote warning>
        Hesabına erişim hemen kapanır. Mevcut dosya bağlantılarının süresi dolması için en az 10
        dakika beklenir; ardından dosya temizliği otomatik yürütülür. Hoş geldin hakkının tekrar
        verilmesini önlemek için geri döndürülemeyen, anahtarlı kimlik özetleri saklanır.
      </SettingsNote>
      {preview.data && !preview.data.canVerifyGoogle && !preview.data.canVerifyPassword ? (
        <SettingsNote warning>
          Bu hesap için desteklenen bir yeniden doğrulama yöntemi bulunamadı. Yardım ve destek
          üzerinden bize ulaş.
        </SettingsNote>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {preview.data?.canVerifyGoogle ? (
        <GoogleSignInButton
          label="Google ile doğrula ve sil"
          forceReauthentication
          disabled={!canConfirm}
          onError={(cause) => setError(cause.message)}
          onSuccess={(googleIdToken) => submit({ googleIdToken })}
        />
      ) : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          disabled={busy}
          style={styles.action}
        >
          <GlassSurface radius={23} tone="neutral" contentStyle={styles.actionContent}>
            <Text style={styles.actionLabel}>Vazgeç</Text>
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
                {busy ? 'İşleniyor…' : 'Kalıcı sil'}
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
  goldText: { color: colors.accentYellow },
});
