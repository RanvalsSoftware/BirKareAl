import { useEffect, useState } from 'react';
import { Alert, Linking, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { AppleGlassButton, GlassSurface, Icon, Notice, TextField } from '@/components';
import { apiRequest } from '@/api/client';
import { useAuthStore, type AuthUser } from '@/features/auth/auth-store';
import { GoogleSignInButton } from '@/features/auth/google-sign-in';
import { useAppearanceStore } from '@/features/settings/appearance-store';
import { profileNameSchema, updateAccountProfile } from '@/features/settings/account-profile';
import {
  GlassSettingsHero,
  GlassSettingsPanel,
  GlassSettingsRow,
  SettingsNote,
  SettingsPage,
  SettingsSectionTitle,
} from '@/features/settings/components';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { colors } from '@/theme';

type Preferences = {
  pushEnabled: boolean;
  marketingEmail: boolean;
  keepSourcePhotos: boolean;
  reducedMotion: boolean;
  glassEffects: boolean;
};
type AccountResponse = {
  authProviders?: ('PASSWORD' | 'GOOGLE' | 'APPLE')[];
  preferences: Preferences;
};
type Message = { text: string; error?: boolean } | null;

function useFeedback() {
  const [message, setMessage] = useState<Message>(null);
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timeout);
  }, [message]);
  return {
    message,
    success: (text: string) => setMessage({ text }),
    error: (error: unknown) =>
      setMessage({
        text: error instanceof Error ? error.message : 'İşlem tamamlanamadı. Lütfen tekrar dene.',
        error: true,
      }),
  };
}

function Feedback({ message }: { message: Message }) {
  return message ? (
    <View accessibilityLiveRegion="polite">
      <Notice tone={message.error ? 'warning' : 'success'}>{message.text}</Notice>
    </View>
  ) : null;
}

function PreferenceSwitch({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Switch
      accessibilityLabel={label}
      value={value}
      disabled={disabled}
      onValueChange={onChange}
      thumbColor={value ? '#FFE59C' : '#AAA6AE'}
      trackColor={{ false: '#343139', true: '#75602B' }}
      ios_backgroundColor="#343139"
    />
  );
}

export default function SettingsSectionScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  if (section === 'notifications') return <Notifications />;
  if (section === 'privacy') return <Privacy />;
  if (section === 'security') return <Security />;
  if (section === 'history') return <History />;
  if (section === 'account') return <AccountProfile />;
  return <Appearance />;
}

function AccountProfile() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  // A keyed form prevents unsaved name fields from leaking to another account.
  return (
    <AccountProfileForm
      key={user?.id ?? 'anonymous'}
      initialFirstName={user?.firstName ?? ''}
      initialLastName={user?.lastName ?? ''}
      userId={user?.id}
      email={user?.email}
      onSaved={(updated) => {
        queryClient.setQueryData(
          ['me', updated.id],
          (previous: (Record<string, unknown> & { user: AuthUser }) | undefined) =>
            previous ? { ...previous, user: updated } : undefined,
        );
        void queryClient.invalidateQueries({ queryKey: ['me', updated.id] });
      }}
    />
  );
}

