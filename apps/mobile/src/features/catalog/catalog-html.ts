/** One product as it is printed in the catalog. All text is plain, unescaped input. */
export type CatalogEntry = {
  title: string;
  price: string | null;
  description: string | null;
  /** `data:image/jpeg;base64,…` */
  image: string;
};

export type CatalogBrand = {
  shopName: string;
  tagline: string;
  contactLines: string[];
  accent: string;
  logo: string | null;
};

export type CatalogLabels = {
  /** Shown when the seller has not set a shop name. */
  fallbackTitle: string;
  date: string;
  /** For example "12 ürün". */
  productCount: string;
  /** Heading above the contact details on the cover. */
  contactHeading: string;
  page: (current: number, total: number) => string;
};

/** `large` prints four products per page, `grid` six. */
export type CatalogLayout = 'large' | 'grid';

export type CatalogOptions = {
  layout?: CatalogLayout;
  /** A full first page with the shop identity and a preview of the products. */
  cover?: boolean;
  rightToLeft?: boolean;
};

const PER_PAGE: Record<CatalogLayout, number> = { large: 4, grid: 6 };

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function paginate<T>(items: readonly T[], perPage: number): T[][] {
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += perPage)
    pages.push(items.slice(index, index + perPage));
  return pages.length ? pages : [[]];
}

function safeAccent(accent: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#B8860B';
}

/** Only inline image data may be embedded; anything else is dropped rather than fetched. */
function inlineImage(source: string | null): string {
  return source && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(source)
    ? source
    : '';
}

function card(entry: CatalogEntry, accent: string, number: number): string {
  return `<div class="card">
  <div class="photo"><img src="${inlineImage(entry.image)}" /><span class="no">${String(number).padStart(2, '0')}</span></div>
  <div class="name">${escapeHtml(entry.title)}</div>
  ${entry.price ? `<div class="price" style="color:${accent}">${escapeHtml(entry.price)}</div>` : ''}
  ${entry.description ? `<div class="desc">${escapeHtml(entry.description)}</div>` : ''}
</div>`;
}

