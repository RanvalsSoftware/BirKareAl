import { describe, it, expect } from 'vitest';
import { resolveLanguage, parseLanguagePreference, formattingLocale } from './resolve-language';

describe('ordered language selection without country inference', () => {
  it.each([
    [[{ languageTag: 'tr-TR' }], 'tr'],
    [[{ languageTag: 'en-GB' }], 'en'],
    [[{ languageTag: 'de-DE' }, { languageTag: 'tr-DE' }, { languageTag: 'en-US' }], 'tr'],
    [[{ languageTag: 'de-DE' }, { languageTag: 'en-US' }, { languageTag: 'tr-TR' }], 'en'],
    [[{ languageTag: 'ar-SA' }], 'en'],
    [[{ languageTag: 'en-TR' }], 'en'],
    [[{ languageCode: 'TR' }], 'tr'],
    [[], 'en'],
  ] as const)('resolves %j to %s', (locales, expected) => { expect(resolveLanguage('system', locales)).toBe(expected); });
  it('honors an explicit preference over the OS language', () => {
    expect(resolveLanguage('tr', [{languageTag:'en-US'}])).toBe('tr');
    expect(resolveLanguage('en', [{languageTag:'tr-TR'}])).toBe('en');
  });
  it('ignores invalid persisted values', () => {
    for (const value of [null, undefined, 'de', {}, 'TR', 7]) expect(parseLanguagePreference(value)).toBe('system');
  });
  it('preserves supported regional formatting and bounds invalid tags', () => {
    expect(formattingLocale('en', [{languageTag:'en-GB'}])).toBe('en-GB');
    expect(formattingLocale('tr')).toBe('tr-TR');
    expect(formattingLocale('en', [{languageTag:'en-!!!'}])).toBe('en-US');
  });
});
