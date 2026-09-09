import { describe, expect, it } from 'vitest';
import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  normalizeBirthYearInput,
  socialCompleteFormSchema,
} from './validation';

describe('auth form validation', () => {
  it('accepts a complete adult registration', () => {
    const result = registerSchema.safeParse({
      firstName: 'Ayşe',
      lastName: 'Kaya',
      email: 'ayse@example.com',
      password: 'Guclu-Sifre-123!',
      passwordConfirmation: 'Guclu-Sifre-123!',
      birthYear: 1992,
      acceptedTerms: true,
      acceptedPrivacy: true,
      acceptedAiDisclosure: true,
      acceptedAge: true,
      acceptedImageRights: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a short password and non-matching confirmation', () => {
    const result = registerSchema.safeParse({
      firstName: 'Ayşe',
      lastName: 'Kaya',
      email: 'ayse@example.com',
      password: 'short',
      passwordConfirmation: 'other',
      birthYear: 1992,
      acceptedTerms: true,
      acceptedPrivacy: true,
      acceptedAiDisclosure: true,
      acceptedAge: true,
      acceptedImageRights: true,
    });
    expect(result.success).toBe(false);
  });

  it('requires a valid login e-mail and a password', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: '' }).success).toBe(false);
  });

  it('requires equal reset passwords', () => {
    expect(
      resetPasswordSchema.safeParse({
        password: 'Guclu-Sifre-123!',
        passwordConfirmation: 'Baska-Sifre-456!',
        signOutEverywhere: true,
      }).success,
    ).toBe(false);
  });
});

describe('Google profile completion keyboard values', () => {
  const fields = {
    firstName: 'Ayşe',
    lastName: 'Çetin',
    acceptedTerms: true,
    acceptedPrivacy: true,
    acceptedAiDisclosure: true,
    acceptedAge: true,
    acceptedImageRights: true,
  };

  it('preserves partial typed years and backspace as strings instead of NaN or numeric resets', () => {
    for (const text of ['', '1', '19', '199', '1998', '199', '19', '1', '']) {
      expect(normalizeBirthYearInput(text)).toBe(text);
    }
    expect(normalizeBirthYearInput('0')).toBe('0');
    expect(normalizeBirthYearInput('19989')).toBe('1998');
    expect(normalizeBirthYearInput('19a98')).toBe('1998');
  });

  it('converts a complete valid year only at submission', () => {
    const value = socialCompleteFormSchema.parse({ ...fields, birthYear: '1998' });
    expect(value.birthYear).toBe(1998);
    expect(value.firstName).toBe('Ayşe');
  });

  it('rejects incomplete input and underage years', () => {
    for (const birthYear of ['', '1', '19', '199', 'abcd', String(new Date().getFullYear() - 17)]) {
      expect(socialCompleteFormSchema.safeParse({ ...fields, birthYear }).success).toBe(false);
    }
  });

  it('still requires every consent; Google login is not consent to register', () => {
    for (const consent of [
      'acceptedTerms',
      'acceptedPrivacy',
      'acceptedAiDisclosure',
      'acceptedAge',
      'acceptedImageRights',
    ]) {
      expect(
        socialCompleteFormSchema.safeParse({ ...fields, birthYear: '1998', [consent]: false })
          .success,
      ).toBe(false);
    }
  });
});
