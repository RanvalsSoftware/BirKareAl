import { describe, it, expect } from 'vitest';
import { resolveLanguage, parseLanguagePreference, formattingLocale } from './resolve-language';

describe('ordered language selection without country inference', () => {
  it.each([
    [[{ languageTag: 'tr-TR' }], 'tr'],
    [[{ languageTag: 'en-GB' }], 'en'],
    [[{ languageTag: 'de-DE' }, { languageTag: 'tr-DE' }, { languageTag: 'en-US' }], 'de'],
    [[{ languageTag: 'es-ES' }, { languageTag: 'en-US' }], 'es'],
    [[{ languageTag: 'ar-SA' }], 'ar'],
    [[{ languageTag: 'en-TR' }], 'en'],
    [[{ languageCode: 'TR' }], 'tr'],
    [[], 'en'],
  ] as const)('resolves %j to %s', (locales, expected) => { expect(resolveLanguage('system', locales)).toBe(expected); });
  it('honors an explicit preference over the OS language', () => {
    expect(resolveLanguage('tr', [{languageTag:'en-US'}])).toBe('tr');
    expect(resolveLanguage('en', [{languageTag:'tr-TR'}])).toBe('en');
  });
  it('ignores invalid persisted values', () => {
    for (const value of [null, undefined, 'fr', {}, 'TR', 7]) expect(parseLanguagePreference(value)).toBe('system');
    for (const value of ['tr', 'en', 'de', 'es', 'ar']) expect(parseLanguagePreference(value)).toBe(value);
  });
  it('preserves supported regional formatting and bounds invalid tags', () => {
    expect(formattingLocale('en', [{languageTag:'en-GB'}])).toBe('en-GB');
    expect(formattingLocale('tr')).toBe('tr-TR');
    expect(formattingLocale('de')).toBe('de-DE');
    expect(formattingLocale('es')).toBe('es-ES');
    expect(formattingLocale('ar')).toBe('ar');
    expect(formattingLocale('en', [{languageTag:'en-!!!'}])).toBe('en-US');
  });
});
