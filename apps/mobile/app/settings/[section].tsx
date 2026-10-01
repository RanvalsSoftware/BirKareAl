import { useLanguageRevision } from '@/i18n/use-language';
import { getLocale as getAppLocale } from '@/i18n/engine';
import { tr as translateCopy } from '@/i18n/engine';
import { useEffect, useState } from 'react';
import { Alert, Linking, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { AppleGlassButton, Notice, TextField } from '@/components';
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
        text: error instanceof Error ? error.message : translateCopy("İşlem tamamlanamadı. Lütfen tekrar dene."),
        error: true,
      }),
  };
}

function Feedback({ message }: { message: Message }) {
  const languageRevision = useLanguageRevision();

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
  const languageRevision = useLanguageRevision();

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
  const languageRevision = useLanguageRevision();

  const { section } = useLocalSearchParams<{ section: string }>();
  if (section === 'notifications') return <Notifications />;
  if (section === 'privacy') return <Privacy />;
  if (section === 'security') return <Security />;
  if (section === 'history') return <History />;
  if (section === 'account') return <AccountProfile />;
  return <Appearance />;
}

function AccountProfile() {
  const languageRevision = useLanguageRevision();

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
  const languageRevision = useLanguageRevision();

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
      feedback.success(translateCopy("Profilin başarıyla güncellendi."));
    } catch (error) {
      feedback.error(error);
    } finally {
      setSaving(false);
    }
  }
  return (
    <SettingsPage title={translateCopy("Profili düzenle")} subtitle={translateCopy("Hesabındaki adını güncelle")}>
      <GlassSettingsHero
        icon="person-outline"
        title={translateCopy("Senin profilin.")}
        description={translateCopy("Kaydettiğin ad, profilinde ve ana sayfa karşılamasında kullanılır.")}
      />
      <GlassSettingsPanel>
        <View style={styles.nameForm}>
          <TextField
            label={translateCopy("Adın")}
            value={firstName}
            onChangeText={(value) => {
              setFirstName(value);
              setErrors((previous) => ({ ...previous, firstName: undefined }));
            }}
            placeholder={translateCopy("Adını gir")}
            autoCapitalize="words"
            autoComplete="given-name"
            maxLength={80}
            editable={!saving}
            error={errors.firstName}
          />
          <TextField
            label={translateCopy("Soyadın (isteğe bağlı)")}
            value={lastName}
            onChangeText={(value) => {
              setLastName(value);
              setErrors((previous) => ({ ...previous, lastName: undefined }));
            }}
            placeholder={translateCopy("Soyadını gir")}
            autoCapitalize="words"
            autoComplete="family-name"
            maxLength={80}
            editable={!saving}
            error={errors.lastName}
          />
        </View>
        <GlassSettingsRow
          icon="mail-outline"
          title={translateCopy("E-posta")}
          detail={email ?? translateCopy("Oturum bilgisi yok")}
          last
        />
      </GlassSettingsPanel>
      <SettingsNote>{translateCopy("Bu işlem yalnızca ad ve soyadını değiştirir. Giriş e-postan, kredilerin ve projelerin korunur.")}</SettingsNote>
      <Feedback message={feedback.message} />
      <AppleGlassButton
        label={translateCopy("Değişiklikleri kaydet")}
        icon="checkmark"
        loading={saving}
        disabled={!userId}
        onPress={save}
      />
    </SettingsPage>
  );
}

