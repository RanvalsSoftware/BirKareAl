import type { GenerationQuality, ProjectMode } from './enums.js';

export type QuoteInput = {
  mode: ProjectMode;
  quality: GenerationQuality;
  numberOfImages: number;
  hasFeaturedPerson?: boolean;
  hasSceneTemplate?: boolean;
};

export type CreditQuote = {
  creditCost: number;
  breakdown: Array<{ label: string; credits: number }>;
};

const BASE_PER_IMAGE: Record<GenerationQuality, number> = {
  PREVIEW: 1,
  STANDARD: 4,
  HD: 8,
};

export function calculateCreditQuote(input: QuoteInput): CreditQuote {
  const items: CreditQuote['breakdown'] = [];
  const imageCost = BASE_PER_IMAGE[input.quality] * input.numberOfImages;
  items.push({
    label: `${input.numberOfImages} ${input.quality === 'HD' ? 'HD' : 'standart'} görsel`,
    credits: imageCost,
  });

  if (input.mode === 'FAN_MOMENT' || input.hasFeaturedPerson) {
    items.push({ label: 'Fan sahnesi güvenlik ve hak kontrolü', credits: 2 });
  }
  if (input.mode === 'PRO_PORTRAIT') {
    items.push({ label: 'Profesyonel portre işleme', credits: 2 });
  }
  if (input.mode === 'FULL_SCENE' && input.hasSceneTemplate) {
    items.push({ label: 'Tam sahne kompozisyonu', credits: 1 });
  }

  return { creditCost: items.reduce((sum, item) => sum + item.credits, 0), breakdown: items };
}