function AccountProfileForm({
  initialFirstName,
  initialLastName,
  userId,
  email,
  onSaved,
}: {
  initialFirstName: string;
  initialLastName: string;
  userId?: string;
  email?: string;
  onSaved: (user: AuthUser) => void;
}) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string }>({});
  const [saving, setSaving] = useState(false);
  const feedback = useFeedback();
  async function save() {
    if (saving || !userId) return;
    const parsed = profileNameSchema.safeParse({ firstName, lastName });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({ firstName: fieldErrors.firstName?.[0], lastName: fieldErrors.lastName?.[0] });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const updated = await updateAccountProfile({ firstName, lastName }, userId);
      setFirstName(updated.firstName ?? '');
      setLastName(updated.lastName ?? '');
      onSaved(updated);
      feedback.success('Profilin başarıyla güncellendi.');
    } catch (error) {
      feedback.error(error);
    } finally {
      setSaving(false);
    }
  }
  return (
    <SettingsPage title="Profili düzenle" subtitle="Hesabındaki adını güncelle">
      <GlassSettingsHero
        icon="person-outline"
        title="Senin profilin."
        description="Kaydettiğin ad, profilinde ve ana sayfa karşılamasında kullanılır."
      />
      <GlassSettingsPanel>
        <View style={styles.nameForm}>
          <TextField
            label="Adın"
            value={firstName}
            onChangeText={(value) => {
              setFirstName(value);
              setErrors((previous) => ({ ...previous, firstName: undefined }));
            }}
            placeholder="Adını gir"
            autoCapitalize="words"
            autoComplete="given-name"
            maxLength={80}
            editable={!saving}
            error={errors.firstName}
          />
          <TextField
            label="Soyadın (isteğe bağlı)"
            value={lastName}
            onChangeText={(value) => {
              setLastName(value);
              setErrors((previous) => ({ ...previous, lastName: undefined }));
            }}
            placeholder="Soyadını gir"
            autoCapitalize="words"
            autoComplete="family-name"
            maxLength={80}
            editable={!saving}
            error={errors.lastName}
          />
        </View>
        <GlassSettingsRow
          icon="mail-outline"
          title="E-posta"
          detail={email ?? 'Oturum bilgisi yok'}
          last
        />
      </GlassSettingsPanel>
      <SettingsNote>
        Bu işlem yalnızca ad ve soyadını değiştirir. Giriş e-postan, kredilerin ve projelerin
        korunur.
      </SettingsNote>
      <Feedback message={feedback.message} />
      <AppleGlassButton
        label="Değişiklikleri kaydet"
        icon="checkmark"
        loading={saving}
        disabled={!userId}
        onPress={save}
      />
    </SettingsPage>
  );
}

function Appearance() {
  const appearance = useAppearanceStore();
  const reducedMotion = useReducedMotion();
  const feedback = useFeedback();
  const [saving, setSaving] = useState(false);
  async function update(kind: 'glass' | 'motion', value: boolean) {
    if (saving) return;
    setSaving(true);
    try {
      await (kind === 'glass'
        ? appearance.setGlassEffects(value)
        : appearance.setReducedMotion(value));
      feedback.success('Görünüm tercihin kaydedildi.');
    } catch (error) {
      feedback.error(error);
    } finally {
      setSaving(false);
    }
  }
  return (
    <SettingsPage title="Görünüm" subtitle="BirKare’yi kendine göre ayarla">
      <GlassSettingsHero
        icon="color-palette-outline"
        title="Işığı görseline bırak."
        description="Fotoğraflarını öne çıkaran siyah arka plan ve yumuşak cam yansımaları."
        tone="iridescent"
      />
      <SettingsSectionTitle>EFEKTLER VE ERİŞİLEBİLİRLİK</SettingsSectionTitle>
      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="layers-outline"
          title="Cam efektleri"
          detail="Bulanıklık, yansıma ve yumuşak ışık"
          trailing={
            <PreferenceSwitch
              label="Cam efektleri"
              value={appearance.glassEffects}
              disabled={saving || !appearance.hydrated}
              onChange={(value) => {
                void update('glass', value);
              }}
            />
          }
        />
        <GlassSettingsRow
          icon="accessibility-outline"
          accent="purple"
          title="Animasyonu azalt"
          detail="Dekoratif hareketleri ve basma animasyonunu azalt"
          trailing={
            <PreferenceSwitch
              label="Animasyonu azalt"
              value={appearance.reducedMotion}
              disabled={saving || !appearance.hydrated}
              onChange={(value) => {
                void update('motion', value);
              }}
            />
          }
        />
      </GlassSettingsPanel>
      <Feedback message={feedback.message} />
      <SettingsNote>
        {reducedMotion
          ? 'Animasyon azaltma şu anda etkin. Sistem erişilebilirlik tercihi her zaman önceliklidir.'
          : 'Sistemin Hareketi Azalt ve Saydamlığı Azalt tercihleri her zaman korunur.'}
      </SettingsNote>
    </SettingsPage>
  );
}

