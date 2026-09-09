import type { PolicyCategory, PolicyDecision } from './enums.js';

export type PolicyResult = {
  decision: PolicyDecision;
  categories: PolicyCategory[];
  reason?: string;
  disclosureRequired: boolean;
  watermarkRequired: boolean;
};

type Rule = { category: PolicyCategory; match: RegExp; reason: string };

// This is intentionally conservative. It is a product-policy backstop, not a substitute
// for provider moderation or human review.
const DENY_RULES: Rule[] = [
  {
    category: 'MINOR_SAFETY',
    match:
      /\b(çocuk|reşit olmayan|minor|underage|18 yaş altı)\b.*\b(nude|çıplak|seks|sexual|erotik)\b|\b(nude|çıplak|seks|sexual|erotik)\b.*\b(çocuk|reşit olmayan|minor|underage)\b/i,
    reason: 'Çocuk güvenliği riski',
  },
  {
    category: 'SEXUAL_CONTENT',
    match: /\b(nude|çıplak|porn|porno|cinsel ilişki|sexual act|explicit sex)\b/i,
    reason: 'Açık cinsel içerik desteklenmez',
  },
  {
    category: 'DOCUMENT_OR_IDENTITY_FORGERY',
    match:
      /\b(kimlik|pasaport|ehliyet|banka dekontu|fatura|vize|resmi belge|official document|passport|id card)\b/i,
    reason: 'Belge veya kimlik üretimi desteklenmez',
  },
  {
    category: 'FAKE_EVIDENCE',
    match: /\b(kanıt|delil|mahkeme|olay yeri|gerçekmiş gibi|proof|evidence|court)\b/i,
    reason: 'Aldatıcı kanıt üretimi desteklenmez',
  },
  {
    category: 'DECEPTIVE_ENDORSEMENT',
    match: /\b(onaylıyor|reklam yüzü|sponsor|endorsement|gerçekten destekliyor)\b/i,
    reason: 'Aldatıcı endorsement üretimi desteklenmez',
  },
  {
    category: 'POLITICAL_MANIPULATION',
    match: /\b(seçim|oy ver|kampanya|başkan adayı|political campaign|election)\b/i,
    reason: 'Politik manipülasyon desteklenmez',
  },
  {
    category: 'FRAUD_OR_IMPERSONATION',
    match: /\b(dolandır|scam|sahte hesap|impersonat|başkası gibi davran)\b/i,
    reason: 'Taklit veya dolandırıcılık desteklenmez',
  },
];

const REVIEW_RULES: Rule[] = [
  {
    category: 'PUBLIC_FIGURE_RIGHTS',
    // This is a safety backstop only. Approved characters must come from the
    // server catalog; free text never grants permission to use a real person.
    match:
      /\b(messi|ronaldo|cristiano|neymar|mbapp[eé]|haaland|gal[ _-]?gadot|taylor[ _-]?swift|elon[ _-]?musk)\b/i,
    reason: 'Gerçek kişi benzerliği için katalog onayı gerekli',
  },
  {
    category: 'NON_CONSENSUAL_LIKENESS',
    match: /\b(eski sevgili|habersiz|izinsiz|intikam|without consent)\b/i,
    reason: 'Rıza ve mahremiyet incelemesi gerekli',
  },
  {
    category: 'GRAPHIC_VIOLENCE',
    match: /\b(kanlı|ceset|işkence|gore|murder scene)\b/i,
    reason: 'Şiddet içeriği incelemesi gerekli',
  },
];

export function evaluateProductPolicy(instruction?: string): PolicyResult {
  const text = instruction?.trim() ?? '';
  const denyMatches = DENY_RULES.filter((rule) => rule.match.test(text));
  if (denyMatches.length > 0) {
    return {
      decision: 'DENY',
      categories: [...new Set(denyMatches.map((rule) => rule.category))],
      reason: denyMatches[0]?.reason,
      disclosureRequired: false,
      watermarkRequired: false,
    };
  }

  const reviewMatches = REVIEW_RULES.filter((rule) => rule.match.test(text));
  if (reviewMatches.length > 0) {
    return {
      decision: 'REQUIRE_HUMAN_REVIEW',
      categories: [...new Set(reviewMatches.map((rule) => rule.category))],
      reason: reviewMatches[0]?.reason,
      disclosureRequired: true,
      watermarkRequired: true,
    };
  }

  return {
    decision: 'ALLOW_WITH_DISCLOSURE',
    categories: [],
    disclosureRequired: true,
    watermarkRequired: false,
  };
}
