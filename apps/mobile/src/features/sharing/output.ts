export type ShareOutput = {
  id: string;
  selected: boolean;
  variantIndex: number;
  asset: { id: string; mimeType: string; status: string; accessUrl: string | null } | null;
};

export type ShareGeneration = {
  id: string;
  status: string;
  aspectRatio: string;
  quality: string;
  outputs: ShareOutput[];
};

export const AI_DISCLOSURE =
  'BirKare AI ile yapay zekâ kullanılarak oluşturuldu. Gerçek bir olayın, buluşmanın veya iş birliğinin kanıtı değildir. #AIileOlusturuldu';

export function selectedShareOutput(generation: ShareGeneration, outputId?: string) {
  if (generation.status !== 'COMPLETED')
    throw new Error('Üretim tamamlanmadan paylaşım yapılamaz.');
  const outputs = generation.outputs.filter(
    (output) => output.asset?.status === 'READY' && output.asset.accessUrl,
  );
  // Never silently share another variation when a requested output disappears.
  const output = outputId
    ? outputs.find((item) => item.id === outputId)
    : (outputs.find((item) => item.selected) ?? outputs[0]);
  if (!output?.asset)
    throw new Error('Seçili görsel kullanılamıyor. Sonuçları yenileyip tekrar dene.');
  return { ...output, asset: output.asset };
}

export function shareFileType(mimeType: string) {
  const types = {
    'image/jpeg': { extension: 'jpg', uti: 'public.jpeg' },
    'image/png': { extension: 'png', uti: 'public.png' },
    'image/webp': { extension: 'webp', uti: 'org.webmproject.webp' },
  };
  const result = types[mimeType as keyof typeof types];
  if (!result) throw new Error('Bu görsel biçimi dışa aktarma için desteklenmiyor.');
  return result;
}

export function shareDownloadRequest(sourceUrl: string, baseUrl: string, token: string | null) {
  const base = new URL(baseUrl);
  const url = new URL(sourceUrl, `${baseUrl}/`);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Görsel bağlantısı güvenli değil.');
  }
  // A private, signed storage URL never receives the application's bearer token.
  const sameOrigin = url.origin === base.origin;
  if (!sameOrigin && url.protocol !== 'https:')
    throw new Error('Görsel bağlantısı HTTPS olmalıdır.');
  return {
    url: url.href,
    headers: sameOrigin && token ? { Authorization: `Bearer ${token}` } : undefined,
  };
}

export function hasImageSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mimeType === 'image/png')
    return [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  if (mimeType === 'image/webp')
    return (
      [82, 73, 70, 70].every((value, index) => bytes[index] === value) &&
      [87, 69, 66, 80].every((value, index) => bytes[index + 8] === value)
    );
  return false;
}