function Notifications() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['settings-preferences', userId],
    queryFn: () => apiRequest<AccountResponse>('/v1/me'),
    enabled: Boolean(userId),
  });
  const [saving, setSaving] = useState(false);
  const feedback = useFeedback();
  async function update(patch: Partial<Preferences>) {
    setSaving(true);
    try {
      const result = await apiRequest<AccountResponse>('/v1/me/preferences', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      queryClient.setQueryData(['settings-preferences', userId], result);
      feedback.success('İletişim tercihin hesabına kaydedildi.');
    } catch (error) {
      feedback.error(error);
    } finally {
      setSaving(false);
    }
  }
  return (
    <SettingsPage title="Bildirimler" subtitle="İletişim tercihlerin senin elinde">
      <GlassSettingsHero
        icon="notifications-outline"
        title="Yalnızca istediklerin."
        description="Tercihlerin hesabında saklanır; cihaz izinleri ayrıca yönetilir."
      />
      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="sparkles-outline"
          title="Üretim bildirimleri"
          detail="Sonuç hazır olduğunda bildirim alma tercihi"
          trailing={
            <PreferenceSwitch
              label="Üretim bildirimi tercihi"
              value={data?.preferences.pushEnabled ?? false}
              disabled={saving || isLoading || isError}
              onChange={(pushEnabled) => {
                void update({ pushEnabled });
              }}
            />
          }
        />
        <GlassSettingsRow
          icon="mail-outline"
          accent="purple"
          title="Kampanya e-postaları"
          detail="Kredi ve ürün haberleri için iletişim izni"
          trailing={
            <PreferenceSwitch
              label="Kampanya e-posta izni"
              value={data?.preferences.marketingEmail ?? false}
              disabled={saving || isLoading || isError}
              onChange={(marketingEmail) => {
                void update({ marketingEmail });
              }}
            />
          }
        />
        <GlassSettingsRow
          icon="phone-portrait-outline"
          title="Cihaz izinlerini aç"
          onPress={() => {
            void Linking.openSettings().catch(feedback.error);
          }}
          last
        />
      </GlassSettingsPanel>
      {isError ? (
        <SettingsNote warning>
          Hesap tercihlerin alınamadı. İnternet bağlantını kontrol edip yeniden aç.
        </SettingsNote>
      ) : null}
      <Feedback message={feedback.message} />
      <SettingsNote>
        Bu sürümde cihazlara anlık bildirim gönderimi henüz etkin değil. Tercihlerini
        kaydedebilirsin; gönderim sistemi etkinleşmeden bildirim ulaşmaz.
      </SettingsNote>
    </SettingsPage>
  );
}

function Privacy() {
  const router = useRouter();
  const feedback = useFeedback();
  const [exporting, setExporting] = useState(false);
  async function exportData() {
    setExporting(true);
    try {
      const response = await apiRequest<{ export: unknown }>('/v1/me/data-export');
      await Share.share({
        title: 'BirKare hesap verilerim',
        message: JSON.stringify(response.export, null, 2),
      });
    } catch (error) {
      feedback.error(error);
    } finally {
      setExporting(false);
    }
  }
  return (
    <SettingsPage title="Gizlilik ve verilerim" subtitle="Hesabın ve görsellerin üzerinde kontrol">
      <GlassSettingsHero
        icon="lock-closed-outline"
        title="Kontrol sende."
        description="Hesap verilerini görüntüle, güvenliğini yönet veya silme sürecini başlat."
      />
      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="images-outline"
          title="Kaynak fotoğrafları"
          detail="Saklama seçimini her üretimin kaynak ekranında ayrı yönetebilirsin."
        />
        <GlassSettingsRow
          icon="download-outline"
          accent="purple"
          title={exporting ? 'Veriler hazırlanıyor…' : 'Verilerimi dışa aktar'}
          detail="Hesap, kredi hareketleri ve proje bilgileri (JSON)"
          disabled={exporting}
          onPress={() => {
            void exportData();
          }}
        />
        <GlassSettingsRow
          icon="shield-checkmark-outline"
          title="Güvenlik ve oturumlar"
          onPress={() => router.push('/settings/security' as never)}
        />
        <GlassSettingsRow
          icon="document-text-outline"
          accent="purple"
          title="Gizlilik politikası"
          onPress={() => router.push('/legal/privacy' as never)}
          last
        />
      </GlassSettingsPanel>
      <SettingsNote>
        Dışa aktarma şu an hesap bilgilerini, kredi hareketlerini ve en fazla 50 projeyi içerir.
        Görsel dosyaları dahil değildir; görsellerini Projeler bölümünden kaydedebilirsin.
      </SettingsNote>
      <GlassSettingsPanel tone="neutral">
        <GlassSettingsRow
          icon="trash-outline"
          title="Hesabı sil"
          detail="Kapsamı incele ve hesabın için silme talebi oluştur"
          danger
          last
          onPress={() => router.push('/settings/delete-account' as never)}
        />
      </GlassSettingsPanel>
      <Feedback message={feedback.message} />
    </SettingsPage>
  );
}

