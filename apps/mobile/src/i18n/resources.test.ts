import { describe, expect, it } from 'vitest';
import tr from './locales/tr.json';
import en from './locales/en.json';
import copy from './locales/copy-en.json';
import inventory from './copy-inventory.json';
import { setLanguagePreference, tr as translateCopy } from './engine';

const placeholders = (value: string) => [...value.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map(match=>match[1]).sort();
describe('bundled translation coverage', () => {
  it('has identical Turkish and English named keys and no empty messages', () => {
    expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(tr) as (keyof typeof tr)[]) {
      expect(en[key].trim(),key).not.toBe('');
      expect(placeholders(en[key]),key).toEqual(placeholders(tr[key]));
    }
  });
  it('translates every inventoried static message with identical interpolation variables', () => {
    for (const {text} of inventory) {
      const translated = (copy as Record<string,string>)[text];
      expect(translated,text).toBeTypeOf('string');
      expect(translated?.trim(),text).not.toBe('');
      expect(placeholders(translated),text).toEqual(placeholders(text));
    }
  });
  it('switches catalogue labels without changing identifiers or user-created text', async () => {
    await setLanguagePreference('en');
    expect(translateCopy('Sade Lüks')).toBe('Quiet Luxury');
    expect(translateCopy('Paylaş')).toBe('Share');
    expect(translateCopy('{{p0}} krediyle oluştur',{p0:9})).toBe('Generate for 9 credits');
    await setLanguagePreference('tr');
    expect(translateCopy('Sade Lüks')).toBe('Sade Lüks');
  });
});