/** A4 pages (595 × 842 pt) laid out for WebKit's print renderer. */
export function buildCatalogHtml(
  entries: readonly CatalogEntry[],
  brand: CatalogBrand,
  labels: CatalogLabels,
  options: CatalogOptions = {},
): string {
  const layout = options.layout ?? 'large';
  const accent = safeAccent(brand.accent);
  const pages = paginate(entries, PER_PAGE[layout]);
  const title = escapeHtml(brand.shopName.trim() || labels.fallbackTitle);
  const tagline = brand.tagline.trim() ? escapeHtml(brand.tagline.trim()) : '';
  const contact = brand.contactLines.map(escapeHtml);
  const logoSource = inlineImage(brand.logo);
  const logo = logoSource ? `<img class="logo" src="${logoSource}" />` : '';
  const total = pages.length + (options.cover ? 1 : 0);

  const cover = options.cover
    ? `<div class="page cover">
  <div class="band" style="background:${accent}"></div>
  <div class="coverHead">${logo}<div class="date">${escapeHtml(labels.date)}</div></div>
  <div class="coverTitle">${title}</div>
  ${tagline ? `<div class="coverTagline">${tagline}</div>` : ''}
  <div class="collage">${entries
    .slice(0, 3)
    .map((entry) => `<div class="tile"><img src="${inlineImage(entry.image)}" /></div>`)
    .join('')}</div>
  <div class="coverFoot">
    <div><div class="count" style="color:${accent}">${escapeHtml(labels.productCount)}</div></div>
    ${
      contact.length
        ? `<div class="contact"><div class="contactHead">${escapeHtml(labels.contactHeading)}</div>${contact
            .map((line) => `<div>${line}</div>`)
            .join('')}</div>`
        : ''
    }
  </div>
</div>`
    : '';

  let number = 0;
  const body = pages
    .map((page, index) => {
      const current = index + 1 + (options.cover ? 1 : 0);
      return `<div class="page">
  <div class="head" style="border-bottom:2px solid ${accent}">
    <div class="headBrand">${logo}<span class="shop">${title}</span></div>
    <span class="headMeta">${options.cover ? tagline : escapeHtml(labels.date)}</span>
  </div>
  <div class="grid ${layout}">${page.map((entry) => card(entry, accent, ++number)).join('')}</div>
  <div class="footer"><span>${contact.join(' &nbsp;·&nbsp; ') || title}</span><span>${escapeHtml(labels.page(current, total))}</span></div>
</div>`;
    })
    .join('');

  return `<!doctype html>
<html dir="${options.rightToLeft ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'" />
<meta name="viewport" content="width=595, initial-scale=1" />
<meta name="format-detection" content="telephone=no" />
<style>
  @page { size: 595pt 842pt; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, 'Helvetica Neue', Roboto, Arial, sans-serif; color: #1c1c1e; -webkit-print-color-adjust: exact; }
  img { display: block; }
  .page { width: 595pt; height: 842pt; padding: 32pt 36pt 44pt; position: relative; page-break-after: always; overflow: hidden; background: #fff; }
  .page:last-child { page-break-after: auto; }

  .cover { padding: 56pt 44pt 48pt; display: flex; flex-direction: column; }
  .band { position: absolute; left: 0; top: 0; width: 100%; height: 10pt; }
  .coverHead { display: flex; align-items: center; justify-content: space-between; min-height: 64pt; }
  .cover .logo { width: 64pt; height: 64pt; border-radius: 14pt; object-fit: cover; }
  .date { font-size: 10pt; color: #8e8e93; }
  .coverTitle { font-size: 44pt; font-weight: 700; line-height: 1.05; letter-spacing: -0.5pt; margin-top: 28pt; }
  .coverTagline { font-size: 15pt; color: #636366; margin-top: 10pt; line-height: 1.3; }
  .collage { display: flex; gap: 10pt; margin-top: 36pt; flex: 1; min-height: 0; }
  .tile { flex: 1; border-radius: 14pt; overflow: hidden; background: #f2f2f7; }
  .tile:first-child { flex: 1.6; }
  .tile img { width: 100%; height: 100%; object-fit: cover; }
  .coverFoot { display: flex; align-items: flex-end; justify-content: space-between; gap: 24pt; margin-top: 28pt; }
  .count { font-size: 20pt; font-weight: 700; }
  .contact { font-size: 11pt; line-height: 1.5; text-align: end; }
  .contactHead { font-size: 9pt; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.6pt; }

  .head { display: flex; align-items: center; justify-content: space-between; gap: 12pt; height: 34pt; padding-bottom: 8pt; margin-bottom: 16pt; }
  .headBrand { display: flex; align-items: center; gap: 8pt; min-width: 0; }
  .head .logo { width: 24pt; height: 24pt; border-radius: 6pt; object-fit: cover; }
  .shop { font-size: 13pt; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .headMeta { font-size: 9pt; color: #8e8e93; white-space: nowrap; }

  .grid { display: flex; flex-wrap: wrap; }
  .grid.large { gap: 18pt 17pt; }
  .grid.large .card { width: 253pt; }
  .grid.large .photo { height: 232pt; }
  .grid.grid { gap: 18pt 14pt; }
  .grid.grid .card { width: 165pt; }
  .grid.grid .photo { height: 195pt; }
  .photo { position: relative; border-radius: 12pt; overflow: hidden; background: #f2f2f7; }
  .photo img { width: 100%; height: 100%; object-fit: cover; }
  .no { position: absolute; left: 8pt; top: 8pt; background: rgba(255,255,255,0.92); border-radius: 20pt; padding: 2pt 7pt; font-size: 8pt; font-weight: 600; color: #3a3a3c; }
  .name { font-weight: 600; margin-top: 8pt; line-height: 1.25; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .price { font-weight: 700; margin-top: 3pt; }
  .desc { color: #636366; margin-top: 4pt; line-height: 1.35; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; }
  .grid.large .name { font-size: 13pt; }
  .grid.large .price { font-size: 14pt; }
  .grid.large .desc { font-size: 9pt; -webkit-line-clamp: 3; }
  .grid.grid .name { font-size: 11pt; }
  .grid.grid .price { font-size: 11pt; }
  .grid.grid .desc { font-size: 8pt; -webkit-line-clamp: 2; }

  .footer { position: absolute; left: 36pt; right: 36pt; bottom: 18pt; display: flex; justify-content: space-between; font-size: 8.5pt; color: #8e8e93; }
</style>
</head>
<body>${cover}${body}</body>
</html>`;
}
