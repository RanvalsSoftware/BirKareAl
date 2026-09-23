/** Anonymous mail endpoints intentionally do not disclose whether an account exists. */
export const EMAIL_REQUEST_NOTICE =
  'Talebin alındı. Uygun bir hesap varsa e-posta gönderimi denenir. Gelen kutunu ve spam klasörünü kontrol et; bu mesaj teslim edildiği anlamına gelmez.';

export function authMailToken(value: unknown): string {
  return typeof value === 'string' && value.trim().length <= 512 ? value.trim() : '';
}

export function emailVerificationCode(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\D/g, '').slice(0, 6) : '';
}

export function verificationRecoveryParams(error: unknown, email: string) {
  if (
    !error ||
    typeof error !== 'object' ||
    !('code' in error) ||
    error.code !== 'AUTH_VERIFICATION_DELIVERY_FAILED'
  )
    return null;
  return { email: email.trim().toLowerCase(), delivery: 'failed' } as const;
}
