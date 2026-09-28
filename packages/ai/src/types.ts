import type { TrendPreset } from '@birkare/shared';

export type ImageReference = {
  buffer: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  role:
    | 'USER'
    | 'SECONDARY_PERSON'
    | 'PRIMARY_PERSON'
    | 'PRODUCT'
    | 'GARMENT'
    | 'HAND'
    | 'REFERENCE'
    | 'STYLE_REFERENCE'
    | 'SCENE'
    | 'PERSON'
    | 'PREVIOUS_OUTPUT';
};

export type ImageGenerationInput = {
  requestId: string;
  /** Server-selected and persisted before enqueueing, so retries cannot change price/model lanes. */
  model?: string;
  prompt: string;
  sourceImages: ImageReference[];
  quality: 'low' | 'medium' | 'high';
  /** Flexible GPT-Image-2 sizes plus GPT-Image-1 Mini's portrait canvas. */
  size: '1024x1024' | '1024x1280' | '1024x1536' | '1536x1920' | '1152x2048' | '1536x1024';
  numberOfImages: number;
  /** Compiled from the persisted recipe by the worker, never parsed from user text. */
  trend?: { preset: TrendPreset; intensity: number };
  /** Re-check cancellation/deletion before a quality review or bounded repair render. */
  assertActive?: () => Promise<void>;
};

export type TrendQualityTelemetry = {
  policyVersion: string;
  renderAttempts: number;
  reviewRequests: number;
  repairedImages: number;
  reviewerInputTokens: number;
  reviewerOutputTokens: number;
  renderRequestIds: string[];
};

export type ImageGenerationOutput = {
  providerRequestId?: string;
  images: Array<{ bytes: Buffer; mimeType: string }>;
  /** Aggregate image-render usage, including a repair; review usage is separate below. */
  usage?: { inputTokens?: number; outputTokens?: number };
  qualityReview?: TrendQualityTelemetry;
};

export interface ImageGenerationProvider {
  readonly name: 'fake' | 'openai' | 'disabled';
  generate(input: ImageGenerationInput): Promise<ImageGenerationOutput>;
}

export type ModerationResult = {
  flagged: boolean;
  categories: string[];
  reason?: string;
};

export type ModerationInput = {
  text: string;
  requestId: string;
  /** Original uploaded image, never a public URL or catalog preview. */
  sourceImages?: ImageReference[];
};

export interface ModerationProvider {
  readonly name: 'fake' | 'openai' | 'disabled';
  moderateText(input: ModerationInput): Promise<ModerationResult>;
}
