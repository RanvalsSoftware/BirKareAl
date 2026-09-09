import { DEFAULT_SUPPORT_EMAIL } from '../../../config/public-env.cjs';

function isEmail(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 254 &&
    /^[^\s@<>?&#]+@[^\s@<>?&#]+\.[^\s@<>?&#]+$/.test(value)
  );
}

export function resolveSupportEmail(extra?: { supportEmail?: unknown } | null): string {
  const email = typeof extra?.supportEmail === 'string' ? extra.supportEmail.trim() : undefined;
  return isEmail(email) ? email : DEFAULT_SUPPORT_EMAIL;
}

/** Opens only a user-controlled email draft; this is not a server-side ticket submission. */
export function createSupportEmailDraft(email: string, topic: string, message: string): string {
  if (!isEmail(email)) throw new Error('Geçerli bir destek e-posta adresi gerekli.');
  const subject = `BirKare AI · ${topic.replace(/[\r\n]+/g, ' ').trim()}`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message.trim())}`;
}
