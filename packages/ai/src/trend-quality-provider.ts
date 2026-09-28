import { ApiError, isDualPersonTrend } from '@birkare/shared';
import {
  isGuardedTrend,
  TREND_QUALITY_PROMPT_VERSION,
  type GuardedTrend,
} from './trend-quality-policy.js';
import { loadTrendStyleReference } from './trend-style-reference.js';
import {
  parseTrendQualityReview,
  qualityReviewUnavailable,
  type TrendQualityDefect,
  type TrendQualityReviewer,
} from './trend-quality-review.js';
import type {
  ImageGenerationInput,
  ImageGenerationOutput,
  ImageGenerationProvider,
  ImageReference,
  TrendQualityTelemetry,
} from './types.js';

const REPAIR_DIRECTIONS: Record<TrendQualityDefect, string> = {
  HEAD_CROP: 'Restore space around the complete source-supported head and hair. Expand the surrounding canvas, not the facial anatomy. Do not cut through the face.',
  ANATOMY: 'Match the source-supported neck length, head angle, shoulder relationship and visible limbs. Simplify the pose instead of inventing anatomy.',
  IDENTITY_DRIFT: 'Return to the original USER and SECONDARY_PERSON references. Match their observable facial structure independently; do not copy the style-reference face or beautify away distinctive details.',
  PERSON_COUNT: 'Include only the authorized source people, each once. Keep separate faces, shoulders and limbs; do not import any person from the style reference.',
  PLASTIC_SKIN: 'Keep natural pores, fine lines, hair strands, fabric texture and coherent light falloff. Remove synthetic smoothing and gloss without changing facial geometry.',
  STYLE_MISMATCH: 'Apply the selected era, materials, lighting and scene from the brief and style guide. Respect the user background override and requested intensity. Do not fall back to a generic portrait.',
};

function invalidContext(): ApiError {
  return new ApiError({
    statusCode: 422,
    code: 'TREND_INPUTS_INVALID',
    message: 'Akımın kaynak fotoğrafları doğrulanamadı. Ayrılan krediniz iade edildi.',
    expose: true,
  });
}

function validateInputs(input: ImageGenerationInput, preset: GuardedTrend): void {
  if (
    !input.assertActive || !Number.isInteger(input.numberOfImages) ||
    input.numberOfImages < 1 || input.numberOfImages > 4 ||
    input.sourceImages.length < 1 || input.sourceImages.length > 3 ||
    input.sourceImages[0]?.role !== 'USER'
  ) throw invalidContext();
  const roles = input.sourceImages.map((image) => image.role);
  if (new Set(roles).size !== roles.length ||
      roles.some((role) => !['USER', 'SECONDARY_PERSON', 'REFERENCE'].includes(role)))
    throw invalidContext();
  const secondary = input.sourceImages.find((image) => image.role === 'SECONDARY_PERSON');
  if (secondary && (
    !isDualPersonTrend(preset) || input.sourceImages[1] !== secondary ||
    secondary.buffer.equals(input.sourceImages[0]!.buffer)
  )) throw invalidContext();
  if (input.sourceImages.some((image) =>
    !Buffer.isBuffer(image.buffer) || image.buffer.length === 0 ||
    image.buffer.length > 15 * 1024 * 1024 ||
    !['image/jpeg', 'image/png', 'image/webp'].includes(image.mimeType)
  )) throw invalidContext();
}

function validSignature(bytes: Buffer, mime: string): boolean {
  if (mime === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === 'image/png')
    return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === 'image/webp')
    return bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
      bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  return false;
}

function validateOutputs(result: ImageGenerationOutput, expected: number): void {
  if (result.images.length !== expected || result.images.some((image) =>
    !Buffer.isBuffer(image.bytes) || image.bytes.length === 0 ||
    image.bytes.length > 30 * 1024 * 1024 || !validSignature(image.bytes, image.mimeType)
  )) throw new ApiError({
    statusCode: 502,
    code: 'PROVIDER_INVALID_OUTPUT',
    message: 'Görsel sağlayıcısının çıktısı doğrulanamadı. Ayrılan krediniz iade edildi.',
    expose: true,
  });
}

const safeTokens = (value: unknown): number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
const requestReference = (value: unknown): string | null =>
  typeof value === 'string' && /^[a-zA-Z0-9_.:-]{1,160}$/.test(value) ? value : null;

/**
 * One reservation / one job, with at most ONE repair request for confirmed bad outputs.
 * Network failures, unclear reviews and queue redelivery never authorize a fresh render.
 * No database, wallet, price or model-lane writes occur here.
 */
export class TrendQualityImageProvider implements ImageGenerationProvider {
  get name(): ImageGenerationProvider['name'] { return this.renderer.name; }