type Session = {
  id: string;
  deviceName: string | null;
  platform: string | null;
  lastUsedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  current: boolean;
};

function Security() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const signOut = useAuthStore((state) => state.signOut);
  const query = useQuery({
    queryKey: ['account-sessions', userId],
    queryFn: () => apiRequest<{ items: Session[] }>('/v1/auth/sessions'),
    enabled: Boolean(userId),
  });
  const accountQuery = useQuery({
    queryKey: ['account-security', userId],
    queryFn: () => apiRequest<AccountResponse>('/v1/me'),
    enabled: Boolean(userId),
  });
  const feedback = useFeedback();
  const [working, setWorking] = useState(false);
  const active =
    query.data?.items.filter(
      (session) =>
        !session.revokedAt && new Date(session.expiresAt).getTime() > query.dataUpdatedAt,
    ) ?? [];
  const googleLinked = accountQuery.data?.authProviders?.includes('GOOGLE') === true;
  async function revoke(id: string) {
    setWorking(true);
    try {
      await apiRequest(`/v1/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await query.refetch();
      feedback.success('Seçilen oturum kapatıldı.');
    } catch (error) {
      feedback.error(error);
    } finally {
      setWorking(false);
    }
  }
  async function logoutAll() {
    setWorking(true);
    try {
      await apiRequest('/v1/auth/logout-all', { method: 'POST' });
      await signOut();
      queryClient.clear();
      router.replace('/(auth)/login' as never);
    } catch (error) {
      feedback.error(error);
    } finally {
      setWorking(false);
    }
  }
  return (
    <SettingsPage title="Güvenlik" subtitle="Hesabına erişimi yönet">
      <GlassSettingsHero
        icon="shield-checkmark-outline"
        title="Hesabın güvende kalsın."
        description="Giriş yöntemlerini bağla ve sunucuda kayıtlı oturumlarını kontrol et."
      />
      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="key-outline"
          title="Şifremi yenile"
          detail="E-posta ile güvenli yenileme bağlantısı al"
          onPress={() => router.push('/(auth)/forgot-password' as never)}
          last
        />
      </GlassSettingsPanel>
      <SettingsSectionTitle>GOOGLE İLE GİRİŞ</SettingsSectionTitle>
      <View style={styles.googleButton}>
        {googleLinked ? (
          <GlassSettingsPanel tone="neutral">
            <GlassSettingsRow
              icon="checkmark-circle"
              title="Google hesabı bağlı"
              detail="Bu giriş yöntemi hesabında etkin"
              value="Bağlı"
              last
            />
          </GlassSettingsPanel>
        ) : (
          <GoogleSignInButton
            label={accountQuery.isLoading ? 'Bağlantı kontrol ediliyor…' : 'Google hesabını bağla'}
            disabled={working || accountQuery.isLoading}
            onSuccess={async (token) => {
              await useAuthStore.getState().linkGoogleAccount(token);
              await accountQuery.refetch();
              feedback.success('Google hesabın başarıyla bağlandı.');
            }}
            onError={feedback.error}
          />
        )}
      </View>
      <Text style={styles.helper}>
        {googleLinked
          ? 'Google hesabın doğrulandı; sonraki girişlerinde bu yöntemi kullanabilirsin.'
          : 'Mevcut hesabınla aynı e-posta adresine sahip Google hesabını doğrulayarak sonraki girişlerinde kullanabilirsin.'}
      </Text>
      <SettingsSectionTitle>AKTİF OTURUMLAR</SettingsSectionTitle>
      <GlassSettingsPanel>
        {query.isLoading ? (
          <GlassSettingsRow icon="time-outline" title="Oturumlar yükleniyor…" last />
        ) : active.length ? (
          active.map((session, index) => (
            <GlassSettingsRow
              key={session.id}
              icon="phone-portrait-outline"
              title={session.deviceName || session.platform || 'Kayıtlı cihaz'}
              detail={`${session.current ? 'Bu oturum · ' : ''}Son kullanım: ${new Date(session.lastUsedAt).toLocaleDateString('tr-TR')}`}
              value={session.current ? 'Aktif' : 'Kapat'}
              last={index === active.length - 1}
              disabled={working}
              onPress={
                session.current
                  ? undefined
                  : () =>
                      Alert.alert(
                        'Oturumu kapat',
                        'Seçilen cihazın yeniden giriş yapması gerekecek.',
                        [
                          { text: 'Vazgeç', style: 'cancel' },
                          {
                            text: 'Kapat',
                            style: 'destructive',
                            onPress: () => {
                              void revoke(session.id);
                            },
                          },
                        ],
                      )
              }
            />
          ))
        ) : (
          <GlassSettingsRow
            icon="information-circle-outline"
            title={query.isError ? 'Oturumlar alınamadı' : 'Aktif oturum bulunamadı'}
            detail={query.isError ? 'Yeniden denemek için dokun' : undefined}
            onPress={
              query.isError
                ? () => {
                    void query.refetch();
                  }
                : undefined
            }
            last
          />
        )}
      </GlassSettingsPanel>
      <GlassSettingsPanel tone="neutral">
        <GlassSettingsRow
          icon="log-out-outline"
          title="Tüm cihazlardan çıkış yap"
          detail="Bu cihaz dahil tüm kayıtlı oturumlar kapanır"
          danger
          disabled={working}
          last
          onPress={() =>
            Alert.alert(
              'Tüm oturumları kapat',
              'Bu cihaz dahil tüm cihazlarda yeniden giriş yapman gerekecek.',
              [
                { text: 'Vazgeç', style: 'cancel' },
                {
                  text: 'Çıkış yap',
                  style: 'destructive',
                  onPress: () => {
                    void logoutAll();
                  },
                },
              ],
            )
          }
        />
      </GlassSettingsPanel>
      <Feedback message={feedback.message} />
    </SettingsPage>
  );
}

type Transaction = {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
  availableAfter: number | null;
};
const transactionLabels: Record<string, string> = {
  PURCHASE: 'Kredi satın alımı',
  SUBSCRIPTION_GRANT: 'Üyelik kredisi',
  GENERATION_RESERVATION: 'Üretim için ayrıldı',
  GENERATION_CAPTURE: 'Görsel üretimi',
  GENERATION_RELEASE: 'Ayrılan kredi serbest bırakıldı',
  REFUND: 'Kredi iadesi',
  BONUS: 'Hediye kredi',
  ADMIN_ADJUSTMENT: 'Bakiye düzenlemesi',
  CHARGEBACK: 'Ödeme iptali',
};

function History() {
  const userId = useAuthStore((state) => state.user?.id);
  const query = useQuery({
    queryKey: ['credit-history', userId],
    queryFn: () => apiRequest<{ items: Transaction[] }>('/v1/billing/transactions'),
    enabled: Boolean(userId),
  });
  return (
    <SettingsPage title="İşlem geçmişi" subtitle="Hesabına ait kredi hareketleri">
      <SettingsNote>
        Bu liste sunucu kayıtlarından gelir. Rezervasyon, harcama ve iade ayrı işlemlerdir;
        rezervasyon ikinci kez ücretlendirme değildir.
      </SettingsNote>
      <GlassSettingsPanel>
        {query.data?.items.length ? (
          query.data.items.map((item, index) => (
            <GlassSettingsRow
              key={item.id}
              icon={item.type === 'BONUS' ? 'gift-outline' : 'receipt-outline'}
              title={transactionLabels[item.type] ?? 'Kredi hareketi'}
              detail={`${new Date(item.createdAt).toLocaleDateString('tr-TR')} · ${item.status === 'COMPLETED' ? 'Tamamlandı' : item.status === 'PENDING' ? 'Bekliyor' : item.status === 'REVERSED' ? 'Geri alındı' : 'Başarısız'}`}
              value={`${item.amount > 0 ? '+' : ''}${item.amount}`}
              last={index === query.data.items.length - 1}
            />
          ))
        ) : (
          <GlassSettingsRow
            icon="receipt-outline"
            title={
              query.isLoading
                ? 'Hareketler yükleniyor…'
                : query.isError
                  ? 'Hareketler alınamadı'
                  : 'Henüz kredi hareketi yok'
            }
            onPress={
              query.isError
                ? () => {
                    void query.refetch();
                  }
                : undefined
            }
            last
          />
        )}
      </GlassSettingsPanel>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  nameForm: { paddingVertical: 17, gap: 19 },
  googleButton: { marginBottom: 9 },
  helper: { color: '#99949F', fontSize: 12, lineHeight: 19, marginBottom: 12 },
});
