import { ApiError, unavailable } from '@birkare/shared';
import type { BirKareConfig } from '@birkare/config';
import { evaluateProductPolicy } from '@birkare/shared';
import type {
  ImageGenerationInput,
  ImageGenerationOutput,
  ImageGenerationProvider,
  ModerationProvider,
  ModerationInput,
  ModerationResult,
} from './types.js';
import { providerFailure, safeModerationCategories } from './provider-errors.js';

// The SDK otherwise retries image requests and may wait several minutes per
// attempt. Never silently submit a second paid render after a lost response.
export const IMAGE_REQUEST_TIMEOUT_MS = 180_000;
export const MODERATION_REQUEST_TIMEOUT_MS = 30_000;

const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlH0dYAAAAASUVORK5CYII=',
  'base64',
);

export class FakeImageGenerationProvider implements ImageGenerationProvider {
  readonly name = 'fake' as const;

  async generate(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
    return {
      providerRequestId: `fake_${input.requestId}`,
      images: Array.from({ length: input.numberOfImages }, () => ({
        bytes: Buffer.from(PLACEHOLDER_PNG),
        mimeType: 'image/png',
      })),
    };
  }
}

export class DisabledImageGenerationProvider implements ImageGenerationProvider {
  readonly name = 'disabled' as const;
  async generate(): Promise<ImageGenerationOutput> {
    throw unavailable(
      'GENERATION_DISABLED',
      'Görsel üretimi şu anda geçici olarak kullanılamıyor.',
    );
  }
}

export class OpenAIImageGenerationProvider implements ImageGenerationProvider {
  readonly name = 'openai' as const;
  constructor(
    private readonly config: Pick<BirKareConfig, 'OPENAI_API_KEY' | 'OPENAI_IMAGE_MODEL'>,
    private readonly transport?: { fetch: typeof fetch },
  ) {}

  async generate(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
    if (!this.config.OPENAI_API_KEY)
      throw unavailable('OPENAI_NOT_CONFIGURED', 'Görsel üretim sağlayıcısı yapılandırılmadı.');
    const moduleName = 'openai';
    const imported = (await import(moduleName)) as any;
    const OpenAI = imported.default ?? imported.OpenAI;
    const client = new OpenAI({
      apiKey: this.config.OPENAI_API_KEY,
      timeout: IMAGE_REQUEST_TIMEOUT_MS,
      maxRetries: 0,
      ...(this.transport ? { fetch: this.transport.fetch } : {}),
    });
    // GPT-Image-1 Mini is the requested low-cost profile. Unlike GPT-Image-2,
    // it accepts three fixed canvases, so preserve orientation while mapping
    // BirKare's more flexible mobile sizes to the nearest supported canvas.
    const modelSize = this.config.OPENAI_IMAGE_MODEL.startsWith('gpt-image-1')
      ? input.size === '1024x1024'
        ? '1024x1024'
        : input.size === '1536x1024'
          ? '1536x1024'
          : '1024x1536'
      : input.size;
    const base = {
      model: this.config.OPENAI_IMAGE_MODEL,
      prompt: input.prompt,
      size: modelSize,
      quality: input.quality,
      n: input.numberOfImages,
      // Preview jobs stay inexpensive; the server adds its own disclosure metadata.
      output_format: 'jpeg',
      output_compression: input.quality === 'low' ? 82 : 92,
      moderation: 'auto',
    };
    let response;
    try {
      response =
        input.sourceImages.length > 0
          ? await client.images.edit({
              ...base,
              image: await Promise.all(
                input.sourceImages.map(async (source: any, index: number) => {
                  if (!imported.toFile) throw new Error('OpenAI SDK toFile helper is unavailable.');
                  const extension = source.mimeType.split('/')[1];
                  return imported.toFile(source.buffer, `reference-${index}.${extension}`, {
                    type: source.mimeType,
                  });
                }),
              ),
            })
          : await client.images.generate(base);
    } catch (error) {
      throw providerFailure(error);
    }
    const images = (response.data ?? []).flatMap((item: any) =>
      item.b64_json
        ? [{ bytes: Buffer.from(item.b64_json, 'base64'), mimeType: 'image/jpeg' }]
        : [],
    );
    if (!images.length) throw new Error('OpenAI Images API bir görsel döndürmedi.');
    return { providerRequestId: response._request_id, images };
  }
}

export class FakeModerationProvider implements ModerationProvider {
  readonly name = 'fake' as const;
  async moderateText(input: ModerationInput): Promise<ModerationResult> {
    const policy = evaluateProductPolicy(input.text);
    return {
      flagged: policy.decision === 'DENY' || policy.decision === 'REQUIRE_HUMAN_REVIEW',
      categories: policy.categories,
      reason: policy.reason,
    };
  }
}

