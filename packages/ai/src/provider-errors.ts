import { ApiError } from '@birkare/shared';

type ProviderErrorShape = {
  status?: unknown;
  code?: unknown;
  type?: unknown;
  name?: unknown;
  request_id?: unknown;
  requestID?: unknown;
  error?: { code?: unknown; type?: unknown; moderation_details?: unknown };
};

const safeIdentifier = (value: unknown): string | undefined =>
  typeof value === 'string' && /^[a-zA-Z0-9_.:-]{1,160}$/.test(value) ? value : undefined;

const MODERATION_CATEGORIES = new Set([
  'harassment',
  'harassment/threatening',
  'hate',
  'hate/threatening',
  'self-harm',
  'self-harm/intent',
  'self-harm/instructions',
  'sexual',
  'sexual/minors',
  'violence',
  'violence/graphic',
  'illicit',
  'illicit/violent',
]);

export function safeModerationCategories(value: unknown): string[] {
  return Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (category): category is string =>
              typeof category === 'string' && MODERATION_CATEGORIES.has(category),
          ),
        ),
      ].slice(0, 12)
    : [];
}

/** Optional coarse provider context is diagnostic only, never an instruction. */
function moderationDetails(value: unknown) {
  if (!value || typeof value !== 'object') return {};
  const details = value as { moderation_stage?: unknown; categories?: unknown };
  const stage = ['input', 'output', 'unknown'].includes(String(details.moderation_stage))
    ? String(details.moderation_stage)
    : 'unknown';
  const categories = safeModerationCategories(details.categories);
  return { moderationStage: stage, moderationCategories: categories };
}

/** Never persist SDK messages: they can contain prompts, URLs or credentials. */
export function providerFailure(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  const source = error && typeof error === 'object' ? (error as ProviderErrorShape) : {};
  const status = typeof source.status === 'number' ? source.status : undefined;
  const providerCode = safeIdentifier(source.code ?? source.error?.code);
  const details = {
    providerStatus: status,
    providerCode,
    providerType: safeIdentifier(source.type ?? source.error?.type),
    providerRequestId: safeIdentifier(source.request_id ?? source.requestID),
    ...(providerCode === 'moderation_blocked' || providerCode === 'content_policy_violation'
      ? moderationDetails(source.error?.moderation_details)
      : {}),
  };
  let code = 'GENERATION_PROVIDER_FAILURE';
  let message = 'Görsel sağlayıcısı işlemi tamamlayamadı. Ayrılan krediniz iade edildi.';
  if (providerCode === 'moderation_blocked' || providerCode === 'content_policy_violation') {
    code = 'MODERATION_BLOCKED';
    message =
      details.moderationStage === 'output'
        ? 'Görsel sağlayıcısı üretilen sonucu güvenlik kontrolünde durdurdu. Sonuç kaydedilmedi. Fotoğrafını veya düzenleme seçimini gözden geçirebilirsin. Ayrılan krediniz iade edildi.'
        : details.moderationStage === 'input'
          ? 'Görsel sağlayıcısı fotoğrafı veya düzenleme talebini güvenlik kontrolünde kabul etmedi. Fotoğrafını ve seçimini gözden geçirebilirsin. Ayrılan krediniz iade edildi.'
          : 'Görsel sağlayıcısı bu düzenlemeyi güvenlik kontrolünde durdurdu; ayrıntılı neden bildirilmedi. Fotoğrafını ve seçimini gözden geçirebilirsin. Ayrılan krediniz iade edildi.';
  } else if (
    [
      'insufficient_quota',
      'billing_hard_limit_reached',
      'billing_not_active',
      'credit_balance_exhausted',
      'project_spend_limit_exceeded',
      'organization_spend_limit_exceeded',
    ].includes(providerCode ?? '')
  ) {
    code = 'PROVIDER_QUOTA_EXHAUSTED';
    message =
      'Görsel hizmetinin kullanım bütçesi şu an dolu. Sorun sunucu tarafında; ayrılan krediniz iade edildi.';
  } else if (status === 429) {
    code = 'PROVIDER_RATE_LIMITED';
    message =
      'Görsel hizmeti şu an yoğun. Biraz sonra yeniden deneyebilirsin. Ayrılan krediniz iade edildi.';
  } else if (
    source.name === 'APIConnectionTimeoutError' ||
    source.name === 'TimeoutError' ||
    source.name === 'AbortError'
  ) {
    code = 'PROVIDER_TIMEOUT';
    message =
      'Görsel hizmeti zamanında yanıt vermedi. İşlem durduruldu ve ayrılan krediniz iade edildi.';
  } else if (source.name === 'APIConnectionError') {
    code = 'PROVIDER_CONNECTION_FAILED';
    message =
      'Sunucu görsel hizmetine bağlanamadı. Bağlantı düzeldiğinde yeniden deneyebilirsin. Ayrılan krediniz iade edildi.';
  } else if (status === 401 || providerCode === 'invalid_api_key') {
    code = 'PROVIDER_CONFIGURATION_ERROR';
    message =
      'Sunucunun AI erişim bilgileri doğrulanamadı. Sorun fotoğrafınızdan kaynaklanmıyor. Ayrılan krediniz iade edildi.';
  } else if (status === 403) {
    code = 'PROVIDER_CONFIGURATION_ERROR';
    message =
      'Sunucunun AI hizmetine erişim izni kontrol edilmeli. Sorun fotoğrafınızdan kaynaklanmıyor. Ayrılan krediniz iade edildi.';
  } else if (status === 404 || providerCode === 'model_not_found') {
    code = 'PROVIDER_CONFIGURATION_ERROR';
    message =
      'Sunucuda seçilen AI modeli veya hizmet adresi kullanılamıyor. Ayrılan krediniz iade edildi.';
  } else if (status === 400 || status === 422) {
    code = 'PROVIDER_REQUEST_REJECTED';
    message =
      'Görsel hizmeti bu fotoğrafı veya üretim ayarlarını kabul etmedi. Başka bir fotoğraf ya da seçimle deneyebilirsin. Ayrılan krediniz iade edildi.';
  }
  return new ApiError({ statusCode: 502, code, message, details, expose: true });
}