function Appearance() {
  const languageRevision = useLanguageRevision();

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
      feedback.success(translateCopy("Görünüm tercihin kaydedildi."));
    } catch (error) {
      feedback.error(error);
    } finally {
      setSaving(false);
    }
  }
  return (
    <SettingsPage title={translateCopy("Görünüm")} subtitle={translateCopy("BirKare’yi kendine göre ayarla")}>
      <GlassSettingsHero
        icon="color-palette-outline"
        title={translateCopy("Işığı görseline bırak.")}
        description={translateCopy("Fotoğraflarını öne çıkaran siyah arka plan ve yumuşak cam yansımaları.")}
        tone="iridescent"
      />
      <SettingsSectionTitle>{translateCopy("EFEKTLER VE ERİŞİLEBİLİRLİK")}</SettingsSectionTitle>
      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="layers-outline"
          title={translateCopy("Cam efektleri")}
          detail={translateCopy("Bulanıklık, yansıma ve yumuşak ışık")}
          trailing={
            <PreferenceSwitch
              label={translateCopy("Cam efektleri")}
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
          title={translateCopy("Animasyonu azalt")}
          detail={translateCopy("Dekoratif hareketleri ve basma animasyonunu azalt")}
          trailing={
            <PreferenceSwitch
              label={translateCopy("Animasyonu azalt")}
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
          ? translateCopy("Animasyon azaltma şu anda etkin. Sistem erişilebilirlik tercihi her zaman önceliklidir.")
          : translateCopy("Sistemin Hareketi Azalt ve Saydamlığı Azalt tercihleri her zaman korunur.")}
      </SettingsNote>
    </SettingsPage>
  );
}

