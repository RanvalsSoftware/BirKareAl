import { afterEach, describe, expect, it } from 'vitest';
import { getLanguageSnapshot, getLocale, hydrateLanguagePreference, setLanguagePreference, tr, updateSystemLocales } from './engine';
import { localizedApiErrorMessage } from './errors';
import { loginSchema, registerSchema, socialCompleteFormSchema } from '@/features/auth/validation';
import { getCreateFlow, updateCreateFlow, resetCreateFlow } from '@/features/create/createFlow';
import { trendPresets } from '@/features/trends/presets';

afterEach(async () => { await setLanguagePreference('tr'); resetCreateFlow(); });

describe('language updates preserve application contracts', () => {
  it('validates in the active language even when schemas were imported before hydration', async () => {
    await hydrateLanguagePreference({ read:async () => 'en',write:async () => undefined },[{languageTag:'en-GB'}]);
    const en = loginSchema.safeParse({ email:'invalid',password:'' });
    expect(en.success).toBe(false);
    if (!en.success) expect(en.error.issues.map(i => i.message)).toEqual(['Enter a valid email address.','Enter your password.']);
    await setLanguagePreference('tr');
    const turkish = loginSchema.safeParse({email:'invalid',password:''});
    if (!turkish.success) expect(turkish.error.issues[0]!.message).toBe('Geçerli bir e-posta adresi girin.');
    await setLanguagePreference('en');
    const input = { firstName:'Anna',lastName:'Test',email:'anna@example.test',password:'abcdefghij',passwordConfirmation:'different123',birthYear:1990,acceptedTerms:true,acceptedPrivacy:true,acceptedAiDisclosure:true,acceptedAge:true,acceptedImageRights:true };
    const result = registerSchema.safeParse(input);
    if (!result.success) expect(result.error.issues.map(i => i.message)).toContain('Your password must include at least one letter and one number.');
    expect(input.password).toBe('abcdefghij');
    expect(socialCompleteFormSchema.safeParse({...input,birthYear:'19'}).success).toBe(false);
  });

  it('translates protocol errors without interpreting private text as translation keys', async () => {
    await setLanguagePreference('en');
    expect(localizedApiErrorMessage('AUTH_INVALID_CREDENTIALS','E-posta veya şifre hatalı.')).toBe('The email address or password is incorrect.');
    expect(localizedApiErrorMessage('UNKNOWN','private-token secret@example.test')).toBe('Something went wrong. Please try again.');
    expect(localizedApiErrorMessage('__proto__','anything')).toBe('Something went wrong. Please try again.');
    await setLanguagePreference('tr');
    expect(localizedApiErrorMessage('AUTH_INVALID_CREDENTIALS','E-posta veya şifre hatalı.')).toBe('E-posta veya şifre hatalı.');
  });

  it('keeps photo URIs, user notes, immutable preset IDs and credit settings unchanged', async () => {
    updateCreateFlow({ sourceUri:'file:///own-photo.jpg',sourceName:'My own name',customInstruction:'Sade Lüks',quality:'HD',numberOfImages:2,trendPreset:'old_money_portrait' });
    const flowBefore = getCreateFlow();
    const idsBefore = trendPresets.map(p => p.id);
    await setLanguagePreference('en');
    const english = trendPresets.find(p => p.id === 'old_money_portrait')!.name;
    expect(english).not.toBe('Sade Lüks');
    expect(getCreateFlow()).toBe(flowBefore);
    expect(getCreateFlow().customInstruction).toBe('Sade Lüks');
    expect(trendPresets.map(p => p.id)).toEqual(idsBefore);
    await setLanguagePreference('tr');
    expect(trendPresets.find(p => p.id === 'old_money_portrait')!.name).toBe('Sade Lüks');
  });

  it('follows device preferences only in system mode and formats the matching locale', async () => {
    await setLanguagePreference('system');
    updateSystemLocales([{languageTag:'de-DE'},{languageTag:'en-GB'},{languageTag:'tr-TR'}]);
    expect(getLanguageSnapshot().language).toBe('en');
    expect(getLocale()).toBe('en-GB');
    await setLanguagePreference('tr');
    updateSystemLocales([{languageTag:'en-US'}]);
    expect(getLanguageSnapshot().language).toBe('tr');
    expect(tr('Şifreler eşleşmiyor.')).toBe('Şifreler eşleşmiyor.');
  });
});
