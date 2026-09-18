import type { GenerationQuality, ProjectMode } from './enums.js';

export type QuoteInput = {
  mode: ProjectMode;
  quality: GenerationQuality;
  numberOfImages: number;
  /** Decided server-side from the validated edit recipe; never trusted from mobile input. */
  premiumModel?: boolean;
  hasFilter?: boolean;
  hasTrend?: boolean;
  beautyTier?: 'STANDARD' | 'PREMIUM';
  hasFeaturedPerson?: boolean;
  hasSceneTemplate?: boolean;
};

export type CreditQuote = {
  creditCost: number;
  breakdown: Array<{ label: string; credits: number }>;
};

export type StudioCreditQuoteInput = {
  quality: GenerationQuality;
  numberOfImages: number;
  /** Values must come from the server-owned studio registry, never the client. */
  baseCredits: number;
  hdExtraCredits: number;
  label: string;
};

const FAST_PER_IMAGE: Record<GenerationQuality, number> = { PREVIEW: 1, STANDARD: 4, HD: 7 };
const PREMIUM_PER_IMAGE: Record<GenerationQuality, number> = {
  // Preview deliberately stays on the inexpensive fast model.
  PREVIEW: 1,
  STANDARD: 6,
  HD: 10,
};

export function calculateCreditQuote(input: QuoteInput): CreditQuote {
  const items: CreditQuote['breakdown'] = [];
  const unitCost = (input.premiumModel ? PREMIUM_PER_IMAGE : FAST_PER_IMAGE)[input.quality];
  const imageCost = unitCost * input.numberOfImages;
  items.push({
    label: `${input.numberOfImages} ${
      input.quality === 'PREVIEW'
        ? 'önizleme'
        : input.premiumModel
          ? input.quality === 'HD'
            ? 'Premium HD'
            : 'premium'
          : input.quality === 'HD'
            ? 'HD'
            : 'standart'
    } görsel`,
    credits: imageCost,
  });

  const addPerImage = (label: string, unitCredits: number) => {
    items.push({
      label: input.numberOfImages > 1 ? `${label} (${input.numberOfImages} görsel)` : label,
      credits: unitCredits * input.numberOfImages,
    });
  };

  // These edit kinds are mutually exclusive by contract. Charge one explicit
  // modifier, never an implicit natural-light adapter on top of beauty/trends.
  if (input.hasTrend) {
    addPerImage('Akım / trend', 2);
  } else if (input.beautyTier === 'PREMIUM') {
    addPerImage('Premium güzellik', 2);
  } else if (input.beautyTier === 'STANDARD') {
    addPerImage('Standart güzellik', 1);
  } else if (input.hasFilter) {
    addPerImage('AI filtre', 1);
  }

  if (input.hasSceneTemplate) {
    addPerImage('Sahne', 1);
  }
  if (input.hasFeaturedPerson) {
    addPerImage('Kurgusal karakter', 2);
  }
  if (input.mode === 'PRO_PORTRAIT') {
    addPerImage('Pro portre', 2);
  }

  return { creditCost: items.reduce((sum, item) => sum + item.credits, 0), breakdown: items };
}

/** Product, try-on and nail prices are complete per-preset prices. */
export function calculateStudioCreditQuote(input: StudioCreditQuoteInput): CreditQuote {
  const unitCredits =
    input.quality === 'PREVIEW'
      ? 1
      : input.baseCredits + (input.quality === 'HD' ? input.hdExtraCredits : 0);
  const credits = unitCredits * input.numberOfImages;
  return {
    creditCost: credits,
    breakdown: [
      {
        label:
          input.numberOfImages > 1
            ? `${input.label} (${input.numberOfImages} görsel)`
            : input.label,
        credits,
      },
    ],
  };
}
