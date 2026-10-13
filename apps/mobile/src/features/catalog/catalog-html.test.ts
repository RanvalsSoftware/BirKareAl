import { describe, expect, it } from 'vitest';

import { buildCatalogHtml, escapeHtml, paginate, type CatalogEntry } from './catalog-html';

const entry = (title: string): CatalogEntry => ({
  title,
  price: '₺100,00',
  description: null,
  image: 'data:image/jpeg;base64,AAAA',
});
const brand = {
  shopName: 'Atölye',
  tagline: 'El yapımı',
  contactLines: ['@atolye'],
  accent: '#0F766E',
  logo: null,
};
const labels = {
  fallbackTitle: 'Ürün kataloğu',
  date: '12 Ekim 2026',
  productCount: '7 ürün',
  contactHeading: 'İletişim',
  page: (current: number, total: number) => `${current} / ${total}`,
};
const many = (count: number) => Array.from({ length: count }, (_, i) => entry(`Ürün ${i}`));

describe('paginate', () => {
  it('splits by the page size', () => {
    const pages = paginate(
      Array.from({ length: 13 }, (_, index) => index),
      6,
    );
    expect(pages.map((page) => page.length)).toEqual([6, 6, 1]);
  });

  it('keeps a single page for a short or empty list', () => {
    expect(paginate([1, 2], 4).length).toBe(1);
    expect(paginate([], 4).length).toBe(1);
  });
});

describe('buildCatalogHtml', () => {
  it('escapes seller text', () => {
    expect(escapeHtml(`<b>"A" & 'B'</b>`)).toBe(
      '&lt;b&gt;&quot;A&quot; &amp; &#39;B&#39;&lt;/b&gt;',
    );
    const html = buildCatalogHtml([entry('<script>alert(1)</script>')], brand, labels);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('prints four products per page in the large layout', () => {
    const html = buildCatalogHtml(many(7), brand, labels);
    expect(html.match(/class="page"/g)?.length).toBe(2);
    expect(html).toContain('2 / 2');
    expect(html).toContain('class="grid large"');
  });

  it('prints six products per page in the grid layout', () => {
    const html = buildCatalogHtml(many(7), brand, labels, { layout: 'grid' });
    expect(html.match(/class="page"/g)?.length).toBe(2);
    expect(html.match(/class="card"/g)?.length).toBe(7);
  });

  it('adds a cover that counts as the first page', () => {
    const html = buildCatalogHtml(many(7), brand, labels, { cover: true });
    expect(html.match(/class="page cover"/g)?.length).toBe(1);
    expect(html).toContain('7 ürün');
    expect(html).toContain('2 / 3');
    expect(html).toContain('3 / 3');
  });

  it('embeds only inline image data', () => {
    const html = buildCatalogHtml(
      [{ ...entry('A'), image: 'https://evil.example/x.png" onerror="alert(1)' }],
      { ...brand, logo: 'javascript:alert(1)' },
      labels,
    );
    expect(html).not.toContain('evil.example');
    expect(html).not.toContain('javascript:');
    expect(html).toContain("default-src 'none'");
  });

  it('numbers products across pages', () => {
    const html = buildCatalogHtml(many(5), brand, labels);
    expect(html).toContain('>01<');
    expect(html).toContain('>05<');
  });

  it('falls back to a safe accent and the default title', () => {
    const html = buildCatalogHtml(
      [entry('A')],
      { ...brand, shopName: ' ', accent: 'red;}</style>' },
      labels,
    );
    expect(html).toContain('#B8860B');
    expect(html).toContain('Ürün kataloğu');
    expect(html).not.toContain('red;}');
  });
});