  constructor(
    private readonly renderer: ImageGenerationProvider,
    private readonly reviewer: TrendQualityReviewer,
    private readonly referenceLoader: (preset: GuardedTrend) => Promise<ImageReference> = loadTrendStyleReference,
  ) {}

  async generate(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
    // Preserve every existing background/filter/studio/editorial path.
    if (!input.trend || input.trend.preset === 'editorial_cover') return this.renderer.generate(input);
    const { preset, intensity } = input.trend;
    if (!isGuardedTrend(preset) || !Number.isInteger(intensity) || intensity < 0 || intensity > 100)
      throw invalidContext();
    if (intensity === 0) return this.renderer.generate(input);
    validateInputs(input, preset);
    const assertActive = input.assertActive!;
    await assertActive();
    const style = await this.referenceLoader(preset);
    if (style.role !== 'STYLE_REFERENCE' || !Buffer.isBuffer(style.buffer) || !validSignature(style.buffer, style.mimeType))
      throw invalidContext();
    const prepared: ImageGenerationInput = {
      ...input,
      // Identity images remain first and in their original order; the style guide is last.
      sourceImages: [...input.sourceImages, style],
    };
    await assertActive();
    const first = await this.renderer.generate(prepared);
    validateOutputs(first, input.numberOfImages);
    // Previews keep their existing latency/cost lane: style guidance, one render, no repair loop.
    if (input.quality === 'low') return first;

    const telemetry: TrendQualityTelemetry = {
      policyVersion: TREND_QUALITY_PROMPT_VERSION,
      renderAttempts: 1,
      reviewRequests: 0,
      repairedImages: 0,
      reviewerInputTokens: 0,
      reviewerOutputTokens: 0,
      renderRequestIds: [],
    };
    const initialReference = requestReference(first.providerRequestId);
    if (initialReference) telemetry.renderRequestIds.push(initialReference);
    const review = async (request: ImageGenerationInput, images: ImageGenerationOutput['images']) => {
      await assertActive();
      let result;
      try {
        result = await this.reviewer.review(request, images);
      } catch {
        throw qualityReviewUnavailable();
      }
      await assertActive();
      telemetry.reviewRequests += 1;
      telemetry.reviewerInputTokens += safeTokens(result.usage?.inputTokens);
      telemetry.reviewerOutputTokens += safeTokens(result.usage?.outputTokens);
      return parseTrendQualityReview({ results: result.results }, images.length);
    };
    const verdicts = await review(prepared, first.images);
    if (verdicts.some((item) => item.verdict === 'UNSURE')) throw qualityReviewUnavailable();
    const failed = verdicts.filter((item) => item.verdict === 'RETRY');
    if (!failed.length) return { ...first, qualityReview: telemetry };

    const defects = [...new Set(failed.flatMap((item) => item.defects))];
    const repairInput: ImageGenerationInput = {
      ...prepared,
      numberOfImages: failed.length,
      // Repair from ORIGINAL source images, never from the rejected synthetic faces.
      prompt: `${prepared.prompt}\n\nTARGETED QUALITY REPAIR — ONE INTERNAL ATTEMPT\n${defects.map((code) => REPAIR_DIRECTIONS[code]).join('\n')}\nKeep the selected style, intensity, model, quality and output size. Simplify only the defective pose/composition. Do not create a collage or import style-reference people.`,
    };
    await assertActive();
    const repaired = await this.renderer.generate(repairInput);
    telemetry.renderAttempts = 2;
    validateOutputs(repaired, failed.length);
    const repairedReference = requestReference(repaired.providerRequestId);
    if (repairedReference) telemetry.renderRequestIds.push(repairedReference);
    const finalVerdicts = await review(repairInput, repaired.images);
    if (finalVerdicts.some((item) => item.verdict !== 'PASS')) {
      throw new ApiError({
        statusCode: 422,
        code: 'TREND_QUALITY_REJECTED',
        message: 'Görsel kalite kontrolünü geçemedi. Yeni bir ücretli deneme başlatılmadı. Ayrılan krediniz iade edildi.',
        expose: true,
        details: {
          providerRequestId: repairedReference ?? initialReference,
          renderAttempts: 2,
          qualityPolicy: TREND_QUALITY_PROMPT_VERSION,
        },
      });
    }
    const images = [...first.images];
    failed.forEach((item, index) => { images[item.index] = repaired.images[index]!; });
    telemetry.repairedImages = failed.length;
    return {
      providerRequestId: repaired.providerRequestId ?? first.providerRequestId,
      images,
      usage: {
        inputTokens: safeTokens(first.usage?.inputTokens) + safeTokens(repaired.usage?.inputTokens),
        outputTokens: safeTokens(first.usage?.outputTokens) + safeTokens(repaired.usage?.outputTokens),
      },
      qualityReview: telemetry,
    };
  }
}
