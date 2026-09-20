import { categoryFromId, detailPath, escapeHtml } from './util.mjs';

export const SITE_ORIGIN = 'https://now.watch-go.com';
const SOCIAL_IMAGE = `${SITE_ORIGIN}/social-card.png`;
const INDEX_TITLE = 'Watch-Go Wear OS Apps & Watch Faces | now.watch-go.com';
const INDEX_DESCRIPTION = 'Watch-Go의 Wear OS 워치페이스와 Android 앱을 한곳에서 살펴보세요. 사진 워치페이스, 집중 타이머, 원격 카메라 제어 등 손목 위 일상을 더 아름답고 스마트하게 만드는 앱 카탈로그입니다.';

function absoluteUrl(path) {
  return new URL(path, `${SITE_ORIGIN}/`).href;
}

function detailUrl(app) {
  return absoluteUrl(detailPath(app));
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function asAbsoluteImageUrl(value) {
  if (!value) return null;
  try {
    return new URL(value, `${SITE_ORIGIN}/`).href;
  } catch {
    return null;
  }
}

function jsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function pageValues({ title, description, canonicalUrl, structuredData }) {
  return {
    title: escapeHtml(title),
    description: escapeHtml(description),
    canonical_url: escapeHtml(canonicalUrl),
    social_image: SOCIAL_IMAGE,
    social_image_alt: 'Watch-Go — Wear OS Apps & Watch Faces',
    json_ld: jsonLd(structuredData),
  };
}

function indexStructuredData(data) {
  const catalogueUrl = absoluteUrl('/');
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${catalogueUrl}#organization`,
        name: 'watch-go.com',
        url: 'https://watch-go.com/',
        slogan: 'Wear Beauty. Live Smart.',
      },
      {
        '@type': 'WebSite',
        '@id': `${catalogueUrl}#website`,
        name: 'Watch-Go Wear OS Apps & Watch Faces',
        url: catalogueUrl,
        inLanguage: 'ko',
        publisher: { '@id': `${catalogueUrl}#organization` },
      },
      {
        '@type': 'ItemList',
        name: 'Watch-Go 앱 카탈로그',
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        numberOfItems: data.apps.length,
        itemListElement: data.apps.map((app, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: app.name,
          url: detailUrl(app),
        })),
      },
    ],
  };
}

function detailStructuredData(app) {
  const canonicalUrl = detailUrl(app);
  const category = categoryFromId(app.id) === 'watchface' ? 'Watch face' : 'Android app';
  const application = {
    '@type': 'SoftwareApplication',
    '@id': `${canonicalUrl}#software`,
    name: app.name,
    description: `${app.identity} Watch-Go의 Wear OS 및 Android 앱 카탈로그에서 자세히 알아보세요.`,
    url: canonicalUrl,
    applicationCategory: category,
    operatingSystem: 'Wear OS, Android',
    identifier: {
      '@type': 'PropertyValue',
      propertyID: 'Android package',
      value: app.package,
    },
    isPartOf: { '@id': `${absoluteUrl('/')}#website` },
  };
  const image = asAbsoluteImageUrl(app.icon_url);
  if (image) application.image = image;
  if (app.landing) application.sameAs = app.landing;
  if (isValidDate(app.latest_update_date)) application.dateModified = app.latest_update_date;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      application,
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Watch-Go 앱 카탈로그', item: absoluteUrl('/') },
          { '@type': 'ListItem', position: 2, name: app.name, item: canonicalUrl },
        ],
      },
    ],
  };
}

export function indexSeo(data) {
  return pageValues({
    title: INDEX_TITLE,
    description: INDEX_DESCRIPTION,
    canonicalUrl: absoluteUrl('/'),
    structuredData: indexStructuredData(data),
  });
}

export function detailSeo(app) {
  return pageValues({
    title: `${app.name} | Watch-Go Wear OS App`,
    description: `${app.identity} Watch-Go의 Wear OS 및 Android 앱 카탈로그에서 자세히 알아보세요.`,
    canonicalUrl: detailUrl(app),
    structuredData: detailStructuredData(app),
  });
}

export function renderRobotsTxt() {
  return `User-agent: GPTBot\nAllow: /\n\nUser-agent: ChatGPT-User\nAllow: /\n\nUser-agent: Google-Extended\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sitemapEntry(url, lastModified) {
  const lastmod = isValidDate(lastModified) ? `\n    <lastmod>${lastModified}</lastmod>` : '';
  return `  <url>\n    <loc>${escapeXml(url)}</loc>${lastmod}\n  </url>`;
}

export function renderSitemapXml(data) {
  const entries = [sitemapEntry(absoluteUrl('/'))];
  for (const app of data.apps) {
    entries.push(sitemapEntry(detailUrl(app), app.latest_update_date));
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
}
