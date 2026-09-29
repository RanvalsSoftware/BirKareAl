import { createInstance } from 'i18next';
import trMessages from './locales/tr.json';
import enMessages from './locales/en.json';
import englishCopy from './locales/copy-en.json';
import { formattingLocale, parseLanguagePreference, resolveLanguage, type DeviceLocale, type Language, type LanguagePreference } from './resolve-language';

// This module is platform-free. API, validation and catalogue modules can import
// it without importing React Native, auth, SecureStore or native localization.
export const i18n = createInstance();
void i18n.init({
  lng: 'tr', fallbackLng: 'en', supportedLngs: ['tr', 'en'],
  initImmediate: false, keySeparator: false, nsSeparator: false,
  defaultNS: 'translation', returnEmptyString: false,
  interpolation: { escapeValue: false },
  resources: {
    tr: { translation: trMessages, copy: Object.fromEntries(Object.keys(englishCopy).map((text) => [text, text])) },
    en: { translation: enMessages, copy: englishCopy },
  },
});

export type LanguageSnapshot = Readonly<{ preference: LanguagePreference; language: Language; locale: string; ready: boolean; saveFailed: boolean }>;
let deviceLocales: readonly DeviceLocale[] = [];
// Legacy non-UI callers/tests stay Turkish until native bootstrap resolves the
// actual device. The provider does not expose screens before that resolution.
let snapshot: LanguageSnapshot = { preference: 'system', language: 'tr', locale: 'tr-TR', ready: false, saveFailed: false };
const listeners = new Set<() => void>();
let persistence: ((preference: LanguagePreference) => Promise<void>) | undefined;
let writeQueue: Promise<void> = Promise.resolve();
let selectionRevision = 0;
export const getLanguageSnapshot = () => snapshot;
export const subscribeLanguage = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

function publish(patch: Partial<LanguageSnapshot>) {
  const next = { ...snapshot, ...patch };
  if (Object.keys(next).every((key) => next[key as keyof LanguageSnapshot] === snapshot[key as keyof LanguageSnapshot])) return;
  snapshot = next;
  if (i18n.language !== snapshot.language) void i18n.changeLanguage(snapshot.language);
  listeners.forEach((listener) => listener());
}
export function updateSystemLocales(locales: readonly DeviceLocale[]): void {
  deviceLocales = locales;
  const language = resolveLanguage(snapshot.preference, locales);
  publish({ language, locale: formattingLocale(language, locales) });
}
export async function hydrateLanguagePreference(storage: { read(): Promise<unknown>; write(value: LanguagePreference): Promise<void> }, locales: readonly DeviceLocale[]): Promise<void> {
  persistence = storage.write;
  deviceLocales = locales;
  const revision = selectionRevision;
  let stored: unknown;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    stored = await Promise.race([storage.read(), new Promise<undefined>((resolve) => { timeout = setTimeout(() => resolve(undefined), 1500); })]);
  } catch { stored = undefined; }
  finally { if (timeout) clearTimeout(timeout); }
  // A late storage read cannot override an explicit in-session choice.
  const preference = revision === selectionRevision ? parseLanguagePreference(stored) : snapshot.preference;
  const language = resolveLanguage(preference, deviceLocales);
  publish({ preference, language, locale: formattingLocale(language, deviceLocales), ready: true });
}
export function setLanguagePreference(preference: LanguagePreference): Promise<void> {
  const normalized = parseLanguagePreference(preference);
  const revision = ++selectionRevision;
  const language = resolveLanguage(normalized, deviceLocales);
  publish({ preference: normalized, language, locale: formattingLocale(language, deviceLocales), saveFailed: false });
  writeQueue = writeQueue.catch(() => undefined).then(async () => {
    if (!persistence) return;
    try { await persistence(normalized); if (revision === selectionRevision) publish({ saveFailed: false }); }
    catch { if (revision === selectionRevision) publish({ saveFailed: true }); }
  });
  return writeQueue;
}
export const getLanguage = (): Language => snapshot.language;
export const getLocale = (): string => snapshot.locale;
export type TranslationValues = Record<string, string | number | boolean | null | undefined>;
export function t(key: keyof typeof trMessages, values: TranslationValues = {}): string {
  return String(i18n.t(key, { ...values, lng: snapshot.language }));
}
/** Static, developer-owned copy only. Never call this on a user's name, note,
 * chat content, image text, custom project title or arbitrary API payload. */
export function tr(source: string, values: TranslationValues = {}): string {
  const key = source.replace(/\s+/g, ' ').trim();
  return String(i18n.t(key, { ...values, lng: snapshot.language, ns: 'copy', defaultValue: key }));
}
export function formatDate(value: Date | string | number, options: Intl.DateTimeFormatOptions = {}): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(snapshot.locale, options).format(date);
}
export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
  return Number.isFinite(value) ? new Intl.NumberFormat(snapshot.locale, options).format(value) : '—';
}
