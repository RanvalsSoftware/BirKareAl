import { afterEach, describe, expect, it } from 'vitest';
import tr from './locales/tr.json';
import en from './locales/en.json';
import copy from './locales/copy-en.json';
import supplemental from './locales/supplemental-en.json';
import ui from './locales/ui-en.json';
import inventory from './copy-inventory.json';
import { setLanguagePreference, tr as translateCopy } from './engine';

const placeholders = (value: string) =>
  [...value.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map((match) => match[1]).sort();

afterEach(async () => { await setLanguagePreference('tr'); });

describe('bundled translation coverage', () => {
  it('has identical Turkish and English named keys and no empty messages', () => {
    expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(tr) as (keyof typeof tr)[]) {
      expect(en[key].trim(), key).not.toBe('');
      expect(placeholders(en[key]), key).toEqual(placeholders(tr[key]));
    }
  });
  it('translates every inventoried static message with identical interpolation variables', () => {
    for (const { text } of inventory) {
      const translated = (copy as Record<string, string>)[text];
      expect(translated, text).toBeTypeOf('string');
      expect(translated?.trim(), text).not.toBe('');
      expect(placeholders(translated), text).toEqual(placeholders(text));
    }
  });
  it('validates the complete bundled dictionary including reviewed form and UI supplements', async () => {
    await setLanguagePreference('en');
    const complete = { ...copy, ...supplemental, ...ui };
    expect(Object.keys(complete).length).toBeGreaterThan(1400);
    for (const [key, value] of Object.entries(complete)) {
      expect(typeof value, key).toBe('string');
      expect(value.trim(), key).not.toBe('');
      expect(placeholders(value), key).toEqual(placeholders(key));
    }
    expect(translateCopy('Eklenen')).toBe('Added');
    expect(translateCopy('Harcanan')).toBe('Spent');
    expect(translateCopy('Hayal Et')).toBe('Imagine');
    expect(translateCopy('Varyasyon 4')).toBe('Variation 4');
    expect(translateCopy('Şifreler eşleşmiyor.')).toBe('The passwords do not match.');
  });
  it('switches catalogue labels without changing identifiers or user-created text', async () => {
    await setLanguagePreference('en');
    expect(translateCopy('Sade Lüks')).toBe('Quiet Luxury');
    expect(translateCopy('Paylaş')).toBe('Share');
    expect(translateCopy('{{p0}} krediyle oluştur', { p0: 9 })).toBe('Generate for 9 credits');
    await setLanguagePreference('tr');
    expect(translateCopy('Sade Lüks')).toBe('Sade Lüks');
  });
});
