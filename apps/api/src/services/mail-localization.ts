import type { MailMessage } from './mail.service.js';
import { communicationLanguage } from './request-language.js';

/** Reuses the already validated link and token; never changes token semantics. */
export function localizeAuthMail(message: MailMessage, input: {
  kind: 'verification' | 'password-reset'; token: string; link: string; locale?: string;
}): MailMessage {
  if (communicationLanguage(input.locale) !== 'en') return message;
  const verification = input.kind === 'verification';
  const title = verification ? 'Verify your email address' : 'Reset your password';
  return {
    ...message,
    subject: `BirKare AI — ${title}`,
    text: [
      `BirKare AI — ${title}`, '',
      `Open the app: ${input.link}`, '',
      verification
        ? `Your six-digit verification code: ${input.token}`
        : `Code to paste into the password reset screen: ${input.token}`, '',
      `This link and code are valid for ${verification ? '10 minutes' : '1 hour'} and can only be used once.`,
      'If you did not make this request, ignore this email. Never share your code.',
      'BirKare AI will never ask for your password by email.',
    ].join('\n'),
  };
}

export function localizeDeletionMail(message: MailMessage, input: {
  link: string; locale?: string;
}): MailMessage {
  if (communicationLanguage(input.locale) !== 'en') return message;
  return {
    ...message,
    subject: 'BirKare AI — Your account deletion link',
    text: [
      'BirKare AI — Account deletion request', '',
      'To continue your account deletion request, open the one-time link below:',
      input.link, '',
      'This link is valid for 30 minutes and can only be used once.',
      'If you did not request this link, ignore this email. Your account will not be changed.',
      'BirKare AI will never ask for your password by email to complete this request.',
    ].join('\n'),
  };
}
