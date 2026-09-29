import { describe, it, expect, vi } from 'vitest';
import { hydrateLanguagePreference, getLanguageSnapshot, setLanguagePreference, updateSystemLocales, t, tr, getLocale } from './engine';

describe('language preference lifecycle', () => {
  it('hydrates manual preference and preserves it across device changes', async () => {
    await hydrateLanguagePreference({read:async()=> 'tr',write:async()=>undefined},[{languageTag:'en-US'}]);
    expect(getLanguageSnapshot().language).toBe('tr');
    updateSystemLocales([{languageTag:'en-GB'}]);
    expect(getLanguageSnapshot().language).toBe('tr');
    await setLanguagePreference('system');
    expect(getLanguageSnapshot().language).toBe('en');
    expect(getLocale()).toBe('en-GB');
  });
  it('orders writes and lets the last choice win', async () => {
    const writes: string[] = [];
    await hydrateLanguagePreference({read:async()=>null,write:async(value)=>{writes.push(value);}},[]);
    await Promise.all([setLanguagePreference('tr'),setLanguagePreference('en'),setLanguagePreference('system')]);
    expect(writes).toEqual(['tr','en','system']);
    expect(getLanguageSnapshot().preference).toBe('system');
  });
  it('does not let a late persisted preference override a manual choice', async () => {
    let finish!: (value: string) => void;
    const pending = hydrateLanguagePreference({read:()=>new Promise<string>(resolve=>{finish=resolve;}),write:async()=>undefined},[{languageTag:'tr-TR'}]);
    await setLanguagePreference('en'); finish('tr'); await pending;
    expect(getLanguageSnapshot().preference).toBe('en');
  });
  it('keeps UI usable if storage fails and can retry persistence', async () => {
    const write = vi.fn().mockRejectedValueOnce(new Error('storage')).mockResolvedValue(undefined);
    await hydrateLanguagePreference({read:async()=>{throw new Error('read');},write},[]);
    await setLanguagePreference('tr'); expect(getLanguageSnapshot().saveFailed).toBe(true);
    expect(getLanguageSnapshot().language).toBe('tr');
    await setLanguagePreference('tr'); expect(getLanguageSnapshot().saveFailed).toBe(false);
  });
  it('interpolates quantities and does not translate arbitrary user content', async () => {
    await setLanguagePreference('en');
    expect(t('credits_other',{count:2})).toBe('2 credits');
    expect(tr('My own project title')).toBe('My own project title');
    await setLanguagePreference('tr');
    expect(t('credits_other',{count:2})).toBe('2 kredi');
  });
});
