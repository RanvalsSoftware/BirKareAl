import { describe, expect, it, vi } from 'vitest';

vi.mock('@/api/client', () => ({ apiRequest: vi.fn() }));

import { formatPrice, listingAsText, parsePriceInput } from './product-api';

describe('parsePriceInput', () => {
  it('reads Turkish and English number formats', () => {
    expect(parsePriceInput('1.249,90')).toBe(1249.9);
    expect(parsePriceInput('1,249.90')).toBe(1249.9);
    expect(parsePriceInput('1249,9')).toBe(1249.9);
    expect(parsePriceInput('249')).toBe(249);
    expect(parsePriceInput('1.250')).toBe(1250);
  });

  it('rejects text that is not a price', () => {
    expect(parsePriceInput('')).toBeNull();
    expect(parsePriceInput('abc')).toBeNull();
    expect(parsePriceInput('-5')).toBeNull();
    expect(parsePriceInput('100000000')).toBeNull();
  });
});

describe('formatPrice', () => {
  it('returns null without an amount', () => {
    expect(formatPrice(null, 'TRY', 'tr-TR')).toBeNull();
  });

  it('formats with the currency', () => {
    expect(formatPrice(1249.9, 'TRY', 'tr-TR')).toContain('1.249,90');
  });
});

describe('listingAsText', () => {
  it('joins the parts and skips empty ones', () => {
    const text = listingAsText(
      {
        title: 'Deri çanta',
        description: 'El yapımı.',
        highlights: ['Hakiki deri', 'Ayarlanabilir askı'],
        hashtags: ['#deri', '#çanta'],
        language: 'tr',
        tone: 'neutral',
        generatedAt: '2026-10-12T00:00:00.000Z',
      },
      { price: '₺1.249,90', signature: null },
    );
    expect(text).toBe(
      'Deri çanta\n\n₺1.249,90\n\nEl yapımı.\n\n• Hakiki deri\n• Ayarlanabilir askı\n\n#deri #çanta',
    );
  });
});
