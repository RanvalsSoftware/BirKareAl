export const PROJECT_MODES = [
  'BACKGROUND_REPLACE',
  'FULL_SCENE',
  'FAN_MOMENT',
  'AI_FILTER',
  'PRO_PORTRAIT',
] as const;

export type ProjectMode = (typeof PROJECT_MODES)[number];

export const GENERATION_QUALITIES = ['PREVIEW', 'STANDARD', 'HD'] as const;
export type GenerationQuality = (typeof GENERATION_QUALITIES)[number];

export const ASPECT_RATIOS = ['1:1', '4:5', '9:16', '16:9'] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const GENERATION_STATUSES = [
  'DRAFT',
  'VALIDATING',
  'MODERATING_INPUT',
  'BLOCKED',
  'QUEUED',
  'PREPARING',
  'GENERATING',
  'POST_PROCESSING',
  'MODERATING_OUTPUT',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'DELETION_PENDING',
  'DELETED',
] as const;
export type GenerationStatus = (typeof GENERATION_STATUSES)[number];

export const ASSET_STATUSES = [
  'PENDING_UPLOAD',
  'UPLOADED',
  'VALIDATING',
  'READY',
  'REJECTED',
  'DELETION_PENDING',
  'DELETED',
] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const ASSET_TYPES = [
  'USER_SOURCE',
  'APPROVED_REFERENCE',
  'SCENE_PREVIEW',
  'FILTER_PREVIEW',
  'GENERATION_PREVIEW',
  'GENERATION_FINAL',
  'THUMBNAIL',
  'AVATAR',
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const POLICY_CATEGORIES = [
  'SEXUAL_CONTENT',
  'MINOR_SAFETY',
  'GRAPHIC_VIOLENCE',
  'HATE_OR_HARASSMENT',
  'SELF_HARM',
  'FRAUD_OR_IMPERSONATION',
  'FAKE_EVIDENCE',
  'NON_CONSENSUAL_LIKENESS',
  'PUBLIC_FIGURE_RIGHTS',
  'POLITICAL_MANIPULATION',
  'DECEPTIVE_ENDORSEMENT',
  'DOCUMENT_OR_IDENTITY_FORGERY',
  'PRIVACY_VIOLATION',
  'COPYRIGHT_OR_TRADEMARK_RISK',
  'SPAM_OR_AUTOMATION',
] as const;
export type PolicyCategory = (typeof POLICY_CATEGORIES)[number];

export const POLICY_DECISIONS = [
  'ALLOW',
  'ALLOW_WITH_DISCLOSURE',
  'ALLOW_WITH_WATERMARK',
  'REQUIRE_HUMAN_REVIEW',
  'DENY',
  'SUSPEND_ACCOUNT',
] as const;
export type PolicyDecision = (typeof POLICY_DECISIONS)[number];

export const TERMINAL_GENERATION_STATUSES = new Set<GenerationStatus>([
  'BLOCKED',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'DELETED',
]);

export const ASPECT_RATIO_TO_SIZE = {
  '1:1': '1024x1024',
  // gpt-image-2 accepts mobile-first dimensions in multiples of 16.
  '4:5': '1024x1280',
  '9:16': '1152x2048',
  '16:9': '1536x1024',
} as const;

export const GENERATION_STAGES: Record<
  Exclude<
    GenerationStatus,
    'DRAFT' | 'BLOCKED' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'DELETION_PENDING' | 'DELETED'
  >,
  { progress: number; message: string }
> = {
  VALIDATING: { progress: 10, message: 'Fotoğrafınız kontrol ediliyor.' },
  MODERATING_INPUT: { progress: 20, message: 'Talebiniz güvenlik açısından inceleniyor.' },
  QUEUED: { progress: 25, message: 'Sıraya alındı.' },
  PREPARING: { progress: 35, message: 'Görseliniz hazırlanıyor.' },
  GENERATING: { progress: 65, message: 'BirKare AI görselinizi oluşturuyor.' },
  POST_PROCESSING: { progress: 85, message: 'Son dokunuşlar yapılıyor.' },
  MODERATING_OUTPUT: { progress: 95, message: 'Sonuç güvenlik açısından kontrol ediliyor.' },
};
