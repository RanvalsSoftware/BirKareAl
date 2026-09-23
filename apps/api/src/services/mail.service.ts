import nodemailer from 'nodemailer';
import type { BirKareConfig } from '@birkare/config';
import type { Logger } from '@birkare/logger';
import { ApiError } from '@birkare/shared';
import { z } from 'zod';

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export interface MailService {
  readonly enabled: boolean;
  /** Resolves only after SMTP accepts the intended recipient; not an inbox receipt. */
  send(message: MailMessage): Promise<void>;
}

type MailConfig = Pick<
  BirKareConfig,
  | 'MAIL_DRIVER'
  | 'SMTP_HOST'
  | 'SMTP_PORT'
  | 'SMTP_SECURE'
  | 'SMTP_USER'
  | 'SMTP_PASSWORD'
  | 'MAIL_FROM_EMAIL'
  | 'MAIL_FROM_NAME'
>;

export type MailTransport = {
  sendMail(
    message: MailMessage & {
      from: { name: string; address: string };
      disableFileAccess: true;
      disableUrlAccess: true;
    },
  ): Promise<{ accepted?: unknown[]; rejected?: unknown[] }>;
};

export const mailUnavailable = () =>
  new ApiError({
    statusCode: 503,
    code: 'MAIL_DELIVERY_UNAVAILABLE',
    message: 'E-posta hizmetine şu anda ulaşılamıyor. Lütfen daha sonra tekrar deneyin.',
    expose: true,
  });

export class DisabledMailService implements MailService {
  readonly enabled = false;
  async send(): Promise<void> {
    throw mailUnavailable();
  }
}

export function smtpTransportOptions(config: MailConfig) {
  return {
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    // 587 must upgrade via STARTTLS; 465 starts encrypted. No insecure fallback.
    requireTLS: !config.SMTP_SECURE,
    ignoreTLS: false,
    opportunisticTLS: false,
    tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' as const },
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD },
    connectionTimeout: 10_000,
    greetingTimeout: 5_000,
    socketTimeout: 15_000,
    dnsTimeout: 5_000,
    pool: false,
    logger: false,
    debug: false,
    transactionLog: false,
    disableFileAccess: true,
    disableUrlAccess: true,
    maxRecipients: 1,
  };
}

export class SmtpMailService implements MailService {
  readonly enabled = true;
  constructor(
    private readonly config: MailConfig,
    private readonly transport: MailTransport,
    private readonly logger?: Pick<Logger, 'info' | 'warn'>,
  ) {}

  async send(message: MailMessage): Promise<void> {
    try {
      const mailbox = z.string().email().max(254);
      mailbox.parse(message.to);
      if (message.replyTo) mailbox.parse(message.replyTo);
      if (!message.subject || /[\r\n]/.test(message.subject)) throw new Error('Invalid subject');
      const result = await this.transport.sendMail({
        ...message,
        // Fixed configured sender, never the request's email/name or a transport URL.
        from: { name: this.config.MAIL_FROM_NAME, address: this.config.MAIL_FROM_EMAIL! },
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      const accepted = result.accepted?.some((entry) => {
        const address =
          typeof entry === 'string'
            ? entry
            : entry && typeof entry === 'object' && 'address' in entry
              ? entry.address
              : undefined;
        return typeof address === 'string' && address.toLowerCase() === message.to.toLowerCase();
      });
      if (!accepted || (result.rejected?.length ?? 0) > 0)
        throw new Error('Recipient not accepted');
      // Safe operational proof only: never log recipient, subject, body, token,
      // SMTP response text, or credentials.
      this.logger?.info(
        { code: 'MAIL_ACCEPTED', transport: 'smtp' },
        'Transactional e-posta SMTP tarafından kabul edildi.',
      );
    } catch {
      // Do not attach the original error: SMTP replies may echo addresses, tokens,
      // credentials or the complete MIME payload. A fixed operational event suffices.
      this.logger?.warn(
        { code: 'MAIL_DELIVERY_UNAVAILABLE' },
        'Transactional e-posta teslimi doğrulanamadı.',
      );
      throw mailUnavailable();
    }
  }
}

export function createMailService(
  config: MailConfig,
  logger?: Pick<Logger, 'info' | 'warn'>,
): MailService {
  if (config.MAIL_DRIVER === 'disabled') return new DisabledMailService();
  return new SmtpMailService(
    config,
    nodemailer.createTransport(smtpTransportOptions(config)),
    logger,
  );
}

export function authMail(input: {
  kind: 'verification' | 'password-reset';
  email: string;
  token: string;
  scheme?: string;
}): MailMessage {
  const verification = input.kind === 'verification';
  const scheme = input.scheme ?? 'birkareai';
  if (!/^[a-z][a-z0-9+.-]{1,40}$/.test(scheme)) throw mailUnavailable();
  if (verification && !/^\d{6}$/.test(input.token)) throw mailUnavailable();
  const path = verification ? 'verify-email' : 'reset-password';
  const link = new URL(`${scheme}://${path}`);
  link.searchParams.set(verification ? 'code' : 'token', input.token);
  if (verification) link.searchParams.set('email', input.email);
  const title = verification ? 'E-posta adresini doğrula' : 'Şifreni yenile';
  const validity = verification ? '10 dakika' : '1 saat';
  const text = [
    `BirKare AI — ${title}`,
    '',
    `Uygulamayı açmak için: ${link.toString()}`,
    '',
    verification
      ? `6 haneli doğrulama kodun: ${input.token}`
      : `Uygulamadaki şifre yenileme ekranına kopyalayabileceğin kod: ${input.token}`,
    '',
    `Bu bağlantı ve kod ${validity} geçerlidir ve yalnızca bir kez kullanılabilir.`,
    'Bu talebi sen başlatmadıysan e-postayı yok say. Kodunu kimseyle paylaşma.',
    'BirKare AI hiçbir zaman e-postayla şifreni istemez.',
  ].join('\n');
  return { to: input.email, subject: `BirKare AI — ${title}`, text };
}

export function accountDeletionMail(input: {
  email: string;
  token: string;
  webUrl: string;
}): MailMessage {
  let link: URL;
  try {
    link = new URL(input.webUrl);
  } catch {
    throw mailUnavailable();
  }
  const localHttp =
    link.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(link.hostname);
  if (
    (link.protocol !== 'https:' && !localHttp) ||
    link.username ||
    link.password ||
    link.hash ||
    input.token.length < 40
  ) {
    throw mailUnavailable();
  }
  link.searchParams.set('token', input.token);
  const text = [
    'BirKare AI — Hesap silme talebi',
    '',
    'Hesabını kalıcı olarak silme işlemine devam etmek için aşağıdaki tek kullanımlık bağlantıyı aç:',
    link.toString(),
    '',
    'Bu bağlantı 30 dakika geçerlidir ve yalnızca bir kez kullanılabilir.',
    'Bağlantıyı sen istemediysen bu e-postayı yok say; hesabında hiçbir değişiklik yapılmaz.',
    'BirKare AI hiçbir zaman bu işlem için e-postayla şifreni istemez.',
  ].join('\n');
  return {
    to: input.email,
    subject: 'BirKare AI — Hesap silme bağlantın',
    text,
  };
}
