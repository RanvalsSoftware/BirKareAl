import { describe, expect, it } from 'vitest';
import {
  hasImageSignature,
  selectedShareOutput,
  shareDownloadRequest,
  shareFileType,
  type ShareGeneration,
} from './output';

const generation: ShareGeneration = {
  id: 'g',
  status: 'COMPLETED',
  quality: 'STANDARD',
  aspectRatio: '4:5',
  outputs: [
    {
      id: 'a',
      selected: false,
      variantIndex: 0,
      asset: {
        id: 'asset-a',
        mimeType: 'image/png',
        status: 'READY',
        accessUrl: '/v1/assets/asset-a/content',
      },
    },
    {
      id: 'b',
      selected: true,
      variantIndex: 1,
      asset: {
        id: 'asset-b',
        mimeType: 'image/jpeg',
        status: 'READY',
        accessUrl: 'https://private.example/b',
      },
    },
  ],
};

describe('generated output sharing', () => {
  it('uses the explicitly chosen output, then the server-selected output', () => {
    expect(selectedShareOutput(generation, 'a').id).toBe('a');
    expect(selectedShareOutput(generation).id).toBe('b');
  });
  it('never replaces a missing explicit output or incomplete job with source/another image', () => {
    expect(() => selectedShareOutput(generation, 'missing')).toThrow('Seçili');
    expect(() => selectedShareOutput({ ...generation, status: 'PROCESSING' })).toThrow(
      'tamamlanmadan',
    );
    expect(() => selectedShareOutput({ ...generation, outputs: [] })).toThrow();
  });
  it('does not export rejected/deleted assets', () => {
    expect(() =>
      selectedShareOutput({
        ...generation,
        outputs: [
          {
            ...generation.outputs[0]!,
            asset: { ...generation.outputs[0]!.asset!, status: 'DELETED' },
          },
        ],
      }),
    ).toThrow();
  });
  it('sends the bearer only to the API origin', () => {
    expect(
      shareDownloadRequest('/v1/assets/a/content', 'http://localhost:4000', 'secret').headers,
    ).toEqual({ Authorization: 'Bearer secret' });
    expect(
      shareDownloadRequest(
        'https://private.example/a?signature=signed',
        'https://api.example',
        'secret',
      ).headers,
    ).toBeUndefined();
    expect(
      shareDownloadRequest('//private.example/a', 'https://api.example', 'secret').headers,
    ).toBeUndefined();
  });
  it('rejects unsafe schemes, storage HTTP and embedded credentials', () => {
    for (const url of [
      'file:///photos/source.png',
      'javascript:alert(1)',
      'http://outside.example/a',
      'https://secret@private.example/a',
    ]) {
      expect(() => shareDownloadRequest(url, 'https://api.example', 'secret')).toThrow();
    }
  });
  it('uses real MIME types and file extensions, never a signed URL extension', () => {
    expect(shareFileType('image/jpeg')).toEqual({ extension: 'jpg', uti: 'public.jpeg' });
    expect(shareFileType('image/png').extension).toBe('png');
    expect(() => shareFileType('text/html')).toThrow();
  });
  it('validates signatures and rejects an HTTP error document disguised as an image', () => {
    expect(hasImageSignature(new Uint8Array([255, 216, 255]), 'image/jpeg')).toBe(true);
    expect(hasImageSignature(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), 'image/png')).toBe(
      true,
    );
    expect(
      hasImageSignature(new TextEncoder().encode('<html>Unauthorized</html>'), 'image/jpeg'),
    ).toBe(false);
    expect(hasImageSignature(new Uint8Array(), 'image/png')).toBe(false);
  });
});
