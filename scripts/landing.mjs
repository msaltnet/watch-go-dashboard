// Extract icon URL from a watch-go.com landing page.
// Prefers the JSON-LD "image" field for the WebApplication/SoftwareApplication
// node; falls back to the first <img class="application-icon" src="..."> match
// pointing to the same app id; falls back to a conventional `/<id>/icon.png`.

const JSONLD_IMAGE_RE = /"image"\s*:\s*"([^"]+)"/g;

export function extractIconUrl(html, appId) {
  if (!html) return null;

  const idPathPattern = new RegExp(`/${appId}/icon\\.(png|jpg|jpeg|webp)`, 'i');
  let match;
  JSONLD_IMAGE_RE.lastIndex = 0;
  while ((match = JSONLD_IMAGE_RE.exec(html)) !== null) {
    const url = match[1];
    if (idPathPattern.test(url)) return url;
  }

  const APP_ICON_RE = new RegExp(
    `<img[^>]*class=["'][^"']*application-icon[^"']*["'][^>]*src=["']([^"']*\\/${appId}\\/icon\\.[a-z]+)["']`,
    'i'
  );
  const m2 = APP_ICON_RE.exec(html);
  if (m2) {
    return m2[1].startsWith('http') ? m2[1] : new URL(m2[1], 'https://watch-go.com').href;
  }

  return null;
}

export async function fetchIconUrl({ landing, id, fetchFn = fetch }) {
  if (!landing || id == null) return null;
  let res;
  try {
    res = await fetchFn(landing, { redirect: 'follow' });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const html = await res.text();
  return extractIconUrl(html, id);
}
