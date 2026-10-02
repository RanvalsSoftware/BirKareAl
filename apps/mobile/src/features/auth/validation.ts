import { tr as translateCopy } from '@/i18n/engine';
import { z } from 'zod';

const normalizedEmail = z
  .string()
  .trim()
  .email({ error: () => translateCopy("Geçerli bir e-posta adresi girin.") })
  .max(254, { error: () => translateCopy("E-posta adresi çok uzun.") });

const password = z
  .string()
  .min(10, { error: () => translateCopy("Şifreniz en az 10 karakter olmalı.") })
  .max(128, { error: () => translateCopy("Şifreniz en fazla 128 karakter olabilir.") })
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    error: () => translateCopy("Şifreniz en az bir harf ve bir rakam içermeli."),
  });

export const loginSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(1, { error: () => translateCopy("Şifrenizi girin.") }),
});

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, { error: () => translateCopy("Adınız en az 2 karakter olmalı.") }).max(80),
    lastName: z.string().trim().min(2, { error: () => translateCopy("Soyadınız en az 2 karakter olmalı.") }).max(80),
    email: normalizedEmail,
    password,
    passwordConfirmation: z.string().min(1, { error: () => translateCopy("Şifrenizi tekrar girin.") }),
    birthYear: z
      .number({ error: () => translateCopy("Doğum yılınızı girin.") })
      .int({ error: () => translateCopy("Doğum yılı tam sayı olmalı.") })
      .min(1900, { error: () => translateCopy("Geçerli bir doğum yılı girin.") })
      .max(new Date().getFullYear() - 18, { error: () => translateCopy("BirKare AI için 18 yaşını doldurmuş olmalısınız.") }),
    acceptedTerms: z
      .boolean()
      .refine((value) => value, { error: () => translateCopy("Devam etmek için koşulları kabul etmelisiniz.") }),
    acceptedNotice: z
      .boolean()
      .refine((value) => value, { error: () => translateCopy("Aydınlatma Metni'ni okuduğunuzu onaylamalısınız.") }),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    error: () => translateCopy("Şifreler eşleşmiyor."),
    path: ['passwordConfirmation'],
  });

export const forgotPasswordSchema = z.object({
  email: normalizedEmail,
});

export const resetPasswordSchema = z
  .object({
    password,
    passwordConfirmation: z.string().min(1, { error: () => translateCopy("Şifrenizi tekrar girin.") }),
    signOutEverywhere: z.boolean(),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    error: () => translateCopy("Şifreler eşleşmiyor."),
    path: ['passwordConfirmation'],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const socialCompleteSchema = z.object({
  firstName: z.string().trim().min(2, { error: () => translateCopy("Adınız en az 2 karakter olmalı.") }).max(80),
  lastName: z.string().trim().min(2, { error: () => translateCopy("Soyadınız en az 2 karakter olmalı.") }).max(80),
  birthYear: z
    .number({ error: () => translateCopy("Doğum yılınızı girin.") })
    .int({ error: () => translateCopy("Doğum yılı tam sayı olmalı.") })
    .min(1900, { error: () => translateCopy("Geçerli bir doğum yılı girin.") })
    .max(new Date().getFullYear() - 18, { error: () => translateCopy("BirKare AI için 18 yaşını doldurmuş olmalısınız.") }),
  acceptedTerms: z
    .boolean()
    .refine((value) => value, { error: () => translateCopy("Devam etmek için koşulları kabul etmelisiniz.") }),
  acceptedNotice: z
    .boolean()
    .refine((value) => value, { error: () => translateCopy("Aydınlatma Metni'ni okuduğunuzu onaylamalısınız.") }),
});

export type SocialCompleteValues = z.infer<typeof socialCompleteSchema>;

/** Keep incomplete keyboard input as text; convert only after complete validation. */
export const socialCompleteFormSchema = socialCompleteSchema.extend({
  birthYear: z
    .string()
    .regex(/^\d{4}$/, { error: () => translateCopy("Doğum yılınızı 4 haneli girin.") })
    .transform(Number)
    .pipe(socialCompleteSchema.shape.birthYear),
});

export type SocialCompleteFormValues = z.input<typeof socialCompleteFormSchema>;

export function normalizeBirthYearInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4);
}
