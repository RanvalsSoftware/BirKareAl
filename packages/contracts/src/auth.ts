import { z } from 'zod';
import { UuidSchema } from './common.js';

export const PasswordSchema = z
  .string()
  .min(10, 'Şifre en az 10 karakter olmalıdır.')
  .max(128, 'Şifre en fazla 128 karakter olabilir.')
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    message: 'Şifre en az bir harf ve bir rakam içermelidir.',
  });

export const EmailSchema = z
  .string()
  .trim()
  .email('Geçerli bir e-posta adresi girin.')
  .max(254)
  .transform((value) => value.toLowerCase());

export const DeviceSchema = z.object({
  deviceId: z.string().trim().min(1).max(128).optional(),
  deviceName: z.string().trim().min(1).max(128).optional(),
  platform: z.enum(['ios', 'android', 'web', 'unknown']).optional(),
  appVersion: z.string().trim().max(64).optional(),
});

export const RegisterSchema = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
    locale: z.string().trim().min(2).max(16).default('tr-TR'),
    dateOfBirth: z.string().date().optional(),
    consent: z.object({
      termsAccepted: z.literal(true),
      privacyAccepted: z.literal(true),
      aiDisclosureAccepted: z.literal(true),
      ageConfirmed: z.literal(true),
      ownImageOrPermissionConfirmed: z.literal(true),
    }),
  })
  .merge(DeviceSchema);

export const LoginSchema = z
  .object({
    email: EmailSchema,
    password: z.string().min(1).max(128),
    recoverDeletion: z.boolean().optional(),
  })
  .merge(DeviceSchema);

export const RefreshSchema = z
  .object({ refreshToken: z.string().min(40).max(512) })
  .merge(DeviceSchema);
export const LogoutSchema = z.object({ refreshToken: z.string().min(40).max(512) });
export const ForgotPasswordSchema = z.object({ email: EmailSchema });

export const AccountDeletionReasonSchema = z.enum([
  'NO_LONGER_USE',
  'PRIVACY',
  'NOT_USEFUL',
  'TECHNICAL_ISSUES',
  'TOO_EXPENSIVE',
  'OTHER',
]);

export const RequestAccountDeletionLinkSchema = z.object({ email: EmailSchema }).strict();

export const ConfirmAccountDeletionLinkSchema = z
  .object({
    token: z.string().min(40).max(512),
    reason: AccountDeletionReasonSchema,
    details: z.string().trim().max(500).optional(),
  })
  .strict();

export const ResetPasswordSchema = z.object({
  token: z.string().min(40).max(512),
  password: PasswordSchema,
});
export const VerifyEmailSchema = z.object({
  email: EmailSchema,
  code: z.string().regex(/^\d{6}$/, 'Doğrulama kodu 6 rakamdan oluşmalıdır.'),
}).merge(DeviceSchema);
export const ResendVerificationSchema = z.object({ email: EmailSchema }).merge(DeviceSchema);

/**
 * Profile and legal fields required only when a verified social identity
 * belongs to a person who does not yet have a BirKare account. Existing
 * social accounts can sign in with just an ID token and device metadata.
 */
export const SocialRegistrationSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  locale: z.string().trim().min(2).max(16).default('tr-TR'),
  dateOfBirth: z.string().date(),
  consent: z.object({
    termsAccepted: z.literal(true),
    privacyAccepted: z.literal(true),
    aiDisclosureAccepted: z.literal(true),
    ageConfirmed: z.literal(true),
    ownImageOrPermissionConfirmed: z.literal(true),
  }),
});

export const SocialLoginSchema = z
  .object({
    // An OAuth ID token is a signed identity assertion. It is intentionally
    // the only provider credential accepted by the API: authorization codes,
    // access tokens, and OAuth client secrets must never be sent here.
    idToken: z.string().min(10).max(8192),
    // Apple returns the name only on the first authorization. These values are
    // display defaults; the user confirms them during profile completion.
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
    recoverDeletion: z.boolean().optional(),
  })
  .merge(DeviceSchema);

/**
 * Completes first-time social registration using a short-lived, one-time
 * opaque token issued only after the server verifies the provider ID token.
 * The client never resubmits the raw provider ID token on this route.
 */
export const SocialProfileCompletionSchema = SocialRegistrationSchema.extend({
  pendingToken: z.string().min(40).max(512),
}).merge(DeviceSchema);
export const SessionParamsSchema = z.object({ sessionId: UuidSchema });

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshInput = z.infer<typeof RefreshSchema>;
export type SocialLoginInput = z.infer<typeof SocialLoginSchema>;
export type SocialRegistrationInput = z.infer<typeof SocialRegistrationSchema>;
export type SocialProfileCompletionInput = z.infer<typeof SocialProfileCompletionSchema>;
export type ConfirmAccountDeletionLinkInput = z.infer<typeof ConfirmAccountDeletionLinkSchema>;
