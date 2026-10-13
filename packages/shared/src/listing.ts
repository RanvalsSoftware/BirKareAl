/**
 * Public listing-copy identifiers and limits. Instructions, model routing and
 * provider details belong to the server-side `@birkare/ai` boundary.
 */
export const LISTING_LANGUAGES = ['tr', 'en', 'de', 'es', 'ar'] as const;
export type ListingLanguage = (typeof LISTING_LANGUAGES)[number];

export const LISTING_TONES = ['neutral', 'friendly', 'premium'] as const;
export type ListingTone = (typeof LISTING_TONES)[number];

export const LISTING_LIMITS = {
  titleMaxLength: 80,
  descriptionMaxLength: 600,
  highlightsMin: 3,
  highlightsMax: 5,
  highlightMaxLength: 90,
  hashtagsMin: 5,
  hashtagsMax: 10,
  /** Includes the leading `#`. */
  hashtagMaxLength: 40,
} as const;

export const PROJECT_PRICE_MAX_AMOUNT = 99_999_999.99;

/** Seller-facing copy persisted on a project; `generatedAt` is an ISO timestamp. */
export type ProjectListing = {
  title: string;
  description: string;
  highlights: string[];
  hashtags: string[];
  language: ListingLanguage;
  tone: ListingTone;
  generatedAt: string;
};
