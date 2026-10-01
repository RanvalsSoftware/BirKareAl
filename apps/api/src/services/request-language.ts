/** Presentation metadata only. Never use a language header for authorization. */
export type CommunicationLanguage = 'tr' | 'en' | 'de' | 'es' | 'ar';

const supportedLanguages: readonly CommunicationLanguage[] = ['tr', 'en', 'de', 'es', 'ar'];

export function communicationLanguage(value: unknown): CommunicationLanguage | undefined {
  if (typeof value !== 'string' || value.length > 80) return undefined;
  const code = value.trim().toLowerCase().replace(/_/g, '-');
  if (!/^[a-z]{2}(?:-[a-z0-9]{2,8})*$/.test(code)) return undefined;
  const language = code.split('-')[0] as CommunicationLanguage;
  return supportedLanguages.includes(language) ? language : undefined;
}

/** Honors weights and order; excludes q=0, wildcards and malformed entries. */
export function preferredRequestLanguage(header: unknown): CommunicationLanguage | undefined {
  if (typeof header !== 'string' || header.length > 512) return undefined;
  const choices = header.split(',').slice(0, 20).flatMap((entry, index) => {
    const parts = entry.trim().split(';');
    if (parts.length > 2) return [];
    const language = communicationLanguage(parts[0]);
    const weight = parts[1]?.trim();
    if (weight && !/^q=(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/i.test(weight)) return [];
    const q = weight ? Number(weight.slice(2)) : 1;
    return language && q > 0 ? [{ language, q, index }] : [];
  });
  return choices.sort((a, b) => b.q - a.q || a.index - b.index)[0]?.language;
}