export class DisabledModerationProvider implements ModerationProvider {
  readonly name = 'disabled' as const;
  async moderateText(): Promise<ModerationResult> {
    // Fail closed, but an unavailable service is not a verdict on the photo.
    throw new ApiError({
      statusCode: 503,
      code: 'MODERATION_UNAVAILABLE',
      message:
        'Güvenlik hizmeti kullanılamadığı için üretim başlatılamadı. Ayrılan krediniz iade edildi.',
      expose: true,
    });
  }
}

export class OpenAIModerationProvider implements ModerationProvider {
  readonly name = 'openai' as const;
  constructor(
    private readonly config: Pick<BirKareConfig, 'OPENAI_API_KEY' | 'OPENAI_MODERATION_MODEL'>,
    private readonly transport?: { fetch: typeof fetch },
  ) {}

  async moderateText(input: ModerationInput): Promise<ModerationResult> {
    if (!this.config.OPENAI_API_KEY)
      throw new ApiError({
        statusCode: 503,
        code: 'MODERATION_UNAVAILABLE',
        message:
          'Güvenlik hizmeti yapılandırılmadığı için üretim başlatılamadı. Ayrılan krediniz iade edildi.',
        expose: true,
      });
    const moduleName = 'openai';
    const imported = (await import(moduleName)) as any;
    const OpenAI = imported.default ?? imported.OpenAI;
    const client = new OpenAI({
      apiKey: this.config.OPENAI_API_KEY,
      timeout: MODERATION_REQUEST_TIMEOUT_MS,
      maxRetries: 0,
      ...(this.transport ? { fetch: this.transport.fetch } : {}),
    });
    let result;
    try {
      const text = input.text.trim() || 'Photo editing using a predefined visual preset.';
      result = await client.moderations.create({
        model: this.config.OPENAI_MODERATION_MODEL,
        // Empty optional instructions are valid in BirKare; the moderation
        // endpoint still requires nonempty input.
        input: input.sourceImages?.length
          ? [
              { type: 'text', text },
              ...input.sourceImages.map((source) => ({
                type: 'image_url',
                image_url: {
                  url: `data:${source.mimeType};base64,${source.buffer.toString('base64')}`,
                },
              })),
            ]
          : text,
      });
    } catch (error) {
      const failure = providerFailure(error);
      // Account access and budget errors need their own actionable server-side
      // explanation, even when they occur at the moderation endpoint. Other
      // failures still stop closed; only a valid flagged result judges content.
      const preserveProviderFailure = [
        'PROVIDER_CONFIGURATION_ERROR',
        'PROVIDER_QUOTA_EXHAUSTED',
        'PROVIDER_RATE_LIMITED',
      ].includes(failure.code);
      throw new ApiError({
        statusCode: 503,
        code: preserveProviderFailure ? failure.code : 'MODERATION_UNAVAILABLE',
        message: preserveProviderFailure
          ? failure.message
          : 'Güvenlik kontrolü tamamlanamadığı için üretim başlatılmadı. Ayrılan krediniz iade edildi.',
        details: { ...failure.details, causeCode: failure.code },
        expose: true,
      });
    }
    const first = result.results?.[0];
    if (!first || typeof first.flagged !== 'boolean')
      throw new ApiError({
        statusCode: 503,
        code: 'MODERATION_UNAVAILABLE',
        message:
          'Güvenlik hizmetinin yanıtı doğrulanamadığı için üretim başlatılmadı. Ayrılan krediniz iade edildi.',
        expose: true,
      });
    const categories = safeModerationCategories(
      Object.entries(first.categories ?? {}).flatMap(([key, flagged]) =>
        flagged === true ? [key] : [],
      ),
    );
    return { flagged: first.flagged, categories };
  }
}

export function createImageGenerationProvider(config: BirKareConfig): ImageGenerationProvider {
  if (config.DISABLE_ALL_GENERATION || config.AI_PROVIDER === 'disabled')
    return new DisabledImageGenerationProvider();
  if (config.AI_PROVIDER === 'openai') return new OpenAIImageGenerationProvider(config);
  return new FakeImageGenerationProvider();
}

export function createModerationProvider(config: BirKareConfig): ModerationProvider {
  if (config.AI_PROVIDER === 'disabled') return new DisabledModerationProvider();
  if (config.AI_PROVIDER === 'openai') return new OpenAIModerationProvider(config);
  return new FakeModerationProvider();
}
