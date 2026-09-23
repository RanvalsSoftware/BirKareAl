import validator from 'validator';
import { badRequest } from '@birkare/shared';

/** Product policy for NEW accounts only. Never apply this gate to account recovery. */
export const EMAIL_REGISTRATION_POLICY = 'known-providers-v1';
export const KNOWN_EMAIL_DOMAINS = Object.freeze([
  'gmail.com', 'googlemail.com',
  'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'yahoo.com', 'yahoo.co.uk',
  'icloud.com', 'me.com', 'mac.com',
  'yandex.com', 'yandex.ru',
  'proton.me', 'protonmail.com',
  'zoho.com', 'mail.ru', 'gmx.com', 'gmx.de', 'aol.com',
  // Sign in with Apple's Hide My Email is a supported identity, not disposable mail.
  'privaterelay.appleid.com',
] as const);
const knownDomains = new Set<string>(KNOWN_EMAIL_DOMAINS);
const typos: Readonly<Record<string, string>> = {
  'gmaill.com': 'gmail.com', 'gmial.com': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'outlok.com': 'outlook.com',
  'yaho.com': 'yahoo.com', 'yandexx.com': 'yandex.com',
  'icould.com': 'icloud.com',
};

export function registrationEmailDomain(rawEmail: string): string {
  const email = rawEmail.trim().toLowerCase();
  if (!validator.isEmail(email, { allow_utf8_local_part: false, require_tld: true })) {
    throw badRequest('INVALID_EMAIL', 'Geçerli bir e-posta adresi girin.');
  }
  const domain = email.slice(email.lastIndexOf('@') + 1);
  const suggestedDomain = typos[domain];
  if (suggestedDomain) {
    throw badRequest('EMAIL_DOMAIN_TYPO', `${suggestedDomain} yazmak istemiş olabilir misiniz?`, {
      suggestedDomain,
    });
  }
  return domain;
}

export function assertKnownRegistrationProvider(rawEmail: string, environment: string): void {
  const domain = registrationEmailDomain(rawEmail);
  // Reserved test fixtures are allowed ONLY in the server's test environment.
  // No development, staging or production environment can use this exception.
  if (environment === 'test' && domain.endsWith('.test')) return;
  if (!knownDomains.has(domain)) {
    throw badRequest(
      'EMAIL_PROVIDER_NOT_ALLOWED',
      'Yeni kayıt için Gmail, Outlook/Hotmail, Yandex, iCloud, Yahoo, Proton veya desteklenen diğer kalıcı e-posta sağlayıcılarından birini kullanın. Kurumsal ve özel alan adları yeni kayıtlarda desteklenmiyor.',
      { policy: EMAIL_REGISTRATION_POLICY, supportedDomains: [...KNOWN_EMAIL_DOMAINS] },
    );
  }
}
