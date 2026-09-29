import { useEffect, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import { getLocales } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { I18nextProvider } from 'react-i18next';
import { hydrateLanguagePreference, i18n, updateSystemLocales } from './engine';
import { useLanguage } from './use-language';
import type { DeviceLocale } from './resolve-language';

const STORAGE_KEY = 'birkare.language.preference.v1';
let hydration: Promise<void> | undefined;
const storage = {
  async read(): Promise<unknown> {
    if (Platform.OS === 'web') return typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    return SecureStore.getItemAsync(STORAGE_KEY);
  },
  async write(value: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, value);
      return;
    }
    await SecureStore.setItemAsync(STORAGE_KEY, value);
  },
};

/** A locale lookup failure must never leave login behind a permanent blank gate. */
function systemLocales(): readonly DeviceLocale[] {
  try { return getLocales(); }
  catch {
    try { return [{ languageTag: Intl.DateTimeFormat().resolvedOptions().locale }]; }
    catch { return []; }
  }
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const { ready } = useLanguage();
  useEffect(() => {
    hydration ??= hydrateLanguagePreference(storage, systemLocales());
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') updateSystemLocales(systemLocales());
    });
    return () => subscription.remove();
  }, []);
  // No language key or navigation reset: preserve forms, photos and in-flight work.
  return <I18nextProvider i18n={i18n}>{ready ? children : null}</I18nextProvider>;
}