function Notifications() {
  const languageRevision = useLanguageRevision();

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
      feedback.success(translateCopy("İletişim tercihin hesabına kaydedildi."));
    } catch (error) {
      feedback.error(error);
    } finally {
      setSaving(false);
    }
  }
  return (
    <SettingsPage title={translateCopy("Bildirimler")} subtitle={translateCopy("İletişim tercihlerin senin elinde")}>
      <GlassSettingsHero
        icon="notifications-outline"
        title={translateCopy("Yalnızca istediklerin.")}
        description={translateCopy("Tercihlerin hesabında saklanır; cihaz izinleri ayrıca yönetilir.")}
      />
      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="sparkles-outline"
          title={translateCopy("Üretim bildirimleri")}
          detail={translateCopy("Sonuç hazır olduğunda bildirim alma tercihi")}
          trailing={
            <PreferenceSwitch
              label={translateCopy("Üretim bildirimi tercihi")}
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
          title={translateCopy("Kampanya e-postaları")}
          detail={translateCopy("Kredi ve ürün haberleri için iletişim izni")}
          trailing={
            <PreferenceSwitch
              label={translateCopy("Kampanya e-posta izni")}
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
          title={translateCopy("Cihaz izinlerini aç")}
          onPress={() => {
            void Linking.openSettings().catch(feedback.error);
          }}
          last
        />
      </GlassSettingsPanel>
      {isError ? (
        <SettingsNote warning>{translateCopy("Hesap tercihlerin alınamadı. İnternet bağlantını kontrol edip yeniden aç.")}</SettingsNote>
      ) : null}
      <Feedback message={feedback.message} />
      <SettingsNote>{translateCopy("Bu sürümde cihazlara anlık bildirim gönderimi henüz etkin değil. Tercihlerini kaydedebilirsin; gönderim sistemi etkinleşmeden bildirim ulaşmaz.")}</SettingsNote>
    </SettingsPage>
  );
}

function Privacy() {
  const languageRevision = useLanguageRevision();

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
    <SettingsPage title={translateCopy("Gizlilik ve verilerim")} subtitle={translateCopy("Hesabın ve görsellerin üzerinde kontrol")}>
      <GlassSettingsHero
        icon="lock-closed-outline"
        title={translateCopy("Kontrol sende.")}
        description={translateCopy("Hesap verilerini görüntüle, güvenliğini yönet veya silme sürecini başlat.")}
      />
      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="images-outline"
          title={translateCopy("Kaynak fotoğrafları")}
          detail={translateCopy("Saklama seçimini her üretimin kaynak ekranında ayrı yönetebilirsin.")}
        />
        <GlassSettingsRow
          icon="download-outline"
          accent="purple"
          title={exporting ? translateCopy("Veriler hazırlanıyor…") : translateCopy("Verilerimi dışa aktar")}
          detail={translateCopy("Hesap, kredi hareketleri ve proje bilgileri (JSON)")}
          disabled={exporting}
          onPress={() => {
            void exportData();
          }}
        />
        <GlassSettingsRow
          icon="shield-checkmark-outline"
          title={translateCopy("Güvenlik ve oturumlar")}
          onPress={() => router.push('/settings/security' as never)}
        />
        <GlassSettingsRow
          icon="document-text-outline"
          accent="purple"
          title={translateCopy("Gizlilik politikası")}
          onPress={() => router.push('/legal/privacy' as never)}
          last
        />
      </GlassSettingsPanel>
      <SettingsNote>{translateCopy("Dışa aktarma şu an hesap bilgilerini, kredi hareketlerini ve en fazla 50 projeyi içerir. Görsel dosyaları dahil değildir; görsellerini Projeler bölümünden kaydedebilirsin.")}</SettingsNote>
      <GlassSettingsPanel tone="neutral">
        <GlassSettingsRow
          icon="trash-outline"
          title={translateCopy("Hesabı sil")}
          detail={translateCopy("Kapsamı incele ve hesabın için silme talebi oluştur")}
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
  const languageRevision = useLanguageRevision();

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
      feedback.success(translateCopy("Seçilen oturum kapatıldı."));
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
    <SettingsPage title={translateCopy("Güvenlik")} subtitle={translateCopy("Hesabına erişimi yönet")}>
      <GlassSettingsHero
        icon="shield-checkmark-outline"
        title={translateCopy("Hesabın güvende kalsın.")}
        description={translateCopy("Giriş yöntemlerini bağla ve sunucuda kayıtlı oturumlarını kontrol et.")}
      />
      <GlassSettingsPanel>
        <GlassSettingsRow
          icon="key-outline"
          title={translateCopy("Şifremi yenile")}
          detail={translateCopy("E-posta ile güvenli yenileme bağlantısı al")}
          onPress={() => router.push('/(auth)/forgot-password' as never)}
          last
        />
      </GlassSettingsPanel>
      <SettingsSectionTitle>{translateCopy("GOOGLE İLE GİRİŞ")}</SettingsSectionTitle>
      <View style={styles.googleButton}>
        {googleLinked ? (
          <GlassSettingsPanel tone="neutral">
            <GlassSettingsRow
              icon="checkmark-circle"
              title={translateCopy("Google hesabı bağlı")}
              detail={translateCopy("Bu giriş yöntemi hesabında etkin")}
              value={translateCopy('Bağlı')}
              last
            />
          </GlassSettingsPanel>
        ) : (
          <GoogleSignInButton
            label={accountQuery.isLoading ? translateCopy("Bağlantı kontrol ediliyor…") : translateCopy("Google hesabını bağla")}
            disabled={working || accountQuery.isLoading}
            onSuccess={async (token) => {
              await useAuthStore.getState().linkGoogleAccount(token);
              await accountQuery.refetch();
              feedback.success(translateCopy("Google hesabın başarıyla bağlandı."));
            }}
            onError={feedback.error}
          />
        )}
      </View>
      <Text style={styles.helper}>
        {googleLinked
          ? translateCopy("Google hesabın doğrulandı; sonraki girişlerinde bu yöntemi kullanabilirsin.")
          : translateCopy("Mevcut hesabınla aynı e-posta adresine sahip Google hesabını doğrulayarak sonraki girişlerinde kullanabilirsin.")}
      </Text>
      <SettingsSectionTitle>{translateCopy("AKTİF OTURUMLAR")}</SettingsSectionTitle>
      <GlassSettingsPanel>
        {query.isLoading ? (
          <GlassSettingsRow icon="time-outline" title={translateCopy("Oturumlar yükleniyor…")} last />
        ) : active.length ? (
          active.map((session, index) => (
            <GlassSettingsRow
              key={session.id}
              icon="phone-portrait-outline"
              title={session.deviceName || session.platform || translateCopy("Kayıtlı cihaz")}
              detail={translateCopy("{{p0}}Son kullanım: {{p1}}", { p0: session.current ? `${translateCopy('Bu oturum')} · ` : '', p1: new Date(session.lastUsedAt).toLocaleDateString(getAppLocale()) })}
              value={translateCopy(session.current ? 'Aktif' : 'Kapat')}
              last={index === active.length - 1}
              disabled={working}
              onPress={
                session.current
                  ? undefined
                  : () =>
                      Alert.alert(
                        translateCopy("Oturumu kapat"),
                        translateCopy("Seçilen cihazın yeniden giriş yapması gerekecek."),
                        [
                          { text: translateCopy("Vazgeç"), style: 'cancel' },
                          {
                            text: translateCopy("Kapat"),
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
            title={query.isError ? translateCopy("Oturumlar alınamadı") : translateCopy("Aktif oturum bulunamadı")}
            detail={query.isError ? translateCopy("Yeniden denemek için dokun") : undefined}
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
          title={translateCopy("Tüm cihazlardan çıkış yap")}
          detail={translateCopy("Bu cihaz dahil tüm kayıtlı oturumlar kapanır")}
          danger
          disabled={working}
          last
          onPress={() =>
            Alert.alert(
              translateCopy("Tüm oturumları kapat"),
              translateCopy("Bu cihaz dahil tüm cihazlarda yeniden giriş yapman gerekecek."),
              [
                { text: translateCopy("Vazgeç"), style: 'cancel' },
                {
                  text: translateCopy("Çıkış yap"),
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
  get PURCHASE() { return translateCopy("Kredi satın alımı"); },
  get SUBSCRIPTION_GRANT() { return translateCopy("Üyelik kredisi"); },
  get GENERATION_RESERVATION() { return translateCopy("Üretim için ayrıldı"); },
  get GENERATION_CAPTURE() { return translateCopy("Görsel üretimi"); },
  get GENERATION_RELEASE() { return translateCopy("Ayrılan kredi serbest bırakıldı"); },
  get REFUND() { return translateCopy("Kredi iadesi"); },
  get BONUS() { return translateCopy('Hediye kredi'); },
  get ADMIN_ADJUSTMENT() { return translateCopy("Bakiye düzenlemesi"); },
  get CHARGEBACK() { return translateCopy("Ödeme iptali"); },
};

function History() {
  const languageRevision = useLanguageRevision();

  const userId = useAuthStore((state) => state.user?.id);
  const query = useQuery({
    queryKey: ['credit-history', userId],
    queryFn: () => apiRequest<{ items: Transaction[] }>('/v1/billing/transactions'),
    enabled: Boolean(userId),
  });
  return (
    <SettingsPage title={translateCopy("İşlem geçmişi")} subtitle={translateCopy("Hesabına ait kredi hareketleri")}>
      <SettingsNote>{translateCopy("Bu liste sunucu kayıtlarından gelir. Rezervasyon, harcama ve iade ayrı işlemlerdir; rezervasyon ikinci kez ücretlendirme değildir.")}</SettingsNote>
      <GlassSettingsPanel>
        {query.data?.items.length ? (
          query.data.items.map((item, index) => (
            <GlassSettingsRow
              key={item.id}
              icon={item.type === 'BONUS' ? 'gift-outline' : 'receipt-outline'}
              title={transactionLabels[item.type] ?? translateCopy("Kredi hareketi")}
              detail={`${new Date(item.createdAt).toLocaleDateString(getAppLocale())} · ${item.status === 'COMPLETED' ? translateCopy("Tamamlandı") : item.status === 'PENDING' ? translateCopy("Bekliyor") : item.status === 'REVERSED' ? translateCopy("Geri alındı") : translateCopy("Başarısız")}`}
              value={`${item.amount > 0 ? '+' : ''}${item.amount}`}
              last={index === query.data.items.length - 1}
            />
          ))
        ) : (
          <GlassSettingsRow
            icon="receipt-outline"
            title={
              query.isLoading
                ? translateCopy("Hareketler yükleniyor…")
                : query.isError
                  ? translateCopy("Hareketler alınamadı")
                  : translateCopy("Henüz kredi hareketi yok")
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
