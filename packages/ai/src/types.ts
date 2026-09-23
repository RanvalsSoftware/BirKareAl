export type ImageReference = {
  buffer: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  role:
    | 'USER'
    | 'PRIMARY_PERSON'
    | 'PRODUCT'
    | 'GARMENT'
    | 'HAND'
    | 'REFERENCE'
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
};

export type ImageGenerationOutput = {
  providerRequestId?: string;
  images: Array<{ bytes: Buffer; mimeType: string }>;
  usage?: { inputTokens?: number; outputTokens?: number };
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
