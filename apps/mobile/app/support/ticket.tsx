import { useRef, useState } from 'react';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader, CategoryChip, Icon, Notice, PrimaryButton, Screen, TextField } from '@/components';
import { colors, spacing, typography } from '@/theme';
import { resolveSupportEmail } from '@/features/support/email';
import { RequireAuthenticated } from '@/features/auth/require-authenticated';
import { newSupportSubmissionKey, submitSupportTicket, supportTopics, validSupportInput, type SupportTicketInput, type SupportTicketReceipt } from '@/features/support/tickets';
import type { ApiError } from '@/api/client';

export default function SupportTicketScreen() {
  return <RequireAuthenticated><SupportTicketForm /></RequireAuthenticated>;
}

function SupportTicketForm() {
  const router = useRouter();
  const { generationId } = useLocalSearchParams<{ generationId?: string }>();
  const [category, setCategory] = useState<SupportTicketInput['category']>('GENERATION');
  const [subject, setSubject] = useState(generationId ? 'Görsel üretimi tamamlanmadı' : '');
  const [message, setMessage] = useState('');
  const [receipt, setReceipt] = useState<SupportTicketReceipt | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sendingRef = useRef(false);
  const attemptRef = useRef<{ fingerprint: string; key: string } | null>(null);
  const supportEmail = resolveSupportEmail(Constants.expoConfig?.extra);
  const input: SupportTicketInput = { category, subject, message, ...(generationId ? { generationId } : {}) };

  async function sendTicket() {
    if (sendingRef.current || !validSupportInput(input)) return;
    const fingerprint = JSON.stringify({ ...input, subject: subject.trim(), message: message.trim() });
    if (attemptRef.current?.fingerprint !== fingerprint) attemptRef.current = { fingerprint, key: newSupportSubmissionKey() };
    sendingRef.current = true;
    setSending(true);
    setError(null);
    try {
      const next = await submitSupportTicket(input, attemptRef.current.key);
      if (next.status === 'SENT') setReceipt(next);
      else setError(`Talep ${next.id} kaydedildi; e-postaya aktarımı henüz doğrulanmadı. Aynı talebi tekrar kontrol edebilirsin; ikinci e-posta gönderilmez.`);
    } catch (cause) {
      const failure = cause as ApiError;
      const details = failure?.details as { ticketId?: unknown } | undefined;
      const ticketId = typeof details?.ticketId === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(details.ticketId) ? details.ticketId : undefined;
      setError(`${failure instanceof Error ? failure.message : 'Talep gönderilemedi. Açıklaman bu ekranda korunur.'}${ticketId ? ` Talep: ${ticketId}` : ''}${failure?.requestId ? ` İstek: ${failure.requestId}` : ''}`);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  if (receipt)
    return (
      <Screen contentContainerStyle={styles.content}>
        <AppHeader back title="Destek talebi" />
        <View style={styles.success}>
          <View style={styles.successIcon}><Icon name="mail-open-outline" size={32} color={colors.background} /></View>
          <Text style={styles.successTitle}>Destek talebin kaydedildi.</Text>
          <Text style={styles.successText}>
            Talebin destek e-posta sunucusuna aktarıldı. Bu, gelen kutusuna teslim veya okunma onayı değildir. Yanıt için hesabındaki doğrulanmış e-posta adresini kullanacağız.
          </Text>
          <Text selectable style={styles.email}>Talep: {receipt.id}</Text>
          <Text selectable style={styles.email}>
            {supportEmail}
          </Text>
          <PrimaryButton
            label="Yeni talep oluştur"
            onPress={() => { setReceipt(null); setMessage(''); setSubject(''); setError(null); attemptRef.current = null; }}
            style={styles.successButton}
          />
          <PrimaryButton
            label="Yardıma dön"
            onPress={() => router.replace('/support' as never)}
            style={styles.successButton}
          />
        </View>
      </Screen>
    );
  return (
    <Screen contentContainerStyle={styles.content}>
      <AppHeader back title="Destek talebi" subtitle="Bize ne olduğunu anlat" />
      <Text style={styles.label}>Konu</Text>
      <View style={styles.chips}>
        {supportTopics.map((item) => (
          <CategoryChip
            key={item.category}
            label={item.label}
            selected={category === item.category}
            onPress={() => { if (!sendingRef.current) setCategory(item.category); }}
          />
        ))}
      </View>
      <TextField label="Kısa başlık" value={subject} onChangeText={setSubject} maxLength={120} editable={!sending} placeholder="Sorunu birkaç kelimeyle özetle" error={subject.length > 0 && subject.trim().length < 3 ? 'En az 3 karakterlik bir başlık yaz.' : undefined} />
      <TextField
        label="Açıklama"
        value={message}
        onChangeText={setMessage}
        maxLength={4000}
        editable={!sending}
        placeholder="Yaşadığın sorunu, varsa proje adını ve ne beklediğini yaz."
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        style={styles.message}
        error={
          message.length > 0 && message.trim().length < 12
            ? 'Lütfen en az 12 karakterlik bir açıklama yaz.'
            : undefined
        }
      />
      <Notice tone="neutral">
        Talebin hesabına bağlı olarak kaydedilir ve {supportEmail} adresine backend üzerinden iletilir. Şifre veya ödeme bilgisi ekleme.
      </Notice>
      {generationId ? <Notice tone="neutral">Bu üretimin hata kodu ve teknik istek numarası sunucudan eklenir. Fotoğrafın ve üretim promptun destek e-postasına eklenmez.</Notice> : null}
      {error ? (
        <Notice tone="warning" title="Gönderim durumunu kontrol et">
          {error} Açıklaman bu ekranda korunur.
        </Notice>
      ) : null}
      <Text selectable style={styles.email}>
        {supportEmail}
      </Text>
      <PrimaryButton
        label="Destek talebi gönder"
        icon="mail-outline"
        loading={sending}
        disabled={sending || !validSupportInput(input)}
        onPress={() => void sendTicket()}
        style={styles.send}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 42 },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: 9,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.xl },
  message: { minHeight: 148, paddingTop: 13, paddingBottom: 13 },
  send: { marginTop: spacing.xl },
  email: {
    ...typography.label,
    color: colors.accentYellow,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 70 },
  successIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { ...typography.h1, color: colors.textPrimary, marginTop: spacing.lg },
  successText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 7,
  },
  successButton: { alignSelf: 'stretch', marginTop: spacing.xl },
});
