import { getConfig } from '@birkare/config';
import {
  OpenAIImageGenerationProvider,
  OpenAIModerationProvider,
  providerFailure,
} from '@birkare/ai';

// Explicit opt-in for exactly one paid, neutral text-only render. Never replay a
// blocked customer job or change its prompt/model/moderation to force a result.
const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--generate-smoke')) {
  console.error('Usage: diagnose-image-provider.ts [--generate-smoke]');
  process.exit(1);
}

async function main() {
  const config = getConfig();
  if (config.AI_PROVIDER !== 'openai' || config.DISABLE_ALL_GENERATION)
    throw new Error('OpenAI generation is not enabled in this server environment.');
  if (!config.OPENAI_API_KEY) throw new Error('Backend OPENAI_API_KEY is missing.');
  const response = await fetch(
    `https://api.openai.com/v1/models/${encodeURIComponent(config.OPENAI_IMAGE_MODEL)}`,
    {
      headers: { Authorization: `Bearer ${config.OPENAI_API_KEY}` },
      signal: AbortSignal.timeout(15_000),
    },
  );
  // Never print a raw response/error: invalid-key errors may quote the key.
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw providerFailure({
      status: response.status,
      code: body.error?.code,
      type: body.error?.type,
      request_id: response.headers.get('x-request-id'),
    });
  }
  console.log(
    JSON.stringify({
      check: 'model-access',
      status: response.status,
      model: config.OPENAI_IMAGE_MODEL,
    }),
  );

  const requestId = `provider-diagnostic-${Date.now()}`;
  const render = args.includes('--generate-smoke');
  const prompt =
    'A plain ceramic mug on a wooden table, softly lit by a window. No people or text.';
  const moderation = await new OpenAIModerationProvider(config).moderateText({
    text: prompt,
    requestId,
    sourceImages: [],
  });
  console.log(
    JSON.stringify({
      check: 'input-moderation',
      flagged: moderation.flagged,
      categories: moderation.categories,
    }),
  );
  if (moderation.flagged)
    throw new Error('Diagnostic input was blocked. No render or retry performed.');
  if (!render) {
    console.log('Read-only access and moderation checks complete; no image generated.');
    return;
  }
  console.log(
    'Starting one low-quality text-only render; no customer images, records or credits are used.',
  );
  const started = Date.now();
  const result = await new OpenAIImageGenerationProvider(config).generate({
    requestId,
    prompt,
    sourceImages: [],
    quality: 'low',
    size: '1024x1024',
    numberOfImages: 1,
  });
  const image = result.images[0];
  if (
    result.images.length !== 1 ||
    !image?.bytes.length ||
    !image.bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
  )
    throw new Error('Diagnostic returned an invalid image response.');
  console.log(
    JSON.stringify({
      check: 'neutral-text-generation',
      success: true,
      elapsedMs: Date.now() - started,
      imageCount: result.images.length,
      mimeType: image.mimeType,
      bytes: image.bytes.length,
      providerRequestId: result.providerRequestId,
      customerRecordsChanged: false,
    }),
  );
}

main().catch((error) => {
  const failure = providerFailure(error);
  console.error(
    JSON.stringify({
      check: 'provider-diagnostic',
      success: false,
      code: failure.code,
      details: failure.details,
    }),
  );
  process.exitCode = 1;
});
