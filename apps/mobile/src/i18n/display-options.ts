import { getLanguage } from './engine';

/** Explicit presentation adapter for legacy enum tokens. Never changes the
 * value stored in a form or sent to the API; never use this on free user text. */
const english: Readonly<Record<string, string>> = {
  'Önizleme': 'Preview', 'Standart': 'Standard', 'HD': 'HD',
  'Yakın': 'Close-up', 'Orta': 'Medium', 'Uzak': 'Wide', 'Selfie': 'Selfie',
  'Dengeli': 'Balanced', 'Hızlı': 'Fast', 'Ayrıntılı': 'Detailed',
  'Kaynak': 'Source', 'Düzenle': 'Edit', 'Oluştur': 'Generate',
  'Tümü': 'All', 'Popüler': 'Popular', 'Doğal': 'Natural', 'Sanatsal': 'Artistic',
  'Portre': 'Portrait', 'Sinematik': 'Cinematic', 'Retro': 'Retro',
  'Güzellik': 'Beauty', 'Dönüşüm': 'Transformation',
};
export function displayOption(value: string): string {
  return getLanguage() === 'en' && Object.hasOwn(english, value) ? english[value]! : value;
}
